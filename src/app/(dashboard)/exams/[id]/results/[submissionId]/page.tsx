'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Clock,
  Award,
  ShieldAlert,
  Loader2
} from 'lucide-react'
import Link from 'next/link'

// Shadcn UI Components
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SubmissionDetail {
  id: string
  score: number
  status: string
  violations: number
  created_at: string
  profiles: { full_name: string }
  exams: { title: string }
}

interface AnswerDetail {
  question_id: string
  pg_option_id: string
  questions: {
    content: string
    image_url: string
    options: {
      id: string
      content: string
      is_correct: boolean
    }[]
  }
}

export default function SubmissionDetailPage({ params }: { params: Promise<{ id: string, submissionId: string }> }) {
  const { id: examId, submissionId } = use(params)
  const [loading, setLoading] = useState(true)
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null)
  const [answers, setAnswers] = useState<AnswerDetail[]>([])

  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      // 1. Fetch Submission Info
      const { data: subData } = await supabase
        .from('submissions')
        .select(`
          *,
          profiles:student_id (full_name),
          exams:exam_id (title)
        `)
        .eq('id', submissionId)
        .single()

      setSubmission(subData)

      // 2. Fetch Answers with Question and Options details
      const { data: ansData } = await supabase
        .from('answers')
        .select(`
          question_id,
          pg_option_id,
          questions:question_id (
            content,
            image_url,
            options (id, content, is_correct)
          )
        `)
        .eq('submission_id', submissionId)

      if (ansData) {
        setAnswers(ansData as any)
      }

      setLoading(false)
    }

    fetchData()
  }, [submissionId, supabase])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Memuat Detail Jawaban...</p>
      </div>
    </div>
  )

  if (!submission) return <div className="p-20 text-center text-muted-foreground">Data tidak ditemukan.</div>

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/exams/${examId}/results`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Detail Jawaban Siswa</h1>
          <p className="text-sm text-muted-foreground">{submission.exams.title}</p>
        </div>
      </div>

      {/* Student Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="h-20 w-20 bg-primary/10 rounded-2xl flex items-center justify-center border">
                <User className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">{submission.profiles.full_name}</h2>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-xs">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(submission.created_at).toLocaleString('id-ID')}
                  </div>
                  {submission.violations > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      <ShieldAlert className="h-3 w-3 mr-1" />
                      {submission.violations} Pelanggaran Keamanan
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 bg-muted p-6 rounded-2xl">
              <div className="text-center px-4 border-r">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Skor Akhir</span>
                <div className="flex items-center gap-2 mt-1">
                  <Award className="h-6 w-6 text-primary" />
                  <span className="text-4xl font-black">{submission.score || 0}</span>
                </div>
              </div>
              <div className="text-center px-4">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</span>
                <div className="flex items-center gap-2 mt-1">
                  <CheckCircle2 className={`h-5 w-5 ${submission.status === 'submitted' ? 'text-emerald-500' : 'text-amber-500'}`} />
                  <span className={`text-lg font-bold ${submission.status === 'submitted' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {submission.status === 'submitted' ? 'Graded' : 'In Progress'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Answers List */}
      <div className="space-y-6">
        <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-3 ml-2">
          Review Jawaban
          <span className="h-px flex-1 bg-border" />
        </h3>

        {answers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground italic">
              Belum ada jawaban yang tersimpan.
            </CardContent>
          </Card>
        ) : (
          answers.map((ans, idx) => {
            const studentOption = ans.questions.options.find(o => o.id === ans.pg_option_id)
            const correctOption = ans.questions.options.find(o => o.is_correct)
            const isCorrect = ans.pg_option_id === correctOption?.id

            return (
              <Card key={idx} className="overflow-hidden">
                <CardHeader className="py-3 px-6 border-b bg-muted/30 flex flex-row items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Soal No. {idx + 1}</span>
                  {isCorrect ? (
                    <Badge className="bg-emerald-500">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Benar
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" /> Salah
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                    <div className="md:col-span-8 space-y-6">
                      <p className="text-lg font-bold leading-relaxed">
                        {ans.questions.content}
                      </p>

                      {ans.questions.image_url && (
                        <div className="bg-muted p-4 rounded-xl inline-block">
                          <img src={ans.questions.image_url} alt="Question" className="max-h-60 rounded-lg" />
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-3">
                        {ans.questions.options.map((opt, oIdx) => {
                          const isStudentChoice = opt.id === ans.pg_option_id
                          const isTheCorrectOn = opt.is_correct

                          return (
                            <div
                              key={opt.id}
                              className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
                                isStudentChoice && isTheCorrectOn ? 'bg-emerald-50/50 border-emerald-500' :
                                isStudentChoice && !isTheCorrectOn ? 'bg-red-50/50 border-red-500' :
                                !isStudentChoice && isTheCorrectOn ? 'bg-emerald-50/30 border-emerald-200 border-dashed' :
                                'bg-card border-border'
                              }`}
                            >
                               <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm ring-1 ${
                                 isStudentChoice && isTheCorrectOn ? 'bg-emerald-500 text-white ring-emerald-500' :
                                 isStudentChoice && !isTheCorrectOn ? 'bg-red-500 text-white ring-red-500' :
                                 !isStudentChoice && isTheCorrectOn ? 'bg-emerald-100 text-emerald-600 ring-emerald-200' :
                                 'bg-muted text-muted-foreground ring-border'
                               }`}>
                                 {String.fromCharCode(65 + oIdx)}
                               </div>
                               <span className={`font-bold transition-all ${
                                 isStudentChoice && isTheCorrectOn ? 'text-emerald-900' :
                                 isStudentChoice && !isTheCorrectOn ? 'text-red-900' :
                                 !isStudentChoice && isTheCorrectOn ? 'text-emerald-700' :
                                 'text-muted-foreground'
                               }`}>
                                 {opt.content}
                               </span>
                               {isStudentChoice && <div className="ml-auto"><AlertCircle className={`h-4 w-4 ${isTheCorrectOn ? 'text-emerald-500' : 'text-red-500'}`} /></div>}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="md:col-span-4 space-y-6">
                       <div className="bg-muted rounded-xl p-6 space-y-4">
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b pb-2">Analisis Jawaban</h4>
                          <div className="space-y-4">
                            <div>
                               <p className="text-xs text-muted-foreground font-bold uppercase mb-1">Jawaban Siswa</p>
                               <p className={`text-sm font-bold ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                                 {studentOption?.content || 'Tidak menjawab'}
                               </p>
                            </div>
                            <div>
                               <p className="text-xs text-muted-foreground font-bold uppercase mb-1">Jawaban Benar</p>
                               <p className="text-sm font-bold text-emerald-600">
                                 {correctOption?.content || 'N/A'}
                               </p>
                            </div>
                          </div>
                       </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
