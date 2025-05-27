// Import Firebase modules directly (will use the importmap)
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Global chat instance to maintain through the application
let chatInstance;

/**
 * Initialize chat component
 * @param {Object} firebaseConfig Firebase configuration
 * @param {Object} user Current user
 * @param {string} chatPath Firebase path for chat
 */
export async function initializeChat(firebaseConfig, user, chatPath) {
  try {
    console.log("Starting chat initialization...");
    
    // Import Firebase SDK from CDN
    const firebaseApp = await importFirebaseModule('firebase/app');
    const firebaseFirestore = await importFirebaseModule('firebase/firestore');
    const firebaseAuth = await importFirebaseModule('firebase/auth');
    const firebaseStorage = await importFirebaseModule('firebase/storage');
    
    // Set up global references for the modules our library expects
    window.firebase = {
      app: firebaseApp,
      firestore: firebaseFirestore,
      auth: firebaseAuth,
      storage: firebaseStorage
    };
    
    // Create a global import polyfill for ESM
    window.importFirebase = importFirebaseModule;
    
    // Import our human-agent-chat module
    const humanAgentChatModule = await import('/dist/index.js');
    
    console.log("Module loaded:", Object.keys(humanAgentChatModule));
    
    // Extract needed components
    const { ChatUI } = humanAgentChatModule;
    
    // Initialize Firebase with emulators
    console.log("Initializing Firebase...");
    const app = firebaseApp.initializeApp(firebaseConfig);
    const firestore = firebaseFirestore.getFirestore(app);
    const auth = firebaseAuth.getAuth(app);
    const storage = firebaseStorage.getStorage(app);
    
    // Connect to emulators
    console.log("Connecting to Firebase emulators...");
    firebaseFirestore.connectFirestoreEmulator(firestore, 'localhost', 8080);
    firebaseAuth.connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    firebaseStorage.connectStorageEmulator(storage, 'localhost', 9199);
    
    // Set global firebase instances
    window._firebase = {
      app: app,
      firestore: firestore,
      auth: auth,
      storage: storage
    };
    
    // Create chat options
    const chatOptions = {
      containerId: 'chat-container',
      firebasePath: chatPath,
      currentUser: user,
      // Dark theme is the only option
      maxMessages: 50,
      enableReactions: true,
      enableReplies: true,
      enableMultiModal: true,
      enableForms: true,
      onNewMessage: (message) => {
        console.log('New message received:', message);
      }
    };
    
    console.log("Creating ChatUI instance...");
    // Create and initialize chat
    chatInstance = new ChatUI(chatOptions);
    
    console.log("Initializing ChatUI...");
    await chatInstance.initialize();
    
    console.log('Chat initialized successfully');
    
    // Expose chat instance to window for debugging
    window.chatInstance = chatInstance;
    return chatInstance;
  } catch (error) {
    console.error('Error initializing chat:', error);
    console.error('Error details:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    throw error;
  }
}

// For backward compatibility
window.initializeChat = initializeChat;
window.getChat = () => chatInstance;