"use client"

import { AppSidebar } from '@/components/layout/app-sidebar'
import { useProfile } from '@/hooks/use-profile'

// Shadcn UI Components
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile, isLoading } = useProfile()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="bg-background sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b backdrop-blur-md shadow-sm">
          <div className="flex flex-1 items-center gap-2 px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="text-sm text-muted-foreground font-medium hidden sm:block">
              Halo <span className="text-primary-heading font-bold">
                {isLoading ? 'Loading...' : (profile?.full_name || 'Administrator')}
              </span>
              <br />Selamat datang di Dashboard CBT OSN SD
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-8">
          <div className="animate-fade-in max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
