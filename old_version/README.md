# HumanAgentChat

A reusable Node.js chat UI npm package component with HTMX integration designed for human-AI collaboration. This component is backed by Firebase services (Firestore, Storage, and Authentication) and features a flexible, hierarchical access control system.

## Features

- **Hierarchical Access Control**: A consistent pattern of members collections to control access at any level in a path hierarchy
- **Multi-modal Content**: Support for text, images, videos, documents, and interactive forms
- **AI Agent Integration**: Easily integrate AI agents into your chat interfaces
- **Zod-based Form Generation**: Create dynamic forms from Zod schemas that can be displayed inline or as modals
- **Server-rendered UI**: Uses HTMX for dynamic updates without requiring a full SPA framework
- **Opinionated Dark Theme**: Clean, modern interface with a sleek dark theme inspired by ZedForm
- **Firebase Integration**: Built on Firebase services for real-time updates, storage, and authentication
- **Built-in Firebase Emulator Support**: Develop and test without setting up a real Firebase project

## Installation

```bash
npm install git+https://github.com/oftomorrowinc/human-agent-chat
```

Additionally, you'll need to install the zod-form package:

```bash
npm install git+https://github.com/oftomorrowinc/zod-form.git#v1.0.0
```

## Basic Usage

### Set up Firebase

First, initialize Firebase in your application:

```javascript
const { initializeFirebase } = require('human-agent-chat');

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

initializeFirebase(firebaseConfig);
```

For development, you can use the Firebase emulators:

```javascript
const { initializeFirebaseWithEmulators, emulatorConfig } = require('human-agent-chat');

// Use emulator config (no real API keys needed)
initializeFirebaseWithEmulators(emulatorConfig);
```

### Create a Simple Chat UI

```javascript
import { ChatUI } from 'human-agent-chat';

// Current user information
const currentUser = {
  id: 'user123',
  displayName: 'John Doe',
  email: 'john@example.com',
  photoURL: null // Optional profile photo URL
};

// Create chat options
const chatOptions = {
  containerId: 'chat-container', // ID of the HTML element to render the chat in
  firebasePath: 'chats/my-chat', // Path in Firebase where chat data is stored
  currentUser: currentUser,
  // Only dark theme is supported
  maxMessages: 50, // Maximum number of messages to display
  enableReactions: true, // Enable reactions to messages
  enableReplies: true, // Enable replies to messages
  enableMultiModal: true, // Enable image/video/document uploads
  enableForms: true, // Enable Zod-based form generation
  onNewMessage: (message) => {
    console.log('New message received:', message);
  }
};

// Create and initialize chat
const chatInstance = new ChatUI(chatOptions);
await chatInstance.initialize();
```

### HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chat Example</title>
  <link rel="stylesheet" href="path/to/human-agent-chat.css">
  <script src="path/to/htmx.min.js"></script>
</head>
<body>
  <div id="chat-container"></div>
  
  <!-- Initialize your chat here -->
  <script>
    // Your chat initialization code
  </script>
</body>
</html>
```

## Access Control

HumanAgentChat features a hierarchical access control system using Firebase:

```javascript
import { AccessControl } from 'human-agent-chat';

// Initialize a chat with an admin user
await AccessControl.initializeChat('chats/my-chat', 'admin-user-id');

// Add a member with read access
await AccessControl.addMember('chats/my-chat', 'user-id', 'read', 'admin-user-id');

// Update a member's access level
await AccessControl.updateMember('chats/my-chat', 'user-id', 'write');

// Remove a member
await AccessControl.removeMember('chats/my-chat', 'user-id');

// Check if a user has access
const hasAccess = await AccessControl.hasAccess('chats/my-chat', 'user-id', 'read');
```

## Forms with Zod

Create interactive forms using Zod schemas:

```javascript
import { z } from 'zod';
import { generateForm, createModalForm } from 'human-agent-chat';

// Define a form schema
const feedbackFormSchema = z.object({
  rating: z.number().min(1).max(5).describe('Rate from 1-5 stars'),
  feedback: z.string().min(10).max(500).describe('Provide detailed feedback'),
  category: z.enum(['UI', 'Performance', 'Feature', 'Bug', 'Other'])
});

