'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Plus,
  Search,
  ClipboardCheck,
  Clock,
  Settings as SettingsIcon,
  FileEdit,
  Trash2
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

// Shadcn UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

interface Exam {
  id: string
  title: string
  subject_id: string
  classroom_id: string
  duration: number
  is_published: boolean
  created_at: string
  subjects?: { name: string }
  classrooms?: { name: string }
}

import { useExams } from '@/hooks/use-exams'
import { useSubjects } from '@/hooks/use-subjects'
import { useClassrooms } from '@/hooks/use-classrooms'

export default function ExamsPage() {
  const { exams, isLoading: loading, mutate } = useExams()
  const { subjects } = useSubjects()
  const { classrooms } = useClassrooms()

  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Form states
  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [classroomId, setClassroomId] = useState('')
  const [duration, setDuration] = useState(60)

  const supabase = createClient()

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !subjectId || !classroomId) return

    setSubmitting(true)
    const { error } = await supabase
      .from('exams')
      .insert([{
        title,
        subject_id: subjectId,
        classroom_id: classroomId,
        duration
      }])

    if (error) {
      toast.error('Gagal membuat ujian: ' + error.message)
    } else {
      toast.success('Ujian berhasil dibuat!')
      setIsModalOpen(false)
      setTitle('')
      setSubjectId('')
      setClassroomId('')
      mutate() // Revalidate SWR
    }
    setSubmitting(false)
  }

  const handleDeleteExam = async (id: string) => {
    setDeleteId(id)
  }

  const confirmDelete = async () => {
    if (!deleteId) return

    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', deleteId)

    if (error) {
      toast.error('Gagal menghapus: ' + error.message)
    } else {
      toast.success('Ujian berhasil dihapus')
      mutate() // Revalidate SWR
    }
    setDeleteId(null)
  }

  const filteredExams = exams.filter(e =>
    e.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Manajemen Ujian (CBT)</h1>
          <p className="text-muted-foreground mt-1">Buat, edit, dan pantau status pelaksanaan ujian OSN.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-5 w-5" />
          Buat Ujian Baru
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Cari ujian..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Exam Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-10 w-10 bg-muted rounded-xl mb-4" />
                <div className="h-6 w-3/4 bg-muted rounded mb-2" />
                <div className="h-4 w-1/2 bg-muted rounded mb-6" />
                <div className="flex gap-4">
                  <div className="h-8 flex-1 bg-muted/50 rounded" />
                  <div className="h-8 flex-1 bg-muted/50 rounded" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredExams.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground italic bg-card rounded-xl border border-dashed">
            Belum ada ujian yang dibuat.
          </div>
        ) : (
          filteredExams.map((exam) => (
            <Card key={exam.id} className="group overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className={`h-1.5 w-full ${exam.is_published ? 'bg-emerald-500' : 'bg-amber-400'}`} />

              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-muted rounded-xl text-muted-foreground group-hover:text-primary transition-colors">
                    <ClipboardCheck className="h-8 w-8" />
                  </div>
                  <Badge variant={exam.is_published ? 'default' : 'secondary'} className={exam.is_published ? 'bg-emerald-500' : 'bg-amber-100 text-amber-700'}>
                    {exam.is_published ? 'Published' : 'Draft'}
                  </Badge>
                </div>

                <h3 className="text-lg font-bold line-clamp-1 mb-1">{exam.title}</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {exam.subjects?.name || 'No Subject'} • {exam.classrooms?.name || 'All Classes'}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-semibold">{exam.duration} Menit</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileEdit className="h-4 w-4" />
                    <span className="text-xs font-semibold">Ujian Mandiri</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="flex-1" asChild>
                    <Link href={`/exams/${exam.id}`}>
                      <SettingsIcon className="h-3.5 w-3.5" />
                      Kelola Soal
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDeleteExam(exam.id)}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>

              <Button variant="ghost" className="w-full rounded-none border-t" asChild>
                <Link href={`/exams/${exam.id}/results`}>
                  Lihat Detail & Hasil
                </Link>
              </Button>
            </Card>
          ))
        )}
      </div>

      {/* Modal - Create Exam */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Ujian Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddExam} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="exam-title">Judul Ujian</Label>
              <Input
                id="exam-title"
                autoFocus
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: OSN Matematika Tahap 1"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mata Pelajaran</Label>
                <Select value={subjectId} onValueChange={setSubjectId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Mapel" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Grup / Kelas</Label>
                <Select value={classroomId} onValueChange={setClassroomId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    {classrooms.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Durasi (Menit)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  'Lanjutkan'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Ujian?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus ujian ini? Semua soal, data jawaban siswa, dan hasil ujian akan ikut terhapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-none bg-secondary">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ya, Hapus Ujian
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
