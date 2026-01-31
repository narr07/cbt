'use client'

import { useState, useEffect, use } from 'react'
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

export default function ClassroomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [classroom, setClassroom] = useState<any>(null)
  const [students, setStudents] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const supabase = createClient()

  const fetchData = async () => {
    setLoading(true)

    // 1. Fetch Classroom Info
    const { data: classData } = await supabase
      .from('classrooms')
      .select('*')
      .eq('id', id)
      .single()

    setClassroom(classData)

    // 2. Fetch Students in this class
    // Note: Assuming profiles table has classroom_id
    const { data: studentsData } = await supabase
      .from('profiles')
      .select('*')
      .eq('classroom_id', id)
      .eq('role', 'student')
      .order('full_name')

    setStudents(studentsData || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [id])

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
      alert('Gagal menambah siswa: ' + error.message)
    } else {
      setIsModalOpen(false)
      setFullName('')
      setUsername('')
      setPassword('')
      fetchData()
    }
    setSubmitting(false)
  }

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus siswa ini?')) return

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', studentId)

    if (error) {
      alert('Gagal menghapus: ' + error.message)
    } else {
      fetchData()
    }
  }

  const handleExport = () => {
    if (students.length === 0) return alert('Tidak ada data untuk diekspor.')

    const headers = ['Nama Lengkap', 'Username', 'Password']
    const rows = students.map(s => [s.full_name, s.username, '******'])

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Daftar_Siswa_${classroom.name}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter(line => line.trim() !== '')

      // Skip header and parse
      const studentData = lines.slice(1).map(line => {
        const [full_name, username, password] = line.split(',').map(item => item.trim())
        return {
          id: crypto.randomUUID(),
          full_name,
          username: username.toLowerCase(),
          password,
          role: 'student',
          classroom_id: id
        }
      })

      if (studentData.length === 0) return

      setIsImporting(true)
      const { error } = await supabase.from('profiles').insert(studentData)

      if (error) {
        alert('Gagal impor: ' + error.message)
      } else {
        alert(`Berhasil mengimpor ${studentData.length} siswa!`)
        fetchData()
      }
      setIsImporting(false)
    }
    reader.readAsText(file)
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
            <h1 className="text-3xl font-bold text-foreground">{classroom.name}</h1>
            <p className="text-muted-foreground">Manajemen daftar siswa untuk kelas ini.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="cursor-pointer"
          >
            <label>
              <Upload className="w-4 h-4" />
              {isImporting ? 'Importing...' : 'Import CSV'}
              <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
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
    </div>
  )
}
