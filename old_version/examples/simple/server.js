import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import url from 'url';

// Dynamically import the module and validate exports
import {
  initializeFirebaseWithEmulators,
  emulatorConfig,
  ChatUI,
  initializeFirebase,
} from '../../dist/index.js';
import { sendMessage, listenToChat as originalListenToChat, getDb } from '../../dist/lib/firebase.js';
import { createMessage } from '../../dist/types/Message.js';
import { doc, getDoc, getDocs, setDoc, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

// Create a custom listenToChat function that uses createdAt instead of timestamp
function listenToChat(path, messagesLimit = 50, callback) {
  const db = getDb();
  const messagesRef = collection(db, `${path}/messages`);
  
  console.log(`Setting up custom listener for ${path} with correct sorting field (createdAt)`);
  
  // Use createdAt instead of timestamp for ordering
  const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(messagesLimit));
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
      };
    });
    
    console.log(`Listener received ${messages.length} messages with correct sorting`);
    if (messages.length > 0) {
      console.log(`First message: ${messages[0].id}, Last message: ${messages[messages.length-1].id}`);
    }
    
    callback(messages);
  });
}

// Print available exports for debugging
console.log('Module exports available:', {
  ChatUI: typeof ChatUI,
  initializeFirebaseWithEmulators: typeof initializeFirebaseWithEmulators,
  emulatorConfig: typeof emulatorConfig,
});

// In-memory cache of chat messages (in a real app, this would be in a database)
const chatCache = {};

// Track connected SSE clients
const chatEventClients = {};

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Express app
const app = express();
const port = 3000;

// Media content detection utilities (for backward compatibility)
const MEDIA_TYPES = {
  YOUTUBE: 'youtube',
  IMAGE: 'image',
  AUDIO: 'audio',
  LINK: 'link',
  ZOD_SCHEMA: 'zod_schema', // This isn't in MediaType, keeping for compatibility
};

/**
 * Detects and processes media content in messages (legacy version)
 * @param {string} content - The message content to process
 * @returns {Object} Processed content with media information
 */
function legacyProcessMessageContent(content) {
  if (typeof content !== 'string') {
    return {
      type: 'text',
      content: JSON.stringify(content),
      media: [],
    };
  }

  // Initialize the media array that will store all detected media items
  const media = [];
  let processedContent = content;

  // Check for YouTube URLs
  const youtubeRegex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
  const youtubeMatches = [...content.matchAll(youtubeRegex)];

  if (youtubeMatches.length > 0) {
    youtubeMatches.forEach(match => {
      const videoId = match[1];
      const url = match[0];

      // Add to media array
      media.push({
        type: MEDIA_TYPES.YOUTUBE,
        videoId,
        url,
      });

      // Remove URL from content
      processedContent = processedContent.replace(url, '');
    });
  }

  // Check for image URLs
  // Updated regex to handle Unsplash and other image URLs with query parameters
  const imageRegex =
    /(https?:\/\/\S+\.(jpeg|jpg|gif|png|webp)(\?[^"'\s]*)?|https?:\/\/images\.unsplash\.com\/\S+)(?=['")\s]|$)/gi;
  const imageMatches = [...content.matchAll(imageRegex)];

  if (imageMatches.length > 0) {
    // Extract the full URLs
    const images = imageMatches.map(match => match[0]);

    console.log('Detected image URLs:', images);

    // Add to media array
    media.push({
      type: MEDIA_TYPES.IMAGE,
      urls: images,
    });

    // Remove image URLs from the content
    images.forEach(url => {
      processedContent = processedContent.replace(url, '');
    });
  }

  // Check for audio URLs
  const audioRegex = /https?:\/\/\S+\.(mp3|wav|ogg)(\?[^"']*)?(?=['")\s]|$)/gi;
  const audioMatches = [...content.matchAll(audioRegex)];

  if (audioMatches.length > 0) {
    const audioFiles = audioMatches.map(match => match[0]);

    // Add to media array
    media.push({
      type: MEDIA_TYPES.AUDIO,
      urls: audioFiles,
    });

    // Remove audio URLs from the content
    audioFiles.forEach(url => {
      processedContent = processedContent.replace(url, '');
    });
  }

  // Check if there are URLs in the content that didn't match any of the previous patterns
  // This is a fallback to catch Unsplash URLs that might have been missed
  if (
    processedContent.includes('unsplash.com') &&
    !media.some(item => item.type === MEDIA_TYPES.IMAGE)
  ) {
    const unsplashRegex =
      /https?:\/\/(?:www\.)?unsplash\.com\/\S+|https?:\/\/images\.unsplash\.com\/\S+(?=['")\s]|$)/gi;
    const unsplashMatches = [...processedContent.matchAll(unsplashRegex)];

    if (unsplashMatches.length > 0) {
      const unsplashUrls = unsplashMatches.map(match => match[0]);
      console.log('Fallback detected Unsplash URLs:', unsplashUrls);

      // Add to media array
      media.push({
        type: MEDIA_TYPES.IMAGE,
        urls: unsplashUrls,
      });

      // Remove Unsplash URLs from the content
      unsplashUrls.forEach(url => {
        processedContent = processedContent.replace(url, '');
      });
    }
  }

  // Check for Zod schema definitions
  // This is a simplified check - you'd want more robust parsing in production
  if (
    content.includes('z.object(') ||
    content.includes('z.string()') ||
    content.includes('z.number()')
  ) {
    // Instead of adding it to media, we will return it separately later
    // We'll add it to the media array temporarily and then extract it when creating the message object
    media.push({
      type: MEDIA_TYPES.ZOD_SCHEMA,
      schema: content,
    });

    // Replace schema with simpler message in displayed content
    processedContent =
      'This message contains a form schema. Click the button below to provide the requested information.';
  }

  // Use the new structure with media array
  return {
    type: media.length > 0 ? 'rich' : 'text',
    content: processedContent.trim(),
    media: media,
  };
}

/**
 * Generates HTML for media content based on type
 * @param {Array} mediaArray - Array of media objects
 * @returns {string} HTML for the media content
 */
function generateMediaHtml(mediaArray) {
  if (!mediaArray || !Array.isArray(mediaArray) || mediaArray.length === 0) {
    return '';
  }

  // Process each media item and concatenate the results
  return mediaArray
    .map(mediaItem => {
      switch (mediaItem.type) {
        case MEDIA_TYPES.YOUTUBE:
          return `
          <div class="media-content youtube-embed">
            <div class="youtube-preview" data-video-id="${mediaItem.videoId}">
              <img src="https://img.youtube.com/vi/${mediaItem.videoId}/hqdefault.jpg" alt="YouTube video thumbnail">
              <div class="youtube-play-button">
                <svg viewBox="0 0 24 24" width="48" height="48">
                  <path fill="#fff" d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
            <div class="media-controls">
              <button class="media-action expand-video" data-video-id="${mediaItem.videoId}">
                <span>Expand Video</span>
              </button>
              <a href="${mediaItem.url}" target="_blank" class="media-action">
                <span>Open in YouTube</span>
              </a>
            </div>
          </div>
        `;

        case MEDIA_TYPES.IMAGE:
          if (mediaItem.urls.length === 1) {
            return `
            <div class="media-content image-embed">
              <div class="single-image">
                <img src="${mediaItem.urls[0]}" alt="Shared image" class="lightbox-image" data-index="0">
              </div>
            </div>
          `;
          } else {
            // Generate a grid for multiple images
            const imageGrid = mediaItem.urls
              .map(
                (img, index) => `
            <div class="grid-image">
              <img src="${img}" alt="Shared image ${index + 1}" class="lightbox-image" data-index="${index}">
            </div>
          `
              )
              .join('');

            return `
            <div class="media-content image-embed">
              <div class="image-grid image-count-${Math.min(mediaItem.urls.length, 4)}">
                ${imageGrid}
              </div>
            </div>
          `;
          }

        case MEDIA_TYPES.AUDIO:
          const audioPlayers = mediaItem.urls
            .map((audioUrl, index) => {
              const fileType = audioUrl.split('.').pop().toLowerCase();
              return `
            <div class="audio-player">
              <audio controls>
                <source src="${audioUrl}" type="audio/${fileType === 'mp3' ? 'mpeg' : fileType}">
                Your browser does not support the audio element.
              </audio>
              <div class="audio-controls">
                <a href="${audioUrl}" target="_blank" class="media-action">
                  <span>Download Audio</span>
                </a>
              </div>
            </div>
          `;
            })
            .join('');

          return `
          <div class="media-content audio-embed">
            ${audioPlayers}
          </div>
        `;

        case MEDIA_TYPES.ZOD_SCHEMA:
          return `
          <div class="media-content schema-embed">
            <button class="schema-action-button" data-schema='${JSON.stringify(mediaItem.schema)}'>
              <span>Provide Information</span>
            </button>
          </div>
        `;

        default:
          return '';
      }
    })
    .join('');
}

// Set up Pug as the view engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to set appropriate MIME types
const setJavaScriptHeaders = (res, filepath) => {
  if (filepath.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  } else if (filepath.endsWith('.mjs')) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  } else if (filepath.endsWith('.css')) {
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
  } else if (filepath.endsWith('.importmap')) {
    res.setHeader('Content-Type', 'application/importmap+json; charset=utf-8');
  }
};

