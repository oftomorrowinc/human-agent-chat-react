# Changelog

All notable changes to `@oftomorrow/human-agent-chat` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] — 2026-06-17

### Fixed

- **Theme leak.** The shipped `dist/styles.css` defined light `:root` design tokens at normal specificity, which overrode a host app's `.dark` tokens (equal specificity → source order → light won), forcing the embedded widget light inside a dark host. The light `:root` defaults are now wrapped in `:where(:root)` (zero specificity), so a host's own `:root` / `.dark` always wins and these apply only as standalone fallbacks. The `.dark` block stays normal-specificity for standalone dark mode.
- **Attachment URL noise.** `MessageItem` rendered detected media URLs as raw text _and_ as inline images. It now routes the displayed text through `processMessageContent`, stripping the URLs so attachments render as images only.

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
