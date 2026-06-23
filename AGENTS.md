# Notas para agentes/contribuidores

## Tipos do banco (Supabase)

Hoje os tipos das tabelas (`ClProject`, `ClPublicLink`, etc.) ficam em
[src/lib/supabase/types.ts](src/lib/supabase/types.ts) escritos à mão. Para
reduzir os `as ClX` espalhados pelo código, gere os tipos diretamente do
schema com a Supabase CLI:

```bash
# uma vez, com o projeto linkado
supabase login
supabase link --project-ref <ref>

# regenerar os tipos
supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```

Em seguida, tipe os clientes Supabase com `Database`:

```ts
import type { Database } from "@/lib/supabase/database.types";

createBrowserClient<Database>(...)
createServerClient<Database>(...)
createClient<Database>(...) // service-role
```

E, gradualmente, troque os `as ClX` por inferência automática
(`Tables<"cl_projects">`).

## Comandos úteis

```bash
npm run dev
npm run lint
npm run typecheck
npm run format
npm run check     # lint + format:check + tsc
```

## Supabase — Segurança e armadilhas conhecidas

### Buckets de Storage

Os dois buckets usados pelo Checklist **precisam ter `public = true`**:

| Bucket | Finalidade |
|--------|-----------|
| `checklist-images` | Fotos enviadas nos formulários pelos clientes |
| `checklist-template-assets` | Imagens embedadas nos templates (lado autor) |

O código usa `/storage/v1/object/public/` via `getPublicAssetUrl()` — esse
endpoint **só funciona com `public = true`**. Se alguém reverter o flag pelo
dashboard, as imagens param de aparecer silenciosamente (sem erro no console do
servidor).

Para verificar/corrigir via SQL:

```sql
UPDATE storage.buckets
   SET public = true
 WHERE id IN ('checklist-images', 'checklist-template-assets');
```

### Políticas RLS de `cl_projects`

O app **compartilha todos os projetos entre todos os usuários autenticados**.
A policy responsável por isso é:

```sql
-- deve existir em cl_projects
CREATE POLICY "cl_projects: authenticated full access"
  ON public.cl_projects FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

Sem essa policy (apenas as `cl_projects_select/insert/update/delete` originais
que gateiam em `created_by = auth.uid()`), cada usuário só enxerga os projetos
que ele mesmo criou.

A função `cl_is_project_owner(project_id)` também checa `created_by =
auth.uid()`, então remover a policy acima quebra em cascata o acesso a
templates (`cl_form_templates`) e submissões (`cl_form_submissions`).

> **Regra:** nunca remover ou restringir `cl_projects` via dashboard sem criar
> uma migration correspondente e testar com dois usuários distintos.

## Convenções

- Validação de inputs server: schemas em `src/lib/schemas/*` (Zod) +
  `safeParse` + `fail(parsed.error.issues[0].message)`.
- Server Actions retornam `ActionResult<T>` ou tipos `as const` legados.
  Use `assertUser(supabase)` para checagem de auth e `ok`/`fail` em
  `src/lib/server-action.ts`.
- URLs públicas de Storage: `getPublicAssetUrl` / `getPublicBucketBaseUrl`
  em `src/lib/storage.ts` (não montar `${URL}/storage/v1/...` na mão).
- Datas em pt-BR: `formatDateTime` / `formatDate` em `src/lib/format.ts`.
- Iniciais para avatares: `getInitials` (nome) ou `getInitialsFromEmail`
  (e-mail), em `src/lib/format.ts`.
- Resolução de link público: `getActivePublicLink(token)` em
  `src/lib/public-link.ts` (devolve `not-found | inactive | ok`).

## Campos radio em matrizes (`radioGroupName`)

Quando um campo `radio` aparece dentro de um `MatrixRenderer` (campo repetido
por linha de item), **cada linha precisa de um `name` único** para os inputs,
caso contrário o browser trata todos os radios de todas as linhas como parte
do mesmo grupo — impedindo a seleção independente por linha.

A prop `radioGroupName` foi adicionada em `FieldInputControl` e no `FieldInput`
de `public-forms-flow.tsx`. O caller passa a chave da linha (ex.: `key` no
`MatrixRenderer`):

```tsx
<FieldInputControl
  field={field}
  value={values[key]}
  radioGroupName={key}   // <— garante isolamento por linha
  onChange={(patch) => onChange(key, patch)}
/>
```

Sem essa prop, o `name` cai de volta para `field.id` (comportamento correto
fora de matrizes).

## Relatório PDF (`report-document.tsx`)

Os estilos do relatório usam três tokens de cor centralizados no topo do
arquivo — ajuste-os lá, não espalhe valores literais:

```ts
const ACCENT       = "#475569"; // slate-600 — barras e bordas
const ACCENT_DARK  = "#1e293b"; // slate-800 — texto forte
const ACCENT_LIGHT = "#f1f5f9"; // slate-100 — fundos suaves
```

O **header fixo** das páginas internas usa margem negativa para sangrar além
do padding da página. As constantes `PAGE_PADDING_TOP` e `PAGE_PADDING_H`
devem ser mantidas em sincronia com o `paddingTop`/`paddingHorizontal` do
estilo `page`.
