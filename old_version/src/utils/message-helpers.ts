import { 
  Message, 
  MessageAttachment,
  AttachmentType,
  attachmentSchema,
  messageSchema,
  messageMetadataSchema
} from '../types/index.js';

/**
 * Creates a new message object with proper structure and validates it
 * 
 * @param params Message parameters
 * @returns Message object
 */
export function createMessage(params: {
  content: string;
  senderId: string;
  senderName?: string;
  senderRole?: string;
  recipientIds?: string[];
  fromAiAgent?: boolean;
  toAiAgent?: boolean;
  attachments?: MessageAttachment[];
  dataRequest?: string | object;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}): Message {
  const now = new Date().toISOString();
  
  // Validate attachments with their schema
  if (params.attachments && params.attachments.length > 0) {
    params.attachments.forEach((item, index) => {
      const result = attachmentSchema.safeParse(item);
      if (!result.success) {
        console.warn(`Attachment at index ${index} failed validation:`, result.error);
      }
    });
  }
  
  // Validate metadata if provided
  if (params.metadata) {
    const result = messageMetadataSchema.safeParse(params.metadata);
    if (!result.success) {
      console.warn('Message metadata failed validation:', result.error);
    }
  }
  
  const message: Message = {
    content: params.content,
    senderId: params.senderId,
    senderName: params.senderName,
    senderRole: params.senderRole,
    recipientIds: params.recipientIds,
    fromAiAgent: params.fromAiAgent,
    toAiAgent: params.toAiAgent,
    attachments: params.attachments,
    dataRequest: params.dataRequest,
    metadata: params.metadata,
    createdAt: params.createdAt || now,
    updatedAt: params.updatedAt || now,
    deleted: false
  };
  
  // Validate with Zod schema
  const result = messageSchema.safeParse(message);
  if (!result.success) {
    console.warn('Created message does not match schema:', result.error);
  }
  
  return message;
}

/**
 * Process message content to extract media and other rich content
 * 
 * @param content Message content to process
 * @returns Processed message components
 */
