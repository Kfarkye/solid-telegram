# Architect Platform — Supabase + React + Vite (+ Bolt)

A top-level **Platform** that hosts two apps:

- **Architect**: Multi-lane AI workflow (spec, sql, ui, test, cicd) powered by Supabase Edge Function **arch-runner** with **Realtime** lane updates.
- **Studio**: Multi-conversation AI chat sandbox that calls the **llm-router** Edge Function (picks the best model from your strict allowlist).

Strict, **no-normalization** model IDs across the stack: `GPT-5`, `Gemini-2.5-Pro`, `Claude-4.5-Sonnet`.  
JSONB **metanotes** are captured for router calls; lane outputs are JSONB in workflow tables.

## Quick Start

### 0) Prereqs
- Node 18+
- Supabase CLI (`npm i -g supabase`)
- Supabase project ref + keys
- Provider API keys: `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `ANTHROPIC_API_KEY`

### 1) Database
```bash
supabase link --project-ref <YOUR_PROJECT_REF>
supabase db push
```

### 2) Edge Functions
```bash
# Required secrets
supabase secrets set OPENAI_API_KEY=sk-... GOOGLE_API_KEY=AIza... ANTHROPIC_API_KEY=sk-ant-...
# Optional CORS pin
supabase secrets set CORS_ORIGINS=https://your.app,https://localhost:5173

# Deploy functions
supabase functions deploy ai-dispatch
supabase functions deploy llm-router
supabase functions deploy arch-runner
```

### 3) Frontend
```bash
cd web
cp .env.example .env        # Fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm i
npm run dev
```

### 4) Deploy frontend with Bolt
```bash
# in web/
bolt deploy
```

## Files
```
/supabase
  /functions/_shared/{cors.ts,hash.ts,supabase.ts,providers.ts}
  /functions/ai-dispatch/index.ts      # strict pass-through to providers
  /functions/llm-router/index.ts       # heuristic router using strict IDs
  /functions/arch-runner/index.ts      # multi-lane builder → realtime
  /migrations
    20251031_create_metanotes.sql
    20251031_create_architecture_workflow.sql
  config.toml
/web
  package.json, tsconfig.json, vite.config.ts, index.html, .env.example
  /src
    main.tsx
    TheArchitectPlatform.tsx
    styles.css
    platform.css
    /lib/supabaseClient.ts
    /lib/types.ts
    /platform
      AIStudioStorage.ts
      FolderSidebar.tsx
      ResultsContainer.tsx
      StudioChat.tsx
      StagedRevealOverlay.tsx
      useRealtimeLanes.ts
bolt.json
```

