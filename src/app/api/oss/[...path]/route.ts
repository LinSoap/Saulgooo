import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { join } from "path";
import { homedir } from "os";
import { stat, readFile, writeFile, mkdir } from "fs/promises";
import { getMimeType } from "~/lib/file-utils";

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

    // 构建响应头
    const headers: Record<string, string> = {
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=3600", // 缓存1小时
      "Accept-Ranges": "bytes",
    };

    // 如果是下载模式，设置Content-Disposition头
    if (isDownload) {
      const fileName = relativeFilePath.split("/").pop() ?? "file";
      headers["Content-Disposition"] = `attachment; filename="${encodeURIComponent(fileName)}"`;
    }

    // 对于HTML文件，添加安全头以防止XSS攻击
    if (mimeType === "text/html") {
      // CSP策略允许同源和HTTPS资源，允许内联脚本和样式
      headers["Content-Security-Policy"] =
        "default-src 'self' https:; " +
        "script-src 'self' 'unsafe-inline' https:; " +
        "style-src 'self' 'unsafe-inline' https:; " +
        "img-src 'self' data: blob: https:; " +
        "connect-src 'self' https:; " +
        "font-src 'self' https:; " +
        "media-src 'self' https:; " +
        "frame-src 'none'; " +
        "object-src 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self' https:;";

      // 防止MIME类型嗅探
      headers["X-Content-Type-Options"] = "nosniff";

      // 限制iframe嵌入（仅在预览模式下允许）
      if (!isPreview) {
        headers["X-Frame-Options"] = "DENY";
      }
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
        const chunk = fileBuffer.slice(start, end + 1);

        headers["Content-Range"] = `bytes ${start}-${end}/${fileStats.size}`;
        headers["Content-Length"] = String(chunkSize);
        headers["Accept-Ranges"] = "bytes";

        return new NextResponse(chunk, {
          status: 206, // Partial Content
          headers,
        });
      }
    }

    // 设置Content-Length
    headers["Content-Length"] = String(fileBuffer.length);

    // 对于HTML文件，修改内容添加base标签以正确解析相对路径
    if (mimeType === "text/html") {
      let htmlContent = fileBuffer.toString('utf-8');

      // 构建base URL：移除文件名，保留目录路径
      const fileDirParts = relativeFilePath.split('/').slice(0, -1);
      const encodedFileDir = fileDirParts.map(encodeURIComponent).join('/');
      const baseUrl = `/api/oss/${workspaceId}/${encodedFileDir ? encodedFileDir + '/' : ''}`;

      console.log('HTML Preview - relativeFilePath:', relativeFilePath);
      console.log('HTML Preview - baseUrl:', baseUrl);

      // 先移除已存在的base标签（如果有的话）
      htmlContent = htmlContent.replace(/<base[^>]*>/gi, '');

      // 在<head>标签后添加base标签，如果没有head标签则在html或body前添加
      if (/<head[^>]*>/i.test(htmlContent)) {
        htmlContent = htmlContent.replace(
          /<head[^>]*>/i,
          `$&\n  <base href="${baseUrl}">`
        );
      } else if (/<html[^>]*>/i.test(htmlContent)) {
        htmlContent = htmlContent.replace(
          /<html[^>]*>/i,
          `$&\n<head>\n  <base href="${baseUrl}">\n</head>`
        );
      } else {
        // 如果连html标签都没有，直接在最前面添加
        htmlContent = `<!DOCTYPE html>\n<html>\n<head>\n  <base href="${baseUrl}">\n</head>\n<body>\n${htmlContent}\n</body>\n</html>`;
      }

      // 更新Content-Length
      headers["Content-Length"] = String(Buffer.byteLength(htmlContent, 'utf-8'));

      return new NextResponse(htmlContent, {
        status: 200,
        headers,
      });
    }

    // 返回文件内容
    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error("OSS Save Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 上传新文件
export async function POST(
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

    // 检查文件是否已存在
    const fileExists = await stat(absoluteFilePath).catch(() => null);
    if (fileExists) {
      return NextResponse.json({ error: "File already exists" }, { status: 409 });
    }

    // 确保目录存在
    const directory = absoluteFilePath.substring(0, absoluteFilePath.lastIndexOf('/'));
    await mkdir(directory, { recursive: true });

    // 读取请求体内容
    const content = await request.text();
    const encoding = request.headers.get('X-Content-Encoding') ?? 'utf-8';

    // 根据编码保存文件
    if (encoding === 'base64') {
      // base64 编码的二进制文件
      const buffer = Buffer.from(content, 'base64');
      await writeFile(absoluteFilePath, buffer);
    } else {
      // UTF-8 文本文件
      await writeFile(absoluteFilePath, content, 'utf-8');
    }

    // 获取文件信息
    const fileStats = await stat(absoluteFilePath);

    return NextResponse.json({
      success: true,
      fileName: relativeFilePath.split('/').pop() ?? relativeFilePath,
      filePath: relativeFilePath,
      size: fileStats.size,
      createdAt: fileStats.birthtime,
    });

  } catch (error) {
    console.error("OSS Upload Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 支持OPTIONS请求（用于CORS预检）
export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type, X-Content-Encoding, X-File-MimeType",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// 保存文件内容
export async function PUT(
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
    const fileExists = await stat(absoluteFilePath).catch(() => null);
    if (!fileExists) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // 确保是文件而不是目录
    if (!fileExists.isFile()) {
      return NextResponse.json({ error: "Not a file" }, { status: 400 });
    }

    // 读取请求体内容
    const content = await request.text();
    const encoding = request.headers.get('X-Content-Encoding') ?? 'utf-8';

    // 根据编码保存文件
    if (encoding === 'base64') {
      // base64 编码的二进制文件
      const buffer = Buffer.from(content, 'base64');
      await writeFile(absoluteFilePath, buffer);
    } else {
      // UTF-8 文本文件
      await writeFile(absoluteFilePath, content, 'utf-8');
    }

    // 获取更新后的文件信息
    const newStats = await stat(absoluteFilePath);

    return NextResponse.json({
      success: true,
      size: newStats.size,
      modifiedAt: newStats.mtime,
    });

  } catch (error) {
    console.error("OSS Save Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}