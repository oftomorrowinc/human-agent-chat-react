# HumanAgentChat

A flexible, opinionated Node.js chat UI component with HTMX for human-AI collaboration backed by Firebase services (Firestore, Storage, and Authentication).

## Overview

HumanAgentChat is a reusable chat component designed for applications that require collaboration between humans and AI agents. It provides a consistent interface for displaying messages, supporting multimedia content, and integrating AI agents within chat flows. The component integrates seamlessly with Firebase, using a hierarchical access control system for flexible permission management. It includes examples of simple, one-to-many, and many-to-many chat scenarios in the `/examples` folder for testing.

## Key Features

- **Hierarchical Access Control**: Simple yet powerful permission model using members collections
- **Multi-modal Support**: Display text, images, videos, and interactive forms
- **AI Agent Integration**: Support for AI agent participants in conversations
- **Firebase Integration**: Built on Firestore for storage with Firebase Auth for user management
- **Dynamic Chat Paths**: Flexible path structure for different organizational hierarchies
- **Dark Theme**: Modern, accessible dark-themed UI with customization options
- **Document Sharing**: Upload and share documents within conversations
- **Dynamic Form Generation**: Zod-based schemas for generating interactive forms
- **HTMX Integration**: Partial page updates for smooth interactivity without a full SPA framework

## Data Structure

The component uses a consistent data structure pattern across all levels of the hierarchy:

```
/{entity}/{entityId}/
  ├── members/  // Access control collection
  │   └── {userId}/
  │       ├── userId: string
  │       ├── role: string
  │       └── joinedAt: timestamp
  └── chats/  // Chat collection
      └── {chatId}/
          └── messages/
              └── {messageId}/
                  ├── content: string
                  ├── type: string (text/image/video/form)
                  ├── senderId: string
                  ├── senderName: string
                  ├── createdAt: timestamp
                  ├── updatedAt: timestamp
                  ├── deleted: boolean
                  ├── isAi: boolean
                  └── metadata: {
                      // Additional metadata for special message types
                  }
```

### User Data Structure

```
/users/{firebaseAuthUserId}/
  ├── email: string
  ├── name: string
  ├── username: string
  ├── avatarUrl: string
  ├── isAi: boolean
  ├── createdAt: timestamp
  └── updatedAt: timestamp
```

## Access Control

The component implements hierarchical access control:

1. To access a chat, the user must be in the corresponding members collection
2. If not, the system checks parent members collections up the hierarchy
3. If no members collections exist at any level, the chat is considered public

This allows for flexible permission schemes:
- Organization-wide access
- Class or project-specific access
- Small group access
- Public chats

## Component API

```javascript
// Server-side setup (Express.js example)
app.get('/chat/:path', (req, res) => {
  const chatComponent = new HumanAgentChat({
    currentUser: req.user,
    path: req.params.path.replace('-', '/'),
    theme: 'dark',
    messageTypes: ['text', 'image', 'video', 'form'],
    enabledAgents: ['rag', 'web']
  });
  
  res.render('chat', { 
    chatHtml: chatComponent.render(),
    chatPath: req.params.path
  });
});

// Client-side integration with HTMX
// <div hx-get="/api/messages?path={chatPath}" hx-trigger="load, every 3s"></div>
```

### Configuration Options

| Option | Type | Required | Description |
|------|------|----------|-------------|
| `currentUser` | Object | Yes | Firebase Auth user object |
| `path` | String | Yes | Full path to the chat (excluding /messages) |
| `theme` | String | No | UI theme ('dark' or 'light', default: 'dark') |
| `messageTypes` | Array | No | Enabled message types (default: all types) |
| `enabledAgents` | Array | No | AI agent types to enable |

## Message Types

The component supports multiple message types:

1. **Text**: Standard text messages with markdown support
2. **Image**: Images displayed inline (upload to Firebase Storage)
3. **Video**: Video playback inline (upload to Firebase Storage)
4. **Form**: Interactive forms based on Zod schemas (rendered as a modal)

Each message type has appropriate metadata and rendering components.

## Dynamic Forms with Zod

The component includes a powerful form generation system based on Zod schemas:

1. **Schema Storage**: Form schemas are stored in Firestore as documents
2. **Dynamic Generation**: UI forms are dynamically generated from Zod schemas
3. **Validation**: Client-side validation using Zod's built-in validation
4. **Contextual Display**: Forms can be displayed in modals or inline based on context
5. **Submission Handling**: Form submissions can trigger agent actions or be saved as messages

