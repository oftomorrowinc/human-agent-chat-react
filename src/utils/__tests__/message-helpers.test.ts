import {
  createMessageWithProcessing,
  extractMentions,
  containsAgentMentions,
  formatMentions,
  cleanMessageContent,
  isValidMessage
} from '../message-helpers';

describe('message-helpers', () => {
  const mockCurrentTime = '2024-01-01T00:00:00.000Z';
  
  beforeAll(() => {
    // Mock Date.now() to return consistent timestamps
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockCurrentTime);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('extractMentions', () => {
    it('should extract single mention', () => {
      const mentions = extractMentions('Hello @alice how are you?');
      expect(mentions).toEqual(['alice']);
    });

    it('should extract multiple mentions', () => {
      const mentions = extractMentions('Hello @alice and @bob, how are you @charlie?');
      expect(mentions).toEqual(['alice', 'bob', 'charlie']);
    });

    it('should handle mentions with underscores and numbers', () => {
      const mentions = extractMentions('Hey @user_123 and @agent_ai_2');
      expect(mentions).toEqual(['user_123', 'agent_ai_2']);
    });

    it('should not extract partial mentions', () => {
      const mentions = extractMentions('Email: test@example.com and @validmention');
      expect(mentions).toEqual(['validmention']);
    });

    it('should return empty array for no mentions', () => {
      const mentions = extractMentions('Just a normal message');
      expect(mentions).toEqual([]);
    });

    it('should not duplicate mentions', () => {
      const mentions = extractMentions('Hello @alice and @alice again');
      expect(mentions).toEqual(['alice']);
    });
  });

  describe('containsAgentMentions', () => {
    it('should detect agent mentions', () => {
      const agentIds = ['assistant', 'chatbot', 'ai_helper'];
      expect(containsAgentMentions('Hello @assistant can you help?', agentIds)).toBe(true);
      expect(containsAgentMentions('Ask @chatbot about this', agentIds)).toBe(true);
    });

    it('should not detect non-agent mentions', () => {
      const agentIds = ['assistant', 'chatbot'];
      expect(containsAgentMentions('Hello @alice', agentIds)).toBe(false);
      expect(containsAgentMentions('No mentions here', agentIds)).toBe(false);
    });

    it('should handle empty agent list', () => {
      expect(containsAgentMentions('Hello @anyone', [])).toBe(false);
    });
  });

  describe('formatMentions', () => {
    it('should format mentions as spans', () => {
      const formatted = formatMentions('Hello @alice');
      expect(formatted).toContain('<span class="mention">@alice</span>');
    });

    it('should format multiple mentions', () => {
      const formatted = formatMentions('Hello @alice and @bob');
      expect(formatted).toContain('<span class="mention">@alice</span>');
      expect(formatted).toContain('<span class="mention">@bob</span>');
    });

    it('should preserve non-mention content', () => {
      const formatted = formatMentions('Hello @alice how are you?');
      expect(formatted).toContain('Hello');
      expect(formatted).toContain('how are you?');
    });
  });

  describe('cleanMessageContent', () => {
    it('should remove dangerous HTML', () => {
      const content = 'Hello <script>alert("xss")</script> world';
      const cleaned = cleanMessageContent(content);
      expect(cleaned).toBe('Hello  world');
    });

    it('should preserve safe content', () => {
      const content = 'Hello <strong>world</strong> with @mentions';
      const cleaned = cleanMessageContent(content);
      expect(cleaned).toBe(content);
    });

    it('should handle empty content', () => {
      expect(cleanMessageContent('')).toBe('');
      expect(cleanMessageContent('   ')).toBe('   ');
    });
  });

  describe('isValidMessage', () => {
    it('should validate correct message', () => {
      const message = {
        id: 'msg_123',
        content: 'Hello world',
        senderId: 'user1',
        senderName: 'User One',
        senderRole: 'user',
        createdAt: mockCurrentTime,
        updatedAt: mockCurrentTime
      };

      const result = isValidMessage(message);
      expect(result).toBe(true);
    });

    it('should reject invalid message', () => {
      const message = {
        content: 'Hello world',
        // Missing required fields
      };

      const result = isValidMessage(message);
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('success');
    });
  });

  describe('createMessageWithProcessing', () => {
    it('should create message with auto-processed content', () => {
      const message = createMessageWithProcessing({
        content: 'Check this out: https://youtube.com/watch?v=123',
        senderId: 'user1',
        senderName: 'User One',
        senderRole: 'user',
        autoProcessContent: true
      });

      expect(message.content).toBe('Check this out: https://youtube.com/watch?v=123');
      expect(message.attachments).toBeDefined();
      expect(message.attachments!.length).toBeGreaterThan(0);
      expect(message.attachments![0].type).toBe('youtube');
    });

    it('should not process content when disabled', () => {
      const message = createMessageWithProcessing({
        content: 'Check this out: https://youtube.com/watch?v=123',
        senderId: 'user1',
        senderName: 'User One',
        senderRole: 'user',
        autoProcessContent: false
      });

      expect(message.content).toBe('Check this out: https://youtube.com/watch?v=123');
      expect(message.attachments).toBeUndefined();
    });

    it('should extract mentions and set recipient IDs', () => {
      const message = createMessageWithProcessing({
        content: 'Hello @alice and @bob',
        senderId: 'user1',
        senderName: 'User One',
        senderRole: 'user'
      });

      expect(message.recipientIds).toEqual(['alice', 'bob']);
    });

    it('should detect agent mentions', () => {
      const message = createMessageWithProcessing({
        content: 'Hello @assistant can you help?',
        senderId: 'user1',
        senderName: 'User One',
        senderRole: 'user'
      });

      // Test that message was created successfully
      expect(message.content).toBe('Hello @assistant can you help?');
      expect(message.recipientIds).toContain('assistant');
    });

    it('should create basic message without processing', () => {
      const message = createMessageWithProcessing({
        content: 'Hello world',
        senderId: 'user1',
        senderName: 'User One',
        senderRole: 'user'
      });

      expect(message.content).toBe('Hello world');
      expect(message.senderId).toBe('user1');
      expect(message.senderName).toBe('User One');
      expect(message.senderRole).toBe('user');
      expect(message.id).toBeDefined();
      expect(message.createdAt).toBeDefined();
      expect(message.updatedAt).toBeDefined();
    });
  });
});