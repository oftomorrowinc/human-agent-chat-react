# Basic Chat Example

This example demonstrates the core functionality of the Human Agent Chat system in a simple, easy-to-understand setup.

## Features Demonstrated

- **Basic messaging** between multiple users
- **Real-time updates** using Firebase
- **User switching** to simulate different participants
- **AI agent integration** with automatic responses
- **Mention system** with @username syntax
- **Clean, modern UI** with dark theme

## Quick Start

1. **Start Firebase Emulators** (recommended for development):
   ```bash
   # From the project root
   npm run emulators
   ```

2. **Open the example**:
   ```bash
   # Serve the file with a simple HTTP server
   npx serve examples/basic
   # Or open index.html directly in your browser
   ```

3. **Try the demo**:
   - Use the sidebar controls to switch between users
   - Send quick messages using the predefined buttons
   - Try the AI assistant features
   - See real-time updates as different users

## Code Structure

### HTML Structure
```html
<div class="app-container">
  <div class="sidebar">
    <!-- Demo controls -->
  </div>
  <div class="chat-area">
    <!-- Chat component renders here -->
  </div>
</div>
```

### Key JavaScript Functions

- `initializeFirebase()` - Sets up Firebase with emulator support
- `initializeChat()` - Loads and renders the React chat component
- `switchUser(userId)` - Changes the current user
- `sendQuickMessage(message)` - Sends a message as the current user
- `sendAIMessage()` - Sends an AI-generated response

### Demo Users

The example includes three predefined users:

1. **User 1** - Regular user account
2. **User 2** - Another regular user account  
3. **AI Assistant** - Agent account with special styling

## Firebase Configuration

The example uses Firebase emulators by default:
- **Firestore**: localhost:8080
- **Auth**: localhost:9099
- **Storage**: localhost:9199

If emulators aren't running, it will attempt to connect to production Firebase (which will likely fail without proper configuration).

## Customization

### Adding More Users
```javascript
const demoUsers = {
  // Add new users here
  manager: {
    id: 'manager',
    displayName: 'Project Manager',
    email: 'manager@example.com',
    role: 'admin'
  }
};
```

### Custom Messages
```javascript
// Add to the sendQuickMessage function
const customMessages = [
  'Your custom message here',
  'Another custom message'
];
```

### Styling
The CSS is included inline for simplicity. Key classes:
- `.sidebar` - Left control panel
- `.chat-area` - Main chat interface
- `.demo-button` - Sidebar buttons
- `.loading` - Loading indicator

## Integration Notes

This example shows how to:
1. Load the chat component as an ES module
2. Initialize Firebase with emulator support
3. Pass user data to the chat component
4. Handle user switching dynamically
5. Integrate with external controls

The patterns shown here can be adapted for integration into larger applications.