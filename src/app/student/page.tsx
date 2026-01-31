'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  GraduationCap,
  BookOpen,
  Clock,
  Play,
  LogOut,
  Bell,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Shadcn UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Student Header */}
      <header className="h-20 bg-background border-b px-6 md:px-12 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-foreground leading-tight tracking-tight">Portal Ujian</h1>
            <p className="text-[10px] text-primary font-black uppercase tracking-widest">{user?.classrooms?.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-bold text-foreground">{user?.full_name}</span>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Siswa</span>
          </div>

          <Separator orientation="vertical" className="h-8 hidden md:block" />

          <div className="flex items-center gap-2">
            <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
              <AvatarImage src="" alt={user?.full_name} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                {user?.full_name?.split(' ').map((n: any) => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all group"
            >
              <LogOut className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 space-y-10">
        {/* Hero Card */}
        <Card className="bg-primary border-none shadow-2xl shadow-primary/20 overflow-hidden rounded-[2.5rem]">
          <CardContent className="p-8 md:p-12 text-primary-foreground relative">
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Halo, {user?.full_name.split(' ')[0]}! 👋</h2>
              <p className="text-primary-foreground/80 max-w-md leading-relaxed font-medium">
                Selamat datang di sistem CBT OSN SD. Silakan pilih ujian yang tersedia di bawah ini untuk memulai.
              </p>
            </div>
            {/* Decorative background element */}
            <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[150%] bg-background/10 rounded-full blur-3xl transform rotate-12" />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2 tracking-tight">
              <BookOpen className="h-5 w-5 text-primary" />
              Ujian Tersedia
            </h3>
            <Badge variant="outline" className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-3 py-1 bg-background">
              {exams.length} Total
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.length === 0 ? (
              <Card className="col-span-full py-20 bg-background border-dashed rounded-[2rem]">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <div className="h-16 w-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
                    <Bell className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                  <p className="text-muted-foreground font-bold italic tracking-wide">Belum ada ujian aktif untuk kelasmu.</p>
                </CardContent>
              </Card>
            ) : (
              exams.map((exam) => (
                <Card key={exam.id} className="rounded-[2rem] border-border/50 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group flex flex-col justify-between overflow-hidden">
                  <CardHeader className="p-8 pb-3">
                    <div className="flex items-center justify-between mb-6">
                      <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-primary/20 px-3 py-1 transition-colors">
                        {exam.subjects?.name}
                      </Badge>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-bold">{exam.duration} Menit</span>
                      </div>
                    </div>
                    <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors leading-snug tracking-tight">
                      {exam.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 pt-6">
                    <Button
                      asChild
                      className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 gap-2 hover:opacity-90 transition-all transform active:scale-95 border-none"
                    >
                      <Link href={`/student/exams/${exam.id}`}>
                        Mulai Ujian
                        <Play className="h-4 w-4 fill-current" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>

      <footer className="p-8 text-center text-muted-foreground text-[10px] font-bold uppercase tracking-widest bg-muted/20 border-t border-border/50">
        &copy; 2026 Platform CBT OSN SD - Dinas Pendidikan
      </footer>
    </div>
  )
}
