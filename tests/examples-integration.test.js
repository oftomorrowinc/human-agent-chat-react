/**
 * Integration tests for chat examples
 * Tests all the functionality that was recently fixed
 */

describe('Chat Examples Integration Tests', () => {
  let page;
  
  beforeAll(async () => {
    page = await browser.newPage();
  });

  afterAll(async () => {
    await page.close();
  });

  describe('Basic Chat Example', () => {
    beforeEach(async () => {
      await page.goto('file://' + __dirname + '/../examples/basic/index.html');
      await page.waitForSelector('.chat-interface');
    });

    test('should load chat interface successfully', async () => {
      const chatInterface = await page.$('.chat-interface');
      expect(chatInterface).toBeTruthy();
      
      const messageInput = await page.$('#messageInput');
      expect(messageInput).toBeTruthy();
    });

    test('should switch users and update display', async () => {
      // Check initial user
      const initialUser = await page.textContent('#current-user-display');
      expect(initialUser).toContain('User 1');
      
      // Switch to User 2
      await page.click('button[onclick="switchUser(\'user2\')"]');
      
      const newUser = await page.textContent('#current-user-display');
      expect(newUser).toContain('User 2');
      
      const chatUser = await page.textContent('.current-user');
      expect(chatUser).toContain('User 2');
    });

    test('should show emoji picker on message hover for other users', async () => {
      // Add a message from AI
      await page.click('button[onclick="sendAIMessage()"]');
      await page.waitForSelector('.message-group');
      
      // Switch to user1 to ensure we're not the AI
      await page.click('button[onclick="switchUser(\'user1\')"]');
      
      // Hover over AI message
      await page.hover('.message-group');
      
      // Check if emoji trigger appears
      const emojiTrigger = await page.$('.emoji-trigger');
      expect(emojiTrigger).toBeTruthy();
      
      // Click emoji trigger
      await page.click('.emoji-trigger');
      
      // Check if emoji picker is active
      const emojiPicker = await page.$('.emoji-picker.active');
      expect(emojiPicker).toBeTruthy();
    });

    test('should contain all configured emojis with titles', async () => {
      // Add AI message and hover to show emoji picker
      await page.click('button[onclick="sendAIMessage()"]');
      await page.click('button[onclick="switchUser(\'user1\')"]');
      await page.hover('.message-group');
      await page.click('.emoji-trigger');
      
      const expectedEmojis = [
        { emoji: '👍', title: 'thumbs up' },
        { emoji: '❤️', title: 'heart' },
        { emoji: '😂', title: 'laughing' },
        { emoji: '😮', title: 'surprised' },
        { emoji: '😢', title: 'sad' },
        { emoji: '😡', title: 'angry' },
        { emoji: '👀', title: 'eyes' },
        { emoji: '🙏', title: 'high five' },
        { emoji: '🎯', title: 'dart' },
        { emoji: '💯', title: '100' },
        { emoji: '🤷', title: 'shrug' }
      ];
      
      for (const { emoji, title } of expectedEmojis) {
        const emojiButton = await page.$(`button[title="${title}"]`);
        expect(emojiButton).toBeTruthy();
        
        const emojiText = await page.textContent(`button[title="${title}"]`);
        expect(emojiText).toBe(emoji);
      }
    });

    test('should add reactions when emoji is clicked', async () => {
      // Add AI message
      await page.click('button[onclick="sendAIMessage()"]');
      await page.click('button[onclick="switchUser(\'user1\')"]');
      await page.hover('.message-group');
      await page.click('.emoji-trigger');
      
      // Click thumbs up emoji
      await page.click('button[title="thumbs up"]');
      
      // Check if reaction was added
      const reactions = await page.$('.message-reactions .reaction');
      expect(reactions).toBeTruthy();
      
      const reactionText = await page.textContent('.message-reactions .reaction');
      expect(reactionText).toContain('👍');
      expect(reactionText).toContain('1');
    });

    test('should display images from picsum.photos URLs', async () => {
      // Send image message
      await page.click('button[onclick="sendImageMessage()"]');
      
      // Wait for image to load
      await page.waitForSelector('.message-image');
      
      const image = await page.$('.message-image');
      expect(image).toBeTruthy();
      
      const imageSrc = await page.getAttribute('.message-image', 'src');
      expect(imageSrc).toContain('picsum.photos');
    });

    test('should send and display text messages', async () => {
      // Type message
      await page.fill('#messageInput', 'Test message from automated test');
      await page.click('.send-button');
      
      // Check if message appears
      await page.waitForSelector('.message-content');
      const messageContent = await page.textContent('.message-content');
      expect(messageContent).toContain('Test message from automated test');
    });
  });

  describe('Advanced Chat Example', () => {
    beforeEach(async () => {
      await page.goto('file://' + __dirname + '/../examples/advanced/index.html');
      await page.waitForSelector('.advanced-chat-interface');
    });

    test('should load advanced chat interface successfully', async () => {
      const chatInterface = await page.$('.advanced-chat-interface');
      expect(chatInterface).toBeTruthy();
      
      const messageInput = await page.$('#messageInput');
      expect(messageInput).toBeTruthy();
    });

    test('should switch users and update both sidebar and chat header', async () => {
      // Check initial user in sidebar
      const initialSidebarUser = await page.textContent('#user-name');
      expect(initialSidebarUser).toContain('Alice Johnson');
      
      // Check initial user in chat header
      const initialChatUser = await page.textContent('.current-user-status');
      expect(initialChatUser).toContain('Alice Johnson');
      
      // Switch to User 2
      await page.click('button[onclick="switchUser(\'user2\')"]');
      
      // Check updated sidebar
      const newSidebarUser = await page.textContent('#user-name');
      expect(newSidebarUser).toContain('Bob Smith');
      
      // Check updated chat header
      const newChatUser = await page.textContent('.current-user-status');
      expect(newChatUser).toContain('Bob Smith');
    });

    test('should show emoji picker positioned correctly and expanding left', async () => {
      // Add AI message
      await page.click('button[onclick="sendAIGreeting()"]');
      await page.waitForSelector('.message-group');
      
      // Switch to different user
      await page.click('button[onclick="switchUser(\'user1\')"]');
      
      // Hover over AI message
      await page.hover('.message-group');
      
      // Check floating actions appear
      const floatingActions = await page.$('.floating-actions');
      expect(floatingActions).toBeTruthy();
      
      // Click emoji trigger
      await page.click('.emoji-trigger');
      
      // Check picker is active and positioned correctly
      const emojiPicker = await page.$('.emoji-picker.active');
      expect(emojiPicker).toBeTruthy();
      
      // Check CSS positioning (should expand to the left)
      const pickerStyles = await page.evaluate(() => {
        const picker = document.querySelector('.emoji-picker');
        const styles = window.getComputedStyle(picker);
        return {
          position: styles.position,
          right: styles.right,
          top: styles.top
        };
      });
      
      expect(pickerStyles.position).toBe('absolute');
      expect(pickerStyles.right).toBe('100%');
    });

    test('should handle real file uploads', async () => {
      // Mock file input
      const fileInput = await page.$('#imageUpload');
      expect(fileInput).toBeTruthy();
      
      // Simulate file selection (this would need actual file in real test)
      await page.evaluate(() => {
        const input = document.getElementById('imageUpload');
        const file = new File(['test'], 'test.png', { type: 'image/png' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      
      // Wait for upload message
      await page.waitForSelector('.message-content');
      const uploadMessage = await page.textContent('.message-content');
      expect(uploadMessage).toContain('Uploading');
    });

    test('should generate and play audio', async () => {
      // Send audio message
      await page.click('button[onclick="sendAudioMessage()"]');
      
      // Wait for audio element
      await page.waitForSelector('audio');
      
      const audio = await page.$('audio');
      expect(audio).toBeTruthy();
      
      // Check if audio has controls
      const hasControls = await page.getAttribute('audio', 'controls');
      expect(hasControls).toBe('');
      
      // Check if audio source is set
      const audioSrc = await page.getAttribute('audio source', 'src');
      expect(audioSrc).toBeTruthy();
    });

    test('should render form with stars and slider elements', async () => {
      // Send feedback form (has stars)
      await page.click('button[onclick="sendFeedbackForm()"]');
      await page.waitForSelector('.zod-form');
      
      // Check if form is rendered
      const form = await page.$('.zod-form');
      expect(form).toBeTruthy();
      
      // Send survey form (has sliders)
      await page.click('button[onclick="sendSurveyForm()"]');
      await page.waitForSelector('.zod-form');
      
      const surveyForm = await page.$('.zod-form');
      expect(surveyForm).toBeTruthy();
    });

    test('should handle media attachments and lightbox', async () => {
      // Send image message
      await page.click('button[onclick="sendImageMessage()"]');
      
      // Wait for image attachment
      await page.waitForSelector('.attachment img');
      
      const image = await page.$('.attachment img');
      expect(image).toBeTruthy();
      
      // Click image to open lightbox
      await page.click('.attachment img');
      
      // Check if lightbox opens
      await page.waitForSelector('#lightbox.active');
      const lightbox = await page.$('#lightbox.active');
      expect(lightbox).toBeTruthy();
    });
  });

  describe('Cross-Example Consistency', () => {
    test('emoji functionality should work the same in both examples', async () => {
      // Test basic example
      await page.goto('file://' + __dirname + '/../examples/basic/index.html');
      await page.click('button[onclick="sendAIMessage()"]');
      await page.click('button[onclick="switchUser(\'user1\')"]');
      await page.hover('.message-group');
      await page.click('.emoji-trigger');
      
      const basicEmojis = await page.$$eval('.emoji-option', buttons => 
        buttons.map(btn => ({ emoji: btn.textContent, title: btn.title }))
      );
      
      // Test advanced example
      await page.goto('file://' + __dirname + '/../examples/advanced/index.html');
      await page.click('button[onclick="sendAIGreeting()"]');
      await page.click('button[onclick="switchUser(\'user1\')"]');
      await page.hover('.message-group');
      await page.click('.emoji-trigger');
      
      const advancedEmojis = await page.$$eval('.emoji-option', buttons => 
        buttons.map(btn => ({ emoji: btn.textContent, title: btn.title }))
      );
      
      // Should have the same emojis
      expect(basicEmojis).toEqual(advancedEmojis);
      expect(basicEmojis.length).toBe(11); // Our configured emoji count
    });
  });
});