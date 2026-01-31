'use client'

import useSWR from 'swr'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

export function useSubmissionDetail(submissionId: string) {
  const { data, error, mutate, isLoading } = useSWR(`submission-${submissionId}`, async () => {
    // 1. Fetch Submission Info
    const { data: subData, error: subErr } = await supabase
      .from('submissions')
      .select(`
        *,
        profiles:student_id (full_name),
        exams:exam_id (title)
      `)
      .eq('id', submissionId)
      .single()

    if (subErr) throw subErr

    // 2. Fetch Answers
    const { data: ansData, error: ansErr } = await supabase
      .from('answers')
      .select(`
        question_id,
        pg_option_id,
        questions:question_id (
          content,
          image_url,
          options (id, content, is_correct)
        )
      `)
      .eq('submission_id', submissionId)

    if (ansErr) throw ansErr

    return {
      submission: subData,
      answers: (ansData || []).map((ans: any) => ({
        ...ans,
        questions: Array.isArray(ans.questions) ? ans.questions[0] : ans.questions
      })) as any
    }
  })

  return {
    submission: data?.submission,
    answers: data?.answers || [],
    isLoading,
    isError: error,
    mutate
  }
}
