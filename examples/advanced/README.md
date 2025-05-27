# Advanced Chat Example

This example showcases the full capabilities of the Human Agent Chat system, including rich media, interactive forms, AI agents, and complex user interactions.

## Features Demonstrated

### 🎨 Rich Media Support
- **Images**: Single images and galleries with lightbox viewing
- **YouTube Videos**: Embedded video previews with play controls
- **Audio Files**: Audio players with download options
- **Documents**: PDF and file attachments with type detection
- **Multi-attachment Messages**: Combine multiple media types

### 📝 Interactive Forms (Zod Integration)
- **Feedback Forms**: Rating systems with validation
- **Contact Information**: Complex data collection
- **Project Details**: Multi-field forms with enums and arrays
- **Surveys**: Multiple choice and rating scales
- **Real-time Validation**: Schema-based form generation

### 🤖 AI Agent Features
- **Smart Responses**: Context-aware AI messages
- **Technical Analysis**: Code and performance insights
- **Mentions**: Direct user targeting with @mentions
- **Media Generation**: AI-created visualizations
- **Form Requests**: AI can request structured data

### 👥 User Role Management
- **Regular Users**: Standard team members
- **Project Managers**: Admin privileges and oversight
- **AI Assistants**: Intelligent agents with special styling
- **System Messages**: Automated notifications

### 🔄 Real-time Features
- **Live Updates**: Messages appear instantly
- **Typing Indicators**: Show when users are composing
- **Message Status**: Delivery and read receipts
- **Presence**: Online/offline user status

## Quick Start

1. **Prerequisites**:
   ```bash
   # Install dependencies in project root
   npm install
   
   # Build the React components
   npm run build
   ```

2. **Start Firebase Emulators**:
   ```bash
   npm run emulators
   ```

3. **Run the Example**:
   ```bash
   # From the examples/advanced directory
   npx serve .
   # Or use any static file server
   python -m http.server 8080
   ```

4. **Open in Browser**:
   ```
   http://localhost:8080
   ```

## Example Interactions

### 1. Rich Media Workflow
```javascript
// Send an image gallery
const message = {
  content: "Design mockups for review:",
  attachments: [
    { type: 'image', url: '...', title: 'Homepage' },
    { type: 'image', url: '...', title: 'Dashboard' },
    { type: 'image', url: '...', title: 'Profile' }
  ]
};
```

### 2. Zod Form Request
```javascript
// AI requests feedback
const feedbackSchema = {
  rating: "z.number().min(1).max(5).describe('Rate experience')",
  comments: "z.string().min(10).describe('Detailed feedback')",
  wouldRecommend: "z.boolean().describe('Recommend to others?')"
};

const message = {
  content: "@User Please fill out this feedback form:",
  fromAiAgent: true,
  dataRequest: feedbackSchema
};
```

### 3. AI Analysis with Media
```javascript
// AI provides insights with visualization
const message = {
  content: "I've analyzed the performance data:",
  fromAiAgent: true,
  attachments: [
    { type: 'image', url: '...', title: 'Performance Chart' }
  ]
};
```

## Schema Examples

### Feedback Form Schema
```javascript
{
  rating: "z.number().min(1).max(5).describe('Rate your experience')",
  comments: "z.string().min(10).max(500).describe('Share feedback')",
  wouldRecommend: "z.boolean().describe('Would you recommend us?')",
  category: "z.enum(['ui', 'performance', 'features']).describe('Category')"
}
```

### Contact Information Schema
```javascript
{
  firstName: "z.string().min(1).describe('First name')",
  lastName: "z.string().min(1).describe('Last name')",
  email: "z.string().email().describe('Email address')",
  phone: "z.string().optional().describe('Phone (optional)')",
  role: "z.enum(['developer', 'designer', 'manager']).describe('Your role')"
}
```

### Project Details Schema
```javascript
{
  projectName: "z.string().min(3).describe('Project name')",
  description: "z.string().min(50).max(500).describe('Description')",
  priority: "z.enum(['low', 'medium', 'high', 'urgent']).describe('Priority')",
  deadline: "z.string().describe('Deadline (YYYY-MM-DD)')",
  budget: "z.number().positive().describe('Budget in USD')",
  teamSize: "z.number().min(1).max(50).describe('Team size')",
  technologies: "z.array(z.string()).describe('Technologies')",
  hasDesignPhase: "z.boolean().describe('Include design phase?')"
}
```

## Architecture Notes

### Component Integration
```javascript
// Initialize with advanced features
const appProps = {
  initialUser: currentUser,
  chatPath: 'examples/advanced-chat',
  enableForms: true,
  enableMultiModal: true,
  enableAdvancedFeatures: true,
  maxMessages: 100
};
```

### Message Structure
```javascript
// Rich message with all features
const message = {
  content: "Text content with @mentions",
  senderId: "user_id",
  senderName: "Display Name",
  senderRole: "user|admin|agent|system",
  fromAiAgent: true,
  toAiAgent: false,
  recipientIds: ["user1", "user2"],
  attachments: [
    { type: 'image', url: '...', title: '...', description: '...' },
    { type: 'youtube', url: '...', thumbnailUrl: '...', title: '...' }
  ],
  dataRequest: zodSchemaObject,
  metadata: {
    event: 'form_request',
    priority: 'high'
  }
};
```

### Form Handling
```javascript
// Handle form submission
const handleFormSubmit = (formData, schema) => {
  // Validate against Zod schema
  const result = schema.safeParse(formData);
  
  if (result.success) {
    // Send response message
    sendMessage({
      content: "Form submitted successfully!",
      metadata: { formResponse: result.data }
    });
  } else {
    // Handle validation errors
    showValidationErrors(result.error);
  }
};
```

## Customization

### Adding New Media Types
```javascript
// Extend attachment types
const customAttachment = {
  type: 'code',
  url: 'https://gist.github.com/...',
  title: 'Code Sample',
  language: 'javascript',
  description: 'Sample implementation'
};
```

### Custom Zod Schemas
```javascript
// Create complex validation
const surveySchema = {
  responses: "z.array(z.object({ question: z.string(), answer: z.string() }))",
  metadata: "z.object({ duration: z.number(), device: z.string() })",
  consent: "z.boolean().refine(val => val === true, 'Consent required')"
};
```

### AI Behavior Customization
```javascript
// Configure AI responses
const aiConfig = {
  personality: 'helpful',
  expertise: ['frontend', 'design', 'project-management'],
  responseStyle: 'detailed',
  includeAnalysis: true
};
```

## Performance Considerations

- **Large Media**: Images are lazy-loaded and optimized
- **Form Validation**: Client-side validation before submission
- **Message Pagination**: Loads messages in chunks
- **Real-time Updates**: Optimized WebSocket connections
- **Caching**: Intelligent caching of media and schemas

## Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+
- **Features**: ES2020, WebSockets, File API, Canvas API

## Integration Examples

### React Component
```jsx
import { ChatUI } from 'human-agent-chat';

function MyApp() {
  return (
    <ChatUI
      firebasePath="my-app/chat"
      currentUser={user}
      enableForms={true}
      enableMultiModal={true}
      onFormSubmit={handleFormSubmit}
      onMediaUpload={handleMediaUpload}
    />
  );
}
```

### Vanilla JavaScript
```javascript
// Initialize without React
const chat = new HumanAgentChat({
  containerId: 'chat-container',
  firebasePath: 'my-app/chat',
  currentUser: user,
  enableForms: true,
  enableMultiModal: true
});

await chat.initialize();
```

This advanced example demonstrates the full potential of human-AI collaboration through rich, interactive communication.