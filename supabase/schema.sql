-- CBT OSN SD Supabase Schema

-- Enable necessary Extensions
create extension if not exists "uuid-ossp";

-- Define Roles ENUM
create type user_role as enum ('manager', 'teacher', 'student');

-- Profiles Table (Extends Auth.Users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role user_role not null default 'student',
  avatar_url text,
  bio text,
  class_id uuid, -- For students to link to their classroom
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Classrooms Table
create table classrooms (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  grade_level integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add foreign key to profiles after classrooms exists
alter table profiles add constraint profiles_class_id_fkey foreign key (class_id) references classrooms(id) on delete set null;

-- Subjects Table
create table subjects (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Classroom Subjects (Linking Class, Subject, and Teacher)
create table classroom_subjects (
  id uuid default uuid_generate_v4() primary key,
  classroom_id uuid references classrooms(id) on delete cascade not null,
  subject_id uuid references subjects(id) on delete cascade not null,
  teacher_id uuid references profiles(id) on delete set null,
  unique(classroom_id, subject_id)
);

-- Exams Table
create table exams (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  subject_id uuid references subjects(id) on delete set null,
  teacher_id uuid references profiles(id) on delete cascade not null,
  classroom_id uuid references classrooms(id) on delete cascade,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  duration integer not null default 60, -- minutes
  is_published boolean default false,
  randomize_questions boolean default true,
  randomize_options boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Question Type ENUM
create type question_type as enum ('pg', 'essay');

-- Questions Table
create table questions (
  id uuid default uuid_generate_v4() primary key,
  exam_id uuid references exams(id) on delete cascade not null,
  type question_type not null default 'pg',
  content text not null, -- Question text
  image_url text,
  points integer default 1,
  "order" integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Options Table (For PG)
create table options (
  id uuid default uuid_generate_v4() primary key,
  question_id uuid references questions(id) on delete cascade not null,
  content text not null,
  is_correct boolean default false,
  "order" integer not null default 0
);

-- Exam Submissions
create table submissions (
  id uuid default uuid_generate_v4() primary key,
  exam_id uuid references exams(id) on delete cascade not null,
  student_id uuid references profiles(id) on delete cascade not null,
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  submitted_at timestamp with time zone,
  status text check (status in ('in_progress', 'submitted')) default 'in_progress',
  score numeric(5,2),
  unique(exam_id, student_id)
);

-- Answers
create table answers (
  id uuid default uuid_generate_v4() primary key,
  submission_id uuid references submissions(id) on delete cascade not null,
  question_id uuid references questions(id) on delete cascade not null,
  pg_option_id uuid references options(id) on delete set null, -- For PG
  essay_answer text, -- For Essay
  score numeric(5,2), -- Manual score for Essay
  feedback text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(submission_id, question_id)
);

-- RLS (Row Level Security) - Basic Setup
alter table profiles enable row level security;
alter table classrooms enable row level security;
alter table subjects enable row level security;
alter table classroom_subjects enable row level security;
alter table exams enable row level security;
alter table questions enable row level security;
alter table options enable row level security;
alter table submissions enable row level security;
alter table answers enable row level security;

-- Policies (Simplified for now, will refine as needed)
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);

create policy "Admins can manage classrooms" on classrooms for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'manager')
);
create policy "Classrooms viewable by teachers and students" on classrooms for select using (true);

-- Realtime Configuration
alter publication supabase_realtime add table exams, submissions, answers;
