'use client'

import 'prosekit/basic/style.css'
import 'prosekit/basic/typography.css'

import { defineBasicExtension } from 'prosekit/basic'
import {
  createEditor,
  jsonFromHTML,
  type NodeJSON,
  type Editor,
} from 'prosekit/core'
import {
  useCallback,
  useMemo,
  useState,
  useEffect,
} from 'react'
import { useDocChange, ProseKit } from 'prosekit/react'
import { cn } from '~/lib/utils'
import { markdownFromHTML, htmlFromMarkdown } from '~/lib/markdown'

// 简化的编辑器核心组件
function ProseEditor({
  editor,
  onChange,
  placeholder,
  className = '',
}: {
  editor: Editor
  onChange: () => void
  placeholder?: string
  className?: string
}) {
  useDocChange(onChange, { editor })

  return (
    <ProseKit editor={editor}>
      <div className="relative w-full h-full overflow-y-auto">
        <div
          ref={editor.mount}
          className={cn(
            // 基础样式
            "ProseMirror min-h-full px-6 md:px-[max(4rem,calc(50%-20rem))] py-8 outline-none",
            // 占位符样式
            placeholder && "[&_.ProseMirror-is-empty]:before:content-[attr(data-placeholder)] [&_.ProseMirror-is-empty]:before:text-gray-400 [&_.ProseMirror-is-empty]:before:pointer-events-none [&_.ProseMirror-is-empty]:before:absolute [&_.ProseMirror-is-empty]:before:left-6 [&_.ProseMirror-is-empty]:before:right-6 md:[&_.ProseMirror-is-empty]:before:left-[max(4rem,calc(50%-20rem))] md:[&_.ProseMirror-is-empty]:before:right-[max(4rem,calc(50%-20rem))]",
            className
          )}
          data-placeholder={placeholder}
        />
      </div>
    </ProseKit>
  )
}

// 创建编辑器实例的工厂函数
function createMarkdownEditor(content?: NodeJSON) {
  const extension = defineBasicExtension()
  return createEditor({
    extension,
    defaultContent: content,
  })
}

// 通用Markdown编辑器Hook
function useMarkdownEditor(
  initialMarkdown: string,
  options: { readonly?: boolean } = {}
) {
  const { readonly = false } = options
  const [currentMarkdown, setCurrentMarkdown] = useState(initialMarkdown)
  const [hasUnsavedChange, setHasUnsavedChange] = useState(false)
  const [editorKey, setEditorKey] = useState(1)

  // 解析初始内容 - 确保总是返回有效内容
  const parsedContent = useMemo(() => {
    // 如果没有初始内容，返回undefined让编辑器使用默认空内容
    if (!initialMarkdown || initialMarkdown.trim() === '') {
      return undefined
    }

    try {
      const html = htmlFromMarkdown(initialMarkdown)
      const extension = defineBasicExtension()
      const tempEditor = createEditor({ extension })
      const result = jsonFromHTML(html, { schema: tempEditor.schema })
      // ProseKit编辑器不需要手动销毁临时实例

      // 确保返回有效的内容
      if (result && result.content) {
        return result
      }
      return undefined
    } catch (error) {
      console.error('Failed to parse markdown content:', error)
      console.error('Initial markdown content:', initialMarkdown.slice(0, 200))
      return undefined
    }
  }, [initialMarkdown])

  // 创建编辑器 - 只有当parsedContent准备好时才创建
  const editor = useMemo(() => {
    // 延迟创建编辑器，确保在客户端渲染
    if (typeof window === 'undefined') return null
    return createMarkdownEditor(parsedContent)
  }, [parsedContent])

  // 更新当前markdown
  useEffect(() => {
    if (initialMarkdown !== currentMarkdown) {
      setCurrentMarkdown(initialMarkdown)
    }
  }, [initialMarkdown, currentMarkdown])

  // 处理内容变化
  const handleDocChange = useCallback(() => {
    if (!readonly) {
      setHasUnsavedChange(true)
    }
  }, [readonly])

  // 获取markdown内容
  const getMarkdown = useCallback(() => {
    if (!editor) return currentMarkdown
    const html = editor.getDocHTML()
    return markdownFromHTML(html)
  }, [editor, currentMarkdown])

  // 重置编辑器
  const reset = useCallback(() => {
    setHasUnsavedChange(false)
    setEditorKey(k => k + 1)
  }, [])

  // 保存
  const save = useCallback((onSave?: (markdown: string) => void) => {
    const markdown = getMarkdown()
    setCurrentMarkdown(markdown)
    setHasUnsavedChange(false)
    onSave?.(markdown)
  }, [getMarkdown])

  return {
    editor,
    editorKey,
    currentMarkdown,
    hasUnsavedChange,
    handleDocChange,
    getMarkdown,
    reset,
    save,
    wordCount: currentMarkdown.split(/\s+/).filter(w => w.length > 0).length,
  }
}

export { ProseEditor, useMarkdownEditor, createMarkdownEditor }