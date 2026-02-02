/* eslint-disable @typescript-eslint/no-explicit-any */
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

    // 3. Get Total Questions for this exam
    const { count: totalQuestions } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('exam_id', subData.exam_id)

    const processedAnswers = (ansData || []).map((ans: any) => ({
      ...ans,
      questions: Array.isArray(ans.questions) ? ans.questions[0] : ans.questions
    }))

    // 4. Compute Score
    const correctCount = processedAnswers.filter((ans: any) => {
      const correctOpt = ans.questions?.options?.find((o: any) => o.is_correct)
      return ans.pg_option_id === correctOpt?.id
    }).length

    const totalQ = totalQuestions || 0
    const autoScore = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0
    const finalScore = (subData.score !== null && Number(subData.score) > 0) ? Number(subData.score) : autoScore

    return {
      submission: {
        ...subData,
        score: finalScore,
        correct_answers: correctCount,
        total_questions: totalQ
      },
      answers: processedAnswers
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
