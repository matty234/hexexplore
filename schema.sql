-- Create the hex_explorer table
create table hex_explorer (
  id uuid primary key,
  filename text not null,
  comments jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  user_id uuid references auth.users(id)
);

-- Create policy to allow public read access
create policy "Public read access"
  on hex_explorer
  for select
  using (true);

-- Create policy to allow authenticated users to insert their own files
create policy "Users can insert their own files"
  on hex_explorer
  for insert
  with check (auth.uid() = user_id);

-- Create policy to allow owners to update their files
create policy "Owners can update their files"
  on hex_explorer
  for update
  using (auth.uid() = user_id);

-- Enable RLS
alter table hex_explorer enable row level security;

-- Create storage bucket policies
insert into storage.buckets (id, name, public) values ('hex-files', 'hex-files', true);

-- Allow public read access to files
create policy "Public read access"
  on storage.objects
  for select
  using (bucket_id = 'hex-files');

-- Allow authenticated users to insert files
create policy "Users can upload files"
  on storage.objects
  for insert
  with check (bucket_id = 'hex-files' and auth.role() = 'authenticated'); 