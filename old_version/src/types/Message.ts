import { z } from 'zod';

/**
 * Attachment type enum
 */
export const AttachmentTypeEnum = z.enum([
  'youtube',
  'image',
  'audio',
  'video',
  'file',  // Generic file type (any binary file)
  'link',  // Web URL (non-media)
  'document' // Document with structured metadata (PDF, doc, spreadsheet, etc.)
]);

export type AttachmentType = z.infer<typeof AttachmentTypeEnum>;

/**
 * Attachment schema for files, media, and links in messages
 */
export const attachmentSchema = z.object({
  id: z.string().optional(),
  type: AttachmentTypeEnum,
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().optional()
});

export type MessageAttachment = z.infer<typeof attachmentSchema>;

/**
 * Message metadata schema
 */
export const messageMetadataSchema = z.object({
  action: z.string().optional(),
  event: z.string().optional(),
  projectId: z.string().optional(),
  todoId: z.string().optional(),
  documentId: z.string().optional(),
  schemaId: z.string().optional()
}).catchall(z.any());

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

/**
 * Core message schema used throughout the application
 */
export const messageSchema = z.object({
  // Core fields
  id: z.string().optional(),
  content: z.string(),
  senderId: z.string(),
  senderName: z.string().optional(),
  senderRole: z.string().optional(),
  recipientIds: z.array(z.string()).optional(),
  
  // AI Agent specific properties
  fromAiAgent: z.boolean().optional(),
  toAiAgent: z.boolean().optional(),
  
  // Rich content
  attachments: z.array(attachmentSchema).optional(),
  dataRequest: z.union([z.string(), z.object({}).catchall(z.any())]).optional(),
  
  // Metadata
  metadata: messageMetadataSchema.optional(),
  
  // Status fields
  deleted: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type Message = z.infer<typeof messageSchema>;

/**
 * Helper function to create a new message object
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
  metadata?: MessageMetadata;
  createdAt?: string;
  updatedAt?: string;
}): Message {
  const now = new Date().toISOString();
  
  // Create base message object
  const message: Message = {
    content: params.content,
    senderId: params.senderId,
    createdAt: params.createdAt || now,
    updatedAt: params.updatedAt || now,
    deleted: false
  };
  
  // Add optional fields with safe defaults for Firestore
  if (params.senderName) message.senderName = params.senderName;
  if (params.senderRole) message.senderRole = params.senderRole;
  message.recipientIds = params.recipientIds || [];
  message.fromAiAgent = params.fromAiAgent || false;
  message.toAiAgent = params.toAiAgent || false;
  
  // Only add these fields if they have values (avoid undefined)
  if (params.attachments && params.attachments.length > 0) {
    message.attachments = params.attachments;
  }
  if (params.dataRequest) {
    message.dataRequest = params.dataRequest;
  }
  if (params.metadata) {
    message.metadata = params.metadata;
  }
  
  // Validate with Zod schema
  const validationResult = messageSchema.safeParse(message);
  
  if (!validationResult.success) {
    console.warn('Message validation failed:', validationResult.error);
  }
  
  return message;
}