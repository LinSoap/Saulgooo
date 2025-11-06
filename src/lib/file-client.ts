/**
 * OSS 文件访问客户端
 * 提供统一的文件访问接口
 */

export interface FileData {
    content: string;
    encoding: 'utf-8' | 'base64';
    size: number;
    modifiedAt: Date;
    mimeType: string;
    fileName: string;
}

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
