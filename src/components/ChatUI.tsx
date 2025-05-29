import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { Send, Paperclip, Smile } from 'lucide-react';
import { getDb } from '../lib/firebase';
import { AccessControl } from '../utils/access-control';
import {
  Message,
  User,
  AccessLevel,
  extractMentions,
  isAIAgent,
  isSystemUser,
} from '../types';
import {
  createMessageWithProcessing,
  containsAgentMentions,
} from '../utils/message-helpers';
import MessageItem from './MessageItem';
import FormModal from './FormModal';
import MediaUploadModal from './MediaUploadModal';

interface ChatUIProps {
  firebasePath: string;
  currentUser: User;
  maxMessages?: number;
  enableReactions?: boolean;
  enableReplies?: boolean;
  enableMultiModal?: boolean;
  enableForms?: boolean;
  agentIds?: string[];
  onNewMessage?: (message: Message) => void;
  onError?: (error: Error) => void;
}

const ChatUI: React.FC<ChatUIProps> = ({
  firebasePath,
  currentUser,
  maxMessages = 100,
  enableReactions = true,
  enableReplies = true,
  enableMultiModal = true,
  enableForms = true,
  agentIds = [],
  onNewMessage,
  onError,
}) => {
  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [accessLevel, setAccessLevel] = useState<AccessLevel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [formSchema, setFormSchema] = useState<any>(null);

  // Emoji picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Mention autocomplete state
  const [mentionState, setMentionState] = useState({
    isActive: false,
    startPos: -1,
    selectedIndex: 0,
    filteredUsers: [] as User[],
  });

  // References
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const db = getDb();

  // Emoji list for picker
  const REACTION_EMOJIS = [
    { emoji: '👍', name: 'thumbs up' },
    { emoji: '❤️', name: 'heart' },
    { emoji: '😂', name: 'laughing' },
    { emoji: '😮', name: 'surprised' },
    { emoji: '😢', name: 'sad' },
    { emoji: '😡', name: 'angry' },
    { emoji: '👀', name: 'eyes' },
    { emoji: '🙏', name: 'high five' },
    { emoji: '🎯', name: 'dart' },
    { emoji: '💯', name: '100' },
    { emoji: '🤷', name: 'shrug' },
    { emoji: '🎉', name: 'celebration' },
    { emoji: '🚀', name: 'rocket' },
    { emoji: '💡', name: 'idea' },
    { emoji: '🔥', name: 'fire' },
  ];

  // Demo users for mention autocomplete
  const demoUsers: User[] = [
    {
      id: 'user1',
      displayName: 'Alice Developer',
      email: 'alice@example.com',
      role: 'user',
      isAgent: false,
    },
    {
      id: 'user2',
      displayName: 'Bob Manager',
      email: 'bob@example.com',
      role: 'admin',
      isAgent: false,
    },
    {
      id: 'carol_manager',
      displayName: 'Carol Manager',
      email: 'carol@example.com',
      role: 'admin',
      isAgent: false,
    },
    {
      id: 'ai_assistant',
      displayName: 'AI Assistant',
      email: 'ai@example.com',
      role: 'agent',
      isAgent: true,
    },
  ];

  /**
   * Insert emoji at cursor position
   */
  const insertEmoji = useCallback((emoji: string) => {
    if (!inputRef.current) return;

    const input = inputRef.current;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const text = input.value;

    // Insert emoji at cursor position
    const newText = text.substring(0, start) + emoji + text.substring(end);
    setInputValue(newText);

    // Move cursor after inserted emoji
    setTimeout(() => {
      const newPos = start + emoji.length;
      input.setSelectionRange(newPos, newPos);
      input.focus();
    }, 0);

    // Close emoji picker
    setShowEmojiPicker(false);
  }, []);

  /**
   * Toggle emoji picker
   */
  const toggleEmojiPicker = useCallback(() => {
    console.log('🎭 Emoji picker toggle clicked! Current state:', showEmojiPicker);
    setShowEmojiPicker(!showEmojiPicker);
    console.log('🎭 Emoji picker will now be:', !showEmojiPicker);
  }, [showEmojiPicker]);

  /**
   * Handle mention autocomplete
   */
  const handleMentionAutocomplete = useCallback((value: string, cursorPos: number) => {
    console.log('💬 Mention autocomplete triggered:', { value, cursorPos });
    
    // Find @ symbol before cursor
    let atPos = -1;
    for (let i = cursorPos - 1; i >= 0; i--) {
      if (value[i] === '@') {
        atPos = i;
        break;
      } else if (value[i] === ' ' || value[i] === '\n') {
        break;
      }
    }

    console.log('💬 @ symbol found at position:', atPos);

    if (atPos >= 0) {
      const query = value.slice(atPos + 1, cursorPos).toLowerCase();
      console.log('💬 Query after @:', query);
      
      const users = demoUsers.filter(user => 
        user.id !== currentUser.id && 
        ((user.displayName?.toLowerCase().includes(query)) || 
         user.id.toLowerCase().includes(query))
      );

      console.log('💬 Filtered users:', users.map(u => u.displayName));

      if (users.length > 0) {
        console.log('💬 Setting mention state to active with', users.length, 'users');
        setMentionState({
          isActive: true,
          startPos: atPos,
          selectedIndex: 0,
          filteredUsers: users,
        });
      } else {
        console.log('💬 No users found, deactivating mentions');
        setMentionState(prev => ({ ...prev, isActive: false }));
      }
    } else {
      console.log('💬 No @ symbol found, deactivating mentions');
      setMentionState(prev => ({ ...prev, isActive: false }));
    }
  }, [currentUser.id]);

  /**
   * Select mention from autocomplete
   */
  const selectMention = useCallback((index: number) => {
    if (!mentionState.isActive || !inputRef.current) return;

    const user = mentionState.filteredUsers[index];
    if (!user) return;

    const input = inputRef.current;
    const text = input.value;
    const cursorPos = input.selectionStart || 0;

    // Replace the partial mention with the full username
    const beforeMention = text.slice(0, mentionState.startPos);
    const afterMention = text.slice(cursorPos);
    const userName = user.displayName || user.id;
    const newText = beforeMention + `@${userName} ` + afterMention;

    setInputValue(newText);
    setMentionState(prev => ({ ...prev, isActive: false }));

    // Move cursor after mention
    setTimeout(() => {
      const newPos = beforeMention.length + userName.length + 2;
      input.setSelectionRange(newPos, newPos);
      input.focus();
    }, 0);
  }, [mentionState]);

  /**
   * Scroll to bottom of messages
   */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  /**
   * Check user access permissions
   */
  const checkAccess = useCallback(async () => {
    try {
      console.log(
        '🔐 Checking access for user:',
        currentUser.id,
        'at path:',
        firebasePath
      );

      const canRead = await AccessControl.hasAccess(
        firebasePath,
        currentUser.id,
        AccessLevel.READ
      );
      const userAccessLevel = await AccessControl.getUserAccessLevel(
        firebasePath,
        currentUser.id
      );

      setHasAccess(canRead);
      setAccessLevel(userAccessLevel);

      console.log('✅ Access check complete:', { canRead, userAccessLevel });
    } catch (error) {
      console.error('❌ Error checking access:', error);
      setHasAccess(false);
      setAccessLevel(null);
      onError?.(error as Error);
    }
  }, [firebasePath, currentUser.id, onError]);

  /**
   * Set up real-time message listener
   */
  const setupMessageListener = useCallback(() => {
    if (!hasAccess) return;

    try {
      console.log(
        '📡 Setting up message listener for path:',
        `${firebasePath}/messages`
      );

      const messagesRef = collection(db, `${firebasePath}/messages`);
      const messagesQuery = query(
        messagesRef,
        orderBy('createdAt', 'asc'),
        limit(maxMessages)
      );

      const unsubscribe = onSnapshot(
        messagesQuery,
        (snapshot) => {
          console.log(
            '📬 Received message update:',
            snapshot.docs.length,
            'messages'
          );

          const newMessages: Message[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            newMessages.push({
              id: doc.id,
              ...data,
              createdAt:
                data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
              updatedAt:
                data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
            } as Message);
          });

          setMessages(newMessages);
          setIsLoading(false);

          // Notify parent component of new messages
          if (newMessages.length > 0) {
            const latestMessage = newMessages[newMessages.length - 1];
            onNewMessage?.(latestMessage);
          }

          // Auto-scroll to bottom
          setTimeout(scrollToBottom, 100);
        },
        (error) => {
          console.error('❌ Message listener error:', error);
          setIsLoading(false);
          onError?.(error);
        }
      );

      unsubscribeRef.current = unsubscribe;
      console.log('✅ Message listener established');
    } catch (error) {
      console.error('❌ Error setting up message listener:', error);
      setIsLoading(false);
      onError?.(error as Error);
    }
  }, [
    db,
    firebasePath,
    maxMessages,
    hasAccess,
    onNewMessage,
    onError,
    scrollToBottom,
  ]);

  /**
   * Send a text message
   */
  const sendMessage = async (
    content: string,
    attachments?: any[],
    dataRequest?: any
  ) => {
    if (!content.trim() && !attachments?.length && !dataRequest) return;
    if (!accessLevel || accessLevel === AccessLevel.READ) return;

    setIsSubmitting(true);

    try {
      console.log('📤 Sending message:', { content, attachments, dataRequest });

      // Extract mentions from content
      const mentions = extractMentions(content);

      // Create message object with auto-processing
      const messageData = createMessageWithProcessing({
        content: content.trim(),
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        senderRole: currentUser.role,
        recipientIds: mentions,
        fromAiAgent: isAIAgent(currentUser),
        toAiAgent:
          containsAgentMentions(content, agentIds) ||
          mentions.some((mention) => agentIds.includes(mention)),
        attachments,
        dataRequest,
        metadata: {
          event: 'message_sent',
        },
        autoProcessContent: true, // Enable auto-detection of media in content
      });

      // Remove id field for Firestore auto-generation
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, ...messageToSend } = messageData;

      // Send to Firestore
      const messagesRef = collection(db, `${firebasePath}/messages`);
      await addDoc(messagesRef, {
        ...messageToSend,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Clear input
      setInputValue('');

      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Error sending message:', error);
      onError?.(error as Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSubmitting) return;

    await sendMessage(inputValue);
  };

  /**
   * Handle input key events
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle mention autocomplete navigation
    if (mentionState.isActive) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionState(prev => ({
          ...prev,
          selectedIndex: Math.max(0, prev.selectedIndex - 1),
        }));
        return;
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionState(prev => ({
          ...prev,
          selectedIndex: Math.min(prev.filteredUsers.length - 1, prev.selectedIndex + 1),
        }));
        return;
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        selectMention(mentionState.selectedIndex);
        return;
      } else if (e.key === 'Escape') {
        setMentionState(prev => ({ ...prev, isActive: false }));
        return;
      }
    }

    // Handle emoji picker
    if (e.key === 'Escape' && showEmojiPicker) {
      setShowEmojiPicker(false);
      return;
    }

    // Handle message sending
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  /**
   * Handle input change events
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    console.log('⌨️ Input changed:', value);
    setInputValue(value);

    // Handle mention autocomplete
    const cursorPos = e.target.selectionStart || 0;
    console.log('⌨️ Cursor position:', cursorPos);
    handleMentionAutocomplete(value, cursorPos);
  };

  /**
   * Handle data request (form) click
   */
  const handleDataRequest = (schema: any) => {
    setFormSchema(schema);
    setShowFormModal(true);
  };

  /**
   * Handle form submission from modal
   */
  const handleFormSubmit = async (formData: any) => {
    await sendMessage('Form response submitted', undefined, formData);
    setShowFormModal(false);
    setFormSchema(null);
  };

  /**
   * Handle media upload
   */
  const handleMediaUpload = async (attachments: any[]) => {
    await sendMessage('Media uploaded', attachments);
    setShowMediaModal(false);
  };

  // Initialize component
  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  // Set up message listener when access is granted
  useEffect(() => {
    if (hasAccess === true) {
      setupMessageListener();
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [hasAccess, setupMessageListener]);

  // Focus input when component mounts
  useEffect(() => {
    if (accessLevel && accessLevel !== AccessLevel.READ) {
      inputRef.current?.focus();
    }
  }, [accessLevel]);

  // Handle click outside emoji picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPicker]);

  // Loading state
  if (isLoading || hasAccess === null) {
    return (
      <div className="chat-container bg-dark-950 text-dark-100">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-dark-400">Loading chat...</p>
          </div>
        </div>
      </div>
    );
  }

  // Access denied state
  if (hasAccess === false) {
    return (
      <div className="chat-container bg-dark-950 text-dark-100">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold mb-2 text-dark-200">
              Access Denied
            </h3>
            <p className="text-dark-400">
              You don't have permission to view this chat.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const canWrite = accessLevel && accessLevel !== AccessLevel.READ;

  return (
    <div className="chat-container bg-dark-950 text-dark-100">
      {/* Messages Container */}
      <div className="messages-container flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-4">💬</div>
              <p className="text-dark-400">
                No messages yet. Start the conversation!
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              currentUser={currentUser}
              isAgent={isAIAgent({ id: message.senderId } as User)}
              isSystem={isSystemUser({ id: message.senderId } as User)}
              enableReactions={enableReactions}
              enableReplies={enableReplies}
              onDataRequest={handleDataRequest}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Container */}
      {canWrite && (
        <div className="message-input-container bg-dark-900 border-t border-dark-700 p-4">
          <form onSubmit={handleSubmit} className="flex items-end space-x-2">
            {/* Media Upload Button */}
            {enableMultiModal && (
              <button
                type="button"
                onClick={() => setShowMediaModal(true)}
                className="btn-ghost p-2 text-dark-400 hover:text-dark-200"
                title="Add media"
              >
                <Paperclip size={20} />
              </button>
            )}

            {/* Message Input */}
            <div className="flex-1 relative">
              <div className="flex items-end bg-dark-800 border border-dark-600 rounded-lg">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message... (Use @ to mention users)"
                  className="flex-1 bg-transparent px-4 py-3 text-dark-100 placeholder-dark-400 resize-none focus:outline-none"
                  rows={1}
                  style={{
                    minHeight: '44px',
                    maxHeight: '120px',
                    height: 'auto',
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                  }}
                  disabled={isSubmitting}
                />
                
                {/* Emoji Button */}
                <button
                  type="button"
                  onClick={toggleEmojiPicker}
                  className="p-2 text-dark-400 hover:text-dark-200 transition-colors"
                  title="Add emoji"
                >
                  <Smile size={20} />
                </button>
              </div>

              {/* Mention Autocomplete */}
              {mentionState.isActive && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-dark-800 border border-dark-600 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                  {(() => {console.log('💬 RENDERING mention autocomplete with', mentionState.filteredUsers.length, 'users'); return null;})()}
                  {mentionState.filteredUsers.map((user, index) => {
                    const initials = (user.displayName || user.id).split(' ').map(n => n[0]).join('').slice(0, 2);
                    const isSelected = index === mentionState.selectedIndex;
                    
                    return (
                      <div
                        key={user.id}
                        className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-600 text-white' : 'hover:bg-dark-700'
                        }`}
                        onClick={() => selectMention(index)}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                          user.isAgent ? 'bg-purple-600' : 'bg-blue-600'
                        }`}>
                          {initials}
                        </div>
                        <div>
                          <div className="font-medium">{user.displayName || user.id}</div>
                          {user.isAgent && (
                            <div className="text-xs text-purple-400">AI Agent</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div
                  ref={emojiPickerRef}
                  className="absolute bottom-full right-0 mb-2 bg-dark-800 border border-dark-600 rounded-lg shadow-xl p-3 z-50"
                  style={{ minWidth: '280px' }}
                >
                  {(() => {console.log('🎭 RENDERING emoji picker'); return null;})()}
                  <div className="grid grid-cols-5 gap-2">
                    {REACTION_EMOJIS.map(({ emoji, name }) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => insertEmoji(emoji)}
                        className="p-2 text-xl hover:bg-dark-700 rounded transition-colors"
                        title={name}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputValue.trim() || isSubmitting}
              className="btn-primary p-3 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Send message"
            >
              {isSubmitting ? (
                <div className="spinner w-5 h-5"></div>
              ) : (
                <Send size={20} />
              )}
            </button>
          </form>
        </div>
      )}

      {/* Modals */}
      {showFormModal && formSchema && (
        <FormModal
          isOpen={showFormModal}
          onClose={() => {
            setShowFormModal(false);
            setFormSchema(null);
          }}
          schema={formSchema}
          onSubmit={handleFormSubmit}
          title="Provide Information"
        />
      )}

      {showMediaModal && (
        <MediaUploadModal
          isOpen={showMediaModal}
          onClose={() => setShowMediaModal(false)}
          onUpload={handleMediaUpload}
          enableForms={enableForms}
        />
      )}
    </div>
  );
};

export default ChatUI;
