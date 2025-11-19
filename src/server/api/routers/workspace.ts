import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { mkdir, rmdir, writeFile } from "fs/promises";
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
                .replace(/[^\p{L}\p{N}-]/gu, '');
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
})