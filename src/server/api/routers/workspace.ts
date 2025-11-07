import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { mkdir, rmdir, readdir, stat, writeFile, rename, unlink } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import type { FileTreeItem } from "../types/file";
import chokidar, { type FSWatcher } from "chokidar";

// 文件变化事件类型
interface FileChangeEvent {
    workspaceId: string;
    event: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
    path: string;
    timestamp: number;
}

// 简单的文件监听器管理
const watchers = new Map<string, FSWatcher>();
const subscribers = new Map<string, Set<(event: FileChangeEvent) => void>>();

export const workSpaceRouter = createTRPCRouter({
    getWorkSpaces: protectedProcedure
        .query(async ({ ctx }) => {
            const workspaces = await ctx.db.workspace.findMany({
                where: {
                    ownerId: ctx.session.user.id,
                },
            });
            return workspaces.map(workspace => ({
                id: workspace.id,
                name: workspace.name,
                description: workspace.description ?? undefined,
                memberCount: 1, // 暂时硬编码，之后可以计算实际成员数
                role: "owner" as const,
                updatedAt: workspace.updatedAt,
            }));
        }),
    getWorkSpaceById: protectedProcedure
        .input(
            z.object({
                workspaceId: z.string().cuid(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const workspace = await ctx.db.workspace.findUnique({
                where: {
                    id: input.workspaceId,
                    ownerId: ctx.session.user.id,
                },
            });

            if (!workspace) {
                throw new Error("Workspace not found");
            }

            return {
                id: workspace.id,
                name: workspace.name,
                description: workspace.description ?? undefined,
                memberCount: 1, // 暂时硬编码，之后可以计算实际成员数
                role: "owner" as const,
                updatedAt: workspace.updatedAt,
            };
        }),
    createWorkSpace: protectedProcedure
        .input(
            z.object({
                name: z.string().min(2).max(100),
                description: z.string().max(500).optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            // 检查用户是否已经有一个同名的工作空间
            const existingWorkspace = await ctx.db.workspace.findFirst({
                where: {
                    ownerId: ctx.session.user.id,
                    name: input.name,
                },
            });

            if (existingWorkspace) {
                throw new Error(`您已经有一个名为 "${input.name}" 的工作空间，请使用不同的名称`);
            }

            // 生成简单的工作区路径：用户ID-工作区名称-时间戳
            const sanitizedName = input.name
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');
            const timestamp = Date.now();
            const path = `${ctx.session.user.id}-${sanitizedName}-${timestamp}`;
            const workspacePath = join(homedir(), 'workspaces', path);
            const groupName = ctx.session.user.name + "-" + input.name;

            // 创建文件夹
            await mkdir(workspacePath, { recursive: true });

            // 创建 CLAUDE.md 文件
            const claudeMdPath = join(workspacePath, 'CLAUDE.md');
            const claudeMdContent = `# ${input.name}

${input.description ?? '这是一个新的工作空间'}

## 📋 重要提醒

**⚠️ 请务必修改此文件！**

此 \`CLAUDE.md\` 文件用于管理工作区的工作逻辑和项目信息。请根据您的具体需求更新以下内容：

- 项目说明：详细描述项目的目标和功能
- 开发指南：配置环境、项目结构、使用说明等
- 工作流程：团队协作规范和开发流程

## 项目说明

请在这里添加项目的详细说明...

## 开发指南

### 环境配置

### 项目结构

### 使用说明

## 工作流程

### 开发规范

### 协作流程

### 注意事项

---
*此文件由系统自动创建于 ${new Date().toISOString()}*
*请及时更新此文件以反映项目的实际情况*
`;
            await writeFile(claudeMdPath, claudeMdContent, 'utf-8');

            // 创建数据库记录
            const workspace = await ctx.db.workspace.create({
                data: {
                    name: input.name,
                    description: input.description,
                    ownerId: ctx.session.user.id,
                    path: path,
                    teacherGroup: groupName + "-teachers",
                    studentGroup: groupName + "-students",
                    members: {}
                },
            });

            return workspace;
        }),
    deleteWorkSpace: protectedProcedure
        .input(
            z.object({
                workspaceId: z.string().cuid(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            // 先获取workspace信息，用于删除文件夹
            const workspace = await ctx.db.workspace.findUnique({
                where: {
                    id: input.workspaceId,
                    ownerId: ctx.session.user.id, // 确保只能删除自己的workspace
                },
            });

            if (!workspace) {
                throw new Error("Workspace not found");
            }

            // 删除数据库记录
            const deletedWorkspace = await ctx.db.workspace.delete({
                where: {
                    id: input.workspaceId,
                },
            });

            // 删除对应的文件夹
            try {
                if (workspace.path) {
                    const workspacePath = join(homedir(), 'workspaces', workspace.path);
                    await rmdir(workspacePath, { recursive: true });
                }
            } catch {
                // 文件夹删除失败
                // 文件夹删除失败不影响数据库删除结果，只记录错误
            }

            return deletedWorkspace;
        }),
    updateWorkSpace: protectedProcedure
        .input(
            z.object({
                workspaceId: z.string().cuid(),
                name: z.string().min(2).max(100).optional(),
                description: z.string().max(500).optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const workspace = await ctx.db.workspace.update({
                where: {
                    id: input.workspaceId,
                },
                data: {
                    name: input.name,
                    description: input.description,
                },
            });
            return workspace;
        }),

    // 获取工作区文件树
    getFileTree: protectedProcedure
        .input(z.object({
            workspaceId: z.string().cuid(),
        }))
        .query(async ({ ctx, input }) => {
            const workspace = await ctx.db.workspace.findUnique({
                where: { id: input.workspaceId, ownerId: ctx.session.user.id },
            });

            if (!workspace) throw new Error("Workspace not found");

            const basePath = join(homedir(), 'workspaces', workspace.path);
            const ignoreItems = ['.git', 'node_modules', '.next', 'dist'];

            // 检查目录是否存在
            try {
                await stat(basePath);
            } catch {
                throw new Error(`Cannot access workspace directory: ${basePath}`);
            }

            const buildTree = async (dirPath: string, relativePath = ""): Promise<FileTreeItem[]> => {
                const items = await readdir(dirPath);
                const result: FileTreeItem[] = [];

                for (const item of items) {
                    if (ignoreItems.includes(item)) {
                        continue;
                    }

                    const fullPath = join(dirPath, item);
                    const itemRelativePath = join(relativePath, item);
                    const stats = await stat(fullPath);

                    if (stats.isDirectory()) {
                        const children = await buildTree(fullPath, itemRelativePath);
                        result.push({
                            id: itemRelativePath,
                            name: item,
                            path: itemRelativePath,
                            type: 'directory',
                            size: 0,
                            modifiedAt: stats.mtime,
                            createdAt: stats.birthtime,
                            children: children.length > 0 ? children : undefined,
                            hasChildren: children.length > 0
                        });
                    } else {
                        result.push({
                            id: itemRelativePath,
                            name: item,
                            path: itemRelativePath,
                            type: 'file',
                            size: stats.size,
                            modifiedAt: stats.mtime,
                            createdAt: stats.birthtime,
                            extension: item.includes('.') ? item.split('.').pop()?.toLowerCase() : undefined
                        });
                    }
                }

                return result.sort((a, b) => {
                    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
                    return a.name.localeCompare(b.name);
                });
            };

            const tree = await buildTree(basePath);

            return {
                workspaceId: workspace.id,
                workspaceName: workspace.name,
                tree: tree,
                rootPath: basePath
            };
        }),

    // 监听工作区文件变化
    watchFiles: protectedProcedure
        .input(z.object({
            workspaceId: z.string(),
        }))
        .subscription(async function* ({ ctx, input }) {
            const { workspaceId } = input;

            // 获取工作区路径
            const workspace = await ctx.db.workspace.findUnique({
                where: { id: workspaceId, ownerId: ctx.session.user.id }
            });

            if (!workspace) {
                throw new Error("Workspace not found");
            }

            const workspacePath = join(homedir(), 'workspaces', workspace.path);

            // 文件变化队列
            const eventQueue: FileChangeEvent[] = [];
            let hasNewEvent = false;

            // 定义事件处理器
            const handler = (event: FileChangeEvent) => {
                eventQueue.push(event);
                hasNewEvent = true;
            };

            // 如果已经有监听器，添加新订阅者
            if (watchers.has(workspaceId)) {
                const subs = subscribers.get(workspaceId) ?? new Set();
                subs.add(handler);
                subscribers.set(workspaceId, subs);
            } else {
                // 创建新监听器
                const watcher = chokidar.watch(workspacePath, {
                    ignored: ['.git', 'node_modules', '.next', 'dist'],
                    ignoreInitial: true,
                    awaitWriteFinish: {
                        stabilityThreshold: 300,
                        pollInterval: 100
                    }
                });

                // 订阅者列表
                subscribers.set(workspaceId, new Set([handler]));

                // 监听文件变化
                watcher.on('all', (event, path) => {
                    const relativePath = path.replace(workspacePath + '/', '');
                    const changeEvent: FileChangeEvent = {
                        workspaceId,
                        event: event as FileChangeEvent['event'],
                        path: relativePath,
                        timestamp: Date.now()
                    };

                    // 通知所有订阅者
                    const subs = subscribers.get(workspaceId);
                    if (subs) {
                        subs.forEach(sub => sub(changeEvent));
                    }
                });

                watcher.on('error', (error: unknown) => {
                    // 收窄错误类型，避免 ESLint 抱怨 unsafe-assignment / unsafe-call
                    if (error instanceof Error) {
                        console.error(`[FileWatcher] Error in workspace ${workspaceId}:`, error);
                    } else {
                        console.error(`[FileWatcher] Error in workspace ${workspaceId}:`, String(error));
                    }
                });

                watchers.set(workspaceId, watcher);
            }

            try {
                while (true) {
                    // 等待新事件
                    if (hasNewEvent && eventQueue.length > 0) {
                        const event = eventQueue.shift()!;
                        hasNewEvent = eventQueue.length > 0;
                        yield event;
                    } else {
                        // 每1秒检查一次
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            } finally {
                // 清理订阅者
                const subs = subscribers.get(workspaceId);
                if (subs) {
                    subs.delete(handler);
                    if (subs.size === 0) {
                        subscribers.delete(workspaceId);
                        const watcher = watchers.get(workspaceId);
                        if (watcher) {
                            // 如果 watcher 支持 close 方法则调用（保持类型安全）
                            try {
                                if (typeof watcher.close === 'function') {
                                    void watcher.close();
                                }
                            } catch {
                                // 忽略 close 抛出的错误
                            }
                            watchers.delete(workspaceId);
                        }
                    }
                }
            }
        }),

    // 删除文件或文件夹
    deleteFile: protectedProcedure
        .input(z.object({
            workspaceId: z.string(),
            path: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { workspaceId, path } = input;

            // 获取工作区路径
            const workspace = await ctx.db.workspace.findUnique({
                where: { id: workspaceId, ownerId: ctx.session.user.id }
            });

            if (!workspace) {
                throw new Error("Workspace not found");
            }

            const workspacePath = join(homedir(), 'workspaces', workspace.path);
            const fullPath = join(workspacePath, path);

            try {
                const stats = await stat(fullPath);

                if (stats.isDirectory()) {
                    await rmdir(fullPath, { recursive: true });
                } else {
                    await unlink(fullPath);
                }

                return { success: true, message: `已成功删除: ${path}` };
            } catch (error) {
                console.error(`Failed to delete ${path}:`, error);
                throw new Error(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`);
            }
        }),

    // 重命名文件或文件夹
    renameFile: protectedProcedure
        .input(z.object({
            workspaceId: z.string(),
            oldPath: z.string(),
            newPath: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { workspaceId, oldPath, newPath } = input;

            // 获取工作区路径
            const workspace = await ctx.db.workspace.findUnique({
                where: { id: workspaceId, ownerId: ctx.session.user.id }
            });

            if (!workspace) {
                throw new Error("Workspace not found");
            }

            const workspacePath = join(homedir(), 'workspaces', workspace.path);
            const oldFullPath = join(workspacePath, oldPath);
            const newFullPath = join(workspacePath, newPath);

            try {
                // 检查新路径是否已存在
                try {
                    const stats = await stat(newFullPath);
                    // 如果能获取到状态，说明文件已存在
                    if (stats) {
                        throw new Error("目标路径已存在");
                    }
                } catch (statError) {
                    // 检查是否是"文件不存在"的错误
                    if (statError instanceof Error && 'code' in statError && statError.code !== 'ENOENT') {
                        // 如果不是 ENOENT (文件不存在) 错误，则抛出
                        throw statError;
                    }
                    // ENOENT 错误表示文件不存在，这是正常的，继续执行
                }

                // 执行重命名
                await rename(oldFullPath, newFullPath);

                return { success: true, message: `已成功重命名: ${oldPath} → ${newPath}` };
            } catch (error) {
                console.error(`Failed to rename ${oldPath} to ${newPath}:`, error);
                throw new Error(`重命名失败: ${error instanceof Error ? error.message : '未知错误'}`);
            }
        }),

})