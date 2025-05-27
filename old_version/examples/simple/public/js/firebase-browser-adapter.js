/**
 * Firebase browser adapter
 * This file patches the way imports work to make our library's Firebase imports work in the browser
 */

// Import our module loader
import { importFirebaseModule } from '/js/firebase-module-loader.js';

// Create a map of Firebase exports for the browser
export const firebaseAdapter = {
  async setupAdapter() {
    try {
      // Import all Firebase modules we need
      const app = await importFirebaseModule('firebase/app');
      const firestore = await importFirebaseModule('firebase/firestore');
      const auth = await importFirebaseModule('firebase/auth');
      const storage = await importFirebaseModule('firebase/storage');
      
      // Set up window.firebase as a namespace for all Firebase modules
      window.firebase = { 
        ...app, 
        firestore: { ...firestore },
        auth: { ...auth },
        storage: { ...storage }
      };
      
      // Create a special import mechanism for dynamic ESM imports
      if (!window.importShim) {
        window.importShim = async (specifier) => {
          if (specifier.startsWith('firebase/')) {
            return importFirebaseModule(specifier);
          }
          return import(specifier);
        };
      }
      
      // Add a global require function for CommonJS style imports
      if (!window.require) {
        window.require = (moduleName) => {
          if (moduleName === 'firebase/app') return app;
          if (moduleName === 'firebase/firestore') return firestore;
          if (moduleName === 'firebase/auth') return auth;
          if (moduleName === 'firebase/storage') return storage;
          throw new Error(`Module ${moduleName} not found`);
        };
      }
      
      // Patch import for our compiled code
      // This is a special technique to hijack the import mechanism for our specific modules
      const originalImport = window.import;
      window.import = function(specifier) {
        if (specifier.includes('firebase/')) {
          console.log(`Redirecting import for ${specifier}`);
          return importFirebaseModule(specifier);
        }
        return originalImport.apply(this, arguments);
      };
      
      console.log('Firebase browser adapter is ready');
      return { app, firestore, auth, storage };
    } catch (error) {
      console.error('Error setting up Firebase adapter:', error);
      throw error;
    }
  }
};