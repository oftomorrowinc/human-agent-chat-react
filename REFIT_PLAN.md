# Refit Plan — human-agent-chat-react

You're working on a substantive refit pass to bring this library to open-source-ready state. It's Todd's prior art (built ~2024) that he wants to ship as `@oftomorrow/human-agent-chat` on npm. (Package name drops the `-react` suffix — it's a React component library, mention that in the `description` field, not the name. The repo directory `human-agent-chat-react` stays as-is for now.) It will become the chat surface in Core 2.0's hub UI — humans, AI agents, and system messages threading together on a workflow job's chat.

This refit is bigger than the sibling `zod-form-react` refit. There, the core renderer was already storage-free and we mostly cleaned up packaging. Here, the storage coupling runs deep through the main component and needs surgical extraction.

This doc is your full brief. Read it, execute it, ship.

## Current state

- `src/components/ChatUI.tsx` is the main entry. It directly imports `collection`, `onSnapshot`, `addDoc`, `serverTimestamp` from `firebase/firestore` (lines 1-13) and calls `getDb()` for a singleton. The realtime subscription, message send, and access-control are all welded to Firestore.
- `src/components/MessageItem.tsx` is the per-message renderer — solid, role-based avatar coloring, well-built. This is the part most worth keeping intact.
- `src/utils/access-control.ts` queries Firestore `members` subcollections hierarchically. Core uses Supabase RLS, so this whole abstraction goes.
- `src/utils/mention-helpers.ts` (or similar) — @-mention autocomplete with role indicators. Reusable.
- `src/utils/media-helpers.ts` — file/image renderers. Reusable.
- Build: **Create React App** (`react-scripts ^5.0.1`). CRA is deprecated upstream. Needs to move to Vite.
- TypeScript pinned to `^4.9.5`. Core uses 5.x.
- `firebase ^10.7.0`, `date-fns ^2.30.0`, `lucide-react ^0.294.0` — all materially stale.
- `package.json` says `"private": true` — never published.
- Demo users are hard-coded inline in `ChatUI.tsx` (lines 107-136 area) — a smell that should go.
- Tests exist for `FormModal`, `MessageItem`, `Modal`, `access-control`, `media-helpers`, `message-helpers`. They'll need updating when the access-control system goes away and the ChatUI shape changes.

## Architectural target

The public API after refit:

```tsx
import { Chat, type Message, type Author } from '@oftomorrow/human-agent-chat';

<Chat
  messages={messages}             // Message[] — caller provides via their data layer
  currentAuthor={currentAuthor}   // Author — who's typing
  onSend={(draft) => { ... }}     // Promise<void> — caller persists
  className="..."                 // optional Tailwind classes for layout
/>
```

The component does NOT subscribe to anything. It does NOT call any database directly. It does NOT do access control. The caller wires up:

- Realtime subscription (Supabase Realtime, Firebase onSnapshot, polling — whatever the consumer wants)
- The send call (write to wherever)
- Access control (decide whether to render the chat at all)

A separate **optional** entry point ships backend-specific hooks:

```tsx
// Firebase consumers
import { useFirebaseChat } from '@oftomorrow/human-agent-chat/firebase';

// Supabase consumers (Core uses this)
import { useSupabaseChat } from '@oftomorrow/human-agent-chat/supabase';
```

These hooks return `{ messages, currentAuthor, onSend }` props ready to spread into `<Chat>`. They're convenience layers, not load-bearing.

## Concrete change list

### 1. Migrate build: CRA → Vite

CRA is deprecated upstream and the existing `react-scripts ^5` toolchain is end-of-life. Replace with Vite + a library build mode.

- Delete `react-scripts` + its config
- Add Vite + `vite-plugin-dts` (for type declarations) + `@vitejs/plugin-react`
- Create `vite.config.ts` with library mode targeting both ESM and CJS outputs, plus `.d.ts` generation
- The `examples/` directory probably runs the CRA dev server today; rebuild it as a Vite dev playground (`pnpm dev` runs the example chat against a mocked message array)
- Drop `jest` if it's there; use Vitest for the new test runner (matches Core)

