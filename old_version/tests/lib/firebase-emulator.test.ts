import { initializeFirebaseWithEmulators } from '../../src/lib/firebase-emulator';

// Mock Firebase modules
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn().mockReturnValue({ name: 'mock-app' }),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn().mockReturnValue({ name: 'mock-firestore' }),
  connectFirestoreEmulator: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn().mockReturnValue({ name: 'mock-auth' }),
  connectAuthEmulator: jest.fn(),
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn().mockReturnValue({ name: 'mock-storage' }),
  connectStorageEmulator: jest.fn(),
}));

describe('Firebase Emulator', () => {
  const mockConfig = {
    apiKey: 'mock-api-key',
    projectId: 'mock-project-id',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize Firebase with emulators when enabled', () => {
    const result = initializeFirebaseWithEmulators(mockConfig, true);

    // Should initialize Firebase app with provided config
    expect(require('firebase/app').initializeApp).toHaveBeenCalledWith(mockConfig);

    // Should initialize Firebase services
    expect(require('firebase/firestore').getFirestore).toHaveBeenCalled();
    expect(require('firebase/auth').getAuth).toHaveBeenCalled();
    expect(require('firebase/storage').getStorage).toHaveBeenCalled();

    // Should connect to emulators
    expect(require('firebase/firestore').connectFirestoreEmulator).toHaveBeenCalled();
    expect(require('firebase/auth').connectAuthEmulator).toHaveBeenCalled();
    expect(require('firebase/storage').connectStorageEmulator).toHaveBeenCalled();

    // Should return Firebase services
    expect(result).toHaveProperty('app');
    expect(result).toHaveProperty('firestore');
    expect(result).toHaveProperty('auth');
    expect(result).toHaveProperty('storage');
  });

  it('should not connect to emulators when disabled', () => {
    const result = initializeFirebaseWithEmulators(mockConfig, false);

    // Should initialize Firebase app and services
    expect(require('firebase/app').initializeApp).toHaveBeenCalledWith(mockConfig);
    expect(require('firebase/firestore').getFirestore).toHaveBeenCalled();
    expect(require('firebase/auth').getAuth).toHaveBeenCalled();
    expect(require('firebase/storage').getStorage).toHaveBeenCalled();

    // Should not connect to emulators
    expect(require('firebase/firestore').connectFirestoreEmulator).not.toHaveBeenCalled();
    expect(require('firebase/auth').connectAuthEmulator).not.toHaveBeenCalled();
    expect(require('firebase/storage').connectStorageEmulator).not.toHaveBeenCalled();

    // Should return Firebase services
    expect(result).toHaveProperty('app');
    expect(result).toHaveProperty('firestore');
    expect(result).toHaveProperty('auth');
    expect(result).toHaveProperty('storage');
  });
});