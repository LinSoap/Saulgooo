import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { readFile } from "fs/promises";
import { join, basename } from "path";
import { homedir } from "os";
import fsExtra from 'fs-extra';
import type { PluginManifest } from "~/types/plugin";

export const pluginRouter = createTRPCRouter({
  // 获取插件资源列表
  getPlugin: protectedProcedure
    .input(z.object({
      type: z.enum(['agent', 'skill', 'claude-md']).optional()
    }))
    .query(async ({ input }) => {
      try {
        // 读取 manifest.json
        const manifestPath = join(process.cwd(), 'resources', 'manifest.json');
        const manifestContent = await readFile(manifestPath, 'utf-8');
        const manifest: PluginManifest = JSON.parse(manifestContent) as PluginManifest;

        // 根据类型过滤
        if (input.type === 'agent') {
          return {
            items: manifest.agents.map(item => ({ ...item, itemType: 'agent' as const }))
          };
        } else if (input.type === 'skill') {
          return {
            items: manifest.skills.map(item => ({ ...item, itemType: 'skill' as const }))
          };
        } else if (input.type === 'claude-md') {
          return {
            items: (manifest.claude_mds ?? []).map(item => ({ ...item, itemType: 'claude-md' as const }))
          };
        }

        // 返回所有资源
        return {
          items: [
            ...manifest.agents.map(item => ({ ...item, itemType: 'agent' as const })),
            ...manifest.skills.map(item => ({ ...item, itemType: 'skill' as const })),
            ...(manifest.claude_mds ?? []).map(item => ({ ...item, itemType: 'claude-md' as const }))
          ]
        };
      } catch (error) {
        console.error('Error loading plugin manifest:', error);
        return { items: [] };
      }
    }),

  // 导入插件到工作区 - 基于 cp 命令思路实现
  // cp <source_path> <destination_path>
  // source_path = resources/{resource_path}
  // destination_path = workspace/{import_path}
  importPlugin: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      resourceType: z.enum(['agent', 'skill', 'claude-md']),
      resource_path: z.string(), // 源路径，相当于 cp 的第一个参数
      import_path: z.string()    // 目标路径，相当于 cp 的第二个参数
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

        // 2. 构建 cp 命令的两个完整路径
        // 源路径: resources/{resource_path}
        const sourcePath = join(process.cwd(), 'resources', input.resource_path);

        // 目标路径: workspaces/{workspace_path}/{import_path}
        const workspaceBasePath = join(homedir(), 'workspaces', workspace.path);
        let targetPath = join(workspaceBasePath, input.import_path);

        // 如果 import_path 以 / 结尾，表示复制到目录
        if (input.import_path.endsWith('/')) {
          targetPath = join(targetPath, basename(sourcePath));
        }

        console.log(`导入插件 - 使用 fs-extra.copy:`);
        console.log(`  源: ${sourcePath}`);
        console.log(`  目标: ${targetPath}`);

        // 3. 使用 fs-extra 执行复制 - 类似 cp 命令
        // 自动处理文件/目录，无需手动判断
        await fsExtra.copy(sourcePath, targetPath, {
          overwrite: true,
          preserveTimestamps: true,
          errorOnExist: false
        });

        // 4. 返回成功信息
        return {
          success: true,
          message: `成功导入 ${input.resourceType}`,
          sourcePath: input.resource_path,
          targetPath: input.import_path,
          fullPath: targetPath
        };

      } catch (error) {
        console.error('Error importing plugin:', error);
        throw new Error(error instanceof Error ? error.message : "导入插件失败");
      }
    })
});


