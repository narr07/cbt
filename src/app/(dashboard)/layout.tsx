'use client'

import { AppSidebar } from '@/components/layout/app-sidebar'
import { Bell, LogOut, Settings, User } from 'lucide-react'

// Shadcn UI Components
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full bg-background overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col overflow-y-auto">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b bg-background/70 backdrop-blur-md px-4 md:px-8 shadow-sm">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div className="text-sm text-muted-foreground font-medium hidden sm:block">
                Selamat datang di <span className="text-foreground font-bold">Portal OSN</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary">
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive border-2 border-background"></span>
              </Button>

              <div className="h-8 w-px bg-border mx-2" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative flex items-center gap-3 pl-2 pr-4 py-1.5 h-auto rounded-full group"
                    suppressHydrationWarning
                  >
                    <Avatar className="h-8 w-8 border-2 border-background shadow-sm">
                      <AvatarImage src="" alt="Admin" />
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">AD</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors hidden md:block">Administrator</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">Administrator</p>
                      <p className="text-xs leading-none text-muted-foreground">admin@portalosn.sch.id</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profil Saya</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Pengaturan</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Keluar Sesi</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-8">
            <div className="animate-fade-in max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
