import { listenToChat, sendMessage, uploadFile } from '../lib/firebase.js';
import { AccessControl } from '../utils/access-control.js';
import {
  Message,
  MessageAttachment,
  User,
  ChatOptions,
  AccessLevel,
  createMessage,
} from '../types/index.js';
import { generateForm } from '../utils/form-generator.js';

/**
 * Main ChatUI component for human-agent chat interactions
 * Provides a server-rendered interface using HTMX for dynamic updates
 */
export class ChatUI {
  private options: ChatOptions;
  private unsubscribe: (() => void) | null = null;
  private messages: Message[] = [];
  private container: HTMLElement | null = null;
  private isInitialized = false;

  /**
   * Create a new ChatUI instance
   * @param options Configuration options for the chat UI
   */
  constructor(options: ChatOptions) {
    this.options = {
      // Default options
      theme: 'dark', // Dark theme is the only option
      maxMessages: 100,
      enableReactions: true,
      enableReplies: true,
      enableMultiModal: true,
      enableForms: true,
      ...options,
    };
    
    // Always override the theme to ensure dark theme is used
    this.options.theme = 'dark';
  }

  /**
   * Initialize the chat UI and start listening for messages
   * @returns Promise that resolves when initialization is complete
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Get container element
    this.container = document.getElementById(this.options.containerId);
    if (!this.container) {
      throw new Error(
        `Container with ID "${this.options.containerId}" not found`
      );
    }

    // Apply dark theme (the only theme)
    this.container.classList.add('human-agent-chat-dark');

    // Check if user has access to this chat
    const hasAccess = await AccessControl.hasAccess(
      this.options.firebasePath,
      this.options.currentUser.id,
      AccessLevel.READ
    );

    if (!hasAccess) {
      this.renderAccessDenied();
      return;
    }

    // Render initial UI
    this.renderChatInterface();

    // Start listening for messages
    this.unsubscribe = listenToChat(
      this.options.firebasePath,
      this.options.maxMessages,
      this.handleNewMessages
    );

    this.isInitialized = true;
  }

  /**
   * Handle new messages from Firebase
   * @param messages Array of messages
   */
  private handleNewMessages = (messages: Message[]): void => {
    this.messages = messages;
    this.renderMessages();

    // Notify callback if provided
    if (this.options.onNewMessage && messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      this.options.onNewMessage(latestMessage);
    }
  };

  /**
   * Render the main chat interface
   */
  private renderChatInterface(): void {
    if (!this.container) return;

    // Check for write access to show/hide message input
    AccessControl.hasAccess(
      this.options.firebasePath,
      this.options.currentUser.id,
      AccessLevel.WRITE
    ).then(canWrite => {
      const chatHtml = `
        <div class="human-agent-chat">
          <div class="chat-messages" id="${this.options.containerId}-messages"></div>
          ${canWrite ? this.renderMessageInput() : ''}
        </div>
      `;

      if (this.container) {
        this.container.innerHTML = chatHtml;

        // Add event listeners
        if (canWrite) {
          const form = document.getElementById(
            `${this.options.containerId}-form`
          );
          if (form) {
            form.addEventListener('submit', this.handleSubmit);
          }

          if (this.options.enableMultiModal) {
            const fileInput = document.getElementById(
              `${this.options.containerId}-file`
            );
            if (fileInput) {
              fileInput.addEventListener('change', this.handleFileUpload);
            }
          }
        }
      }
    });
  }

  /**
   * Render message input form
   * @returns HTML string for message input
   */
  private renderMessageInput(): string {
    const multimodalUpload = this.options.enableMultiModal
      ? `
        <div class="chat-file-upload">
          <label for="${this.options.containerId}-file" class="file-upload-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </label>
          <input type="file" id="${this.options.containerId}-file" class="file-input" accept="image/*,video/*,.pdf,.doc,.docx,.txt" hidden/>
        </div>
      `
      : '';

    return `
      <form id="${this.options.containerId}-form" class="chat-input-form" hx-swap="none">
        <div class="chat-input-container">
          ${multimodalUpload}
          <input
            type="text"
            id="${this.options.containerId}-input"
            class="chat-input"
            placeholder="Type a message..."
            autocomplete="off"
          />
          <button type="submit" class="chat-send-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </form>
    `;
  }

