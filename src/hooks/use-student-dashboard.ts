'use client'

import useSWR from 'swr'
import { createClient } from '@/utils/supabase/client'
import { useEffect } from 'react'

const supabase = createClient()

export interface StudentProfile {
  id: string
  full_name: string
  role: string
  classroom_id: string
  classrooms: {
    name: string
  } | null
}

export interface StudentExam {
  id: string
  title: string
  duration: number
  start_time: string | null
  end_time: string | null
  subjects: {
    name: string
  } | null
}

export function useStudentDashboard() {
  const { data, error, mutate, isLoading } = useSWR('student-dashboard', async () => {
    // 1. Get Session from Cookie
    const sessionId = document.cookie
      .split('; ')
      .find(row => row.startsWith('cbt_session='))
      ?.split('=')[1]

    if (!sessionId) return null

    // 2. Fetch Profile
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('*, classrooms:classroom_id(name)')
      .eq('id', sessionId)
      .single()

    if (profErr || !profile) throw profErr || new Error('Profile not found')

    // 3. Fetch Exams
    const { data: exams, error: examErr } = await supabase
      .from('exams')
      .select('*, subjects:subject_id(name)')
      .eq('classroom_id', profile.classroom_id)
      .eq('is_published', true)
      .order('created_at', { ascending: false })

    if (examErr) throw examErr

    return {
      user: profile as StudentProfile,
      exams: (exams || []) as StudentExam[]
    }
  }, {
    refreshInterval: 60000, // Refresh every minute
    revalidateOnFocus: true
  })

  // Heartbeat Effect
  useEffect(() => {
    if (!data?.user?.id) return

    const updateOnlineStatus = async () => {
      await supabase
        .from('profiles')
        .update({ last_online_at: new Date().toISOString() })
        .eq('id', data.user.id)
    }

    updateOnlineStatus()
    const interval = setInterval(updateOnlineStatus, 30000) // Every 30s
    return () => clearInterval(interval)
  }, [data?.user?.id])

  return {
    data: data || { user: null, exams: [] },
    isLoading,
    isError: error,
    mutate
  }
}