### 2. Modernize TypeScript + React types

- TypeScript → `^5.x`
- `@types/react` → `^19.x` (or whatever Core's apps/web uses)
- `lucide-react` → latest
- `date-fns` → `^3.x` (v3 has small breaking changes, but the date formatting in this library is minimal — should be a 5-minute fix)

### 3. Extract storage from `ChatUI.tsx`

Current `ChatUI.tsx` does:

- Subscribes to Firestore via `onSnapshot`
- Calls `addDoc` on send
- Calls `getDb()` for the singleton
- Hard-codes demo users
- Includes the message list + composer + mention autocomplete

Refactor into:

```tsx
// New shape — no Firebase imports
export function Chat({
  messages,
  currentAuthor,
  onSend,
  mentionableAuthors,        // optional Author[] — drives @-mention autocomplete
  className,
}: ChatProps): JSX.Element { ... }
```

`messages` is the full message list (caller provides). The component renders all of them, scrolls to bottom on new messages, and that's it for subscription concerns.

`mentionableAuthors` replaces the hard-coded demo users. Caller passes the list of people/agents the user can mention; the autocomplete uses it directly.

`onSend` is called with a `MessageDraft` (no `id`, no `createdAt` — caller fills those in when persisting).

Move the Firestore-specific code into `src/firebase/useFirebaseChat.ts`. This hook returns the props `<Chat>` needs:

```tsx
export function useFirebaseChat(firebasePath: string): {
  messages: Message[];
  currentAuthor: Author;
  onSend: (draft: MessageDraft) => Promise<void>;
};
```

Add `src/supabase/useSupabaseChat.ts` as a stub OR a full implementation if you have time. The shape:

```tsx
export function useSupabaseChat({
  client, // SupabaseClient
  subjectType, // 'job' | 'project' | ...
  subjectId, // ULID
  currentAuthor,
}): { messages; currentAuthor; onSend };
```

Internally: query `chat_messages` rows by `subject_type` + `subject_id`, subscribe via Supabase Realtime, on send call `db.createChatMessage(...)`. Map Supabase rows to the library's `Message` type.

If you can't ship the Supabase hook in this pass, leave a `src/supabase/README.md` explaining the contract + a clear TODO. Core's Phase 4 team will fill it in.

### 4. Delete `AccessControl` entirely

`src/utils/access-control.ts` and any imports of it from elsewhere go away.

If the chat component currently shows/hides itself based on access checks, that logic moves to the consumer. The library renders what it's given.

If there are tests for access-control, delete them. Don't preserve them in some "legacy" location.

### 5. Drop demo users from `ChatUI.tsx`

The hard-coded user list inside `ChatUI.tsx` (around lines 107-136) goes away. The replacement is the `mentionableAuthors` prop on `<Chat>`. The `examples/` directory becomes the place where demo users are defined — for example uses only, not the component.

### 6. Message + Author type shape

Current `Message` type carries `fromAiAgent` / `toAiAgent` flags. Core's substrate uses a more general shape: `author_type: 'user' | 'agent' | 'runner' | 'effective' | 'coo' | 'chair' | 'system'`. Update the type to:

```ts
export interface Author {
  id: string;
  name: string;
  type: 'user' | 'agent' | 'runner' | 'effective' | 'coo' | 'chair' | 'system';
  avatar?: string; // optional URL
}

export interface Message {
  id: string;
  author: Author; // or: authorId: string + lookup table on the side
  recipient?: string | null; // '@<role>' or '@<user>' — drives mention rendering
  content: string;
  createdAt: number; // epoch ms
  status?: 'summary' | 'request' | 'blocked'; // optional, matches Core's chat_messages.status
  metadata?: Record<string, unknown>;
}

export interface MessageDraft extends Omit<Message, 'id' | 'createdAt'> {}
```

This aligns the library with Core's `chat_messages` shape directly, so the Supabase hook's mapping is one-to-one.

`MessageItem.tsx`'s avatar coloring logic needs an update: rather than special-casing `fromAiAgent`, color by `author.type`. Keep the existing palette (green=self, purple=agent, etc.) but key it off `author.type` instead of the boolean flag.

### 7. Mention autocomplete

The @-mention system stays — it's a real differentiator. Update it to use `mentionableAuthors: Author[]` passed in by the consumer. The author type indicator in the dropdown (the small role label next to the name) stays.

When the user picks a mention, the composer inserts `@<name>` text AND sets `draft.recipient = '@<author-handle>'` on the message draft. The caller's `onSend` writes both `content` and `recipient` to whatever backend.

### 8. Package metadata

```json
{
  "name": "@oftomorrow/human-agent-chat",
  "version": "1.0.0",
  "private": false,
  "publishConfig": { "access": "public" },
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" },
    "./firebase": { "import": "./dist/firebase/index.js", "types": "./dist/firebase/index.d.ts" },
    "./supabase": { "import": "./dist/supabase/index.js", "types": "./dist/supabase/index.d.ts" },
    "./styles.css": "./dist/styles.css"
  }
}
```

Peer deps:

- `react: ">=18"`, `react-dom: ">=18"` — required
- `firebase: ">=10"` — optional (for `/firebase` entry)
- `@supabase/supabase-js: ">=2"` — optional (for `/supabase` entry)

Drop `firebase` and any Firebase-related deps from `dependencies`. Move to `peerDependenciesMeta.firebase.optional`.

### 9. Styles

Tailwind. shadcn/ui-compatible (rounded borders, focus rings, the standard look) but DON'T import shadcn — style with raw Tailwind so consumers can theme via their own setup.

Export `dist/styles.css` for consumers who want our look:

```ts
import '@oftomorrow/human-agent-chat/styles.css';
```

Drop side-effect imports from `src/index.ts`.

### 10. Update tests

After the refactor:

- Keep `MessageItem` tests; update for the new `Author.type` shape
- Keep media-helpers, message-helpers, mention-helpers tests
- Delete access-control tests entirely
- Add tests for the new `<Chat>` component: renders given messages, calls `onSend` with the right draft, scrolls on new message, opens mention dropdown on `@`, picks mention correctly
- Add tests for `useFirebaseChat` with `firebase-mock` (or whatever lightweight mock fits) if reasonable
- Add tests for `useSupabaseChat` if you ship it

Vitest + React Testing Library.

### 11. README rewrite

Sections:

1. **What it does** — chat UI that supports humans, AI agents, and system messages with realtime + @-mentions
2. **Quick start** — install + simplest possible `<Chat>` with hard-coded messages
3. **With Firebase** — `useFirebaseChat` hook
4. **With Supabase** — `useSupabaseChat` hook
5. **Rolling your own backend** — the props contract + how to write a hook that returns the right shape
6. **Customization** — author types, theming, mention autocomplete
7. **API reference**

Drop all Firebase-first framing from the existing README. The new framing is "pluggable-backend chat with realtime + agent-aware rendering."

### 12. Code quality stack — `@oftomorrow/effective` + prettier + coverage

Match Core's stack (the same stack the `zod-form` refit lands on). Four pieces:

**Effective audit (pre-commit).** Install `@oftomorrow/effective` (current version `0.1.0-rc.5` — check npm for the latest at refit time). Add a minimal `effective.config.ts` declaring this library's roles (something like `library-code` + `library-tests`). Wire husky pre-commit to run `pnpm exec effective audit --fix` — auto-fixes what it can, surfaces real findings, blocks the commit on hard-fails.

**Effective verify (CI).** GitHub Actions workflow runs `pnpm exec effective verify --against ${{ github.base_ref }}` on every PR. This is the diff-only verification path — fires the seven diff-only rules + toolchain-included rules (lint/typecheck/test/coverage results threaded in via `toolchainResults`).

**Prettier.** `.prettierrc` (single quotes, semi: true, printWidth: 100, trailingComma: 'all' — match Effective + Core). `pnpm format` (writes) + `pnpm format:check` (CI). Husky pre-commit auto-formats staged files via `lint-staged`. Use `eslint-config-prettier` to disable ESLint rules that overlap with Prettier formatting.

**Coverage threshold.** Vitest `--coverage` (v8). Target ≥80% lines, ≥80% functions, ≥75% branches on `<Chat>` + `MessageItem` + mention-helpers + message-helpers + media-helpers. The optional `useFirebaseChat` / `useSupabaseChat` hooks can run lower (~60%) since they're optional code paths. Threshold enforcement in `vitest.config.ts` `coverage.thresholds`.

### 13. CI workflow

Single GitHub Actions workflow on PR + push to main. Job steps:

1. `pnpm install --frozen-lockfile`
2. `pnpm format:check`
3. `pnpm lint`
4. `pnpm typecheck`
5. `pnpm test --coverage`
6. `pnpm build`
7. `pnpm exec effective verify --against ${{ github.base_ref }}` (PR only; on push to main, skip — verify is for diffs)

Use `actions/setup-node@v4` + `pnpm/action-setup@v3`. Cache the pnpm store. Match the Effective + zod-form style.

## Acceptance criteria

You're done when ALL of these are true:

- [ ] `pnpm install` from a fresh checkout completes; no `react-scripts`, no `firebase-admin`, no CRA
- [ ] A consumer can `pnpm add @oftomorrow/human-agent-chat` and use `<Chat>` with zero Firebase or Supabase code in their bundle
- [ ] `useFirebaseChat` works from `@oftomorrow/human-agent-chat/firebase` (consumers add `firebase` as a separate install)
- [ ] `useSupabaseChat` exists EITHER as a working hook OR as a documented stub
- [ ] `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test --coverage`, `pnpm build` all clean
- [ ] Coverage thresholds met (≥80% lines/functions, ≥75% branches on `<Chat>`, `MessageItem`, mention/message/media helpers)
- [ ] At least one integration-style test wires `<Chat>` end-to-end: renders a non-trivial message list → user types a message that mentions another author → submits → `onSend` fires with correct `content` + `recipient` shape
- [ ] `@oftomorrow/effective` installed; `effective.config.ts` declares the library's roles; husky pre-commit runs `effective audit --fix`; CI runs `effective verify --against <base>` and the PR gate passes
- [ ] `<Chat>` accepts `messages`, `currentAuthor`, `onSend`, `mentionableAuthors` — no internal database calls
- [ ] `AccessControl` deleted
- [ ] Demo users moved to `examples/`
- [ ] `Author.type` enum aligned with Core's vocabulary (`user | agent | runner | effective | coo | chair | system`)
- [ ] `Message` shape aligned with Core's `chat_messages` columns
- [ ] README rewritten around pluggable-backend
- [ ] Package name `@oftomorrow/human-agent-chat` (description mentions React), version `1.0.0`, `private: false`
- [ ] Vite-based build with `library` mode producing both ESM + CJS
- [ ] Vitest as test runner
- [ ] ShadCN primitives vendored into `src/components/ui/` via the ShadCN CLI; `<Chat>`, `MessageItem`, and the composer compose them rather than rolling their own card/avatar/input/etc.
- [ ] `dist/styles.css` bundles Tailwind preflight + standard ShadCN CSS variables; README documents the consumer's Tailwind `content` requirement

When done: `pnpm publish --dry-run` and verify. DON'T actually publish — Todd will do that step.

## Questions you might have

**Q: The current code uses `firebasePath: string` as the conversation identifier. What's the new identifier?**
There isn't one inside the library. `<Chat>` doesn't need a conversation ID — it just renders whatever `messages` it's given. The caller's hook (e.g., `useSupabaseChat`) takes a subject identifier (Core uses `subject_type` + `subject_id`) and resolves it internally. The library doesn't know about that abstraction.

**Q: What about message threading / replies?**
Current code doesn't support threading. The new library doesn't either. Threading is in the "future" bucket — design it later when there's a real use case. Don't try to add it preemptively.

**Q: What if the Supabase Realtime API is different from `onSnapshot`?**
It is. Supabase Realtime uses channels: `client.channel(...).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: 'subject_id=eq.<id>' }, callback).subscribe()`. The hook should set up the subscription on mount and clean up on unmount, dedupe with `select()` of the initial set on first load. There are examples on the Supabase site; mirror them.

**Q: Stale demo users hardcoded in `ChatUI.tsx` — should I migrate them or delete?**
Delete. They were for the original developer demo. The `examples/` directory should have its own demo user list for the new playground.

**Q: What if the existing `Message` type has fields I want to keep?**
Keep them, add them to the new `Message` type. The structural list above is the minimum, not the maximum. Reasonable additions: `editedAt`, `deleted`, `reactions`, etc. — keep what's there if it's useful, drop what's dead.

**Q: shadcn — vendor it, or skip?**
**Vendor it.** Run `pnpm dlx shadcn@latest init` to bootstrap the standard ShadCN folder structure inside `src/components/ui/`, then `pnpm dlx shadcn@latest add card avatar button input badge dropdown-menu scroll-area` (plus any others the chat surface needs). The CLI drops the source files into `src/components/ui/` — you own them, edit freely. `<Chat>`, `MessageItem`, and the composer should COMPOSE these ShadCN primitives rather than rolling their own card/avatar/input/etc.

What goes in `dependencies` (standard ShadCN companions):

- `class-variance-authority` — variant-based styling
- `clsx` + `tailwind-merge` — className composition (the `cn()` util)
- `lucide-react` — icons (already a dep in this repo, bump to latest)
- `@radix-ui/*` primitives — ShadCN's interactive components wrap Radix (the CLI installs the right ones per component added)

React + react-dom stay as `peerDependencies`. Firebase + Supabase stay as optional peerDependencies (per the existing plan).

Ship a `dist/styles.css` that bundles Tailwind preflight + the standard ShadCN CSS variables so consumers without an existing ShadCN setup can `import '@oftomorrow/human-agent-chat/styles.css'` and get the look. Consumers with ShadCN already configured can skip that import.

Document the Tailwind `content` requirement in the README — consumers need `content: ['./node_modules/@oftomorrow/human-agent-chat/dist/**/*.{js,mjs}']` (or equivalent) so Tailwind picks up classes used inside the library.

The author-type → avatar color mapping (`MessageItem`'s existing palette) should now be expressed as ShadCN-style CSS variables or `cva` variants rather than inline className conditionals.

**Q: How much polish on visual design?**
The current visual design is fine. Focus on the architectural refit — the styling can iterate later. Don't redesign the avatars or layouts unless something's obviously broken.

## When you finish

Report back to Todd with: bundle size before/after, line count comparison (deletion-heavy refits should reduce overall LOC meaningfully), tests counts before/after, and a list of anything you punted. The `useSupabaseChat` hook is the most likely candidate to punt on if time is tight.

Todd will do the final review + `pnpm publish` step.

## Context for cross-references

Core's substrate (the consumer that drives this library's requirements) is in `~/Github/core`. Key files for the chat shape:

- `~/Github/core/packages/schemas/src/stream-tables.ts` — `chatMessageSchema`, `chatMessageStatusSchema`, `chatMessageAuthorTypeSchema`
- `~/Github/core/packages/db/src/core-db.ts` — `CoreDb.createChatMessage` + `listChatMessagesForThread` for the Supabase data path

Don't pull these into the library as dependencies — they're context, not contracts.

Good luck — go ship.