// Serve distributed files with correct MIME types
app.use(
  '/dist',
  express.static(path.join(__dirname, '../../dist'), {
    setHeaders: setJavaScriptHeaders,
  })
);

// Serve CSS files from dist
app.use(
  '/css',
  express.static(path.join(__dirname, '../../dist/css'), {
    setHeaders: (res, filepath) => {
      if (filepath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      }
    },
  })
);

// Serve CSS files from public
app.use(
  '/css',
  express.static(path.join(__dirname, 'public/css'), {
    setHeaders: (res, filepath) => {
      if (filepath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      }
    },
  })
);

// Serve JS files from public directory
app.use(
  '/js',
  express.static(path.join(__dirname, 'public/js'), {
    setHeaders: setJavaScriptHeaders,
  })
);

// Serve HTMX library
app.use(
  '/htmx',
  express.static(path.join(__dirname, '../../node_modules/htmx.org/dist'))
);

// Serve Firebase modules from node_modules for direct ES module imports
app.use(
  '/firebase',
  express.static(path.join(__dirname, '../../node_modules/firebase'), {
    setHeaders: setJavaScriptHeaders,
  })
);

// Parse request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Firebase with emulators
// You can use real Firebase config in production by setting environment variables
const firebaseConfig = process.env.FIREBASE_API_KEY
  ? {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
    }
  : emulatorConfig;

// Use emulators by default, but allow disabling via environment variable
const useEmulators = process.env.USE_FIREBASE_EMULATORS !== 'false';

// First initialize Firebase
console.log(
  'Initializing Firebase with config:',
  JSON.stringify(firebaseConfig, null, 2)
);
initializeFirebase(firebaseConfig);

// Then connect to emulators if needed
console.log(
  `Connecting to Firebase emulators: ${useEmulators ? 'ENABLED' : 'DISABLED'}`
);
const { firestore } = initializeFirebaseWithEmulators(
  firebaseConfig,
  useEmulators
);

// Log Firestore instance and database details
console.log('Firestore instance initialized:', !!firestore);

// Log detailed database configuration information for emulator UI reference
const dbConfig = {
  projectId: firebaseConfig.projectId,
  databaseId: '(default)', // Firestore uses (default) as the default database ID
  databaseURL: `http://localhost:8080/emulator/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`,
  firestorePath: 'chats/simple-example/messages', // The path we're using in this app
  emulatorHost: 'localhost:8080',
};

console.log('=== FIREBASE EMULATOR REFERENCE INFO ===');
console.log('Database Name (for UI URL): ', dbConfig.databaseId);
console.log('Project ID: ', dbConfig.projectId);
console.log('Database URL: ', dbConfig.databaseURL);
console.log('Firestore Path: ', dbConfig.firestorePath);
console.log('Emulator Host: ', dbConfig.emulatorHost);
console.log('=== END FIREBASE EMULATOR REFERENCE ===');

// Mock users for demonstration
const currentUser = {
  id: 'user1',
  displayName: 'Demo User',
  email: 'demo@example.com',
  photoURL: null,
};

// User lookup table for different message senders
const userLookup = {
  user1: {
    displayName: 'Demo User',
    email: 'demo@example.com',
    photoURL: null,
  },
  user2: {
    displayName: 'User 2',
    email: 'user2@example.com',
    photoURL: null,
  },
  agent_assistant: {
    displayName: 'AI Assistant',
    email: 'assistant@example.com',
    photoURL: null,
  },
  project_manager: {
    displayName: 'Project Manager',
    email: 'pm@example.com',
    photoURL: null,
  },
  system: {
    displayName: 'System',
    email: 'system@example.com',
    photoURL: null,
  },
};

/**
 * Get user display name based on sender ID
 * @param {string} senderId - The sender ID
 * @returns {string} The display name
 */
function getUserDisplayName(senderId) {
  if (userLookup[senderId]) {
    return userLookup[senderId].displayName;
  }

  // Fallback logic based on ID pattern
  if (senderId.toLowerCase().includes('system')) {
    return 'System';
  } else if (senderId.toLowerCase().includes('agent')) {
    return 'AI Assistant';
  } else if (
    senderId.toLowerCase().includes('manager') ||
    senderId.toLowerCase().includes('pm')
  ) {
    return 'Project Manager';
  }

  // Generic fallback
  return `User ${senderId}`;
}

