import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { readFile, readdir, mkdir } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import type { PluginManifest, PluginItem } from "~/types/plugin";
import { copyRecursive } from "~/utils/file-operations";

export const pluginRouter = createTRPCRouter({
  // 获取插件资源列表
  getPlugin: protectedProcedure
    .input(z.object({
      type: z.enum(['agent', 'skill']).optional()
    }))
    .query(async ({ ctx, input }) => {
      try {
        // 读取 manifest.json
        const manifestPath = join(process.cwd(), 'resources', 'manifest.json');
        const manifestContent = await readFile(manifestPath, 'utf-8');
        const manifest: PluginManifest = JSON.parse(manifestContent);

        // 根据类型过滤
        if (input.type === 'agent') {
          return {
            items: manifest.agents.map(item => ({ ...item, itemType: 'agent' as const }))
          };
        } else if (input.type === 'skill') {
          return {
            items: manifest.skills.map(item => ({ ...item, itemType: 'skill' as const }))
          };
        }

        // 返回所有资源
        return {
          items: [
            ...manifest.agents.map(item => ({ ...item, itemType: 'agent' as const })),
            ...manifest.skills.map(item => ({ ...item, itemType: 'skill' as const }))
          ]
        };
      } catch (error) {
        console.error('Error loading plugin manifest:', error);
        return { items: [] };
      }
    }),

  // 导入插件到工作区
  importPlugin: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      resourceType: z.enum(['agent', 'skill']),
      path: z.string(), // 资源在插件库中的路径
      name: z.string()  // 资源名称，用作目标文件夹名
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // 1. 验证工作区权限
        const workspace = await ctx.db.workspace.findFirst({
          where: {
            id: input.workspaceId,
            ownerId: ctx.session.user.id
          }
        });

        if (!workspace) {
          throw new Error("工作区不存在或无权限访问");
        }

        // 2. 构建源路径和目标路径
        const sourcePath = join(process.cwd(), 'resources', input.path);
        const workspaceBasePath = join(homedir(), 'workspaces', workspace.path);

        // 从 path 中提取文件夹名称 (例如: "agents/whoasr" -> "whoasr")
        const pathParts = input.path.split('/');
        const folderName = pathParts[pathParts.length - 1] || input.name;

        // 导入到 workspace/.claude/agents 或 workspace/.claude/skills
        const targetDir = input.resourceType === 'agent' ? 'agents' : 'skills';
        const targetPath = join(workspaceBasePath, '.claude', targetDir, folderName);
        console.log('源路径:', sourcePath);
        console.log('目标路径:', targetPath);

        // 3. 检查源路径是否存在
        try {
          await readdir(sourcePath);
        } catch {
          throw new Error("插件资源不存在");
        }

        // 4. 创建目标目录（如果不存在）
        await mkdir(join(workspaceBasePath, '.claude', targetDir), { recursive: true });
        await mkdir(targetPath, { recursive: true });

        // 5. 递归复制所有文件
        await copyRecursive(sourcePath, targetPath);

        // 6. 返回成功信息
        return {
          success: true,
          message: `成功导入 ${input.resourceType} "${input.name}" 到工作区`,
          targetPath: join('.claude', targetDir, folderName)
        };

      } catch (error) {
        console.error('Error importing plugin:', error);
        throw new Error(error instanceof Error ? error.message : "导入插件失败");
      }
    })
});