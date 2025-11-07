import { lookup } from 'mime-types';
import { join } from 'path';
import { homedir } from 'os';

// ========================
// 类型定义
// ========================

/**
 * 文件渲染类型
 */
export type FileRenderType =
    | 'html'      // HTML文件，使用iframe预览
    | 'text'      // 文本文件，使用MarkdownEditor
    | 'image'     // 图片文件，直接显示img标签
    | 'video'     // 视频文件，使用video标签
    | 'audio'     // 音频文件，使用audio标签
    | 'pdf'       // PDF文件，使用iframe
    | 'unknown';  // 不支持预览的文件类型

/**
 * 文件数据接口
 */
export interface FileData {
    content: string;
    encoding: 'utf-8' | 'base64';
    size: number;
    modifiedAt: Date;
    mimeType: string;
    fileName: string;
}

// ========================
// 文件类型判断工具
// ========================

/**
 * 获取文件的 MIME 类型
 * @param filePath 文件路径
 * @returns MIME 类型字符串
 */
export function getMimeType(filePath: string): string {
    const mimeType = lookup(filePath);
    return mimeType || 'application/octet-stream';
}

/**
 * 判断 MIME 类型是否为文本文件
 * 用于决定是否应该以 UTF-8 编码读取文件内容
 */
export function isTextFile(mimeType: string): boolean {
    // 以 text/ 开头的都是文本文件
    if (mimeType.startsWith('text/')) {
        return true;
    }

    // 特殊的文本类 MIME 类型
    const textTypes = new Set([
        'application/json',
        'application/xml',
        'application/javascript',
        'application/x-yaml',
        'application/yaml',
        'application/rtf',
        'message/rfc822'
    ]);

    return textTypes.has(mimeType);
}

/**
 * 根据 MIME 类型和文件名获取文件渲染类型
 * @param mimeType MIME类型
 * @param fileName 文件名（用于特殊处理，如.mp4文件）
 * @returns 渲染类型
 */
export function getFileRenderType(mimeType: string, fileName: string): FileRenderType {
    // 特殊处理：某些文件可能MIME类型不正确，但扩展名明确
    const fileExt = fileName.split('.').pop()?.toLowerCase();

    // 基于MIME类型的映射
    if (mimeType === 'text/html') {
        return 'html';
    }

    if (mimeType.startsWith('text/')) {
        return 'text';
    }

    if (mimeType.startsWith('image/')) {
        return 'image';
    }

    if (mimeType.startsWith('video/') || fileExt === 'mp4') {
        return 'video';
    }

    if (mimeType.startsWith('audio/')) {
        return 'audio';
    }

    if (mimeType === 'application/pdf') {
        return 'pdf';
    }

    // 基于文件扩展名的后备处理
    switch (fileExt) {
        case 'html':
        case 'htm':
            return 'html';
        case 'pdf':
            return 'pdf';
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'webp':
        case 'svg':
            return 'image';
        case 'mp4':
        case 'webm':
        case 'ogg':
            return 'video';
        case 'mp3':
        case 'wav':
        case 'flac':
            return 'audio';
        default:
            return 'unknown';
    }
}

// ========================
// OSS 文件访问客户端
// ========================

/**
 * 构建 OSS 文件 URL
 */
export function getOssFileUrl(
    workspaceId: string,
    filePath: string,
    options?: {
        preview?: boolean;
        download?: boolean;
    }
): string {
    const encodedFilePath = filePath.split('/').map(encodeURIComponent).join('/');
    const params = new URLSearchParams();

    if (options?.preview) params.set('preview', 'true');
    if (options?.download) params.set('download', 'true');

    const queryString = params.toString();
    return `/api/oss/${workspaceId}/${encodedFilePath}${queryString ? `?${queryString}` : ''}`;
}

/**
 * 从 OSS 获取文件内容
 */
