import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { db } from '~/server/db';
import { query } from '@anthropic-ai/claude-agent-sdk';
import type { ContentBlock } from '@anthropic-ai/sdk/resources/messages';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { Prisma } from '@prisma/client';

type ContentItem = ContentBlock;

interface StoredMessage {
  role: "user" | "assistant";
  content: string | ContentItem[];
  timestamp: string;
}

// 将消息转换为 Prisma JsonValue 格式
const toPrismaJson = (messages: StoredMessage[]): Prisma.InputJsonValue => {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content,
    timestamp: msg.timestamp
  })) as Prisma.InputJsonValue;
};

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
    };
    const { query: userQuery, workspaceId, sessionId } = body;

    if (!userQuery || !workspaceId) {
      return NextResponse.json(
        { error: 'Missing required fields: query, workspaceId' },
        { status: 400 }
      );
    }

    // 获取工作路径
    let cwd = process.cwd();
    if (workspaceId) {
      const workspace = await db.workspace.findUnique({
        where: { id: workspaceId },
        select: { path: true },
      });

      if (workspace?.path) {
        cwd = join(homedir(), 'workspaces', workspace.path);
      } else {
        return NextResponse.json(
          { error: '工作区路径未配置' },
          { status: 400 }
        );
      }
    }

    // 创建 SSE 响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let claudeSessionId: string | undefined;
        const messageContents: ContentItem[] = [];
        let finalResult: unknown = null;

        try {
          // 使用 Agent SDK 的 query 方法
          for await (const message of query({
            prompt: userQuery,
            options: {
              maxTurns: 10,
              permissionMode: 'bypassPermissions',
              resume: sessionId ?? undefined,
              cwd,
            }
          })) {
            // 获取 session ID
            if (message.type === 'system' && message.subtype === 'init' && message.session_id) {
              claudeSessionId = message.session_id;
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
            if (message.type === 'assistant' && message.message?.content) {
              const content = message.message.content;


              if (Array.isArray(content)) {
                // 发送数组中的每个内容
                for (const item of content) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: 'message',
                        content: item,
                        messageId: message.message.id // 添加消息 ID
                      })}\n\n`
                    )
                  );
                  messageContents.push(item as ContentItem);
                }
              } else {
                // 发送单个内容
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: 'message',
                      content: content,
                      messageId: message.message.id // 添加消息 ID
                    })}\n\n`
                  )
                );
                messageContents.push(content as ContentItem);
              }
            }

            // 获取最终结果
            if (message.type === 'result' && message.subtype === 'success' && message.result) {
              finalResult = message.result;
              const resultString = typeof finalResult === 'string'
                ? finalResult
                : JSON.stringify(finalResult);

              // 将最终结果添加到消息内容中，但不单独发送
              messageContents.push({
                type: 'text',
                text: resultString,
                citations: null
              } as ContentItem);
            }
          }

          // 保存到数据库
          if (claudeSessionId) {
            const messagesToSave: StoredMessage[] = [
              {
                role: 'user' as const,
                content: userQuery,
                timestamp: new Date().toISOString()
              },
              ...(messageContents.length > 0 ? [{
                role: 'assistant' as const,
                content: messageContents,
                timestamp: new Date().toISOString()
              }] : [])
            ];

            if (!sessionId) {
              // 创建新会话
              const title = userQuery.length > 20
                ? userQuery.substring(0, 20) + "..."
                : userQuery;

              await db.agentSession.create({
                data: {
                  workspaceId,
                  userId: session.user.id,
                  title,
                  sessionId: claudeSessionId,
                  messages: toPrismaJson(messagesToSave),
                }
              });
            } else {
              // 更新现有会话
              const existingSession = await db.agentSession.findUnique({
                where: { sessionId },
                select: { messages: true }
              });

              if (existingSession) {
                const existingMessages: StoredMessage[] = Array.isArray(existingSession.messages)
                  ? existingSession.messages
                    .filter((msg): msg is Prisma.JsonObject => {
                      if (!msg || typeof msg !== 'object') return false;
                      const messageObj = msg as Record<string, unknown>;
                      return (
                        'role' in messageObj &&
                        'content' in messageObj &&
                        'timestamp' in messageObj &&
                        (messageObj.role === 'user' || messageObj.role === 'assistant')
                      );
                    })
                    .map((msg) => {
                      const messageObj = msg as Record<string, unknown>;
                      return {
                        role: messageObj.role as "user" | "assistant",
                        content: messageObj.content as string | ContentItem[],
                        timestamp: messageObj.timestamp as string
                      };
                    })
                  : [];

                await db.agentSession.update({
                  where: { sessionId },
                  data: {
                    messages: toPrismaJson([...existingMessages, ...messagesToSave]),
                    updatedAt: new Date()
                  }
                });
              }
            }
          }

          // 发送完成信号
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'done'
              })}\n\n`
            )
          );

          controller.close();
        } catch (error) {
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