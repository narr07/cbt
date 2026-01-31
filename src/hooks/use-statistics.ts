'use client'

import useSWR from 'swr'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

export interface StudentPerformance {
  id: string
  name: string
  classroom: string
  exams_taken: number
  avg_score: number
  status: 'Meningkat' | 'Stabil' | 'Menurun'
}

export function useStatistics() {
  const { data, error, mutate, isLoading } = useSWR('statistics', async () => {
    // 1. Fetch all submissions to calculate school average
    const { data: allSubmissions, error: subErr } = await supabase
      .from('submissions')
      .select('score, student_id, exam_id')

    if (subErr) throw subErr

    // 2. Fetch total students for participation rate
    const { count: studentCount, error: countErr } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student')

    if (countErr) throw countErr

    // 3. Fetch leaderboard data (joined)
    const { data: leaderboardData, error: leaderErr } = await supabase
      .from('submissions')
      .select(`
        score,
        profiles:student_id (id, full_name, classrooms:classroom_id (name))
      `)

    if (leaderErr) throw leaderErr

    // Process school average
    const validScores = allSubmissions.filter(s => s.score !== null).map(s => s.score)
    const schoolAvg = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0

    // Process participation (unique students who submitted / total students)
    const uniqueParticipants = new Set(allSubmissions.map(s => s.student_id)).size
    const participationRate = studentCount ? (uniqueParticipants / studentCount) * 100 : 0

    interface LeaderboardEntry {
      score: number | null
      profiles: {
        id: string
        full_name: string
        classrooms: { name: string } | null
      }
    }

    // Process leaderboard
    const studentStats: Record<string, { name: string, classroom: string, scores: number[], count: number }> = {};

    (leaderboardData as unknown as LeaderboardEntry[]).forEach((sub: LeaderboardEntry) => {
      const studentId = sub.profiles.id
      if (!studentStats[studentId]) {
        studentStats[studentId] = {
          name: sub.profiles.full_name,
          classroom: sub.profiles.classrooms?.name || 'N/A',
          scores: [],
          count: 0
        }
      }
      if (sub.score !== null) {
        studentStats[studentId].scores.push(sub.score)
      }
      studentStats[studentId].count++
    })

    const performance: StudentPerformance[] = Object.entries(studentStats).map(([id, stats]) => {
      const avg = stats.scores.length > 0 ? stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length : 0
      return {
        id,
        name: stats.name,
        classroom: stats.classroom,
        exams_taken: stats.count,
        avg_score: Number(avg.toFixed(1)),
        status: 'Meningkat' as const // Mocking trend for now
      }
    }).sort((a, b) => b.avg_score - a.avg_score)

    return {
      schoolAvg: Number(schoolAvg.toFixed(1)),
      participationRate: Math.round(participationRate),
      performance
    }
  })

  return {
    stats: data || { schoolAvg: 0, participationRate: 0, performance: [] },
    isLoading,
    isError: error,
    mutate
  }
}
