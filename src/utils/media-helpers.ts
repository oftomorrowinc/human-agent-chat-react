import { MessageAttachment, attachmentSchema } from '../types';

/**
 * Detects media URLs in message content
 *
 * @param content Message content to process
 * @returns Array of detected attachments
 */
export function detectMediaInContent(content: string): MessageAttachment[] {
  if (typeof content !== 'string' || !content.trim()) {
    return [];
  }

  const attachments: MessageAttachment[] = [];

  // Detect YouTube videos
  const youtubeRegex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
  const youtubeMatches = [...content.matchAll(youtubeRegex)];

  if (youtubeMatches.length > 0) {
    youtubeMatches.forEach((match) => {
      const videoId = match[1];
      const url = match[0];

      const youtubeItem: MessageAttachment = {
        type: 'youtube',
        url,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        title: 'YouTube Video',
      };

      // Validate the object with Zod schema
      const validation = attachmentSchema.safeParse(youtubeItem);
      if (validation.success) {
        attachments.push(youtubeItem);
      } else {
        console.warn('YouTube attachment validation failed:', validation.error);
        attachments.push(youtubeItem);
      }
    });
  }

  // Detect images
  const imageRegex =
    /(https?:\/\/\S+\.(jpeg|jpg|gif|png|webp)(\?[^"'\s]*)?|https?:\/\/images\.unsplash\.com\/\S+)(?=['")\s]|$)/gi;
  const imageMatches = [...content.matchAll(imageRegex)];

  if (imageMatches.length > 0) {
    const imageUrls = imageMatches.map((match) => match[0]);

    // Each image becomes a separate attachment
    imageUrls.forEach((imgUrl, index) => {
      const imageItem: MessageAttachment = {
        type: 'image',
        url: imgUrl,
        title: `Image ${index + 1}`,
      };

      // Validate the object with Zod schema
      const validation = attachmentSchema.safeParse(imageItem);
      if (validation.success) {
        attachments.push(imageItem);
      } else {
        console.warn('Image attachment validation failed:', validation.error);
        attachments.push(imageItem);
      }
    });
  }

  // Detect audio files
  const audioRegex =
    /https?:\/\/\S+\.(mp3|wav|ogg|m4a)(\?[^"']*)?(?=['")\s]|$)/gi;
  const audioMatches = [...content.matchAll(audioRegex)];

  if (audioMatches.length > 0) {
    const audioUrls = audioMatches.map((match) => match[0]);

    audioUrls.forEach((audioUrl, index) => {
      const fileType = audioUrl.split('.').pop()?.toLowerCase() || 'mp3';
      const audioItem: MessageAttachment = {
        type: 'audio',
        url: audioUrl,
        title: `Audio ${index + 1}`,
        mimeType: `audio/${fileType === 'mp3' ? 'mpeg' : fileType}`,
      };

      // Validate the object with Zod schema
      const validation = attachmentSchema.safeParse(audioItem);
      if (validation.success) {
        attachments.push(audioItem);
      } else {
        console.warn('Audio attachment validation failed:', validation.error);
        attachments.push(audioItem);
      }
    });
  }

  // Detect video files
  const videoRegex =
    /https?:\/\/\S+\.(mp4|webm|mov|avi)(\?[^"']*)?(?=['")\s]|$)/gi;
  const videoMatches = [...content.matchAll(videoRegex)];

  if (videoMatches.length > 0) {
    const videoUrls = videoMatches.map((match) => match[0]);

    videoUrls.forEach((videoUrl, index) => {
      const fileType = videoUrl.split('.').pop()?.toLowerCase() || 'mp4';
      const videoItem: MessageAttachment = {
        type: 'video',
        url: videoUrl,
        title: `Video ${index + 1}`,
        mimeType: `video/${fileType}`,
      };

      // Validate the object with Zod schema
      const validation = attachmentSchema.safeParse(videoItem);
      if (validation.success) {
        attachments.push(videoItem);
      } else {
        console.warn('Video attachment validation failed:', validation.error);
        attachments.push(videoItem);
      }
    });
  }

  // Detect documents
  const docRegex =
    /https?:\/\/\S+\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt)(\?[^"']*)?(?=['")\s]|$)/gi;
  const docMatches = [...content.matchAll(docRegex)];

  if (docMatches.length > 0) {
    const docUrls = docMatches.map((match) => match[0]);

    docUrls.forEach((docUrl, index) => {
      const fileType = docUrl.split('.').pop()?.toLowerCase() || '';
      let mimeType = 'application/octet-stream';

      // Set MIME type based on extension
      if (fileType === 'pdf') mimeType = 'application/pdf';
      else if (fileType === 'doc' || fileType === 'docx')
        mimeType = 'application/msword';
      else if (fileType === 'xls' || fileType === 'xlsx')
        mimeType = 'application/vnd.ms-excel';
      else if (fileType === 'ppt' || fileType === 'pptx')
        mimeType = 'application/vnd.ms-powerpoint';
      else if (fileType === 'txt') mimeType = 'text/plain';

      const docItem: MessageAttachment = {
        type: 'document',
        url: docUrl,
        title: `Document ${index + 1}`,
        mimeType,
      };

      // Validate the object with Zod schema
      const validation = attachmentSchema.safeParse(docItem);
      if (validation.success) {
        attachments.push(docItem);
      } else {
        console.warn(
          'Document attachment validation failed:',
          validation.error
        );
        attachments.push(docItem);
      }
    });
  }

  // Detect other files
  const fileRegex =
    /https?:\/\/\S+\.(zip|rar|tar|gz|exe|dmg|bin)(\?[^"']*)?(?=['")\s]|$)/gi;
  const fileMatches = [...content.matchAll(fileRegex)];

  if (fileMatches.length > 0) {
    const fileUrls = fileMatches.map((match) => match[0]);

    fileUrls.forEach((fileUrl, index) => {
      const fileType = fileUrl.split('.').pop()?.toLowerCase() || '';
      let mimeType = 'application/octet-stream';

      // Set MIME type based on extension
      if (fileType === 'zip') mimeType = 'application/zip';
      else if (fileType === 'rar') mimeType = 'application/x-rar-compressed';
      else if (fileType === 'tar' || fileType === 'gz')
        mimeType = 'application/x-compressed';
      else if (fileType === 'exe') mimeType = 'application/x-msdownload';
      else if (fileType === 'dmg') mimeType = 'application/x-apple-diskimage';

      const fileItem: MessageAttachment = {
        type: 'file',
        url: fileUrl,
        title: `File ${index + 1}`,
        mimeType,
      };

      // Validate the object with Zod schema
      const validation = attachmentSchema.safeParse(fileItem);
      if (validation.success) {
        attachments.push(fileItem);
      } else {
        console.warn('File attachment validation failed:', validation.error);
        attachments.push(fileItem);
      }
    });
  }

  // Detect regular links (that aren't one of the above)
  const linkRegex =
    /https?:\/\/(?!.*\.(jpg|jpeg|png|gif|webp|mp3|wav|ogg|m4a|mp4|webm|mov|avi|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|tar|gz|exe|dmg|bin))[^\s]+/gi;
  const linkMatches = [...content.matchAll(linkRegex)];

  if (linkMatches.length > 0) {
    const linkUrls = linkMatches
      .map((match) => match[0])
      // Filter out YouTube links since we already captured them
      .filter(
        (url) => !url.includes('youtube.com') && !url.includes('youtu.be')
      );

    linkUrls.forEach((linkUrl, index) => {
      const linkItem: MessageAttachment = {
        type: 'link',
        url: linkUrl,
        title: `Link ${index + 1}`,
      };

      // Validate the object with Zod schema
      const validation = attachmentSchema.safeParse(linkItem);
      if (validation.success) {
        attachments.push(linkItem);
      } else {
        console.warn('Link attachment validation failed:', validation.error);
        attachments.push(linkItem);
      }
    });
  }

  return attachments;
}

