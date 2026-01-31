'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ClipboardCheck,
  Settings,
  LogOut,
  GraduationCap,
  ChevronRight
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { cn } from '@/lib/utils'

// Shadcn UI Components
import { Button } from '@/components/ui/button'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Mata Pelajaran', href: '/subjects', icon: BookOpen },
  { name: 'Manajemen Kelas', href: '/classrooms', icon: Users },
  { name: 'Ujian (CBT)', href: '/exams', icon: ClipboardCheck },
  { name: 'Pengaturan', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    // Clear custom cookie
    document.cookie = 'cbt_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    router.push('/login')
  }

  return (
    <div className="flex h-full w-64 flex-col bg-slate-950 text-slate-50 border-r border-slate-800/50">
      <div className="flex h-20 items-center gap-3 px-6 border-b border-slate-800/50">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
          <GraduationCap className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">CBT OSN SD</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">v2.0 Beta</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 px-4 py-8">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Button
              key={item.name}
              variant={isActive ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-between h-11 px-4 rounded-xl transition-all duration-200 group',
                isActive
                  ? 'bg-primary/10 text-primary hover:bg-primary/15'
                  : 'text-slate-400 hover:text-slate-100'
              )}
              asChild
            >
              <Link href={item.href}>
                <div className="flex items-center">
                  <item.icon className={cn(
                    'mr-3 h-5 w-5 transition-colors',
                    isActive ? 'text-primary' : 'text-slate-500 group-hover:text-slate-200'
                  )} />
                  <span className="font-semibold">{item.name}</span>
                </div>
                {isActive && (
                  <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
                )}
              </Link>
            </Button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-800/50">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full h-12 justify-center gap-2 rounded-xl text-slate-400 hover:bg-destructive/10 hover:text-destructive transition-all group font-bold"
        >
          <LogOut className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Keluar Sesi
        </Button>
      </div>
    </div>
  )
}
