-- Execute DEPOIS do schema.sql. Protege a administração por login + lista de administradores.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;

-- Cada usuário autenticado só consegue verificar se ele próprio está na lista.
drop policy if exists "admin can see own admin flag" on public.admin_users;
create policy "admin can see own admin flag"
  on public.admin_users for select to authenticated
  using (user_id = auth.uid());

-- RLS da tabela acadêmica: só usuários listados em admin_users podem gerenciar registros.
grant select, insert, update, delete on public.registros_academicos to authenticated;

drop policy if exists "admins read academic records" on public.registros_academicos;
create policy "admins read academic records"
  on public.registros_academicos for select to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "admins insert academic records" on public.registros_academicos;
create policy "admins insert academic records"
  on public.registros_academicos for insert to authenticated
  with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "admins update academic records" on public.registros_academicos;
create policy "admins update academic records"
  on public.registros_academicos for update to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "admins delete academic records" on public.registros_academicos;
create policy "admins delete academic records"
  on public.registros_academicos for delete to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- Atualiza automaticamente atualizado_em em alterações.
create or replace function public.set_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;
drop trigger if exists trg_registros_atualizado_em on public.registros_academicos;
create trigger trg_registros_atualizado_em
before update on public.registros_academicos
for each row execute function public.set_atualizado_em();
