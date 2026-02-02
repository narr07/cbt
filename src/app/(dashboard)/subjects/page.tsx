'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Plus, BookOpen, Trash2, Search, X } from 'lucide-react'
import { toast } from 'sonner'

// Shadcn UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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

interface Subject {
  id: string
  name: string
  created_at: string
}

import { useSubjects } from '@/hooks/use-subjects'

export default function SubjectsPage() {
  const { subjects, isLoading: loading, mutate } = useSubjects()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const supabase = createClient()

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubjectName.trim()) return

    setIsSubmitting(true)
    const { error } = await supabase
      .from('subjects')
      .insert([{ name: newSubjectName.trim() }])

    if (error) {
      toast.error('Gagal menambah mata pelajaran: ' + error.message)
    } else {
      toast.success('Mata pelajaran berhasil ditambahkan!')
      setNewSubjectName('')
      setIsModalOpen(false)
      mutate() // Revalidate SWR
    }
    setIsSubmitting(false)
  }

  const handleDeleteSubject = async (id: string) => {
    setDeleteId(id)
  }

  const confirmDeleteSubject = async () => {
    if (!deleteId) return

    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', deleteId)

    if (error) {
      toast.error('Gagal menghapus: ' + error.message)
    } else {
      toast.success('Mata pelajaran berhasil dihapus')
      mutate() // Revalidate SWR
    }
    setDeleteId(null)
  }

  const filteredSubjects = subjects.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary-heading heading">Mata Pelajaran</h1>
          <p className="text-muted-foreground mt-1">Kelola daftar mata pelajaran yang tersedia untuk ujian.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="w-5 h-5" />
          Tambah Mata Pelajaran
        </Button>
      </div>

      {/* Stats & Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <Search className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
            <Input
              type="text"
              placeholder="Cari mata pelajaran berdasarkan nama..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 h-14 rounded-2xl bg-card border-border/50 shadow-sm focus-visible:ring-primary/20 transition-all text-base"
            />
          </div>
        </div>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-0 flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Mapel</p>
                <p className="text-lg font-bold leading-none">{subjects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-6 py-4">Nama Mata Pelajaran</TableHead>
              <TableHead className="px-6 py-4">Tgl Dibuat</TableHead>
              <TableHead className="px-6 py-4 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell className="px-6 py-4"><div className="h-5 w-48 bg-muted rounded" /></TableCell>
                  <TableCell className="px-6 py-4"><div className="h-5 w-32 bg-muted rounded" /></TableCell>
                  <TableCell className="px-6 py-4 text-right"><div className="h-8 w-8 bg-muted rounded ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredSubjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="px-6 py-12 text-center text-muted-foreground italic">
                  Belum ada mata pelajaran. Klik &quot;Tambah&quot; untuk membuat satu.
                </TableCell>
              </TableRow>
            ) : (
              filteredSubjects.map((subject) => (
                <TableRow key={subject.id} className="group transition-colors">
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center group-hover:bg-background transition-colors">
                        <BookOpen className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="font-semibold">{subject.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(subject.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSubject(subject.id)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal - Add Subject */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold heading">Tambah Mapel</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSubject} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="subject-name">Nama Mata Pelajaran</Label>
              <Input
                id="subject-name"
                autoFocus
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="Contoh: Matematika"
                required
              />
            </div>
            <DialogFooter className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Mata Pelajaran?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus mata pelajaran ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-none bg-secondary">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSubject}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ya, Hapus Mapel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
