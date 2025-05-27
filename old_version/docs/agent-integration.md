# AI Agent Integration Guide

HumanAgentChat is designed to seamlessly integrate AI agents into your chat interfaces, enabling natural human-AI collaboration. This guide explains how to incorporate AI agents into your chat applications.

## Overview

AI agents in HumanAgentChat are treated as special types of users that can participate in conversations. The component provides visual distinctions for agent messages and supports various integration patterns.

## Basic Agent Setup

### 1. Define Agent Users

First, create user objects for your AI agents:

```javascript
const aiAgent = {
  id: 'agent-123',
  displayName: 'AI Assistant',
  photoURL: '/images/ai-avatar.png', // Optional
  isAgent: true // Important flag to identify as an agent
};
```

### 2. Configure ChatUI with Agent IDs

When initializing ChatUI, provide the agent IDs:

```javascript
const chatOptions = {
  containerId: 'chat-container',
  firebasePath: 'chats/my-chat',
  currentUser: currentUser,
  agentIds: ['agent-123', 'agent-456'], // List of agent user IDs
  // other options...
};

const chatInstance = new ChatUI(chatOptions);
await chatInstance.initialize();
```

### 3. Grant Agent Access

Agents need access to the chat:

```javascript
// Give the agent read/write access to the chat
await AccessControl.addMember('chats/my-chat', 'agent-123', 'write', 'admin-user-id');
```

## Agent Message Styling

Agent messages receive special styling:

- Background color uses the `--message-agent-bg` CSS variable
- Avatar uses the `--agent-color` for generated initials
- Agent badge is displayed in member lists

You can customize the appearance by overriding these CSS variables.

## Integration Patterns

### Manual Agent Message Injection

The simplest integration pattern is to manually send messages on behalf of the agent:

```javascript
// Function to send an agent message
async function sendAgentMessage(content) {
  const message = {
    senderId: 'agent-123', // Agent's user ID
    content: content,
    timestamp: Date.now()
  };
  
  await sendMessage('chats/my-chat', message);
}

// Usage
sendAgentMessage('Hello! I'm your AI assistant. How can I help you today?');
```

### Webhook-based Integration

A common pattern is to use webhooks to connect your chat to an AI service:

```javascript
// In your Express server
app.post('/api/agent-response', async (req, res) => {
  const { chatPath, messageId, agentId, response } = req.body;
  
  // Send the agent's response
  await sendMessage(chatPath, {
    senderId: agentId,
    content: response,
    timestamp: Date.now(),
    replyToId: messageId // Optional: reply to the original message
  });
  
  res.json({ success: true });
});

// Client-side code to trigger agent
function askAgent(message) {
  fetch('/api/ask-agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: message,
      chatPath: 'chats/my-chat',
      userId: currentUser.id
    })
  });
}
```

### Real-time Cloud Function Integration

For Firebase projects, Cloud Functions provide a seamless integration:

```javascript
// In Firebase Cloud Functions
exports.processAgentRequests = functions.firestore
  .document('chats/{chatId}/messages/{messageId}')
  .onCreate(async (snapshot, context) => {
    const message = snapshot.data();
    const { chatId } = context.params;
    
    // Check if this message should trigger the agent
    if (message.content.startsWith('@ai ')) {
      // Extract the query
      const query = message.content.substring(4);
      
      // Get response from AI service
      const agentResponse = await getAIResponse(query);
      
      // Send agent response back to the chat
      await admin.firestore()
        .collection(`chats/${chatId}/messages`)
        .add({
          senderId: 'agent-123',
          content: agentResponse,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          replyToId: snapshot.id
        });
    }
  });
```

## Advanced Agent Features

### Multi-modal Agent Responses

Agents can send various types of content:

```javascript
// Send an image response
await sendMessage('chats/my-chat', {
  senderId: 'agent-123',
  content: {
    type: 'image',
    value: 'https://example.com/generated-image.png',
    caption: 'Image generated based on your description'
  },
  timestamp: Date.now()
});

// Send a form for the user to fill out
await sendMessage('chats/my-chat', {
  senderId: 'agent-123',
  content: {
    type: 'form',
    value: orderFormSchema, // Zod schema
    caption: 'Please fill out this order form'
  },
  timestamp: Date.now()
});
```

### Context-aware Agents

For more sophisticated agents, you can provide conversation context:

```javascript
async function getContextAwareResponse(chatPath, messageId) {
  // Get the last 10 messages for context
  const messages = await getRecentMessages(chatPath, 10);
  
  // Format conversation history for the AI
  const conversationHistory = messages.map(msg => ({
    role: msg.senderId === 'agent-123' ? 'assistant' : 'user',
    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
  }));
  
  // Get response from AI with context
  const response = await callAIAPI({
    messages: conversationHistory,
    max_tokens: 500
  });
  
  // Send the response
  await sendMessage(chatPath, {
    senderId: 'agent-123',
    content: response,
    timestamp: Date.now(),
    replyToId: messageId
  });
}
```

### Agent Capabilities Indication

You can indicate what an agent can do:

```javascript
// In your UI code
function renderAgentCapabilities() {
  return `
    <div class="agent-capabilities">
      <h3>AI Assistant can:</h3>
      <ul>
        <li>Answer questions about our products</li>
        <li>Help troubleshoot common issues</li>
        <li>Generate custom reports</li>
        <li>Schedule appointments</li>
      </ul>
      <button id="ask-agent-btn">Ask the Assistant</button>
    </div>
  `;
}
```

## Security Considerations

1. **Authentication**: Ensure agent messages can only be sent by authorized services
2. **Content Safety**: Implement content filters for agent responses
3. **Rate Limiting**: Prevent abuse by limiting how often an agent can be queried
4. **Logging**: Log all agent interactions for monitoring and improvement

## Example: Complete Agent Integration

Here's a complete example integration with an AI service:

```javascript
// In your server.js
const express = require('express');
const { initializeFirebase, sendMessage } = require('human-agent-chat');
const { OpenAI } = require('openai');

const app = express();
app.use(express.json());

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Firebase
initializeFirebase({
  // Firebase config
});

// Endpoint to query the AI agent
app.post('/api/ask-agent', async (req, res) => {
  try {
    const { message, chatPath, userId } = req.body;
    
    // Get recent chat messages for context
    const recentMessages = await getRecentMessages(chatPath, 10);
    
    // Format messages for OpenAI
    const formattedMessages = recentMessages.map(msg => ({
      role: msg.senderId === 'agent-123' ? 'assistant' : 'user',
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
    }));
    
    // Add the current message
    formattedMessages.push({
      role: 'user',
      content: message
    });
    
    // Get response from OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: formattedMessages,
      max_tokens: 500
    });
    
    const agentResponse = completion.choices[0].message.content;
    
    // Send agent response to chat
    await sendMessage(chatPath, {
      senderId: 'agent-123', // Agent ID
      content: agentResponse,
      timestamp: Date.now()
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error processing agent request:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Helper function to get recent messages
async function getRecentMessages(chatPath, limit = 10) {
  // Implementation using Firebase
  // ...
}

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Best Practices

1. **Clear Agent Identity**: Ensure users can easily distinguish AI agents from humans
2. **Transparent Capabilities**: Be clear about what the agent can and cannot do
3. **Fallback Mechanisms**: Have fallbacks for when the agent cannot handle a request
4. **Response Time Indicators**: Show when an agent is "thinking" or generating a response
5. **Human Handoff**: Provide a way for users to escalate to human support when needed
6. **Continuous Improvement**: Monitor agent interactions to improve responses over time