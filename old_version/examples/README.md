# HumanAgentChat Examples

This directory contains three example implementations of the HumanAgentChat component. All examples are configured to work with Firebase emulators, making them easy to run without setting up a real Firebase project.

## Running Examples with Firebase Emulators

All examples are designed to use Firebase emulators by default:

1. Start the Firebase emulators in one terminal:
```bash
npm run emulators
```

2. Run an example in another terminal:
```bash
npm run example:simple
```

For more information about Firebase emulators, see the [Firebase Emulator Guide](../FIREBASE-EMULATOR.md).

## Simple Chat Example

A basic one-to-one chat with support for text, media, and forms.

**Features demonstrated:**
- Basic chat UI
- Message sending and receiving
- User avatars with initials

**Run the example:**
```bash
npm run example:simple
```

Then visit `http://localhost:3000` in your browser.

## One-to-Many Chat Example

A team chat implementation where an admin can communicate with multiple team members.

**Features demonstrated:**
- Team member management
- Form generation and submission
- File sharing

**Run the example:**
```bash
npm run example:one-to-many
```

Then visit `http://localhost:3001` in your browser.

## Many-to-Many Chat Example

An organization-wide chat system with channels and departments.

**Features demonstrated:**
- Hierarchical access control
- Multiple chat spaces (channels and departments)
- AI agent integration
- Project request forms

**Run the example:**
```bash
npm run example:many-to-many
```

Then visit `http://localhost:3002` in your browser.

## Firebase Configuration

These examples use Firebase for authentication, data storage, and real-time updates. To use them with your own Firebase project:

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com/)
2. Enable Firestore, Storage, and Authentication
3. Get your Firebase configuration from Project Settings > General
4. Update the Firebase configuration in each example's server.js file

Example Firebase configuration:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Environment Variables

For security, it's best to store your Firebase configuration in environment variables:

Create a `.env` file in each example directory:
```
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id
```

Then use `dotenv` to load them in your server.js file:
```javascript
require('dotenv').config();

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};
```