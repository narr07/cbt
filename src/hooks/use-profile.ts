'use client'

import useSWR from 'swr'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

export interface UserProfile {
  id: string
  full_name: string
  username: string
  role: 'manager' | 'teacher' | 'student'
  avatar_url: string | null
}

export function useProfile() {
  const { data, error, mutate, isLoading } = useSWR('current-profile', async () => {
    // 1. Get Session from Cookie (Client only)
    if (typeof window === 'undefined') return null

    const sessionId = document.cookie
      .split('; ')
      .find(row => row.startsWith('cbt_session='))
      ?.split('=')[1]

    if (!sessionId) return null

    // 2. Fetch Profile
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('id, full_name, username, role, avatar_url')
      .eq('id', sessionId)
      .single()

    if (profErr) throw profErr

    return profile as UserProfile
  }, {
    revalidateOnFocus: true,
    dedupingInterval: 10000
  })

  return {
    profile: data,
    isLoading,
    isError: error,
    mutate
  }
}