export function processMessageContent(content: string): {
  content: string;
  attachments: MessageAttachment[];
  dataRequest?: string | object;
} {
  if (typeof content !== 'string') {
    return { 
      content: typeof content === 'object' ? JSON.stringify(content) : String(content),
      attachments: [] 
    };
  }

  // Initialize arrays for different content types
  const attachments: MessageAttachment[] = [];
  let processedContent = content;
  let dataRequest: string | object | undefined = undefined;
  
  // Check for YouTube URLs
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
  const youtubeMatches = [...content.matchAll(youtubeRegex)];
  
  if (youtubeMatches.length > 0) {
    youtubeMatches.forEach(match => {
      const videoId = match[1];
      const url = match[0];
      
      // Add to attachments array
      attachments.push({
        type: 'youtube',
        url,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        title: 'YouTube Video'
      });
      
      // Remove URL from content
      processedContent = processedContent.replace(url, '');
    });
  }

  // Check for image URLs
  const imageRegex = /(https?:\/\/\S+\.(jpeg|jpg|gif|png|webp)(\?[^"'\s]*)?|https?:\/\/images\.unsplash\.com\/\S+)(?=['")\s]|$)/gi;
  const imageMatches = [...content.matchAll(imageRegex)];
  
  if (imageMatches.length > 0) {
    // Extract the full URLs
    const images = imageMatches.map(match => match[0]);
    
    // Add each image as a separate attachment
    images.forEach((imageUrl, index) => {
      attachments.push({
        type: 'image',
        url: imageUrl,
        title: `Image ${index + 1}`
      });
      
      // Remove image URL from the content
      processedContent = processedContent.replace(imageUrl, '');
    });
  }
  
  // Check for audio URLs
  const audioRegex = /https?:\/\/\S+\.(mp3|wav|ogg|m4a)(\?[^"']*)?(?=['")\s]|$)/gi;
  const audioMatches = [...content.matchAll(audioRegex)];
  
  if (audioMatches.length > 0) {
    const audioUrls = audioMatches.map(match => match[0]);
    
    // Add each audio file as a separate attachment
    audioUrls.forEach((audioUrl, index) => {
      attachments.push({
        type: 'audio',
        url: audioUrl,
        title: `Audio ${index + 1}`,
        mimeType: `audio/${audioUrl.split('.').pop()?.toLowerCase() === 'mp3' ? 'mpeg' : audioUrl.split('.').pop()}`
      });
      
      // Remove audio URL from content
      processedContent = processedContent.replace(audioUrl, '');
    });
  }
  
  // Check for video URLs
  const videoRegex = /https?:\/\/\S+\.(mp4|webm|mov)(\?[^"']*)?(?=['")\s]|$)/gi;
  const videoMatches = [...content.matchAll(videoRegex)];
  
  if (videoMatches.length > 0) {
    const videoUrls = videoMatches.map(match => match[0]);
    
    // Add each video file as a separate attachment
    videoUrls.forEach((videoUrl, index) => {
      attachments.push({
        type: 'video',
        url: videoUrl,
        title: `Video ${index + 1}`,
        mimeType: `video/${videoUrl.split('.').pop()}`
      });
      
      // Remove video URL from content
      processedContent = processedContent.replace(videoUrl, '');
    });
  }
  
  // Check for document URLs
  const documentRegex = /https?:\/\/\S+\.(pdf|doc|docx|xls|xlsx|ppt|pptx)(\?[^"']*)?(?=['")\s]|$)/gi;
  const documentMatches = [...content.matchAll(documentRegex)];
  
  if (documentMatches.length > 0) {
    const documentUrls = documentMatches.map(match => match[0]);
    
    // Add each document as a separate attachment
    documentUrls.forEach((docUrl, index) => {
      const extension = docUrl.split('.').pop()?.toLowerCase();
      let mimeType = 'application/octet-stream';
      
      // Set MIME type based on extension
      if (extension === 'pdf') mimeType = 'application/pdf';
      else if (extension === 'doc' || extension === 'docx') mimeType = 'application/msword';
      else if (extension === 'xls' || extension === 'xlsx') mimeType = 'application/vnd.ms-excel';
      else if (extension === 'ppt' || extension === 'pptx') mimeType = 'application/vnd.ms-powerpoint';
      
      attachments.push({
        type: 'document',
        url: docUrl,
        title: `Document ${index + 1}`,
        mimeType
      });
      
      // Remove document URL from content
      processedContent = processedContent.replace(docUrl, '');
    });
  }
  
  // Check for generic file URLs
  const fileRegex = /https?:\/\/\S+\.(zip|rar|tar|gz|exe|dmg)(\?[^"']*)?(?=['")\s]|$)/gi;
  const fileMatches = [...content.matchAll(fileRegex)];
  
  if (fileMatches.length > 0) {
    const fileUrls = fileMatches.map(match => match[0]);
    
    // Add each file as a separate attachment
    fileUrls.forEach((fileUrl, index) => {
      attachments.push({
        type: 'file',
        url: fileUrl,
        title: `File ${index + 1}`
      });
      
      // Remove file URL from content
      processedContent = processedContent.replace(fileUrl, '');
    });
  }

  // Check for regular web links (that aren't media/documents)
  const linkRegex = /https?:\/\/(?!.*\.(jpg|jpeg|png|gif|webp|mp3|wav|ogg|m4a|mp4|webm|mov|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|tar|gz|exe|dmg))[^\s]+/gi;
  const linkMatches = [...content.matchAll(linkRegex)];
  
  if (linkMatches.length > 0) {
    const linkUrls = linkMatches
      .map(match => match[0])
      // Filter out YouTube links since we already captured them
      .filter(url => !url.includes('youtube.com') && !url.includes('youtu.be'));
    
    // Add each link as a separate attachment
    linkUrls.forEach((linkUrl, index) => {
      attachments.push({
        type: 'link',
        url: linkUrl,
        title: `Link ${index + 1}`
      });
      
      // Remove link URL from content
      processedContent = processedContent.replace(linkUrl, '');
    });
  }

  // Check for Zod schema definitions
  if (content.includes('z.object(') || 
      content.includes('z.string()') || 
      content.includes('z.number()') ||
      content.includes('z.boolean()')) {
    
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
      'z.date()'
    ];
    
    // Check if any of the Zod indicators are in the content
    const hasZodSchema = zodIndicators.some(indicator => content.includes(indicator));
    
    if (hasZodSchema) {
      // Try to extract the full schema
      const schemaStartRegex = /z\.(object|string|number|boolean|array|enum|literal|union|intersection|tuple|record|date)/;
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
              if (openBrackets === 0 && openParens === 0 && i > schemaStartIndex + 10) {
                schemaEndIndex = i + 1;
                break;
              }
            }
            
            if (content[i] === '(') openParens++;
            if (content[i] === ')') {
              openParens--;
              if (openBrackets === 0 && openParens === 0 && i > schemaStartIndex + 10) {
                schemaEndIndex = i + 1;
                break;
              }
            }
          }
          
          // Extract the schema text
          const schemaText = content.substring(schemaStartIndex, schemaEndIndex);
          dataRequest = schemaText;
          
          // Replace schema with simpler message in displayed content
          processedContent = processedContent.substring(0, schemaStartIndex).trim() + 
            (processedContent.substring(0, schemaStartIndex).trim() ? '\n\n' : '') +
            '[This message contains a form schema. Click the button below to provide the requested information.]';
        }
      }
    }
  }

  // Clean up the processed content
  processedContent = processedContent
    .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with just two
    .replace(/^\s+|\s+$/g, ''); // Trim start and end whitespace

  return { 
    content: processedContent,
    attachments,
    dataRequest
  };
}

