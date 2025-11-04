import { lookup } from 'mime-types';

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