// Set up Firebase message listeners for the demo chat
const demoChatPath = 'chats/simple-example';
let messageUnsubscribe = null;

// Ensure firebase paths exist in firestore before using them
async function ensureFirebasePath(path) {
  try {
    console.log(`Ensuring Firebase path exists: ${path}`);
    const db = getDb();
    console.log('Got Firestore DB instance');
    const pathSegments = path.split('/');
    console.log('Path segments:', pathSegments);

    // Create each segment of the path if it doesn't exist
    let currentPath = '';
    for (let i = 0; i < pathSegments.length; i++) {
      if (i % 2 === 0) {
        // Collection
        currentPath += (i > 0 ? '/' : '') + pathSegments[i];
      } else {
        // Document
        currentPath += '/' + pathSegments[i];
        const docRef = doc(db, currentPath);

        // Check if document exists
        const docSnapshot = await getDoc(docRef);
        if (!docSnapshot.exists()) {
          // Create document with a timestamp
          await setDoc(docRef, {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          console.log(`Created document at ${currentPath}`);
        }
      }
    }

    // Also ensure the messages subcollection exists
    const messagesPath = `${path}/messages`;
    const testMessageRef = doc(collection(db, messagesPath), 'test-message');
    const testMessageSnapshot = await getDoc(testMessageRef);

    if (!testMessageSnapshot.exists()) {
      // Create a test message
      await setDoc(testMessageRef, {
        content: 'Welcome to the chat!',
        senderId: 'system',
        senderName: 'System',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deleted: false,
      });
      console.log(`Created test message at ${messagesPath}`);
    }

    return true;
  } catch (error) {
    console.error('Error ensuring Firebase path:', error);
    return false;
  }
}

function setupChatListener() {
  // Clean up existing listener if any
  if (messageUnsubscribe) {
    console.log('Cleaning up existing Firestore listener');
    messageUnsubscribe();
  }

  // Initialize the chat cache
  if (!chatCache[demoChatPath]) {
    chatCache[demoChatPath] = [];
  }

  // Ensure the chat path exists before setting up listeners
  ensureFirebasePath(demoChatPath).then(success => {
    if (success) {
      console.log('Firebase path created successfully, setting up listener...');
      
      // Set up the listener for real-time updates using our custom listener
      // that uses createdAt instead of timestamp
      messageUnsubscribe = listenToChat(
        demoChatPath,
        50, // Max messages
        messages => {
          console.log('Received messages from Firestore listener:', messages.length);
          
          if (messages.length > 0) {
            console.log('Message IDs from listener:', messages.map(msg => msg.id).join(', '));
          }

          // Update cache with deep copy to prevent reference issues
          chatCache[demoChatPath] = JSON.parse(JSON.stringify(messages));
          console.log(`Chat cache updated with ${messages.length} messages`);

          // Force refresh all connected clients for this chat
          if (chatEventClients[demoChatPath]) {
            console.log(`Notifying ${chatEventClients[demoChatPath].length} connected clients about new messages`);
            chatEventClients[demoChatPath].forEach(client => {
              try {
                client.handler(messages);
              } catch (error) {
                console.error('Error notifying client:', error);
              }
            });
          } else {
            console.log('No SSE clients connected to receive updates');
          }
        }
      );

      console.log(`Started listening to chat: ${demoChatPath}`);
    } else {
      console.error(`Failed to set up Firebase path: ${demoChatPath}`);
    }
  });
}

// Set up the chat listener
setupChatListener();

// Routes
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Simple Chat Example',
    user: currentUser,
    chatPath: 'chats/simple-example',
  });
});

// Environment variables (with defaults)
const MESSAGE_PAGE_SIZE = process.env.MESSAGE_PAGE_SIZE
  ? parseInt(process.env.MESSAGE_PAGE_SIZE)
  : 20;

