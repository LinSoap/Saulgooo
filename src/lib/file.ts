import { lookup } from 'mime-types';
import { CODE_EXTENSIONS, TEXT_MIME_TYPES } from './language-map';

// ========================
// 类型定义
// ========================

/**
 * 文件渲染类型
 */
export type FileRenderType =
    | 'html'      // HTML文件，使用iframe预览
    | 'text'      // Markdown文本文件，使用MarkdownEditor
    | 'code'      // 代码文件，使用Shiki高亮预览
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

    // 使用统一的文本类型配置
    return TEXT_MIME_TYPES.has(mimeType);
}

/**
 * 根据 MIME 类型和文件名获取文件渲染类型
 * @param mimeType MIME类型
 * @param fileName 文件名（用于特殊处理，如.mp4文件）
 * @returns 渲染类型
 */
export function getFileRenderType(mimeType: string, fileName: string): FileRenderType {
    const fileExt = fileName.split('.').pop()?.toLowerCase();

    // Markdown 文件使用 text 类型（使用 MarkdownEditor）
    if (fileExt === 'md' || fileExt === 'markdown') {
        return 'text';
    }

    // HTML 文件
    if (mimeType === 'text/html' || fileExt === 'html' || fileExt === 'htm') {
        return 'html';
    }

    // 图片文件
    if (mimeType.startsWith('image/')) {
        return 'image';
    }

    // 视频文件
    if (mimeType.startsWith('video/') || fileExt === 'mp4' || fileExt === 'webm' || fileExt === 'ogg') {
        return 'video';
    }

    // 音频文件
    if (mimeType.startsWith('audio/') || fileExt === 'mp3' || fileExt === 'wav' || fileExt === 'flac') {
        return 'audio';
    }

    // PDF 文件
    if (mimeType === 'application/pdf' || fileExt === 'pdf') {
        return 'pdf';
    }

    // 代码文件：使用统一的扩展名配置
    if (fileExt && CODE_EXTENSIONS.includes(fileExt)) {
        return 'code';
    }

    // 文本类型的文件（其他 text/* 类型）
    if (mimeType.startsWith('text/')) {
        return 'code';
    }

    // 通过 MIME 类型判断是否为文本/代码文件
    if (TEXT_MIME_TYPES.has(mimeType)) {
        return 'code';
    }

    // 不支持的类型
    return 'unknown';
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

// 注意：fetchFileContent, saveFileContent, uploadFile 函数已迁移到 file-deprecated.ts
// 请使用 tRPC API 替代：api.file.*


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