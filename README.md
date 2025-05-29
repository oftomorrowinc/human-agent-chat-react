# Human Agent Chat React

A modern, opinionated React chat system for human-AI collaboration. Built with Firebase, TypeScript, Tailwind CSS, and designed exclusively for dark mode.

## ✨ Features

- **🌙 Dark Mode Only**: Beautiful, modern dark theme optimized for extended use
- **🔥 Firebase Powered**: Real-time messaging with Firestore, file storage, and authentication
- **🤖 AI Agent Integration**: Support for AI agents with @mention system
- **📋 Dynamic Forms**: Zod-based form generation with modal interfaces using zod-form-react
- **🔐 Hierarchical Access Control**: Flexible permission system for organizations, teams, and projects
- **📎 Rich Media Support**: Images, videos, documents, YouTube embeds, and more
- **⚡ Real-time Updates**: Live message updates and typing indicators
- **🎨 Modern UI**: Clean, responsive interface built with Tailwind CSS
- **📱 Mobile Friendly**: Responsive design that works on all devices

## 🏗️ Architecture

This is a complete rewrite of the original Node.js/Express/Pug system into a modern React application while maintaining the same powerful features:

- **React 18** with TypeScript for type safety
- **Firebase SDK v10** for backend services
- **Tailwind CSS** for styling (dark theme only)
- **Zod** for schema validation and form generation
- **Lucide React** for icons
- **Date-fns** for date formatting

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Firebase project (or use emulators)

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd human-agent-chat
   npm install
   ```

2. **Configure Firebase:**
   ```bash
   cp .env.example .env
   ```
   
   For production, add your Firebase config to `.env`:
   ```env
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
   REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef
   REACT_APP_USE_FIREBASE_EMULATORS=false
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

### Using Firebase Emulators (Recommended for Development)

The app is pre-configured to use Firebase emulators for development:

1. **Install Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Start emulators (in a separate terminal):**
   ```bash
   # Copy emulator config from old_version
   cp old_version/firebase.json .
   cp old_version/firestore.rules .
   cp old_version/storage.rules .
   
   firebase emulators:start
   ```

3. **Start React app:**
   ```bash
   npm start
   ```

The app will automatically connect to emulators when `REACT_APP_USE_FIREBASE_EMULATORS=true`.

## 📚 Examples

We've included comprehensive examples to help you get started quickly:

### 🏃‍♂️ Quick Demo

```bash
# Install dependencies
npm install

# Run the advanced example with Firebase emulators
npm run demo
```

This starts both Firebase emulators and the advanced example at:
- **Advanced Example**: http://localhost:3002
- **Firebase Emulator UI**: http://localhost:4000

### 📖 Available Examples

#### Basic Example
```bash
npm run example:basic
# Opens at http://localhost:3001
```

Features demonstrated:
- Simple chat interface with user switching
- AI agent integration with @mentions
- Real-time Firebase sync
- Basic message types

#### Advanced Example  
```bash
npm run example:advanced
# Opens at http://localhost:3002
```

Features demonstrated:
- 🎨 **Rich Media**: Images, YouTube videos, audio, documents
- 📝 **Zod Forms**: Interactive schema-based forms
- 🤖 **AI Interactions**: Smart analysis and insights
- 👥 **Role Management**: Users, managers, AI agents
- ⚙️ **System Messages**: Automated notifications

#### Run Both Examples
```bash
npm run examples
# Basic: http://localhost:3001
# Advanced: http://localhost:3002
```

### 🎮 Demo Scenarios

The examples include interactive demo buttons to showcase:

**Rich Media Workflow:**
1. Send image galleries with lightbox viewing
2. Share YouTube videos with embedded previews  
3. Upload documents and audio files
4. AI-generated visualizations

**Zod Form Examples:**
```javascript
// Feedback form schema
{
  rating: "z.number().min(1).max(5).describe('Rate experience')",
  comments: "z.string().min(10).describe('Detailed feedback')",
  wouldRecommend: "z.boolean().describe('Recommend to others?')"
}
```

**AI Agent Interactions:**
- Technical analysis and insights
- @mention targeting with smart responses
- Form requests for structured data collection
- Multi-modal responses with attachments

For detailed documentation, see [examples/README.md](./examples/README.md).

## 🎯 Usage

### Basic Chat Integration

```tsx
import { ChatUI } from './components/ChatUI';
import { createUser } from './types';

const user = createUser({
  id: 'user123',
  displayName: 'John Doe',
  email: 'john@example.com',
  role: 'user'
});

function App() {
  return (
    <ChatUI
      firebasePath=\"chats/my-chat\"
      currentUser={user}
      enableReactions={true}
      enableMultiModal={true}
      enableForms={true}
      agentIds={['agent_assistant']}
      onNewMessage={(message) => console.log('New message:', message)}
    />
  );
}
```

### Access Control Setup

```tsx
import { AccessControl, AccessLevel } from './utils/access-control';

// Initialize a chat with admin
await AccessControl.initializeChat('chats/team-chat', 'admin-user-id');

// Add team members
await AccessControl.addMember('chats/team-chat', 'user-id', AccessLevel.WRITE, 'admin-user-id');

// Check access
const hasAccess = await AccessControl.hasAccess('chats/team-chat', 'user-id', AccessLevel.READ);
```

### Form Integration with Zod

