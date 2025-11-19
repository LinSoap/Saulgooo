import { homedir } from 'os';
import { join } from 'path';

/**
 * 获取工作区基础目录
 * 优先使用环境变量 WORKSPACE_BASE_DIR，否则使用默认的 ~/workspaces
 */
export function getWorkspaceBaseDir(): string {
  const envDir = process.env.WORKSPACE_BASE_DIR;

  if (envDir?.trim()) {
    // 支持 ~ 开头的路径（相对于用户主目录）
    if (envDir.startsWith('~')) {
      return join(homedir(), envDir.slice(1));
    }
    // 其他情况直接返回（支持绝对路径和相对路径）
    return envDir;
  }

  // 默认路径
  return join(homedir(), 'workspaces');
}

/**
 * 获取工作区完整路径
 * @param workspacePath 工作区路径
 * @param relativePath 相对路径（可选）
 */
export function getWorkspaceFullPath(workspacePath: string, relativePath = ''): string {
  return join(getWorkspaceBaseDir(), workspacePath, relativePath);
}