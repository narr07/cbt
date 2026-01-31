'use client'

import useSWR from 'swr'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

export function useClassroomDetails(id: string) {
  const { data, error, mutate, isLoading } = useSWR(`classroom-${id}`, async () => {
    // 1. Fetch Classroom Info
    const { data: classroom } = await supabase
      .from('classrooms')
      .select('*')
      .eq('id', id)
      .single()

    // 2. Fetch Students in this class
    const { data: students } = await supabase
      .from('profiles')
      .select('*')
      .eq('classroom_id', id)
      .eq('role', 'student')
      .order('full_name')

    return {
      classroom,
      students: students || []
    }
  })

  return {
    classroom: data?.classroom,
    students: data?.students || [],
    isLoading,
    isError: error,
    mutate
  }
}
