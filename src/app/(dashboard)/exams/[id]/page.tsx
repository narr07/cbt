/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useCallback, use, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/utils/supabase/client'
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  GripVertical,
  ChevronLeft,

  Save,
  Rocket,
  CheckCircle2,
  Loader2,
  X,
  Eye,
  Download,
  Upload
} from 'lucide-react'
import * as XLSX from 'xlsx'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MathRenderer } from '@/components/ui/math-renderer'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from '@/lib/utils'

// Shadcn UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'


interface QuestionOption {
  id: string
  question_id?: string
  content: string
  is_correct: boolean
}

interface Question {
  id: string
  exam_id?: string
  content: string
  points: number
  type: 'pg' | 'essay'
  image_url?: string
  options: QuestionOption[]
}

import { useExamEditor } from '@/hooks/use-exam-editor'

export default function ExamEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const { exam, questions: initialQuestions, isLoading: loading, mutate } = useExamEditor(id)
  const [questions, setQuestions] = useState<Question[]>([])
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [previewingQuestion, setPreviewingQuestion] = useState<Question | null>(null)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [portalNode, setPortalNode] = useState<Element | null>(null)

  // Create portal node for fixed navigation
  useEffect(() => {
    setPortalNode(document.body)
  }, [])

  // Sync SWR data to local state for editing
  useEffect(() => {
    if (initialQuestions.length > 0) {
      setQuestions(initialQuestions)
    }
  }, [initialQuestions])

  const handleAddQuestion = () => {
    const newQ: Question = {
      id: `new-${Date.now()}`,
      content: '',
      points: 5,
      type: 'pg',
      options: [
        { id: `opt-1-${Date.now()}`, content: '', is_correct: true },
        { id: `opt-2-${Date.now()}`, content: '', is_correct: false },
        { id: `opt-3-${Date.now()}`, content: '', is_correct: false },
        { id: `opt-4-${Date.now()}`, content: '', is_correct: false },
      ]
    }
    setQuestions([...questions, newQ])
  }

  const handleRemoveQuestion = (qId: string) => {
    setQuestions(questions.filter(q => q.id !== qId))
  }

  const handleQuestionChange = (qId: string, field: keyof Question, value: string | number) => {
    setQuestions(questions.map(q => q.id === qId ? { ...q, [field]: value } : q))
  }

  const handleImageUpload = async (qId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingId(qId)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${id}/${qId}-${Date.now()}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('exam-images')
        .upload(fileName, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('exam-images')
        .getPublicUrl(fileName)

      setQuestions(questions.map(q => q.id === qId ? { ...q, image_url: publicUrl } : q))
    } catch (err: unknown) {
      const error = err as { message: string }
      toast.error('Gagal upload gambar: ' + error.message)
    } finally {
      setUploadingId(null)
    }
  }

  const handleRemoveImage = (qId: string) => {
    setQuestions(questions.map(q => q.id === qId ? { ...q, image_url: undefined } : q))
  }

  const handleOptionChange = (qId: string, optId: string, field: keyof QuestionOption, value: string | boolean) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const newOptions = q.options.map(opt => {
          if (opt.id === optId) {
            return { ...opt, [field]: value }
          }
          if (field === 'is_correct' && value === true) {
            return { ...opt, is_correct: false }
          }
          return opt
        })
        return { ...q, options: newOptions }
      }
      return q
    }))
  }

  const handleAddOption = (qId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          options: [...q.options, { id: `opt-${Date.now()}`, content: '', is_correct: false }]
        }
      }
      return q
    }))
  }

  const handleRemoveOption = (qId: string, optId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          options: q.options.filter(opt => opt.id !== optId)
        }
      }
      return q
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await supabase.from('questions').delete().eq('exam_id', id)

      for (const q of questions) {
        const { data: savedQ, error: qErr } = await supabase
          .from('questions')
          .insert([{
            exam_id: id,
            content: q.content,
            points: q.points,
            type: q.type,
            image_url: q.image_url
          }])
          .select()
          .single()

        if (qErr) throw qErr

        if (q.type === 'pg' && q.options.length > 0) {
          const optionsToInsert = q.options.map(opt => ({
            question_id: savedQ.id,
            content: opt.content,
            is_correct: opt.is_correct
          }))
          const { error: optErr } = await supabase.from('options').insert(optionsToInsert)
          if (optErr) throw optErr
        }
      }

      toast.success('Berhasil menyimpan draft!')
      mutate() // Revalidate SWR
    } catch (err: unknown) {
      const error = err as { message: string }
      toast.error('Gagal menyimpan: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'No': 1,
        'Tipe': 'PG',
        'Soal': 'Berapakah hasil dari $\\sqrt{144} + 2^3$?',
        'Poin': 5,
        'Opsi A': '20',
        'Opsi B': '18',
        'Opsi C': '22',
        'Opsi D': '25',
        'Opsi E': '',
        'Jawaban Benar': 'A'
      },
      {
        'No': 2,
        'Tipe': 'Essay',
        'Soal': 'Tuliskan rumus Pythagoras $$a^2 + b^2 = c^2$$ dan jelaskan!',
        'Poin': 10,
        'Opsi A': '',
        'Opsi B': '',
        'Opsi C': '',
        'Opsi D': '',
        'Opsi E': '',
        'Jawaban Benar': ''
      }
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Soal')

    // Generate buffer and trigger download
    XLSX.writeFile(workbook, `Template_Soal_${exam?.title || 'Ujian'}.xlsx`)
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws) as any[]

        const importedQuestions: Question[] = data.map((row, index) => {
          const type = (row['Tipe'] || 'PG').toLowerCase() === 'essay' ? 'essay' : 'pg'
          const questionContent = row['Soal'] || ''
          const points = parseInt(row['Poin']) || 5
          const correctLetter = (row['Jawaban Benar'] || 'A').toUpperCase()

          const options: QuestionOption[] = []
          if (type === 'pg') {
            const possibleOptions = ['A', 'B', 'C', 'D', 'E']
            possibleOptions.forEach((letter) => {
              const content = row[`Opsi ${letter}`]
              if (content !== undefined && content !== null && content !== '') {
                options.push({
                  id: `imp-opt-${letter}-${Date.now()}-${index}`,
                  content: content.toString(),
                  is_correct: letter === correctLetter
                })
              }
            })
          }

          return {
            id: `imp-${Date.now()}-${index}`,
            content: questionContent,
            points,
            type: type as 'pg' | 'essay',
            options
          }
        })

        if (importedQuestions.length > 0) {
          setQuestions([...questions, ...importedQuestions])
          toast.success(`Berhasil mengimpor ${importedQuestions.length} soal!`)
        } else {
          toast.error('Tidak ada soal yang ditemukan dalam file.')
        }
      } catch (err) {
        console.error('Import Error:', err)
        toast.error('Gagal mengimpor file Excel. Pastikan format benar.')
      }
    }
    reader.readAsBinaryString(file)
    // Reset input
    e.target.value = ''
  }

  const handlePublish = async () => {
    setShowPublishDialog(true)
  }

  const confirmPublish = async () => {
    setPublishing(true)
    setShowPublishDialog(false)
    try {
      const { error } = await supabase
        .from('exams')
        .update({ is_published: true })
        .eq('id', id)

      if (error) throw error
      toast.success('Ujian berhasil dipublikasikan!')
      router.push('/exams')
    } catch (err: unknown) {
      const error = err as { message: string }
      toast.error('Gagal publikasi: ' + error.message)
    } finally {
      setPublishing(false)
    }
  }

  const scrollToQuestion = (idx: number) => {
    const element = document.getElementById(`question-${idx}`)
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }
  }

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-10 w-10 text-primary animate-spin" /></div>

  return (
    <>
      {/* Floating Action for Mobile Navigation */}
      <div className="fixed bottom-8 right-8 xl:hidden z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" className="h-14 w-14 rounded-full shadow-2xl p-0 ring-4 ring-background">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black leading-none opacity-70">SOAL</span>
                <span className="text-lg font-black leading-tight">{questions.length}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 max-h-[80vh] overflow-y-auto p-4 rounded-2xl" align="end" side="top">
             <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Lompat ke Soal</div>
             <div className="grid grid-cols-4 gap-2">
                {questions.map((_, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => scrollToQuestion(i)}
                    className="h-10 w-10 p-0 font-bold"
                  >
                    {i + 1}
                  </Button>
                ))}
             </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Question Preview Modal */}
      <Dialog open={!!previewingQuestion} onOpenChange={() => setPreviewingQuestion(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tampilan Siswa</DialogTitle>
          </DialogHeader>
          {previewingQuestion && (
            <div className="space-y-6">
              {previewingQuestion.image_url && (
                <div className="flex justify-center bg-muted p-4 rounded-xl">
                  <Image
                    src={previewingQuestion.image_url}
                    alt="Preview"
                    width={800}
                    height={600}
                    className="max-h-64 w-auto object-contain rounded-lg"
                  />
                </div>
              )}
              <div className="text-xl font-bold leading-relaxed bg-muted/50 p-6 rounded-xl">
                {previewingQuestion.content ? (
                  <MathRenderer content={previewingQuestion.content} />
                ) : (
                  <span className="text-muted-foreground italic">Belum ada teks pertanyaan...</span>
                )}
              </div>

              {previewingQuestion.type === 'pg' && (
                <div className="grid grid-cols-1 gap-3">
                  {previewingQuestion.options.map((opt, idx) => (
                    <div key={opt.id} className="p-4 rounded-xl bg-card border flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center font-bold text-muted-foreground text-sm">
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <div className="font-medium flex-1">
                        {opt.content ? (
                          <MathRenderer content={opt.content} />
                        ) : (
                          <span className="text-muted-foreground italic">Opsi kosong...</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>





      {/* Questions with Sticky Navigation */}
      <div className="px-4 md:px-0 pb-32 xl:mr-80">
        <div className="max-w-6xl mx-auto">
                {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between sticky top-[65px] z-30 bg-background/90 backdrop-blur-md py-4 gap-4 border-b px-4 md:px-0">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/exams">
              <ChevronLeft className="h-6 w-6" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Editor Ujian</h1>
            <p className="text-xs md:text-sm text-muted-foreground font-semibold uppercase tracking-wider">{exam?.title}</p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={saving || publishing}
            className="flex-1 md:flex-none"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan
          </Button>
          <Button
            onClick={handlePublish}
            disabled={saving || publishing || exam?.is_published}
            className="flex-1 md:flex-none"
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            {exam?.is_published ? 'Sudah Terbit' : 'Publikasi'}
          </Button>
        </div>
      </div>
          {/* Import/Template Actions */}
      <div className="px-4 md:px-0 mt-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-4 mb-8">
          <Button variant="outline" className="flex-1 h-16 border-dashed hover:border-primary hover:bg-primary/5 group" onClick={handleDownloadTemplate}>
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/20 transition-colors mr-3">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold">Download Template</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">File Excel (.xlsx)</div>
            </div>
          </Button>

          <div className="flex-1 relative">

            <input
              type="file"
              id="import-excel"
              className="hidden"
              accept=".xlsx, .xls"
              onChange={handleImportExcel}
            />
            <Label
              htmlFor="import-excel"
              className="flex items-center w-full h-16 px-4 py-2 border rounded-xl border-dashed cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="h-10 w-10 shrink-0 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/20 transition-colors mr-3">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold">Import dari Excel</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Unggah file soal anda</div>
              </div>
            </Label>
          </div>
        </div>
      </div>
        <div className="flex gap-8">
          {/* Main Content - Questions */}
          <div className="flex-1 min-w-0 space-y-8">
            {questions.map((q, idx) => (
              <Card key={q.id} id={`question-${idx}`} className="group hover:border-primary/50 transition-all hover:shadow-xl">
                <CardHeader className="py-3 px-6 border-b bg-muted/30 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Soal #{idx + 1}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setPreviewingQuestion(q)}
                      className="text-primary"
                    >
                      <Eye className="h-3.5 w-3.5" /> Pratinjau
                    </Button>
                    <Select
                      value={q.type}
                      onValueChange={(value) => handleQuestionChange(q.id, 'type', value)}
                    >
                      <SelectTrigger className="h-7 text-xs w-auto border-0 bg-transparent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pg">Pilihan Ganda</SelectItem>
                        <SelectItem value="essay">Essay / Isian</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleRemoveQuestion(q.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Isi Pertanyaan</Label>
                    <textarea
                      value={q.content}
                      onChange={(e) => handleQuestionChange(q.id, 'content', e.target.value)}
                      className="w-full bg-muted/30 border rounded-xl p-4 text-foreground font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all min-h-[120px] placeholder:text-muted-foreground"
                      placeholder="Ketikkan teks soal di sini..."
                    />
                  </div>

                  {q.image_url && (
                    <div className="relative w-fit group/img">
                       <Image
                        src={q.image_url}
                        alt="Question"
                        width={800}
                        height={600}
                        className="max-h-64 w-auto rounded-xl border shadow-md"
                       />
                       <Button
                        variant="destructive"
                        size="icon-xs"
                        onClick={() => handleRemoveImage(q.id)}
                        className="absolute -top-2 -right-2 opacity-0 group-hover/img:opacity-100 transition-opacity"
                       >
                         <X className="h-3 w-3" />
                       </Button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4">
                    <input
                      type="file"
                      id={`file-${q.id}`}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(q.id, e)}
                    />
                    <Button variant="secondary" size="sm" asChild>
                      <label htmlFor={`file-${q.id}`} className="cursor-pointer">
                         {uploadingId === q.id ? (
                           <Loader2 className="h-4 w-4 animate-spin" />
                         ) : (
                           <ImageIcon className="h-4 w-4" />
                         )}
                         {q.image_url ? 'Ganti Gambar' : 'Tambah Gambar'}
                      </label>
                    </Button>
                    <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg">
                      <span className="text-xs font-bold text-muted-foreground uppercase">Poin:</span>
                      <Input
                        type="number"
                        value={q.points}
                        onChange={(e) => handleQuestionChange(q.id, 'points', parseInt(e.target.value))}
                        className="w-14 h-7 text-center p-0 border-0 bg-transparent font-bold"
                      />
                    </div>
                  </div>

                  {q.type === 'pg' && (
                    <div className="space-y-4 pt-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Opsi Jawaban</Label>
                        <span className="text-xs text-primary italic">Pilih satu sebagai jawaban benar</span>
                      </div>
                      <div className="space-y-3">
                        {q.options.map((opt, oIdx) => (
                          <div key={opt.id} className="flex items-center gap-3">
                            <Button
                              variant={opt.is_correct ? 'default' : 'outline'}
                              size="icon"
                              onClick={() => handleOptionChange(q.id, opt.id, 'is_correct', true)}
                              className={opt.is_correct ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                            >
                              {opt.is_correct ? <CheckCircle2 className="h-5 w-5" /> : String.fromCharCode(65 + oIdx)}
                            </Button>
                            <Input
                              type="text"
                              value={opt.content}
                              onChange={(e) => handleOptionChange(q.id, opt.id, 'content', e.target.value)}
                              className={opt.is_correct ? 'border-emerald-200 ring-2 ring-emerald-500/10' : ''}
                              placeholder={`Opsi ${String.fromCharCode(65 + oIdx)}`}
                            />
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleRemoveOption(q.id, opt.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleAddOption(q.id)}
                        className="w-full border-dashed"
                      >
                        <Plus className="h-4 w-4" /> Tambah Opsi
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <Button
              variant="outline"
              onClick={handleAddQuestion}
              className="w-full py-12 border-2 border-dashed flex flex-col gap-3 h-auto hover:border-primary hover:bg-primary/5"
            >
               <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary transition-colors">
                 <Plus className="h-8 w-8 text-muted-foreground" />
               </div>
               <span className="font-bold text-xs text-muted-foreground uppercase tracking-widest">Tambah Soal Baru</span>
            </Button>
          </div>
        </div>
      </div>
      </div>

      {/* Fixed Navigation Panel via Portal - Desktop Only */}
      {portalNode && createPortal(
        <div className="hidden xl:block fixed right-8 top-24 w-72 z-50 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <Card className="border bg-background/95 backdrop-blur-md shadow-lg">
            <CardHeader className="py-4 px-5 border-b bg-muted/30">
              <h3 className="text-sm font-bold text-primary-heading uppercase tracking-widest">
                Navigasi Soal
              </h3>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex flex-wrap gap-2">
                {questions.map((_, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => scrollToQuestion(i)}
                    className="h-10 w-10 p-0 font-bold text-base hover:bg-primary hover:text-primary-foreground transition-all shadow-sm active:scale-95"
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddQuestion}
                  className="h-10 w-10 p-0 border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary"
                  title="Tambah Soal"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
            <div className="px-5 py-4 bg-muted/20 border-t">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Total Soal</div>
                <div className="px-3 py-1 rounded-full bg-primary text-primary-foreground font-black text-sm">{questions.length}</div>
              </div>
            </div>
          </Card>
        </div>,
        portalNode
      )}

      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Publikasikan Ujian?</AlertDialogTitle>
            <AlertDialogDescription>
              Ujian yang telah dipublikasikan akan muncul di panel siswa dan dapat langsung dikerjakan. Pastikan semua soal telah diatur dengan benar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-none bg-secondary">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPublish}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Ya, Publikasikan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
