/**
 * URL-to-attachment detection used by MessageItem to render rich media
 * inline. Pure utility — no framework or storage coupling.
 */

export type AttachmentType = 'youtube' | 'image' | 'audio' | 'video' | 'document' | 'file' | 'link';

export interface MediaAttachment {
  type: AttachmentType;
  url: string;
  thumbnailUrl?: string;
  title?: string;
  mimeType?: string;
}

const YOUTUBE_RE =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;

const IMAGE_RE =
  /(https?:\/\/\S+\.(jpeg|jpg|gif|png|webp)(\?[^"'\s]*)?|https?:\/\/images\.unsplash\.com\/\S+)(?=['")\s]|$)/gi;

const AUDIO_RE = /https?:\/\/\S+\.(mp3|wav|ogg|m4a)(\?[^"']*)?(?=['")\s]|$)/gi;
const VIDEO_RE = /https?:\/\/\S+\.(mp4|webm|mov|avi)(\?[^"']*)?(?=['")\s]|$)/gi;
const DOC_RE = /https?:\/\/\S+\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt)(\?[^"']*)?(?=['")\s]|$)/gi;
const FILE_RE = /https?:\/\/\S+\.(zip|rar|tar|gz|exe|dmg|bin)(\?[^"']*)?(?=['")\s]|$)/gi;
const LINK_RE =
  /https?:\/\/(?!.*\.(jpg|jpeg|png|gif|webp|mp3|wav|ogg|m4a|mp4|webm|mov|avi|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|tar|gz|exe|dmg|bin))[^\s]+/gi;

const DOC_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/msword',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.ms-excel',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.ms-powerpoint',
  txt: 'text/plain',
};

const FILE_MIME: Record<string, string> = {
  zip: 'application/zip',
  rar: 'application/x-rar-compressed',
  tar: 'application/x-compressed',
  gz: 'application/x-compressed',
  exe: 'application/x-msdownload',
  dmg: 'application/x-apple-diskimage',
};

/** Scan message content and produce inline attachments for any media URLs found. */
export function detectMediaInContent(content: string): MediaAttachment[] {
  if (typeof content !== 'string' || !content.trim()) return [];

  const out: MediaAttachment[] = [];

  for (const match of content.matchAll(YOUTUBE_RE)) {
    const videoId = match[1];
    out.push({
      type: 'youtube',
      url: match[0],
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      title: 'YouTube Video',
    });
  }

  let i = 0;
  for (const match of content.matchAll(IMAGE_RE)) {
    out.push({ type: 'image', url: match[0], title: `Image ${++i}` });
  }

  i = 0;
  for (const match of content.matchAll(AUDIO_RE)) {
    const ext = match[1]?.toLowerCase() ?? 'mp3';
    out.push({
      type: 'audio',
      url: match[0],
      title: `Audio ${++i}`,
      mimeType: `audio/${ext === 'mp3' ? 'mpeg' : ext}`,
    });
  }

  i = 0;
  for (const match of content.matchAll(VIDEO_RE)) {
    const ext = match[1]?.toLowerCase() ?? 'mp4';
    out.push({ type: 'video', url: match[0], title: `Video ${++i}`, mimeType: `video/${ext}` });
  }

  i = 0;
  for (const match of content.matchAll(DOC_RE)) {
    const ext = match[1]?.toLowerCase() ?? '';
    out.push({
      type: 'document',
      url: match[0],
      title: `Document ${++i}`,
      mimeType: DOC_MIME[ext] ?? 'application/octet-stream',
    });
  }

  i = 0;
  for (const match of content.matchAll(FILE_RE)) {
    const ext = match[1]?.toLowerCase() ?? '';
    out.push({
      type: 'file',
      url: match[0],
      title: `File ${++i}`,
      mimeType: FILE_MIME[ext] ?? 'application/octet-stream',
    });
  }

  i = 0;
  for (const match of content.matchAll(LINK_RE)) {
    const url = match[0];
    if (url.includes('youtube.com') || url.includes('youtu.be')) continue;
    out.push({ type: 'link', url, title: `Link ${++i}` });
  }

  return out;
}

/**
 * Strip media URLs from displayed text after they've been extracted. Returns
 * `{ content, attachments }` so the renderer can show the text without the
 * raw URL and then render attachments separately below.
 */
export function processMessageContent(content: string): {
  content: string;
  attachments: MediaAttachment[];
} {
  if (typeof content !== 'string') {
    return {
      content: typeof content === 'object' ? JSON.stringify(content) : String(content),
      attachments: [],
    };
  }

  const attachments = detectMediaInContent(content);
  let processed = content;
  for (const attachment of attachments) {
    if (attachment.url) processed = processed.replace(attachment.url, '');
  }
  processed = processed.replace(/\n{3,}/g, '\n\n').replace(/^\s+|\s+$/g, '');
  return { content: processed, attachments };
}