// API route for fetching messages
app.get('/api/messages', (req, res) => {
  const chatPath = req.query.chatPath;
  const page = parseInt(req.query.page) || 0;
  const loadMore = req.query.loadMore === 'true';
  const timestamp = req.query._t; // Cache-busting timestamp parameter

  if (!chatPath) {
    return res.status(400).json({ error: 'Chat path is required' });
  }

  // Check if this is an HTMX request (for direct HTML rendering)
  const isHtmx = req.headers['hx-request'] === 'true';

  // Get messages from cache
  const messages = chatCache[chatPath] || [];

  // Set cache-control headers to prevent response caching
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Sort messages by createdAt timestamp
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Apply pagination
  const startIndex = loadMore
    ? 0
    : Math.max(0, sortedMessages.length - (page + 1) * MESSAGE_PAGE_SIZE);
  const endIndex = loadMore
    ? sortedMessages.length
    : Math.max(0, sortedMessages.length - page * MESSAGE_PAGE_SIZE);
  const paginatedMessages = sortedMessages.slice(startIndex, endIndex);
  const hasMoreMessages = startIndex > 0;

  if (isHtmx) {
    // Return HTML for HTMX
    if (sortedMessages.length === 0) {
      return res.send(`
        <div class="no-messages">
          <div class="no-messages-icon">💬</div>
          <div class="no-messages-text">No messages yet. Start the conversation!</div>
        </div>
      `);
    }

    // Add load more button if there are more messages to load
    let loadMoreHtml = '';
    if (hasMoreMessages && loadMore) {
      loadMoreHtml = `
        <div class="load-more">
          <button hx-get="/api/messages?chatPath=${encodeURIComponent(chatPath)}&page=${page + 1}&loadMore=true" 
                  hx-trigger="click" 
                  hx-target="#chat-messages" 
                  hx-swap="afterbegin"
                  hx-on:after-swap="const messagesContainer = document.querySelector('#chat-messages'); const currentHeight = messagesContainer.scrollHeight; setTimeout(() => { messagesContainer.scrollTop = messagesContainer.scrollHeight - currentHeight + 50; }, 10);">
            <span class="load-more-icon">↑</span>
            <span class="load-more-text">Show earlier messages</span>
          </button>
        </div>
      `;
    }

    // Group messages by day
    const messagesByDay = {};
    paginatedMessages.forEach(message => {
      const date = new Date(message.createdAt);
      const dateKey = date.toDateString();
      if (!messagesByDay[dateKey]) {
        messagesByDay[dateKey] = [];
      }
      messagesByDay[dateKey].push(message);
    });

    // Generate HTML for messages grouped by day
    let messagesHtml = loadMoreHtml; // Add load more button at the top if applicable

    // Sort days in ascending order
    const sortedDays = Object.entries(messagesByDay).sort(
      (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
    );

    sortedDays.forEach(([dateKey, messages]) => {
      // Add date divider
      messagesHtml += `
        <div class="date-divider">
          <span class="date-text">${new Date(dateKey).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </div>
      `;

      // Render messages for this day
      messages.forEach(message => {
        const isCurrentUser = message.senderId === currentUser.id;
        // Get user name from lookup function
        let senderName = getUserDisplayName(message.senderId);
        let userClass = 'user-regular';

        // Determine user type based on ID for CSS classes
        if (message.senderId.toLowerCase().includes('system')) {
          userClass = 'user-system';
        } else if (message.senderId.toLowerCase().includes('agent')) {
          userClass = 'user-agent';
        } else if (
          message.senderId.toLowerCase().includes('manager') ||
          message.senderId.toLowerCase().includes('pm')
        ) {
          userClass = 'user-pm';
        }

        const timestamp = new Date(message.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        const avatarInitial = senderName.charAt(0).toUpperCase();

        // Handle special message types
        let messageContentHtml = '';
        if (typeof message.content === 'string') {
          if (message.content.startsWith('Project status changed')) {
            // System message
            messageContentHtml = `
              <div class="message-system">
                ${message.content}
              </div>
            `;
          } else if (
            message.content.includes('completed') &&
            message.content.includes('tasks')
          ) {
            // Task completed message
            messageContentHtml = `
              <div class="message-task-complete">
                ${message.content} 🎉
              </div>
            `;
          } else {
            // Handle mentions with @ symbol
            const contentWithMentions = message.content.replace(
              /@(\w+)/g,
              '<span class="mention">@$1</span>'
            );

            // Generate HTML for attachments if present
            let mediaHtml = '';
            if (message.attachments) {
              // Make sure attachments is an array
              try {
                const attachmentsArray = Array.isArray(message.attachments) ? 
                  message.attachments : 
                  (typeof message.attachments === 'string' ? 
                    (message.attachments.startsWith('[') ? 
                      JSON.parse(message.attachments) : 
                      [JSON.parse(message.attachments)]) : 
                    [message.attachments]);
                
                mediaHtml = attachmentsArray
                  .map(attachment => {
                  switch (attachment.type) {
                    case 'youtube':
                      const videoIdMatch = attachment.url.match(
                        /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
                      );
                      const videoId = videoIdMatch ? videoIdMatch[1] : '';
                      if (!videoId) return '';

                      return `
                      <div class="media-content youtube-embed">
                        <div class="youtube-preview" data-video-id="${videoId}">
                          <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="YouTube video thumbnail">
                          <div class="youtube-play-button">
                            <svg viewBox="0 0 24 24" width="48" height="48">
                              <path fill="#fff" d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        </div>
                        <div class="media-controls">
                          <button class="media-action expand-video" data-video-id="${videoId}">
                            <span>Expand Video</span>
                          </button>
                          <a href="${attachment.url}" target="_blank" class="media-action">
                            <span>Open in YouTube</span>
                          </a>
                        </div>
                      </div>
                    `;

                    case 'image':
                      return `
                      <div class="media-content image-embed">
                        <div class="single-image">
                          <img src="${attachment.url}" alt="${attachment.title || 'Shared image'}" class="lightbox-image" data-index="0">
                        </div>
                      </div>
                    `;

                    case 'audio':
                      const fileType =
                        attachment.url.split('.').pop()?.toLowerCase() || 'mp3';
                      return `
                      <div class="media-content audio-embed">
                        <div class="audio-player">
                          <audio controls>
                            <source src="${attachment.url}" type="${attachment.mimeType || `audio/${fileType === 'mp3' ? 'mpeg' : fileType}`}">
                            Your browser does not support the audio element.
                          </audio>
                          <div class="audio-controls">
                            <a href="${attachment.url}" target="_blank" class="media-action">
                              <span>Download Audio</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    `;

                    default:
                      return '';
                  }
                })
                .join('');
              } catch (error) {
                console.error('Error processing attachments:', error);
                mediaHtml = `<div class="media-error">Error processing attachments: ${error.message}</div>`;
              }
            } else if (message.media && message.media.length > 0) {
              // Backward compatibility with old schema
              mediaHtml = generateMediaHtml(message.media);
            }

            // Handle data request if present
            let dataRequestHtml = '';
            if (message.dataRequest) {
              dataRequestHtml = `
                <div class="media-content schema-embed">
                  <button class="schema-action-button" data-schema='${JSON.stringify(message.dataRequest)}'>
                    <span>Provide Information</span>
                  </button>
                </div>
              `;
            }

            // Combine text and media content
            messageContentHtml = `
              <div class="message-text">
                ${contentWithMentions}
              </div>
              ${mediaHtml}
              ${dataRequestHtml}
            `;
          }
        } else {
          // Complex content types
          messageContentHtml = `
            <div class="message-text">
              ${JSON.stringify(message.content)}
            </div>
          `;
        }

        messagesHtml += `
          <div class="chat-message ${userClass}" id="msg-${message.id}">
            <div class="avatar">
              <div class="avatar-initials" data-initial="${avatarInitial}">${avatarInitial}</div>
            </div>
            <div class="message-header">
              <span class="message-sender">${senderName}</span>
              <span class="message-time">${timestamp}</span>
            </div>
            <div class="message-content">
              ${messageContentHtml}
            </div>
            <div class="message-actions">
              <button class="message-action" title="React">
                <span>😀</span>
              </button>
              <button class="message-action" title="Reply">
                <span>↩️</span>
              </button>
            </div>
          </div>
        `;
      });
    });

    return res.send(messagesHtml);
  } else {
    // Return JSON for API consumers
    return res.status(200).json({
      messages: paginatedMessages,
      pagination: {
        page,
        pageSize: MESSAGE_PAGE_SIZE,
        totalMessages: sortedMessages.length,
        hasMore: hasMoreMessages,
      },
    });
  }
});

// API route for sending messages
app.post('/api/messages', async (req, res) => {
  try {
    const {
      message,
      chatPath,
      userId,
      fromAiAgent,
      recipientIds,
      attachments,
      dataRequest,
    } = req.body;

    if (!message || !chatPath || !userId) {
      return res
        .status(400)
        .json({ error: 'Message, chatPath, and userId are required' });
    }

    // Process message content to extract attachments if none were explicitly provided
    const shouldProcessContent = !attachments || attachments.length === 0;
    const processedContent = shouldProcessContent
      ? legacyProcessMessageContent(message)
      : { content: message, attachments: [] };

    // Determine if we have a Zod schema as a data request from the content
    let extractedDataRequest = dataRequest || processedContent.dataRequest;

    // Determine user role from lookup table
    let senderRole = null;
    if (userLookup[userId]) {
      if (
        userId.includes('agent') ||
        userId.includes('assistant') ||
        fromAiAgent
      ) {
        senderRole = 'ai';
      } else if (userId.includes('system')) {
        senderRole = 'system';
      } else {
        senderRole = 'user';
      }
    }

    // Get the display name
    const senderName = getUserDisplayName(userId);

    // Parse string attachments if they're coming from HTMX
    let parsedAttachments = [];
    
    // Handle different formats of attachments
    if (attachments) {
      // If it's a string that looks like a JSON object
      if (typeof attachments === 'string' && (attachments.startsWith('{') || attachments.startsWith('['))) {
        try {
          const parsed = JSON.parse(attachments);
          // Handle both array and single object formats
          parsedAttachments = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
          console.warn('Error parsing attachments string as JSON:', e);
          parsedAttachments = [attachments]; // Keep as is if parsing fails
        }
      } 
      // If it's already an array
      else if (Array.isArray(attachments)) {
        parsedAttachments = attachments.map(attachment => {
          if (typeof attachment === 'string') {
            try {
              return JSON.parse(attachment);
            } catch (e) {
              console.warn('Error parsing attachment array item:', e);
              return attachment;
            }
          }
          return attachment;
        });
      } 
      // If it's a single object attachment
      else if (typeof attachments === 'object') {
        parsedAttachments = [attachments];
      }
    }
    
    console.log('Parsed attachments:', parsedAttachments);
    
    // Create message object with new structure using the createMessage helper
    const messageObj = createMessage({
      senderId: userId,
      senderName: senderName,
      senderRole: senderRole,
      content: processedContent.content || message,

      // Use parsed attachments
      attachments: parsedAttachments,
      dataRequest: extractedDataRequest,

      // Add fromAiAgent flag if provided or determined by user ID
      // Convert string 'true' to boolean true
      fromAiAgent:
        (fromAiAgent === 'true' || fromAiAgent === true) || 
        userId.includes('agent') || 
        userId.includes('assistant'),
      // Set toAiAgent explicitly to false (not undefined)
      toAiAgent: false,

      // Add recipient IDs if provided (convert undefined to empty array)
      recipientIds: recipientIds || [],

      // Add metadata
      metadata: {
        event: 'message_created',
      },
    });

    // For backward compatibility with legacy content
    if (processedContent.media && processedContent.media.length > 0) {
      // Convert legacy media items to attachments
      const mediaAttachments = processedContent.media.flatMap(mediaItem => {
        switch (mediaItem.type) {
          case MEDIA_TYPES.YOUTUBE:
            if (!mediaItem.url) return [];
            // Extract video ID from URL if not provided
            const videoIdMatch = mediaItem.url.match(
              /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
            );
            const videoId =
              mediaItem.videoId || (videoIdMatch ? videoIdMatch[1] : '');
            if (!videoId) return [];

            return [
              {
                type: 'youtube',
                url: mediaItem.url,
                thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                title: 'YouTube Video',
              },
            ];
          case MEDIA_TYPES.IMAGE:
            return mediaItem.urls
              ? mediaItem.urls.map(url => ({
                  type: 'image',
                  url,
                  title: 'Image',
                }))
              : [];
          case MEDIA_TYPES.AUDIO:
            return mediaItem.urls
              ? mediaItem.urls.map(url => ({
                  type: 'audio',
                  url,
                  title: 'Audio',
                  mimeType: `audio/${url.split('.').pop()?.toLowerCase() === 'mp3' ? 'mpeg' : url.split('.').pop()}`,
                }))
              : [];
          default:
            return [];
        }
      });

      // Add to attachments
      if (!messageObj.attachments) {
        messageObj.attachments = [];
      }
      messageObj.attachments.push(...mediaAttachments);
    }

    // Log the processed message object with more detailed info
    console.log(`Server processing message from ${userId}:`, {
      original: message,
      processed: processedContent,
      messageObj,
    });
    
    // Debug log the current state of the messages collection
    console.log(`Current messages in cache for ${chatPath} before adding new message:`, 
      chatCache[chatPath] ? 
      `${chatCache[chatPath].length} messages, IDs: ${chatCache[chatPath].map(m => m.id).join(', ')}` : 
      'No messages in cache');

    // Make sure the chat path exists before sending
    await ensureFirebasePath(chatPath);

    // Send message to Firebase - this will trigger the listener to update the cache
    const messageId = await sendMessage(chatPath, messageObj);

    // Log success with detailed information
    console.log(`Message sent and stored in Firestore with ID: ${messageId}`);
    
    // Add a delay to ensure Firestore has time to update and the listener has triggered
    setTimeout(async () => {
      try {
        // Manually verify the message is in Firestore
        const db = getDb();
        const msgDocRef = doc(db, `${chatPath}/messages/${messageId}`);
        const msgDoc = await getDoc(msgDocRef);
        
        if (msgDoc.exists()) {
          console.log(`Verification: Message ${messageId} exists in Firestore`);
          console.log(`Firestore data: ${JSON.stringify(msgDoc.data())}`);
          console.log(`Full Firestore path: ${chatPath}/messages/${messageId}`);
          console.log(`Document reference: ${msgDocRef.path}`);
          
          // Also check the cache to see if it was updated by the listener
          const cachedMsg = chatCache[chatPath]?.find(m => m.id === messageId);
          console.log(`Cache status: Message ${messageId} ${cachedMsg ? 'exists' : 'does not exist'} in cache`);
          
          if (!cachedMsg) {
            console.log('NOTE: Message exists in Firestore but not in cache yet. Listener may be delayed.');
            console.log('EMULATOR UI: Check for this message at:');
            console.log(`http://localhost:4000/firestore/data/documents/${encodeURIComponent(msgDocRef.path)}`);
            console.log(`Or navigate to: ${dbConfig.projectId} > (default) > chats > simple-example > messages > ${messageId}`);
            
            // IMPORTANT FIX: If message is not in cache but exists in Firestore, manually add it to cache
            console.log('Manually adding message to cache since listener missed it');
            const messageData = msgDoc.data();
            if (!chatCache[chatPath]) {
              chatCache[chatPath] = [];
            }
            
            // Add to cache with ID
            chatCache[chatPath].push({
              id: messageId,
              ...messageData
            });
            
            console.log(`Cache updated. Now has ${chatCache[chatPath].length} messages.`);
            
            // Notify all connected clients about the new message
            if (chatEventClients[chatPath]) {
              console.log(`Manually notifying ${chatEventClients[chatPath].length} clients about new message`);
              chatEventClients[chatPath].forEach(client => {
                try {
                  client.handler(chatCache[chatPath]);
                } catch (notifyError) {
                  console.error('Error notifying client:', notifyError);
                }
              });
            }
          }
        } else {
          console.error(`Verification failed: Message ${messageId} not found in Firestore!`);
          console.error(`Tried path: ${chatPath}/messages/${messageId}`);
          console.error(`Full document reference: ${msgDocRef.path}`);
          console.error(`EMULATOR UI: Try checking http://localhost:4000/firestore/data`);
        }
      } catch (verifyError) {
        console.error('Error verifying message in Firestore:', verifyError);
      }
    }, 300);

    // Note: We don't need to manually update the cache anymore since the Firebase
    // listener will do that for us. The listenToChat function will handle
    // receiving the new message, updating the cache, and notifying clients.

    // Return the new message for HTMX to render along with feedback
    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const avatarInitial = currentUser.displayName.charAt(0).toUpperCase();

    // Use the already processed message
    // We don't need to call processMessageContent again since we have the messageObj

    // Handle mentions with @ symbol
    const contentWithMentions = messageObj.content.replace(
      /@(\w+)/g,
      '<span class="mention">@$1</span>'
    );

    // Generate HTML for attachments if present
    let mediaHtml = '';
    if (messageObj.attachments) {
      // Ensure we have an array of attachments
      const attachmentsArray = Array.isArray(messageObj.attachments) ? 
        messageObj.attachments : 
        (typeof messageObj.attachments === 'string' ? 
          (messageObj.attachments.startsWith('[') ? 
            JSON.parse(messageObj.attachments) : 
            [JSON.parse(messageObj.attachments)]) : 
          [messageObj.attachments]);
      
      try {
        mediaHtml = attachmentsArray
          .map(attachment => {
          switch (attachment.type) {
            case 'youtube':
              const videoIdMatch = attachment.url.match(
                /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
              );
              const videoId = videoIdMatch ? videoIdMatch[1] : '';
              if (!videoId) return '';

              // Generate a unique group ID for attachments in this message
              const groupId = `attachment-group-${messageId || Date.now()}`;

              return `
              <div class="youtube-item">
                <div class="youtube-preview lightbox-trigger" 
                  data-type="youtube"
                  data-group="${groupId}"
                  data-index="0"
                  data-video-id="${videoId}"
                  data-url="${attachment.url}"
                  data-title="${attachment.title || 'YouTube Video'}"
                >
                  <img src="${attachment.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}" alt="YouTube Thumbnail" />
                  <div class="play-button-overlay">
                    <svg viewBox="0 0 24 24" width="64" height="64">
                      <path fill="#fff" d="M8 5v14l11-7z"/>
                      <circle cx="12" cy="12" r="10" stroke="#fff" stroke-width="2" fill="none"/>
                    </svg>
                  </div>
                </div>
                ${attachment.title ? `<div class="attachment-caption">${attachment.title}</div>` : ''}
              </div>
            `;

            case 'image':
              // Generate a unique group ID for attachments in this message
              const imgGroupId = `attachment-group-${messageId || Date.now()}`;

              return `
              <div class="image-item">
                <img 
                  src="${attachment.url}" 
                  alt="${attachment.title || 'Image'}" 
                  class="lightbox-trigger"
                  data-type="image"
                  data-group="${imgGroupId}"
                  data-index="0"
                  data-url="${attachment.url}"
                  data-title="${attachment.title || ''}"
                />
                ${attachment.title ? `<div class="attachment-caption">${attachment.title}</div>` : ''}
              </div>
            `;

            case 'document':
            case 'file':
              // Generate a unique group ID for attachments in this message
              const docGroupId = `attachment-group-${messageId || Date.now()}`;

              // Try to determine document type icon based on file extension or mime type
              let iconType = 'document';
              if (
                attachment.mimeType?.includes('pdf') ||
                attachment.url.match(/\.pdf$/i)
              ) {
                iconType = 'pdf';
              } else if (
                attachment.mimeType?.includes('spreadsheet') ||
                attachment.url.match(/\.(xlsx?|csv)$/i)
              ) {
                iconType = 'spreadsheet';
              } else if (
                attachment.mimeType?.includes('presentation') ||
                attachment.url.match(/\.(pptx?)$/i)
              ) {
                iconType = 'presentation';
              }

              return `
              <div class="document-item ${iconType}-item">
                <a href="${attachment.url}" target="_blank" class="document-link lightbox-trigger"
                  data-type="document"
                  data-group="${docGroupId}"
                  data-index="0"
                  data-url="${attachment.url}"
                  data-title="${attachment.title || ''}"
                >
                  <div class="document-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V9L13 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M13 2V9H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                  <div class="document-info">
                    <span class="document-title">${attachment.title || attachment.url.split('/').pop() || 'Document'}</span>
                    ${attachment.mimeType ? `<span class="document-type">${attachment.mimeType}</span>` : ''}
                  </div>
                </a>
              </div>
            `;

            case 'audio':
              const fileType =
                attachment.url.split('.').pop()?.toLowerCase() || 'mp3';
              return `
              <div class="media-content audio-embed">
                <div class="audio-player">
                  <audio controls>
                    <source src="${attachment.url}" type="${attachment.mimeType || `audio/${fileType === 'mp3' ? 'mpeg' : fileType}`}">
                    Your browser does not support the audio element.
                  </audio>
                  <div class="audio-controls">
                    <a href="${attachment.url}" target="_blank" class="media-action">
                      <span>Download Audio</span>
                    </a>
                  </div>
                </div>
              </div>
            `;

            case 'link':
              // Generate a unique group ID for attachments in this message
              const linkGroupId = `attachment-group-${messageId || Date.now()}`;

              return `
              <div class="link-item">
                <a href="${attachment.url}" target="_blank" class="link lightbox-trigger"
                  data-type="link"
                  data-group="${linkGroupId}"
                  data-index="0"
                  data-url="${attachment.url}"
                  data-title="${attachment.title || ''}"
                >
                  <span class="link-icon">🔗</span>
                  <span class="link-title">${attachment.title || attachment.url}</span>
                </a>
              </div>
            `;

            default:
              return '';
          }
        })
        .join('');
      } catch (error) {
        console.error('Error processing attachments:', error);
        mediaHtml = `<div class="media-error">Error processing attachments: ${error.message}</div>`;
      }
    }

    // Generate HTML for data request if present
    let dataRequestHtml = '';
    if (messageObj.dataRequest) {
      dataRequestHtml = `
        <div class="media-content schema-embed">
          <button class="schema-action-button" data-schema='${JSON.stringify(messageObj.dataRequest)}'>
            <span>Provide Information</span>
          </button>
        </div>
      `;
    }

    // Check if we need to add a date divider (first message of the day)
    let dividerHtml = '';
    const todayKey = now.toDateString();
    const needsDivider = !chatCache[chatPath].some(msg => {
      const msgDate = new Date(msg.timestamp).toDateString();
      return msgDate === todayKey;
    });

    if (needsDivider) {
      dividerHtml = `
        <div class="date-divider">
          <span class="date-text">${now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </div>
      `;
    }

    const messageHtml = `
      ${dividerHtml}
      <div class="chat-message user-regular" id="msg-${messageId}">
        <div class="avatar">
          <div class="avatar-initials" data-initial="${avatarInitial}">${avatarInitial}</div>
        </div>
        <div class="message-header">
          <span class="message-sender">${currentUser.displayName}</span>
          <span class="message-time">${formattedTime}</span>
        </div>
        <div class="message-content">
          <div class="message-text">${contentWithMentions}</div>
          ${mediaHtml}
          ${dataRequestHtml}
        </div>
        <div class="message-actions">
          <button class="message-action" title="React">
            <span>😀</span>
          </button>
          <button class="message-action" title="Reply">
            <span>↩️</span>
          </button>
        </div>
      </div>
    `;

    // Set HX-Trigger header for HTMX to handle clearing the input field and refreshing messages
    res.setHeader(
      'HX-Trigger', 
      JSON.stringify({
        clearInput: true,
        refreshMessages: { 
          timestamp: Date.now() // Add timestamp to force a cache-busting refresh 
        }
      })
    );
    
    // Include the OOB input reset with the main response
    // This avoids sending multiple responses
    res.send(`
      ${messageHtml}
      <input id="message-input" name="message" value="" hx-swap-oob="true">
    `);
  } catch (error) {
    console.error('Error sending message:', error);
    // Only attempt to send error response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to send message' });
    }
  }
});

// API route for message reactions
app.post('/api/message/react', (req, res) => {
  const { messageId, reaction } = req.body;

  if (!messageId || !reaction) {
    return res
      .status(400)
      .json({ error: 'Message ID and reaction are required' });
  }

  // In a real app, this would update the message in Firebase
  res.status(200).json({ success: true });
});

// API route for message replies
app.post('/api/message/reply', (req, res) => {
  const { messageId } = req.body;

  if (!messageId) {
    return res.status(400).json({ error: 'Message ID is required' });
  }

  // In a real app, this would set up a reply in Firebase
  res.status(200).json({ success: true });
});

// API endpoint to reset/clear all messages in a chat
app.post('/api/chat/reset', async (req, res) => {
  try {
    const { chatPath } = req.body;
    
    if (!chatPath) {
      return res.status(400).json({ error: 'Chat path is required' });
    }
    
    console.log(`Resetting chat at path: ${chatPath}`);
    
    // Get Firestore database instance
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Firebase database not initialized' });
    }
    
    // First, we'll clear out the cache to ensure immediate UI update
    console.log(`Clearing cache for chat: ${chatPath}`);
    if (chatCache[chatPath]) {
      chatCache[chatPath] = [];
    }
    
    // For this simple demo, the most reliable way to reset is to recreate the parent document
    try {
      // First, re-ensure the parent document exists (in case it's deleted)
      console.log(`Recreating parent document at ${chatPath}`);
      
      try {
        // Try to create or clear the messages collection first
        const messagesPath = `${chatPath}/messages`;
        console.log(`Recreating messages collection at ${messagesPath}`);
        
        // At this point we'd ideally delete all messages, but the Firebase JS SDK
        // doesn't support collection deletion. In a real app, you'd use admin SDK or
        // Cloud Functions to delete the collection. For this demo, we'll recreate the parent.
      } catch (collectionError) {
        console.error('Error clearing messages collection:', collectionError);
        // Continue anyway
      }
      
      // Try deleting and recreating the parent document
      const docRef = doc(db, chatPath);
      
      // Create parent document with reset timestamp
      await setDoc(docRef, { 
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        resetAt: new Date().toISOString()
      });
      
      console.log(`Successfully recreated document at ${chatPath}`);
    } catch (error) {
      console.error('Error recreating parent document:', error);
      // Continue anyway
    }
    
    // Create a welcome message in a new messages subcollection
    const messagesPath = `${chatPath}/messages`;
    console.log(`Creating welcome message in ${messagesPath}`);
    const welcomeMessageRef = doc(collection(db, messagesPath), 'welcome-message');
    
    const welcomeMessageData = {
      content: 'Chat has been reset. Start a new conversation!',
      senderId: 'system',
      senderName: 'System',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: false,
      id: 'welcome-message' // Add ID field explicitly for reliable identification
    };
    
    await setDoc(welcomeMessageRef, welcomeMessageData);
    console.log('Welcome message created successfully with ID: welcome-message');
    
    // Manually update the cache with the welcome message for immediate feedback
    chatCache[chatPath] = [{
      id: 'welcome-message',
      ...welcomeMessageData
    }];
    
    console.log(`Chat at ${chatPath} has been reset successfully`);
    
    // Update the listener to ensure it picks up the new document structure
    // This is important as sometimes Firestore listeners might not detect the changes
    // if the parent document's subcollections are recreated
    try {
      console.log('Refreshing Firestore listener to ensure it detects the reset');
      if (messageUnsubscribe) {
        messageUnsubscribe();
        console.log('Unsubscribed from existing listener');
      }
      
      // Re-establish the listener with the same callback
      messageUnsubscribe = listenToChat(
        demoChatPath,
        50, // Max messages
        messages => {
          console.log('Received messages from Firestore AFTER RESET:', messages.length);
          console.log('Message IDs:', messages.map(msg => msg.id).join(', '));
          
          messages.forEach((msg, i) => {
            console.log(
              `Message ${i + 1}/${messages.length}: ID=${msg.id}, sender=${msg.senderId}, content=${typeof msg.content === 'string' ? msg.content.substring(0, 30) + (msg.content.length > 30 ? '...' : '') : '[object]'}`
            );
          });

          // Update cache with deep copy to prevent reference issues
          chatCache[demoChatPath] = JSON.parse(JSON.stringify(messages));
          console.log(`Chat cache updated with ${messages.length} messages after reset`);

          // Force refresh all connected clients for this chat
          if (chatEventClients[demoChatPath]) {
            console.log(`Notifying ${chatEventClients[demoChatPath].length} connected clients about reset results`);
            chatEventClients[demoChatPath].forEach(client => {
              try {
                console.log(`Sending messages update to client ${client.id} after reset`);
                client.handler(messages);
              } catch (error) {
                console.error('Error notifying client:', error);
              }
            });
          } else {
            console.log('No SSE clients connected to receive updates after reset');
          }
        }
      );
      
      console.log('Successfully refreshed Firestore listener after reset');
    } catch (listenerError) {
      console.error('Error refreshing Firestore listener:', listenerError);
      // Continue anyway - the notification below will still work
    }
    
    // Force refresh for client display (direct notification bypass)
    // We still do this even though we refreshed the listener, for redundancy
    setTimeout(() => {
      // Notify all connected clients about the reset
      if (chatEventClients[chatPath]) {
        console.log(`Direct notification of ${chatEventClients[chatPath].length} clients about reset`);
        
        chatEventClients[chatPath].forEach(client => {
          try {
            console.log(`Sending direct reset notification to client ${client.id}`);
            client.handler(chatCache[chatPath]);
          } catch (error) {
            console.error('Error in direct client notification about reset:', error);
          }
        });
      } else {
        console.log('No SSE clients connected to receive direct reset notification');
      }
    }, 200); // Increased timeout for better sequencing
    
    // Check if this is an HTMX request (for HTML response)
    const isHtmx = req.headers['hx-request'] === 'true';
    
    if (isHtmx) {
      // Return HTML content for HTMX
      res.send(`
        <div class="no-messages">
          <div class="no-messages-icon">💬</div>
          <div class="no-messages-text">Chat has been reset. Start a new conversation!</div>
        </div>
      `);
    } else {
      // Return JSON for API consumers
      res.status(200).json({ 
        success: true, 
        message: 'Chat reset successfully'
      });
    }
  } catch (error) {
    console.error('Error resetting chat:', error);
    res.status(500).json({ error: 'Failed to reset chat', details: error.message });
  }
});

