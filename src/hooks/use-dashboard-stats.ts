'use client'

import useSWR from 'swr'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

// Type for the submission object nested within a profile
interface SubmissionForProfile {
  id: string;
  status: 'in_progress' | 'logged_in' | 'submitted' | 'graded'; // Assuming these are the possible statuses
  exam_id: string;
  exams: { title: string } | null; // exams(title) will return an object with title or null
  violations: number;
}

// Type for the profile object fetched within a classroom
interface ProfileWithSubmissions {
  id: string;
  full_name: string;
  last_online_at: string | null;
  submissions: SubmissionForProfile[];
}

// Type for the student object returned in classroomGroups
interface DashboardStudent {
  id: string;
  full_name: string;
  status: 'online' | 'in_progress' | 'submitted' | 'offline';
  exam_title: string | undefined;
  answer_count: number;
  total_questions: number;
  violations: number;
  last_online_at: string | null;
  submission_id: string | undefined;
}

// Type for a classroom group
interface ClassroomGroup {
  id: string;
  name: string;
  students: DashboardStudent[];
}

export interface RecentSubmission {
  id: string;
  updated_at: string;
  profiles: { full_name: string } | null;
  exams: { title: string } | null;
}

export function useDashboardStats() {
  const { data, error, mutate, isLoading } = useSWR('dashboard-stats', async () => {
    // 1. Fetch Stats Counts
    const [examRes, studentRes, submissionRes, classroomRes] = await Promise.all([
      supabase.from('exams').select('id', { count: 'exact', head: true }).eq('is_published', true),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
      supabase.from('classrooms').select('id', { count: 'exact', head: true })
    ])

    const counts = {
      exams: examRes.count || 0,
      students: studentRes.count || 0,
      submissions: submissionRes.count || 0,
      classrooms: classroomRes.count || 0
    }

    // 2. Fetch Classrooms and Students
    const { data: classrooms } = await supabase.from('classrooms').select('id, name').order('name')

    let classroomGroups: ClassroomGroup[] = []
    if (classrooms) {
      classroomGroups = await Promise.all(classrooms.map(async (cls) => {
        const { data: profiles } = await supabase
          .from('profiles')
          .select(`
            id, full_name, last_online_at,
            submissions(id, status, exam_id, exams(title), violations)
          `)
          .eq('classroom_id', cls.id)
          .eq('role', 'student')
          .order('full_name')

        const students = await Promise.all((profiles || []).map(async (profile) => {
          const activeSub = (profile.submissions as unknown as SubmissionForProfile[])?.find((s) =>
             s.status === 'in_progress' || s.status === 'logged_in'
          )

          let ansCount = 0
          let qCount = 0

          if (activeSub) {
            const [ansRes, qRes] = await Promise.all([
              supabase.from('answers').select('id', { count: 'exact', head: true }).eq('submission_id', activeSub.id),
              supabase.from('questions').select('id', { count: 'exact', head: true }).eq('exam_id', activeSub.exam_id)
            ])
            ansCount = ansRes.count || 0
            qCount = qRes.count || 0
          }

          const isOnline = profile.last_online_at && (new Date().getTime() - new Date(profile.last_online_at).getTime() < 5 * 60000)

          let status: 'online' | 'in_progress' | 'submitted' | 'offline' = 'offline'
          if (activeSub?.status === 'in_progress') status = 'in_progress'
          else if (isOnline) status = 'online'

          return {
            id: profile.id,
            full_name: profile.full_name,
            status,
            exam_title: activeSub?.exams?.title,
            answer_count: ansCount,
            total_questions: qCount,
            violations: activeSub?.violations || 0,
            last_online_at: profile.last_online_at,
            submission_id: activeSub?.id
          }
        }))

        return { id: cls.id, name: cls.name, students }
      }))
    }

    // 3. Fetch Recent Submissions
    const { data: recentSubmissions } = await supabase
      .from('submissions')
      .select(`
        id, updated_at,
        profiles!student_id(full_name),
        exams(title)
      `)
      .eq('status', 'submitted')
      .order('updated_at', { ascending: false })
      .limit(6)

    return {
      counts,
      classroomGroups,
      recentSubmissions: (recentSubmissions || []).map(sub => ({
        ...sub,
        profiles: Array.isArray(sub.profiles) ? sub.profiles[0] : sub.profiles,
        exams: Array.isArray(sub.exams) ? sub.exams[0] : sub.exams
      })) as RecentSubmission[]
    }
  }, {
    refreshInterval: 5000 // Refresh every 5 seconds
  })

  return {
    data,
    isLoading,
    isError: error,
    mutate
  }
}
