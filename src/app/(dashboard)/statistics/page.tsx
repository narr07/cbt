'use client'

import {
  BarChart3,
  Users,
  ClipboardCheck,
  ArrowUpRight,
  Search,
  Filter,
  Download,
  MoreHorizontal
} from 'lucide-react'
import { useState } from 'react'

// Shadcn UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

const performanceData = [
  { id: '1', name: 'Andi Pratama', class: 'Kelas 5A', exams_taken: 12, avg_score: 88.5, status: 'Meningkat' },
  { id: '2', name: 'Siti Rahma', class: 'Kelas 5A', exams_taken: 12, avg_score: 92.0, status: 'Stabil' },
  { id: '3', name: 'Budi Cahyono', class: 'Kelas 5B', exams_taken: 10, avg_score: 75.4, status: 'Menurun' },
  { id: '4', name: 'Rina Wijaya', class: 'Kelas 6A', exams_taken: 15, avg_score: 95.8, status: 'Meningkat' },
]

import { useStatistics } from '@/hooks/use-statistics'
import { Loader2 } from 'lucide-react'

export default function StatisticsPage() {
  const { stats, isLoading: loading } = useStatistics()
  const [searchTerm, setSearchTerm] = useState('')

  const filteredPerformance = stats.performance.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Memuat Statistik...</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Statistik & Analitik</h1>
          <p className="text-muted-foreground mt-1">Pantau performa akademik dan progres belajar seluruh siswa.</p>
        </div>
        <Button variant="outline">
          <Download className="h-5 w-5" />
          Ekspor PDF/Excel
        </Button>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="group overflow-hidden">
          <CardContent className="pt-8 pb-8 relative">
            <div className="absolute top-0 right-0 p-6 bg-primary/10 rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-all">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Rerata Sekolah</span>
            <div className="flex items-baseline gap-2 mt-2">
              <h2 className="text-5xl font-extrabold">{stats.schoolAvg}</h2>
              <Badge className="bg-emerald-500">
                 <ArrowUpRight className="h-3 w-3" /> --
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-4">Berdasarkan seluruh ujian yang selesai</p>
          </CardContent>
        </Card>

        <Card className="group overflow-hidden">
          <CardContent className="pt-8 pb-8 relative">
            <div className="absolute top-0 right-0 p-6 bg-emerald-50 rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-all">
              <ClipboardCheck className="h-8 w-8 text-emerald-600" />
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Partisipasi Ujian</span>
            <div className="flex items-baseline gap-2 mt-2">
              <h2 className="text-5xl font-extrabold">{stats.participationRate}%</h2>
              <span className="text-muted-foreground font-bold text-sm">Aktif</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full mt-6 overflow-hidden">
               <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${stats.participationRate}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-primary to-primary/80 text-primary-foreground">
          <CardContent className="pt-8 pb-8 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-xl font-bold">Analisis Sekolah</h3>
              <p className="text-primary-foreground/80 text-sm mt-2 leading-relaxed">
                Data statistik memberikan gambaran akurasi kesiapan siswa menghadapi OSN. Pantau tren mingguan untuk hasil optimal.
              </p>
            </div>
            <Button variant="secondary" className="mt-6 bg-white/20 hover:bg-white/30 border-0">
               Lihat Rekomendasi
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard / Student List */}
      <Card>
        <CardHeader className="border-b flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
          <CardTitle>Ranking Performa Siswa</CardTitle>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative group flex-1 sm:w-64">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              </div>
              <Input
                type="text"
                placeholder="Cari nama siswa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-muted/50 border-none focus-visible:ring-primary/20"
              />
            </div>
            <Button variant="outline" size="icon" className="shrink-0">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Siswa</TableHead>
                <TableHead>Kelas</TableHead>
                <TableHead>Ujian Selesai</TableHead>
                <TableHead>Rerata Skor</TableHead>
                <TableHead>Tren</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPerformance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                    Data tidak ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPerformance.map((student, i) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
                          {student.name[0]}
                        </div>
                        <div>
                          <span className="block font-bold">{student.name}</span>
                          <span className="text-xs text-muted-foreground italic">ID: {student.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{student.classroom}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {student.exams_taken} Sesi
                      </Badge>
                    </TableCell>
                    <TableCell>
                       <div className="flex items-center gap-3">
                          <span className="text-lg font-extrabold">{student.avg_score}</span>
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                             <div className="h-full bg-primary" style={{ width: `${student.avg_score}%` }} />
                          </div>
                       </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={student.status === 'Meningkat' ? 'default' : student.status === 'Menurun' ? 'destructive' : 'secondary'}
                        className={student.status === 'Meningkat' ? 'bg-emerald-500' : ''}
                      >
                        {student.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="text-muted-foreground">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