// Server-Sent Events endpoint for real-time updates
app.get('/api/chat-events', (req, res) => {
  const chatPath = req.query.chatPath;

  if (!chatPath) {
    return res.status(400).json({ error: 'Chat path is required' });
  }

  // Set up SSE with proper headers to prevent caching
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering if present
  
  // Send a comment to establish the connection
  res.write(': SSE connection established\n\n');
  
  // Add a timestamp to ensure uniqueness in the response
  const timestamp = Date.now();

  // Send initial data
  if (chatCache[chatPath]) {
    const initialMessages = chatCache[chatPath];
    console.log(`Sending initial ${initialMessages.length} messages to new SSE client with timestamp ${timestamp}`);
    res.write(
      `data: ${JSON.stringify({ type: 'messages', messages: initialMessages, timestamp })}\n\n`
    );
  } else {
    console.log(`No cached messages for ${chatPath}, sending empty array to new SSE client`);
    res.write(
      `data: ${JSON.stringify({ type: 'messages', messages: [], timestamp })}\n\n`
    );
  }

  // Create a unique client ID with timestamp to ensure uniqueness
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  console.log(`New SSE client connected: ${clientId} for chat: ${chatPath}`);

  // Function to send a heartbeat every 30 seconds to keep the connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (error) {
      console.error(`Error sending heartbeat to client ${clientId}:`, error);
      clearInterval(heartbeatInterval);
    }
  }, 30000);

  // Add this client to the list of connected clients
  const messageHandler = messages => {
    try {
      // Add timestamp to ensure unique messages
      const messageTimestamp = Date.now();
      console.log(`Sending ${messages.length} messages to client ${clientId} with timestamp ${messageTimestamp}`);
      res.write(`data: ${JSON.stringify({ type: 'messages', messages, timestamp: messageTimestamp })}\n\n`);
    } catch (error) {
      console.error(`Error sending message to client ${clientId}:`, error);
    }
  };

  // Add listener for this specific chat
  const chatListener = {
    id: clientId,
    chatPath,
    handler: messageHandler,
  };

  // Keep track of connected clients
  if (!chatEventClients[chatPath]) {
    chatEventClients[chatPath] = [];
  }
  chatEventClients[chatPath].push(chatListener);
  console.log(`Added client ${clientId} to chat ${chatPath}, total clients: ${chatEventClients[chatPath].length}`);

  // Remove client when connection closes
  req.on('close', () => {
    console.log(`SSE client disconnected: ${clientId} from chat: ${chatPath}`);
    clearInterval(heartbeatInterval);
    
    if (chatEventClients[chatPath]) {
      const beforeCount = chatEventClients[chatPath].length;
      chatEventClients[chatPath] = chatEventClients[chatPath].filter(
        client => client.id !== clientId
      );
      const afterCount = chatEventClients[chatPath].length;
      console.log(`Removed client ${clientId} from chat ${chatPath}, clients before: ${beforeCount}, after: ${afterCount}`);
    }
  });
});

