import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

/**
 * GET /api/exams/[examId]/questions
 *
 * Secure endpoint to fetch exam questions for a student
 * - Validates student authentication
 * - Checks exam access (time window, enrollment)
 * - Filters out sensitive fields (is_correct)
 * - Returns safe question data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params

    // Get session from cookie
    const sessionId = request.cookies.get('cbt_session')?.value

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Unauthorized: No session found' },
        { status: 401 }
      )
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // 1. Verify student exists and get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', sessionId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid session' },
        { status: 401 }
      )
    }

    // 2. Fetch exam details
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('*, subjects:subject_id(name)')
      .eq('id', examId)
      .single()

    if (examError || !exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      )
    }

    // 3. Verify exam is published
    if (!exam.is_published) {
      return NextResponse.json(
        { error: 'Exam is not published yet' },
        { status: 403 }
      )
    }

    // 4. Check time window (if set)
    const now = new Date()
    if (exam.start_time && now < new Date(exam.start_time)) {
      return NextResponse.json(
        { error: 'Exam has not started yet' },
        { status: 403 }
      )
    }

    if (exam.end_time && now > new Date(exam.end_time)) {
      return NextResponse.json(
        { error: 'Exam has ended' },
        { status: 403 }
      )
    }

    // 5. Verify student has a submission (started the exam)
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('id, status')
      .eq('exam_id', examId)
      .eq('student_id', sessionId)
      .maybeSingle()

    if (submissionError) {
      return NextResponse.json(
        { error: 'Error checking submission' },
        { status: 500 }
      )
    }

    // If no submission exists, students shouldn't be able to see questions
    if (!submission) {
      return NextResponse.json(
        { error: 'You must start the exam first' },
        { status: 403 }
      )
    }

    // If already submitted, still allow viewing (for review)
    // but we could add logic here to prevent that if needed

    // 6. Fetch questions with options BUT filter out is_correct
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select(`
        id,
        content,
        type,
        points,
        image_url,
        options (
          id,
          content
        )
      `)
      .eq('exam_id', examId)
      .order('order')

    if (questionsError) {
      console.error('Error fetching questions:', questionsError)
      return NextResponse.json(
        { error: 'Error fetching questions' },
        { status: 500 }
      )
    }

    // 7. Return safe data structure
    return NextResponse.json({
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        duration: exam.duration,
        start_time: exam.start_time,
        end_time: exam.end_time,
        subjects: exam.subjects
      },
      questions: questions || [],
      submission: {
        id: submission.id,
        status: submission.status
      }
    })

  } catch (error) {
    console.error('Unexpected error in exam questions API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
