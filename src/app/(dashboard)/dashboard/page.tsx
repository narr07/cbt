'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Users,
  ClipboardCheck,
  TrendingUp,
  Clock,
  ArrowRight,
  Loader2,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Database,
  RotateCcw
} from 'lucide-react'
import Link from 'next/link'

// Shadcn UI Components
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface StatItem {
  id: string
  full_name: string
  status: 'online' | 'in_progress' | 'submitted' | 'offline'
  exam_title?: string
  answer_count: number
  total_questions: number
  violations: number
  last_online_at: string | null
  submission_id?: string // For reset functionality
}

interface ClassroomGroup {
  id: string
  name: string
  students: StatItem[]
}

export default function DashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState<any[]>([])
  const [classroomGroups, setClassroomGroups] = useState<ClassroomGroup[]>([])
  const [recentExams, setRecentExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsedClassrooms, setCollapsedClassrooms] = useState<Record<string, boolean>>({})

  const fetchDashboardData = useCallback(async () => {
    try {
      // 1. Fetch Stats
      const [examRes, studentRes, submissionRes, classroomRes] = await Promise.all([
        supabase.from('exams').select('id', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
        supabase.from('classrooms').select('id', { count: 'exact', head: true })
      ])

      setStats([
        { name: 'Total Siswa', value: (studentRes.count || 0).toString(), icon: Users, color: 'bg-blue-500' },
        { name: 'Total Kelas', value: (classroomRes.count || 0).toString(), icon: Database, color: 'bg-purple-500' },
        { name: 'Ujian Aktif', value: (examRes.count || 0).toString(), icon: ClipboardCheck, color: 'bg-emerald-500' },
        { name: 'Total Selesai', value: (submissionRes.count || 0).toString(), icon: TrendingUp, color: 'bg-orange-500' },
      ])

      // 2. Fetch Classrooms and Students
      const { data: classrooms } = await supabase.from('classrooms').select('id, name').order('name')

      if (classrooms) {
        const groups = await Promise.all(classrooms.map(async (cls) => {
          const { data: profiles } = await supabase
            .from('profiles')
            .select(`
              id, full_name, last_online_at,
              submissions(id, status, exam_id, exams(title), violations)
            `)
            .eq('classroom_id', cls.id)
            .eq('role', 'student')
            .order('full_name')

          const students: StatItem[] = await Promise.all((profiles || []).map(async (profile: any) => {
            const activeSub = profile.submissions?.find((s: any) =>
               s.status === 'in_progress' || s.status === 'logged_in'
            )

            let ansCount = 0
            let qCount = 0

            if (activeSub) {
              const [ansRes, qRes] = await Promise.all([
                supabase.from('answers').select('id', { count: 'exact', head: true }).eq('submission_id', activeSub.id),
                supabase.from('questions').select('id', { count: 'exact', head: true }).eq('exam_id', activeSub.exam_id)
              ])
              ansCount = ansRes.count || 0
              qCount = qRes.count || 0
            }

            const isOnline = profile.last_online_at && (new Date().getTime() - new Date(profile.last_online_at).getTime() < 5 * 60000)

            let status: StatItem['status'] = 'offline'
            if (activeSub?.status === 'in_progress') status = 'in_progress'
            else if (isOnline) status = 'online'

            return {
              id: profile.id,
              full_name: profile.full_name,
              status,
              exam_title: activeSub?.exams?.title,
              answer_count: ansCount,
              total_questions: qCount,
              violations: activeSub?.violations || 0,
              last_online_at: profile.last_online_at,
              submission_id: activeSub?.id
            }
          }))

          return { id: cls.id, name: cls.name, students }
        }))
        setClassroomGroups(groups)
      }

      // 3. Fetch Recent Submissions
      const { data: recent } = await supabase
        .from('submissions')
        .select(`
          id, updated_at,
          profiles(full_name),
          exams(title)
        `)
        .eq('status', 'submitted')
        .order('updated_at', { ascending: false })
        .limit(6)

      setRecentExams(recent || [])

    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 5000)
    return () => clearInterval(interval)
  }, [fetchDashboardData])

  const toggleClassroom = (id: string) => {
    setCollapsedClassrooms(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleResetSubmission = async (studentName: string, studentId: string) => {
    if (!confirm(`Yakin ingin RESET ujian siswa "${studentName}"? Semua jawaban akan dihapus.`)) return

    // Delete all submissions for this student
    const { error } = await supabase.from('submissions').delete().eq('student_id', studentId)
    if (error) {
      alert('Gagal mereset: ' + error.message)
    } else {
      alert('Berhasil! Siswa sekarang bisa mengerjakan ulang.')
      fetchDashboardData() // Refresh data
    }
  }

  if (loading && classroomGroups.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Monitoring Real-time</h1>
          <p className="text-muted-foreground mt-1 text-sm text-balance">Pantau aktivitas siswa per kelas secara langsung.</p>
        </div>
        <Badge variant="secondary" className="gap-2 animate-pulse w-fit text-emerald-600 bg-emerald-50 border-emerald-100">
           <Activity className="h-4 w-4" />
           <span className="text-xs font-bold uppercase tracking-widest">Live Monitoring</span>
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="relative overflow-hidden hover:shadow-md transition-shadow">
            <div className={`absolute top-0 right-0 p-3 ${stat.color} opacity-10 rounded-bl-3xl`}>
              <stat.icon className="h-8 w-8" />
            </div>
            <CardContent className="pt-6">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{stat.name}</span>
                <span className="mt-2 text-4xl font-bold tabular-nums">{stat.value}</span>
                <div className="mt-4 flex items-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Status Terkini
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Classroom Groups */}
      <div className="grid grid-cols-1 gap-8">
        <div className="space-y-6">
          {classroomGroups.map((group) => {
            const isCollapsed = collapsedClassrooms[group.id] || false
            const onlineCount = group.students.filter(s => s.status !== 'offline').length

            return (
              <Card key={group.id} className="overflow-hidden transition-all">
                <button
                  onClick={() => toggleClassroom(group.id)}
                  className="w-full px-6 py-4 flex items-center justify-between border-b hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                      <Database className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-foreground text-lg uppercase tracking-tight">{group.name}</h3>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
                        {onlineCount} Siswa Aktif / {group.students.length} Siswa Terdaftar
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex -space-x-2">
                      {group.students.filter(s => s.status !== 'offline').slice(0, 5).map(s => (
                        <div key={s.id} className="h-8 w-8 rounded-full bg-primary border-2 border-background flex items-center justify-center text-[10px] font-bold text-primary-foreground uppercase shadow-sm">
                          {s.full_name.charAt(0)}
                        </div>
                      ))}
                    </div>
                    {isCollapsed ? <ChevronRight className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-primary" />}
                  </div>
                </button>

                {!isCollapsed && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-6 w-12">No</TableHead>
                        <TableHead className="px-6">Siswa</TableHead>
                        <TableHead className="px-6 text-center">Online</TableHead>
                        <TableHead className="px-6 text-center">Progres</TableHead>
                        <TableHead className="px-6">Ujian</TableHead>
                        <TableHead className="px-6 text-center">Status</TableHead>
                        <TableHead className="px-6 text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.students.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="px-6 py-10 text-center text-muted-foreground italic">Belum ada siswa terdaftar di kelas ini.</TableCell>
                        </TableRow>
                      ) : (
                        group.students.map((student, idx) => (
                          <TableRow key={student.id}>
                            <TableCell className="px-6 text-muted-foreground font-medium">{idx + 1}</TableCell>
                            <TableCell className="px-6">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold uppercase tracking-tight">{student.full_name}</span>
                                {student.violations > 0 && (
                                  <span className="flex items-center gap-1 text-[8px] font-bold text-destructive uppercase mt-0.5 animate-pulse">
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                    {student.violations} Pelanggaran
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="px-6 text-center">
                              {student.status !== 'offline' ? (
                                <div className="inline-flex h-6 w-6 bg-emerald-50 text-emerald-600 rounded-full items-center justify-center border border-emerald-100">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="px-6">
                              {student.status === 'in_progress' ? (
                                <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
                                  <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
                                    {student.answer_count} / {student.total_questions}
                                  </span>
                                  <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                     <div
                                        className="h-full bg-emerald-500 transition-all duration-1000"
                                        style={{ width: `${(student.answer_count / (student.total_questions || 1)) * 100}%` }}
                                     />
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center text-muted-foreground text-[10px] font-bold">--/--</div>
                              )}
                            </TableCell>
                            <TableCell className="px-6">
                              <span className="text-xs font-medium text-muted-foreground truncate block max-w-[150px]">
                                {student.exam_title || '-'}
                              </span>
                            </TableCell>
                            <TableCell className="px-6 text-center">
                              <div className="flex items-center justify-center">
                                {student.status === 'in_progress' ? (
                                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-emerald-100 animate-pulse gap-1.5">
                                    <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping" />
                                    Mengerjakan
                                  </Badge>
                                ) : student.status === 'online' ? (
                                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                                    Standby
                                  </Badge>
                                ) : (
                                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Offline</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="px-6 text-center">
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => handleResetSubmission(student.full_name, student.id)}
                                title="Reset agar siswa bisa mengerjakan ulang"
                                className="text-amber-600 border-amber-200 hover:bg-amber-50"
                              >
                                <RotateCcw className="h-3 w-3" /> Reset
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </Card>
            )
          })}
        </div>

        {/* Recently Finished Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Aktivitas Selesai Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentExams.length === 0 ? (
                 <div className="text-center text-muted-foreground py-12 italic col-span-full border border-dashed rounded-xl">
                   Belum ada aktivitas selesai baru-baru ini.
                 </div>
              ) : (
                recentExams.map((sub: any) => (
                  <div key={sub.id} className="flex gap-4 p-4 rounded-xl bg-muted/50 border items-center hover:bg-muted transition-colors">
                    <div className="h-10 w-10 shrink-0 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold truncate uppercase tracking-tight">{sub.profiles?.full_name}</h4>
                      <p className="text-[10px] text-muted-foreground truncate">{sub.exams?.title}</p>
                      <div className="flex items-center gap-1.5 mt-1 text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                         <Clock className="h-3 w-3" />
                         {new Date(sub.updated_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/exams">
                Kelola Semua Ujian <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
