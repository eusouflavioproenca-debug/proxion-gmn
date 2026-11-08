-- Painel Google Meu Negócio (Fernando) — tabelas próprias no mesmo projeto Supabase.
-- NÃO altera a tabela "docs" nem nada do painel principal.
-- Cole tudo no SQL Editor do Supabase e clique em Run (uma vez só).

-- 1) Quem pertence a cada painel
create table if not exists public.paineis (
  user_id uuid primary key references auth.users (id) on delete cascade,
  painel  text not null check (painel in ('principal', 'gmn')),
  nome    text not null default ''
);
alter table public.paineis enable row level security;
drop policy if exists "ve o proprio vinculo" on public.paineis;
create policy "ve o proprio vinculo" on public.paineis for select to authenticated using (user_id = auth.uid());

create or replace function public.meu_painel() returns text
language sql stable security definer set search_path = public as $$
  select painel from public.paineis where user_id = auth.uid()
$$;

-- 2) Dados do painel GMN (só quem é do painel gmn lê e grava)
create table if not exists public.fer_docs (
  path       text primary key,
  colecao    text not null,
  autor      uuid not null default auth.uid() references auth.users (id) on delete set null,
  dados      jsonb not null,
  atualizado timestamptz not null default now()
);
create index if not exists fer_docs_colecao_idx on public.fer_docs (colecao);
alter table public.fer_docs enable row level security;
drop policy if exists "painel gmn" on public.fer_docs;
create policy "painel gmn" on public.fer_docs for all to authenticated
  using (public.meu_painel() = 'gmn') with check (public.meu_painel() = 'gmn');

-- 3) Ponte entre os painéis: cada lado só cria o que sai dele e só decide o que chega para ele
create table if not exists public.ponte (
  id          text primary key,
  tipo        text not null check (tipo in ('site', 'gmn')),
  origem      text not null check (origem in ('principal', 'gmn')),
  destino     text not null check (destino in ('principal', 'gmn')),
  chave       text not null,
  empresa     jsonb not null,
  motivo      text not null default '',
  status      text not null default 'pendente' check (status in ('pendente', 'aceita', 'recusada')),
  criado_por  uuid not null default auth.uid(),
  criado_em   timestamptz not null default now(),
  decidido_em timestamptz,
  unique (destino, tipo, chave)
);
alter table public.ponte enable row level security;
drop policy if exists "ponte ler" on public.ponte;
drop policy if exists "ponte criar" on public.ponte;
drop policy if exists "ponte decidir" on public.ponte;
create policy "ponte ler" on public.ponte for select to authenticated
  using (public.meu_painel() in (origem, destino));
create policy "ponte criar" on public.ponte for insert to authenticated
  with check (public.meu_painel() = origem and origem <> destino);
create policy "ponte decidir" on public.ponte for update to authenticated
  using (public.meu_painel() = destino) with check (public.meu_painel() = destino);

-- Tempo real entre celular e computador
alter table public.fer_docs replica identity full;
do $$ begin alter publication supabase_realtime add table public.fer_docs; exception when duplicate_object then null; end $$;

-- 4) Depois de criar o usuário do Fernando em Authentication → Users, rode (troque o e-mail):
-- insert into public.paineis (user_id, painel, nome)
--   select id, 'gmn', 'Fernando' from auth.users where email = 'EMAIL_DO_FERNANDO'
--   on conflict (user_id) do update set painel = excluded.painel;
--
-- Opcional, para o seu usuário poder aprovar o que vem do Fernando quando a integração for ligada:
-- insert into public.paineis (user_id, painel, nome)
--   select id, 'principal', 'Flávio' from auth.users where email = 'SEU_EMAIL'
--   on conflict (user_id) do update set painel = excluded.painel;
