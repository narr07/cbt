'use client'

import useSWR from 'swr'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

export function useSubjects() {
  const { data, error, mutate, isLoading } = useSWR('subjects', async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    return data
  })

  return {
    subjects: data || [],
    isLoading,
    isError: error,
    mutate
  }
}
