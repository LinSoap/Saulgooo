import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { mkdir, rmdir, readdir, stat } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import type { FileTreeItem } from "../types/file";

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

  })