-- ============================================
-- CRITICAL RLS POLICIES FOR EXAM SECURITY
-- ============================================
-- Apply these policies untuk mencegah exposure jawaban ujian
-- Hanya untuk table yang CRITICAL untuk keamanan exam

-- ============================================
-- 1. OPTIONS TABLE (MOST CRITICAL)
-- ============================================
-- CRITICAL: Prevent students from seeing is_correct field

-- Drop existing policies if any
drop policy if exists "Students can view options" on options;
drop policy if exists "Public can view options" on options;

-- Block direct client access to options table
-- This prevents students from querying is_correct field
create policy "Block direct client access to options"
  on options for select
  using (
    -- Only allow through server-side (service role)
    -- Students MUST use API route to get options
    false
  );

-- Allow teachers to manage options for their questions
create policy "Teachers can manage question options"
  on options for all
  using (
    exists (
      select 1 from questions q
      join exams e on e.id = q.exam_id
      where q.id = options.question_id
      and e.teacher_id = auth.uid()
    )
  );

-- ============================================
-- 2. QUESTIONS TABLE (CRITICAL)
-- ============================================

-- Drop existing policies if any
drop policy if exists "Students can view exam questions" on questions;
drop policy if exists "Public can view questions" on questions;

-- Block direct client access to questions
create policy "Block direct client access to questions"
  on questions for select
  using (
    -- Only allow service role (API routes)
    false
  );

-- Teachers can manage their exam questions
create policy "Teachers can manage their exam questions"
  on questions for all
  using (
    exists (
      select 1 from exams e
      where e.id = questions.exam_id
      and e.teacher_id = auth.uid()
    )
  );

-- ============================================
-- 3. EXAMS TABLE
-- ============================================

drop policy if exists "Students can view exams" on exams;
drop policy if exists "Public can view exams" on exams;
drop policy if exists "Students can view published exams" on exams;

-- Students can view published exams (needed for API route)
-- IMPORTANT: This allows authenticated users to see published exams
-- The actual question/answer protection is in questions/options tables
create policy "Authenticated users can view published exams"
  on exams for select
  using (
    is_published = true
    and auth.role() = 'authenticated'
  );

-- Teachers can manage their own exams
create policy "Teachers can manage their exams"
  on exams for all
  using (teacher_id = auth.uid());

-- ============================================
-- 4. SUBMISSIONS TABLE
-- ============================================

drop policy if exists "Students manage submissions" on submissions;
drop policy if exists "Public can view submissions" on submissions;

-- Students can only manage their own submissions
create policy "Students can manage their own submissions"
  on submissions for all
  using (student_id = auth.uid());

-- Teachers can view submissions for their exams
create policy "Teachers can view submissions for their exams"
  on submissions for select
  using (
    exists (
      select 1 from exams e
      where e.id = submissions.exam_id
      and e.teacher_id = auth.uid()
    )
  );

-- Teachers can update scores
create policy "Teachers can grade submissions"
  on submissions for update
  using (
    exists (
      select 1 from exams e
      where e.id = submissions.exam_id
      and e.teacher_id = auth.uid()
    )
  );

-- ============================================
-- 5. ANSWERS TABLE
-- ============================================

drop policy if exists "Students manage answers" on answers;
drop policy if exists "Public can view answers" on answers;

-- Students can only manage their own answers
create policy "Students can manage their own answers"
  on answers for all
  using (
    exists (
      select 1 from submissions s
      where s.id = answers.submission_id
      and s.student_id = auth.uid()
    )
  );

-- Teachers can view/grade answers for their exams
create policy "Teachers can view answers for their exams"
  on answers for select
  using (
    exists (
      select 1 from submissions s
      join exams e on e.id = s.exam_id
      where s.id = answers.submission_id
      and e.teacher_id = auth.uid()
    )
  );

create policy "Teachers can grade essay answers"
  on answers for update
  using (
    exists (
      select 1 from submissions s
      join exams e on e.id = s.exam_id
      where s.id = answers.submission_id
      and e.teacher_id = auth.uid()
    )
  );

-- ============================================
-- 6. SUBJECTS TABLE (for exam.subjects relation)
-- ============================================

drop policy if exists "Everyone can view subjects" on subjects;
drop policy if exists "Authenticated can view subjects" on subjects;

-- Allow authenticated users to view subjects (needed for API route)
create policy "Authenticated users can view subjects"
  on subjects for select
  using (auth.role() = 'authenticated');

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify policies are applied:
--
-- SELECT schemaname, tablename, policyname
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND tablename IN ('questions', 'options', 'exams', 'submissions', 'answers');
