-- =====================================================================
-- Renovu – Supabase schema
-- Cole este arquivo inteiro em: Supabase → SQL Editor → New query → Run
-- (pode rodar mais de uma vez sem problema)
-- =====================================================================

-- ---------- Perfis ----------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  user_number  bigint generated always as identity unique,   -- número público: /users/22
  username     text not null,
  birthday     date,
  gender       smallint check (gender in (2, 3)),             -- 2 = male, 3 = female (igual ao formulário)
  description  text not null default '',
  robux        integer not null default 0,
  created_at   timestamptz not null default now(),
  constraint username_format check (username ~ '^[A-Za-z0-9_]{3,20}$')
);

-- usernames únicos sem diferenciar maiúsculas/minúsculas
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

-- ---------- Amizades --------------------------------------------------
create table if not exists public.friendships (
  requester  uuid not null references public.profiles(id) on delete cascade,
  addressee  uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);

-- ---------- Criar o perfil automaticamente no cadastro ----------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, birthday, gender)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    nullif(new.raw_user_meta_data ->> 'birthday', '')::date,
    nullif(new.raw_user_meta_data ->> 'gender', '')::smallint
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Funções públicas ------------------------------------------
-- O formulário de cadastro usa esta função para avisar "username já existe"
create or replace function public.username_available(p_username text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(p_username)
  );
$$;

-- Lista de amigos aceitos de qualquer usuário (para a página de perfil)
create or replace function public.friends_of(p_user uuid)
returns table (user_number bigint, username text)
language sql
security definer
set search_path = public
stable
as $$
  select p.user_number, p.username
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester = p_user then f.addressee else f.requester end
  where f.status = 'accepted'
    and p_user in (f.requester, f.addressee)
  order by p.username;
$$;

grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.friends_of(uuid)          to authenticated;

-- ---------- Segurança (RLS) -------------------------------------------
alter table public.profiles    enable row level security;
alter table public.friendships enable row level security;

drop policy if exists "profiles: quem esta logado le" on public.profiles;
create policy "profiles: quem esta logado le"
  on public.profiles for select to authenticated using (true);

drop policy if exists "profiles: editar o proprio" on public.profiles;
create policy "profiles: editar o proprio"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- O usuário só pode editar a descrição. Robux, username etc. ficam protegidos.
revoke update on public.profiles from anon, authenticated;
grant  update (description) on public.profiles to authenticated;

drop policy if exists "friendships: ver as proprias" on public.friendships;
create policy "friendships: ver as proprias"
  on public.friendships for select to authenticated
  using (auth.uid() in (requester, addressee));

drop policy if exists "friendships: pedir amizade" on public.friendships;
create policy "friendships: pedir amizade"
  on public.friendships for insert to authenticated
  with check (auth.uid() = requester and status = 'pending');

drop policy if exists "friendships: aceitar" on public.friendships;
create policy "friendships: aceitar"
  on public.friendships for update to authenticated
  using (auth.uid() = addressee) with check (status = 'accepted');

drop policy if exists "friendships: remover" on public.friendships;
create policy "friendships: remover"
  on public.friendships for delete to authenticated
  using (auth.uid() in (requester, addressee));
