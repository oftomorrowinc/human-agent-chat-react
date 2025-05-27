# Human Agent Chat Examples

This directory contains comprehensive examples demonstrating the capabilities of the Human Agent Chat system. Each example is self-contained and showcases different aspects of human-AI collaboration.

## Examples Overview

### 📝 [Basic Example](./basic/)
**Perfect for getting started**

- Simple chat interface with user switching
- Basic messaging between humans and AI
- Real-time message updates
- Clean, minimal setup
- Great for learning the fundamentals

**Key Features:**
- Multiple user simulation
- AI agent integration
- @mention system
- Real-time Firebase sync

### 🚀 [Advanced Example](./advanced/)
**Showcases all features**

- Rich media attachments (images, videos, audio, documents)
- Interactive Zod-based forms
- Complex AI interactions
- Multi-user role management
- System notifications

**Key Features:**
- Image galleries with lightbox
- YouTube video embedding
- Audio/document attachments
- Form generation from Zod schemas
- AI analysis and insights
- Project management workflows

## Quick Start

### Prerequisites
```bash
# Install dependencies
npm install

# Build the React components
npm run build

# Start Firebase emulators (recommended)
npm run emulators
```

### Running Examples

#### Option 1: Basic Example
```bash
cd examples/basic
npx serve .
# Open http://localhost:3000
```

#### Option 2: Advanced Example
```bash
cd examples/advanced
npx serve .
# Open http://localhost:3000
```

#### Option 3: Use any static server
```bash
# Python
python -m http.server 8080

# Node.js
npx http-server

# PHP
php -S localhost:8080
```

## Example Comparison

| Feature | Basic | Advanced |
|---------|-------|----------|
| **Messaging** | ✅ | ✅ |
| **User Switching** | ✅ | ✅ |
| **AI Agents** | ✅ | ✅ |
| **@Mentions** | ✅ | ✅ |
| **Real-time Updates** | ✅ | ✅ |
| **Rich Media** | ❌ | ✅ |
| **Zod Forms** | ❌ | ✅ |
| **File Attachments** | ❌ | ✅ |
| **System Messages** | ❌ | ✅ |
| **Complex AI** | ❌ | ✅ |

## Demo Scenarios

### Basic Chat Workflow
1. **Start as User 1** - Send a greeting message
2. **Switch to AI Assistant** - Send an AI response  
3. **Switch to User 2** - Ask a question with @mention
4. **Back to AI** - Provide helpful analysis
5. **System Message** - Simulate automated notification

### Advanced Media Workflow
1. **Send Image Gallery** - Share design mockups
2. **YouTube Video** - Share tutorial link
3. **AI Analysis** - AI provides technical insights
4. **Form Request** - AI asks for feedback via Zod form
5. **Form Response** - User fills out structured data
6. **Document Share** - Attach project specifications

### Form Examples in Advanced Demo

#### Feedback Form
```javascript
{
  rating: "z.number().min(1).max(5).describe('Rate experience')",
  comments: "z.string().min(10).describe('Detailed feedback')",
  wouldRecommend: "z.boolean().describe('Recommend to others?')"
}
```

#### Project Details
```javascript
{
  projectName: "z.string().min(3).describe('Project name')",
  priority: "z.enum(['low', 'medium', 'high']).describe('Priority')",
  budget: "z.number().positive().describe('Budget in USD')",
  technologies: "z.array(z.string()).describe('Required tech stack')"
}
```

## Integration Patterns

### React Integration
```jsx
import { ChatUI } from 'human-agent-chat';

function App() {
  const [currentUser, setCurrentUser] = useState(user1);
  
  return (
    <div className="app">
      <UserSwitcher onUserChange={setCurrentUser} />
      <ChatUI
        firebasePath="my-app/chat"
        currentUser={currentUser}
        enableForms={true}
        enableMultiModal={true}
        onNewMessage={handleNewMessage}
        onFormSubmit={handleFormSubmit}
      />
    </div>
  );
}
```

### Vanilla JavaScript
```javascript
// Initialize Firebase
const firebase = await initializeFirebase(config);

// Create chat instance
const chat = new HumanAgentChat({
  containerId: 'chat-container',
  firebasePath: 'my-app/chat',
  currentUser: user,
  enableAdvancedFeatures: true
});

// Initialize and start chatting
await chat.initialize();
```

### Custom Form Handler
```javascript
function handleFormSubmit(formData, schema) {
  // Validate with Zod
  const result = schema.safeParse(formData);
  
  if (result.success) {
    // Process valid data
    console.log('Form data:', result.data);
    
    // Send confirmation message
    chat.sendMessage({
      content: "✅ Thank you! Your information has been recorded.",
      fromAiAgent: true
    });
  } else {
    // Handle validation errors
    console.error('Validation errors:', result.error);
  }
}
```

## Demo Users

Both examples include these predefined users:

### Regular Users
- **User 1 (Alice)**: Standard team member
- **User 2 (Bob)**: Another team member

### Special Roles  
- **Project Manager (Carol)**: Admin privileges, can request forms
- **AI Assistant**: Intelligent agent with analysis capabilities
- **System**: Automated notifications and status updates

## Firebase Configuration

### Development (Emulators)
```javascript
const firebaseConfig = {
  apiKey: 'demo-key',
  projectId: 'demo-project',
  // ... other config
};

// Connect to local emulators
connectFirestoreEmulator(firestore, 'localhost', 8080);
connectAuthEmulator(auth, 'http://localhost:9099');
connectStorageEmulator(storage, 'localhost', 9199);
```

### Production
```javascript
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};
```

## Troubleshooting

### Common Issues

**Firebase Emulator Connection Fails**
```bash
# Make sure emulators are running
npm run emulators

# Check ports are available
lsof -i :8080,9099,9199
```

**React Components Not Loading**
```bash
# Rebuild components
npm run build

# Check for TypeScript errors
npm run type-check
```

**CORS Issues**
```bash
# Use a proper HTTP server, not file://
npx serve examples/basic
```

**Form Validation Errors**
```javascript
// Check Zod schema syntax
const schema = z.object({
  name: z.string().min(1),
  email: z.string().email()
});
```

## Next Steps

1. **Try Basic Example** - Get familiar with core concepts
2. **Explore Advanced Features** - Test rich media and forms  
3. **Customize for Your Use Case** - Adapt examples to your needs
4. **Build Your Integration** - Use patterns from examples
5. **Deploy to Production** - Replace emulator config with real Firebase

## Need Help?

- 📖 **Documentation**: Check the main README
- 🐛 **Issues**: Report bugs in GitHub issues
- 💡 **Features**: Request enhancements
- 📧 **Support**: Reach out for integration help

These examples provide a solid foundation for building sophisticated human-AI collaboration interfaces!