// Create a modal form
const modal = createModalForm(feedbackFormSchema, (data) => {
  console.log('Form submitted:', data);
  // Process form data
});

// Show the form
modal.show();

// Or send a form in a message
await chatInstance.sendCustomMessage({
  type: 'form',
  value: feedbackFormSchema,
  caption: 'Feedback Form'
});
```

## Firebase Structure

HumanAgentChat uses the following Firebase structure:

```
chats/
  chat-id/
    messages/
      message-id-1: { senderId, content, timestamp, ... }
      message-id-2: { ... }
    members/
      member-doc-1: { userId, level, addedBy, addedAt }
      member-doc-2: { ... }
```

This structure is repeated at different levels of the hierarchy, enabling access control at any level:

```
organizations/
  org-id/
    members/
      member-doc-1: { userId, level, addedBy, addedAt }
    channels/
      channel-id/
        messages/
          message-id-1: { ... }
        members/
          member-doc-1: { ... }
    departments/
      department-id/
        messages/
          message-id-1: { ... }
        members/
          member-doc-1: { ... }
```

## Examples

The package includes several example implementations:

- **Simple**: Basic one-to-one chat
- **One-to-Many**: Team chat with an admin and team members
- **Many-to-Many**: Organization-wide chat with channels and departments

To run the examples:

```bash
# Build the project first - this is required before running examples
npm run build

# Start Firebase emulators (in a separate terminal)
npm run emulators

# Run the examples
npm run example:simple
npm run example:one-to-many
npm run example:many-to-many
```

> **Important Note**: This package uses ES modules throughout. The `type: module` is set in package.json, and all imports/exports use ES module syntax. If you're integrating this into your project, make sure your environment supports ES modules.

When developing:

1. Use `npm run dev` to watch for TypeScript changes during development
2. Always run `npm run build` at least once before running examples after making changes
3. If you see module loading errors in the browser console, check that all scripts are properly using ES module syntax

See the [examples directory](./examples) for more details on each implementation.

## Firebase Emulators

The package includes built-in support for Firebase emulators, allowing you to develop and test without a real Firebase project.

```bash
# Start emulators
npm run emulators

# Start emulators and persist data
npm run emulators:export
```

See [Firebase Emulator Guide](./examples/firebase-emulator.md) for more details.

## API Reference

### ChatUI

The main component for rendering chat interfaces.

#### Constructor

```javascript
new ChatUI(options)
```

#### Options

- `containerId` (string): ID of the HTML element to render the chat in
- `firebasePath` (string): Path in Firebase where chat data is stored
- `currentUser` (User): Current user object with id, displayName, email, photoURL
- `theme` (string, optional): Only 'dark' theme is supported
- `maxMessages` (number, optional): Maximum number of messages to display, defaults to 100
- `enableReactions` (boolean, optional): Enable reactions, defaults to true
- `enableReplies` (boolean, optional): Enable replies, defaults to true
- `enableMultiModal` (boolean, optional): Enable media uploads, defaults to true
- `enableForms` (boolean, optional): Enable forms, defaults to true
- `agentIds` (string[], optional): Array of user IDs that are AI agents
- `onNewMessage` (function, optional): Callback when new messages are received

#### Methods

- `async initialize()`: Initialize the chat UI
- `destroy()`: Clean up event listeners and subscriptions
- `getMessages()`: Get current messages
- `async sendCustomMessage(content, replyToId?)`: Send custom message

### AccessControl

Utility for managing hierarchical access control.

#### Methods

- `async getMembers(path)`: Get all members with access to a path
- `async addMember(path, userId, level, addedBy?)`: Add a new member
- `async updateMember(path, userId, level)`: Update a member's access level
- `async removeMember(path, userId)`: Remove a member
- `async hasAccess(path, userId, requiredLevel)`: Check if user has access
- `async initializeChat(path, adminUserId)`: Create a new chat
- `async grantOrgAccess(orgPath, chatPath, adminUserId)`: Grant org-wide access

### Form Generation

Utilities for creating interactive forms from Zod schemas.

#### Methods

- `generateForm(container, schema, onSubmit)`: Generate a form in a container
- `createModalForm(schema, onSubmit)`: Create a modal form with show/hide methods

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Watch for changes during development
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

## License

MIT