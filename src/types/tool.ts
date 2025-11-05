/**
 * 这是仅用于清晰起见的文档类型。它表示所有工具输出类型的联合。
 */
export type ToolOutput =
    | TaskOutput
    | BashOutput
    | BashOutputToolOutput
    | EditOutput
    | ReadOutput
    | WriteOutput
    | GlobOutput
    | GrepOutput
    | KillBashOutput
    | NotebookEditOutput
    | WebFetchOutput
    | WebSearchOutput
    | TodoWriteOutput
    | ExitPlanModeOutput
    | ListMcpResourcesOutput
    | ReadMcpResourceOutput;

/**
 * 工具名称： Task
 */
export interface TaskOutput {
    /**
     * 来自子代理的最终结果消息
     */
    result: string;
    /**
     * 令牌使用统计
     */
    usage?: {
        input_tokens: number;
        output_tokens: number;
        cache_creation_input_tokens?: number;
        cache_read_input_tokens?: number;
    };
    /**
     * 美元总成本
     */
    total_cost_usd?: number;
    /**
     * 执行持续时间（以毫秒为单位）
     */
    duration_ms?: number;
}

/**
 * 工具名称： Bash
 */
export interface BashOutput {
    /**
     * 合并的 stdout 和 stderr 输出
     */
    output: string;
    /**
     * 命令的退出代码
     */
    exitCode: number;
    /**
     * 命令是否因超时而被终止
     */
    killed?: boolean;
    /**
     * 后台进程的 shell ID
     */
    shellId?: string;
}

/**
 * 工具名称： BashOutput
 */
export interface BashOutputToolOutput {
    /**
     * 自上次检查以来的新输出
     */
    output: string;
    /**
     * 当前 shell 状态
     */
    status: 'running' | 'completed' | 'failed';
    /**
     * 退出代码（完成时）
     */
    exitCode?: number;
}

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
 * 工具名称： Read
 */
export type ReadOutput =
    | TextFileOutput
    | ImageFileOutput
    | PDFFileOutput
    | NotebookFileOutput;

export interface TextFileOutput {
    /**
     * 带行号的文件内容
     */
    content: string;
    /**
     * 文件中的总行数
     */
    total_lines: number;
    /**
     * 实际返回的行数
     */
    lines_returned: number;
}

export interface ImageFileOutput {
    /**
     * Base64 编码的图像数据
     */
    image: string;
    /**
     * 图像 MIME 类型
     */
    mime_type: string;
    /**
     * 文件大小（以字节为单位）
     */
    file_size: number;
}

export interface PDFFileOutput {
    /**
     * 页面内容数组
     */
    pages: Array<{
        page_number: number;
        text?: string;
        images?: Array<{
            image: string;
            mime_type: string;
        }>;
    }>;
    /**
     * 总页数
     */
    total_pages: number;
}

export interface NotebookFileOutput {
    /**
     * Jupyter 笔记本单元格
     */
    cells: Array<{
        cell_type: 'code' | 'markdown';
        source: string;
        outputs?: any[];
        execution_count?: number;
    }>;
    /**
     * 笔记本元数据
     */
    metadata?: Record<string, any>;
}

/**
 * 工具名称： Write
 */
export interface WriteOutput {
    content: string;
    file_path: string;
}

/**
 * 工具名称： Glob
 */
export interface GlobOutput {
    /**
     * 匹配的文件路径数组
     */
    matches: string[];
    /**
     * 找到的匹配数
     */
    count: number;
    /**
     * 使用的搜索目录
     */
    search_path: string;
}

/**
 * 工具名称： Grep
 */
export type GrepOutput =
    | GrepContentOutput
    | GrepFilesOutput
    | GrepCountOutput;

export interface GrepContentOutput {
    /**
     * 带有上下文的匹配行
     */
    matches: Array<{
        file: string;
        line_number?: number;
        line: string;
        before_context?: string[];
        after_context?: string[];
    }>;
    /**
     * 匹配总数
     */
    total_matches: number;
}

export interface GrepFilesOutput {
    /**
     * 包含匹配的文件
     */
    files: string[];
    /**
     * 包含匹配的文件数
     */
    count: number;
}

export interface GrepCountOutput {
    /**
     * 每个文件的匹配计数
     */
    counts: Array<{
        file: string;
        count: number;
    }>;
    /**
     * 所有文件中的总匹配数
     */
    total: number;
}

/**
 * 工具名称： KillBash
 */
export interface KillBashOutput {
    /**
     * 成功消息
     */
    message: string;
    /**
     * 被终止的 shell 的 ID
     */
    shell_id: string;
}

/**
 * 工具名称： NotebookEdit
 */
export interface NotebookEditOutput {
    /**
     * 成功消息
     */
    message: string;
    /**
     * 执行的编辑类型
     */
    edit_type: 'replaced' | 'inserted' | 'deleted';
    /**
     * 受影响的单元格 ID
     */
    cell_id?: string;
    /**
     * 编辑后笔记本中的总单元格数
     */
    total_cells: number;
}

/**
 * 工具名称： WebFetch
 */
export interface WebFetchOutput {
    /**
     * AI 模型对提示的响应
     */
    response: string;
    /**
     * 被获取的 URL
     */
    url: string;
    /**
     * 重定向后的最终 URL
     */
    final_url?: string;
    /**
     * HTTP 状态代码
     */
    status_code?: number;
}

/**
 * 工具名称： WebSearch
 */
export interface WebSearchOutput {
    /**
     * 搜索结果
     */
    results: Array<{
        title: string;
        url: string;
        snippet: string;
        /**
         * 如果可用的其他元数据
         */
        metadata?: Record<string, any>;
    }>;
    /**
     * 结果总数
     */
    total_results: number;
    /**
     * 被搜索的查询
     */
    query: string;
}

/**
 * 工具名称： TodoWrite
 */
export interface TodoWriteOutput {
    /**
     * 成功消息
     */
    message: string;
    /**
     * 当前待办事项统计
     */
    stats: {
        total: number;
        pending: number;
        in_progress: number;
        completed: number;
    };
}

/**
 * 工具名称： ExitPlanMode
 */
export interface ExitPlanModeOutput {
    /**
     * 确认消息
     */
    message: string;
    /**
     * 用户是否批准了计划
     */
    approved?: boolean;
}

/**
 * 工具名称： ListMcpResources
 */
export interface ListMcpResourcesOutput {
    /**
     * 可用资源
     */
    resources: Array<{
        uri: string;
        name: string;
        description?: string;
        mimeType?: string;
        server: string;
    }>;
    /**
     * 资源总数
     */
    total: number;
}

/**
 * 工具名称： ReadMcpResource
 */
export interface ReadMcpResourceOutput {
    /**
     * 资源内容
     */
    contents: Array<{
        uri: string;
        mimeType?: string;
        text?: string;
        blob?: string;
    }>;
    /**
     * 提供资源的服务器
     */
    server: string;
}