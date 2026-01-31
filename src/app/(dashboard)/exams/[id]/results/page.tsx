'use client'

import { useState, useEffect, use } from 'react'
import {
  ArrowLeft,
  Search,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  UserCheck,
  RotateCcw,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
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

// Shadcn UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { useExamResults } from '@/hooks/use-exam-results'

export default function ExamResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: examId } = use(params)
  const { exam, submissions, stats, isLoading: loading, mutate } = useExamResults(examId)
  const [resetId, setResetId] = useState<{ id: string, name: string } | null>(null)

  const supabase = createClient()

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Memuat Hasil...</p>
      </div>
    </div>
  )

  const handleResetSubmission = async (subId: string, studentName: string) => {
    setResetId({ id: subId, name: studentName })
  }

  const confirmReset = async () => {
    if (!resetId) return

    const { error } = await supabase.from('submissions').delete().eq('id', resetId.id)
    if (error) {
      toast.error('Gagal mereset: ' + error.message)
    } else {
      toast.success(`Berhasil mereset pengerjaan ${resetId.name}`)
      mutate() // Revalidate SWR
    }
    setResetId(null)
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/exams">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{exam?.title}</h1>
            <p className="text-sm text-muted-foreground">
              {exam?.subjects?.name} — {exam?.classrooms?.name}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
           <Button variant="outline">
            <Download className="h-4 w-4" /> Ekspor Hasil
          </Button>
          <Button>
            <UserCheck className="h-4 w-4" /> Tandai Selesai Semua
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
             <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Terkumpul</span>
             <div className="flex items-center gap-3 mt-1">
                <span className="text-3xl font-black">{stats.total}</span>
                <Badge className="bg-emerald-500">Live</Badge>
             </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
             <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Rata-rata Skor</span>
             <div className="flex items-center gap-3 mt-1">
                <span className="text-3xl font-black">{stats.average}</span>
                <span className="text-xs font-bold text-muted-foreground">Class Avg</span>
             </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
             <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Skor Tertinggi</span>
             <div className="flex items-center gap-3 mt-1">
                <span className="text-3xl font-black text-primary">{stats.highest}</span>
                <span className="text-xs font-bold text-muted-foreground">Top Peak</span>
             </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
             <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Butuh Penilaian</span>
             <div className="flex items-center gap-3 mt-1">
                <span className="text-3xl font-black text-amber-500">{stats.pending}</span>
                <Badge variant="secondary" className="bg-amber-100 text-amber-700">Check</Badge>
             </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
             <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="text" placeholder="Cari nama siswa..." className="pl-10" />
             </div>
             <div className="flex gap-4">
                <button className="text-sm font-bold text-muted-foreground border-b-2 border-transparent pb-1 hover:text-foreground data-[active=true]:text-primary data-[active=true]:border-primary" data-active="true">Semua</button>
                <button className="text-sm font-bold text-muted-foreground border-b-2 border-transparent pb-1 hover:text-foreground">Perlu Dinilai</button>
                <button className="text-sm font-bold text-muted-foreground border-b-2 border-transparent pb-1 hover:text-foreground">Selesai</button>
             </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Siswa</TableHead>
                <TableHead>Waktu Kumpul</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Skor Akhir</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-bold">{sub.profiles?.full_name || 'Siswa'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(sub.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={sub.status === 'submitted' ? 'default' : 'secondary'} className={sub.status === 'submitted' ? 'bg-emerald-500' : 'bg-amber-100 text-amber-700'}>
                        {sub.status === 'submitted' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                        {sub.status === 'submitted' ? 'Graded' : 'In Progress'}
                      </Badge>
                      {sub.violations > 0 && (
                        <Badge variant="destructive" className="text-[10px]">
                           {sub.violations} Violations
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {sub.score !== null ? (
                      <span className="text-lg font-black">{sub.score}</span>
                    ) : (
                      <span className="text-sm italic text-muted-foreground">Pengerjaan...</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetSubmission(sub.id, sub.profiles?.full_name || 'Siswa')}
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      >
                        <RotateCcw className="h-3 w-3" /> Reset
                      </Button>
                      <Button size="sm" asChild>
                        <Link href={`/exams/${examId}/results/${sub.id}`}>
                          {sub.status === 'submitted' ? 'Detail Jawaban' : 'Pantau'}
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!resetId} onOpenChange={(open) => !open && setResetId(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Hasil Siswa?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin RESET pengerjaan siswa <span className="font-bold text-foreground">&quot;{resetId?.name}&quot;</span>?
              Hasil ujian dan seluruh jawaban akan dihapus permanen agar siswa bisa mengerjakan ulang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-none bg-secondary">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReset}
              className="rounded-xl bg-orange-600 text-white hover:bg-orange-700"
            >
              Ya, Reset Hasil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