// Add a debug endpoint to inspect the database state
app.get('/api/debug/database', async (req, res) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Firebase database not initialized' });
    }
    
    // Get all database state info
    const debugInfo = {
      cacheState: {
        chatCacheKeys: Object.keys(chatCache),
        simpleChatMessages: chatCache[demoChatPath] ? {
          count: chatCache[demoChatPath].length,
          messageIds: chatCache[demoChatPath].map(msg => msg.id),
          sampleMessages: chatCache[demoChatPath].slice(0, 5).map(msg => ({
            id: msg.id,
            senderId: msg.senderId,
            content: typeof msg.content === 'string' ? 
              (msg.content.length > 50 ? msg.content.substring(0, 50) + '...' : msg.content) : 
              '[object]',
            createdAt: msg.createdAt
          }))
        } : 'No messages in cache',
      },
      firestoreConfig: dbConfig,
      connectedClients: Object.keys(chatEventClients).map(path => ({
        path,
        clientCount: chatEventClients[path].length,
        clientIds: chatEventClients[path].map(client => client.id)
      }))
    };
    
    // Try to directly fetch messages from Firestore to compare with cache
    try {
      const msgCollectionRef = collection(db, `${demoChatPath}/messages`);
      const snapshot = await getDocs(msgCollectionRef);
      
      const firestoreMessages = [];
      snapshot.forEach(doc => {
        firestoreMessages.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      debugInfo.firestoreState = {
        messageCount: firestoreMessages.length,
        messageIds: firestoreMessages.map(msg => msg.id),
        sampleMessages: firestoreMessages.slice(0, 5).map(msg => ({
          id: msg.id,
          senderId: msg.senderId,
          content: typeof msg.content === 'string' ? 
            (msg.content.length > 50 ? msg.content.substring(0, 50) + '...' : msg.content) : 
            '[object]',
          createdAt: msg.createdAt
        }))
      };
    } catch (firestoreError) {
      debugInfo.firestoreState = {
        error: firestoreError.message,
        note: 'Failed to fetch messages directly from Firestore'
      };
    }

    res.json(debugInfo);
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint for debugging
app.get('/api/debug', async (req, res) => {
  try {
    // Get current database state
    const db = getDb();
    const chatPath = demoChatPath;
    const messagesRef = collection(db, `${chatPath}/messages`);
    
    // Query messages directly from Firestore
    const snapshot = await getDocs(messagesRef);
    const messages = [];
    snapshot.forEach(doc => {
      messages.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Return debug info
    res.json({
      firestoreMessages: messages,
      cacheMessages: chatCache[chatPath] || [],
      queryPath: `${chatPath}/messages`
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Simple chat example running at http://localhost:${port}`);
  console.log(`Debug endpoint available at http://localhost:${port}/api/debug`);
});
