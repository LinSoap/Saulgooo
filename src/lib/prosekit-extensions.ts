import { defineBasicExtension } from "prosekit/basic";
import { defineMention } from "prosekit/extensions/mention";
import { definePlaceholder } from "prosekit/extensions/placeholder";
import { union } from "prosekit/core";

export function defineChatExtension() {
  return union(
    defineBasicExtension(),
    definePlaceholder({
      placeholder: "输入 @ 来引用文件...",
    }),
    defineMention(),
  );
}

export type ChatExtension = ReturnType<typeof defineChatExtension>;