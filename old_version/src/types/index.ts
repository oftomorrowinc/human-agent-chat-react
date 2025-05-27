// Core Types for the HumanAgentChat component

import { z } from 'zod';

// Re-export all types from Message.ts
export * from './Message.js';

// User types
export const userSchema = z.object({
  id: z.string(),
  displayName: z.string().optional(),
  email: z.string().email().optional(),
  photoURL: z.string().url().optional(),
  isAgent: z.boolean().optional(),
});

export type User = z.infer<typeof userSchema>;

// Access control levels
export const accessLevelEnum = z.enum([
  'read',
  'write',
  'admin',
]);

export type AccessLevel = z.infer<typeof accessLevelEnum>;

// Export the enum values as constants
export const AccessLevel = {
  READ: 'read' as AccessLevel,
  WRITE: 'write' as AccessLevel,
  ADMIN: 'admin' as AccessLevel
};

// Member access record
export const memberAccessSchema = z.object({
  userId: z.string(),
  level: accessLevelEnum,
  addedBy: z.string().optional(),
  addedAt: z.number().optional(),
});

export type MemberAccess = z.infer<typeof memberAccessSchema>;

// Form schemas using Zod
export type FormSchema = z.ZodObject<any, any, any>;

// Form response type
export const formResponseSchema = z.object({
  formId: z.string(),
  values: z.record(z.any()),
});

export type FormResponse = z.infer<typeof formResponseSchema>;

// Chat configuration options
export const chatOptionsSchema = z.object({
  containerId: z.string(),
  firebasePath: z.string(),
  currentUser: userSchema,
  theme: z.literal('dark').optional(),
  maxMessages: z.number().positive().optional(),
  enableReactions: z.boolean().optional(),
  enableReplies: z.boolean().optional(),
  enableMultiModal: z.boolean().optional(),
  enableForms: z.boolean().optional(),
  agentIds: z.array(z.string()).optional(),
  onNewMessage: z.function().optional(),
});

export type ChatOptions = z.infer<typeof chatOptionsSchema>;