'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  Plus,
  Search,
  Trash2,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

// Shadcn UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
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

interface Classroom {
  id: string
  name: string
  grade_level: number
  created_at: string
}

import { useClassrooms } from '@/hooks/use-classrooms'

export default function ClassroomsPage() {
  const { classrooms, isLoading: loading, mutate } = useClassrooms()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newClassName, setNewClassName] = useState('')
  const [newGradeLevel, setNewGradeLevel] = useState('6')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const supabase = createClient()

  const handleAddClassroom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClassName.trim()) return

    setIsSubmitting(true)
    const { error } = await supabase
      .from('classrooms')
      .insert([{
        name: newClassName.trim(),
        grade_level: parseInt(newGradeLevel)
      }])

    if (error) {
      toast.error('Gagal menambah kelas: ' + error.message)
    } else {
      toast.success('Kelas berhasil ditambahkan!')
      setNewClassName('')
      setIsModalOpen(false)
      mutate() // Revalidate SWR cache
    }
    setIsSubmitting(false)
  }

  const handleDeleteClassroom = async (id: string) => {
    setDeleteId(id)
  }

  const confirmDelete = async () => {
    if (!deleteId) return

    const { error } = await supabase
      .from('classrooms')
      .delete()
      .eq('id', deleteId)

    if (error) {
      toast.error('Gagal menghapus: ' + error.message)
    } else {
      toast.success('Kelas berhasil dihapus')
      mutate() // Revalidate SWR cache
    }
    setDeleteId(null)
  }

  const filteredClassrooms = classrooms.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manajemen Kelas</h1>
          <p className="text-muted-foreground mt-1">Kelola grup kelas, pengajar, dan daftar siswa.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-5 w-5" />
          Tambah Kelas
        </Button>
      </div>

      {/* Stats & Search */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari kelas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Total: {classrooms.length} Kelas</span>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-6">Nama Kelas</TableHead>
              <TableHead className="px-6">Level</TableHead>
              <TableHead className="px-6">Tgl Dibuat</TableHead>
              <TableHead className="px-6 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell className="px-6"><div className="h-10 w-48 bg-muted rounded-lg" /></TableCell>
                  <TableCell className="px-6"><div className="h-5 w-24 bg-muted rounded" /></TableCell>
                  <TableCell className="px-6"><div className="h-5 w-32 bg-muted rounded" /></TableCell>
                  <TableCell className="px-6 text-right"><div className="h-8 w-8 bg-muted rounded ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredClassrooms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic">
                  Belum ada kelas. Klik &quot;Tambah Kelas&quot; untuk memulai.
                </TableCell>
              </TableRow>
            ) : (
              filteredClassrooms.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell className="px-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                        {cls.name.charAt(0)}
                      </div>
                      <span className="font-semibold">{cls.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6">
                    <Badge variant="secondary">
                      Grade {cls.grade_level}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 text-muted-foreground">
                    {new Date(cls.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </TableCell>
                  <TableCell className="px-6 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        asChild
                        title="Lihat Siswa"
                      >
                        <Link href={`/classrooms/${cls.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDeleteClassroom(cls.id)}
                        title="Hapus Kelas"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal - Add Classroom */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Kelas</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddClassroom} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="class-name">Nama Kelas</Label>
              <Input
                id="class-name"
                autoFocus
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Contoh: Kelas 6-A"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade-level">Level / Tingkatan</Label>
              <Select value={newGradeLevel} onValueChange={setNewGradeLevel}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih tingkatan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">Grade 4</SelectItem>
                  <SelectItem value="5">Grade 5</SelectItem>
                  <SelectItem value="6">Grade 6</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  'Simpan'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kelas?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus kelas ini? Semua data siswa di dalamnya akan ikut terpengaruh. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-none bg-secondary">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ya, Hapus Kelas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
