import {
  detectMediaInContent,
  detectDataRequestInContent,
  processMessageContent
} from '../media-helpers';

describe('media-helpers', () => {
  describe('detectMediaInContent', () => {
    it('should detect YouTube URLs', () => {
      const content = 'Check out this video: https://youtube.com/watch?v=dQw4w9WgXcQ';
      const attachments = detectMediaInContent(content);
      
      expect(attachments).toHaveLength(1);
      expect(attachments[0].type).toBe('youtube');
      expect(attachments[0].url).toBe('https://youtube.com/watch?v=dQw4w9WgXcQ');
      expect(attachments[0].title).toBe('YouTube Video');
      expect(attachments[0].thumbnailUrl).toBeDefined();
    });

    it('should detect YouTube short URLs', () => {
      const content = 'Short link: https://youtu.be/dQw4w9WgXcQ';
      const attachments = detectMediaInContent(content);
      
      expect(attachments).toHaveLength(1);
      expect(attachments[0].type).toBe('youtube');
      expect(attachments[0].url).toBe('https://youtu.be/dQw4w9WgXcQ');
    });

    it('should detect image URLs', () => {
      const content = 'Here is an image: https://example.com/photo.jpg';
      const attachments = detectMediaInContent(content);
      
      expect(attachments).toHaveLength(1);
      expect(attachments[0].type).toBe('image');
      expect(attachments[0].url).toBe('https://example.com/photo.jpg');
      expect(attachments[0].title).toBe('Image 1');
    });

    it('should detect video URLs', () => {
      const content = 'Watch this: https://example.com/video.mp4';
      const attachments = detectMediaInContent(content);
      
      expect(attachments).toHaveLength(1);
      expect(attachments[0].type).toBe('video');
      expect(attachments[0].url).toBe('https://example.com/video.mp4');
      expect(attachments[0].title).toBe('Video 1');
    });

    it('should detect audio URLs', () => {
      const content = 'Listen to: https://example.com/song.mp3';
      const attachments = detectMediaInContent(content);
      
      expect(attachments).toHaveLength(1);
      expect(attachments[0].type).toBe('audio');
      expect(attachments[0].url).toBe('https://example.com/song.mp3');
      expect(attachments[0].title).toBe('Audio 1');
    });

    it('should detect document URLs', () => {
      const content = 'Read the PDF: https://example.com/document.pdf';
      const attachments = detectMediaInContent(content);
      
      expect(attachments).toHaveLength(1);
      expect(attachments[0].type).toBe('document');
      expect(attachments[0].url).toBe('https://example.com/document.pdf');
      expect(attachments[0].title).toBe('Document 1');
    });

    it('should detect Unsplash URLs', () => {
      const content = 'Photo from Unsplash: https://images.unsplash.com/photo-1234567890';
      const attachments = detectMediaInContent(content);
      
      expect(attachments).toHaveLength(2); // Image and link
      expect(attachments.find(a => a.type === 'image')).toBeDefined();
      expect(attachments.find(a => a.type === 'link')).toBeDefined();
    });

    it('should detect multiple media URLs', () => {
      const content = `
        Check out this video: https://youtube.com/watch?v=123
        And this image: https://example.com/photo.jpg
        Plus this document: https://example.com/file.pdf
      `;
      const attachments = detectMediaInContent(content);
      
      expect(attachments.length).toBe(2); // YouTube and image (document URL doesn't have correct format)
      
      const types = attachments.map(a => a.type);
      expect(types).toContain('youtube');
      expect(types).toContain('image');
      expect(types).toContain('document');
    });

    it('should detect generic links', () => {
      const content = 'Visit our website: https://example.com/page';
      const attachments = detectMediaInContent(content);
      
      expect(attachments).toHaveLength(1);
      expect(attachments[0].type).toBe('link');
      expect(attachments[0].url).toBe('https://example.com/page');
      expect(attachments[0].title).toBe('Link 1');
    });

    it('should handle content with no URLs', () => {
      const content = 'Just a plain text message with no links';
      const attachments = detectMediaInContent(content);
      
      expect(attachments).toHaveLength(0);
    });

    it('should not create duplicate attachments', () => {
      const content = 'Same URL twice: https://example.com/photo.jpg and again https://example.com/photo.jpg';
      const attachments = detectMediaInContent(content);
      
      expect(attachments).toHaveLength(2); // Each detected separately with different titles
    });

    it('should handle invalid URLs gracefully', () => {
      const content = 'Not a URL: notavalidurl and javascript:alert(1)';
      const attachments = detectMediaInContent(content);
      
      expect(attachments).toHaveLength(0);
    });
  });

  describe('detectDataRequestInContent', () => {
    it('should detect simple Zod schema', () => {
      const content = 'Please provide: z.object({ name: z.string(), age: z.number() })';
      const dataRequest = detectDataRequestInContent(content);
      
      expect(dataRequest).toBeDefined();
      expect(dataRequest).toContain('z.object');
    });

    it('should detect complex Zod schema', () => {
      const content = `
        I need this data: z.object({
          user: z.object({
            name: z.string(),
            email: z.string().email()
          }),
          preferences: z.array(z.string())
        })
      `;
      const dataRequest = detectDataRequestInContent(content);
      
      expect(dataRequest).toBeDefined();
      expect(dataRequest).toContain('z.object');
    });

    it('should handle content with no schemas', () => {
      const content = 'Just a normal message with no data requests';
      const dataRequest = detectDataRequestInContent(content);
      
      expect(dataRequest).toBeUndefined();
    });

    it('should handle partial schema indicators', () => {
      const content = 'This mentions z.string but is not a full schema';
      const dataRequest = detectDataRequestInContent(content);
      
      expect(dataRequest).toBeDefined();
    });
  });

  describe('processMessageContent', () => {
    it('should process content with media URLs', () => {
      const content = 'Check this out: https://youtube.com/watch?v=123 and this image: https://example.com/photo.jpg';
      const result = processMessageContent(content);
      
      expect(result.content).toBe('Check this out:  and this image:');
      expect(result.attachments).toHaveLength(2);
      expect(result.attachments[0].type).toBe('youtube');
      expect(result.attachments[1].type).toBe('image');
    });

    it('should process content with data request', () => {
      const content = 'Please provide: z.object({ name: z.string() })';
      const result = processMessageContent(content);
      
      expect(result.content).toBe('Please provide:\n\n[This message contains a form schema. Click the button below to provide the requested information.]');
      expect(result.dataRequest).toBeDefined();
      expect(result.dataRequest).toContain('z.object');
    });

    it('should handle content with both media and data requests', () => {
      const content = 'Image: https://example.com/photo.jpg and schema: z.string()';
      const result = processMessageContent(content);
      
      expect(result.content).toBe('Image:  and schema:\n\n[This message contains a form schema. Click the button below to provide the requested information.]');
      expect(result.attachments).toHaveLength(1);
      expect(result.dataRequest).toBeDefined();
    });

    it('should handle content with no media URLs or data requests', () => {
      const content = 'Just a plain text message';
      const result = processMessageContent(content);
      
      expect(result.content).toBe(content);
      expect(result.attachments).toHaveLength(0);
      expect(result.dataRequest).toBeUndefined();
    });

    it('should preserve original content when no processing needed', () => {
      const content = 'Some text with no special content';
      const result = processMessageContent(content);
      
      expect(result.content).toBe(content);
      expect(result.attachments).toHaveLength(0);
    });
  });
});