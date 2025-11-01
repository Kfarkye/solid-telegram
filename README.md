# Architect Platform — Enhanced Edition

A sophisticated **AI Architecture Platform** featuring a guided wizard, staged reveals, and comprehensive project management:

- **Architect Mode**: Multi-lane AI workflow (spec, sql, ui, test, cicd) with a 5-step guided wizard, powered by Supabase Edge Functions with real-time updates
- **Studio Mode**: Multi-conversation AI chat sandbox with Supabase persistence and cross-device synchronization
- **History Management**: Full project hydration with all lanes and wizard data stored in Supabase
- **Refine Chat**: Context-aware AI assistant for iterating on generated architectures

## Key Features

✨ **5-Step Guided Wizard**: Choose project type, define details, select features, set experience level, and review before generation

🎭 **Staged Reveal Overlay**: Beautiful 4-stage methodology display (Vision → Compose → Validate → Refine) during generation

📜 **Complete History**: All runs stored in Supabase with full project state restoration including wizard data and all lane outputs

💬 **Refine Chat**: Gemini-powered contextual refinement of any lane with full architecture awareness

🎨 **Polished UI**: Gradient backgrounds, smooth animations, status badges, and responsive design throughout

Strict, **no-normalization** model IDs: `GPT-5`, `Gemini-2.5-Pro`, `Claude-4.5-Sonnet`. JSONB wizard_data and metanotes captured for all operations.

## Quick Start

### 0) Prerequisites
- Node 18+
- Supabase CLI (`npm i -g supabase`)
- Supabase project ref + keys
- Provider API keys: `OPENAI_API_KEY`, `GOOGLE_API_KEY` (for Edge Functions), `ANTHROPIC_API_KEY`
- Google API key for client-side Gemini (refine chat): `VITE_GOOGLE_API_KEY`

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
npm i

# Configure .env in project root (already created)
# Required:
#   VITE_SUPABASE_URL=https://your-project.supabase.co
#   VITE_SUPABASE_ANON_KEY=your_anon_key
#   VITE_GOOGLE_API_KEY=your_google_api_key_for_client_side_chat

npm run dev
```

The app will be available at `http://localhost:5173`

### 4) Deploy frontend with Bolt
```bash
# in web/
bolt deploy
```

## Architecture Overview

### Database Schema
- **arch_runs**: Architecture generation runs with vision, status, wizard_data (JSONB), project_name
- **lane_events**: Individual lane outputs (spec, sql, ui, test, cicd) with status and output (JSONB)
- **conversations**: Studio chat conversations with metadata
- **messages**: Studio chat messages with provider tracking
- **metanotes**: JSONB capture of router decisions and metadata

### Edge Functions
- **arch-runner**: Sequential lane generation using multiple AI providers, stores wizard_data and project_name
- **ai-dispatch**: Direct provider calls with strict model IDs
- **llm-router**: Intelligent model selection based on task requirements

### Frontend Components
- **EnhancedArchitectPlatform**: Main platform with mode switching (Architect/Studio)
- **EnhancedWizard**: 5-step guided project configuration
- **EnhancedStagedReveal**: 4-stage methodology overlay during generation
- **EnhancedResults**: Lane results display with copy functionality
- **HistorySidebar**: Full project history with Supabase-backed hydration
- **StudioStorage**: Supabase-based conversation persistence

## Files
```
/supabase
  /functions
    /_shared/{cors.ts,hash.ts,supabase.ts,providers.ts,model-guard.ts,auth.ts}
    /ai-dispatch/index.ts
    /llm-router/index.ts
    /arch-runner/index.ts            # Enhanced with wizard_data support
    /execute-run, /get-status, /process-next, /queue-dispatcher
  /migrations
    20251031_create_architecture_workflow.sql
    20251031_create_metanotes.sql
    20251101_create_mcp_jobs_queue.sql
    20251101_model_constraints.sql
    20251101_add_wizard_and_studio.sql   # NEW: Wizard & Studio tables
  config.toml
/web
  /src
    main.tsx
    EnhancedArchitectPlatform.tsx      # NEW: Main enhanced platform
    TheArchitectPlatform.tsx           # Original (preserved)
    styles.css
    platform.css
    enhanced-platform.css              # NEW: Animations & polish
    /lib
      supabaseClient.ts
      types.ts
    /platform
      types.ts                         # NEW: Shared TypeScript types
      wizardTemplates.ts               # NEW: Project templates & features
      visionGenerator.ts               # NEW: Wizard → vision conversion
      EnhancedWizard.tsx               # NEW: 5-step wizard
      EnhancedStagedReveal.tsx         # NEW: Methodology overlay
      EnhancedResults.tsx              # NEW: Results with refine chat
      HistorySidebar.tsx               # NEW: History with full hydration
      StudioStorage.ts                 # NEW: Supabase-based Studio storage
      AIStudioStorage.ts               # Original localStorage version
      FolderSidebar.tsx
      ResultsContainer.tsx
      StudioChat.tsx
      StagedRevealOverlay.tsx
      useRealtimeLanes.ts
  package.json, tsconfig.json, vite.config.ts, index.html
.env                                   # Includes VITE_GOOGLE_API_KEY
bolt.json, netlify.toml, vercel.json
```

## Usage Guide

### Architect Mode

**Option 1: Guided Wizard**
1. Click "Guided Wizard" button
2. Select project type (SaaS, Marketplace, Social, E-commerce)
3. Enter project name and description
4. Select desired features (auth, payments, email, etc.)
5. Choose experience level (beginner/intermediate/advanced)
6. Review configuration and generate

**Option 2: Direct Vision**
1. Write your vision directly in the textarea
2. Use Cmd/Ctrl+Enter to start generation
3. Watch the staged reveal overlay show progress

**Refining Architecture**
- Use the Refine chat panel to ask questions or request changes
- Context includes all generated lanes and original vision
- Powered by Gemini for contextual understanding

**History**
- Press Cmd/Ctrl+K to open history sidebar
- Click any project to restore full state
- All wizard data and lane outputs preserved

### Studio Mode
- Create conversations for brainstorming
- All messages stored in Supabase
- Promote promising ideas to Architect mode
- Cross-device synchronization enabled

## Environment Variables

```bash
# Supabase (required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Google API Key for client-side refine chat (required)
VITE_GOOGLE_API_KEY=your_google_api_key

# Edge Function secrets (set via Supabase CLI)
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant-...
CORS_ORIGINS=https://your.app,http://localhost:5173
```

