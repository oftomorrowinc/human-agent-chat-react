// Main entry point for the human-agent-chat package

// Export main components
export { ChatUI } from './components/ChatUI.js';
export { initializeFirebase } from './lib/firebase.js';
export {
  initializeFirebaseWithEmulators,
  emulatorConfig,
} from './lib/firebase-emulator.js';

// Export types
export * from './types/index.js';

// Export utilities
export * from './utils/access-control.js';
export * from './utils/form-generator.js';
