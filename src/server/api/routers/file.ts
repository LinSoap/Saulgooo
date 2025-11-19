import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { mkdir, rmdir, readdir, stat, writeFile, rename, unlink, readFile } from "fs/promises";
import { join } from "path";
import type { FileTreeItem } from "../types/file";
import { getWorkspaceBaseDir } from "~/lib/workspace-config";
import chokidar, { type FSWatcher } from "chokidar";
import { getMimeType } from "~/lib/file";

// 定义上下文类型
import type { createTRPCContext } from "../trpc";
type Context = Awaited<ReturnType<typeof createTRPCContext>>;

// ========================
// 辅助函数
// ========================

/**
 * 验证用户是否有权访问工作区并返回工作区信息
 */
async function ensureWorkspaceOwnership(
    ctx: Context,
    workspaceId: string
) {
    if (!ctx.session?.user) {
        throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Not authenticated"
        });
    }

    const workspace = await ctx.db.workspace.findUnique({
        where: {
            id: workspaceId,
            ownerId: ctx.session.user.id
        },
    });

    if (!workspace?.path) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workspace not found or access denied"
        });
    }

    const basePath = join(getWorkspaceBaseDir(), workspace.path);

    return { workspace, basePath };
}

/**
 * 验证文件路径是否在工作区目录内
 */
function validateFilePath(absolutePath: string, basePath: string) {
    if (!absolutePath.startsWith(basePath)) {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied"
        });
    }
}

/**
 * 验证并获取文件状态
 */
async function validateAndGetFileStats(
    ctx: Context,
    workspaceId: string,
    filePath: string
) {
    const { basePath } = await ensureWorkspaceOwnership(ctx, workspaceId);
    const absoluteFilePath = join(basePath, filePath);

    validateFilePath(absoluteFilePath, basePath);

    const fileStats = await stat(absoluteFilePath).catch(() => null);
    if (!fileStats) {
        throw new Error("File not found");
    }

    if (!fileStats.isFile()) {
        throw new Error("Not a file");
    }

    return { absoluteFilePath, fileStats };
}

// 文件变化事件类型
interface FileChangeEvent {
    workspaceId: string;
    event: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
    path: string;
    timestamp: number;
}

// 文件监听器管理（从 workspace router 迁移）
const watchers = new Map<string, FSWatcher>();
const subscribers = new Map<string, Set<(event: FileChangeEvent) => void>>();