/**
 * Detects data requests in message content (Zod schemas)
 *
 * @param content Message content to process
 * @returns Data request schema if found, undefined otherwise
 */
export function detectDataRequestInContent(
  content: string
): string | undefined {
  if (typeof content !== 'string' || !content.trim()) {
    return undefined;
  }

  // More robust detection of Zod schemas
  const zodIndicators = [
    'z.object(',
    'z.string()',
    'z.number()',
    'z.boolean()',
    'z.array(',
    'z.enum(',
    'z.literal(',
    'z.union(',
    'z.intersection(',
    'z.tuple(',
    'z.record(',
    'z.date()',
  ];

  // Check if any of the Zod indicators are in the content
  const hasZodSchema = zodIndicators.some((indicator) =>
    content.includes(indicator)
  );

  if (hasZodSchema) {
    // Try to extract the full schema
    const schemaStartRegex =
      /z\.(object|string|number|boolean|array|enum|literal|union|intersection|tuple|record|date)/;
    const schemaStartMatch = content.match(schemaStartRegex);

    if (schemaStartMatch) {
      const schemaStartIndex = schemaStartMatch.index;
      if (schemaStartIndex !== undefined) {
        // Find the matching closing bracket/parenthesis
        let openBrackets = 0;
        let openParens = 0;
        let schemaEndIndex = content.length;

        for (let i = schemaStartIndex; i < content.length; i++) {
          if (content[i] === '{') openBrackets++;
          if (content[i] === '}') {
            openBrackets--;
            if (
              openBrackets === 0 &&
              openParens === 0 &&
              i > schemaStartIndex + 10
            ) {
              schemaEndIndex = i + 1;
              break;
            }
          }

          if (content[i] === '(') openParens++;
          if (content[i] === ')') {
            openParens--;
            if (
              openBrackets === 0 &&
              openParens === 0 &&
              i > schemaStartIndex + 10
            ) {
              schemaEndIndex = i + 1;
              break;
            }
          }
        }

        // Extract the schema text
        return content.substring(schemaStartIndex, schemaEndIndex);
      }
    }

    // Fallback to returning the whole content if we can't extract a specific schema
    return content;
  }

  return undefined;
}

