import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { mkdir, rmdir, readdir, stat, writeFile, readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import type { FileTreeItem } from "../types/file";

// 简单的 MIME 类型检测
function getMimeType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const commonTypes: Record<string, string> = {
        'md': 'text/markdown',
        'js': 'text/javascript',
        'ts': 'text/typescript',
        'json': 'application/json',
        'png': 'image/png',
        'jpg': 'image/jpeg'
    };
    return commonTypes[ext ?? ''] ?? 'text/plain';
}

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
            // 生成简单的工作区路径：用户ID-工作区名称
            const sanitizedName = input.name
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');
            const path = `${ctx.session.user.id}-${sanitizedName}`;
            const workspacePath = join(homedir(), 'workspaces', path);
            const groupName = ctx.session.user.name + "-" + input.name;

            // 创建文件夹
            await mkdir(workspacePath, { recursive: true });

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

    // 获取文件内容
    getFileContent: protectedProcedure
        .input(z.object({
            workspaceId: z.string().cuid(),
            filePath: z.string(),
        }))
        .query(async ({ ctx, input }) => {
            const workspace = await ctx.db.workspace.findUnique({
                where: { id: input.workspaceId, ownerId: ctx.session.user.id },
            });

            if (!workspace) throw new Error("Workspace not found");

            const basePath = join(homedir(), 'workspaces', workspace.path);
            const fullPath = join(basePath, input.filePath);

            // 简单的路径验证
            if (!fullPath.startsWith(basePath)) {
                throw new Error("Invalid path");
            }

            const stats = await stat(fullPath);
            if (!stats.isFile()) throw new Error("Not a file");
            if (stats.size > 5 * 1024 * 1024) throw new Error("File too large");

            return {
                content: await readFile(fullPath, 'utf-8'),
                size: stats.size,
                modifiedAt: stats.mtime,
                mimeType: getMimeType(input.filePath)
            };
        }),

    // 创建 Markdown 文件
    createMarkdownFile: protectedProcedure
        .input(z.object({
            workspaceId: z.string().cuid(),
            fileName: z.string().min(1).max(255),
            directoryPath: z.string().optional().default(""),
            initialContent: z.string().optional().default("# Untitled\n\n"),
        }))
        .mutation(async ({ ctx, input }) => {
            const workspace = await ctx.db.workspace.findUnique({
                where: { id: input.workspaceId, ownerId: ctx.session.user.id },
            });

            if (!workspace) throw new Error("Workspace not found");

            const fileName = input.fileName.endsWith('.md') ? input.fileName : `${input.fileName}.md`;
            const basePath = join(homedir(), 'workspaces', workspace.path);
            const directoryPath = join(basePath, input.directoryPath);
            const filePath = join(directoryPath, fileName);

            // 简单的路径验证
            if (!filePath.startsWith(basePath)) {
                throw new Error("Invalid path");
            }

            try {
                await stat(filePath);
                throw new Error("File exists");
            } catch {
                // File doesn't exist, continue
            }

            await mkdir(directoryPath, { recursive: true });
            await writeFile(filePath, input.initialContent, 'utf-8');
            const stats = await stat(filePath);

            return {
                success: true,
                fileName,
                filePath: input.directoryPath ? join(input.directoryPath, fileName) : fileName,
                size: stats.size,
                createdAt: stats.birthtime
            };
        }),

    // 更新文件内容
    updateFileContent: protectedProcedure
        .input(z.object({
            workspaceId: z.string().cuid(),
            filePath: z.string(),
            content: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            const workspace = await ctx.db.workspace.findUnique({
                where: { id: input.workspaceId, ownerId: ctx.session.user.id },
            });

            if (!workspace) throw new Error("Workspace not found");

            const basePath = join(homedir(), 'workspaces', workspace.path);
            const fullPath = join(basePath, input.filePath);

            // 简单的路径验证
            if (!fullPath.startsWith(basePath)) {
                throw new Error("Invalid path");
            }

            // 检查文件是否存在
            const stats = await stat(fullPath);
            if (!stats.isFile()) throw new Error("Not a file");

            // 更新文件内容
            await writeFile(fullPath, input.content, 'utf-8');
            const newStats = await stat(fullPath);

            return {
                success: true,
                size: newStats.size,
                modifiedAt: newStats.mtime,
            };
        }),

    // 上传文件（支持任意类型）
    uploadFile: protectedProcedure
        .input(z.object({
            workspaceId: z.string().cuid(),
            fileName: z.string().min(1).max(255),
            directoryPath: z.string().optional().default(""),
            content: z.string(), // base64编码的文件内容
            mimeType: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const workspace = await ctx.db.workspace.findUnique({
                where: { id: input.workspaceId, ownerId: ctx.session.user.id },
            });

            if (!workspace) throw new Error("Workspace not found");

            const basePath = join(homedir(), 'workspaces', workspace.path);
            const directoryPath = join(basePath, input.directoryPath);
            const filePath = join(directoryPath, input.fileName);

            // 路径验证，确保在workspace目录内
            if (!filePath.startsWith(basePath)) {
                throw new Error("Invalid path");
            }

            // 创建目录（如果不存在）
            await mkdir(directoryPath, { recursive: true });

            // 解码base64内容并写入文件
            const buffer = Buffer.from(input.content, 'base64');
            await writeFile(filePath, buffer);

            const stats = await stat(filePath);

            return {
                success: true,
                fileName: input.fileName,
                filePath: input.directoryPath ? join(input.directoryPath, input.fileName) : input.fileName,
                size: stats.size,
                mimeType: input.mimeType ?? 'application/octet-stream',
                createdAt: stats.birthtime,
            };
        }),
})