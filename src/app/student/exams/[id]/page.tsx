'use client'

import { useExamTake, Question } from '@/hooks/use-exam-take'
import { useState, useEffect, use, useCallback, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Timer,
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckCircle2,
  Menu,
  X,
  Loader2,
  AlertCircle,
  GraduationCap,
  Shield,
  Lock,
  RefreshCw,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { MathRenderer } from '@/components/ui/math-renderer'

// Shadcn UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'

export default function ExamTakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: examId } = use(params)
  const router = useRouter()
  const supabase = createClient()

  // SWR Hook
  const { data: swrData, isLoading } = useExamTake(examId)
  const { exam, questions, submission, answers: initialAnswers, alreadySubmitted } = swrData

  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Security & Anti-Cheating States
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSecurityWarning, setShowSecurityWarning] = useState(false)
  const [violationCount, setViolationCount] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)
  const [savingAnswer, setSavingAnswer] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set())

  // Dialog States
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)

  // Sync SWR data to local state once loaded
  const hasInitialized = useRef(false)
  useEffect(() => {
    if (!isLoading && swrData.exam && !hasInitialized.current) {
      if (alreadySubmitted) {
        toast.error('Kamu sudah mengerjakan ujian ini!')
        router.push('/student')
        return
      }
      setAnswers(initialAnswers)
      setTimeLeft(exam.duration * 60)
      if (submission?.violations) {
        setViolationCount(submission.violations)
      }
      hasInitialized.current = true
    }
  }, [isLoading, swrData, alreadySubmitted, router, exam?.duration, initialAnswers, submission?.violations])

  const toggleFlag = (questionId: string) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(questionId)) {
        newSet.delete(questionId)
      } else {
        newSet.add(questionId)
      }
      return newSet
    })
  }

  const handleSubmit = useCallback(async () => {
    if (submitting || !submission) return
    setSubmitting(true)
    setShowSubmitDialog(false)

    try {
      const { error } = await supabase
        .from('submissions')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('id', submission.id)

      if (error) throw error

      toast.success('🎉 Ujian berhasil dikirim! Terima kasih telah mengerjakan.')
      window.location.href = '/student'
    } catch (err: unknown) {
      setIsSubmitted(false)
      toast.error('Gagal mengirim jawaban: ' + (err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }, [submitting, submission, supabase])

  const incrementViolation = useCallback(async () => {
    if (!submission) return
    setViolationCount(prev => prev + 1)
    try {
      await supabase.rpc('increment_violation', { sub_id: submission.id })
    } catch (e) {
      const { data: currentSub } = await supabase.from('submissions').select('violations').eq('id', submission.id).single()
      await supabase.from('submissions').update({ violations: (currentSub?.violations || 0) + 1 }).eq('id', submission.id)
    }
  }, [submission, supabase])

  useEffect(() => {
    if (isLoading) return

    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
      if (!document.fullscreenElement && !isSubmitted && hasStarted) {
        setShowSecurityWarning(true)
      }
    }

    const onBlur = () => {
      if (!isLoading && !submitting && !isSubmitted && hasStarted) {
        incrementViolation()
      }
    }

    const onContextMenu = (e: MouseEvent) => e.preventDefault()
    const onSelectStart = (e: Event) => e.preventDefault()
    const onDragStart = (e: Event) => e.preventDefault()
    const onAuxClick = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault()
    }

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isLoading && !submitting && !isSubmitted && hasStarted) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const forbiddenKeys = ['u', 's', 'c', 'v', 'i', 'j', 't', 'n', 'w', 'l']
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && forbiddenKeys.includes(e.key.toLowerCase())) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C' || e.key === 'J'))
      ) {
        e.preventDefault()
        return false
      }
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)
    window.addEventListener('blur', onBlur)
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('selectstart', onSelectStart)
    document.addEventListener('dragstart', onDragStart)
    document.addEventListener('auxclick', onAuxClick)

    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('selectstart', onSelectStart)
      document.removeEventListener('dragstart', onDragStart)
      document.removeEventListener('auxclick', onAuxClick)
      document.body.style.userSelect = 'auto'
      document.body.style.webkitUserSelect = 'auto'
    }
  }, [isLoading, submitting, incrementViolation, isSubmitted, hasStarted])

  useEffect(() => {
    if (isLoading || timeLeft <= 0 || !hasStarted) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    const updateOnlineStatus = async () => {
      const sessionId = document.cookie
        .split('; ')
        .find(row => row.startsWith('cbt_session='))
        ?.split('=')[1]

      if (sessionId) {
        await supabase
          .from('profiles')
          .update({ last_online_at: new Date().toISOString() })
          .eq('id', sessionId)
      }
    }
    const heartbeat = setInterval(updateOnlineStatus, 30000)
    updateOnlineStatus()

    return () => {
      clearInterval(timer)
      clearInterval(heartbeat)
    }
  }, [isLoading, timeLeft, supabase, hasStarted, handleSubmit])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleAnswer = async (qId: string, optId: string) => {
    setAnswers(prev => ({ ...prev, [qId]: optId }))
    setSavingAnswer(qId)
    if (!submission) {
      setSavingAnswer(null)
      return
    }
    try {
      await supabase.from('answers').upsert([
        {
          submission_id: submission.id,
          question_id: qId,
          pg_option_id: optId
        }
      ], { onConflict: 'submission_id,question_id' })
    } catch (err) {
      console.error('Auto-save error:', err)
    } finally {
      setTimeout(() => setSavingAnswer(null), 500)
    }
  }

  const handleEnterFullscreen = async () => {
    const now = new Date()
    if (!exam?.start_time) {
      toast.error('Jadwal ujian belum ditentukan oleh guru.')
      return
    }
    if (now < new Date(exam.start_time)) {
      toast.error('Ujian belum dimulai!')
      return
    }
    if (exam.end_time && now > new Date(exam.end_time)) {
      toast.error('Waktu ujian telah berakhir.')
      return
    }
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
      }
      setHasStarted(true)
      setIsFullscreen(true)
      setShowSecurityWarning(false)
    } catch (err) {
      toast.error('Gagal masuk mode fullscreen.')
    }
  }

  const confirmExit = () => {
    router.push('/student')
  }

  const handleShowSubmit = async () => {
    setIsSubmitted(true)
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen()
      } catch (e) {}
    }
    await new Promise(resolve => setTimeout(resolve, 100))
    setShowSubmitDialog(true)
  }

  const handleCancelSubmit = () => {
    setIsSubmitted(false)
    setShowSubmitDialog(false)
    if (hasStarted) {
      handleEnterFullscreen()
    }
  }

  if (isLoading) return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-100">
      <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center animate-bounce mb-4 shadow-xl shadow-primary/20">
        <GraduationCap className="h-10 w-10 text-primary-foreground" />
      </div>
      <p className="font-black text-[10px] uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Menyiapkan Lembar Ujian...</p>
    </div>
  )

  const q = questions[currentQuestionIdx] as Question | undefined
  const answeredCount = Object.keys(answers).length
  const totalQuestions = questions.length || 1
  const progressPercent = (answeredCount / totalQuestions) * 100

  // Security Check: Block rendering if not in time or no start time
  const now = new Date()
  const isTooEarly = !exam?.start_time || now < new Date(exam.start_time)
  const isTooLate = exam?.end_time && now > new Date(exam.end_time)

  if (isTooEarly || isTooLate) {
    return (
      <div className="fixed inset-0 bg-muted/30 flex flex-col z-50 overflow-hidden items-center justify-center p-4">
        <div className="max-w-md w-full bg-background rounded-[2.5rem] p-8 text-center shadow-2xl border border-muted-foreground/10">
          <div className="h-24 w-24 bg-amber-50 rounded-[2rem] flex items-center justify-center mb-8 border border-amber-200 shadow-xl shadow-amber-500/5 mx-auto">
            <Lock className="h-10 w-10 text-amber-600" />
          </div>
          <h2 className="text-3xl font-black text-primary-heading mb-4 tracking-tighter uppercase leading-none">Akses Terkunci</h2>
          <div className="text-muted-foreground mb-8 text-base font-medium leading-relaxed">
            {isTooEarly ? (
              <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl text-amber-700 font-bold">
                {!exam?.start_time ? (
                  "Jadwal ujian belum ditentukan oleh guru. Sila hubungi guru pengampu."
                ) : (
                  <>
                    Ujian dijadwalkan mulai pada:<br/>
                    <span className="text-xl font-black block mt-2">
                      {new Date(exam.start_time).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
                    </span>
                  </>
                )}
              </div>
            ) : (
              <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl text-rose-700 font-bold">
                Ujian telah berakhir pada:<br/>
                <span className="text-xl font-black block mt-2">
                  {new Date(exam.end_time!).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
                </span>
              </div>
            )}
          </div>
          <Button
            onClick={() => router.push('/student')}
            className="w-full py-7 h-auto bg-primary text-primary-foreground rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all transform active:scale-95"
          >
            Kembali ke Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-muted/30 flex flex-col z-50 overflow-hidden">
      <Dialog open={!hasStarted} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
          <div className="p-8 text-center bg-background">
            <div className="h-20 w-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-6 border border-primary/20 shadow-xl shadow-primary/5 mx-auto">
              <GraduationCap className="h-10 w-10 text-primary" />
            </div>
            <DialogTitle className="text-3xl font-black text-primary-heading mb-4 tracking-tighter uppercase leading-none">Lembar Ujian Siap</DialogTitle>
            <DialogDescription className="text-muted-foreground max-w-lg mb-8 text-base font-medium leading-relaxed">
              {!exam?.start_time ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 font-bold mb-4">
                  Jadwal ujian belum ditentukan oleh guru. Sila hubungi guru pengampu.
                </div>
              ) : new Date() < new Date(exam.start_time) ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 font-bold mb-4">
                  Ujian dijadwalkan mulai pada:<br/>
                  <span className="text-lg font-black">{new Date(exam.start_time).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</span>
                </div>
              ) : exam.end_time && new Date() > new Date(exam.end_time) ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 font-bold mb-4">
                  Ujian telah berakhir pada:<br/>
                  <span className="text-lg font-black">{new Date(exam.end_time).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</span>
                </div>
              ) : (
                <>Sila klik tombol di bawah untuk masuk ke mode <strong>Layar Penuh</strong> dan memulai pengerjaan soal.</>
              )}
            </DialogDescription>
            <Button
              onClick={handleEnterFullscreen}
              disabled={!exam?.start_time || new Date() < new Date(exam.start_time) || (!!exam.end_time && new Date() > new Date(exam.end_time))}
              className="w-full py-7 h-auto bg-primary text-primary-foreground rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all transform active:scale-95 disabled:opacity-50 disabled:grayscale"
            >
              {!exam?.start_time ? 'Jadwal Belum Ada' : new Date() < new Date(exam.start_time) ? 'Belum Bisa Dimulai' : (exam.end_time && new Date() > new Date(exam.end_time)) ? 'Ujian Berakhir' : 'Mulai Ujian Sekarang'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={hasStarted && showSecurityWarning && !isFullscreen && !isSubmitted} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-destructive">
          <div className="p-8 text-center bg-destructive text-destructive-foreground">
            <div className="h-20 w-20 bg-background/10 rounded-[2rem] flex items-center justify-center mb-6 border border-background/20 animate-pulse mx-auto">
              <Lock className="h-10 w-10 text-background" />
            </div>
            <DialogTitle className="text-3xl font-black text-background mb-4 uppercase tracking-tighter leading-none">LAYAR TERKUNCI</DialogTitle>
            <DialogDescription className="text-destructive-foreground/80 max-w-md mb-8 font-medium leading-relaxed text-base">
              Berpindah tab atau menutup fullscreen tidak diperbolehkan selama ujian berlangsung.
            </DialogDescription>
            <Button
              onClick={handleEnterFullscreen}
              className="w-full py-7 h-auto bg-background text-destructive rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-black/20 hover:bg-background/90"
            >
              Kembali ke Layar Penuh
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <header className="h-20 bg-background border-b px-6 md:px-8 flex items-center justify-between shadow-sm z-30">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="h-11 w-11 rounded-xl flex items-center justify-center text-muted-foreground border-border/50"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden sm:block">
            <h1 className="font-bold text-primary-heading text-lg leading-tight tracking-tight">{exam?.title}</h1>
            <p className="text-[9px] uppercase font-black text-primary tracking-widest">{exam?.subjects?.name || 'Mata Pelajaran'}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <div className={cn(
            "flex items-center gap-3 px-5 py-2.5 rounded-2xl border-2 transition-all",
            timeLeft < 300 ? 'bg-destructive/5 border-destructive/20 text-destructive animate-pulse' : 'bg-muted/50 border-border/50 text-primary-heading'
          )}>
            <Timer className={cn("h-5 w-5", timeLeft < 300 ? 'text-destructive' : 'text-muted-foreground')} />
            <span className="font-mono font-black text-xl tabular-nums tracking-tighter">{formatTime(timeLeft)}</span>
          </div>
          <Separator orientation="vertical" className="h-10 hidden sm:block" />
          <Button
            variant="ghost"
            onClick={() => setShowExitDialog(true)}
            className="hidden sm:flex text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-destructive"
          >
            <AlertCircle className="h-4 w-4 mr-2" /> Keluar
          </Button>
          <Button
            onClick={handleShowSubmit}
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 h-12 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-200/50"
          >
            {submitting ? 'Mengirim...' : 'Selesai'}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-20 pb-40">
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.4em]">Soal No. {currentQuestionIdx + 1}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => q && toggleFlag(q.id)}
                className={cn(
                  "text-[10px] font-black uppercase tracking-widest rounded-xl transition-all h-9 px-4",
                  q && flaggedQuestions.has(q.id) ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-amber-50/50 text-amber-600 border-amber-100'
                )}
              >
                <Flag className={cn("h-3.5 w-3.5 mr-2", q && flaggedQuestions.has(q.id) ? "fill-current" : "")} />
                {q && flaggedQuestions.has(q.id) ? 'Ragu-ragu' : 'Tandai Ragu'}
              </Button>
            </div>

            <div className="space-y-8">
              {q?.image_url && (
                <Card className="rounded-[2.5rem] overflow-hidden border-none shadow-sm">
                   <CardContent className="p-4 flex justify-center bg-white">
                      <Image
                        src={q.image_url}
                        alt="Question Illustration"
                        width={800}
                        height={600}
                        className="max-h-80 md:max-h-96 w-auto object-contain rounded-2xl"
                        priority
                      />
                   </CardContent>
                </Card>
              )}
              <Card className="rounded-[2.5rem] border-border/30 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardContent className="p-8 md:p-12 text-xl md:text-2xl font-bold text-primary-heading leading-relaxed">
                  <MathRenderer content={q?.content || ''} />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {q?.options.map((opt, idx) => {
                const isSelected = answers[q.id] === opt.id
                return (
                  <Button
                    key={opt.id}
                    variant="ghost"
                    onClick={() => handleAnswer(q.id, opt.id)}
                    className={cn(
                      "p-8 h-auto rounded-[2rem] text-left border-2 transition-all flex items-center gap-5 group relative overflow-hidden justify-start",
                      isSelected ? 'bg-primary/5 border-primary' : 'bg-background border-border/40 hover:border-primary/30'
                    )}
                  >
                    <div className={cn(
                      "h-12 w-12 rounded-2xl flex items-center justify-center font-black text-xl ring-1 transition-all shrink-0",
                      isSelected ? 'bg-primary text-primary-foreground ring-primary' : 'bg-muted text-muted-foreground ring-border/50 group-hover:bg-primary/10'
                    )}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <div className={cn("font-bold text-lg leading-tight flex-1 whitespace-normal", isSelected ? 'text-primary-heading' : 'text-muted-foreground')}>
                      <MathRenderer content={opt.content} />
                    </div>
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        {savingAnswer === q.id ? (
                           <Loader2 className="h-4 w-4 text-primary animate-spin" />
                        ) : (
                           <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        )}
                      </div>
                    )}
                  </Button>
                )
              })}
            </div>
          </div>
        </main>

        <aside className={cn(
          "fixed inset-y-0 right-0 w-80 bg-background border-l border-border/50 shadow-xl transition-transform duration-500 z-40 transform flex flex-col p-8",
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0 lg:static'
        )}>
          <div className="flex items-center justify-between mb-10">
            <h2 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground/60">Navigasi Soal</h2>
            <Button variant="ghost" size="icon" className="lg:hidden rounded-xl" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5 text-muted-foreground"/>
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="grid grid-cols-5 gap-2.5">
              {questions.map((item, i) => {
                const isAnswered = answers[item.id] !== undefined
                const isCurrent = currentQuestionIdx === i
                const isFlagged = flaggedQuestions.has(item.id)
                return (
                  <Button
                    key={item.id}
                    variant="outline"
                    onClick={() => { setCurrentQuestionIdx(i); setSidebarOpen(false); }}
                    className={cn(
                      "aspect-square p-0 h-auto rounded-xl flex items-center justify-center font-black text-xs border-2 relative",
                      isCurrent ? 'bg-primary text-primary-foreground border-primary scale-105 z-10' :
                      isFlagged ? 'bg-amber-100 text-amber-700 border-amber-300' :
                      isAnswered ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-muted/30 text-muted-foreground/50 border-border/30'
                    )}
                  >
                    {i + 1}
                    {isFlagged && !isCurrent && <span className="absolute -top-1 -right-1 h-3 w-3 bg-amber-500 rounded-full border-2 border-background" />}
                  </Button>
                )
              })}
            </div>
          </div>
          <div className="mt-10 pt-8 border-t border-border/30 space-y-4">
            <div className="flex items-center justify-between text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              <span>Progres</span>
              <span className="text-primary font-bold">{answeredCount} / {totalQuestions}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </aside>
      </div>

      <footer className="h-24 bg-background/90 backdrop-blur-md border-t border-border/50 px-6 md:px-12 flex items-center justify-between z-30">
        <Button
          variant="ghost"
          disabled={currentQuestionIdx === 0}
          onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
          className="flex items-center gap-3 font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground disabled:opacity-20"
        >
          <ChevronLeft className="h-5 w-5" /> Sebelumnya
        </Button>
        <Button
          variant="ghost"
          disabled={currentQuestionIdx === totalQuestions - 1}
          onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
          className="flex items-center gap-3 font-black text-[10px] uppercase tracking-[0.2em] text-primary disabled:opacity-20"
        >
          Selanjutnya <ChevronRight className="h-5 w-5" />
        </Button>
      </footer>

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Yakin ingin keluar?</AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium">Ujian Anda masih tersimpan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-none bg-muted font-bold">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit} className="rounded-xl bg-destructive font-bold text-white">Ya, Keluar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Akhiri Ujian?</AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium">Pastikan semua terjawab dengan benar.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSubmit} className="rounded-xl border-none bg-muted font-bold">Periksa Lagi</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} className="rounded-xl bg-emerald-600 font-bold text-white">Ya, Kirim Sekarang</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
