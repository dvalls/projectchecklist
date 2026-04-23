# ProjectChecklist

Aplicação de checklists orientados por projeto, similar ao Google Forms, com:

- Upload de imagens via Supabase Storage
- Formulários categorizados por disciplina
- Layout customizável por campo (1, 2 ou 3 colunas)
- Sequência orientada de formulários por checklist

## Stack

- **Framework:** Next.js 14 (App Router)
- **UI:** shadcn/ui + Tailwind CSS + Radix UI
- **Formulários:** React Hook Form + Zod
- **Auth/DB/Storage:** Supabase (`@supabase/ssr`)
- **Drag & Drop:** `@dnd-kit`

## Setup

```bash
npm install
cp .env.example .env.local
# preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

## Estrutura

```
src/
├── app/
│   ├── (auth)/login/         autenticação
│   └── (dashboard)/          área logada
│       ├── projects/         listagem e criação de projetos
│       ├── disciplines/      disciplinas
│       ├── templates/        form builder
│       └── checklists/       sequências de checklist
├── components/
│   ├── ui/                   shadcn/ui
│   ├── form-builder/         editor de campos
│   └── checklist/            visualizador/preenchimento
├── lib/
│   └── supabase/             clients (browser/server/middleware)
└── middleware.ts
```
