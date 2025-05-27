// Import our Firebase adapter and chat module
import { firebaseAdapter } from '/js/firebase-browser-adapter.js';
import { initializeChat } from '/js/chat-example.js';

// Firebase emulator config (no real API keys needed)
const firebaseConfig = {
  apiKey: "fake-api-key",
  authDomain: "demo-human-agent-chat.firebaseapp.com",
  projectId: "demo-human-agent-chat",
  storageBucket: "demo-human-agent-chat.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456ghi789jkl"
};

// First set up the Firebase adapter, then initialize the chat
(async function() {
  try {
    // Set up the Firebase adapter first
    console.log("Setting up Firebase adapter...");
    await firebaseAdapter.setupAdapter();
    
    // Now initialize chat when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
      const userData = window.userData;
      initializeChat(firebaseConfig, {
        id: userData.id,
        displayName: userData.displayName,
        email: userData.email,
        photoURL: userData.photoURL
      }, userData.chatPath);
    });
  } catch (error) {
    console.error("Error in initialization:", error);
  }
})();