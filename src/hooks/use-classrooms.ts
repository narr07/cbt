'use client'

import useSWR from 'swr'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

export function useClassrooms() {
  const { data, error, mutate, isLoading } = useSWR('classrooms', async () => {
    const { data, error } = await supabase
      .from('classrooms')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    return data
  })

  return {
    classrooms: data || [],
    isLoading,
    isError: error,
    mutate
  }
}
