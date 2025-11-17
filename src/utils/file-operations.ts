import { copyFile, mkdir } from "fs/promises";
import { readdir } from "fs";
import { join } from "path";

/**
 * 递归复制整个目录
 * @param src 源目录路径
 * @param dest 目标目录路径
 */
export const copyRecursive = async (src: string, dest: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    readdir(src, { withFileTypes: true }, async (err, entries) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        // 确保目标目录存在
        await mkdir(dest, { recursive: true });

        // 并行处理所有文件和目录
        await Promise.all(
          entries.map(async (entry) => {
            const srcPath = join(src, entry.name);
            const destPath = join(dest, entry.name);

            if (entry.isDirectory()) {
              // 递归复制子目录
              await copyRecursive(srcPath, destPath);
            } else {
              // 复制文件
              await copyFile(srcPath, destPath);
            }
          })
        );

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
};