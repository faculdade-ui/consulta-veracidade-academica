# Consulta Pública de Veracidade Acadêmica — Supabase

Página estática responsiva inspirada na referência enviada, com backend via Supabase Edge Function.

## Estrutura

- `index.html` — interface pública. Recebe apenas URL e chave publicável do Supabase.
- `supabase/schema.sql` — tabela e regras de acesso.
- `supabase/functions/consulta-academica/index.ts` — endpoint servidor para validar os três campos e consultar o banco.
- `supabase/config.toml` — configuração da Edge Function pública.

## 1. Criar projeto Supabase

1. Crie um projeto em https://supabase.com/dashboard.
2. Abra **SQL Editor** e execute todo o conteúdo de `supabase/schema.sql`.
3. Em **Project Settings → API** (ou API Keys), copie a Project URL e a chave **publishable** (ou a antiga `anon`). A chave publicável pode estar no navegador; a chave `secret`/`service_role` nunca.

## 2. Configurar o HTML

Abra `index.html` e substitua:

```js
const SUPABASE_URL = 'COLE_AQUI_A_URL_DO_PROJETO';
const SUPABASE_PUBLISHABLE_KEY = 'COLE_AQUI_A_CHAVE_PUBLICAVEL';
```

Use a URL real do projeto e a chave publicável. Não coloque no HTML a chave `service_role` nem uma chave `secret`.

## 3. Implantar a Edge Function

Requisitos: Node.js e Supabase CLI instalados; autentique-se com `supabase login`.

No terminal, entre na pasta do projeto e execute:

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=SUA_CHAVE_SECRET_OU_SERVICE_ROLE
supabase functions deploy consulta-academica --no-verify-jwt
```

- `SEU_PROJECT_REF` é o identificador do projeto que aparece na URL do painel.
- Para o secret, use a chave secreta administrativa disponível no painel Supabase. Prefira a secret key atual; se seu projeto usa o modelo antigo, a `service_role` também funciona. Guarde-a somente nos secrets do servidor.
- O comando `--no-verify-jwt` é necessário porque a consulta pública não exige login. O endpoint valida os campos e usa a chave administrativa apenas no servidor.

Se a CLI não reconhecer a chave de configuração de `supabase/config.toml`, confira a versão da CLI e mantenha `verify_jwt = false` para esta função. Nunca implante uma função administrativa sem validação equivalente.

## 4. Inserir registros acadêmicos

Cadastre os registros pelo SQL Editor do Supabase ou por uma ferramenta administrativa autenticada. Exemplo apenas para demonstração (não é um registro real):

```sql
insert into public.registros_academicos
(cpf, matricula, codigo_veracidade, nome_aluno, curso, tipo_documento, data_emissao, status, observacao_publica)
values
('52998224725', 'DEMO-2026-001', 'DOC-DEMO-0001', 'ALUNO DE DEMONSTRAÇÃO',
 'Curso de Demonstração', 'Certificado', '2026-10-01', 'valido', 'Registro fictício para teste');
