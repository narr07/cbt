/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, use } from 'react'
import * as XLSX from 'xlsx'
import { createClient } from '@/utils/supabase/client'
import {
  Users,
  Trash2,
  ArrowLeft,
  UserPlus,
  Download,
  Upload,
} from 'lucide-react'
import Link from 'next/link'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Profile {
  id: string
  full_name: string
  username: string
  role: string
}

import { useClassroomDetails } from '@/hooks/use-classroom-details'

export default function ClassroomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { classroom, students, isLoading: loading, mutate } = useClassroomDetails(id)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const supabase = createClient()

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const { error } = await supabase
      .from('profiles')
      .insert([{
        id: crypto.randomUUID(),
        full_name: fullName,
        username: username.toLowerCase().trim(),
        password: password, // In production this should be hashed
        role: 'student',
        classroom_id: id
      }])

    if (error) {
      toast.error('Gagal menambah siswa: ' + error.message)
    } else {
      toast.success('Siswa berhasil ditambahkan!')
      setIsModalOpen(false)
      setFullName('')
      setUsername('')
      setPassword('')
      mutate() // Revalidate SWR
    }
    setSubmitting(false)
  }

  const handleDeleteStudent = async (studentId: string) => {
    setDeleteId(studentId)
  }

  const confirmDeleteStudent = async () => {
    if (!deleteId) return

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', deleteId)

    if (error) {
      toast.error('Gagal menghapus: ' + error.message)
    } else {
      toast.success('Siswa berhasil dihapus')
      mutate() // Revalidate SWR
    }
    setDeleteId(null)
  }

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Nama Lengkap': 'Contoh Siswa',
        'Username': 'siswa123',
        'Password': 'password123'
      }
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daftar Siswa')
    XLSX.writeFile(workbook, `Template_Siswa_${classroom?.name || 'Kelas'}.xlsx`)
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws) as any[]

        const studentData = data.map((row: any) => ({
          id: crypto.randomUUID(),
          full_name: row['Nama Lengkap']?.toString() || '',
          username: row['Username']?.toString().toLowerCase().trim() || '',
          password: row['Password']?.toString() || '',
          role: 'student',
          classroom_id: id
        })).filter(s => s.full_name && s.username)

        if (studentData.length === 0) {
          toast.error('Tidak ada data siswa yang valid ditemukan.')
          return
        }

        setIsImporting(true)
        const { error } = await supabase.from('profiles').insert(studentData)

        if (error) {
          toast.error('Gagal impor: ' + error.message)
        } else {
          toast.success(`Berhasil mengimpor ${studentData.length} siswa!`)
          mutate()
        }
      } catch (err) {
        console.error('Import Error:', err)
        toast.error('Gagal mengimpor file Excel. Pastikan format benar.')
      } finally {
        setIsImporting(false)
      }
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Memuat data...</div>
  if (!classroom) return <div className="p-8 text-center text-muted-foreground">Kelas tidak ditemukan.</div>

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/classrooms">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary-heading">{classroom.name}</h1>
            <p className="text-muted-foreground">Manajemen daftar siswa untuk kelas ini.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
          >
            <Download className="w-4 h-4" />
            Download Template
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="cursor-pointer"
          >
            <label>
              <Upload className="w-4 h-4" />
              {isImporting ? 'Importing...' : 'Import Excel'}
              <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" />
            </label>
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <Card className="w-fit">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Siswa</p>
              <p className="text-2xl font-bold">{students.length}</p>
            </div>
          </CardContent>
        </Card>
        <Button onClick={() => setIsModalOpen(true)}>
          <UserPlus className="w-5 h-5" />
          Tambah Siswa Manual
        </Button>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-6">Nama Lengkap</TableHead>
              <TableHead className="px-6">Username</TableHead>
              <TableHead className="px-6 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="px-6 py-12 text-center text-muted-foreground italic">
                  Belum ada siswa di kelas ini.
                </TableCell>
              </TableRow>
            ) : (
              students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {student.full_name.charAt(0)}
                      </div>
                      <span className="font-semibold">{student.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 text-muted-foreground">{student.username}</TableCell>
                  <TableCell className="px-6 text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDeleteStudent(student.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal - Add Student */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Siswa</DialogTitle>
            <DialogDescription>
              Buat akun untuk siswa baru di kelas ini.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddStudent} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="full-name">Nama Lengkap</Label>
              <Input
                id="full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Contoh: Ahmad Dhani"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username (untuk Login)</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ahmad123"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
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
                  'Simpan Siswa'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Siswa?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus akun siswa ini? Semua data pengerjaan ujian siswa ini akan ikut terhapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-none bg-secondary">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteStudent}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ya, Hapus Siswa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
