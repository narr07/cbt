/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, use } from 'react'
import { cn } from '@/lib/utils'
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
  const { exam, submissions, has_essay, total_questions, stats, isLoading: loading, mutate } = useExamResults(examId)
  const [resetId, setResetId] = useState<{ id: string, name: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'submitted' | 'in_progress'>('all')
  const [isFinishingAll, setIsFinishingAll] = useState(false)

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

  const handleMarkAllFinished = async () => {
    setIsFinishingAll(true)
    const { error } = await supabase
      .from('submissions')
      .update({ status: 'submitted' })
      .eq('exam_id', examId)
      .eq('status', 'in_progress')

    if (error) {
      toast.error('Gagal menandai selesai: ' + error.message)
    } else {
      toast.success('Semua pengerjaan yang aktif telah ditandai selesai')
      mutate()
    }
    setIsFinishingAll(false)
  }

  // Filter & Search Logic
  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch = (sub.profiles?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filter === 'all' || sub.status === filter
    return matchesSearch && matchesFilter
  })

  const handleExportToExcel = async () => {
    // Dynamic import to reduce bundle size
    const XLSX = await import('xlsx')

    // Prepare data for Excel
    const excelData = filteredSubmissions.map((sub, idx) => ({
      'Peringkat': idx + 1,
      'Nama Siswa': sub.profiles?.full_name || 'Siswa',
      'Durasi Pengerjaan': sub.work_duration || '-',
      'Jawaban Benar': `${sub.correct_answers || 0}/${total_questions}`,
      'Status': sub.status === 'submitted' ? 'Graded' : 'Active',
      'Pelanggaran': sub.violations || 0,
      'Skor': sub.score !== null ? sub.score : 'Loading...'
    }))

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData)

    // Set column widths
    worksheet['!cols'] = [
      { wch: 10 }, // Peringkat
      { wch: 25 }, // Nama Siswa
      { wch: 20 }, // Durasi Pengerjaan
      { wch: 15 }, // Jawaban Benar
      { wch: 12 }, // Status
      { wch: 12 }, // Pelanggaran
      { wch: 10 }  // Skor
    ]

    // Create workbook
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Hasil Ujian')

    // Generate filename
    const fileName = `Hasil_${exam?.title || 'Ujian'}_${new Date().toISOString().split('T')[0]}.xlsx`

    // Download file
    XLSX.writeFile(workbook, fileName)
    toast.success('Berhasil mengekspor hasil ujian')
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10">
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
           <Button variant="outline" onClick={handleExportToExcel}>
            <Download className="h-4 w-4" /> Ekspor Hasil
          </Button>
          <Button onClick={handleMarkAllFinished} disabled={isFinishingAll}>
            {isFinishingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
            Tandai Selesai Semua
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-3xl border-none shadow-sm bg-background">
          <CardContent className="pt-6">
             <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Terkumpul</span>
             <div className="flex items-center gap-3 mt-1">
                <span className="text-4xl font-black tabular-nums">{stats.total}</span>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-none rounded-lg px-2 text-[10px] font-black uppercase tracking-widest">Siswa</Badge>
             </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-none shadow-sm bg-background">
          <CardContent className="pt-6">
             <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Rata-rata Skor</span>
             <div className="flex items-center gap-3 mt-1">
                <span className="text-4xl font-black tabular-nums">{stats.average}</span>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Class Avg</span>
             </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-none shadow-sm bg-background">
          <CardContent className="pt-6">
             <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Skor Tertinggi</span>
             <div className="flex items-center gap-3 mt-1">
                <span className="text-4xl font-black tabular-nums text-primary">{stats.highest}</span>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Top Peak</span>
             </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-background">
        <CardContent className="pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
             <div className="relative max-w-sm w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Cari nama siswa..."
                  className="pl-12 h-12 rounded-2xl border-muted bg-muted/30 focus-visible:ring-primary/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <div className="flex bg-muted p-1.5 rounded-2xl gap-1">
                {[
                  { id: 'all', label: 'Semua' },
                  { id: 'in_progress', label: 'Pengerjaan' },
                  { id: 'submitted', label: 'Selesai' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setFilter(item.id as any)}
                    className={cn(
                      "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      filter === item.id ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
             </div>
          </div>

          <div className="rounded-2xl border border-muted/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-16 text-center font-black text-[10px] uppercase tracking-widest">Rank</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest">Siswa</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest">Durasi Pengerjaan</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest">Benar</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest">Status</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest">Skor Akhir</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase tracking-widest pr-8">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.length > 0 ? filteredSubmissions.map((sub, idx) => (
                  <TableRow key={sub.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-center font-black text-muted-foreground/30">{idx + 1}</TableCell>
                    <TableCell className="font-bold py-5">{sub.profiles?.full_name || 'Siswa'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest">
                        <Clock className="h-3.5 w-3.5" />
                        {sub.work_duration || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-base font-black tabular-nums">{sub.correct_answers || 0}</span>
                        <span className="text-xs text-muted-foreground font-medium">/</span>
                        <span className="text-xs text-muted-foreground font-medium">{total_questions}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "border-none rounded-lg px-2 text-[10px] font-black uppercase tracking-widest",
                            sub.status === 'submitted' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                          )}
                        >
                          {sub.status === 'submitted' ? <CheckCircle2 className="h-3 w-3 mr-1.5" /> : <AlertCircle className="h-3 w-3 mr-1.5" />}
                          {sub.status === 'submitted' ? 'Graded' : 'Active'}
                        </Badge>
                        {sub.violations > 0 && (
                          <Badge variant="destructive" className="border-none rounded-lg px-2 text-[10px] font-black animate-pulse">
                             {sub.violations} Warn
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {sub.score !== null ? (
                        <span className="text-xl font-black tabular-nums">{sub.score}</span>
                      ) : (
                        <span className="text-[10px] font-black text-muted-foreground uppercase opacity-40">Loading...</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!has_essay}
                          asChild={has_essay}
                          className={cn(
                             "h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest",
                             !has_essay ? "opacity-20" : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          )}
                        >
                          {has_essay ? (
                            <Link href={`/exams/${examId}/results/${sub.id}`}>
                              Beri Nilai
                            </Link>
                          ) : (
                            <span>Beri Nilai</span>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleResetSubmission(sub.id, sub.profiles?.full_name || 'Siswa')}
                          className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-all"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" asChild className="h-9 px-4 rounded-xl bg-primary shadow-lg shadow-primary/20 hover:shadow-none transition-all font-black text-[10px] uppercase tracking-widest">
                          <Link href={`/exams/${examId}/results/${sub.id}`}>
                            Detail
                            <ChevronRight className="h-3.5 w-3.5 ml-1.5" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground font-medium italic">
                      Tidak ada hasil yang ditemukan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!resetId} onOpenChange={(open) => !open && setResetId(null)}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight">Reset Hasil Siswa?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium text-base">
              Apakah Anda yakin ingin RESET pengerjaan siswa <span className="font-bold text-foreground">&quot;{resetId?.name}&quot;</span>?
              Hasil ujian dan seluruh jawaban akan dihapus permanen agar siswa bisa mengerjakan ulang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="rounded-2xl border-none bg-muted font-black text-[10px] uppercase tracking-widest py-6">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReset}
              className="rounded-2xl bg-destructive text-white hover:bg-destructive/90 font-black text-[10px] uppercase tracking-widest py-6 shadow-xl shadow-destructive/20"
            >
              Ya, Reset Hasil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
