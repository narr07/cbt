'use client'

import useSWR from 'swr'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

export function useExamEditor(id: string) {
  const { data, error, mutate, isLoading } = useSWR(`exam-editor-${id}`, async () => {
    const { data: examData, error: examErr } = await supabase
      .from('exams')
      .select('*, subjects(name)')
      .eq('id', id)
      .single()

    if (examErr) throw examErr

    const { data: qData, error: qErr } = await supabase
      .from('questions')
      .select('*, options(*)')
      .eq('exam_id', id)
      .order('id')

    if (qErr) throw qErr

    return {
      exam: examData,
      questions: (qData || []).map((q: any) => ({
        ...q,
        options: q.options || []
      }))
    }
  })

  return {
    exam: data?.exam,
    questions: data?.questions || [],
    isLoading,
    isError: error,
    mutate
  }
}
