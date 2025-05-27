import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  connectFirestoreEmulator,
  enableNetwork,
  disableNetwork,
} from 'firebase/firestore';
import {
  getStorage,
  FirebaseStorage,
  connectStorageEmulator,
} from 'firebase/storage';
import {
  getAuth,
  Auth,
  connectAuthEmulator,
  signInAnonymously,
  User,
} from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'demo-key',
  authDomain:
    process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ||
    'demo-project.firebaseapp.com',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket:
    process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId:
    process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '1:123456789:web:abcdef',
};

// Emulator configuration
const emulatorConfig = {
  apiKey: 'demo-key',
  authDomain: 'demo-project.firebaseapp.com',
  projectId: 'demo-project',
  storageBucket: 'demo-project.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef',
};

// Global Firebase instances
let app: FirebaseApp;
let db: Firestore;
let storage: FirebaseStorage;
let auth: Auth;

// Check if we should use emulators
const useEmulators =
  process.env.NODE_ENV === 'development' &&
  process.env.REACT_APP_USE_FIREBASE_EMULATORS !== 'false';

/**
 * Initialize Firebase with production or emulator configuration
 */
export function initializeFirebase(): {
  app: FirebaseApp;
  db: Firestore;
  storage: FirebaseStorage;
  auth: Auth;
} {
  // Prevent multiple initialization
  if (getApps().length === 0) {
    const config = useEmulators ? emulatorConfig : firebaseConfig;
    app = initializeApp(config);

    console.log(
      `🔥 Firebase initialized with ${useEmulators ? 'emulator' : 'production'} config`
    );
  } else {
    app = getApps()[0];
  }

  // Initialize services
  db = getFirestore(app);
  storage = getStorage(app);
  auth = getAuth(app);

  // Connect to emulators if in development
  if (useEmulators) {
    connectToEmulators();
  }

  return { app, db, storage, auth };
}

/**
 * Connect to Firebase emulators for development
 */
function connectToEmulators() {
  try {
    // Only connect if not already connected
    // @ts-ignore - _delegate is internal but needed to check connection status
    if (!db._delegate._databaseId.projectId.includes('localhost')) {
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log('📡 Connected to Firestore emulator');
    }

    // @ts-ignore - Check if storage emulator is connected
    if (!storage._location.host.includes('localhost')) {
      connectStorageEmulator(storage, 'localhost', 9199);
      console.log('📁 Connected to Storage emulator');
    }

    // @ts-ignore - Check if auth emulator is connected
    if (!auth.config.apiHost?.includes('localhost')) {
      connectAuthEmulator(auth, 'http://localhost:9099');
      console.log('🔐 Connected to Auth emulator');
    }
  } catch (error) {
    console.warn('⚠️ Emulator connection warning:', error);
    // Continue anyway - emulators might already be connected
  }
}

/**
 * Get the initialized Firestore instance
 */
export function getDb(): Firestore {
  if (!db) {
    const { db: firestore } = initializeFirebase();
    return firestore;
  }
  return db;
}

/**
 * Get the initialized Storage instance
 */
export function getFirebaseStorageInstance(): FirebaseStorage {
  if (!storage) {
    const { storage: firebaseStorage } = initializeFirebase();
    return firebaseStorage;
  }
  return storage;
}

/**
 * Get the initialized Auth instance
 */
export function getFirebaseAuthInstance(): Auth {
  if (!auth) {
    const { auth: firebaseAuth } = initializeFirebase();
    return firebaseAuth;
  }
  return auth;
}

/**
 * Initialize anonymous authentication for demo purposes
 */
export async function initDemoAuth(): Promise<User> {
  const authInstance = getAuth();

  // Sign in anonymously if not already signed in
  if (!authInstance.currentUser) {
    const userCredential = await signInAnonymously(authInstance);
    console.log('👤 Signed in anonymously:', userCredential.user.uid);
    return userCredential.user;
  }

  return authInstance.currentUser;
}

/**
 * Utility to enable/disable Firestore network
 */
export async function toggleFirestoreNetwork(enable: boolean): Promise<void> {
  const firestore = getDb();
  if (enable) {
    await enableNetwork(firestore);
    console.log('🌐 Firestore network enabled');
  } else {
    await disableNetwork(firestore);
    console.log('🔌 Firestore network disabled');
  }
}

// Initialize Firebase on module load
if (typeof window !== 'undefined') {
  initializeFirebase();
}
