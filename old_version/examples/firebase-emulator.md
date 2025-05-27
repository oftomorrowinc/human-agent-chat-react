# Using Firebase Emulators with HumanAgentChat

The HumanAgentChat package includes built-in support for Firebase emulators, allowing you to develop and test your chat application without setting up a real Firebase project.

## Setup

The Firebase emulators are configured in the root directory:

- `firebase.json` - Configures the emulators
- `firestore.rules` - Security rules for Firestore (with development rules that allow all access)
- `firestore.indexes.json` - Firestore indexes
- `storage.rules` - Storage rules

## Starting the Emulators

To start the Firebase emulators, run:

```bash
npx firebase emulators:start
```

This will start the following emulators:
- **Firestore** on port 8080
- **Authentication** on port 9099
- **Storage** on port 9199
- **Firebase UI** on port 4000

You can access the Firebase Emulator UI at http://localhost:4000 to view and manipulate data.

## Using Emulators in Examples

All examples are configured to use the Firebase emulators by default. The emulator connection is handled by the `initializeFirebaseWithEmulators` function, which is exported from the package:

```javascript
import { initializeFirebaseWithEmulators, emulatorConfig } from 'human-agent-chat';

// Use the default emulator config
initializeFirebaseWithEmulators(emulatorConfig, true);
```

The `emulatorConfig` contains fake Firebase configuration values that are only used for the emulators.

## Switching Between Emulators and Production

You can switch between using emulators and real Firebase services:

### Server-side (Node.js)

```javascript
const { initializeFirebaseWithEmulators, emulatorConfig } = require('human-agent-chat');

// Use real Firebase config if provided, otherwise use emulator config
const firebaseConfig = process.env.FIREBASE_API_KEY
  ? {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      // ... other config values
    }
  : emulatorConfig;

// Set useEmulators to false to use real Firebase services
const useEmulators = process.env.USE_FIREBASE_EMULATORS !== 'false';
initializeFirebaseWithEmulators(firebaseConfig, useEmulators);
```

### Client-side (Browser)

```javascript
import { initializeFirebaseWithEmulators } from 'human-agent-chat';

// Use real Firebase config in production environments
const isProduction = window.location.hostname !== 'localhost';
initializeFirebaseWithEmulators(firebaseConfig, !isProduction);
```

## Data Persistence

By default, the emulator data is not persisted between sessions. To persist data, use:

```bash
npx firebase emulators:start --import=./emulator-data --export-on-exit=./emulator-data
```

This will:
- Import existing data from `./emulator-data` (if it exists)
- Export data to `./emulator-data` when the emulators are shut down

## Populating Initial Data

To create initial data for testing, you can:

1. Start the emulators
2. Use the Firebase Emulator UI at http://localhost:4000 to create collections and documents
3. Export the data using `--export-on-exit`

Alternatively, you can create a script that populates the emulator with test data.