'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { LogIn, GraduationCap, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connStatus, setConnStatus] = useState<'testing' | 'ok' | 'fail'>('testing')
  const supabase = createClient()
  const router = useRouter()

  // Test connection on mount
  useState(() => {
    const testConn = async () => {
      try {
        const { error } = await supabase.from('profiles').select('id').limit(1)
        if (error && error.code !== 'PGRST116') {
          console.error('Connection test failed:', error)
          setConnStatus('fail')
        } else {
          setConnStatus('ok')
        }
      } catch (e) {
        console.error('Fatal connection error:', e)
        setConnStatus('fail')
      }
    }
    testConn()
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (connStatus === 'fail') {
      setError('Koneksi ke database bermasalah. Periksa internet atau Supabase URL/Key.')
      setLoading(false)
      return
    }

    const { data: profile, error: dbError } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', email.trim())
      .maybeSingle()

    console.log('DEBUG LOGIN:', { email: email.trim(), profile, dbError })

    if (dbError) {
      console.error('Login DB Error:', dbError)
      setError(`Database Error: ${dbError.message} (Detail: ${dbError.details || 'Check RLS Policy'})`)
      setLoading(false)
      return
    }

    if (!profile) {
      setError('User tidak ditemukan (Username salah). Pastikan data sudah ada di tabel public.profiles.')
      setLoading(false)
      return
    }

    if (profile.password !== password.trim()) {
      setError('Password salah')
      setLoading(false)
      return
    }

    document.cookie = `cbt_session=${profile.id}; path=/; max-age=86400; SameSite=Lax`
    router.refresh()
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/40 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-200/40 rounded-full blur-3xl animate-pulse" />

      <Card className="w-full max-w-md mx-4 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <GraduationCap className="w-10 h-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">CBT OSN SD</CardTitle>
          <CardDescription className="text-muted-foreground">
            Masuk ke platform ujian online
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                suppressHydrationWarning
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Masukkan username"
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                suppressHydrationWarning
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-11"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading} className="w-full h-11" size="lg">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Masuk</span>
                  <LogIn className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Lupa password? Hubungi Admin Sekolah
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
