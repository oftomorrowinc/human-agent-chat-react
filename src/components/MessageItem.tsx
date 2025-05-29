import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageSquare,
  MoreHorizontal,
  FileText,
  ExternalLink,
  Play,
} from 'lucide-react';
import { Message, User, MessageAttachment, formatMentions } from '../types';

interface MessageItemProps {
  message: Message;
  currentUser: User;
  isAgent?: boolean;
  isSystem?: boolean;
  enableReactions?: boolean;
  enableReplies?: boolean;
  onDataRequest?: (schema: any) => void;
  onReply?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUser,
  isAgent = false,
  isSystem = false,
  enableReactions = true,
  enableReplies = true,
  onDataRequest,
  onReply,
  onReaction,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});

  const isCurrentUser = message.senderId === currentUser.id;
  const senderName = message.senderName || 'Unknown User';

  // Format timestamp
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  // Generate avatar for sender
  const renderAvatar = () => {
    const initials = senderName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    let bgColor = 'bg-blue-600';
    if (isSystem) bgColor = 'bg-red-600';
    else if (isAgent) bgColor = 'bg-purple-600';
    else if (isCurrentUser) bgColor = 'bg-green-600';

    return (
      <div
        className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center text-white text-sm font-medium`}
      >
        {initials}
      </div>
    );
  };

  // Render message content with mentions
  const renderContent = () => {
    let content = message.content;

    // Process mentions
    content = formatMentions(content);

    return (
      <div
        className="prose prose-sm prose-invert max-w-none break-words"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  };

  // Render attachments
  const renderAttachments = () => {
    if (!message.attachments || message.attachments.length === 0) return null;

    const attachments = message.attachments;

    return (
      <div className="mt-3 space-y-2">
        {attachments.map((attachment, index) => (
          <div key={index}>{renderAttachment(attachment, index)}</div>
        ))}
      </div>
    );
  };

  // Render individual attachment
  const renderAttachment = (attachment: MessageAttachment, index: number) => {
    switch (attachment.type) {
      case 'image':
        return renderImageAttachment(attachment, index);
      case 'video':
        return renderVideoAttachment(attachment);
      case 'youtube':
        return renderYouTubeAttachment(attachment);
      case 'audio':
        return renderAudioAttachment(attachment);
      case 'document':
      case 'file':
        return renderDocumentAttachment(attachment);
      case 'link':
        return renderLinkAttachment(attachment);
      default:
        return null;
    }
  };

  // Render image attachment
  const renderImageAttachment = (
    attachment: MessageAttachment,
    index: number
  ) => {
    const imageKey = `${message.id}-${index}`;

    if (imageError[imageKey]) {
      return (
        <div className="bg-dark-800 border border-dark-600 rounded-lg p-4 text-center">
          <FileText className="mx-auto mb-2 text-dark-400" size={24} />
          <p className="text-sm text-dark-400">Failed to load image</p>
          <a
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            View original
          </a>
        </div>
      );
    }

    return (
      <div className="relative group">
        <img
          src={attachment.url}
          alt={attachment.title || 'Image'}
          className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          style={{ maxHeight: '400px' }}
          onError={() =>
            setImageError((prev) => ({ ...prev, [imageKey]: true }))
          }
          onClick={() => {
            // TODO: Open lightbox
            window.open(attachment.url, '_blank');
          }}
        />
        {attachment.title && (
          <p className="text-sm text-dark-400 mt-1">{attachment.title}</p>
        )}
      </div>
    );
  };

  // Render video attachment
  const renderVideoAttachment = (attachment: MessageAttachment) => (
    <div className="relative">
      <video
        src={attachment.url}
        controls
        className="max-w-full h-auto rounded-lg"
        style={{ maxHeight: '400px' }}
      >
        Your browser does not support the video element.
      </video>
      {attachment.title && (
        <p className="text-sm text-dark-400 mt-1">{attachment.title}</p>
      )}
    </div>
  );

  // Render YouTube attachment
  const renderYouTubeAttachment = (attachment: MessageAttachment) => {
    // Extract video ID from URL
    const videoIdMatch = attachment.url.match(
      /(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    const videoId = videoIdMatch ? videoIdMatch[1] : null;

    if (!videoId) {
      return renderLinkAttachment(attachment);
    }

    const thumbnailUrl =
      attachment.thumbnailUrl ||
      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    return (
      <div
        className="relative group cursor-pointer"
        onClick={() => window.open(attachment.url, '_blank')}
      >
        <div className="relative">
          <img
            src={thumbnailUrl}
            alt={attachment.title || 'YouTube Video'}
            className="w-full h-auto rounded-lg"
            style={{ maxHeight: '300px', objectFit: 'cover' }}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg group-hover:bg-opacity-50 transition-colors">
            <div className="bg-red-600 rounded-full p-3">
              <Play className="text-white" size={24} fill="white" />
            </div>
          </div>
        </div>
        {attachment.title && (
          <p className="text-sm text-dark-300 mt-2">{attachment.title}</p>
        )}
      </div>
    );
  };

  // Render audio attachment
  const renderAudioAttachment = (attachment: MessageAttachment) => (
    <div className="bg-dark-800 border border-dark-600 rounded-lg p-4">
      <audio controls className="w-full">
        <source
          src={attachment.url}
          type={attachment.mimeType || 'audio/mpeg'}
        />
        Your browser does not support the audio element.
      </audio>
      {attachment.title && (
        <p className="text-sm text-dark-400 mt-2">{attachment.title}</p>
      )}
    </div>
  );

  // Render document attachment
  const renderDocumentAttachment = (attachment: MessageAttachment) => (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center space-x-3 bg-dark-800 border border-dark-600 rounded-lg p-4 hover:bg-dark-700 transition-colors"
    >
      <FileText className="text-blue-400" size={24} />
      <div className="flex-1">
        <p className="text-dark-200 font-medium">
          {attachment.title || 'Document'}
        </p>
        {attachment.mimeType && (
          <p className="text-sm text-dark-400">{attachment.mimeType}</p>
        )}
      </div>
      <ExternalLink className="text-dark-400" size={16} />
    </a>
  );

  // Render link attachment
  const renderLinkAttachment = (attachment: MessageAttachment) => (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center space-x-3 bg-dark-800 border border-dark-600 rounded-lg p-4 hover:bg-dark-700 transition-colors"
    >
      <ExternalLink className="text-blue-400" size={20} />
      <div className="flex-1">
        <p className="text-dark-200 font-medium">
          {attachment.title || 'Link'}
        </p>
        <p className="text-sm text-dark-400 break-all">{attachment.url}</p>
      </div>
    </a>
  );

  // Render data request button
  const renderDataRequest = () => {
    if (!message.dataRequest || !onDataRequest) return null;

    return (
      <div className="mt-3">
        <button
          type="button"
          onClick={() => onDataRequest(message.dataRequest)}
          className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <FileText size={16} />
          <span>Provide Information</span>
        </button>
      </div>
    );
  };

  // Handle emoji picker toggle
  const toggleEmojiPicker = React.useCallback(() => {
    setShowEmojiPicker(!showEmojiPicker);
  }, [showEmojiPicker]);

  // Make toggleEmojiPicker available globally for onclick handlers
  React.useEffect(() => {
    (window as any).toggleEmojiPicker = toggleEmojiPicker;
    return () => {
      delete (window as any).toggleEmojiPicker;
    };
  }, [toggleEmojiPicker]);

  // Render emoji picker
  const renderEmojiPicker = () => {
    if (!showEmojiPicker || !enableReactions || isCurrentUser) return null;

    const emojis = ['😀', '👍', '❤️', '😂', '😮', '😢', '😡'];

    return (
      <div className="absolute top-2 right-2 bg-dark-900/95 backdrop-blur-sm border border-dark-600/50 rounded-lg shadow-xl p-2 flex space-x-1 z-10">
        {emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => {
              onReaction?.(message.id!, emoji);
              setShowEmojiPicker(false);
            }}
            className="w-8 h-8 flex items-center justify-center hover:bg-dark-700/50 rounded transition-colors text-lg"
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    );
  };

  // Render message actions
  const renderActions = () => {
    if (!showActions) return null;

    return (
      <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-dark-800 border border-dark-600 rounded-lg shadow-lg p-1 flex space-x-1">
        {enableReplies && (
          <button
            type="button"
            onClick={() => onReply?.(message.id!)}
            className="p-1 hover:bg-dark-700 rounded text-dark-400 hover:text-blue-400 transition-colors"
            title="Reply to message"
          >
            <MessageSquare size={14} />
          </button>
        )}
        <button
          type="button"
          className="p-1 hover:bg-dark-700 rounded text-dark-400 hover:text-dark-200 transition-colors"
          title="More options"
        >
          <MoreHorizontal size={14} />
        </button>
      </div>
    );
  };

  // Message container classes
  const messageClasses = [
    'relative group animate-message-in',
    isCurrentUser ? 'ml-8' : 'mr-8',
  ].join(' ');

  // Message bubble classes
  const bubbleClasses = [
    'message-bubble rounded-lg p-4 shadow-sm',
    isSystem
      ? 'bg-red-900 border border-red-700'
      : isAgent
        ? 'bg-purple-900 border border-purple-700'
        : isCurrentUser
          ? 'bg-blue-900 border border-blue-700'
          : 'bg-dark-800 border border-dark-600',
  ].join(' ');

  return (
    <div
      role="region"
      aria-label={`Message from ${senderName}`}
      className={messageClasses}
      onMouseEnter={() => {
        setShowActions(true);
        if (!isCurrentUser && enableReactions) {
          setShowEmojiPicker(true);
        }
      }}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
      }}
    >
      <div className="flex items-start space-x-3">
        {/* Avatar */}
        {!isCurrentUser && (
          <div className="flex-shrink-0">{renderAvatar()}</div>
        )}

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          {!isCurrentUser && (
            <div className="flex items-center space-x-2 mb-1">
              <span
                className={`font-medium text-sm ${
                  isSystem
                    ? 'text-red-300'
                    : isAgent
                      ? 'text-purple-300'
                      : 'text-dark-300'
                }`}
              >
                {senderName}
              </span>
              <span className="text-xs text-dark-500">
                {formatTime(message.createdAt)}
              </span>
              {isAgent && (
                <span className="bg-purple-700 text-purple-200 text-xs px-1.5 py-0.5 rounded-full font-medium">
                  AI
                </span>
              )}
              {isSystem && (
                <span className="bg-red-700 text-red-200 text-xs px-1.5 py-0.5 rounded-full font-medium">
                  SYSTEM
                </span>
              )}
            </div>
          )}

          {/* Message Bubble */}
          <div className={bubbleClasses}>
            {/* Content */}
            {renderContent()}

            {/* Attachments */}
            {renderAttachments()}

            {/* Data Request */}
            {renderDataRequest()}

            {/* Current user timestamp */}
            {isCurrentUser && (
              <div className="text-xs text-blue-300 mt-2 text-right opacity-70">
                {formatTime(message.createdAt)}
              </div>
            )}
          </div>
        </div>

        {/* Current user avatar */}
        {isCurrentUser && <div className="flex-shrink-0">{renderAvatar()}</div>}
      </div>

      {/* Emoji Picker */}
      {renderEmojiPicker()}

      {/* Actions */}
      {renderActions()}
    </div>
  );
};

export default MessageItem;
