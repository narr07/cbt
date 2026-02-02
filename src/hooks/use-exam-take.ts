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

export interface StudentProfile {
  id: string
  full_name: string
  role: string
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

    // 2.5 Fetch Profile
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', sessionId)
      .single()

    if (profErr || !profile) throw profErr || new Error('Profile not found')

    // 3. Create or Resume Submission FIRST (before fetching questions)
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
        // If already submitted, still fetch questions for review
        // but mark as already submitted
      } else {
        // Load previous answers for in-progress submission
        const { data: prevAns } = await supabase
          .from('answers')
          .select('*')
          .eq('submission_id', existingSub.id)

        if (prevAns) {
          prevAns.forEach(a => answers[a.question_id] = a.pg_option_id)
        }
      }
    } else {
      // Create new submission
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

    // 4. NOW fetch questions via API (submission already exists)
    let questions: Question[] = []

    try {
      const apiResponse = await fetch(`/api/exams/${examId}/questions`, {
        credentials: 'include',
        headers: {
          'Cookie': document.cookie
        }
      })

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json()
        throw new Error(errorData.error || 'Failed to fetch questions')
      }

      const apiData = await apiResponse.json()
      questions = apiData.questions || []
    } catch (apiError) {
      console.error('API fetch error:', apiError)
      throw apiError
    }

    return {
      exam,
      questions,
      submission,
      answers,
      alreadySubmitted: existingSub?.status === 'submitted',
      user: profile as StudentProfile
    }
  }, {
    revalidateOnFocus: false, // Don't revalidate when moving tabs (security)
    shouldRetryOnError: false
  })

  return {
    data: data || { exam: null, questions: [], submission: null, answers: {}, alreadySubmitted: false, user: null },
    isLoading,
    isError: error,
    mutate
  }
}
