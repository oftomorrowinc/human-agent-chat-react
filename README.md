# @oftomorrow/human-agent-chat

React chat surface for threads where **humans, AI agents, system messages, and workflow runners** all post side-by-side. Pluggable backend — bring Firebase, Supabase, or roll your own.

- **Storage-free `<Chat>`** — the component renders messages you hand it and calls `onSend` when the user types. No subscriptions, no auth, no database imports.
- **`useFirebaseChat` / `useSupabaseChat`** — opt-in hooks that bind to Firestore (`onSnapshot`) or Supabase Realtime, and return props ready to spread into `<Chat>`.
- **@-mention autocomplete** with role-aware indicators (user / agent / runner / effective / coo / chair / system).
- **Author-type-driven palette** — avatar + badge colors come from `Author.type`, expressed as CSS variables + cva variants you can override.
- **shadcn/ui primitives** under the hood, vendored into the package — your design system stays in charge.

## Install

```bash
pnpm add @oftomorrow/human-agent-chat
```

React + react-dom are required peers. Firebase and `@supabase/supabase-js` are optional peers — install them only if you use the matching entry point.

```bash
# Optional, only if you want useFirebaseChat:
pnpm add firebase

# Optional, only if you want useSupabaseChat:
pnpm add @supabase/supabase-js
```

If your app doesn't already configure Tailwind + shadcn, import the bundled stylesheet:

```ts
import '@oftomorrow/human-agent-chat/styles.css';
```

## Quick start

The component is pure — give it messages, it renders. Give it `onSend`, it calls you when the user types.

```tsx
import { Chat, type Author, type Message } from '@oftomorrow/human-agent-chat';
import '@oftomorrow/human-agent-chat/styles.css';

const me: Author = { id: 'todd', name: 'Todd', type: 'user' };
const planner: Author = { id: 'planner', name: 'Planning Agent', type: 'agent' };

const initialMessages: Message[] = [
  {
    id: 'm1',
    author: planner,
    content: 'Ready when you are.',
    createdAt: Date.now() - 60_000,
    recipient: '@todd',
    status: 'summary',
  },
];

export function ChatPanel() {
  const [messages, setMessages] = React.useState(initialMessages);
  return (
    <Chat
      messages={messages}
      currentAuthor={me}
      mentionableAuthors={[me, planner]}
      onSend={async (draft) => {
        setMessages((prev) => [
          ...prev,
          { ...draft, id: crypto.randomUUID(), createdAt: Date.now() },
        ]);
      }}
    />
  );
}
```

## With Firebase

```tsx
import { Chat } from '@oftomorrow/human-agent-chat';
import { useFirebaseChat } from '@oftomorrow/human-agent-chat/firebase';
import { getFirestore } from 'firebase/firestore';

const db = getFirestore();

export function ProjectChat({ projectId }: { projectId: string }) {
  const { messages, currentAuthor, onSend } = useFirebaseChat({
    db,
    path: `projects/${projectId}`, // messages live at `${path}/messages`
    currentAuthor: { id: 'todd', name: 'Todd', type: 'user' },
  });

  return <Chat messages={messages} currentAuthor={currentAuthor} onSend={onSend} />;
}
```

The hook subscribes to `${path}/messages` ordered by `createdAt` and writes via `addDoc` on send. Pass `resolveAuthor` if your DB stores only `author_id` and you want to hydrate from a directory.

## With Supabase

```tsx
import { Chat } from '@oftomorrow/human-agent-chat';
import { useSupabaseChat } from '@oftomorrow/human-agent-chat/supabase';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function JobChat({ jobId, companyId }: { jobId: string; companyId: string }) {
  const { messages, currentAuthor, onSend } = useSupabaseChat({
    client: supabase,
    subjectType: 'job',
    subjectId: jobId,
    companyId,
    currentAuthor: { id: 'todd', name: 'Todd', type: 'user' },
  });

  return <Chat messages={messages} currentAuthor={currentAuthor} onSend={onSend} />;
}
```