/**
 * Validates if a message matches the expected structure
 * 
 * @param message Message to validate
 * @returns Whether the message is valid, or the validation error
 */
export function isValidMessage(message: any): boolean | { success: false, error: any } {
  if (!message) return false;
  
  // Validate attachments
  if (message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0) {
    const validations: string[] = [];
    
    message.attachments.forEach((attachment: any, index: number) => {
      const attachmentResult = attachmentSchema.safeParse(attachment);
      if (!attachmentResult.success) {
        validations.push(`Attachment[${index}]: ${attachmentResult.error.message}`);
      }
    });
    
    if (validations.length > 0) {
      console.warn('Attachment validation errors:', validations);
    }
  }
  
  // Validate metadata
  if (message.metadata) {
    const metadataResult = messageMetadataSchema.safeParse(message.metadata);
    if (!metadataResult.success) {
      console.warn('Metadata validation error:', metadataResult.error);
    }
  }
  
  // Use Zod schema for full message validation
  const result = messageSchema.safeParse(message);
  
  if (!result.success) {
    console.warn('Message validation failed:', result.error);
    return { 
      success: false, 
      error: result.error 
    };
  }
  
  return true;
}

/**
 * Extract mentions from message content
 * Uses a regex to find @username patterns in the message
 * 
 * @param content Message content
 * @returns Array of mentioned user IDs
 */
export function extractMentions(content: string): string[] {
  if (!content || typeof content !== 'string') return [];
  
  // Regex that handles mentions at start, middle, or end of content
  // Also handles mentions that are part of sentences with punctuation
  const mentionRegex = /(?:^|\s)@([\w\d._-]+)(?:$|[,;.\s])/g;
  const matches = content.matchAll(mentionRegex);
  
  // Use a Set to eliminate duplicate mentions
  const mentionSet = new Set<string>();
  
  for (const match of matches) {
    if (match[1] && match[1].trim()) {
      mentionSet.add(match[1].trim());
    }
  }
  
  return Array.from(mentionSet);
}

/**
 * Generate HTML for displaying a message's attachments
 * 
 * @param message The message containing attachments
 * @returns HTML string for rendering the attachments
 */
