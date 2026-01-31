'use client'

import useSWR from 'swr'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'

const supabase = createClient()

export interface QuestionOption {
  id: string
  content: string
}

export interface Question {
  id: string
  content: string
  type: 'pg' | 'essay'
  points: number
  image_url?: string
  options: QuestionOption[]
}

export function useExamTake(examId: string) {
  const { data, error, mutate, isLoading } = useSWR(examId ? `exam-take-${examId}` : null, async () => {
    // 1. Get Session
    const sessionId = document.cookie
      .split('; ')
      .find(row => row.startsWith('cbt_session='))
      ?.split('=')[1]

    if (!sessionId) return null

    // 2. Fetch Exam
    const { data: exam, error: examErr } = await supabase
      .from('exams')
      .select('*, subjects:subject_id(name)')
      .eq('id', examId)
      .single()

    if (examErr || !exam) throw examErr || new Error('Exam not found')

    // 3. Fetch Questions
    const { data: questions, error: qErr } = await supabase
      .from('questions')
      .select('*, options(id, content)')
      .eq('exam_id', examId)
      .order('id')

    if (qErr) throw qErr

    // 4. Create or Resume Submission
    const { data: existingSub } = await supabase
      .from('submissions')
      .select('*')
      .eq('exam_id', examId)
      .eq('student_id', sessionId)
      .maybeSingle()

    let submission = existingSub
    const answers: Record<string, string> = {}

    if (existingSub) {
      if (existingSub.status === 'submitted') {
        return { exam, questions: questions as Question[], submission, answers, alreadySubmitted: true }
      }

      // Load previous answers
      const { data: prevAns } = await supabase
        .from('answers')
        .select('*')
        .eq('submission_id', existingSub.id)

      if (prevAns) {
        prevAns.forEach(a => answers[a.question_id] = a.pg_option_id)
      }
    } else {
      const { data: newSub, error: insertError } = await supabase
        .from('submissions')
        .insert([{
          exam_id: examId,
          student_id: sessionId,
          status: 'in_progress',
          score: 0,
          started_at: new Date().toISOString(),
          violations: 0
        }])
        .select()
        .single()

      if (insertError) throw insertError
      submission = newSub
    }

    return {
      exam,
      questions: questions as Question[],
      submission,
      answers,
      alreadySubmitted: false
    }
  }, {
    revalidateOnFocus: false, // Don't revalidate when moving tabs (security)
    shouldRetryOnError: false
  })

  return {
    data: data || { exam: null, questions: [], submission: null, answers: {}, alreadySubmitted: false },
    isLoading,
    isError: error,
    mutate
  }
}
