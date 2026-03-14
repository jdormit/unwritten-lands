# AGENTS.md — Unwritten Lands

## Project Overview

Unwritten Lands is a browser-based narrative strategy game built with React, TypeScript, Vite, and Tailwind CSS v4. An LLM (via the Vercel AI SDK and Codex OAuth) procedurally generates world lore, events, and consequences. The player leads a clan through seasons of choices across a 10-year saga.

## Build / Dev / Lint Commands

```bash
npm run dev          # Start Vite dev server on port 5173
npm run build        # Type-check (tsc -b) then bundle with Vite
npm run lint         # ESLint across all .ts/.tsx files
npm run preview      # Serve the production build locally
```

There is no test runner configured. To verify correctness, run the full build:

```bash
npm run build        # Catches both TypeScript and bundling errors
```

## Tech Stack

- **Runtime**: Browser (ES2022 target, DOM APIs)
- **Framework**: React 19 with react-dom
- **Language**: TypeScript 5.9, strict mode
- **Bundler**: Vite 7 with `@vitejs/plugin-react`
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite` plugin, `@import "tailwindcss"` in CSS)
- **AI**: Vercel AI SDK (`ai` package) with `ai-sdk-codex-oauth` for auth
- **Validation**: Zod schemas for LLM structured output
- **Icons**: Lucide React (`lucide-react`)

## Project Structure

```
src/
  App.tsx                  # Root component — phase-based routing via switch
  main.tsx                 # React entry point, wraps App in GameProvider
  index.css                # Tailwind import + custom theme (parchment palette)
  types/
    game.ts                # All game interfaces and type aliases
    schemas.ts             # Zod schemas for LLM structured output
  state/
    game-context.tsx       # React context + provider with useReducer
    game-reducer.ts        # Pure reducer for all game state transitions
  llm/
    auth.ts                # OAuth flow, token caching
    client.ts              # Model factory (createModel)
    calls.ts               # All LLM call functions (generate* and stream*)
    prompts.ts             # System/user prompt builders
    scene-seeds.ts         # Scene seed data
    theme-seeds.ts         # Theme diversity seeds
  hooks/
    usePlayerActions.ts    # Derives available player actions from state
  components/              # Reusable UI components (ResourceBar, GameHeader, etc.)
  screens/                 # Phase-specific screen components
  persistence/
    save.ts                # localStorage save/load with migration
```

## TypeScript Configuration

Strict mode is enabled with these additional checks:
- `noUnusedLocals: true` — no unused variables
- `noUnusedParameters: true` — no unused params (prefix with `_` if intentionally unused)
- `noFallthroughCasesInSwitch: true`
- `verbatimModuleSyntax: true` — use `import type` for type-only imports
- `erasableSyntaxOnly: true`

The project uses project references (`tsconfig.json` references `tsconfig.app.json` and `tsconfig.node.json`). Application code targets ES2022; Vite config targets ES2023.

## Code Style & Conventions

### Imports

- Use `import type { Foo }` for type-only imports (required by `verbatimModuleSyntax`).
- Group imports: React/framework first, then external libs, then internal modules.
- Use relative paths for internal imports (`../types/game`, `./client`).
- Include file extensions in entry-point imports (e.g., `./App.tsx` in `main.tsx`).

### Naming

- **Files**: kebab-case for modules (`game-reducer.ts`, `theme-seeds.ts`), PascalCase for React components (`EventScreen.tsx`, `ResourceBar.tsx`).
- **Types/Interfaces**: PascalCase (`GameState`, `DirectorOutput`, `StreamHandle<T>`).
- **Type aliases for unions**: PascalCase (`Season`, `GamePhase`, `EpilogueOutcome`).
- **Constants**: UPPER_SNAKE_CASE (`INITIAL_RESOURCES`, `SAVE_KEY`, `SEASON_ORDER`, `MODEL_ID`).
- **Functions**: camelCase. Exported React components use named function declarations (`export function GameProvider`). Hooks use `use` prefix (`useGame`, `usePlayerActions`).
- **Props interfaces**: `ComponentNameProps` pattern (`EventScreenProps`, `ResourceBarProps`).
- **Snake_case for domain data**: Game state fields use snake_case to match LLM/JSON schema conventions (`current_year`, `clan_relationships`, `event_history`).

### Components

- Functional components only — no class components.
- Named exports for components (not default), except `App` which uses default export.
- Props defined as an interface directly above the component.
- Use `useCallback` for handlers passed as props. Use `useRef` for mutable values that shouldn't trigger re-renders (abort controllers, timeouts, flags).
- State management via `useReducer` + React context (no Redux or Zustand).

### Styling

- Tailwind CSS v4 utility classes exclusively — no CSS modules, no styled-components.
- Custom theme defined in `src/index.css` under `@theme {}` (parchment palette, accent colors, resource colors, font families).
- Custom CSS classes for animations and complex styles (`.narrative-text`, `.parchment-card`, `.loading-shimmer`).
- Use `font-serif` for narrative text, `font-sans` for UI elements.

### Types & Schemas

- Game types live in `src/types/game.ts`. Zod schemas live in `src/types/schemas.ts`.
- Zod schemas mirror the TypeScript interfaces and are used for LLM structured output validation.
- Use `z.infer<typeof schema>` to derive types from Zod schemas when possible.
- Nullable fields use `.nullable()` in Zod and `| null` in TypeScript (not `undefined`).

### Error Handling

- LLM calls use a `withRetry` wrapper (1 retry by default).
- Null-check LLM output and throw descriptive errors (`"No structured output received from ..."`).
- localStorage operations wrapped in try/catch with `console.error`.
- Components display errors via state (`error` field in GameState or local `useState`).
- Use `console.warn` for retryable failures, `console.error` for terminal failures.

### State Management

- All game state flows through a single `GameState` object managed by `gameReducer`.
- Actions are a discriminated union (`GameAction`) with `type` field.
- The reducer is pure — no side effects. Side effects (saves, LLM calls) happen in components via `useEffect` or callbacks.
- Resource values are clamped to 0-10. Relationship scores clamped to -3 to +3.

### LLM Integration Patterns

- `createModel(auth)` returns a configured AI model instance.
- Non-streaming calls use `generateText` + `Output.object({ schema })`.
- Streaming calls use `streamText` + `Output.object({ schema })` and return a `StreamHandle<T>` with `partialStream`, `finalOutput`, and `abort`.
- Wrap `result.output` (which is `PromiseLike`) with `Promise.resolve()` when assigning to `StreamHandle.finalOutput`.
- System prompts and user prompts are built by separate functions in `prompts.ts`.

### Formatting

- 2-space indentation.
- Double quotes for strings.
- Trailing commas in multi-line structures.
- Section headers use `// ===...===` comment blocks.
- JSDoc-style `/** */` comments for exported functions.
- Inline `//` comments for implementation notes.

## ESLint Configuration

Uses flat config (`eslint.config.js`) with:
- `@eslint/js` recommended rules
- `typescript-eslint` recommended rules
- `eslint-plugin-react-hooks` (flat config)
- `eslint-plugin-react-refresh` (Vite config)
- Applies to `**/*.{ts,tsx}` files; ignores `dist/`

## Common Pitfalls

- `verbatimModuleSyntax` means you must use `import type` for type-only imports or the build will fail.
- Unused parameters must be prefixed with `_` to satisfy `noUnusedParameters`.
- `streamText().output` returns `PromiseLike<T>`, not `Promise<T>` — wrap with `Promise.resolve()` for `StreamHandle` compatibility.
- The game uses snake_case for data model fields (matching JSON/LLM conventions) but camelCase for React/TS code.
