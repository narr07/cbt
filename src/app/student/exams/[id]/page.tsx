'use client'

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
  LogOut
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Shadcn UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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

interface Option {
  id: string
  content: string
}

interface Question {
  id: string
  content: string
  type: 'pg' | 'essay'
  points: number
  image_url?: string
  options: Option[]
}

export default function ExamTakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: examId } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submission, setSubmission] = useState<any>(null)

  // Security & Anti-Cheating States
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSecurityWarning, setShowSecurityWarning] = useState(false)
  const [violationCount, setViolationCount] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)
  const [savingAnswer, setSavingAnswer] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set()) // For 'Tandai Ragu'

  // Dialog States
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)

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

  const isInitializing = useRef(false) // Prevent race condition

  const fetchData = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isInitializing.current) return
    isInitializing.current = true

    setLoading(true)

    // 1. Get Session
    const sessionId = document.cookie
      .split('; ')
      .find(row => row.startsWith('cbt_session='))
      ?.split('=')[1]

    if (!sessionId) {
      router.push('/login')
      return
    }

    // 2. Fetch Exam & Questions
    const { data: examData } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single()

    if (!examData) {
      toast.error('Ujian tidak ditemukan!')
      router.push('/student')
      return
    }
    setExam(examData)
    setTimeLeft(examData.duration * 60)

    const { data: qData } = await supabase
      .from('questions')
      .select('*, options(id, content)')
      .eq('exam_id', examId)
      .order('id')

    if (qData) {
      setQuestions(qData)
    }

    // 3. Create or Resume Submission
    const { data: existingSub } = await supabase
      .from('submissions')
      .select('*')
      .eq('exam_id', examId)
      .eq('student_id', sessionId)
      .maybeSingle()

    if (existingSub) {
      if (existingSub.status === 'submitted') {
        toast.error('Kamu sudah mengerjakan ujian ini!')
        router.push('/student')
        return
      }
      setSubmission(existingSub)
      // Load previous answers
      const { data: prevAns } = await supabase
        .from('answers')
        .select('*')
        .eq('submission_id', existingSub.id)

      if (prevAns) {
        const ansMap: Record<string, string> = {}
        prevAns.forEach(a => ansMap[a.question_id] = a.pg_option_id)
        setAnswers(ansMap)
      }
    } else {
      const { data: newSub, error: insertError } = await supabase
        .from('submissions')
        .insert([{
          exam_id: examId,
          student_id: sessionId,
          status: 'in_progress',
          score: 0,
          started_at: new Date().toISOString(),
          violations: 0
        }])
        .select()
        .single()

      if (insertError) {
        console.error('Failed to create submission:', insertError)
        toast.error('Gagal memulai ujian: ' + insertError.message)
        router.push('/student')
        return
      }

      setSubmission(newSub)
    }

    setLoading(false)
  }, [examId, supabase, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ANTI-CHEATING LOGIC
  const incrementViolation = useCallback(async () => {
    if (!submission) return
    setViolationCount(prev => prev + 1)

    // Update violation in DB
    try {
      await supabase.rpc('increment_violation', { sub_id: submission.id })
    } catch (e) {
      // Fallback update
      const { data: currentSub } = await supabase.from('submissions').select('violations').eq('id', submission.id).single()
      await supabase.from('submissions').update({ violations: (currentSub?.violations || 0) + 1 }).eq('id', submission.id)
    }
  }, [submission, supabase])

  useEffect(() => {
    if (loading) return

    // 1. Fullscreen Monitoring
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
      // Don't show warning if already submitted
      if (!document.fullscreenElement && !isSubmitted && hasStarted) {
        setShowSecurityWarning(true)
      }
    }

    // 2. Focus Monitoring (Blur detection)
    const onBlur = () => {
      if (!loading && !submitting && !isSubmitted && hasStarted) {
        incrementViolation()
      }
    }

    // 3. Prevent Security Shortcuts & Right Click & Leaving Browser
    const onContextMenu = (e: MouseEvent) => e.preventDefault()
    const onSelectStart = (e: Event) => e.preventDefault()
    const onDragStart = (e: Event) => e.preventDefault()
    const onAuxClick = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault() // Block middle click
    }

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!loading && !submitting && !isSubmitted && hasStarted) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      // Prevent F12, Ctrl+U, Ctrl+Shift+I, Ctrl+C, Ctrl+V, Ctrl+S, Ctrl+T, Ctrl+N, Ctrl+W, Ctrl+L
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
  }, [loading, submitting, incrementViolation, isSubmitted, hasStarted])

  useEffect(() => {
    if (loading || timeLeft <= 0 || !hasStarted) return
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

    // Online Status Heartbeat
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
  }, [loading, timeLeft, supabase, hasStarted])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleAnswer = async (qId: string, optId: string) => {
    // 1. Update UI immediately
    setAnswers(prev => ({ ...prev, [qId]: optId }))
    setSavingAnswer(qId)

    // 2. Save to DB (Real-time)
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
      setTimeout(() => setSavingAnswer(null), 500) // Small delay for UX feedback
    }
  }

  const handleEnterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
      }
      setHasStarted(true)
      setIsFullscreen(true)
      setShowSecurityWarning(false)
    } catch (err) {
      toast.error('Gagal masuk mode fullscreen. Mohon izinkan browser untuk masuk mode layar penuh.')
    }
  }

  const handleExit = () => {
    setShowExitDialog(true)
  }

  const confirmExit = () => {
    router.push('/student')
  }

  const handleShowSubmit = async () => {
    // Exit fullscreen FIRST to allow dialogs to work properly
    setIsSubmitted(true) // Mark as submitted to bypass security warnings

    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen()
      } catch (e) {}
    }

    // Small delay to ensure fullscreen exit is complete
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

  const handleSubmit = async () => {
    if (submitting || !submission) return
    setSubmitting(true)
    setShowSubmitDialog(false)

    try {
      // Update Submission Status
      const { error } = await supabase
        .from('submissions')
        .update({ status: 'submitted' })
        .eq('id', submission.id)

      if (error) throw error

      toast.success('🎉 Ujian berhasil dikirim! Terima kasih telah mengerjakan.')

      // Use window.location for reliable redirect
      window.location.href = '/student'
    } catch (err: any) {
      setIsSubmitted(false)
      toast.error('Gagal mengirim jawaban: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-[100]">
      <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center animate-bounce mb-4 shadow-xl shadow-primary/20">
        <GraduationCap className="h-10 w-10 text-primary-foreground" />
      </div>
      <p className="font-black text-[10px] uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Menyiapkan Lembar Ujian...</p>
    </div>
  )

  const q = questions[currentQuestionIdx]
  const answeredCount = Object.keys(answers).length
  const totalQuestions = questions.length || 1
  const progressPercent = (answeredCount / totalQuestions) * 100

  return (
    <div className="fixed inset-0 bg-muted/30 flex flex-col z-[50] overflow-hidden">
      {/* Start Exam Dialog Overlay */}
      <Dialog open={!hasStarted} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
          <div className="p-8 text-center bg-background">
            <div className="h-20 w-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-6 border border-primary/20 shadow-xl shadow-primary/5 mx-auto">
              <GraduationCap className="h-10 w-10 text-primary" />
            </div>
            <DialogTitle className="text-3xl font-black text-foreground mb-4 tracking-tighter uppercase leading-none">Lembar Ujian Siap</DialogTitle>
            <DialogDescription className="text-muted-foreground max-w-lg mb-8 text-base font-medium leading-relaxed">
              Sila klik tombol di bawah untuk masuk ke mode <strong>Layar Penuh</strong> dan memulai pengerjaan soal.
              Pastikan koneksi internet stabil.
            </DialogDescription>
            <Button
              onClick={handleEnterFullscreen}
              className="w-full py-7 h-auto bg-primary text-primary-foreground rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all transform active:scale-95"
            >
              Mulai Ujian Sekarang
            </Button>
            <p className="mt-8 text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-2">
              <Shield className="h-3 w-3 text-emerald-500" /> Secure Browser Mode Active
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Security Warning Dialog */}
      <Dialog open={hasStarted && showSecurityWarning && !isFullscreen && !isSubmitted} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-destructive">
          <div className="p-8 text-center bg-destructive text-destructive-foreground">
            <div className="h-20 w-20 bg-background/10 rounded-[2rem] flex items-center justify-center mb-6 border border-background/20 animate-pulse mx-auto">
              <Lock className="h-10 w-10 text-background" />
            </div>
            <DialogTitle className="text-3xl font-black text-background mb-4 uppercase tracking-tighter leading-none">LAYAR TERKUNCI</DialogTitle>
            <DialogDescription className="text-destructive-foreground/80 max-w-md mb-8 font-medium leading-relaxed text-base">
              Sistem mendeteksi Anda mencoba membuka tab baru, berpindah jendela, atau keluar mode layar penuh. <br/>
              <span className="text-background font-bold underline decoration-2 underline-offset-4">Pelanggaran telah dicatatkan.</span>
            </DialogDescription>
            <Button
              onClick={handleEnterFullscreen}
              className="w-full py-7 h-auto bg-background text-destructive rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-black/20 hover:bg-background/90 transition-all flex items-center justify-center gap-3"
            >
              <RefreshCw className="h-4 w-4" /> Masuk Layar Penuh Lagi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exam Header */}
      <header className="h-20 bg-background border-b px-6 md:px-8 flex items-center justify-between shadow-sm z-30">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="h-11 w-11 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-all border-border/50"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden sm:block">
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="font-bold text-foreground text-lg leading-tight tracking-tight">{exam?.title}</h1>
              <Badge variant="outline" className="flex items-center gap-1 bg-emerald-50 text-emerald-600 border-emerald-100 px-1.5 py-0">
                <Shield className="h-2.5 w-2.5" />
                <span className="text-[7px] font-black uppercase tracking-tighter">Secure</span>
              </Badge>
            </div>
            <p className="text-[9px] uppercase font-black text-primary tracking-widest">{exam?.subjects?.name || 'Mata Pelajaran'}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <div className={cn(
            "flex items-center gap-3 px-5 py-2.5 rounded-2xl border-2 transition-all",
            timeLeft < 300
              ? 'bg-destructive/5 border-destructive/20 text-destructive animate-pulse shadow-lg shadow-destructive/10'
              : 'bg-muted/50 border-border/50 text-foreground'
          )}>
            <Timer className={cn("h-5 w-5", timeLeft < 300 ? 'text-destructive' : 'text-muted-foreground')} />
            <span className="font-mono font-black text-xl tabular-nums tracking-tighter">{formatTime(timeLeft)}</span>
          </div>
          <Separator orientation="vertical" className="h-10 hidden sm:block" />
          <Button
            variant="ghost"
            onClick={handleExit}
            className="hidden sm:flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-destructive transition-colors rounded-xl px-4"
          >
            <AlertCircle className="h-4 w-4" /> Keluar
          </Button>
          <Button
            onClick={handleShowSubmit}
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 h-12 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-200/50 disabled:opacity-50"
          >
            {submitting ? 'Mengirim...' : 'Selesai'}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        {/* Question Area */}
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
                  q && flaggedQuestions.has(q.id)
                    ? 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200'
                    : 'bg-amber-50/50 text-amber-600 border-amber-100 hover:bg-amber-50 hover:border-amber-200'
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
                      <img
                        src={q.image_url}
                        alt="Question Illustration"
                        className="max-h-80 md:max-h-96 object-contain rounded-2xl"
                      />
                   </CardContent>
                </Card>
              )}

              <Card className="rounded-[2.5rem] border-border/30 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardContent className="p-8 md:p-12 text-xl md:text-2xl font-bold text-foreground leading-relaxed">
                  {q?.content}
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
                      isSelected
                        ? 'bg-primary/5 border-primary shadow-xl shadow-primary/5'
                        : 'bg-background border-border/40 hover:border-primary/30 hover:bg-primary/[0.02]'
                    )}
                  >
                    <div className={cn(
                      "h-12 w-12 rounded-2xl flex items-center justify-center font-black text-xl ring-1 transition-all shrink-0",
                      isSelected
                        ? 'bg-primary text-primary-foreground ring-primary shadow-lg shadow-primary/20'
                        : 'bg-muted text-muted-foreground ring-border/50 group-hover:bg-primary/10 group-hover:text-primary'
                    )}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className={cn(
                      "font-bold text-lg leading-tight flex-1 whitespace-normal",
                      isSelected ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                    )}>
                      {opt.content}
                    </span>
                    {isSelected && (
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        {savingAnswer === q.id ? (
                           <div className="flex items-center gap-1.5 bg-primary/10 py-1 px-3 rounded-full animate-in fade-in">
                             <Loader2 className="h-2.5 w-2.5 text-primary animate-spin" />
                             <span className="text-[7px] font-black text-primary uppercase tracking-tighter">Saving</span>
                           </div>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-emerald-100 py-1 px-3 rounded-full animate-in zoom-in-95 duration-300">
                            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                            <span className="text-[7px] font-black text-emerald-600 uppercase tracking-tighter">Tersimpan</span>
                          </div>
                        )}
                      </div>
                    )}
                  </Button>
                )
              })}
            </div>
          </div>
        </main>

        {/* Question Navigator Drawer */}
        <aside className={cn(
          "fixed inset-y-0 right-0 w-80 bg-background border-l border-border/50 shadow-[0_0_50px_rgba(0,0,0,0.05)] transition-transform duration-500 z-40 transform flex flex-col p-8",
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0 lg:static'
        )}>
          <div className="flex items-center justify-between mb-10">
            <h2 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground/60">Navigasi Soal</h2>
            <Button
                variant="ghost"
                size="icon"
                className="lg:hidden rounded-xl"
                onClick={() => setSidebarOpen(false)}
            >
                <X className="h-5 w-5 text-muted-foreground"/>
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
            <div className="grid grid-cols-5 gap-2.5">
              {questions.map((item, i) => {
                const isAnswered = answers[item.id] !== undefined
                const isCurrent = currentQuestionIdx === i
                const isFlagged = flaggedQuestions.has(item.id)
                return (
                  <Button
                    key={item.id}
                    variant="outline"
                    onClick={() => {
                      setCurrentQuestionIdx(i)
                      setSidebarOpen(false)
                    }}
                    className={cn(
                      "aspect-square p-0 h-auto rounded-xl flex items-center justify-center font-black text-xs transition-all border-2 relative",
                      isCurrent
                        ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105 z-10' :
                      isFlagged
                        ? 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200' :
                      isAnswered
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50 hover:bg-emerald-100' :
                        'bg-muted/30 text-muted-foreground/50 border-border/30 hover:border-primary/30 hover:text-primary'
                    )}
                  >
                    {i + 1}
                    {isFlagged && !isCurrent && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 bg-amber-500 rounded-full border-2 border-background" />
                    )}
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

      {/* Footer Navigation */}
      <footer className="h-24 bg-background/90 backdrop-blur-md border-t border-border/50 px-6 md:px-12 flex items-center justify-between z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.01)]">
        <Button
          variant="ghost"
          disabled={currentQuestionIdx === 0}
          onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
          className="flex items-center gap-3 font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-primary disabled:opacity-20 transition-all py-6 h-auto px-6 rounded-2xl"
        >
          <ChevronLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          Sebelumnya
        </Button>

        <div className="hidden sm:flex gap-1.5 items-center">
            {[...Array(Math.min(totalQuestions, 5))].map((_, i) => (
              <div
                key={i}
                className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === currentQuestionIdx % 5 ? 'bg-primary w-8' : 'bg-border/60 w-1.5'
                )}
              />
            ))}
        </div>

        <Button
          variant="ghost"
          disabled={currentQuestionIdx === totalQuestions - 1}
          onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
          className="flex items-center gap-3 font-black text-[10px] uppercase tracking-[0.2em] text-primary hover:text-primary hover:bg-primary/5 disabled:opacity-20 transition-all py-6 h-auto px-6 rounded-2xl"
        >
          Selanjutnya
          <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </Button>
      </footer>

      {/* Confirmation Dialogs */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Yakin ingin keluar?</AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium">
              Hasil pekerjaan Anda sudah tersimpan otomatis. Ujian tidak bisa dilanjutkan jika sudah klik Log Out di menu utama.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-none bg-muted font-bold">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit} className="rounded-xl bg-destructive font-bold text-white hover:bg-destructive/90">
              Ya, Keluar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Akhiri Ujian?</AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium">
              Pastikan Anda telah menjawab semua pertanyaan dengan benar. Setelah dikirim, Anda tidak dapat mengubah jawaban lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={handleCancelSubmit} className="rounded-xl border-none bg-muted font-bold">Periksa Lagi</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} className="rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700">
              Ya, Kirim Sekarang
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