The hook initial-loads the latest 200 rows from `chat_messages` filtered by `subject_type` + `subject_id`, then subscribes to inserts via a Realtime channel. Writes go through `client.from('chat_messages').insert(...)`. Override the table name with the `table` option if your schema differs.

The shape it expects on disk mirrors Core's `chat_messages` columns: `id`, `company_id`, `subject_type`, `subject_id`, `author_type`, `author_id`, `status`, `recipient`, `content`, `metadata`, `created_at`.

## Rolling your own backend

`<Chat>` only asks for three things:

```ts
type ChatProps = {
  messages: Message[];
  currentAuthor: Author;
  onSend: (draft: MessageDraft) => Promise<void>;
  mentionableAuthors?: Author[];
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
};
```

To wire a new backend, write a hook that returns `{ messages, currentAuthor, onSend }`. The library's own hooks are a good template — both fewer than 200 LOC each. Subscribe on mount, append on insert, dedupe by id, write through `onSend`.

## Author types + theming

Each `Message.author.type` drives the avatar fallback color and the role badge. Defaults:

| `Author.type` | Color (CSS var)      | Badge label |
| ------------- | -------------------- | ----------- |
| `user`        | `--author-user`      | (none)      |
| `agent`       | `--author-agent`     | `AI`        |
| `runner`      | `--author-runner`    | `RUNNER`    |
| `effective`   | `--author-effective` | `EFFECTIVE` |
| `coo`         | `--author-coo`       | `COO`       |
| `chair`       | `--author-chair`     | `CHAIR`     |
| `system`      | `--author-system`    | `SYSTEM`    |

Override any of these by redeclaring the variable in your app's CSS — same as any shadcn token. The values are HSL components (no `hsl()` wrapper):

```css
:root {
  --author-agent: 200 100% 50%;
}
```

## Tailwind setup

If your app already uses Tailwind, add this package's compiled files to your `content` glob so classes used inside the library are kept:

```ts
// tailwind.config.ts
export default {
  content: [
    './src/**/*.{ts,tsx}',
    './node_modules/@oftomorrow/human-agent-chat/dist/**/*.{js,mjs,cjs}',
  ],
  // …
};
```

If you don't have Tailwind set up, just import `@oftomorrow/human-agent-chat/styles.css` once — it ships precompiled with preflight + the shadcn variables + the author-type palette.

## API reference

### `<Chat>`

| Prop                 | Type                                     | Required | Default             |
| -------------------- | ---------------------------------------- | -------- | ------------------- |
| `messages`           | `Message[]`                              | yes      | —                   |
| `currentAuthor`      | `Author`                                 | yes      | —                   |
| `onSend`             | `(draft: MessageDraft) => Promise<void>` | yes      | —                   |
| `mentionableAuthors` | `Author[]`                               | no       | `[]`                |
| `placeholder`        | `string`                                 | no       | `'Type a message…'` |
| `className`          | `string`                                 | no       | —                   |
| `readOnly`           | `boolean`                                | no       | `false`             |

### `Message`

```ts
interface Message {
  id: string;
  author: Author;
  recipient?: string | null; // '@<role>' or '@<user>'
  content: string;
  createdAt: number; // epoch ms
  status?: 'summary' | 'request' | 'blocked';
  metadata?: Record<string, unknown>;
}

type MessageDraft = Omit<Message, 'id' | 'createdAt'>;
```

### `Author`

```ts
interface Author {
  id: string;
  name: string;
  type: 'user' | 'agent' | 'runner' | 'effective' | 'coo' | 'chair' | 'system';
  avatar?: string;
}
```

## Development

```bash
pnpm install
pnpm dev           # runs the examples/ playground at http://localhost:5173
pnpm test          # vitest run
pnpm coverage      # vitest run --coverage
pnpm build         # vite library build + Tailwind-compiled styles.css
pnpm exec effective audit --fix
```

## License

MIT
