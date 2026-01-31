'use client'

import useSWR from 'swr'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

export function useExams() {
  const { data, error, mutate, isLoading } = useSWR('exams', async () => {
    const { data, error } = await supabase
      .from('exams')
      .select('*, subjects(name), classrooms(name)')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  })

  return {
    exams: data || [],
    isLoading,
    isError: error,
    mutate
  }
}
