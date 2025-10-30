"use client";

import { useEffect, useState } from "react";

export function useFormattedDate(date: Date | string | number) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const dateObj = date instanceof Date ? date : new Date(date);

  if (!isClient) {
    // 服务端渲染时返回ISO字符串，保证一致性
    return dateObj.toISOString();
  }

  // 客户端渲染时返回本地化字符串
  return dateObj.toLocaleString();
}

// 或者使用一个简单的非本地化格式化函数
export function formatDate(date: Date | string | number): string {
  const dateObj = date instanceof Date ? date : new Date(date);

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}