```

Para testar, use CPF, matrícula e código exatamente correspondentes. O CPF do exemplo é usado somente como dado de demonstração; substitua-o por dados fictícios próprios antes de testes reais.

Status aceitos: `valido`, `cancelado`, `suspenso`, `em_analise`, `invalido`.

## 5. Publicar o site

A página é estática: publique `index.html` em Netlify, Vercel, GitHub Pages ou no servidor institucional. Não é necessário instalar bibliotecas no frontend. Depois de publicar, teste uma consulta válida e uma combinação incorreta.

## Segurança e privacidade — antes de produção

- A tabela não tem políticas de leitura pública e os privilégios de `anon`/`authenticated` são revogados. A Edge Function usa o segredo do servidor para consultar.
- A resposta pública devolve somente os campos previstos no código, e uma consulta sem correspondência não informa qual campo falhou.
- A chave publicável pode estar no HTML; a chave secret/service_role nunca pode estar no navegador, repositório ou mensagem pública.
- Este pacote não inclui limite de tentativas por IP. Antes de produção, configure rate limiting/WAF (por exemplo, Cloudflare), monitoramento de abuso, logs sem CPF, política de privacidade e processo de correção/cancelamento dos registros.
- Avalie com o encarregado de dados/jurídico a base legal, a minimização de dados e o prazo de retenção sob a LGPD. Evite retornar CPF completo, endereço, telefone, notas ou histórico escolar completo em consulta pública.
- Não use dados reais de alunos em testes. O registro demonstrativo é fictício.

## Diagnóstico rápido

- **CORS/falha de rede:** confirme a URL do projeto e se a função foi implantada.
- **Serviço indisponível:** confira os secrets e os logs da Edge Function no painel Supabase.
- **Não encontrado:** confira CPF (somente 11 dígitos no banco), matrícula e código; os três devem coincidir exatamente.
- **Erro de permissão:** confirme que executou `schema.sql` e configurou o segredo administrativo no servidor.

## 6. Criar a tela administrativa (login, cadastro, edição e cancelamento)

O arquivo `admin.html` é a tela administrativa. Ele usa Supabase Auth para login e as políticas RLS para permitir operações apenas a usuários incluídos em `public.admin_users`.

### 6.1 Ativar as permissões administrativas

1. No painel Supabase, abra **SQL Editor → New query**.
2. Abra o arquivo `supabase/admin_setup.sql`, copie todo o conteúdo e cole no SQL Editor.
3. Clique em **Run**. Esse SQL cria a lista de administradores e regras RLS para leitura, inserção, edição e exclusão apenas de administradores autorizados.

### 6.2 Criar a conta do administrador

1. No painel, vá para **Authentication → Users**.
2. Clique em **Add user** (ou opção equivalente) e crie uma conta com o e-mail institucional do responsável e uma senha forte.
3. Se o Supabase pedir confirmação de e-mail, confirme a conta conforme as configurações do projeto.
4. Na lista de usuários, copie o UUID/ID dessa conta.
5. No **SQL Editor**, execute este comando substituindo o UUID pelo ID copiado:

```sql
insert into public.admin_users (user_id)
values ('COLE-AQUI-O-UUID-DO-USUARIO');
```

6. Só cadastre nessa tabela pessoas autorizadas a administrar registros acadêmicos. Não crie uma tela pública de inscrição de administradores.

### 6.3 Configurar o arquivo admin.html

1. Abra `admin.html` em um editor de texto (por exemplo, Bloco de Notas ou VS Code).
2. No início do script, localize:

```js
const SUPABASE_URL = 'COLE_AQUI_A_URL_DO_PROJETO';
const SUPABASE_PUBLISHABLE_KEY = 'COLE_AQUI_A_CHAVE_PUBLICAVEL';
```

3. Substitua os valores pela URL do seu projeto e pela chave **publishable** (ou antiga `anon`) do Supabase.
4. Salve o arquivo. **Nunca cole uma chave `service_role` ou `secret` em `admin.html`**.

### 6.4 Abrir e usar a tela administrativa

1. Abra `admin.html` no navegador para um teste local ou publique-o junto com `index.html` no mesmo site.
2. Entre com o e-mail e a senha da conta administrativa que você criou.
3. Preencha CPF, matrícula, código de veracidade, nome, curso, tipo de documento, data de emissão, situação e observação pública.
4. Clique em **Salvar registro**. O registro será gravado na tabela `registros_academicos`.
5. Na lista, use **Editar** para carregar os dados no formulário e salvar alterações. O botão **Cancelar** muda a situação do documento para cancelado; o botão se transforma em **Reativar**.
6. A tela lista até 500 registros por carregamento. Para bases maiores, implemente paginação antes de uso em escala.

### 6.5 Publicar as duas telas

Publique `index.html` e `admin.html` no mesmo diretório de um serviço estático, por exemplo Netlify ou Vercel. A tela pública é a página de consulta; a tela `admin.html` é restrita por login e permissões do banco. Não considere o nome/endereço pouco divulgado como proteção: a segurança depende do login, da lista de administradores e das políticas RLS.

### 6.6 Teste recomendado antes de usar dados reais

- Cadastre um registro inteiramente fictício pelo painel administrativo.
- Abra a página pública e confirme a consulta com os três campos.
- Altere o status para `cancelado` no painel e verifique a situação na consulta pública.
- Teste login com usuário que não está em `admin_users`: ele não deve conseguir listar nem alterar registros.
- Teste em ambiente de desenvolvimento antes de carregar dados reais. Configure limitação de tentativas, monitoramento, política de privacidade e revisão LGPD antes de publicar para o público.

### Observação de segurança

O painel usa login e políticas RLS no banco; esconder o HTML não é um controle de segurança. A chave publishable é pública por desenho. A chave administrativa fica apenas em secrets do servidor usados pela Edge Function de consulta. Não compartilhe senha de administrador e remova imediatamente o acesso de pessoas que não devam mais administrar a base.
