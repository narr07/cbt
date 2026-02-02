-- ============================================
-- UPDATE RLS POLICIES - Fix "Jadwal Belum Ditentukan" Issue
-- ============================================
-- Hanya update 2 policies yang diperlukan untuk fix API route

-- 1. UPDATE EXAMS POLICY
-- Drop existing policy
drop policy if exists "Students can view published exams" on exams;
drop policy if exists "Public can view exams" on exams;
drop policy if exists "Authenticated users can view published exams" on exams;

-- Create new policy with auth check
create policy "Authenticated users can view published exams"
  on exams for select
  using (
    is_published = true
    and auth.role() = 'authenticated'
  );

-- 2. ADD SUBJECTS POLICY (NEW)
drop policy if exists "Everyone can view subjects" on subjects;
drop policy if exists "Authenticated can view subjects" on subjects;
drop policy if exists "Authenticated users can view subjects" on subjects;

-- Allow authenticated users to view subjects
create policy "Authenticated users can view subjects"
  on subjects for select
  using (auth.role() = 'authenticated');

-- ============================================
-- DONE! This should fix the "jadwal belum ditentukan" issue
-- ============================================
