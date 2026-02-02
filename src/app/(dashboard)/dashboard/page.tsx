'use client'

import { useState } from 'react'
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
import { toast } from 'sonner'

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

import { useDashboardStats } from '@/hooks/use-dashboard-stats'

export default function DashboardPage() {
  const supabase = createClient()
  const { data, isLoading: loading, mutate } = useDashboardStats()
  const [collapsedClassrooms, setCollapsedClassrooms] = useState<Record<string, boolean>>({})
  const [resetStudent, setResetStudent] = useState<{ id: string, name: string } | null>(null)

  const stats = data ? [
    { name: 'Total Siswa', value: data.counts.students.toString(), icon: Users, color: 'bg-blue-500' },
    { name: 'Total Kelas', value: data.counts.classrooms.toString(), icon: Database, color: 'bg-purple-500' },
    { name: 'Ujian Aktif', value: data.counts.exams.toString(), icon: ClipboardCheck, color: 'bg-emerald-500' },
    { name: 'Total Selesai', value: data.counts.submissions.toString(), icon: TrendingUp, color: 'bg-orange-500' },
  ] : []

  const classroomGroups = data?.classroomGroups || []
  const recentExams = data?.recentSubmissions || []

  const toggleClassroom = (id: string) => {
    setCollapsedClassrooms(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleResetSubmission = async (studentName: string, studentId: string) => {
    setResetStudent({ id: studentId, name: studentName })
  }

  const confirmResetSubmission = async () => {
    if (!resetStudent) return

    const { error } = await supabase.from('submissions').delete().eq('student_id', resetStudent.id)
    if (error) {
      toast.error('Gagal mereset: ' + error.message)
    } else {
      toast.success(`Berhasil mereset ujian ${resetStudent.name}`)
      mutate() // Refresh data via SWR
    }
    setResetStudent(null)
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
          <h1 className="text-3xl font-bold text-primary-heading tracking-tight">Monitoring Real-time</h1>
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
                      <h3 className="font-bold text-primary-heading text-lg uppercase tracking-tight">{group.name}</h3>
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

          <CardContent className="space-y-6">

            <Button variant="outline" className="w-full" asChild>
              <Link href="/exams">
                Kelola Semua Ujian <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!resetStudent} onOpenChange={(open) => !open && setResetStudent(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Ujian Siswa?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin RESET ujian siswa <span className="font-bold text-primary-heading">&quot;{resetStudent?.name}&quot;</span>?
              Semua jawaban yang telah dikerjakan akan dihapus dan siswa akan bisa mengerjakan ulang dari awal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-none bg-secondary">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmResetSubmission}
              className="rounded-xl bg-orange-600 text-white hover:bg-orange-700"
            >
              Ya, Reset Ujian
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
