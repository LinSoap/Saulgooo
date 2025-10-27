// 文件系统相关的类型定义

export interface FileTreeItem {
  id: string;  // 唯一标识（使用相对路径）
  name: string;  // 文件或目录名
  path: string;  // 相对路径
  type: 'file' | 'directory';
  size: number;
  modifiedAt: Date;
  createdAt: Date;

  // 文件特有属性
  extension?: string;  // 文件扩展名

  // 目录特有属性
  children?: FileTreeItem[];  // 子项目
  hasChildren?: boolean;  // 是否有子项
}

export interface FileContent {
  content: string;
  size: number;
  modifiedAt: Date;
  mimeType: string;
}

export interface CreateFileResult {
  success: boolean;
  fileName: string;
  filePath: string;
  size: number;
  createdAt: Date;
}

export interface FileTreeResult {
  workspaceId: string;
  workspaceName: string;
  tree: FileTreeItem[];
  rootPath: string;
}