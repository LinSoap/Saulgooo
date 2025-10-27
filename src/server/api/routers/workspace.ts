import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { mkdir, rmdir } from "fs/promises";
import { join } from "path";
import { homedir } from "os";


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
            // 生成唯一的workspace名称：用户ID + workspace名称 + 时间戳
            const timestamp = Date.now();
            const sanitized_name = input.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const uniqueWorkspaceName = `${ctx.session.user.id}-${sanitized_name}-${timestamp}`;
            const path = "~/workspaces/" + uniqueWorkspaceName;
            const groupName = ctx.session.user.name + "-" + input.name;

            // 先创建文件夹，如果失败就不会创建数据库记录
            try {
                const homeDir = homedir();
                const workspacePath = join(homeDir, 'workspaces', uniqueWorkspaceName);
                await mkdir(workspacePath, { recursive: true });
            } catch (fsError) {
                throw new Error(`Failed to create workspace directory: ${fsError instanceof Error ? fsError.message : 'Unknown error'}`);
            }

            // 文件夹创建成功后，创建数据库记录
            try {
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
            } catch (dbError) {
                // 如果数据库创建失败，清理已创建的文件夹
                try {
                    const homeDir = homedir();
                    const workspacePath = join(homeDir, 'workspaces', uniqueWorkspaceName);
                    await rmdir(workspacePath, { recursive: true });
                } catch (cleanupError) {
                    console.error('Failed to cleanup workspace directory:', cleanupError);
                }

                throw new Error(`Failed to create workspace record: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
            }
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
                if (workspace.path && workspace.path.startsWith("~/workspaces/")) {
                    // 提取文件夹名称
                    const folderName = workspace.path.replace("~/workspaces/", "");
                    const homeDir = homedir();
                    const workspacePath = join(homeDir, 'workspaces', folderName);

                    await rmdir(workspacePath, { recursive: true });
                    console.log(`Workspace directory deleted: ${workspacePath}`);
                }
            } catch (fsError) {
                console.error('Failed to delete workspace directory:', fsError);
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
        }
        )
})