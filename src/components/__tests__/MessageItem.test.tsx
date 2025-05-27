import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MessageItem from '../MessageItem';
import { Message, User } from '../../types';

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '5 minutes ago')
}));

describe('MessageItem', () => {
  const mockCurrentUser: User = {
    id: 'current-user',
    displayName: 'Current User',
    role: 'user',
    email: 'current@example.com'
  };

  const mockMessage: Message = {
    id: 'msg-123',
    content: 'Hello world!',
    senderId: 'other-user',
    senderName: 'Other User',
    senderRole: 'user',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  it('should render message content', () => {
    render(
      <MessageItem
        message={mockMessage}
        currentUser={mockCurrentUser}
      />
    );

    expect(screen.getByText('Hello world!')).toBeInTheDocument();
  });

  it('should render sender name', () => {
    render(
      <MessageItem
        message={mockMessage}
        currentUser={mockCurrentUser}
      />
    );

    expect(screen.getByText('Other User')).toBeInTheDocument();
  });

  it('should render timestamp', () => {
    render(
      <MessageItem
        message={mockMessage}
        currentUser={mockCurrentUser}
      />
    );

    expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
  });

  it('should apply different styles for current user messages', () => {
    const currentUserMessage = {
      ...mockMessage,
      senderId: 'current-user',
      senderName: 'Current User'
    };

    render(
      <MessageItem
        message={currentUserMessage}
        currentUser={mockCurrentUser}
      />
    );

    // Current user messages should have different styling
    expect(screen.getByRole('region')).toHaveClass('flex-row-reverse');
  });

  it('should apply agent styling when isAgent is true', () => {
    render(
      <MessageItem
        message={mockMessage}
        currentUser={mockCurrentUser}
        isAgent={true}
      />
    );

    expect(screen.getByText('AI')).toBeInTheDocument();
  });

  it('should apply system styling when isSystem is true', () => {
    render(
      <MessageItem
        message={mockMessage}
        currentUser={mockCurrentUser}
        isSystem={true}
      />
    );

    expect(screen.getByText('Other User')).toHaveClass('text-red-300');
  });

  it('should render image attachments', () => {
    const messageWithImage = {
      ...mockMessage,
      attachments: [{
        type: 'image' as const,
        url: 'https://example.com/image.jpg',
        title: 'Test Image'
      }]
    };

    render(
      <MessageItem
        message={messageWithImage}
        currentUser={mockCurrentUser}
      />
    );

    const image = screen.getByAltText('Test Image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('should render YouTube attachments', () => {
    const messageWithYouTube = {
      ...mockMessage,
      attachments: [{
        type: 'youtube' as const,
        url: 'https://youtube.com/watch?v=123',
        title: 'YouTube Video',
        thumbnailUrl: 'https://img.youtube.com/vi/123/hqdefault.jpg'
      }]
    };

    render(
      <MessageItem
        message={messageWithYouTube}
        currentUser={mockCurrentUser}
      />
    );

    expect(screen.getByText('YouTube Video')).toBeInTheDocument();
    const youtubeElement = screen.getByRole('link', { name: /youtube video/i });
    expect(youtubeElement).toBeInTheDocument();
  });

  it('should render document attachments', () => {
    const messageWithDocument = {
      ...mockMessage,
      attachments: [{
        type: 'document' as const,
        url: 'https://example.com/document.pdf',
        title: 'Test Document'
      }]
    };

    render(
      <MessageItem
        message={messageWithDocument}
        currentUser={mockCurrentUser}
      />
    );

    expect(screen.getByText('Test Document')).toBeInTheDocument();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com/document.pdf');
  });

  it('should format mentions in content', () => {
    const messageWithMentions = {
      ...mockMessage,
      content: 'Hello @alice and @bob!'
    };

    render(
      <MessageItem
        message={messageWithMentions}
        currentUser={mockCurrentUser}
      />
    );

    // Check that mentions are wrapped in spans
    expect(screen.getByText(/@alice/)).toBeInTheDocument();
    expect(screen.getByText(/@bob/)).toBeInTheDocument();
  });

  it('should not render reaction buttons when disabled', () => {
    render(
      <MessageItem
        message={mockMessage}
        currentUser={mockCurrentUser}
        enableReactions={false}
      />
    );

    expect(screen.queryByTitle('React to message')).not.toBeInTheDocument();
  });

  it('should not render reply button when disabled', () => {
    render(
      <MessageItem
        message={mockMessage}
        currentUser={mockCurrentUser}
        enableReplies={false}
      />
    );

    expect(screen.queryByTitle('Reply to message')).not.toBeInTheDocument();
  });

  it('should handle unknown sender gracefully', () => {
    const messageWithoutSender = {
      ...mockMessage,
      senderName: undefined
    };

    render(
      <MessageItem
        message={messageWithoutSender}
        currentUser={mockCurrentUser}
      />
    );

    expect(screen.getByText('Unknown User')).toBeInTheDocument();
  });

  it('should handle invalid timestamp gracefully', () => {
    const { formatDistanceToNow } = require('date-fns');
    (formatDistanceToNow as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Invalid date');
    });

    const messageWithInvalidTime = {
      ...mockMessage,
      createdAt: 'invalid-date'
    };

    render(
      <MessageItem
        message={messageWithInvalidTime}
        currentUser={mockCurrentUser}
      />
    );

    expect(screen.getByText('Unknown time')).toBeInTheDocument();
  });
});