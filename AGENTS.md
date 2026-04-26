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