  /**
   * Render access denied message
   */
  private renderAccessDenied(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="chat-access-denied">
        <div class="access-denied-icon">🔒</div>
        <h3>Access Denied</h3>
        <p>You don't have permission to view this chat.</p>
      </div>
    `;
  }

  /**
   * Render all messages
   */
  private renderMessages(): void {
    const messagesContainer = document.getElementById(
      `${this.options.containerId}-messages`
    );
    if (!messagesContainer) return;

    // Generate HTML for all messages
    const messagesHtml = this.messages
      .map(message => this.renderMessage(message))
      .join('');

    // Update container with the new HTML
    messagesContainer.innerHTML = messagesHtml;

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /**
   * Render a single message
   * @param message Message to render
   * @returns HTML string for the message
   */
  private renderMessage(message: Message): string {
    const sender =
      message.senderId === this.options.currentUser.id
        ? this.options.currentUser
        : {
            id: message.senderId,
            displayName: 'User ' + message.senderId.substring(0, 4),
          };

    const isCurrentUser = sender.id === this.options.currentUser.id;
    const isAgent = this.options.agentIds?.includes(message.senderId) || false;

    // Message classes - using let since we'll modify this later
    let messageClasses = [
      'chat-message',
      isCurrentUser ? 'chat-message-self' : '',
      isAgent ? 'chat-message-agent' : '',
    ]
      .filter(Boolean)
      .join(' ');

    // Content rendering
    let contentHtml = '';
    if (typeof message.content === 'string') {
      // Check if it's a status update message (starts with "Project status changed")
      if (message.content.startsWith('Project status changed')) {
        contentHtml = `<div class="message-text message-status-update">${this.processMessageText(message.content)}</div>`;
      } 
      // Check if it's a success message ("All tasks have been completed")
      else if (message.content.includes('completed') && message.content.includes('tasks')) {
        contentHtml = `<div class="message-text message-status-success">${this.processMessageText(message.content)}</div>`;
      } 
      // Regular text message
      else {
        contentHtml = `<div class="message-text">${this.processMessageText(message.content)}</div>`;
      }
    } else {
      // Check for attachments first (new schema)
      if (message.attachments && message.attachments.length > 0) {
        // Generate a unique ID for this message's attachments group
        const attachmentGroupId = `attachments-${message.id || Date.now()}`;
        
        // Sort attachments into types for proper grouping
        const imageAttachments = message.attachments.filter(a => a.type === 'image');
        const videoAttachments = message.attachments.filter(a => a.type === 'video');
        const youtubeAttachments = message.attachments.filter(a => a.type === 'youtube');
        const documentAttachments = message.attachments.filter(a => 
          a.type === 'document' || a.type === 'file'
        );
        const linkAttachments = message.attachments.filter(a => a.type === 'link');
        
        let attachmentsHtml = '';
        
        // Render image grid if there are images
        if (imageAttachments.length > 0) {
          const gridClass = imageAttachments.length > 1 ? 
            `image-grid image-count-${Math.min(imageAttachments.length, 4)}` : 'single-image';
            
          attachmentsHtml += `
            <div class="message-images ${gridClass}">
              ${imageAttachments.map((img, index) => `
                <div class="image-item">
                  <img 
                    src="${img.url}" 
                    alt="${img.title || 'Image'}" 
                    class="lightbox-trigger"
                    data-type="image"
                    data-group="${attachmentGroupId}"
                    data-index="${index}"
                    data-url="${img.url}"
                    data-title="${img.title || ''}"
                  />
                  ${img.title ? `<div class="attachment-caption">${this.escapeHtml(img.title)}</div>` : ''}
                </div>
              `).join('')}
            </div>
          `;
        }
        
        // Render YouTube videos
        if (youtubeAttachments.length > 0) {
          attachmentsHtml += `
            <div class="message-youtube-container">
              ${youtubeAttachments.map((yt, index) => {
                // Extract video ID from URL
                const videoIdMatch = yt.url.match(/(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                const videoId = videoIdMatch ? videoIdMatch[1] : '';
                
                if (!videoId) return '';
                
                const thumbnailUrl = yt.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                
                return `
                  <div class="youtube-item">
                    <div class="youtube-preview lightbox-trigger" 
                      data-type="youtube"
                      data-group="${attachmentGroupId}"
                      data-index="${index}"
                      data-video-id="${videoId}"
                      data-url="${yt.url}"
                      data-title="${yt.title || ''}"
                    >
                      <img src="${thumbnailUrl}" alt="YouTube Thumbnail" />
                      <div class="play-button-overlay">
                        <svg viewBox="0 0 24 24" width="64" height="64">
                          <path fill="#fff" d="M8 5v14l11-7z"/>
                          <circle cx="12" cy="12" r="10" stroke="#fff" stroke-width="2" fill="none"/>
                        </svg>
                      </div>
                    </div>
                    ${yt.title ? `<div class="attachment-caption">${this.escapeHtml(yt.title)}</div>` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          `;
        }
        
        // Render video files
        if (videoAttachments.length > 0) {
          attachmentsHtml += `
            <div class="message-videos">
              ${videoAttachments.map((video, index) => `
                <div class="video-item">
                  <div class="video-preview lightbox-trigger"
                    data-type="video"
                    data-group="${attachmentGroupId}"
                    data-index="${index}"
                    data-url="${video.url}"
                    data-title="${video.title || ''}"
                  >
                    <video src="${video.url}" preload="metadata"></video>
                    <div class="play-button-overlay">
                      <svg viewBox="0 0 24 24" width="64" height="64">
                        <path fill="#fff" d="M8 5v14l11-7z"/>
                        <circle cx="12" cy="12" r="10" stroke="#fff" stroke-width="2" fill="none"/>
                      </svg>
                    </div>
                  </div>
                  ${video.title ? `<div class="attachment-caption">${this.escapeHtml(video.title)}</div>` : ''}
                </div>
              `).join('')}
            </div>
          `;
        }
        
        // Render documents and files
        if (documentAttachments.length > 0) {
          attachmentsHtml += `
            <div class="message-documents">
              ${documentAttachments.map((doc, index) => {
                // Try to determine document type icon based on file extension or mime type
                let iconType = 'document';
                if (doc.mimeType?.includes('pdf')) {
                  iconType = 'pdf';
                } else if (doc.mimeType?.includes('spreadsheet') || doc.url.match(/\.(xlsx?|csv)$/i)) {
                  iconType = 'spreadsheet';
                } else if (doc.mimeType?.includes('presentation') || doc.url.match(/\.(pptx?)$/i)) {
                  iconType = 'presentation';
                }
                
                return `
                  <div class="document-item ${iconType}-item">
                    <a href="${doc.url}" target="_blank" class="document-link lightbox-trigger"
                      data-type="document"
                      data-group="${attachmentGroupId}"
                      data-index="${index}"
                      data-url="${doc.url}"
                      data-title="${doc.title || ''}"
                    >
                      <div class="document-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M13 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V9L13 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                          <path d="M13 2V9H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </div>
                      <div class="document-info">
                        <span class="document-title">${doc.title || doc.url.split('/').pop() || 'Document'}</span>
                        ${doc.mimeType ? `<span class="document-type">${doc.mimeType}</span>` : ''}
                      </div>
                    </a>
                  </div>
                `;
              }).join('')}
            </div>
          `;
        }
        
        // Render links
        if (linkAttachments.length > 0) {
          attachmentsHtml += `
            <div class="message-links">
              ${linkAttachments.map((link, index) => `
                <div class="link-item">
                  <a href="${link.url}" target="_blank" class="link lightbox-trigger"
                    data-type="link"
                    data-group="${attachmentGroupId}"
                    data-index="${index}"
                    data-url="${link.url}"
                    data-title="${link.title || ''}"
                  >
                    <span class="link-icon">🔗</span>
                    <span class="link-title">${link.title || link.url}</span>
                  </a>
                </div>
              `).join('')}
            </div>
          `;
        }
        
        contentHtml = `
          <div class="message-text">${this.processMessageText(message.content)}</div>
          <div class="message-attachments">${attachmentsHtml}</div>
        `;
      } 
      // If content is an object (for legacy support), just stringify it
      else if (typeof message.content === 'object') {
        contentHtml = `<div class="message-text">${this.processMessageText(JSON.stringify(message.content))}</div>`;
      }
      
      // Check for dataRequest to render a form
      if (message.dataRequest) {
        const dataRequestHtml = `
          <div class="message-data-request">
            <button class="data-request-button" data-message-id="${message.id}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11 4H4V11H11V4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M20 4H13V11H20V4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M20 13H13V20H20V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M11 13H4V20H11V13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Provide Information</span>
            </button>
          </div>
        `;
        
        // Add data request form to content
        contentHtml += dataRequestHtml;
        
        // Set up a handler for the form button
        setTimeout(() => {
          const button = document.querySelector(`.data-request-button[data-message-id="${message.id}"]`);
          if (button) {
            button.addEventListener('click', () => {
              this.handleDataRequestClick(message);
            });
          }
        }, 0);
      }
    }

    // Actions
    let actionsHtml = '';
    if (this.options.enableReactions) {
      actionsHtml += `
        <button class="message-action message-reaction" hx-post="/api/message/react" hx-trigger="click" hx-vals='{"messageId": "${message.id}", "reaction": "👍"}' hx-swap="none">
          👍
        </button>
      `;
    }

    if (this.options.enableReplies) {
      actionsHtml += `
        <button class="message-action message-reply" hx-post="/api/message/reply" hx-trigger="click" hx-vals='{"messageId": "${message.id}"}' hx-swap="none">
          Reply
        </button>
      `;
    }

    // Render reply reference (skipped for now since replyToId is no longer in schema)
    let replyHtml = '';

    // Add special classes for different user types
    let senderDisplayName = sender.displayName || 'User';
    if (sender.id.toLowerCase().includes('system')) {
      messageClasses += ' chat-message-system';
    } else if (sender.id.toLowerCase().includes('manager') || sender.id.toLowerCase().includes('pm')) {
      messageClasses += ' chat-message-pm';
    } else if (sender.isAgent || (this.options.agentIds && this.options.agentIds.includes(sender.id))) {
      messageClasses += ' chat-message-agent';
    }

    // Handle @username mention in sender display
    if (sender.id.startsWith('@')) {
      senderDisplayName = sender.id;
    }

    // Combine all parts
    return `
      <div class="${messageClasses}" id="msg-${message.id}" data-message-id="${message.id}">
        <div class="message-avatar">
          ${this.renderAvatar(sender)}
        </div>
        <div class="message-content">
          <div class="message-header">
            <span class="message-sender">${this.escapeHtml(senderDisplayName)}</span>
            <span class="message-time">${this.formatISODate(message.createdAt)}</span>
          </div>
          ${replyHtml}
          ${contentHtml}
          <div class="message-actions">
            ${actionsHtml}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render user avatar
   * @param user User to render avatar for
   * @returns HTML string for avatar
   */
  private renderAvatar(user: User): string {
    if (user.photoURL) {
      return `<img src="${user.photoURL}" alt="${user.displayName || 'User'}" class="avatar-img" />`;
    }

    // Generate initials for avatar
    const initials = user.displayName
      ? user.displayName
          .split(' ')
          .map(n => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase()
      : user.id.substring(0, 2).toUpperCase();

    // Check if this is a system user (id contains 'system')
    if (user.id.toLowerCase().includes('system')) {
      return `
        <div class="avatar-initials" style="background-color: #ef4444;">
          ${initials}
        </div>
      `;
    }
    
    // Check if this is an agent
    if (user.isAgent || (this.options.agentIds && this.options.agentIds.includes(user.id))) {
      return `
        <div class="avatar-initials" style="background-color: var(--success-color);">
          ${initials}
        </div>
      `;
    }

    // Generate a deterministic color based on user ID for regular users
    const hash = Array.from(user.id).reduce(
      (acc, char) => char.charCodeAt(0) + acc,
      0
    );
    const hue = hash % 360;
    const bgColor = `hsl(${hue}, 65%, 55%)`;

    return `
      <div class="avatar-initials" style="background-color: ${bgColor};">
        ${initials}
      </div>
    `;
  }

  /**
   * Format timestamp to a readable time
   * @param timestamp Timestamp in milliseconds
   * @returns Formatted time string
   */
  private formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  /**
   * Format ISO date string to a readable time
   * @param isoDate ISO date string
   * @returns Formatted time string
   */
  private formatISODate(isoDate: string): string {
    if (!isoDate) return '';
    
    try {
      const date = new Date(isoDate);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      console.error('Error parsing ISO date:', e);
      return '';
    }
  }

  /**
   * Escape HTML to prevent XSS
   * @param html HTML string to escape
   * @returns Escaped string
   */
  private escapeHtml(html: string): string {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }

  /**
   * Process message text to handle special formatting like mentions
   * @param text Message text to process
   * @returns Processed HTML string
   */
  private processMessageText(text: string): string {
    // First escape HTML to prevent XSS
    let processed = this.escapeHtml(text);
    
    // Handle user mentions (@username)
    processed = processed.replace(/@([\w-]+)/g, '<span class="user-mention">@$1</span>');
    
    return processed;
  }

  /**
   * Handle message form submission
   * @param event Form submit event
   */
  private handleSubmit = async (event: Event): Promise<void> => {
    event.preventDefault();

    const input = document.getElementById(
      `${this.options.containerId}-input`
    ) as HTMLInputElement;
    if (!input || !input.value.trim()) return;

    const messageText = input.value.trim();
    input.value = '';

    await this.sendTextMessage(messageText);
  };

  /**
   * Send a text message
   * @param text Message text
   */
  private async sendTextMessage(text: string): Promise<void> {
    // Use the centralized createMessage function
    const message = createMessage({
      senderId: this.options.currentUser.id,
      content: text,
      recipientIds: [], // Ensure we provide an empty array instead of undefined
      fromAiAgent: false, // Set explicitly
      toAiAgent: false, // Set explicitly
    });

    await sendMessage(this.options.firebasePath, message);
  }

  /**
   * Handle file upload
   * @param event File input change event
   */
  private handleFileUpload = async (event: Event): Promise<void> => {
    const fileInput = event.target as HTMLInputElement;
    if (!fileInput.files || fileInput.files.length === 0) return;

    const file = fileInput.files[0];
    const filePath = `${this.options.firebasePath}/files/${Date.now()}_${file.name}`;

    try {
      // Show loading indicator
      const loadingId = this.showLoadingMessage();

      // Upload file
      const fileUrl = await uploadFile(filePath, file);

      // Determine attachment type based on file type
      let attachmentType = 'file';
      if (file.type.startsWith('image/')) {
        attachmentType = 'image';
      } else if (file.type.startsWith('video/')) {
        attachmentType = 'video';
      } else if (file.type.startsWith('audio/')) {
        attachmentType = 'audio';
      } else if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i.test(file.name)) {
        attachmentType = 'document';
      }

      // Create message with attachment using the centralized createMessage function
      const message = createMessage({
        senderId: this.options.currentUser.id,
        content: `Uploaded ${file.name}`, // Simple text content
        recipientIds: [], // Ensure we provide an empty array instead of undefined
        fromAiAgent: false, // Set explicitly
        toAiAgent: false, // Set explicitly
        attachments: [{
          type: attachmentType as any, // Type cast needed until TS is updated
          url: fileUrl,
          title: file.name,
          mimeType: file.type,
          size: file.size
        }]
      });

      // Send message
      await sendMessage(this.options.firebasePath, message);

      // Remove loading message
      this.removeLoadingMessage(loadingId);

      // Reset file input
      fileInput.value = '';
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    }
  };

  /**
   * Handle data request click to show form
   * @param message Message with data request
   */
  private handleDataRequestClick(message: Message): void {
    if (!message.dataRequest) return;
    
    // Create modal container if it doesn't exist
    let modal = document.getElementById('data-request-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'data-request-modal';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Provide Information</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div id="data-request-form"></div>
          </div>
          <div class="modal-footer">
            <button class="modal-cancel">Cancel</button>
            <button class="modal-submit">Submit</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      
      // Set up close buttons
      const closeBtn = modal.querySelector('.modal-close');
      const cancelBtn = modal.querySelector('.modal-cancel');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeModal(modal));
      }
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => this.closeModal(modal));
      }
    }
    
    // Show the modal
    modal.classList.add('visible');
    
    // Generate form in the modal
    const formContainer = document.getElementById('data-request-form');
    if (formContainer) {
      formContainer.innerHTML = '';
      
      // Parse data request as a Zod schema if it's a string
      const schemaData = typeof message.dataRequest === 'string' 
        ? message.dataRequest 
        : JSON.stringify(message.dataRequest);
      
      // Generate form based on schema
      try {
        generateForm(formContainer, schemaData, (formData) => {
          this.handleDataRequestSubmit(message.id || '', formData);
          this.closeModal(modal);
        });
        
        // Set up submit button
        const submitBtn = modal.querySelector('.modal-submit');
        if (submitBtn) {
          submitBtn.addEventListener('click', () => {
            const form = formContainer.querySelector('form');
            if (form) {
              form.dispatchEvent(new Event('submit'));
            }
          });
        }
      } catch (error) {
        console.error('Error generating form:', error);
        formContainer.innerHTML = '<div class="error">Error generating form. The data request format may be invalid.</div>';
      }
    }
  }
  
  /**
   * Close modal
   * @param modal Modal element
   */
  private closeModal(modal: HTMLElement | null): void {
    if (modal) {
      modal.classList.remove('visible');
    }
  }
  
  /**
   * Handle form submission from data request
   * @param messageId ID of the message containing the data request
   * @param formData Form data
   */
  private async handleDataRequestSubmit(
    messageId: string,
    formData: any
  ): Promise<void> {
    try {
      // Create response message with form data using the centralized createMessage function
      const responseMessage = createMessage({
        senderId: this.options.currentUser.id,
        content: 'Form submitted', // Simple text content
        recipientIds: [], // Ensure we provide an empty array instead of undefined
        fromAiAgent: false, // Set explicitly
        toAiAgent: false, // Set explicitly
        dataRequest: {
          formId: messageId,
          values: formData
        }
      });

      // Send response
      await sendMessage(this.options.firebasePath, responseMessage);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to submit form. Please try again.');
    }
  }
  
  /**
   * Handle legacy form submission
   * @param messageId ID of the message containing the form
   * @param formData Form data
   * @deprecated Use handleDataRequestSubmit instead
   */
  private async handleFormSubmit(
    messageId: string,
    formData: any
  ): Promise<void> {
    return this.handleDataRequestSubmit(messageId, formData);
  }

  /**
   * Show a loading message while uploading
   * @returns Loading message ID
   */
  private showLoadingMessage(): string {
    const loadingId = `loading-${Date.now()}`;
    const messagesContainer = document.getElementById(
      `${this.options.containerId}-messages`
    );

    if (messagesContainer) {
      const loadingHtml = `
        <div class="chat-message chat-message-self" id="${loadingId}">
          <div class="message-avatar">
            ${this.renderAvatar(this.options.currentUser)}
          </div>
          <div class="message-content">
            <div class="message-header">
              <span class="message-sender">${this.escapeHtml(this.options.currentUser.displayName || 'You')}</span>
              <span class="message-time">${this.formatTimestamp(Date.now())}</span>
            </div>
            <div class="message-text loading">Uploading...</div>
          </div>
        </div>
      `;

      messagesContainer.insertAdjacentHTML('beforeend', loadingHtml);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    return loadingId;
  }

  /**
   * Remove a loading message
   * @param loadingId Loading message ID
   */
  private removeLoadingMessage(loadingId: string): void {
    const loadingElement = document.getElementById(loadingId);
    loadingElement?.remove();
  }

  /**
   * Clean up event listeners and subscriptions
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    const form = document.getElementById(`${this.options.containerId}-form`);
    form?.removeEventListener('submit', this.handleSubmit);

    const fileInput = document.getElementById(
      `${this.options.containerId}-file`
    );
    fileInput?.removeEventListener('change', this.handleFileUpload);

    this.isInitialized = false;
  }

  /**
   * Get current messages
   * @returns Array of messages
   */
  getMessages(): Message[] {
    return [...this.messages];
  }
  
  /**
   * Add a system notification message to the chat
   * @param text Notification text
   */
  addNotification(text: string): void {
    const messagesContainer = document.getElementById(
      `${this.options.containerId}-messages`
    );
    
    if (messagesContainer) {
      const notificationHtml = `
        <div class="message-notification">
          <div class="message-notification-content">
            ${this.escapeHtml(text)}
          </div>
        </div>
      `;
      
      messagesContainer.insertAdjacentHTML('beforeend', notificationHtml);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  /**
   * Send a custom message with optional attachments or data request
   * @param content Text content or attachment object
   * @param options Optional parameters (attachments, dataRequest)
   * @returns Promise with message ID
   */
  async sendCustomMessage(
    content: string | { url: string; type: string; title?: string },
    options?: {
      attachments?: MessageAttachment[];
      dataRequest?: string | object;
    }
  ): Promise<string> {
    // Create message using the centralized createMessage function
    const message = createMessage({
      senderId: this.options.currentUser.id,
      content: typeof content === 'string' ? content : 'Shared attachment',
      recipientIds: [], // Ensure we provide an empty array instead of undefined
      fromAiAgent: false, // Set explicitly
      toAiAgent: false, // Set explicitly
    });

    // Add attachments from options
    if (options?.attachments) {
      message.attachments = options.attachments;
    } 
    // Or convert single attachment object to array
    else if (typeof content === 'object' && content.url) {
      message.attachments = [{
        type: content.type as any, // Type cast until TS is updated
        url: content.url,
        title: content.title
      }];
    }

    // Add data request if provided
    if (options?.dataRequest) {
      message.dataRequest = options.dataRequest;
    }

    return sendMessage(this.options.firebasePath, message);
  }
}
