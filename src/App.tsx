import React, { useState, useEffect, useMemo } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { initializeFirebase, initDemoAuth } from './lib/firebase';
import { User, createUser } from './types';
import ChatUI from './components/ChatUI';
import { Settings, Users, MessageSquare, Zap } from 'lucide-react';

interface DemoUser {
  id: string;
  name: string;
  role: 'user' | 'admin' | 'agent' | 'system';
  isAgent?: boolean;
}

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDemo, setSelectedDemo] = useState<string>('simple');
  const [selectedUser, setSelectedUser] = useState<DemoUser | null>(null);

  // Demo users for testing
  const demoUsers: DemoUser[] = useMemo(() => [
    { id: 'user1', name: 'Demo User', role: 'user' },
    { id: 'user2', name: 'Team Member', role: 'user' },
    { id: 'admin1', name: 'Admin User', role: 'admin' },
    { id: 'agent_assistant', name: 'AI Assistant', role: 'agent', isAgent: true },
    { id: 'system', name: 'System', role: 'system' }
  ], []);

  // Demo chat configurations
  const demoChats = {
    simple: {
      title: 'Simple Chat',
      description: 'Basic one-to-one conversation',
      path: 'chats/simple-demo',
      icon: <MessageSquare size={16} />
    },
    team: {
      title: 'Team Chat',
      description: 'Team collaboration with hierarchical access',
      path: 'organizations/demo-org/teams/dev-team/chats/general',
      icon: <Users size={16} />
    },
    project: {
      title: 'Project Chat',
      description: 'Project-specific discussions with AI agents',
      path: 'organizations/demo-org/projects/react-rewrite/chats/discussion',
      icon: <Settings size={16} />
    },
    ai: {
      title: 'AI Collaboration',
      description: 'Human-AI collaboration with form requests',
      path: 'chats/ai-collaboration',
      icon: <Zap size={16} />
    }
  };

  // Initialize Firebase and auth
  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('🚀 Initializing Human Agent Chat React...');
        
        // Initialize Firebase
        initializeFirebase();
        
        // Set up auth state listener
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          console.log('👤 Auth state changed:', user?.uid);
          setFirebaseUser(user);
          
          if (user) {
            // Create a demo user profile
            const demoUser = createUser({
              id: user.uid,
              email: user.email || undefined,
              displayName: 'Demo User',
              role: 'user'
            });
            setCurrentUser(demoUser);
            setSelectedUser(demoUsers[0]); // Default to first demo user
          } else {
            setCurrentUser(null);
            setSelectedUser(null);
          }
          
          setIsLoading(false);
        });

        // Sign in anonymously for demo
        if (!auth.currentUser) {
          await initDemoAuth();
        }

        return unsubscribe;
      } catch (error) {
        console.error('❌ Error initializing app:', error);
        setIsLoading(false);
      }
    };

    const unsubscribe = initApp();
    return () => {
      unsubscribe?.then(unsub => unsub?.());
    };
  }, [demoUsers]);

  // Handle user selection for demo
  const handleUserSelect = (demoUser: DemoUser) => {
    if (!firebaseUser) return;
    
    setSelectedUser(demoUser);
    
    // Update current user with demo user data
    const updatedUser = createUser({
      id: firebaseUser.uid,
      email: firebaseUser.email || undefined,
      displayName: demoUser.name,
      role: demoUser.role,
      isAgent: demoUser.isAgent
    });
    
    setCurrentUser(updatedUser);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-dark-100 mb-2">
            Initializing Human Agent Chat
          </h2>
          <p className="text-dark-400">Connecting to Firebase...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!firebaseUser || !currentUser) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-xl font-semibold text-dark-100 mb-2">
            Authentication Required
          </h2>
          <p className="text-dark-400">Please wait while we set up your demo session...</p>
        </div>
      </div>
    );
  }

  const currentChat = demoChats[selectedDemo as keyof typeof demoChats];

  return (
    <div className="min-h-screen bg-dark-950 text-dark-100 flex">
      {/* Sidebar */}
      <div className="w-80 bg-dark-900 border-r border-dark-700 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-dark-700">
          <h1 className="text-2xl font-bold text-dark-100 mb-2">
            Human Agent Chat
          </h1>
          <p className="text-sm text-dark-400">
            React • Firebase • Dark Mode Only
          </p>
        </div>

        {/* User Selector */}
        <div className="p-4 border-b border-dark-700">
          <h3 className="text-sm font-medium text-dark-200 mb-3">Demo User</h3>
          <div className="space-y-2">
            {demoUsers.map((user) => (
              <button
                type="button"
                key={user.id}
                onClick={() => handleUserSelect(user)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedUser?.id === user.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{user.name}</span>
                  {user.isAgent && (
                    <span className="bg-purple-700 text-purple-200 text-xs px-2 py-1 rounded-full">
                      AI
                    </span>
                  )}
                  {user.role === 'admin' && (
                    <span className="bg-green-700 text-green-200 text-xs px-2 py-1 rounded-full">
                      ADMIN
                    </span>
                  )}
                  {user.role === 'system' && (
                    <span className="bg-red-700 text-red-200 text-xs px-2 py-1 rounded-full">
                      SYSTEM
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Selector */}
        <div className="p-4 flex-1">
          <h3 className="text-sm font-medium text-dark-200 mb-3">Demo Chats</h3>
          <div className="space-y-2">
            {Object.entries(demoChats).map(([key, chat]) => (
              <button
                type="button"
                key={key}
                onClick={() => setSelectedDemo(key)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedDemo === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-current">
                    {chat.icon}
                  </div>
                  <div>
                    <div className="font-medium">{chat.title}</div>
                    <div className="text-sm opacity-75">{chat.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-700">
          <div className="text-xs text-dark-500">
            <p className="mb-1">Firebase Path:</p>
            <code className="bg-dark-800 px-2 py-1 rounded text-dark-300 break-all">
              {currentChat.path}
            </code>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-dark-900 border-b border-dark-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-dark-100">
                {currentChat.title}
              </h2>
              <p className="text-sm text-dark-400">
                {currentChat.description} • Logged in as {currentUser.displayName}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-dark-500">
                User ID: {currentUser.id.substring(0, 8)}...
              </span>
            </div>
          </div>
        </div>

        {/* Chat UI */}
        <div className="flex-1">
          <ChatUI
            firebasePath={currentChat.path}
            currentUser={currentUser}
            maxMessages={100}
            enableReactions={true}
            enableReplies={true}
            enableMultiModal={true}
            enableForms={true}
            agentIds={['agent_assistant', 'assistant']}
            onNewMessage={(message) => {
              console.log('📬 New message received:', message);
            }}
            onError={(error) => {
              console.error('❌ Chat error:', error);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default App;