import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, FileText, Play } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Author, AuthorType, Message } from '@/types';
import { formatMentions } from '@/utils/message-helpers';
import { detectMediaInContent, type MediaAttachment } from '@/utils/media-helpers';

/** Author-type → avatar ring + badge color. Drives the per-role palette. */
const authorVariants = cva('text-white', {
  variants: {
    type: {
      user: 'bg-author-user',
      agent: 'bg-author-agent',
      runner: 'bg-author-runner',
      effective: 'bg-author-effective',
      coo: 'bg-author-coo',
      chair: 'bg-author-chair',
      system: 'bg-author-system',
    },
  },
  defaultVariants: { type: 'user' },
});

type AuthorVariantProps = VariantProps<typeof authorVariants>;

const TYPE_BADGE: Partial<Record<AuthorType, string>> = {
  agent: 'AI',
  runner: 'RUNNER',
  effective: 'EFFECTIVE',
  coo: 'COO',
  chair: 'CHAIR',
  system: 'SYSTEM',
};

export interface MessageItemProps {
  message: Message;
  currentAuthorId: string;
  className?: string;
}

const initialsFor = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

const safeFormatTime = (epochMs: number): string => {
  try {
    return formatDistanceToNow(new Date(epochMs), { addSuffix: true });
  } catch {
    return 'unknown time';
  }
};

const RoleAvatar: React.FC<{ author: Author }> = ({ author }) => {
  const variant = authorVariants({ type: author.type as AuthorVariantProps['type'] });
  return (
    <Avatar className="h-9 w-9 flex-shrink-0">
      {author.avatar ? <AvatarImage src={author.avatar} alt={author.name} /> : null}
      <AvatarFallback className={cn(variant, 'text-sm font-semibold')}>
        {initialsFor(author.name)}
      </AvatarFallback>
    </Avatar>
  );
};

const AttachmentBlock: React.FC<{
  attachment: MediaAttachment;
  messageId: string;
  index: number;
}> = ({ attachment, messageId, index }) => {
  const key = `${messageId}-${index}`;
  switch (attachment.type) {
    case 'image':
      return (
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-md border border-border"
          data-testid={`attachment-${key}`}
        >
          <img
            src={attachment.url}
            alt={attachment.title ?? 'Image'}
            className="max-h-96 w-full object-cover"
          />
        </a>
      );
    case 'youtube': {
      return (
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block overflow-hidden rounded-md border border-border"
          data-testid={`attachment-${key}`}
        >
          {attachment.thumbnailUrl ? (
            <img
              src={attachment.thumbnailUrl}
              alt={attachment.title ?? 'YouTube Video'}
              className="max-h-80 w-full object-cover"
            />
          ) : null}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="rounded-full bg-destructive p-3 text-destructive-foreground">
              <Play className="h-6 w-6" />
            </div>
          </div>
          {attachment.title ? (
            <p className="bg-card px-3 py-2 text-sm text-card-foreground">{attachment.title}</p>
          ) : null}
        </a>
      );
    }
    case 'video':
      return (
        <video
          controls
          src={attachment.url}
          className="max-h-96 w-full rounded-md border border-border"
          data-testid={`attachment-${key}`}
        >
          Your browser does not support the video element.
        </video>
      );
    case 'audio':
      return (
        <audio controls src={attachment.url} className="w-full" data-testid={`attachment-${key}`}>
          Your browser does not support the audio element.
        </audio>
      );
    case 'document':
    case 'file':
      return (
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent"
          data-testid={`attachment-${key}`}
        >
          <FileText className="h-4 w-4 text-primary" />
          <span className="flex-1 font-medium">{attachment.title ?? 'Document'}</span>
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </a>
      );
    case 'link':
    default:
      return (
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent"
          data-testid={`attachment-${key}`}
        >
          <ExternalLink className="h-4 w-4 text-primary" />
          <span className="flex-1 break-all">{attachment.title ?? attachment.url}</span>
        </a>
      );
  }
};

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentAuthorId,
  className,
}) => {
  const isSelf = message.author.id === currentAuthorId;
  const attachments = React.useMemo(() => detectMediaInContent(message.content), [message.content]);
  const contentHtml = React.useMemo(() => formatMentions(message.content), [message.content]);
  const badgeLabel = TYPE_BADGE[message.author.type];
  const statusLabel = message.status && message.status !== 'summary' ? message.status : null;

  return (
    <div
      role="region"
      aria-label={`Message from ${message.author.name}`}
      data-author-type={message.author.type}
      data-message-id={message.id}
      className={cn('group flex w-full gap-3', isSelf ? 'flex-row-reverse' : 'flex-row', className)}
    >
      <RoleAvatar author={message.author} />

      <div className={cn('flex max-w-[80%] flex-col gap-1', isSelf ? 'items-end' : 'items-start')}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{message.author.name}</span>
          {badgeLabel ? (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] uppercase">
              {badgeLabel}
            </Badge>
          ) : null}
          {statusLabel ? (
            <Badge
              variant={statusLabel === 'blocked' ? 'destructive' : 'outline'}
              className="px-1.5 py-0 text-[10px] uppercase"
            >
              {statusLabel}
            </Badge>
          ) : null}
          {message.recipient ? <span className="text-primary">→ {message.recipient}</span> : null}
          <span aria-label="timestamp">{safeFormatTime(message.createdAt)}</span>
        </div>

        <Card className={cn('w-full', isSelf ? 'bg-primary/10' : 'bg-card')}>
          <CardContent className="space-y-3 p-3">
            <div
              className="prose prose-sm max-w-none break-words text-foreground dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
            {attachments.length > 0 ? (
              <div className="space-y-2">
                {attachments.map((attachment, index) => (
                  <AttachmentBlock
                    key={`${message.id}-${index}`}
                    attachment={attachment}
                    messageId={message.id}
                    index={index}
                  />
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MessageItem;
