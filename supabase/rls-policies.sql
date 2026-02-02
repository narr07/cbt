-- Additional RLS Policies for Enhanced Security

-- ============================================
-- EXAM QUESTIONS SECURITY
-- ============================================

-- Prevent direct access to questions table from client
-- Questions should only be accessed via API routes
drop policy if exists "Students can view exam questions" on questions;

create policy "Block direct client access to questions"
  on questions for select
  using (
    -- Only allow service role (server-side)
    auth.role() = 'service_role'
  );

-- Allow teachers to manage their own exam questions
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
-- OPTIONS SECURITY (CRITICAL)
-- ============================================

-- CRITICAL: Prevent students from seeing is_correct field
-- Options should ONLY be accessed via secure API routes
drop policy if exists "Students can view options" on options;

create policy "Block direct client access to options"
  on options for select
  using (
    -- Only allow service role (server-side API calls)
    auth.role() = 'service_role'
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
-- EXAMS SECURITY
-- ============================================

-- Students can view published exams for their classroom
create policy "Students can view published exams for their classroom"
  on exams for select
  using (
    is_published = true
    and exists (
      select 1 from profiles p
      where p.id = auth.uid()
      and (p.class_id = exams.classroom_id or exams.classroom_id is null)
    )
  );

-- Teachers can manage their own exams
create policy "Teachers can manage their exams"
  on exams for all
  using (teacher_id = auth.uid());

-- ============================================
-- SUBMISSIONS SECURITY
-- ============================================

-- Students can only view/modify their own submissions
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

-- Teachers can update scores for their exams
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
-- ANSWERS SECURITY
-- ============================================

-- Students can only access their own answers
create policy "Students can manage their own answers"
  on answers for all
  using (
    exists (
      select 1 from submissions s
      where s.id = answers.submission_id
      and s.student_id = auth.uid()
    )
  );

-- Teachers can view answers for their exams
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

-- Teachers can update scores for essay answers
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
-- SUBJECTS SECURITY
-- ============================================

create policy "Everyone can view subjects"
  on subjects for select
  using (true);

create policy "Only managers can manage subjects"
  on subjects for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'manager'
    )
  );

-- ============================================
-- CLASSROOM_SUBJECTS SECURITY
-- ============================================

create policy "Everyone can view classroom subjects"
  on classroom_subjects for select
  using (true);

create policy "Only managers and assigned teachers can manage classroom subjects"
  on classroom_subjects for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and (role = 'manager' or id = classroom_subjects.teacher_id)
    )
  );
