import { ChatUI } from '../../src/components/ChatUI';
import { Message, MessageContentType, User, AccessLevel } from '../../src/types';
import * as firebase from '../../src/lib/firebase';
import { AccessControl } from '../../src/utils/access-control';

// Mock firebase module
jest.mock('../../src/lib/firebase', () => ({
  listenToChat: jest.fn(),
  sendMessage: jest.fn(),
  updateMessage: jest.fn(),
  deleteMessage: jest.fn(),
  uploadFile: jest.fn(),
}));

// Mock access control
jest.mock('../../src/utils/access-control', () => ({
  AccessControl: {
    hasAccess: jest.fn(),
  },
}));

// Mock DOM elements and functions
document.getElementById = jest.fn();
document.createElement = jest.fn().mockImplementation(tag => {
  const element: any = {
    appendChild: jest.fn(),
    addEventListener: jest.fn(),
    classList: {
      add: jest.fn(),
    },
    style: {},
  };

  if (tag === 'form') {
    element.querySelector = jest.fn().mockReturnValue([]);
    element.querySelectorAll = jest.fn().mockReturnValue([]);
  }

  return element;
});

describe('ChatUI', () => {
  let chatUI: ChatUI;
  const mockUser: User = {
    id: 'user1',
    displayName: 'Test User',
    email: 'test@example.com',
  };

  const defaultOptions = {
    containerId: 'chat-container',
    firebasePath: 'chats/test-chat',
    currentUser: mockUser,
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup DOM mocks with removeEventListener
    const mockContainer = {
      appendChild: jest.fn(),
      innerHTML: '',
      classList: {
        add: jest.fn(),
      },
    };
    (document.getElementById as jest.Mock).mockImplementation(id => {
      if (id === 'chat-container') return mockContainer;

      if (id === `${defaultOptions.containerId}-form`) {
        return {
          removeEventListener: jest.fn(),
        };
      }

      if (id === `${defaultOptions.containerId}-file`) {
        return {
          removeEventListener: jest.fn(),
        };
      }

      return null;
    });

    // Setup listenToChat mock to return an unsubscribe function
    (firebase.listenToChat as jest.Mock).mockReturnValue(jest.fn());

    // Setup AccessControl mock
    (AccessControl.hasAccess as jest.Mock).mockResolvedValue(true);

    // Create ChatUI instance
    chatUI = new ChatUI(defaultOptions);
  });

  describe('initialize', () => {
    test('should check user access and render chat interface', async () => {
      await chatUI.initialize();

      expect(AccessControl.hasAccess).toHaveBeenCalledWith(
        defaultOptions.firebasePath,
        mockUser.id,
        AccessLevel.READ
      );

      // Should start listening for chat messages
      expect(firebase.listenToChat).toHaveBeenCalledWith(
        defaultOptions.firebasePath,
        expect.any(Number),
        expect.any(Function)
      );
    });

    test('should render access denied if user does not have access', async () => {
      (AccessControl.hasAccess as jest.Mock).mockResolvedValueOnce(false);

      await chatUI.initialize();

      // Should not start listening for chat messages
      expect(firebase.listenToChat).not.toHaveBeenCalled();
    });
  });

  describe('handleNewMessages', () => {
    test('should update messages and render them', () => {
      const mockMessages: Message[] = [
        {
          id: 'msg1',
          senderId: 'user1',
          content: 'Hello world',
          timestamp: Date.now(),
        },
      ];

      // Get the callback function passed to listenToChat
      chatUI.initialize();
      const messageCallback = (firebase.listenToChat as jest.Mock).mock
        .calls[0][2];

      // Call the callback with mock messages
      messageCallback(mockMessages);

      // Check if messages are rendered (implementation details would be tested separately)
      expect(document.getElementById).toHaveBeenCalledWith(
        `${defaultOptions.containerId}-messages`
      );
    });

    test('should call onNewMessage callback when provided', async () => {
      const onNewMessage = jest.fn();
      const chatUIWithCallback = new ChatUI({
        ...defaultOptions,
        onNewMessage,
      });

      await chatUIWithCallback.initialize();

      const mockMessages: Message[] = [
        {
          id: 'msg1',
          senderId: 'user1',
          content: 'Hello world',
          timestamp: Date.now(),
        },
      ];

      // Call the callback with mock messages
      const messageCallback = (firebase.listenToChat as jest.Mock).mock
        .calls[0][2];
      messageCallback(mockMessages);

      expect(onNewMessage).toHaveBeenCalledWith(mockMessages[0]);
    });
  });

  describe('sendTextMessage', () => {
    test('should call firebase.sendMessage with the correct parameters', async () => {
      (firebase.sendMessage as jest.Mock).mockResolvedValueOnce('msg-id');

      // Access the private method using type assertion
      await (chatUI as any).sendTextMessage('Hello world');

      expect(firebase.sendMessage).toHaveBeenCalledWith(
        defaultOptions.firebasePath,
        {
          senderId: mockUser.id,
          content: 'Hello world',
          timestamp: expect.any(Number),
        }
      );
    });
  });

  describe('sendCustomMessage', () => {
    test('should send a custom text message', async () => {
      (firebase.sendMessage as jest.Mock).mockResolvedValueOnce('msg-id');

      await chatUI.sendCustomMessage('Custom message');

      expect(firebase.sendMessage).toHaveBeenCalledWith(
        defaultOptions.firebasePath,
        {
          senderId: mockUser.id,
          content: 'Custom message',
          timestamp: expect.any(Number),
        }
      );
    });

    test('should send a custom complex message', async () => {
      (firebase.sendMessage as jest.Mock).mockResolvedValueOnce('msg-id');

      const complexContent = {
        type: MessageContentType.IMAGE,
        value: 'https://example.com/image.jpg',
        caption: 'Test image',
      };

      await chatUI.sendCustomMessage(complexContent);

      expect(firebase.sendMessage).toHaveBeenCalledWith(
        defaultOptions.firebasePath,
        {
          senderId: mockUser.id,
          content: complexContent,
          timestamp: expect.any(Number),
        }
      );
    });

    test('should include replyToId when provided', async () => {
      (firebase.sendMessage as jest.Mock).mockResolvedValueOnce('msg-id');

      await chatUI.sendCustomMessage('Reply message', 'original-msg-id');

      expect(firebase.sendMessage).toHaveBeenCalledWith(
        defaultOptions.firebasePath,
        {
          senderId: mockUser.id,
          content: 'Reply message',
          timestamp: expect.any(Number),
          replyToId: 'original-msg-id',
        }
      );
    });
  });

  describe('cleanup', () => {
    test('should clean up event listeners and subscriptions', () => {
      const mockUnsubscribe = jest.fn();
      (firebase.listenToChat as jest.Mock).mockReturnValueOnce(mockUnsubscribe);

      chatUI.initialize();
      chatUI.destroy();

      // Should call unsubscribe function
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});