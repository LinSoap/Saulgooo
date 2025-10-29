import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { db } from '~/server/db';
import { query, type Query } from '@anthropic-ai/claude-agent-sdk';
import type { ContentBlock } from '@anthropic-ai/sdk/resources/messages';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { Prisma } from '@prisma/client';

// 定义消息类型
interface StoredMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock | ContentBlock[];
  timestamp: string;
}

// 全局存储活跃的查询会话
const activeQueries = new Map<string, Query>();

// 将消息转换为 Prisma JsonValue 格式，保留完整的 ContentBlock 结构
const toPrismaJson = (messages: StoredMessage[]): Prisma.InputJsonValue => {
  const result = messages.map((msg) => {
    // 调试：输出要存储的消息格式
    if (process.env.NODE_ENV === "development") {
      console.log("[Storage Debug] Storing message:", {
        role: msg.role,
        contentType: Array.isArray(msg.content) ? 'ContentBlock[]' : typeof msg.content,
        contentPreview: Array.isArray(msg.content)
          ? msg.content.map((c) => {
            const block = c as unknown as Record<string, unknown>;
            return { type: block.type, hasText: !!block.text, hasName: !!block.name };
          })
          : msg.content
      });
    }

    return {
      role: msg.role,
      content: msg.content,  // 直接存储，不做转换，保持原始结构
      timestamp: msg.timestamp
    };
  });

  return result as Prisma.InputJsonValue;
};

// 简化的消息存储类 - 在内存中累积消息，批量保存
class MessageStorage {
  private messages: StoredMessage[] = [];
  private currentAssistantContent: ContentBlock[] = [];

  constructor(
    private sessionId: string,
    private userId: string,
    private workspaceId: string
  ) { }

  addMessage(role: 'user' | 'assistant', content: string | ContentBlock | ContentBlock[]) {
    if (role === 'user') {
      // 用户消息直接添加
      this.messages.push({
        role,
        content,  // 保持原始格式
        timestamp: new Date().toISOString()
      });
    } else if (role === 'assistant') {
      // 助手消息需要累积 ContentBlock
      if (Array.isArray(content)) {
        // 如果是数组，添加到累积的 ContentBlock 列表
        this.currentAssistantContent.push(...content);
      } else {
        // 单个 ContentBlock，添加到累积列表
        this.currentAssistantContent.push(content as ContentBlock);
      }
    }
  }

  // 完成助手消息时调用
  finalizeAssistantMessage() {
    if (this.currentAssistantContent.length > 0) {
      this.messages.push({
        role: 'assistant',
        content: this.currentAssistantContent,  // 存储为 ContentBlock 数组
        timestamp: new Date().toISOString()
      });
      this.currentAssistantContent = [];  // 清空累积的内容
    }
  }

  async saveToDatabase(title?: string) {
    if (this.messages.length === 0) return;

    // 检查是否是新会话
    const existingSession = await db.agentSession.findUnique({
      where: { sessionId: this.sessionId },
      select: { sessionId: true }
    });

    if (!existingSession && title) {
      // 创建新会话
      await db.agentSession.create({
        data: {
          workspaceId: this.workspaceId,
          userId: this.userId,
          title,
          sessionId: this.sessionId,
          messages: toPrismaJson(this.messages),
        }
      });
    } else if (existingSession) {
      // 获取现有消息并追加新消息
      const session = await db.agentSession.findUnique({
        where: { sessionId: this.sessionId },
        select: { messages: true }
      });

      // 直接使用现有消息，不做转换
      const existingMessages = Array.isArray(session?.messages)
        ? (session.messages as unknown as StoredMessage[])
        : [];

      await db.agentSession.update({
        where: { sessionId: this.sessionId },
        data: {
          messages: toPrismaJson([...existingMessages, ...this.messages]),
          updatedAt: new Date()
        }
      });
    }

    // 清空已保存的消息
    this.messages = [];
  }
}