/**
 * Process content to extract media and update content text
 *
 * @param content Original message content
 * @returns Processed content, attachments, and dataRequest
 */
export function processMessageContent(content: string): {
  content: string;
  attachments: MessageAttachment[];
  dataRequest?: string;
} {
  if (typeof content !== 'string') {
    return {
      content:
        typeof content === 'object' ? JSON.stringify(content) : String(content),
      attachments: [],
    };
  }

  let processedContent = content;

  // Detect attachments in content
  const attachments = detectMediaInContent(content);

  // Remove attachment URLs from content
  attachments.forEach((attachment) => {
    if (attachment.url) {
      processedContent = processedContent.replace(attachment.url, '');
    }
  });

  // Detect data request
  const dataRequest = detectDataRequestInContent(content);

  // If there's a data request, replace it with a placeholder
  if (dataRequest) {
    // Find the schema in the content and replace just that part
    const schemaIndex = processedContent.indexOf(dataRequest);
    if (schemaIndex !== -1) {
      processedContent =
        processedContent.substring(0, schemaIndex).trim() +
        (processedContent.substring(0, schemaIndex).trim() ? '\n\n' : '') +
        '[This message contains a form schema. Click the button below to provide the requested information.]';
    } else {
      // Fallback if we can't find the exact schema location
      processedContent =
        'This message contains a form schema. Click the button below to provide the requested information.';
    }
  }

  // Clean up the processed content
  processedContent = processedContent
    .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with just two
    .replace(/^\s+|\s+$/g, ''); // Trim start and end whitespace

  return {
    content: processedContent,
    attachments,
    dataRequest,
  };
}