export const fileRouter = createTRPCRouter({
    // 文件树操作
    getFileTree: protectedProcedure
        .input(z.object({
            workspaceId: z.string().cuid(),
        }))
        .query(async ({ ctx, input }) => {
            const { basePath, workspace } = await ensureWorkspaceOwnership(ctx, input.workspaceId);
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

    // 文件内容操作
    uploadFile: protectedProcedure
        .input(z.object({
            workspaceId: z.string().cuid(),
            filePath: z.string(),
            content: z.string(),
            encoding: z.enum(['utf-8', 'base64']).default('utf-8'),
            mimeType: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { workspaceId, filePath, content, encoding } = input;

            // 验证workspace存在且用户有权限访问
            const { basePath } = await ensureWorkspaceOwnership(ctx, workspaceId);
            const absoluteFilePath = join(basePath, filePath);

            // 安全检查：确保文件在workspace目录内
            validateFilePath(absoluteFilePath, basePath);

            // 检查文件是否已存在
            const fileExists = await stat(absoluteFilePath).catch(() => null);
            if (fileExists) {
                throw new Error("File already exists");
            }

            // 确保目录存在
            const directory = absoluteFilePath.substring(0, absoluteFilePath.lastIndexOf('/'));
            await mkdir(directory, { recursive: true });

            // 根据编码保存文件
            if (encoding === 'base64') {
                const buffer = Buffer.from(content, 'base64');
                await writeFile(absoluteFilePath, buffer);
            } else {
                await writeFile(absoluteFilePath, content, 'utf-8');
            }

            // 获取文件信息
            const fileStats = await stat(absoluteFilePath);

            return {
                success: true,
                fileName: filePath.split('/').pop() ?? filePath,
                filePath: filePath,
                size: fileStats.size,
                createdAt: fileStats.birthtime,
            };
        }),

    saveFileContent: protectedProcedure
        .input(z.object({
            workspaceId: z.string().cuid(),
            filePath: z.string(),
            content: z.string(),
            encoding: z.enum(['utf-8', 'base64']).default('utf-8'),
        }))
        .mutation(async ({ ctx, input }) => {
            const { workspaceId, filePath, content, encoding } = input;

            // 验证workspace存在且用户有权限访问
            const workspace = await ctx.db.workspace.findUnique({
                where: {
                    id: workspaceId,
                    ownerId: ctx.session.user.id,
                },
            });

            if (!workspace?.path) {
                throw new Error("Workspace not found");
            }

            // 构建文件绝对路径
            const basePath = join(getWorkspaceBaseDir(), workspace.path);
            const absoluteFilePath = join(basePath, filePath);

            // 安全检查：确保文件在workspace目录内
            if (!absoluteFilePath.startsWith(basePath)) {
                throw new Error("Access denied");
            }

            // 检查文件是否存在
            const fileExists = await stat(absoluteFilePath).catch(() => null);
            if (!fileExists) {
                throw new Error("File not found");
            }

            // 确保是文件而不是目录
            if (!fileExists.isFile()) {
                throw new Error("Not a file");
            }

            // 根据编码保存文件
            if (encoding === 'base64') {
                const buffer = Buffer.from(content, 'base64');
                await writeFile(absoluteFilePath, buffer);
            } else {
                await writeFile(absoluteFilePath, content, 'utf-8');
            }

            // 获取更新后的文件信息
            const newStats = await stat(absoluteFilePath);

            return {
                success: true,
                size: newStats.size,
                modifiedAt: newStats.mtime,
            };
        }),

    fetchFileMetadata: protectedProcedure
        .input(z.object({
            workspaceId: z.string().cuid(),
            filePath: z.string(),
        }))
        .query(async ({ ctx, input }) => {
            const { workspaceId, filePath } = input;

            const { absoluteFilePath, fileStats } = await validateAndGetFileStats(ctx, workspaceId, filePath);

            // 获取 MIME 类型
            const mimeType = getMimeType(absoluteFilePath);

            return {
                size: fileStats.size,
                modifiedAt: fileStats.mtime,
                mimeType,
                fileName: filePath.split('/').pop() ?? filePath,
                filePath,
            };
        }),

    fetchFileContent: protectedProcedure
        .input(z.object({
            workspaceId: z.string().cuid(),
            filePath: z.string(),
        }))
        .query(async ({ ctx, input }) => {
            const { workspaceId, filePath } = input;

            const { absoluteFilePath, fileStats } = await validateAndGetFileStats(ctx, workspaceId, filePath);

            // 获取 MIME 类型
            const mimeType = getMimeType(absoluteFilePath);

            // 判断是否为文本文件
            const isText = mimeType.startsWith('text/') ||
                mimeType.includes('json') ||
                mimeType.includes('xml') ||
                mimeType.includes('javascript') ||
                mimeType.includes('yaml');

            let content: string;
            let encoding: 'utf-8' | 'base64';

            if (isText) {
                // 读取文本文件
                content = await readFile(absoluteFilePath, 'utf-8');
                encoding = 'utf-8';
            } else {
                // 对于二进制文件，返回 base64
                const buffer = await readFile(absoluteFilePath);
                content = buffer.toString('base64');
                encoding = 'base64';
            }

            return {
                content,
                encoding,
                size: fileStats.size,
                modifiedAt: fileStats.mtime,
                mimeType,
                fileName: filePath.split('/').pop() ?? filePath,
            };
        }),

    // 文件系统操作
    createFolder: protectedProcedure
        .input(z.object({
            workspaceId: z.string().cuid(),
            folderPath: z.string().min(1).max(255),
        }))
        .mutation(async ({ ctx, input }) => {
            const { workspaceId, folderPath } = input;

            // 验证workspace存在且用户有权限访问
            const workspace = await ctx.db.workspace.findUnique({
                where: {
                    id: workspaceId,
                    ownerId: ctx.session.user.id,
                },
            });

            if (!workspace?.path) {
                throw new Error("Workspace not found");
            }

            // 验证文件夹名不包含非法字符
            if (folderPath.includes('\\') || folderPath.includes('..') || folderPath.includes('//')) {
                throw new Error("文件夹名包含非法字符");
            }

            // 构建文件夹绝对路径
            const basePath = join(getWorkspaceBaseDir(), workspace.path);
            const absoluteFolderPath = join(basePath, folderPath);

            // 安全检查：确保文件夹在workspace目录内
            if (!absoluteFolderPath.startsWith(basePath)) {
                throw new Error("Access denied");
            }

            try {
                // 检查路径是否已存在（文件或文件夹）
                const pathExists = await stat(absoluteFolderPath).catch(() => null);
                if (pathExists) {
                    if (pathExists.isDirectory()) {
                        throw new Error("文件夹已存在");
                    } else {
                        throw new Error("同名的文件已存在");
                    }
                }

                // 创建文件夹
                await mkdir(absoluteFolderPath, { recursive: true });

                // 获取文件夹信息
                const folderStats = await stat(absoluteFolderPath);

                return {
                    success: true,
                    folderName: folderPath.split('/').pop() ?? folderPath,
                    folderPath: folderPath,
                    createdAt: folderStats.birthtime,
                    type: "directory",
                };
            } catch (error) {
                console.error("Failed to create folder:", error);
                if (error instanceof Error) {
                    throw new Error(`创建文件夹失败: ${error.message}`);
                }
                throw new Error("创建文件夹失败");
            }
        }),

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

            const workspacePath = join(getWorkspaceBaseDir(), workspace.path);
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

            const workspacePath = join(getWorkspaceBaseDir(), workspace.path);
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

    searchFiles: protectedProcedure
        .input(z.object({
            workspaceId: z.string().cuid(),
            query: z.string().optional(),
            limit: z.number().optional().default(20),
        }))
        .query(async ({ ctx, input }) => {
            const { workspaceId, query, limit } = input;

            // 验证workspace存在且用户有权限访问
            const workspace = await ctx.db.workspace.findUnique({
                where: {
                    id: workspaceId,
                    ownerId: ctx.session.user.id,
                },
            });

            if (!workspace?.path) {
                throw new Error("Workspace not found");
            }

            // 构建工作区基础路径
            const basePath = join(getWorkspaceBaseDir(), workspace.path);

            // 递归搜索文件
            async function searchFiles(dir: string, depth = 0): Promise<Array<{
                name: string;
                path: string;
                type: string;
                size: number;
                modifiedAt: Date;
            }>> {
                const maxDepth = 5; // 限制搜索深度
                if (depth > maxDepth) return [];

                const results: Array<{
                    name: string;
                    path: string;
                    type: string;
                    size: number;
                    modifiedAt: Date;
                }> = [];

                try {
                    const entries = await readdir(dir, { withFileTypes: true });

                    for (const entry of entries) {
                        const fullPath = join(dir, entry.name);
                        const relativePath = fullPath.replace(basePath + "/", "");

                        // 跳过隐藏文件和目录
                        if (entry.name.startsWith(".")) continue;

                        // 跳过 node_modules 等常见目录
                        if (["node_modules", ".git", ".next", "dist", "build"].includes(entry.name)) continue;

                        try {
                            const stats = await stat(fullPath);

                            if (entry.isFile()) {
                                // 检查文件名是否匹配查询
                                if (query && !entry.name.toLowerCase().includes(query.toLowerCase())) {
                                    continue;
                                }

                                // 获取 MIME 类型 - 使用已有的 getMimeType 函数
                                const mimeType = getMimeType(fullPath);

                                results.push({
                                    name: entry.name,
                                    path: relativePath,
                                    type: mimeType,
                                    size: stats.size,
                                    modifiedAt: stats.mtime,
                                });
                            } else if (entry.isDirectory()) {
                                // 递归搜索子目录
                                const subResults = await searchFiles(fullPath, depth + 1);
                                results.push(...subResults);
                            }
                        } catch (error) {
                            // 忽略无法访问的文件/目录
                            console.warn(`Cannot access ${fullPath}:`, error);
                        }
                    }
                } catch (error) {
                    console.warn(`Cannot read directory ${dir}:`, error);
                }

                return results;
            }

            const files = await searchFiles(basePath);

            // 按修改时间排序，最新的在前
            files.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());

            // 限制返回数量
            const limitedFiles = files.slice(0, limit);

            return {
                files: limitedFiles.map(file => ({
                    id: file.path,
                    name: file.name,
                    path: file.path,
                    type: file.type,
                    size: file.size,
                    modifiedAt: file.modifiedAt.toISOString(),
                })),
                total: files.length,
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

            const workspacePath = join(getWorkspaceBaseDir(), workspace.path);

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
})