export async function POST(request: NextRequest) {
  try {
    // 获取认证信息
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 解析请求体
    const body = (await request.json()) as {
      query?: string;
      workspaceId?: string;
      sessionId?: string;
      action?: 'start' | 'stop';
      requestId?: string;
    };
    const { query: userQuery, workspaceId, sessionId, action = 'start', requestId } = body;

    // 处理终止请求
    if (action === 'stop' && requestId) {
      const queryInstance = activeQueries.get(requestId);
      if (queryInstance) {
        try {
          await queryInstance.interrupt();
          activeQueries.delete(requestId);
          return NextResponse.json({ success: true, message: 'Query interrupted' });
        } catch (error) {
          return NextResponse.json(
            { error: 'Failed to interrupt query', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Query not found or already completed' },
          { status: 404 }
        );
      }
    }

    if (!userQuery || !workspaceId) {
      return NextResponse.json(
        { error: 'Missing required fields: query, workspaceId' },
        { status: 400 }
      );
    }

    // 获取工作路径
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { path: true },
    });

    if (!workspace?.path) {
      return NextResponse.json(
        { error: '工作区路径未配置' },
        { status: 400 }
      );
    }

    const cwd = join(homedir(), 'workspaces', workspace.path);

    // 创建 SSE 响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let claudeSessionId: string | undefined = sessionId;
        let messageStorage: MessageStorage | null = null;

        // 生成唯一的请求 ID
        const currentRequestId = requestId ?? `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // 清理函数
        const cleanup = () => {
          activeQueries.delete(currentRequestId);
        };

        try {
          // 使用 Agent SDK 的 query 方法
          const queryInstance = query({
            prompt: userQuery,
            options: {
              maxTurns: 30,
              permissionMode: 'bypassPermissions',
              resume: sessionId ?? undefined,
              cwd,
              systemPrompt: {
                type: "preset",
                preset: "claude_code",
                append:
                  ` - 始终在workspace目录下操作，严格遵守文件读写权限，不要尝试访问未授权的文件或目录。
                    - workspace目录是你能够访问的唯一文件系统位置。
                    - 禁止在非workspace目录下读写文件。`,
              },
            }
          });

          // 存储查询实例以供终止使用
          activeQueries.set(currentRequestId, queryInstance);

          // 发送请求 ID
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'request_id',
                requestId: currentRequestId
              })}\n\n`
            )
          );

          for await (const message of queryInstance) {
            // 获取 session ID 并初始化消息存储
            if (message.type === 'system' && message.subtype === 'init' && message.session_id) {
              claudeSessionId = message.session_id;

              // 初始化消息存储
              messageStorage = new MessageStorage(
                claudeSessionId,
                session.user.id,
                workspaceId
              );

              // 保存用户消息，使用 ContentBlock 格式保持一致性
              messageStorage.addMessage('user', [{ type: "text", text: userQuery, citations: [] } as ContentBlock]);

              // 如果是新会话，立即保存用户消息
              if (!sessionId) {
                const title = userQuery.length > 20
                  ? userQuery.substring(0, 20) + "..."
                  : userQuery;
                await messageStorage.saveToDatabase(title);
              }

              // 发送 session ID
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'session_id',
                    sessionId: claudeSessionId
                  })}\n\n`
                )
              );
            }

            // 处理助手消息
            if (message.type === 'assistant' && message.message?.content && messageStorage) {
              const content = message.message.content;

              if (Array.isArray(content)) {
                // 发送数组中的每个内容
                for (const item of content) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: 'message',
                        content: item,
                        messageId: message.message.id
                      })}\n\n`
                    )
                  );
                }

                // 将整个 ContentBlock 数累积到存储中
                messageStorage.addMessage('assistant', content as ContentBlock[]);
              } else {
                // 发送单个内容
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: 'message',
                      content: content,
                      messageId: message.message.id
                    })}\n\n`
                  )
                );

                // 将单个 ContentBlock 包装成数组累积到存储中
                messageStorage.addMessage('assistant', [content as ContentBlock]);
              }
            }
          }

          // 保存所有累积的消息
          if (messageStorage) {
            // 在保存前，完成当前助手消息的累积
            messageStorage.finalizeAssistantMessage();
            await messageStorage.saveToDatabase();
          }

          // 发送完成信号
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'done'
              })}\n\n`
            )
          );

          cleanup();
          controller.close();
        } catch (error) {
          // 即使出错也要保存已有的消息
          if (messageStorage) {
            try {
              await messageStorage.saveToDatabase();
            } catch {
              // 保存失败，忽略
            }
          }

          cleanup();
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
              })}\n\n`
            )
          );
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}