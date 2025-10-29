'use client'

import { useEffect } from 'react'
import { Button } from '~/components/ui/button'
import { Save, RotateCcw } from 'lucide-react'
import { cn } from '~/lib/utils'
import { ProseEditor, useMarkdownEditor } from '~/components/ui/markdown-editor'

interface MarkdownEditorProps {
  initialMarkdown?: string
  onSave?: (markdown: string) => void
  className?: string
  placeholder?: string
  readonly?: boolean
}

export function MarkdownEditor({
  initialMarkdown = '',
  onSave,
  className,
  placeholder = '开始编写您的 Markdown 文档...',
  readonly = false,
}: MarkdownEditorProps) {
  const {
    editor,
    editorKey,
    hasUnsavedChange,
    handleDocChange,
    save,
    reset,
    wordCount,
    currentMarkdown,
  } = useMarkdownEditor(initialMarkdown, { readonly })

  // 处理键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (hasUnsavedChange && !readonly) {
          save(onSave)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [save, hasUnsavedChange, readonly, onSave])

  return (
    <div className={cn("flex flex-col h-full bg-white dark:bg-gray-950", className)}>
      {/* 工具栏 */}
      {!readonly && (
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => save(onSave)}
              disabled={!hasUnsavedChange}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {hasUnsavedChange ? '保存' : '已保存'}
            </Button>
            {initialMarkdown && (
              <Button
                onClick={reset}
                disabled={!hasUnsavedChange}
                size="sm"
                variant="ghost"
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                重置
              </Button>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{wordCount} 词</span>
            {hasUnsavedChange && (
              <span className="text-orange-600 dark:text-orange-400">未保存</span>
            )}
          </div>
        </div>
      )}

      {/* 编辑器 */}
      <div className="flex-1 overflow-auto">
        {editor && (
          <ProseEditor
            key={editorKey}
            editor={editor}
            onChange={handleDocChange}
            placeholder={placeholder}
            className="
            [&_*]:text-base
            [&_pre]:bg-gray-100 dark:[&_pre]:bg-gray-800
            [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto
            [&_code]:bg-gray-100 dark:[&_code]:bg-gray-800
            [&_code]:px-2 [&_code]:py-0.5 [&_code]:rounded text-sm
            [&_pre_code]:bg-transparent [&_pre_code]:p-0
            [&_p]:my-4
            [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-4
            [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3
            [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2
            [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-2
            [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-2
            [&_li]:my-1
            [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300
            [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4
            [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
            [&_th]:border [&_th]:px-4 [&_th]:py-2 [&_th]:text-left
            [&_td]:border [&_td]:px-4 [&_td]:py-2
          "
          />
        )}
      </div>

      {/* 状态栏 */}
      <div className="px-4 py-1 border-t bg-muted/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Markdown</span>
          <span>{currentMarkdown.length} 字符</span>
        </div>
      </div>
    </div>
  )
}

export default MarkdownEditor