-- Consulta Pública de Veracidade Acadêmica
-- Execute no SQL Editor do Supabase.
-- IMPORTANTE: cadastre somente registros reais e autorizados pela instituição.

create extension if not exists pgcrypto;

create table if not exists public.registros_academicos (
  id uuid primary key default gen_random_uuid(),
  cpf text not null check (cpf ~ '^[0-9]{11}$'),
  matricula text not null,
  codigo_veracidade text not null,
  nome_aluno text not null,
  curso text,
  tipo_documento text not null,
  data_emissao date,
  status text not null default 'valido' check (status in ('valido', 'cancelado', 'suspenso', 'em_analise', 'invalido')),
  observacao_publica text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint registros_codigo_unique unique (codigo_veracidade),
  constraint registros_matricula_codigo_unique unique (matricula, codigo_veracidade)
);

create index if not exists registros_consulta_idx
  on public.registros_academicos (cpf, matricula, codigo_veracidade);

alter table public.registros_academicos enable row level security;

-- Sem políticas públicas: visitantes não consultam diretamente a tabela.
revoke all on table public.registros_academicos from anon, authenticated;
grant all on table public.registros_academicos to service_role;

comment on table public.registros_academicos is
  'Registros usados pelo endpoint servidor de verificação pública. Não liberar SELECT público.';

-- EXEMPLO OPCIONAL para teste. Substitua todos os dados por dados fictícios próprios.
-- Não use dados reais de alunos em ambientes de demonstração.
-- insert into public.registros_academicos
-- (cpf, matricula, codigo_veracidade, nome_aluno, curso, tipo_documento, data_emissao, status, observacao_publica)
-- values
-- ('52998224725', 'DEMO-2026-001', 'DOC-DEMO-0001', 'ALUNO DE DEMONSTRAÇÃO', 'Curso de Demonstração', 'Certificado', '2026-10-01', 'valido', 'Registro fictício para teste');
