# Changelog

All notable changes to `@oftomorrow/human-agent-chat` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] — 2026-05-16

### Added

- **Dual ESM + CJS output.** The package now ships both `dist/index.js` (ESM) and `dist/index.cjs` (CJS), with per-format type declarations (`.d.ts` for ESM consumers, `.d.cts` for CJS / `moduleResolution: 'node16'` consumers). Matches the `@oftomorrow/effective` packaging pattern.
- `./package.json` export so tooling that resolves the package manifest works without `--export-conditions=development` hacks.

### Changed

- Build moved from Vite library mode to **tsup**. Vite stays on for the `pnpm dev` example playground only.
- `exports` field rewritten with the nested `import` / `require` conditions pattern; `types` declared per-condition.

## [1.0.0] — 2026-05-16

Initial OSS release.

### Added

- Storage-free `<Chat>` component — pluggable backend.
- `useFirebaseChat` hook (subscribes via `onSnapshot`, sends via `addDoc`).
- `useSupabaseChat` hook (subscribes via Realtime channels, sends via `.insert()`).
- @-mention autocomplete with role-aware indicators.
- `Author.type` enum aligned with Core's `chatMessageAuthorTypeSchema` (`user | agent | runner | effective | coo | chair | system`).
- `Message` shape aligned with Core's `chat_messages` columns.
- shadcn/ui primitives vendored under `src/components/ui/`.
- Pre-compiled `dist/styles.css` (Tailwind preflight + shadcn variables + author-type palette).
- `@oftomorrow/effective` audit + verify wired into pre-commit and CI.
