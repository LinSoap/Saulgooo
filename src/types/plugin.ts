/**
 * 插件资源类型定义
 */

// 资源类型
export type ResourceType = 'agent' | 'skill';

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
  /** 相对于 manifest.json 的资源路径 */
  path: string;
  /** 功能特性 */
  features?: string[];
  /** 项目类型（用于 UI 显示） */
  itemType?: 'agent' | 'skill';
}

// Manifest 文件结构
export interface PluginManifest {
  /** Agent 列表 */
  agents: PluginItem[];
  /** Skill 列表 */
  skills: PluginItem[];
}