```tsx
import { z } from 'zod';

const feedbackSchema = z.object({
  rating: z.number().min(1).max(5),
  feedback: z.string().min(10).max(500),
  category: z.enum(['UI', 'Performance', 'Feature', 'Bug'])
});

// Send a form request
await sendMessage('Please provide feedback', undefined, feedbackSchema);
```

## 🗂️ Firebase Data Structure

The app uses a hierarchical structure for flexible access control:

```
organizations/
  org-id/
    members/          # Organization-level access
    teams/
      team-id/
        members/      # Team-level access  
        chats/
          chat-id/
            messages/ # Chat messages
            members/  # Chat-specific access
projects/
  project-id/
    members/          # Project-level access
    chats/
      chat-id/
        messages/
        members/
chats/                # Direct chats
  chat-id/
    messages/
    members/
```

## 🎨 Customization

### Styling

The app uses Tailwind CSS with a custom dark theme. Key CSS variables:

```css
:root {
  --chat-bg: #0f172a;        /* Background */
  --chat-surface: #1e293b;    /* Surface */
  --chat-border: #334155;     /* Borders */
  --chat-text: #f1f5f9;      /* Text */
  --chat-accent: #3b82f6;     /* Accent */
  --chat-agent: #8b5cf6;      /* AI Agent */
}
```

### Adding Custom Message Types

1. **Extend the attachment schema:**
   ```tsx
   export const customAttachmentSchema = attachmentSchema.extend({
     type: z.enum([...AttachmentTypeEnum.options, 'custom-type'])
   });
   ```

2. **Add rendering logic in MessageItem.tsx:**
   ```tsx
   case 'custom-type':
     return renderCustomAttachment(attachment);
   ```

## 🔧 Development

### Available Scripts

**Development:**
- `npm start` - Start development server
- `npm build` - Build for production  
- `npm test` - Run tests
- `npm run lint` - Check code quality
- `npm run format` - Format code with Prettier
- `npm run type-check` - TypeScript type checking

**Examples:**
- `npm run demo` - Run advanced example with Firebase emulators
- `npm run example:basic` - Run basic example (port 3001)
- `npm run example:advanced` - Run advanced example (port 3002)
- `npm run examples` - Run both examples simultaneously
- `npm run emulators` - Start Firebase emulators only

**Testing:**
- `npm run test` - Run React component tests
- `npm run test:examples` - Run comprehensive integration tests for examples
- `npm run test:examples:watch` - Run integration tests in watch mode
- `npm run test:all` - Run both React and example tests

### Project Structure

```
src/
├── components/          # React components
│   ├── ChatUI.tsx      # Main chat interface
│   ├── MessageItem.tsx # Individual message rendering
│   ├── Modal.tsx       # Base modal component
│   ├── FormModal.tsx   # Zod form modal
│   └── MediaUploadModal.tsx # Media upload interface
├── lib/
│   └── firebase.ts     # Firebase configuration
├── utils/
│   └── access-control.ts # Access control utilities
├── types/
│   └── index.ts        # TypeScript definitions
└── App.tsx            # Main application
```

## 🚀 Deployment

### Production Build

```bash
npm run build
```

### Deploy to Firebase Hosting

```bash
firebase init hosting
firebase deploy
```

### Environment Variables

Set production environment variables:

```env
REACT_APP_USE_FIREBASE_EMULATORS=false
REACT_APP_FIREBASE_API_KEY=your_production_key
# ... other Firebase config
```

## 🤝 Comparison with Original

| Feature | Original (Node.js/Pug) | React Version |
|---------|------------------------|---------------|
| UI Framework | Server-rendered Pug + HTMX | React 18 + TypeScript |
| Styling | Custom CSS | Tailwind CSS |
| Forms | Server-side Zod rendering | zod-form-react modals |
| Real-time | SSE + polling | Firebase listeners |
| File Uploads | Express multer | Firebase Storage |
| State Management | Server state | React state + Firebase |
| Build System | TypeScript + custom | Create React App |

## 📋 Features from Original

✅ **Fully Implemented:**
- Hierarchical access control
- Multi-modal content (images, videos, documents, audio)
- AI agent integration with @mentions
- Zod-based form generation with stars/slider elements
- Dark theme UI
- Firebase integration with emulator support
- Real-time messaging
- File uploads with drag & drop
- **Emoji reactions** with 11 configurable emojis
- **Advanced lightbox** for media viewing
- **Audio playback** with generated WAV files
- **User switching** with proper message ownership
- **Click-to-edit** for text messages
- **Comprehensive test suite**

🚧 **Future Enhancements:**
- Message threading/replies
- Typing indicators
- Message search
- Push notifications
- Message history/pagination

## 🐛 Troubleshooting

### Firebase Emulator Issues

1. **Port conflicts:** Check that ports 9099, 8080, 9199 are available
2. **Rules errors:** Ensure `firestore.rules` and `storage.rules` exist
3. **Clear emulator data:** Delete `emulator-data/` folder

### Build Issues

1. **TypeScript errors:** Run `npm run build` to see all errors
2. **Missing dependencies:** Run `npm install` to ensure all packages are installed
3. **Environment variables:** Check `.env` file configuration

## 📄 License

MIT

## 🙏 Acknowledgments

- Built on the foundation of the original human-agent-chat Node.js system
- Uses [zod-form-react](https://github.com/oftomorrowinc/zod-form-react) for form generation
- Inspired by modern chat interfaces like Discord and Slack

---

**Ready to chat with humans and AI? Start your development server and experience the future of collaborative communication! 🚀**