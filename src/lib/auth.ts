import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('cbt_session')?.value

  if (!sessionId) return null

  const supabase = createClient(cookieStore)

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', sessionId)
    .single()

  return profile
}