export async function fetchFileContent(
    workspaceId: string,
    filePath: string,
    options?: {
        preview?: boolean;
        noCache?: boolean;
    }
): Promise<FileData> {
    const url = getOssFileUrl(workspaceId, filePath, options);

    const fetchOptions: RequestInit = {
        method: 'GET',
        headers: {
            'Accept': '*/*',
        },
    };

    // 禁用缓存
    if (options?.noCache) {
        fetchOptions.cache = 'no-store';
        fetchOptions.headers = {
            ...fetchOptions.headers,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
        };
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    // 从响应头获取文件信息
    const contentType = response.headers.get('Content-Type') ?? 'application/octet-stream';
    const contentLength = parseInt(response.headers.get('Content-Length') ?? '0', 10);
    const lastModified = response.headers.get('Last-Modified');

    // 判断是否为文本文件
    const isText = contentType.startsWith('text/') ??
        contentType.includes('json') ??
        contentType.includes('xml') ??
        contentType.includes('javascript');

    let content: string;
    let encoding: 'utf-8' | 'base64';

    if (isText) {
        content = await response.text();
        encoding = 'utf-8';
    } else {
        // 对于二进制文件，只返回元数据，不读取内容以避免内存问题
        content = '';
        encoding = 'base64';
    }

    return {
        content,
        encoding,
        size: contentLength,
        modifiedAt: lastModified ? new Date(lastModified) : new Date(),
        mimeType: contentType,
        fileName: filePath.split('/').pop() ?? filePath,
    };
}

/**
 * 下载文件
 */
export function downloadFile(
    workspaceId: string,
    filePath: string,
    fileName?: string
): void {
    const url = getOssFileUrl(workspaceId, filePath, { download: true });
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName ?? filePath.split('/').pop() ?? 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * 保存文件内容到 OSS
 */
export async function saveFileContent(
    workspaceId: string,
    filePath: string,
    content: string,
    encoding: 'utf-8' | 'base64' = 'utf-8'
): Promise<{ success: boolean; size: number; modifiedAt: Date }> {
    const encodedFilePath = filePath.split('/').map(encodeURIComponent).join('/');
    const url = `/api/oss/${workspaceId}/${encodedFilePath}`;

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': encoding === 'utf-8' ? 'text/plain; charset=utf-8' : 'application/octet-stream',
            'X-Content-Encoding': encoding,
        },
        body: content,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText })) as { error?: string };
        throw new Error(errorData.error ?? 'Failed to save file');
    }

    const result = await response.json() as { success: boolean; size: number; modifiedAt: string };
    return {
        success: result.success,
        size: result.size,
        modifiedAt: new Date(result.modifiedAt),
    };
}

/**
 * 上传新文件到 OSS
 */
export async function uploadFile(
    workspaceId: string,
    filePath: string,
    content: string,
    options?: {
        encoding?: 'utf-8' | 'base64';
        mimeType?: string;
    }
): Promise<{ success: boolean; fileName: string; filePath: string; size: number; createdAt: Date }> {
    const encodedFilePath = filePath.split('/').map(encodeURIComponent).join('/');
    const url = `/api/oss/${workspaceId}/${encodedFilePath}`;

    const encoding = options?.encoding ?? 'utf-8';
    const mimeType = options?.mimeType ?? 'application/octet-stream';

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': encoding === 'utf-8' ? 'text/plain; charset=utf-8' : 'application/octet-stream',
            'X-Content-Encoding': encoding,
            'X-File-MimeType': mimeType,
        },
        body: content,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText })) as { error?: string };
        throw new Error(errorData.error ?? 'Failed to upload file');
    }

    const result = await response.json() as {
        success: boolean;
        fileName: string;
        filePath: string;
        size: number;
        createdAt: string
    };
    return {
        success: result.success,
        fileName: result.fileName,
        filePath: result.filePath,
        size: result.size,
        createdAt: new Date(result.createdAt),
    };
}

// ========================
// 文件操作工具函数
// ========================

/**
 * 构建新的文件路径
 */
export function buildNewPath(originalPath: string, newName: string): string {
    const lastSlashIndex = originalPath.lastIndexOf('/');
    return lastSlashIndex >= 0
        ? `${originalPath.substring(0, lastSlashIndex)}/${newName}`
        : newName;
}

/**
 * 获取工作区完整路径
 */
export function getWorkspaceFullPath(workspacePath: string, relativePath: string): string {
    return join(homedir(), 'workspaces', workspacePath, relativePath);
}

/**
 * 文件操作上下文菜单的预设选项
 */
export const CONTEXT_MENU_ACTIONS = {
    RENAME: {
        label: "重命名",
        icon: "Edit3"
    },
    DELETE: {
        label: "删除",
        icon: "Trash2",
        className: "text-destructive focus:text-destructive"
    }
} as const;