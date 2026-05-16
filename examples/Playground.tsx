import * as React from 'react';

import { Chat, type Author, type Message, type MessageDraft } from '@/index';

import { DEMO_AUTHORS, DEMO_MESSAGES } from './demo-data';

const TODD = DEMO_AUTHORS.find((a) => a.id === 'todd') as Author;

export function Playground(): React.JSX.Element {
  const [messages, setMessages] = React.useState<Message[]>(DEMO_MESSAGES);

  const handleSend = async (draft: MessageDraft): Promise<void> => {
    const next: Message = {
      ...draft,
      id: `msg-${Date.now()}`,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, next]);
  };

  return (
    <div className="mx-auto flex h-screen max-w-3xl flex-col gap-4 p-6">
      <header>
        <h1 className="text-xl font-semibold">human-agent-chat — playground</h1>
        <p className="text-sm text-muted-foreground">
          Mock data only. Try `@todd` or `@runner` to see mention autocomplete.
        </p>
      </header>
      <Chat
        messages={messages}
        currentAuthor={TODD}
        onSend={handleSend}
        mentionableAuthors={DEMO_AUTHORS}
        className="flex-1"
      />
    </div>
  );
}
