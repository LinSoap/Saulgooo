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
export interface BashInput {
  /**
   * 要执行的命令
   */
  command: string;
  /**
   * 可选的超时时间（以毫秒为单位，最大 600000）
   */
  timeout?: number;
  /**
   * 清晰、简洁的描述，说明此命令在 5-10 个单词内的作用
   */
  description?: string;
  /**
   * 设置为 true 以在后台运行此命令
   */
  run_in_background?: boolean;
}