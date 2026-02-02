/* eslint-disable @typescript-eslint/no-explicit-any */
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

    // 2. Check for Essay Questions & Get Total Question Count
    const { count: essayCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('exam_id', examId)
      .eq('type', 'essay')

    const { count: totalQuestions } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('exam_id', examId)

    // 3. Fetch Submissions with Correct Answer Counts
    const { data: subData, error: subErr } = await supabase
      .from('submissions')
      .select(`
        *,
        profiles:student_id (full_name),
        answers (
          pg_option_id,
          options (
            is_correct
          )
        )
      `)
      .eq('exam_id', examId)
      .order('score', { ascending: false })

    if (subErr) throw subErr

    // 4. Transform data to include computed fields
    const calculateWorkDuration = (start: any, end: any): string => {
      if (!start || !end) return '-'
      const startDate = new Date(start)
      const endDate = new Date(end)

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return '-'

      const diffMs = endDate.getTime() - startDate.getTime()
      if (diffMs <= 0) return '0s'

      const totalSecs = Math.floor(diffMs / 1000)
      const mins = Math.floor(totalSecs / 60)
      const secs = totalSecs % 60

      return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
    }

    const submissionsComputed = (subData || []).map(sub => {
      // Calculate correct answers from joined data
      const correctCount = sub.answers?.filter((a: any) => a.options?.is_correct).length || 0

      // Calculate automated score for PG: (correct / total) * 100
      // We prioritize stored score if it's > 0, otherwise use calculation
      const totalQ = totalQuestions || 0
      const autoScore = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0
      const finalScore = sub.score !== null && Number(sub.score) > 0 ? Number(sub.score) : autoScore

      return {
        ...sub,
        correct_answers: correctCount,
        score: finalScore,
        work_duration: calculateWorkDuration(sub.started_at, sub.status === 'submitted' ? sub.submitted_at : null)
      }
    })

    // 5. Calculate Stats
    const validScores = submissionsComputed.map(s => Number(s.score))
    const avg = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0
    const high = validScores.length > 0 ? Math.max(...validScores) : 0

    return {
      exam: examData,
      submissions: submissionsComputed,
      has_essay: (essayCount || 0) > 0,
      total_questions: totalQuestions || 0,
      stats: {
        total: subData?.length || 0,
        average: Number(avg.toFixed(1)),
        highest: high
      }
    }
  }, {
    refreshInterval: 5000 // Refresh for monitoring
  })

  return {
    exam: data?.exam,
    submissions: data?.submissions || [],
    has_essay: data?.has_essay || false,
    total_questions: data?.total_questions || 0,
    stats: data?.stats || { total: 0, average: 0, highest: 0 },
    isLoading,
    isError: error,
    mutate
  }
}
