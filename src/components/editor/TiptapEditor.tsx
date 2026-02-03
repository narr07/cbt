'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Mathematics from '@tiptap/extension-mathematics'
import 'katex/dist/katex.min.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Bold,
  Italic,
  ImageIcon,
  Loader2,
  Sigma
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface TiptapEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  examId?: string
  questionId?: string
  className?: string
  minHeight?: string
}

export function TiptapEditor({
  content,
  onChange,
  placeholder = 'Mulai mengetik...',
  examId,
  questionId,
  className,
  minHeight = '120px'
}: TiptapEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const uploadingRef = useRef(false)

  // LaTeX Dialog state
  const [showLatexDialog, setShowLatexDialog] = useState(false)
  const [latexInput, setLatexInput] = useState('')

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
        resize: {
          enabled: true,
          directions: ['top', 'bottom', 'left', 'right'],
          minWidth: 50,
          minHeight: 50,
          alwaysPreserveAspectRatio: true
        }
      }),
      Placeholder.configure({
        placeholder
      }),
      Mathematics.configure({
        inlineOptions: {
          onClick: (node, pos) => {
            setLatexInput(node.attrs.latex)
            setShowLatexDialog(true)
          }
        },
        blockOptions: {
          onClick: (node, pos) => {
            setLatexInput(node.attrs.latex)
            setShowLatexDialog(true)
          }
        },
        katexOptions: {
          throwOnError: false
        }
      })
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none',
          'dark:prose-invert',
          'px-4 py-3',
          '[&_p]:my-2',
          '[&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5',
          '[&_img]:rounded-lg [&_img]:h-auto [&_img]:my-2'
        ),
        style: `min-height: ${minHeight}`
      }
    }
  })

  // Update editor content when prop changes (for initial load)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  const handleInsertLatex = () => {
    if (!editor || !latexInput.trim()) return

    // Use the command directly
    editor.commands.insertInlineMath({ latex: latexInput })

    // Reset and close dialog
    setLatexInput('')
    setShowLatexDialog(false)
    editor.commands.focus()
  }

  const handleImageUpload = useCallback(async (file: File) => {
    if (!editor || !examId || !questionId) {
      toast.error('Editor belum siap atau ID tidak valid')
      return
    }

    if (uploadingRef.current) {
      toast.error('Sedang upload gambar lain, mohon tunggu...')
      return
    }

    uploadingRef.current = true
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${examId}/${questionId}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('exam-images')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('exam-images')
        .getPublicUrl(fileName)

      // Insert image at current cursor position
      editor.chain().focus().setImage({ src: publicUrl }).run()
      toast.success('Gambar berhasil diupload!')
    } catch (err: unknown) {
      const error = err as { message: string }
      toast.error('Gagal upload gambar: ' + error.message)
    } finally {
      uploadingRef.current = false
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [editor, examId, questionId, supabase])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file)
    }
  }

  if (!editor) {
    return (
      <div className={cn('w-full bg-muted/30 border rounded-xl p-4 flex items-center justify-center', className)} style={{ minHeight }}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      <div className={cn('border rounded-xl bg-muted/30 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all', className)}>
        {/* Toolbar */}
        <div className="border-b bg-muted/50 px-2 py-1.5 flex flex-wrap gap-1">
          {/* Text Formatting */}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'bg-primary/20' : ''}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'bg-primary/20' : ''}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Math Formula */}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              setLatexInput('')
              setShowLatexDialog(true)
            }}
            title="Insert LaTeX Formula"
          >
            <Sigma className="h-3.5 w-3.5" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Image Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingRef.current}
            title="Upload Image"
          >
            {uploadingRef.current ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImageIcon className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* Editor Content */}
        <EditorContent editor={editor} />
      </div>

      {/* LaTeX Input Dialog */}
      <Dialog open={showLatexDialog} onOpenChange={setShowLatexDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Insert LaTeX Formula</DialogTitle>
            <DialogDescription>
              Masukkan formula matematika menggunakan syntax LaTeX
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="latex">Formula LaTeX</Label>
              <Input
                id="latex"
                value={latexInput}
                onChange={(e) => setLatexInput(e.target.value)}
                placeholder="Contoh: \sqrt{144} atau a^2 + b^2 = c^2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleInsertLatex()
                  }
                }}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Contoh: <code className="bg-muted px-1 py-0.5 rounded">\frac{"{a}"}{"{b}"}</code>, <code className="bg-muted px-1 py-0.5 rounded">\sum_{"{i=1}"}^{"{n}"}</code>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLatexDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleInsertLatex}>
              Insert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
