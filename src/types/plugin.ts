/**
 * 插件资源类型定义
 *
 * 设计思路：基于 Linux cp 命令的双参数模式
 * - resource_path: 相当于 cp 的源路径 (source)
 * - import_path: 相当于 cp 的目标路径 (destination)
 *
 * 示例：
 *   cp resources/agents/whoasr workspaces/project/.claude/agents/whoasr
 *   相当于：
 *   resource_path: "agents/whoasr"
 *   import_path: ".claude/agents/whoasr"
 */

// 资源类型
export type ResourceType = 'agent' | 'skill' | 'claude-md';

// 插件资源项
export interface PluginItem {
  /** 资源类型 */
  type: ResourceType;
  /** 显示名称 */
  name: string;
  /** 详细描述 */
  description: string;
  /** 标签列表 */
  tags: string[];
  /**
   * 源路径 - 相对于 resources/ 目录
   * 相当于 cp 命令的第一个参数 (source)
   * 例如： "agents/whoasr", "docs/guide.md"
   */
  resource_path: string;
  /**
   * 目标路径 - 相对于工作区根目录
   * 相当于 cp 命令的第二个参数 (destination)
   * 支持灵活的路径配置：
   *   - "claude.md" (文件重命名)
   *   - ".claude/agents/whoasr" (目录重命名)
   *   - ".claude/skills/" (导入到目录)
   *   - "." (导入到根目录)
   */
  import_path: string;
  /** 功能特性 */
  features?: string[];
  /** 项目类型（用于 UI 显示） */
  itemType?: ResourceType;
}

// Manifest 文件结构
export interface PluginManifest {
  /** Agent 列表 */
  agents: PluginItem[];
  /** Skill 列表 */
  skills: PluginItem[];
  /** Claude.md 文件列表 */
  claude_mds?: PluginItem[];
  /** 配置文件列表 */
  configs?: PluginItem[];
}

/**
 * 导入逻辑实现参考：
 *
 * async function importPlugin(item: PluginItem, workspacePath: string) {
 *   // 构建完整路径 - 类似于构建 cp 命令的完整参数
 *   const source = join(resourcesBasePath, item.resource_path);  // cp的第一个参数
 *   const target = join(workspaceBasePath, workspacePath, item.import_path);  // cp的第二个参数
 *
 *   // 执行复制操作
 *   if (await isDirectory(source)) {
 *     await copyDirectory(source, target);  // cp -r
 *   } else {
 *     await copyFile(source, target);        // cp
 *   }
 * }
 *
 * 使用示例：
 *   - 文件重命名: resource_path="docs/guide.md" → import_path="claude.md"
 *   - 目录重命名: resource_path="skills/pdf" → import_path=".claude/skills/pdf-handler"
 *   - 保持原名: resource_path="configs/.env" → import_path="."
 */