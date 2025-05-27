import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  connectFirestoreEmulator,
  Firestore,
} from 'firebase/firestore';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

/**
 * Initialize Firebase with emulator connections
 * @param useEmulator Whether to use the emulators (default: true)
 * @param config Firebase config object
 * @returns The initialized Firebase app
 */
export function initializeFirebaseWithEmulators(
  config: Record<string, string>,
  useEmulator = true
): {
  app: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: ReturnType<typeof getStorage>;
} {
  // Initialize Firebase app
  const app = initializeApp(config);

  // Initialize services
  const firestore = getFirestore(app);
  const auth = getAuth(app);
  const storage = getStorage(app);

  // Connect to emulators if enabled
  if (useEmulator) {
    // Connect to Firestore emulator
    connectFirestoreEmulator(firestore, 'localhost', 8080);

    // Connect to Auth emulator
    connectAuthEmulator(auth, 'http://localhost:9099', {
      disableWarnings: true,
    });

    // Connect to Storage emulator
    connectStorageEmulator(storage, 'localhost', 9199);

    // Show console message only in development
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('Connected to Firebase emulators');
    }
  }

  return { app, firestore, auth, storage };
}

/**
 * Default Firebase config for emulator use
 * These values don't matter when using emulators
 */
export const emulatorConfig = {
  apiKey: 'fake-api-key',
  authDomain: 'demo-human-agent-chat.firebaseapp.com',
  projectId: 'demo-human-agent-chat',
  storageBucket: 'demo-human-agent-chat.appspot.com',
  messagingSenderId: '123456789012',
  appId: '1:123456789012:web:abc123def456ghi789jkl',
};
