'use client'

import { useState, useEffect, useCallback, use } from 'react'
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
  Eye
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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

export default function ExamEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [previewingQuestion, setPreviewingQuestion] = useState<Question | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: examData } = await supabase
        .from('exams')
        .select('*, subjects(name)')
        .eq('id', id)
        .single()

      setExam(examData)

      const { data: qData } = await supabase
        .from('questions')
        .select('*, options(*)')
        .eq('exam_id', id)
        .order('id')

      if (qData) {
        setQuestions(qData.map((q: any) => ({
          ...q,
          options: q.options || []
        })))
      }
    } catch (err) {
      console.error('Error fetching exam editor data:', err)
    } finally {
      setLoading(false)
    }
  }, [id, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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

  const handleQuestionChange = (qId: string, field: keyof Question, value: any) => {
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
    } catch (err: any) {
      alert('Gagal upload gambar: ' + err.message)
    } finally {
      setUploadingId(null)
    }
  }

  const handleRemoveImage = (qId: string) => {
    setQuestions(questions.map(q => q.id === qId ? { ...q, image_url: undefined } : q))
  }

  const handleOptionChange = (qId: string, optId: string, field: keyof QuestionOption, value: any) => {
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

      alert('Berhasil menyimpan draft!')
      fetchData()
    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!confirm('Publikasikan ujian ini? Siswa akan bisa melihat dan mengerjakannya.')) return

    setPublishing(true)
    try {
      const { error } = await supabase
        .from('exams')
        .update({ is_published: true })
        .eq('id', id)

      if (error) throw error
      alert('Ujian berhasil dipublikasikan!')
      router.push('/exams')
    } catch (err: any) {
      alert('Gagal publikasi: ' + err.message)
    } finally {
      setPublishing(false)
    }
  }

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-10 w-10 text-primary animate-spin" /></div>

  return (
    <div className="space-y-8 pb-32 animate-fade-in px-4 md:px-0">
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
                  <img src={previewingQuestion.image_url} alt="Preview" className="max-h-64 object-contain rounded-lg" />
                </div>
              )}
              <div className="text-xl font-bold leading-relaxed bg-muted/50 p-6 rounded-xl">
                {previewingQuestion.content || <span className="text-muted-foreground italic">Belum ada teks pertanyaan...</span>}
              </div>

              {previewingQuestion.type === 'pg' && (
                <div className="grid grid-cols-1 gap-3">
                  {previewingQuestion.options.map((opt, idx) => (
                    <div key={opt.id} className="p-4 rounded-xl bg-card border flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center font-bold text-muted-foreground text-sm">
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <span className="font-medium">{opt.content || <span className="text-muted-foreground italic">Opsi kosong...</span>}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between sticky top-[65px] z-30 bg-background/90 backdrop-blur-md py-4 gap-4 border-b -mx-4 md:mx-0 px-4 md:px-0">
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

      {/* Questions */}
      <div className="max-w-4xl mx-auto space-y-8">
        {questions.map((q, idx) => (
          <Card key={q.id} className="group hover:border-primary/50 transition-all hover:shadow-xl">
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
                   <img src={q.image_url} alt="Question" className="max-h-64 rounded-xl border shadow-md" />
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
                          onClick={() => handleOptionChange(q.id, opt.id, 'content', '')}
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
  )
}