export function generateAttachmentsHtml(message: Message): string {
  if (!message.attachments || message.attachments.length === 0) {
    return '';
  }
  
  // Process each attachment and concatenate the results
  return message.attachments.map((attachment) => {
    switch (attachment.type) {
      case 'youtube':
        // Extract videoId from URL if not explicitly provided
        const videoIdMatch = attachment.url.match(/(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        const videoId = videoIdMatch ? videoIdMatch[1] : '';
        
        if (!videoId) return '';
        
        return `
          <div class="attachment-content youtube-embed">
            <div class="youtube-preview" data-video-id="${videoId}">
              <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="YouTube video thumbnail">
              <div class="youtube-play-button">
                <svg viewBox="0 0 24 24" width="48" height="48">
                  <path fill="#fff" d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
            <div class="attachment-controls">
              <button class="attachment-action expand-video" data-video-id="${videoId}">
                <span>Expand Video</span>
              </button>
              <a href="${attachment.url}" target="_blank" class="attachment-action">
                <span>Open in YouTube</span>
              </a>
            </div>
          </div>
        `;
      
      case 'image':
        return `
          <div class="attachment-content image-embed">
            <div class="single-image">
              <img src="${attachment.url}" alt="${attachment.title || 'Shared image'}" class="lightbox-image" data-index="0">
            </div>
          </div>
        `;
      
      case 'audio':
        const fileType = attachment.url.split('.').pop()?.toLowerCase() || 'mp3';
        return `
          <div class="attachment-content audio-embed">
            <div class="audio-player">
              <audio controls>
                <source src="${attachment.url}" type="${attachment.mimeType || `audio/${fileType === 'mp3' ? 'mpeg' : fileType}`}">
                Your browser does not support the audio element.
              </audio>
              <div class="audio-controls">
                <a href="${attachment.url}" target="_blank" class="attachment-action">
                  <span>Download Audio</span>
                </a>
              </div>
            </div>
          </div>
        `;
      
      case 'video':
        return `
          <div class="attachment-content video-embed">
            <video controls preload="metadata">
              <source src="${attachment.url}" type="${attachment.mimeType || 'video/mp4'}">
              Your browser does not support the video element.
            </video>
            <div class="attachment-controls">
              <a href="${attachment.url}" target="_blank" class="attachment-action">
                <span>Download Video</span>
              </a>
            </div>
          </div>
        `;
      
      case 'document':
        return `
          <div class="attachment-content document-embed">
            <div class="document-icon">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M14,2H6C4.9,2 4,2.9 4,4V20C4,21.1 4.9,22 6,22H18C19.1,22 20,21.1 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
              </svg>
            </div>
            <div class="document-info">
              <div class="document-title">${attachment.title || 'Document'}</div>
              <div class="document-type">${attachment.mimeType || 'Document file'}</div>
            </div>
            <div class="attachment-controls">
              <a href="${attachment.url}" target="_blank" class="attachment-action">
                <span>Open Document</span>
              </a>
            </div>
          </div>
        `;
      
      case 'file':
        return `
          <div class="attachment-content file-embed">
            <div class="file-icon">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M14,2H6C4.9,2 4,2.9 4,4V20C4,21.1 4.9,22 6,22H18C19.1,22 20,21.1 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
              </svg>
            </div>
            <div class="file-info">
              <div class="file-title">${attachment.title || 'File'}</div>
              <div class="file-type">${attachment.mimeType || 'Binary file'}</div>
            </div>
            <div class="attachment-controls">
              <a href="${attachment.url}" target="_blank" class="attachment-action">
                <span>Download File</span>
              </a>
            </div>
          </div>
        `;
      
      case 'link':
        return `
          <div class="attachment-content link-embed">
            <div class="link-icon">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M3.9,12C3.9,10.29 5.29,8.9 7,8.9H11V7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H11V15.1H7C5.29,15.1 3.9,13.71 3.9,12M8,13H16V11H8V13M17,7H13V8.9H17C18.71,8.9 20.1,10.29 20.1,12C20.1,13.71 18.71,15.1 17,15.1H13V17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7Z"/>
              </svg>
            </div>
            <div class="link-info">
              <a href="${attachment.url}" target="_blank" class="link-url">${attachment.title || attachment.url}</a>
            </div>
          </div>
        `;
      
      default:
        return '';
    }
  }).join('');
}

/**
 * Generate HTML for displaying a data request form button
 * 
 * @param message The message containing a data request
 * @returns HTML string for rendering the form button
 */
export function generateDataRequestHtml(message: Message): string {
  if (!message.dataRequest) {
    return '';
  }
  
  const dataRequestJson = typeof message.dataRequest === 'string' 
    ? message.dataRequest 
    : JSON.stringify(message.dataRequest);
  
  return `
    <div class="attachment-content schema-embed">
      <button class="schema-action-button" data-schema='${dataRequestJson}'>
        <span>Provide Information</span>
      </button>
    </div>
  `;
}