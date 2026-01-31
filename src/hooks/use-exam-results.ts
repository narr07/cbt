'use client'

import useSWR from 'swr'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

export function useExamResults(examId: string) {
  const { data, error, mutate, isLoading } = useSWR(`exam-results-${examId}`, async () => {
    // 1. Fetch Exam Details
    const { data: examData, error: examErr } = await supabase
      .from('exams')
      .select('*, subjects(name), classrooms(id, name)')
      .eq('id', examId)
      .single()

    if (examErr) throw examErr

    // 2. Fetch Submissions
    const { data: subData, error: subErr } = await supabase
      .from('submissions')
      .select(`
        *,
        profiles:student_id (full_name)
      `)
      .eq('exam_id', examId)
      .order('started_at', { ascending: false })

    if (subErr) throw subErr

    // 3. Calculate Stats
    const validScores = (subData || []).filter(s => s.score !== null).map(s => s.score)
    const avg = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0
    const high = validScores.length > 0 ? Math.max(...validScores) : 0
    const pending = (subData || []).filter(s => s.status === 'in_progress' || !s.score).length

    return {
      exam: examData,
      submissions: subData || [],
      stats: {
        total: subData?.length || 0,
        average: Number(avg.toFixed(1)),
        highest: high,
        pending
      }
    }
  }, {
    refreshInterval: 5000 // Refresh for monitoring
  })

  return {
    exam: data?.exam,
    submissions: data?.submissions || [],
    stats: data?.stats || { total: 0, average: 0, highest: 0, pending: 0 },
    isLoading,
    isError: error,
    mutate
  }
}
