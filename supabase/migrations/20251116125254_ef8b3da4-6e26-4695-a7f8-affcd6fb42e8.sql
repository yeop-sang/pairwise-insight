-- pgcrypto 확장 활성화
create extension if not exists pgcrypto;

-- 1) autoscore_runs: 학습 실행 로그 테이블
create table if not exists public.autoscore_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  question_number integer not null,
  model_type text not null,
  params jsonb,
  status text not null,
  metrics jsonb,
  started_at timestamptz default now(),
  finished_at timestamptz,
  error text
);

alter table public.autoscore_runs enable row level security;

-- autoscore_runs 인덱스
create index if not exists idx_autoscore_runs_proj on public.autoscore_runs(project_id, question_number, status);
create index if not exists idx_autoscore_runs_status_running on public.autoscore_runs(status) where status in ('running','pending');

-- autoscore_runs RLS 정책
create policy "Teachers manage autoscore_runs"
  on public.autoscore_runs
  for all
  using (exists (
    select 1 from public.projects p
    where p.id = autoscore_runs.project_id
      and p.teacher_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = autoscore_runs.project_id
      and p.teacher_id = auth.uid()
  ));

create policy "Students read autoscore_runs of active projects"
  on public.autoscore_runs
  for select
  using (exists (
    select 1 from public.projects p
    where p.id = autoscore_runs.project_id
      and p.is_active = true
  ));

create policy "Admins full access autoscore_runs"
  on public.autoscore_runs
  for all
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

-- 2) autoscore_predictions: 예측 기록 테이블
create table if not exists public.autoscore_predictions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  question_number integer not null,
  response_text text not null,
  embedding_vector real[] not null,
  predicted_score real not null,
  scaled_score real not null,
  created_at timestamptz default now()
);

alter table public.autoscore_predictions enable row level security;

-- autoscore_predictions 인덱스
create index if not exists idx_autoscore_preds_proj on public.autoscore_predictions(project_id, question_number);
create index if not exists idx_autoscore_preds_created on public.autoscore_predictions(created_at desc);

-- autoscore_predictions RLS 정책
create policy "Teachers manage autoscore_predictions"
  on public.autoscore_predictions
  for all
  using (exists (
    select 1 from public.projects p
    where p.id = autoscore_predictions.project_id
      and p.teacher_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = autoscore_predictions.project_id
      and p.teacher_id = auth.uid()
  ));

create policy "Students read autoscore_predictions of active projects"
  on public.autoscore_predictions
  for select
  using (exists (
    select 1 from public.projects p
    where p.id = autoscore_predictions.project_id
      and p.is_active = true
  ));

create policy "Admins full access autoscore_predictions"
  on public.autoscore_predictions
  for all
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));