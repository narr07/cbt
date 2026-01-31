'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  GraduationCap,
  BookOpen,
  Clock,
  Play,
  LogOut,
  User as UserIcon,
  Bell,
  CheckCircle,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function StudentDashboard() {
  const [user, setUser] = useState<any>(null)
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const fetchStudentData = async () => {
      // 1. Get Session from Cookie effectively by querying profiles
      const sessionId = document.cookie
        .split('; ')
        .find(row => row.startsWith('cbt_session='))
        ?.split('=')[1]

      if (!sessionId) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*, classrooms(name)')
        .eq('id', sessionId)
        .single()

      if (!profile || profile.role !== 'student') {
        router.push('/login')
        return
      }
      setUser(profile)

      // 2. Fetch Exams for the student's classroom
      const { data: examData } = await supabase
        .from('exams')
        .select('*, subjects(name)')
        .eq('classroom_id', profile.classroom_id)
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      setExams(examData || [])
      console.log('STUDENT DEBUG:', {
        student_id: profile.id,
        classroom_id: profile.classroom_id,
        exams_found: examData?.length || 0
      })

      // 3. Update Online Status (Heartbeat)
      const updateOnlineStatus = async () => {
        await supabase
          .from('profiles')
          .update({ last_online_at: new Date().toISOString() })
          .eq('id', sessionId)
      }

      updateOnlineStatus()
      const interval = setInterval(updateOnlineStatus, 30000) // Every 30s

      setLoading(false)
      return () => clearInterval(interval)
    }

    fetchStudentData()
  }, [supabase, router])

  const handleLogout = () => {
    document.cookie = 'cbt_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Student Header */}
      <header className="h-20 bg-white border-b border-slate-200 px-6 md:px-12 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Portal Ujian</h1>
            <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">{user?.classrooms?.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-bold text-slate-800">{user?.full_name}</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Siswa</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all group"
          >
            <LogOut className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 space-y-10">
        <div className="bg-indigo-600 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Halo, {user?.full_name.split(' ')[0]}! 👋</h2>
            <p className="text-indigo-100 max-w-md leading-relaxed font-medium">
              Selamat datang di sistem CBT OSN SD. Silakan pilih ujian yang tersedia di bawah ini untuk memulai.
            </p>
          </div>
          <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[150%] bg-white/10 rounded-full blur-3xl transform rotate-12" />
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-500" />
              Ujian Tersedia
            </h3>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{exams.length} Total</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-slate-100 border-dashed">
                <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Bell className="h-8 w-8 text-slate-300" />
                </div>
                <p className="text-slate-400 font-bold italic tracking-wide">Belum ada ujian aktif untuk kelasmu.</p>
              </div>
            ) : (
              exams.map((exam) => (
                <div key={exam.id} className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-lg">
                        {exam.subjects?.name}
                      </span>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-bold">{exam.duration} Menit</span>
                      </div>
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 mb-6 group-hover:text-indigo-600 transition-colors leading-snug">
                      {exam.title}
                    </h4>
                  </div>

                  <Link
                    href={`/student/exams/${exam.id}`}
                    className="w-full py-4 gradient-primary text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 hover:opacity-90 transition-all transform active:scale-95"
                  >
                    Mulai Ujian
                    <Play className="h-4 w-4 fill-white" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <footer className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
        &copy; 2026 Platform CBT OSN SD - Dinas Pendidikan
      </footer>
    </div>
  )
}
