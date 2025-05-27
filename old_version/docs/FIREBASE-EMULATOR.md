# Firebase Emulator Integration

This package includes built-in support for Firebase emulators, enabling local development and testing without needing a real Firebase project or API keys.

## Benefits of Using Firebase Emulators

1. **No real Firebase project required** - Develop and test without setting up a Firebase project or exposing API keys
2. **Fast development** - Local emulation provides quick feedback without network latency
3. **Isolated testing** - Tests run in a clean environment each time, without affecting production data
4. **Security rule testing** - Test Firebase security rules without risking real data
5. **Offline development** - Work without an internet connection

## Getting Started

### 1. Install the package

```bash
npm install git+https://github.com/oftomorrowinc/human-agent-chat
```

### 2. Start the emulators

```bash
# From the package directory (if developing the package)
npm run emulators

# From your project (if installed as a dependency)
npx firebase emulators:start
```

This will start the following emulators:
- **Firestore** on port 8080
- **Authentication** on port 9099
- **Storage** on port 9199
- **Firebase UI** on port 4000

### 3. Initialize Firebase with emulators

```javascript
const { initializeFirebaseWithEmulators, emulatorConfig } = require('human-agent-chat');

// Use emulator config (no real API keys needed)
initializeFirebaseWithEmulators(emulatorConfig);
```

## Emulator Configuration

The package includes default configurations:

- **firebase.json** - Emulator setup and ports
- **firestore.rules** - Security rules for Firestore (with development rules allowing all access)
- **storage.rules** - Storage rules
- **firestore.indexes.json** - Firestore indexes

You can override these with your own configuration files in your project.

## Data Persistence

By default, emulator data is cleared when the emulator is stopped. To persist data:

```bash
# Start emulators with data persistence
npm run emulators:export 

# Or run directly
npx firebase emulators:start --import=./emulator-data --export-on-exit=./emulator-data
```

## Switching Between Emulators and Production

You can conditionally use emulators or real Firebase services:

```javascript
const { initializeFirebaseWithEmulators, emulatorConfig } = require('human-agent-chat');

// Use real Firebase config if provided, otherwise use emulator config
const firebaseConfig = process.env.FIREBASE_API_KEY
  ? {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID
    }
  : emulatorConfig;

// Set useEmulators to false to use real Firebase services
const useEmulators = process.env.NODE_ENV !== 'production';
initializeFirebaseWithEmulators(firebaseConfig, useEmulators);
```

## Using the Firebase Emulator UI

The Firebase Emulator UI is accessible at http://localhost:4000 and provides:

- Data browser for Firestore
- User management for Authentication
- Storage file browser
- Logs for all operations

This makes it easy to inspect, add, or modify data during development.

## Example Projects

The package includes examples that use Firebase emulators:

- **Simple Chat**: `/examples/simple`
- **One-to-Many Chat**: `/examples/one-to-many`
- **Many-to-Many Chat**: `/examples/many-to-many`

To run the examples:

```bash
# Start emulators in one terminal
npm run emulators

# Run an example in another terminal
npm run example:simple
```

## Troubleshooting

- **Port conflicts**: If you have another service using the emulator ports, you can change them in `firebase.json`
- **Connection issues**: Make sure the emulators are running before starting your application
- **Authentication errors**: The Auth emulator requires special handling for initialization, which is included in `initializeFirebaseWithEmulators`