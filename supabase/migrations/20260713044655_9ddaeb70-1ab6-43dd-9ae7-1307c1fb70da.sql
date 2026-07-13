
-- Extensions
create extension if not exists vector;

-- Roles enum + user_roles table
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users can view their own roles" on public.user_roles for select
  to authenticated using (auth.uid() = user_id);
create policy "Admins can view all roles" on public.user_roles for select
  to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can manage roles" on public.user_roles for all
  to authenticated using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "Profiles viewable by owner" on public.profiles for select
  to authenticated using (auth.uid() = id);
create policy "Profiles viewable by admins" on public.profiles for select
  to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Users update own profile" on public.profiles for update
  to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert
  to authenticated with check (auth.uid() = id);

-- Auto-create profile + assign 'user' role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user')
  on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Documents (uploaded PDFs / books / research papers)
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'general',
  storage_path text not null,
  file_size bigint,
  page_count int,
  status text not null default 'processing',
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.documents to authenticated;
grant all on public.documents to service_role;
alter table public.documents enable row level security;

create policy "Authenticated users can view documents" on public.documents for select
  to authenticated using (true);
create policy "Admins can insert documents" on public.documents for insert
  to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update documents" on public.documents for update
  to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete documents" on public.documents for delete
  to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Document chunks with embeddings for RAG
create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.document_chunks to authenticated;
grant all on public.document_chunks to service_role;
alter table public.document_chunks enable row level security;

create policy "Authenticated users can read chunks" on public.document_chunks for select
  to authenticated using (true);
create policy "Admins can insert chunks" on public.document_chunks for insert
  to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete chunks" on public.document_chunks for delete
  to authenticated using (public.has_role(auth.uid(), 'admin'));

create index document_chunks_embedding_idx on public.document_chunks
  using hnsw (embedding vector_cosine_ops);
create index document_chunks_document_id_idx on public.document_chunks(document_id);

-- Semantic search function
create or replace function public.match_document_chunks(
  query_embedding vector(1536),
  match_count int default 5
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float,
  document_title text
)
language sql stable security definer set search_path = public as $$
  select
    c.id, c.document_id, c.content,
    1 - (c.embedding <=> query_embedding) as similarity,
    d.title as document_title
  from public.document_chunks c
  join public.documents d on d.id = c.document_id
  where c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
