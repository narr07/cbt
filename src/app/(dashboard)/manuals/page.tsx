'use client'

import {
  Book,
  Search,
  ChevronRight,
  ArrowRight,
  UserCheck,
  GraduationCap,
  Hammer,
  HelpCircle,
  Plus,
  FileText
} from 'lucide-react'

// Shadcn UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

const manuals = [
  {
    id: '1',
    title: 'Panduan Siswa: Cara Mengikuti Ujian',
    category: 'Student',
    updated_at: '2 hari yang lalu',
    icon: GraduationCap,
    color: 'text-blue-600 bg-blue-50'
  },
  {
    id: '2',
    title: 'Panduan Guru: Membuat Ujian PG & Essay',
    category: 'Teacher',
    updated_at: '1 minggu yang lalu',
    icon: UserCheck,
    color: 'text-purple-600 bg-purple-50'
  },
  {
    id: '3',
    title: 'Troubleshooting: Kendala Teknis Saat CBT',
    category: 'Technical',
    updated_at: '3 hari yang lalu',
    icon: Hammer,
    color: 'text-amber-600 bg-amber-50'
  },
  {
    id: '4',
    title: 'Pusat Bantuan & FAQ',
    category: 'General',
    updated_at: 'Awal Januari',
    icon: HelpCircle,
    color: 'text-emerald-600 bg-emerald-50'
  },
]

export default function ManualsPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manual & Panduan</h1>
          <p className="text-muted-foreground mt-1">Dokumentasi lengkap untuk mempermudah penggunaan sistem CBT.</p>
        </div>
        <Button>
          <Plus className="h-5 w-5" />
          Tambah Artikel
        </Button>
      </div>

      <div className="relative group max-w-2xl">
        <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
          <Search className="h-6 w-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
        </div>
        <Input
          type="text"
          placeholder="Cari topik, kata kunci, atau bantuan..."
          className="pl-14 h-16 text-lg rounded-2xl bg-card border-border/50 shadow-sm focus-visible:ring-primary/20 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {manuals.map((manual) => (
          <Card key={manual.id} className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <CardContent className="pt-8 pb-6">
              <div className="flex items-start justify-between mb-6">
                <div className={`p-4 rounded-2xl ${manual.color} transition-all`}>
                  <manual.icon className="h-8 w-8" />
                </div>
                <Badge variant="secondary">
                  {manual.category}
                </Badge>
              </div>

              <h3 className="text-xl font-bold group-hover:text-primary transition-colors mb-2">
                {manual.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-8 flex items-center gap-2">
                 <FileText className="h-4 w-4" />
                 Diterbitkan {manual.updated_at}
              </p>

              <Button variant="ghost" className="w-full justify-between font-bold text-primary border-t pt-4 rounded-none mt-auto group-hover:border-primary/20">
                Selesaikan Membaca
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-linear-to-br from-blue-500 to-blue-600 text-white border-0">
        <CardContent className="py-8">
           <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-3">
                 <h2 className="text-2xl font-bold tracking-tight">Butuh Bantuan Lebih Lanjut?</h2>
                 <p className="text-blue-100">Tim IT Support kami siap membantu kendala teknis Anda setiap hari kerja.</p>
              </div>
              <Button variant="secondary" className="bg-white text-blue-600 hover:bg-blue-50">
                 Hubungi Support
              </Button>
           </div>
        </CardContent>
      </Card>
    </div>
  )
}
