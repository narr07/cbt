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
  AlertTriangle,
  RefreshCw
} from 'lucide-react'
import { useRouter } from 'next/navigation'

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
      alert('Ujian tidak ditemukan!')
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
        alert('Kamu sudah mengerjakan ujian ini!')
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
        alert('Gagal memulai ujian: ' + insertError.message)
        router.push('/student')
        return
      }

      console.log('Created submission:', newSub)
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
    await supabase.rpc('increment_violation', { sub_id: submission.id })
    // If RPC not available, fallback to manual update
    const { data: currentSub } = await supabase.from('submissions').select('violations').eq('id', submission.id).single()
    await supabase.from('submissions').update({ violations: (currentSub?.violations || 0) + 1 }).eq('id', submission.id)
  }, [submission, supabase])

  useEffect(() => {
    if (loading) return

    // 1. Fullscreen Monitoring
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
      // Don't show warning if already submitted
      if (!document.fullscreenElement && !isSubmitted) {
        setShowSecurityWarning(true)
      }
    }

    // 2. Focus Monitoring (Blur detection)
    const onBlur = () => {
      if (!loading && !submitting && !isSubmitted) {
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
      if (!loading && !submitting) {
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
  }, [loading, submitting, incrementViolation, isSubmitted])

  useEffect(() => {
    if (loading || timeLeft <= 0) return
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
  }, [loading, timeLeft, supabase])

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
    } catch (err) {
      alert('Gagal masuk mode fullscreen. Mohon izinkan browser untuk masuk mode layar penuh.')
    }
  }

  const handleExit = () => {
    if (confirm('Apakah Anda yakin ingin keluar? Pastikan semua jawaban sudah terisi. Hasil pekerjaan Anda sudah tersimpan otomatis. Ujian tidak bisa dilanjutkan jika sudah klik Log Out di menu utama.')) {
      router.push('/student')
    }
  }

  const handleSubmit = async () => {
    if (submitting || !submission) return

    // Exit fullscreen FIRST to allow dialogs to work properly
    setIsSubmitted(true) // Mark as submitted to bypass security warnings

    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen()
      } catch (e) {
        // Ignore errors
      }
    }

    // Small delay to ensure fullscreen exit is complete
    await new Promise(resolve => setTimeout(resolve, 100))

    if (!confirm('Apakah kamu yakin ingin mengakhiri ujian ini?')) {
      setIsSubmitted(false)
      return
    }

    setSubmitting(true)

    try {
      // Update Submission Status
      const { error } = await supabase
        .from('submissions')
        .update({ status: 'submitted' })
        .eq('id', submission.id)

      if (error) throw error

      alert('🎉 Ujian berhasil dikirim! Terima kasih telah mengerjakan.')

      // Use window.location for reliable redirect
      window.location.href = '/student'
    } catch (err: any) {
      setIsSubmitted(false)
      alert('Gagal mengirim jawaban: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-[100]">
      <div className="h-16 w-16 gradient-primary rounded-2xl flex items-center justify-center animate-bounce mb-4">
        <GraduationCap className="h-10 w-10 text-white" />
      </div>
      <p className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-400 animate-pulse">Menyiapkan Lembar Ujian...</p>
    </div>
  )

  const q = questions[currentQuestionIdx]

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col z-[50] overflow-hidden">
      {/* Start Exam Overlay */}
      {!hasStarted && (
        <div className="fixed inset-0 bg-white z-[300] flex flex-col items-center justify-center p-8 text-center">
          <div className="h-24 w-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center mb-10 border border-indigo-100 shadow-xl shadow-indigo-100/20">
            <GraduationCap className="h-10 w-10 text-indigo-500" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter uppercase">Lembar Ujian Siap</h1>
          <p className="text-slate-500 max-w-lg mb-12 text-lg font-medium leading-relaxed">
            Selamat datang di Portal Ujian. <br/>
            Sila klik tombol di bawah untuk masuk ke mode <strong>Layar Penuh</strong> dan memulai pengerjaan soal.
          </p>
          <button
            onClick={handleEnterFullscreen}
            className="w-full max-w-xs py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all transform active:scale-95 flex items-center justify-center gap-3"
          >
            Mulai Ujian Sekarang
          </button>
          <p className="mt-8 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Shield className="h-3 w-3" /> Secure Browser Mode Enabled
          </p>
        </div>
      )}

      {/* Security Warning Overlay */}
      {hasStarted && showSecurityWarning && !isFullscreen && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[200] flex flex-col items-center justify-center p-6 text-center">
          <div className="h-24 w-24 bg-red-500/10 rounded-[2.5rem] flex items-center justify-center mb-8 border border-red-500/20 animate-pulse">
            <Lock className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter text-shadow-lg">LAYAR TERKUNCI</h2>
          <p className="text-slate-400 max-w-md mb-10 font-medium leading-relaxed text-lg">
            Sistem mendeteksi Anda mencoba membuka tab baru, berpindah jendela, atau keluar mode layar penuh. <br/>
            <span className="text-red-400 font-bold">Ujian dijeda sementara demi keamanan.</span>
          </p>
          <div className="flex flex-col gap-4 w-full max-w-sm">
            <button
              onClick={() => {
                handleEnterFullscreen()
                setShowSecurityWarning(false)
              }}
              className="w-full py-4 bg-red-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-red-900/20 hover:bg-red-500 transition-all flex items-center justify-center gap-3"
            >
              <RefreshCw className="h-4 w-4" /> Masuk Layar Penuh Lagi
            </button>
            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 py-2 rounded-lg inline-block px-4">
              Pelanggaran telah dicatatkan ke sistem monitoring guru
            </p>
          </div>
        </div>
      )}

      {/* Exam Header */}
      <header className="h-20 bg-white border-b border-slate-200 px-6 md:px-8 flex items-center justify-between shadow-sm z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="h-11 w-11 bg-slate-100 ring-1 ring-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-all"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden sm:block">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-bold text-slate-800 text-lg leading-none">{exam?.title}</h1>
              <div className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-100">
                <Shield className="h-2.5 w-2.5" />
                <span className="text-[8px] font-black uppercase tracking-tighter">Secure Mode</span>
              </div>
            </div>
            <p className="text-[10px] uppercase font-black text-indigo-500 tracking-widest">Sains & Matematika</p>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <div className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border-2 transition-all ${
            timeLeft < 300
            ? 'bg-red-50 border-red-200 text-red-600 animate-pulse shadow-lg shadow-red-100'
            : 'bg-slate-50 border-slate-100 text-slate-700'
          }`}>
            <Timer className={`h-5 w-5 ${timeLeft < 300 ? 'text-red-500' : 'text-slate-400'}`} />
            <span className="font-mono font-black text-xl tabular-nums">{formatTime(timeLeft)}</span>
          </div>
          <div className="h-10 w-px bg-slate-200 hidden sm:block" />
          <button
            onClick={handleExit}
            className="hidden sm:flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors"
          >
            <AlertCircle className="h-4 w-4" /> Keluar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-emerald-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-600 transition-all transform active:scale-95 disabled:opacity-50"
          >
            {submitting ? 'Mengirim...' : 'Selesai'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        {/* Question Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-20 pb-40">
          <div className="max-w-4xl mx-auto space-y-12 animate-slide-up">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Pertanyaan No. {currentQuestionIdx + 1}</span>
              <button
                onClick={() => q && toggleFlag(q.id)}
                className={`flex items-center gap-2 text-[10px] font-bold px-4 py-2 rounded-xl border transition-all ${
                  q && flaggedQuestions.has(q.id)
                    ? 'text-amber-700 bg-amber-200 border-amber-300'
                    : 'text-amber-500 bg-amber-50 border-amber-100/50 hover:bg-amber-100'
                }`}
              >
                <Flag className="h-3.5 w-3.5" />
                {q && flaggedQuestions.has(q.id) ? 'Ditandai Ragu' : 'Tandai Ragu'}
              </button>
            </div>

            <div className="space-y-6">
              {q?.image_url && (
                <div className="flex justify-center bg-white p-4 rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                  <img
                    src={q.image_url}
                    alt="Question Illustration"
                    className="max-h-80 md:max-h-96 object-contain rounded-2xl"
                  />
                </div>
              )}

              <div className="text-xl md:text-2xl font-bold text-slate-800 leading-relaxed bg-white p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-slate-100">
                {q?.content}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {q?.options.map((opt, idx) => {
                const isSelected = answers[q.id] === opt.id
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleAnswer(q.id, opt.id)}
                    className={`p-6 rounded-3xl text-left border-2 transition-all flex items-center gap-5 group relative overflow-hidden ${
                      isSelected
                        ? 'bg-indigo-50/50 border-indigo-500 shadow-xl shadow-indigo-100/50'
                        : 'bg-white border-slate-100 hover:border-indigo-200'
                    }`}
                  >
                    <div className={`h-11 w-11 rounded-2xl flex items-center justify-center font-black text-lg ring-1 transition-all shrink-0 ${
                      isSelected ? 'bg-indigo-600 text-white ring-indigo-600 shadow-lg shadow-indigo-200' : 'bg-slate-50 text-slate-300 ring-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-400'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className={`font-bold text-lg leading-tight ${isSelected ? 'text-indigo-900' : 'text-slate-600 dark:group-hover:text-indigo-700'}`}>
                      {opt.content}
                    </span>
                    {isSelected && (
                      <div className="absolute top-2 right-2 flex items-center gap-2">
                        {savingAnswer === q.id ? (
                           <div className="flex items-center gap-1.5 bg-indigo-100 py-1 px-3 rounded-full">
                             <Loader2 className="h-2.5 w-2.5 text-indigo-500 animate-spin" />
                             <span className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter">Saving...</span>
                           </div>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-emerald-100 py-1 px-3 rounded-full">
                            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">Saved</span>
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </main>

        {/* Question Navigator Drawer */}
        <div className={`fixed inset-y-0 right-0 w-80 bg-white border-l border-slate-200 shadow-[0_0_50px_rgba(0,0,0,0.1)] transition-transform duration-500 z-40 transform ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0 lg:static'
        }`}>
          <div className="h-full flex flex-col p-8 bg-white">
            <div className="flex items-center justify-between mb-10">
              <h2 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Navigasi Soal</h2>
              <button className="lg:hidden p-2 bg-slate-50 rounded-xl" onClick={() => setSidebarOpen(false)}><X className="h-5 w-5"/></button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-5 gap-3">
                {questions.map((item, i) => {
                  const isAnswered = answers[item.id] !== undefined
                  const isCurrent = currentQuestionIdx === i
                  const isFlagged = flaggedQuestions.has(item.id)
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentQuestionIdx(i)
                        setSidebarOpen(false)
                      }}
                      className={`aspect-square rounded-2xl flex items-center justify-center font-black text-xs transition-all border-2 relative ${
                        isCurrent ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-200 scale-110 z-10' :
                        isFlagged ? 'bg-amber-100 text-amber-600 border-amber-300' :
                        isAnswered ? 'bg-emerald-50 text-emerald-500 border-emerald-100/50' :
                        'bg-slate-50 text-slate-300 border-slate-100 hover:border-indigo-200 hover:text-indigo-400'
                      }`}
                    >
                      {i + 1}
                      {isFlagged && !isCurrent && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 bg-amber-500 rounded-full border border-white" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-slate-100 space-y-5">
              <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>Terjawab</span>
                <span className="text-indigo-600">{Object.keys(answers).length} / {questions.length}</span>
              </div>
              <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden p-0.5 border border-slate-100">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                  style={{ width: `${(Object.keys(answers).length / (questions.length || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <footer className="h-24 bg-white/80 backdrop-blur-md border-t border-slate-200 px-6 md:px-12 flex items-center justify-between z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
        <button
          disabled={currentQuestionIdx === 0}
          onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
          className="flex items-center gap-3 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 hover:text-indigo-600 disabled:opacity-20 transition-all group py-4 px-6 rounded-2xl hover:bg-slate-50"
        >
          <ChevronLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          Sebelumnya
        </button>

        <div className="hidden sm:flex gap-2">
            {[...Array(Math.min(questions.length, 5))].map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentQuestionIdx % 5 ? 'bg-indigo-500 w-8' : 'bg-slate-200 w-1.5'}`} />
            ))}
        </div>

        <button
          disabled={currentQuestionIdx === questions.length - 1}
          onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
          className="flex items-center gap-3 font-black text-[10px] uppercase tracking-[0.2em] text-indigo-600 hover:text-indigo-800 disabled:opacity-20 transition-all group py-4 px-6 rounded-2xl hover:bg-slate-50"
        >
          Selanjutnya
          <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </footer>
    </div>
  )
}
