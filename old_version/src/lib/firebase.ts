import { FirebaseApp, initializeApp } from 'firebase/app';
import {
  Firestore,
  getFirestore,
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  QueryDocumentSnapshot,
  QuerySnapshot,
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import {
  Auth,
  getAuth,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';

import { Message, User, MemberAccess, AccessLevel } from '../types/index.js';

let app: FirebaseApp;
let _firestore: Firestore;
let _storage: ReturnType<typeof getStorage>;
let _auth: Auth;

/**
 * Initialize Firebase instance
 * @param config Firebase configuration object
 * @returns Initialized Firebase app instance
 */
export const initializeFirebase = (config: Record<string, string>) => {
  if (!app) {
    app = initializeApp(config);
    _firestore = getFirestore(app);
    _storage = getStorage(app);
    _auth = getAuth(app);
  }
  return app;
};

/**
 * Get firestore instance
 */
export const getDb = () => {
  if (!_firestore) {
    throw new Error(
      'Firebase has not been initialized. Call initializeFirebase first.'
    );
  }
  return _firestore;
};

/**
 * Get storage instance
 */
export const getStorageInstance = () => {
  if (!_storage) {
    throw new Error(
      'Firebase has not been initialized. Call initializeFirebase first.'
    );
  }
  return _storage;
};

/**
 * Get auth instance
 */
export const getAuthInstance = () => {
  if (!_auth) {
    throw new Error(
      'Firebase has not been initialized. Call initializeFirebase first.'
    );
  }
  return _auth;
};

/**
 * Listen for changes to a chat
 * @param path Path to the chat in Firestore
 * @param messagesLimit Maximum number of messages to fetch
 * @param callback Function to call with new messages
 * @returns Unsubscribe function
 */
export const listenToChat = (
  path: string,
  messagesLimit = 50,
  callback: (messages: Message[]) => void
) => {
  const db = getDb();
  const messagesRef = collection(db, `${path}/messages`);
  const q = query(
    messagesRef,
    orderBy('timestamp', 'desc'),
    limit(messagesLimit)
  );

  return onSnapshot(q, (snapshot: QuerySnapshot) => {
    const messages = snapshot.docs
      .map((doc: QueryDocumentSnapshot) => {
        const data = doc.data() as Message;
        return {
          ...data,
          id: doc.id,
        };
      })
      .sort((a: Message, b: Message) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); // Sort by createdAt asc for display

    callback(messages);
  });
};

/**
 * Send a message to a chat
 * @param path Path to the chat in Firestore
 * @param message Message object to send
 * @returns Promise with the message ID
 */
export const sendMessage = async (
  path: string,
  message: Omit<Message, 'id'>
) => {
  const db = getDb();
  const messagesRef = collection(db, `${path}/messages`);

  // Add required fields if not provided
  const now = new Date().toISOString();
  if (!message.createdAt) {
    message.createdAt = now;
  }
  if (!message.updatedAt) {
    message.updatedAt = now;
  }
  if (message.recipientIds === undefined) {
    message.recipientIds = [];
  }
  if (message.fromAiAgent === undefined) {
    message.fromAiAgent = false;
  }
  if (message.toAiAgent === undefined) {
    message.toAiAgent = false;
  }
  
  // Create a new object without undefined fields
  const cleanedMessage = Object.fromEntries(
    Object.entries(message).filter(([_, v]) => v !== undefined)
  );

  const docRef = await addDoc(messagesRef, cleanedMessage);

  return docRef.id;
};

/**
 * Update a message
 * @param path Path to the chat in Firestore
 * @param messageId ID of the message to update
 * @param updates Updates to apply to the message
 */
export const updateMessage = async (
  path: string,
  messageId: string,
  updates: Partial<Omit<Message, 'id'>>
) => {
  const db = getDb();
  const messageRef = doc(db, `${path}/messages/${messageId}`);
  await updateDoc(messageRef, updates);
};

/**
 * Delete a message
 * @param path Path to the chat in Firestore
 * @param messageId ID of the message to delete
 */
export const deleteMessage = async (path: string, messageId: string) => {
  const db = getDb();
  const messageRef = doc(db, `${path}/messages/${messageId}`);
  await deleteDoc(messageRef);
};

/**
 * Upload a file to Firebase Storage
 * @param path Path where the file should be stored
 * @param file File to upload
 * @returns URL of the uploaded file
 */
export const uploadFile = async (path: string, file: File | Blob) => {
  const storage = getStorageInstance();
  const fileRef = storageRef(storage, path);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
};

/**
 * Check if a user has access to a specific path
 * @param path Path to check access for
 * @param userId User ID to check
 * @param requiredLevel Required access level
 * @returns Promise resolving to boolean indicating if access is granted
 */
export const checkAccess = async (
  path: string,
  userId: string,
  requiredLevel: AccessLevel
): Promise<boolean> => {
  const db = getDb();

  // Split path into segments to check each level
  const segments = path.split('/').filter(s => s.length > 0);

  // Build paths to check, starting from root level and going deeper
  const pathsToCheck = segments.reduce((paths, segment, index) => {
    const currentPath = segments.slice(0, index + 1).join('/');
    paths.push(currentPath);
    return paths;
  }, [] as string[]);

  // Access levels hierarchy
  const accessHierarchy = {
    [AccessLevel.READ]: 0,
    [AccessLevel.WRITE]: 1,
    [AccessLevel.ADMIN]: 2,
  };

  // Required level in hierarchy
  const requiredLevelValue = accessHierarchy[requiredLevel];

  // Check access at each level of the path
  let hasAccess = false;

  for (const pathToCheck of pathsToCheck) {
    const membersRef = collection(db, `${pathToCheck}/members`);
    const q = query(membersRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // User has some access at this level
      const memberAccess = snapshot.docs[0].data() as MemberAccess;
      const userLevelValue = accessHierarchy[memberAccess.level];

      // If user has required level or higher, grant access
      if (userLevelValue >= requiredLevelValue) {
        hasAccess = true;
        break;
      }
    }
  }

  return hasAccess;
};

/**
 * Add a member to a chat with specific access level
 * @param path Path to the chat
 * @param memberAccess Member access record to add
 */
export const addMember = async (path: string, memberAccess: MemberAccess) => {
  const db = getDb();
  const membersRef = collection(db, `${path}/members`);

  // Add creation timestamp if not provided
  if (!memberAccess.addedAt) {
    memberAccess.addedAt = Date.now();
  }

  await addDoc(membersRef, memberAccess);
};

/**
 * Update a member's access level
 * @param path Path to the chat
 * @param userId User ID of the member to update
 * @param newLevel New access level
 */
export const updateMemberAccess = async (
  path: string,
  userId: string,
  newLevel: AccessLevel
) => {
  const db = getDb();
  const membersRef = collection(db, `${path}/members`);
  const q = query(membersRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const memberDoc = snapshot.docs[0];
    await updateDoc(memberDoc.ref, { level: newLevel });
  } else {
    throw new Error(`User ${userId} is not a member of ${path}`);
  }
};

/**
 * Remove a member from a chat
 * @param path Path to the chat
 * @param userId User ID of the member to remove
 */
export const removeMember = async (path: string, userId: string) => {
  const db = getDb();
  const membersRef = collection(db, `${path}/members`);
  const q = query(membersRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const memberDoc = snapshot.docs[0];
    await deleteDoc(memberDoc.ref);
  } else {
    throw new Error(`User ${userId} is not a member of ${path}`);
  }
};

/**
 * Get all members of a chat
 * @param path Path to the chat
 * @returns Promise resolving to array of member access records
 */
export const getMembers = async (path: string): Promise<MemberAccess[]> => {
  const db = getDb();
  const membersRef = collection(db, `${path}/members`);
  const snapshot = await getDocs(membersRef);

  return snapshot.docs.map(doc => doc.data() as MemberAccess);
};

/**
 * Listen for auth state changes
 * @param callback Function to call with the authenticated user
 * @returns Unsubscribe function
 */
export const listenToAuthChanges = (callback: (user: User | null) => void) => {
  const auth = getAuthInstance();

  return onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      const user: User = {
        id: firebaseUser.uid,
        displayName: firebaseUser.displayName || undefined,
        email: firebaseUser.email || undefined,
        photoURL: firebaseUser.photoURL || undefined,
      };
      callback(user);
    } else {
      callback(null);
    }
  });
};