Example Zod schema for a feedback form:
```javascript
const feedbackSchema = z.object({
  rating: z.number().min(1).max(5),
  comments: z.string().min(10, "Please provide at least 10 characters of feedback"),
  category: z.enum(["UI", "Performance", "Features", "Other"])
});
```

When a form is triggered:
1. The schema ID is referenced in the message metadata
2. The schema is retrieved from Firestore
3. A dynamic form is generated and displayed
4. The completed form data is processed according to defined handlers

## Agent Integration

The component supports two types of AI agents:

1. **RAG Agent**: Uses a retrieval-augmented generation system to answer questions based on organizational knowledge
2. **Web Agent**: Fetches and processes information from the web for up-to-date answers

Agents are triggered with @mentions in messages:
- `@assistant` for the RAG agent
- `@web` for the web agent

## Form Handling

Forms are displayed in a modal dialog, with schemas defined externally:

1. Form definition is referenced by `schemaId` in the message metadata
2. When a form message is clicked, the modal appears with the form
3. Form submissions can trigger additional actions or send form data as messages

## File Storage

Files (images, videos, documents) are stored in Firebase Storage using a path derived from the chat path:

```
/storage/{entity}/{entityId}/chats/{chatId}/files/{fileId}
```

## Usage Examples

### Simple Chat Example
```javascript
// Server-side route
app.get('/organization-chat/:orgId', (req, res) => {
  const chatComponent = new HumanAgentChat({
    currentUser: req.user,
    path: `organizations/${req.params.orgId}/chats/general`
  });
  
  res.render('chat', { 
    chatHtml: chatComponent.render()
  });
});

// Corresponding HTML with HTMX
<div class="chat-container">
  <div class="messages" 
       hx-get="/api/messages?path=organizations/${orgId}/chats/general" 
       hx-trigger="load, every 3s">
    <!-- Messages will be loaded here -->
  </div>
  
  <form hx-post="/api/messages?path=organizations/${orgId}/chats/general" 
        hx-target=".messages" 
        hx-swap="beforeend">
    <input type="text" name="message" placeholder="Type a message...">
    <button type="submit">Send</button>
  </form>
</div>
```

### One-to-Many Example (Class Discussion)
```javascript
app.get('/class-chat/:orgId/:classId', (req, res) => {
  const chatComponent = new HumanAgentChat({
    currentUser: req.user,
    path: `organizations/${req.params.orgId}/classes/${req.params.classId}/chats/discussion`
  });
  
  res.render('chat', { 
    chatHtml: chatComponent.render()
  });
});
```

### Many-to-Many Example (Group Learning)
```javascript
app.get('/group-chat/:orgId/:classId/:enrollmentId', (req, res) => {
  const chatComponent = new HumanAgentChat({
    currentUser: req.user,
    path: `organizations/${req.params.orgId}/classes/${req.params.classId}/enrollments/${req.params.enrollmentId}/chats/groupwork`
  });
  
  res.render('chat', { 
    chatHtml: chatComponent.render()
  });
});
```

## HTMX Integration

The component uses HTMX for smooth client-side updates without a full SPA framework:

1. **Partial Updates**: Messages are loaded and updated without full page refreshes
2. **Real-time Updates**: Polling or SSE for new message notifications
3. **Form Submissions**: Forms submit with HTMX for seamless UX
4. **File Uploads**: HTMX extensions for file upload support
5. **Modal Dialogs**: Dynamic form modals using HTMX patterns

Example HTMX patterns used:

```html
<!-- Load messages on page load and refresh every 3 seconds -->
<div class="messages" 
     hx-get="/api/messages?path=${chatPath}" 
     hx-trigger="load, every 3s">
</div>

<!-- Send a new message with form submission -->
<form hx-post="/api/messages" 
      hx-target=".messages" 
      hx-swap="beforeend">
  <input type="text" name="message">
  <button type="submit">Send</button>
</form>

<!-- File upload with progress indicator -->
<form hx-post="/api/upload" 
      hx-encoding="multipart/form-data" 
      hx-target="#upload-status">
  <input type="file" name="file">
  <button type="submit">Upload</button>
  <div id="upload-status"></div>
</form>

<!-- Trigger a modal form -->
<button hx-get="/api/forms/${schemaId}" 
        hx-target="#modal-container" 
        hx-trigger="click">
  Open Form
</button>
<div id="modal-container"></div>
```
