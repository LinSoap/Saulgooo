import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { join } from "path";
import { homedir } from "os";
import { stat, readFile } from "fs/promises";
import { getMimeType } from "~/lib/file";

/**
 * OSS API Route - 仅用于文件下载
 *
 * 职责：
 * - GET: 读取文件内容（用于编辑器预览和下载）
 * - OPTIONS: CORS 预检请求
 *
 * 注意：
 * - 文件上传、创建文件夹、删除、重命名等操作已迁移到 tRPC file router
 * - 文件保存功能也已迁移到 tRPC file router.saveFileContent
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    // 验证用户身份
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 从路径中提取workspaceId和文件路径
    // 路径格式: /api/oss/workspaceId/relative/file/path
    if (resolvedParams.path.length < 2) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const [workspaceId, ...filePathParts] = resolvedParams.path;
    const relativeFilePath = filePathParts.join("/");

    // 验证workspace存在且用户有权限访问
    const workspace = await db.workspace.findUnique({
      where: {
        id: workspaceId,
        ownerId: session.user.id,
      },
    });

    if (!workspace?.path) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // 构建文件绝对路径
    const basePath = join(homedir(), "workspaces", workspace.path);
    const absoluteFilePath = join(basePath, relativeFilePath);

    // 安全检查：确保文件在workspace目录内
    if (!absoluteFilePath.startsWith(basePath)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // 检查文件是否存在
    const fileStats = await stat(absoluteFilePath).catch(() => null);
    if (!fileStats) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // 确保是文件而不是目录
    if (!fileStats.isFile()) {
      return NextResponse.json({ error: "Not a file" }, { status: 400 });
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const isPreview = searchParams.get("preview") === "true";
    const isDownload = searchParams.get("download") === "true";

    // 读取文件内容
    const fileBuffer = await readFile(absoluteFilePath);
    const mimeType = getMimeType(relativeFilePath);
    const fileName = relativeFilePath.split("/").pop() ?? "file";

    // 构建响应头
    const headers: Record<string, string> = {
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=3600", // 缓存1小时
      "Accept-Ranges": "bytes",
    };

    // 改进的Content-Disposition头处理（RFC 6266标准）
    if (isDownload || isPreview) {
      // 使用更兼容的文件名编码方式
      // RFC 6266 标准格式，支持中文文件名
      const encodedFileName = encodeURIComponent(fileName).replace(/['()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
      const utf8FileName = Buffer.from(fileName, 'utf-8').toString('latin1');
      headers["Content-Disposition"] = `${isDownload ? 'attachment' : 'inline'}; filename="${utf8FileName}"; filename*=UTF-8''${encodedFileName}`;
    }

    // 添加CORS头，允许前端访问
    headers["Access-Control-Allow-Origin"] = "*";
    headers["Access-Control-Allow-Methods"] = "GET";
    headers["Access-Control-Allow-Headers"] = "Range";

    // 处理Range请求（支持视频/音频等大文件的分段加载）
    const rangeHeader = request.headers.get("range");
    if (rangeHeader && fileStats.size > 0) {
      const range = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(range[0] ?? "0", 10);
      const end = parseInt(range[1] ?? String(fileStats.size - 1), 10);

      // 验证范围
      if (start >= 0 && end < fileStats.size && start <= end) {
        const chunkSize = (end - start) + 1;
        const chunk = fileBuffer.subarray(start, end + 1);

        headers["Content-Range"] = `bytes ${start}-${end}/${fileStats.size}`;
        headers["Content-Length"] = String(chunkSize);
        headers["Accept-Ranges"] = "bytes";

        return new NextResponse(chunk, {
          status: 206, // Partial Content
          headers,
        });
      }
    }

    // 对于HTML预览，需要特殊处理以支持相对路径
    if (isPreview && mimeType === 'text/html') {
      // 简单的HTML处理 - 只添加base标签
      let htmlContent = fileBuffer.toString('utf-8');

      // 构建base URL
      const fileDirParts = relativeFilePath.split('/').slice(0, -1);
      const baseUrl = `/api/oss/${workspaceId}${fileDirParts.length > 0 ? '/' + fileDirParts.map(encodeURIComponent).join('/') : ''}/`;

      // 添加base标签（如果不存在）
      if (!htmlContent.includes('<base')) {
        htmlContent = htmlContent.replace(
          /<head>/i,
          `<head>\n  <base href="${baseUrl}">`
        );
      }

      headers["Content-Length"] = String(Buffer.byteLength(htmlContent, 'utf-8'));
      return new NextResponse(htmlContent, {
        status: 200,
        headers,
      });
    }

    // 设置Content-Length
    headers["Content-Length"] = String(fileBuffer.length);

    // 返回原始文件内容（不做任何修改）
    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error("OSS Download Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 注意：POST 和 PATCH 方法已迁移到 tRPC file router
// 这里仅保留 GET、PUT 和 OPTIONS 方法

// 支持OPTIONS请求（用于CORS预检）
export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type, X-Content-Encoding, X-File-MimeType",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// 注意：PUT 方法已迁移到 tRPC file router.saveFileContent