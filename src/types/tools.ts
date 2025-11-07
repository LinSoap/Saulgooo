/**
 * 工具名称： Edit
 */
export interface EditOutput {
  /**
   * 确认消息
   */
  file_path: string;
  /**
   * 进行的替换次数
   */
  old_string: string;
  /**
   * 被编辑的文件路径
   */
  new_string: string;
}

/**
 * 工具名称： Write
 */
export interface WriteOutput {
  content: string;
  file_path: string;
}