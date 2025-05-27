/**
 * Enhanced client-side script for chat interactions
 * Provides a Discord/Slack-like experience with infinite scrolling
 */

// Global variables
let eventSource = null;
let isLoadingMore = false;
let currentPage = 0;
let scrollThreshold = 50; // px from top to trigger load more

// Handle message submission if not using HTMX
document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.message-form form');
  const chatPath = form.querySelector('input[name="chatPath"]').value;

  // Register a custom event handler to clear the input field
  document.body.addEventListener('htmx:afterRequest', function (event) {
    // Check if we need to clear input (from HX-Trigger header)
    if (event.detail.triggerSpec && event.detail.triggerSpec.clearInput) {
      const messageInput = document.querySelector('#message-input');
      if (messageInput) {
        messageInput.value = '';
        messageInput.focus();
      }
    }
  });

  // Add event listener for HTMX before request to log the payload
  document.body.addEventListener('htmx:beforeRequest', function (event) {
    // Only intercept requests from the message form
    if (event.detail.elt.id === 'message-form') {
      const formData = event.detail.parameters;
      console.log('Sending message via HTMX:', formData);
    }
  });
  
  // Add direct form submission handler for message form
  const messageForm = document.querySelector('#message-form');
  if (messageForm) {
    messageForm.addEventListener('submit', async (e) => {
      e.preventDefault(); // Prevent default form submission
      
      const messageInput = messageForm.querySelector('#message-input');
      const chatPath = messageForm.querySelector('input[name="chatPath"]').value;
      const userId = messageForm.querySelector('input[name="userId"]').value;
      const message = messageInput.value.trim();
      
      if (!message) return;
      
      console.log('Sending message via direct form handler:', { message, chatPath, userId });
      
      try {
        // Send the message to the server
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message,
            chatPath,
            userId
          })
        });
        
        if (response.ok) {
          // Clear the input
          messageInput.value = '';
          messageInput.focus();
          
          // Force a complete refresh of the messages container
          const messagesContainer = document.getElementById('chat-messages');
          if (messagesContainer && messagesContainer.hasAttribute('hx-get')) {
            // Add timestamp to prevent caching
            const hxGetUrl = messagesContainer.getAttribute('hx-get');
            const urlWithTimestamp = `${hxGetUrl}${hxGetUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`;
            
            console.log('Refreshing messages after send with URL:', urlWithTimestamp);
            
            // Use HTMX to refresh the messages
            htmx.ajax('GET', urlWithTimestamp, {
              target: '#chat-messages',
              swap: 'innerHTML'
            });
          }
        } else {
          console.error('Error sending message:', await response.text());
        }
      } catch (error) {
        console.error('Error sending message:', error);
      }
    });
  }

  // Set up click handler for reset button
  const resetButton = document.getElementById('reset-chat');
  if (resetButton) {
    resetButton.addEventListener('click', async () => {
      // Confirm before resetting
      if (
        window.confirm(
          'Are you sure you want to clear all messages in this chat? This cannot be undone.'
        )
      ) {
        try {
          console.log('Initiating chat reset...');
          resetButton.disabled = true;
          resetButton.classList.add('resetting');

          const response = await fetch('/api/chat/reset', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ chatPath }),
          });

          if (response.ok) {
            console.log('Chat reset successfully');

            // Force refresh the messages container more aggressively
            const messagesContainer = document.getElementById('chat-messages');
            if (messagesContainer && messagesContainer.hasAttribute('hx-get')) {
              // Method 1: Direct HTMX AJAX call with timestamp to bypass cache
              console.log('Forcing refresh with direct HTMX call');
              const hxGetUrl = messagesContainer.getAttribute('hx-get');
              if (hxGetUrl) {
                const urlWithTimestamp = `${hxGetUrl}${hxGetUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`;
                console.log('Refreshing messages with URL:', urlWithTimestamp);
                
                htmx.ajax('GET', urlWithTimestamp, {
                  target: '#chat-messages',
                  swap: 'innerHTML',
                });
              }
              
              // Method 2: Dispatch event (backup approach)
              console.log('Also dispatching refreshMessages event');
              const triggerEvent = new Event('refreshMessages', { bubbles: true });
              messagesContainer.dispatchEvent(triggerEvent);
              
              // Method 3: Set a timeout and try again in case the first attempt fails
              setTimeout(() => {
                console.log('Delayed refresh attempt after reset');
                if (hxGetUrl) {
                  const urlWithTimestamp = `${hxGetUrl}${hxGetUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`;
                  htmx.ajax('GET', urlWithTimestamp, {
                    target: '#chat-messages',
                    swap: 'innerHTML',
                  });
                }
                // Also scroll to bottom
                scrollToBottom();
              }, 500);
            }
          } else {
            const errorData = await response.json();
            console.error('Error resetting chat:', errorData);
            alert(
              `Failed to reset chat: ${errorData.error || 'Unknown error'}`
            );
          }
        } catch (error) {
          console.error('Exception during chat reset:', error);
          alert('Failed to reset chat due to a network or server error.');
        } finally {
          resetButton.disabled = false;
          resetButton.classList.remove('resetting');
        }
      }
    });
  }

  // If HTMX is not handling the form
  if (!form.hasAttribute('hx-post')) {
    form.addEventListener('submit', async e => {
      e.preventDefault();

      const messageInput = form.querySelector('input[name="message"]');
      const message = messageInput.value.trim();
      const userId = form.querySelector('input[name="userId"]').value;

      if (message) {
        try {
          const payload = {
            chatPath,
            userId,
            message,
          };

          console.log('Sending message via direct fetch:', payload);

          const response = await fetch('/api/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            // Clear input field
            messageInput.value = '';
            messageInput.focus();
          }
        } catch (error) {
          console.error('Error sending message:', error);
        }
      }
    });
  }

  // Make sure messages container scrolls to bottom when new messages arrive
  const messagesContainer = document.getElementById('chat-messages');
  const scrollToBottom = () => {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      console.log('Manually scrolled to bottom, height:', messagesContainer.scrollHeight);
    }
  };

  // Set up a more robust observer for messages container changes
  const observer = new MutationObserver((mutations) => {
    // Filter out attribute mutations to avoid infinite loops
    const hasContentChanges = mutations.some(mutation => 
      mutation.type === 'childList' || 
      mutation.type === 'characterData' ||
      (mutation.type === 'attributes' && mutation.attributeName !== 'style' && mutation.attributeName !== 'class')
    );
    
    // Only log if there are actual content changes
    if (hasContentChanges) {
      console.log(`Mutation observer detected ${mutations.length} changes:`);
      mutations.forEach((mutation, idx) => {
        if (idx < 3) { // Limit logging to first few mutations
          console.log(`- Mutation ${idx+1}: ${mutation.type}, added nodes: ${mutation.addedNodes.length}`);
        }
      });
      
      // Delayed scroll to bottom to ensure rendering is complete, but only for content changes
      setTimeout(scrollToBottom, 100);
    }
  });
  
  // Only observe childList changes and subtree to avoid infinite loops with attribute changes
  observer.observe(messagesContainer, { childList: true, subtree: true, characterData: true });

  // Set up Server-Sent Events for real-time updates
  connectToSSE(chatPath);

  // Initial scroll to bottom
  scrollToBottom();

  // Set up the typing indicator
  setupTypingIndicator();

  // Set up media handlers for YouTube and images
  setupMediaHandlers();

  // Set up demo panel functionality
  setupDemoPanel(chatPath);

  // Set up quick action buttons
  setupQuickActions();

  // Set up media button
  setupMediaButton();

  // Add scroll handler to window object so it can be accessed from HTML
  window.handleScroll = handleMessagesScroll;
});

/**
 * Connect to Server-Sent Events for real-time updates
 * @param {string} chatPath - The chat path to listen to
 */
function connectToSSE(chatPath) {
  // Close existing connection if any
  if (eventSource) {
    eventSource.close();
  }

  // Connect to SSE endpoint
  eventSource = new EventSource(
    `/api/chat-events?chatPath=${encodeURIComponent(chatPath)}`
  );

  // Handle incoming messages
  eventSource.addEventListener('message', event => {
    try {
      console.log('Received SSE event:', event.data.substring(0, 100) + '...');
      const data = JSON.parse(event.data);

      if (data.type === 'messages' && data.messages) {
        console.log('Received new messages via SSE:', data.messages.length);
        console.log('Message IDs:', data.messages.map(msg => msg.id).join(', '));

        // ALWAYS force a complete refresh for reliability
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
          console.log('Forcing complete refresh of messages container');
          
          if (messagesContainer.hasAttribute('hx-get')) {
            // Use both methods to ensure refresh happens
            
            // Method 1: Directly trigger HTMX GET (more reliable)
            const hxGetUrl = messagesContainer.getAttribute('hx-get');
            if (hxGetUrl) {
              console.log('Triggering direct HTMX GET', hxGetUrl);
              // Add a timestamp parameter to force a fresh request
              const urlWithTimestamp = hxGetUrl.includes('?') 
                ? `${hxGetUrl}&_t=${Date.now()}` 
                : `${hxGetUrl}?_t=${Date.now()}`;
              console.log('URL with timestamp:', urlWithTimestamp);
              
              htmx.ajax('GET', urlWithTimestamp, {
                target: '#chat-messages',
                swap: 'innerHTML',
              });
            }
            
            // Method 2: Dispatch event (backup approach)
            console.log('Also dispatching refreshMessages event');
            const triggerEvent = new Event('refreshMessages', { bubbles: true });
            messagesContainer.dispatchEvent(triggerEvent);
          } else {
            // Fall back to client-side rendering
            console.log('Using client-side rendering fallback');
            renderMessages(data.messages);
          }
          
          // Ensure we scroll to the bottom after update
          setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            console.log('Scrolled to bottom after update');
          }, 200);
        } else {
          console.error('Cannot find messages container to update');
        }
      }
    } catch (error) {
      console.error('Error handling SSE message:', error);
      console.error('Raw event data:', event.data);
    }
  });

  // Handle connection open
  eventSource.addEventListener('open', () => {
    console.log('SSE connection established');
  });

  // Handle errors
  eventSource.addEventListener('error', error => {
    console.error('SSE connection error:', error);

    // Attempt to reconnect after a delay
    setTimeout(() => {
      connectToSSE(chatPath);
    }, 5000);
  });

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    if (eventSource) {
      eventSource.close();
    }
  });
}

/**
 * Fetch messages from the server (fallback if SSE is not available)
 */
async function fetchMessages() {
  try {
    const chatPath = document.querySelector('input[name="chatPath"]').value;

    // Add a timestamp to prevent caching
    const timestamp = Date.now();
    const response = await fetch(
      `/api/messages?chatPath=${encodeURIComponent(chatPath)}&_t=${timestamp}`
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`Fetched ${data.messages ? data.messages.length : 0} messages directly`);

      if (data.messages && data.messages.length > 0) {
        renderMessages(data.messages);
        
        // Make sure we scroll to bottom after rendering
        setTimeout(() => {
          const messagesContainer = document.getElementById('chat-messages');
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        }, 100);
      } else {
        console.log('No messages returned from direct fetch');
      }
    }
  } catch (error) {
    console.error('Error fetching messages:', error);
  }
}

/**
 * Render messages in the chat container
 * @param {Array} messages - Array of message objects
 */
function renderMessages(messages) {
  const messagesContainer = document.getElementById('chat-messages');

  // If HTMX is handling the rendering, we don't need to do anything
  if (messagesContainer.hasAttribute('hx-get')) {
    return;
  }

  // Otherwise manually render messages
  const userId = document.querySelector('input[name="userId"]').value;

  // Sort messages by createdAt timestamp
  const sortedMessages = [...messages].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB;
  });

  messagesContainer.innerHTML = sortedMessages
    .map(message => {
      const isCurrentUser = message.senderId === userId;

      // Prepare attachments HTML if available
      let attachmentsHtml = '';
      if (message.attachments && message.attachments.length > 0) {
        attachmentsHtml = message.attachments
          .map(attachment => {
            if (attachment.type === 'image') {
              return `
            <div class="attachment-content image-embed">
              <div class="single-image">
                <img src="${attachment.url}" alt="${attachment.title || 'Image'}" class="lightbox-image">
              </div>
            </div>
          `;
            } else if (attachment.type === 'youtube') {
              // Extract videoId from URL if possible
              const videoIdMatch = attachment.url.match(
                /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
              );
              const videoId = videoIdMatch ? videoIdMatch[1] : '';

              if (!videoId) return '';

              return `
            <div class="attachment-content youtube-embed">
              <div class="youtube-preview" data-video-id="${videoId}">
                <img src="${attachment.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}" alt="YouTube video thumbnail">
                <div class="youtube-play-button">
                  <svg viewBox="0 0 24 24" width="48" height="48">
                    <path fill="#fff" d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
            </div>
          `;
            } else if (attachment.type === 'audio') {
              return `
            <div class="attachment-content audio-embed">
              <div class="audio-player">
                <audio controls>
                  <source src="${attachment.url}" type="${attachment.mimeType || 'audio/mpeg'}">
                  Your browser does not support the audio element.
                </audio>
              </div>
            </div>
          `;
            } else if (attachment.type === 'video') {
              return `
            <div class="attachment-content video-embed">
              <video controls>
                <source src="${attachment.url}" type="${attachment.mimeType || 'video/mp4'}">
                Your browser does not support the video element.
              </video>
            </div>
          `;
            } else if (
              attachment.type === 'document' ||
              attachment.type === 'file'
            ) {
              return `
            <div class="attachment-content document-embed">
              <a href="${attachment.url}" target="_blank" class="document-link">
                <div class="document-info">
                  <span class="document-icon">📄</span>
                  <span class="document-title">${attachment.title || 'Document'}</span>
                </div>
              </a>
            </div>
          `;
            } else if (attachment.type === 'link') {
              return `
            <div class="attachment-content link-embed">
              <a href="${attachment.url}" target="_blank" class="link-url">
                <span class="link-icon">🔗</span>
                <span class="link-title">${attachment.title || attachment.url}</span>
              </a>
            </div>
          `;
            } else {
              return '';
            }
          })
          .join('');
      }

      // Prepare data request HTML if available
      let dataRequestHtml = '';
      if (message.dataRequest) {
        const dataRequestJson =
          typeof message.dataRequest === 'string'
            ? message.dataRequest
            : JSON.stringify(message.dataRequest);

        dataRequestHtml = `
        <div class="attachment-content schema-embed">
          <button class="schema-action-button" data-schema='${dataRequestJson}'>
            <span>Provide Information</span>
          </button>
        </div>
      `;
      }

      return `
      <div class="chat-message ${isCurrentUser ? 'chat-message-self' : ''}" id="msg-${message.id}">
        <div class="message-content">
          <div class="message-header">
            <span class="message-sender">${message.senderName || 'User'}</span>
            <span class="message-time">${formatTime(message.createdAt)}</span>
          </div>
          <div class="message-text">${typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}</div>
          ${attachmentsHtml}
          ${dataRequestHtml}
        </div>
      </div>
    `;
    })
    .join('');

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Handles scrolling in the messages container
 * Loads more messages when scrolled to the top
 * @param {Event} event - The scroll event
 */
function handleMessagesScroll(event) {
  const messagesContainer = document.getElementById('chat-messages');

  // Add scrolled class to show top gradient when scrolled
  if (messagesContainer.scrollTop > 50) {
    messagesContainer.classList.add('scrolled');
  } else {
    messagesContainer.classList.remove('scrolled');
  }

  // Check if we need to load more messages
  if (messagesContainer.scrollTop < scrollThreshold && !isLoadingMore) {
    // Check if there's a load more button
    const loadMoreBtn = messagesContainer.querySelector('.load-more button');
    if (loadMoreBtn) {
      isLoadingMore = true;

      // Store the current scroll height
      const currentHeight = messagesContainer.scrollHeight;

      // No loading placeholder needed

      // Click the load more button
      loadMoreBtn.click();

      // Remove the load more button's container
      loadMoreBtn.parentElement.remove();

      // After loading, maintain the scroll position
      setTimeout(() => {
        const newHeight = messagesContainer.scrollHeight;
        messagesContainer.scrollTop = newHeight - currentHeight + 50;

        // No placeholder to remove

        isLoadingMore = false;
        currentPage++;
      }, 500);
    }
  }
}

/**
 * Sets up the typing indicator with a random appearance
 */
function setupTypingIndicator() {
  const typingIndicator = document.querySelector('.typing-indicator');
  if (!typingIndicator) return;

  // Randomly show typing indicator
  setInterval(() => {
    const shouldShow = Math.random() > 0.8; // 20% chance to show

    if (shouldShow) {
      typingIndicator.classList.add('visible');

      // Hide after a random time
      setTimeout(
        () => {
          typingIndicator.classList.remove('visible');
        },
        2000 + Math.random() * 3000
      );
    }
  }, 10000); // Check every 10 seconds
}

/**
 * Format timestamp to a readable time
 * @param {number|string} timestamp - Unix timestamp in milliseconds or ISO date string
 * @returns {string} Formatted time string
 */
function formatTime(timestamp) {
  if (!timestamp) return '';

  const date = new Date(timestamp);

  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Sets up handlers for media content like YouTube videos and images
 */
/**
 * Setup PhotoSwipe for images and video attachments
 */
function setupMediaHandlers() {
  // Import PhotoSwipe dynamically (it's loaded as an ES module)
  let PhotoSwipe;
  let pswpContainer = null;

  // Initialize PhotoSwipe when needed
  async function initPhotoSwipe() {
    if (!PhotoSwipe) {
      try {
        // Import PhotoSwipe (this works because we've included it in the page)
        PhotoSwipe = (
          await import(
            'https://cdn.jsdelivr.net/npm/photoswipe@5.3.7/dist/photoswipe.esm.min.js'
          )
        ).default;
        console.log('PhotoSwipe loaded');

        // Create the PhotoSwipe container if it doesn't exist
        if (!pswpContainer) {
          pswpContainer = document.createElement('div');
          pswpContainer.className = 'pswp';
          pswpContainer.tabIndex = -1;
          pswpContainer.role = 'dialog';
          pswpContainer.setAttribute('aria-hidden', 'true');

          // PhotoSwipe UI structure
          pswpContainer.innerHTML = `
            <div class="pswp__bg"></div>
            <div class="pswp__scroll-wrap">
              <div class="pswp__container">
                <div class="pswp__item"></div>
                <div class="pswp__item"></div>
                <div class="pswp__item"></div>
              </div>
              <div class="pswp__ui pswp__ui--hidden">
                <div class="pswp__top-bar">
                  <div class="pswp__counter"></div>
                  <button class="pswp__button pswp__button--close" title="Close (Esc)"></button>
                  <button class="pswp__button pswp__button--share" title="Share"></button>
                  <button class="pswp__button pswp__button--fs" title="Toggle fullscreen"></button>
                  <button class="pswp__button pswp__button--zoom" title="Zoom in/out"></button>
                  <div class="pswp__preloader">
                    <div class="pswp__preloader__icn">
                      <div class="pswp__preloader__cut">
                        <div class="pswp__preloader__donut"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="pswp__share-modal pswp__share-modal--hidden pswp__single-tap">
                  <div class="pswp__share-tooltip"></div>
                </div>
                <button class="pswp__button pswp__button--arrow--left" title="Previous (arrow left)"></button>
                <button class="pswp__button pswp__button--arrow--right" title="Next (arrow right)"></button>
                <div class="pswp__caption">
                  <div class="pswp__caption__center"></div>
                </div>
              </div>
            </div>
          `;

          document.body.appendChild(pswpContainer);
        }
      } catch (error) {
        console.error('Error loading PhotoSwipe:', error);
        return false;
      }
    }
    return true;
  }

  // Set up a global event delegation for the chat container
  const chatContainer = document.getElementById('chat-container');

  if (!chatContainer) return;

  // Event delegation for media elements
  chatContainer.addEventListener('click', async e => {
    // Handle lightbox for images
    if (e.target.closest('.lightbox-trigger[data-type="image"]')) {
      e.preventDefault();

      // Make sure PhotoSwipe is initialized
      if (!(await initPhotoSwipe())) {
        console.error('Failed to initialize PhotoSwipe');
        return;
      }

      const trigger = e.target.closest('.lightbox-trigger');
      const groupId = trigger.getAttribute('data-group');

      // Find all images in this group
      const items = Array.from(
        document.querySelectorAll(
          `.lightbox-trigger[data-group="${groupId}"][data-type="image"]`
        )
      ).map(el => {
        // Get natural dimensions if available, or use a placeholder
        const width = el.naturalWidth || 1200;
        const height = el.naturalHeight || 900;

        return {
          src: el.getAttribute('data-url'),
          w: width,
          h: height,
          alt: el.getAttribute('data-title') || '',
          msrc: el.src, // thumbnail
        };
      });

      // Find the index of the clicked image
      const index = parseInt(trigger.getAttribute('data-index')) || 0;

      // Initialize PhotoSwipe
      const options = {
        index: index,
        bgOpacity: 0.9,
        showHideOpacity: true,
        closeOnScroll: false,
        clickToCloseNonZoomable: false,
        modal: false,
        history: false,
        pinchToClose: true,
        errorMsg: 'The image could not be loaded.',
        // Set maximum size
        maxZoomLevel: 2,
        wheelToZoom: true,
        padding: { top: 30, bottom: 30, left: 30, right: 30 },
      };

      // Open PhotoSwipe
      const pswp = new PhotoSwipe({
        dataSource: items,
        options: options,
        pswpModule: PhotoSwipe,
        element: pswpContainer,
      });
      
      // Add event listener to limit size on open
      pswp.on('contentLoad', (e) => {
        const content = e.content;
        if (content.element) {
          // Set max width/height to viewport dimensions minus padding
          const viewportWidth = window.innerWidth - 60; // 30px padding on each side
          const viewportHeight = window.innerHeight - 60; // 30px padding on each side
          
          // Apply max width/height
          const img = content.element.querySelector('img');
          if (img) {
            img.style.maxWidth = `${Math.min(content.width, viewportWidth)}px`;
            img.style.maxHeight = `${Math.min(content.height, viewportHeight)}px`;
            img.style.objectFit = 'contain';
          }
        }
      });

      pswp.init();
    }

    // Handle YouTube videos
    if (e.target.closest('.lightbox-trigger[data-type="youtube"]')) {
      e.preventDefault();

      // Make sure PhotoSwipe is initialized
      if (!(await initPhotoSwipe())) {
        console.error('Failed to initialize PhotoSwipe');
        return;
      }

      const trigger = e.target.closest('.lightbox-trigger');
      const videoId = trigger.getAttribute('data-video-id');

      if (!videoId) return;

      // Create a single item for the YouTube video
      const item = {
        html: `
          <div class="pswp-video-container" style="width:100%;height:100%;display:flex;justify-content:center;align-items:center;">
            <iframe 
              src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
              style="width:90%;max-width:800px;height:auto;max-height:80vh;aspect-ratio:16/9;" 
              frameborder="0" 
              allowfullscreen>
            </iframe>
          </div>
        `,
        w: 800,
        h: 450,
      };

      // Initialize PhotoSwipe
      const options = {
        bgOpacity: 0.9,
        showHideOpacity: true,
        closeOnScroll: false,
        clickToCloseNonZoomable: false,
        modal: false,
        history: false,
      };

      // Open PhotoSwipe
      const pswp = new PhotoSwipe({
        dataSource: [item],
        options: options,
        pswpModule: PhotoSwipe,
        element: pswpContainer,
      });

      pswp.init();
    }

    // Handle videos
    if (e.target.closest('.lightbox-trigger[data-type="video"]')) {
      e.preventDefault();

      // Make sure PhotoSwipe is initialized
      if (!(await initPhotoSwipe())) {
        console.error('Failed to initialize PhotoSwipe');
        return;
      }

      const trigger = e.target.closest('.lightbox-trigger');
      const videoUrl = trigger.getAttribute('data-url');

      if (!videoUrl) return;

      // Create a single item for the video
      const item = {
        html: `
          <div class="pswp-video-container" style="width:100%;height:100%;display:flex;justify-content:center;align-items:center;">
            <video 
              src="${videoUrl}" 
              style="width:90%;max-width:800px;height:auto;max-height:80vh;" 
              controls 
              autoplay>
            </video>
          </div>
        `,
        w: 800,
        h: 450,
      };

      // Initialize PhotoSwipe
      const options = {
        bgOpacity: 0.9,
        showHideOpacity: true,
        closeOnScroll: false,
        clickToCloseNonZoomable: false,
        modal: false,
        history: false,
      };

      // Open PhotoSwipe
      const pswp = new PhotoSwipe({
        dataSource: [item],
        options: options,
        pswpModule: PhotoSwipe,
        element: pswpContainer,
      });

      pswp.init();
    }

    // YouTube video preview clicked for regular embed (not lightbox)
    if (e.target.closest('.youtube-preview')) {
      const preview = e.target.closest('.youtube-preview');
      const videoId = preview.dataset.videoId;

      if (videoId) {
        // Replace the preview with an iframe
        const iframeContainer = document.createElement('div');
        iframeContainer.className = 'youtube-iframe-container';
        iframeContainer.innerHTML = `
          <iframe 
            src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
            title="YouTube video player" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
          </iframe>
        `;

        // Replace the preview with the iframe
        const controls = preview.parentNode.querySelector('.media-controls');
        preview.parentNode.replaceChild(iframeContainer, preview);

        // Update controls if they exist
        if (controls) {
          const expandBtn = controls.querySelector('.expand-video');
          if (expandBtn) {
            expandBtn.textContent = 'Collapse Video';
            expandBtn.classList.remove('expand-video');
            expandBtn.classList.add('collapse-video');
          }
        }
      }
    }

    // Expand video button clicked
    if (e.target.closest('.expand-video')) {
      const button = e.target.closest('.expand-video');
      const videoId = button.dataset.videoId;
      const mediaContent = button.closest('.media-content');

      if (videoId && mediaContent) {
        // Create full-width iframe
        const iframeContainer = document.createElement('div');
        iframeContainer.className = 'youtube-iframe-container';
        iframeContainer.innerHTML = `
          <iframe 
            src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
            title="YouTube video player" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
          </iframe>
        `;

        // Replace preview with iframe
        const preview = mediaContent.querySelector('.youtube-preview');
        if (preview) {
          mediaContent.replaceChild(iframeContainer, preview);
        } else {
          // If no preview, insert before controls
          mediaContent.insertBefore(iframeContainer, mediaContent.firstChild);
        }

        // Update button
        button.textContent = 'Collapse Video';
        button.classList.remove('expand-video');
        button.classList.add('collapse-video');
      }
    }

    // Collapse video button clicked
    if (e.target.closest('.collapse-video')) {
      const button = e.target.closest('.collapse-video');
      const videoId = button.dataset.videoId;
      const mediaContent = button.closest('.media-content');

      if (videoId && mediaContent) {
        // Create preview container again
        const previewContainer = document.createElement('div');
        previewContainer.className = 'youtube-preview';
        previewContainer.dataset.videoId = videoId;
        previewContainer.innerHTML = `
          <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="YouTube video thumbnail">
          <div class="youtube-play-button">
            <svg viewBox="0 0 24 24" width="48" height="48">
              <path fill="#fff" d="M8 5v14l11-7z"/>
            </svg>
          </div>
        `;

        // Replace iframe with preview
        const iframe = mediaContent.querySelector('.youtube-iframe-container');
        if (iframe) {
          mediaContent.replaceChild(previewContainer, iframe);
        }

        // Update button
        button.textContent = 'Expand Video';
        button.classList.remove('collapse-video');
        button.classList.add('expand-video');
      }
    }

    // Schema action button clicked
    if (e.target.closest('.schema-action-button')) {
      const button = e.target.closest('.schema-action-button');
      const schemaData = button.dataset.schema;

      if (schemaData) {
        try {
          const schema = JSON.parse(schemaData);
          // Show form based on Zod schema
          openSchemaForm(schema);
        } catch (error) {
          console.error('Invalid schema data:', error);
        }
      }
    }
  });

  // End of setupMediaHandlers

  /**
   * Opens a form modal based on a Zod schema
   * @param {Object} schema - The Zod schema to generate a form for
   */
  function openSchemaForm(schema) {
    const modal = document.getElementById('schema-modal');
    const modalTitle = modal.querySelector('.modal-title');
    const formContainer = document.getElementById('schema-form');

    // Extract schema title if available
    const title = schema.title || 'Please provide information';
    modalTitle.textContent = title;

    // Generate form HTML
    formContainer.innerHTML = generateFormFromSchema(schema);

    // Set up form submission
    const form = document.createElement('form');
    form.className = 'schema-form';
    form.innerHTML = formContainer.innerHTML;
    formContainer.innerHTML = '';
    formContainer.appendChild(form);

    // Set up event listeners
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = modal.querySelector('.modal-cancel');
    const submitBtn = modal.querySelector('.modal-submit');

    closeBtn.addEventListener('click', () => {
      closeModal(modal);
    });

    cancelBtn.addEventListener('click', () => {
      closeModal(modal);
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      submitSchemaForm(form, schema);
    });

    submitBtn.addEventListener('click', () => {
      form.dispatchEvent(new Event('submit'));
    });

    // Show modal
    modal.classList.add('visible');
  }

  /**
   * Closes a modal
   * @param {HTMLElement} modal - The modal element
   */
  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('visible');

    // If it's the schema modal, clear the form
    if (modal.id === 'schema-modal') {
      const formContainer = document.getElementById('schema-form');
      if (formContainer) {
        formContainer.innerHTML = '';
      }
    }

    // If it's the media modal, clear the inputs
    if (modal.id === 'media-modal') {
      const urlInput = modal.querySelector('#media-url');
      const fileInput = modal.querySelector('#media-file');
      const previewArea = modal.querySelector('.media-preview-content');

      if (urlInput) urlInput.value = '';
      if (fileInput) fileInput.value = '';
      if (previewArea) previewArea.innerHTML = 'No media selected';

      // Reset to URL tab
      const urlTab = modal.querySelector('.media-tab[data-tab="url"]');
      const urlPane = modal.querySelector('#url-tab');
      const tabs = modal.querySelectorAll('.media-tab');
      const panes = modal.querySelectorAll('.tab-pane');

      if (tabs) tabs.forEach(tab => tab.classList.remove('active'));
      if (panes) panes.forEach(pane => pane.classList.remove('active'));
      if (urlTab) urlTab.classList.add('active');
      if (urlPane) urlPane.classList.add('active');
    }
  }

  /**
   * Generates HTML form fields from a Zod schema
   * @param {Object} schema - The schema object
   * @returns {string} HTML for the form
   */
  function generateFormFromSchema(schema) {
    // This is a simplified implementation that handles basic types
    // A full implementation would parse the Zod schema AST
    let formHtml = '';

    // Extract fields from schema
    const fields = extractFieldsFromSchema(schema);

    // Generate HTML for each field
    fields.forEach(field => {
      formHtml += generateFieldHtml(field);
    });

    return formHtml;
  }

  /**
   * Extract fields from a Zod schema
   * @param {Object|string} schema - The schema object or string
   * @returns {Array} Array of field objects
   */
  function extractFieldsFromSchema(schema) {
    // Default demo fields if schema parsing fails
    const demoFields = [
      {
        name: 'name',
        type: 'string',
        label: 'Name',
        required: true,
        placeholder: 'Enter your name',
      },
      {
        name: 'email',
        type: 'email',
        label: 'Email Address',
        required: true,
        placeholder: 'Enter your email',
      },
      {
        name: 'message',
        type: 'textarea',
        label: 'Message',
        required: false,
        placeholder: 'Enter additional information',
      },
    ];

    // Try to extract fields from schema
    try {
      if (typeof schema === 'string') {
        // Enhanced field extraction from schema string with descriptions
        const fields = [];

        // Extract field names from z.object
        const objectMatch = schema.match(/z\.object\(\s*{([^}]+)}\s*\)/);
        if (objectMatch && objectMatch[1]) {
          const objectContent = objectMatch[1];

          // Match field definitions lines like: fieldName: z.string().required()
          const fieldLines = objectContent.split(',\n');

          for (const line of fieldLines) {
            // Skip empty lines
            if (!line.trim()) continue;

            // Extract field name and type
            const fieldMatch = line.match(/\s*(\w+)\s*:\s*z\.(\w+)\(\)/);
            if (!fieldMatch) continue;

            const fieldName = fieldMatch[1];
            const fieldType = fieldMatch[2]; // string, number, boolean, etc.

            // Determine field attributes
            const isRequired = line.includes('.required()');

            // Extract description if available
            const descriptionMatch = line.match(
              /\.describe\(['"]([^'"]+)['"]\)/
            );
            const description = descriptionMatch ? descriptionMatch[1] : null;

            // Extract min/max for number and string
            let min, max;
            if (fieldType === 'number') {
              const minMatch = line.match(/\.min\((\d+)\)/);
              const maxMatch = line.match(/\.max\((\d+)\)/);
              min = minMatch ? parseInt(minMatch[1]) : null;
              max = maxMatch ? parseInt(maxMatch[1]) : null;
            } else if (fieldType === 'string') {
              const minMatch = line.match(/\.min\((\d+)\)/);
              const maxMatch = line.match(/\.max\((\d+)\)/);
              min = minMatch ? parseInt(minMatch[1]) : null;
              max = maxMatch ? parseInt(maxMatch[1]) : null;
            }

            // Map Zod types to HTML input types
            let inputType = 'text';
            switch (fieldType) {
              case 'number':
                inputType = 'number';
                break;
              case 'boolean':
                inputType = 'checkbox';
                break;
              case 'date':
                inputType = 'date';
                break;
              case 'string':
              default:
                inputType = 'text';
                if (line.includes('.email()')) {
                  inputType = 'email';
                } else if (line.includes('.url()')) {
                  inputType = 'url';
                } else if (max && max > 100) {
                  inputType = 'textarea';
                }
            }

            // Create field object
            fields.push({
              name: fieldName,
              type: inputType,
              label:
                description ||
                fieldName.charAt(0).toUpperCase() +
                  fieldName.slice(1).replace(/([A-Z])/g, ' $1'),
              required: isRequired,
              placeholder: `Enter ${description ? description.toLowerCase() : fieldName}`,
              min: min,
              max: max,
            });
          }
        }

        return fields.length > 0 ? fields : demoFields;
      }

      return demoFields;
    } catch (error) {
      console.error('Error parsing schema:', error);
      return demoFields;
    }
  }

  /**
   * Generate HTML for a form field
   * @param {Object} field - Field configuration
   * @returns {string} HTML for the field
   */
  function generateFieldHtml(field) {
    const { name, type, label, required, placeholder, min, max, options } =
      field;

    // Common attributes
    const requiredAttr = required ? 'required' : '';
    const fieldId = `field-${name}`;
    const minAttr = min !== null && min !== undefined ? `min="${min}"` : '';
    const maxAttr = max !== null && max !== undefined ? `max="${max}"` : '';

    // Field HTML based on type
    let fieldHtml = '';

    switch (type) {
      case 'text':
      case 'email':
      case 'url':
      case 'password':
      case 'date':
        fieldHtml = `
          <div class="form-group">
            <label class="form-label" for="${fieldId}">${label}${required ? ' *' : ''}</label>
            <input 
              type="${type}" 
              id="${fieldId}" 
              name="${name}" 
              class="form-input" 
              placeholder="${placeholder || ''}" 
              ${minAttr} 
              ${maxAttr} 
              ${requiredAttr}
            >
            <div class="form-feedback"></div>
          </div>
        `;
        break;

      case 'number':
        fieldHtml = `
          <div class="form-group">
            <label class="form-label" for="${fieldId}">${label}${required ? ' *' : ''}</label>
            <input 
              type="number" 
              id="${fieldId}" 
              name="${name}" 
              class="form-input" 
              placeholder="${placeholder || ''}" 
              ${minAttr} 
              ${maxAttr} 
              ${requiredAttr}
            >
            <div class="form-feedback"></div>
          </div>
        `;
        break;

      case 'checkbox':
        fieldHtml = `
          <div class="form-group checkbox-group">
            <div class="checkbox-container">
              <input 
                type="checkbox" 
                id="${fieldId}" 
                name="${name}" 
                class="form-checkbox" 
                ${requiredAttr}
              >
              <label class="checkbox-label" for="${fieldId}">${label}${required ? ' *' : ''}</label>
            </div>
            <div class="form-feedback"></div>
          </div>
        `;
        break;

      case 'textarea':
        fieldHtml = `
          <div class="form-group">
            <label class="form-label" for="${fieldId}">${label}${required ? ' *' : ''}</label>
            <textarea 
              id="${fieldId}" 
              name="${name}" 
              class="form-input form-textarea" 
              placeholder="${placeholder || ''}" 
              ${minAttr ? `minlength="${min}"` : ''} 
              ${maxAttr ? `maxlength="${max}"` : ''} 
              ${requiredAttr}
            ></textarea>
            <div class="form-feedback"></div>
          </div>
        `;
        break;

      case 'select':
        const optionsHtml = options
          ? options
              .map(opt => `<option value="${opt.value}">${opt.label}</option>`)
              .join('')
          : '';

        fieldHtml = `
          <div class="form-group">
            <label class="form-label" for="${fieldId}">${label}${required ? ' *' : ''}</label>
            <select 
              id="${fieldId}" 
              name="${name}" 
              class="form-input form-select" 
              ${requiredAttr}
            >
              <option value="" disabled selected>Select ${label.toLowerCase()}</option>
              ${optionsHtml}
            </select>
            <div class="form-feedback"></div>
          </div>
        `;
        break;

      default:
        fieldHtml = `
          <div class="form-group">
            <label class="form-label" for="${fieldId}">${label}${required ? ' *' : ''}</label>
            <input 
              type="text" 
              id="${fieldId}" 
              name="${name}" 
              class="form-input" 
              placeholder="${placeholder || ''}" 
              ${requiredAttr}
            >
            <div class="form-feedback"></div>
          </div>
        `;
    }

    return fieldHtml;
  }

  /**
   * Handles form submission
   * @param {HTMLFormElement} form - The form element
   * @param {Object} schema - The schema used to generate the form
   */
  function submitSchemaForm(form, schema) {
    // Get form data
    const formData = new FormData(form);
    const data = {};

    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }

    // In a real app, you would:
    // 1. Validate the data against the schema
    // 2. Upload files to Firebase Storage
    // 3. Save the form data to Firestore
    // 4. Send a message with the form submission results

    // For demo purposes, we'll just log the data and close the modal
    console.log('Form data:', data);

    // Show success feedback
    form.innerHTML += `
      <div class="form-feedback success">
        Form submitted successfully! In a real application, this data would be uploaded to Firebase Storage.
      </div>
    `;

    // Close the modal after a delay
    setTimeout(() => {
      const modal = document.getElementById('schema-modal');
      closeModal(modal);
    }, 2000);
  }
}

/**
 * Sets up the quick action buttons below the input
 */
function setupQuickActions() {
  const quickActions = document.querySelectorAll('.quick-action');
  const form = document.querySelector('.message-form form');
  const chatPath = form
    ? form.querySelector('input[name="chatPath"]').value
    : null;

  if (!quickActions.length || !chatPath) return;

  quickActions.forEach(button => {
    button.addEventListener('click', async () => {
      const message = button.getAttribute('data-message');
      const sender = button.getAttribute('data-sender') || 'user2';

      if (message) {
        try {
          // Add visual feedback
          button.classList.add('active');

          // Create message payload
          const payload = {
            chatPath,
            userId: sender,
            message,
          };

          // Handle fromAiAgent flag
          if (button.hasAttribute('data-from-ai')) {
            payload.fromAiAgent =
              button.getAttribute('data-from-ai') === 'true';
          }

          // Handle recipient IDs
          if (button.hasAttribute('data-recipient')) {
            payload.recipientIds = [button.getAttribute('data-recipient')];
          }

          // Handle attachments
          if (button.hasAttribute('data-attachments')) {
            try {
              const attachments = JSON.parse(
                button.getAttribute('data-attachments')
              );
              payload.attachments = attachments;
            } catch (e) {
              console.error('Error parsing attachments JSON:', e);
            }
          }

          // Handle data request (form schema)
          if (button.hasAttribute('data-data-request')) {
            payload.dataRequest = button.getAttribute('data-data-request');
          }

          // Log the message payload
          console.log(`Sending message from ${sender}:`, payload);

          // Send the message from the specified user
          await fetch('/api/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          // Remove active state after a delay
          setTimeout(() => {
            button.classList.remove('active');
          }, 300);
        } catch (error) {
          console.error('Error sending quick action message:', error);
          button.classList.remove('active');
        }
      }
    });
  });
}

/**
 * Sets up the demo panel for sending example messages from other users
 * @param {string} chatPath - The chat path to use for example messages
 */
function setupDemoPanel(chatPath) {
  const toggleBtn = document.getElementById('toggle-demo-panel');
  const demoPanel = document.getElementById('demo-panel');
  const closeBtn = demoPanel.querySelector('.demo-panel-close');
  const demoButtons = demoPanel.querySelectorAll('.demo-message-btn');

  // Toggle demo panel
  toggleBtn.addEventListener('click', () => {
    demoPanel.classList.toggle('visible');
  });

  // Close demo panel
  closeBtn.addEventListener('click', () => {
    demoPanel.classList.remove('visible');
  });

  // Demo message buttons
  demoButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const sender = button.getAttribute('data-sender');
      const message = button.getAttribute('data-message');

      if (sender && message) {
        try {
          // Determine sender ID based on type
          let senderId;
          switch (sender) {
            case 'agent':
              senderId = 'agent_assistant';
              break;
            case 'system':
              senderId = 'system';
              break;
            case 'user2':
              senderId = 'user2';
              break;
            case 'pm':
              senderId = 'project_manager';
              break;
            default:
              senderId = sender;
          }

          // Create message payload
          const payload = {
            chatPath,
            userId: senderId,
            message,
          };

          // Add fromAiAgent flag for agent messages
          if (sender === 'agent') {
            payload.fromAiAgent = true;
          }

          // Handle attachments
          if (button.hasAttribute('data-attachments')) {
            try {
              const attachments = JSON.parse(
                button.getAttribute('data-attachments')
              );
              payload.attachments = attachments;
            } catch (e) {
              console.error('Error parsing attachments JSON:', e);
            }
          }

          // Handle data request (form schema)
          if (button.hasAttribute('data-data-request')) {
            payload.dataRequest = button.getAttribute('data-data-request');
          }

          // Log the message payload
          console.log(`Sending demo message from ${senderId}:`, payload);

          // Send the message via API
          const response = await fetch('/api/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            // Briefly highlight the button to show it was clicked
            button.classList.add('active');
            setTimeout(() => {
              button.classList.remove('active');
            }, 500);

            // Close panel after a short delay
            setTimeout(() => {
              demoPanel.classList.remove('visible');
            }, 300);
          }
        } catch (error) {
          console.error('Error sending demo message:', error);
        }
      }
    });
  });

  // Add keyboard shortcut (Escape to close)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && demoPanel.classList.contains('visible')) {
      demoPanel.classList.remove('visible');
    }
  });
}

/**
 * Sets up the media button functionality
 */
function setupMediaButton() {
  const addMediaBtn = document.querySelector('.add-media');
  const mediaModal = document.getElementById('media-modal');
  const mediaInput = document.getElementById('message-input');

  if (!addMediaBtn || !mediaModal) return;

  // Open media modal when add media button is clicked
  addMediaBtn.addEventListener('click', () => {
    openMediaModal();
  });

  // Set up modal close buttons
  const closeButtons = mediaModal.querySelectorAll(
    '.modal-close, .modal-cancel'
  );
  closeButtons.forEach(button => {
    button.addEventListener('click', () => {
      closeModal(mediaModal);
    });
  });

  // Set up media tabs
  const mediaTabs = mediaModal.querySelectorAll('.media-tab');
  mediaTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      mediaTabs.forEach(t => t.classList.remove('active'));

      // Add active class to clicked tab
      tab.classList.add('active');

      // Show corresponding tab content
      const tabId = tab.getAttribute('data-tab');
      const tabPanes = mediaModal.querySelectorAll('.tab-pane');

      tabPanes.forEach(pane => {
        pane.classList.remove('active');
      });

      const activePane = mediaModal.querySelector(`#${tabId}-tab`);
      if (activePane) {
        activePane.classList.add('active');
      }
    });
  });

  // Preview media when URL is entered
  const urlInput = mediaModal.querySelector('#media-url');
  const previewArea = mediaModal.querySelector('.media-preview-content');

  if (urlInput && previewArea) {
    urlInput.addEventListener(
      'input',
      debounce(() => {
        const url = urlInput.value.trim();
        updateMediaPreview(url, previewArea);
      }, 500)
    );
  }

  // Preview file uploads
  const fileInput = mediaModal.querySelector('#media-file');
  if (fileInput && previewArea) {
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const fileType = file.type.split('/')[0]; // 'image' or 'audio'

        if (fileType === 'image') {
          const reader = new FileReader();

          reader.onload = function (e) {
            previewArea.innerHTML = `<img src="${e.target.result}" class="preview-image" alt="Image preview">`;
          };

          reader.readAsDataURL(file);
        } else if (fileType === 'audio') {
          const reader = new FileReader();

          reader.onload = function (e) {
            previewArea.innerHTML = `
              <audio controls>
                <source src="${e.target.result}" type="${file.type}">
                Your browser does not support the audio element.
              </audio>
            `;
          };

          reader.readAsDataURL(file);
        } else {
          previewArea.innerHTML = 'File type not supported for preview.';
        }
      }
    });
  }

  // Add media to message when add button is clicked
  const addMediaBtn2 = mediaModal.querySelector('#add-media-button');
  if (addMediaBtn2 && mediaInput) {
    addMediaBtn2.addEventListener('click', () => {
      const activeTab = mediaModal
        .querySelector('.media-tab.active')
        .getAttribute('data-tab');
      const messageForm = document.querySelector('#message-form');

      // Create a hidden input for attachments if it doesn't exist
      let attachmentsInput = messageForm.querySelector(
        'input[name="attachments"]'
      );
      if (!attachmentsInput) {
        attachmentsInput = document.createElement('input');
        attachmentsInput.type = 'hidden';
        attachmentsInput.name = 'attachments';
        messageForm.appendChild(attachmentsInput);
      }

      if (activeTab === 'url') {
        const url = urlInput.value.trim();
        if (url) {
          // Detect media type from URL
          let attachment = { url };

          // Check for YouTube
          const youtubeRegex =
            /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
          const youtubeMatch = url.match(youtubeRegex);

          if (youtubeMatch) {
            const videoId = youtubeMatch[1];
            attachment = {
              type: 'youtube',
              url,
              title: 'YouTube Video',
              thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            };
          }
          // Check for image
          else if (
            /\.(jpeg|jpg|gif|png|webp)(\?[^"'\s]*)?$|images\.unsplash\.com/i.test(
              url
            )
          ) {
            attachment = {
              type: 'image',
              url,
              title: 'Image',
            };
          }
          // Check for audio
          else if (/\.(mp3|wav|ogg)(\?[^"']*)?$/i.test(url)) {
            attachment = {
              type: 'audio',
              url,
              title: 'Audio',
              mimeType: `audio/${url.split('.').pop().toLowerCase() === 'mp3' ? 'mpeg' : url.split('.').pop().toLowerCase()}`,
            };
          }
          // Default to link
          else {
            attachment = {
              type: 'link',
              url,
              title: 'Link',
            };
          }

          // Add the attachment to the form
          let existingAttachments = [];
          try {
            if (attachmentsInput.value) {
              existingAttachments = JSON.parse(attachmentsInput.value);
            }
          } catch (e) {
            console.warn('Error parsing existing attachments', e);
          }

          // Add new attachment
          existingAttachments.push(attachment);
          attachmentsInput.value = JSON.stringify(existingAttachments);

          // Add a visual indicator that media was added
          const currentMessage = mediaInput.value;
          const indicatorText = `[${attachment.type}] `;
          mediaInput.value = currentMessage
            ? `${currentMessage} ${indicatorText}`
            : indicatorText;
          mediaInput.focus();

          // Log the attachment
          console.log('Added attachment:', attachment);

          // Clear URL input
          urlInput.value = '';
        }
      } else if (activeTab === 'upload') {
        // In a real app, you would upload the file to storage and get a URL
        // For this demo, we'll just show a message
        if (fileInput.files && fileInput.files[0]) {
          const file = fileInput.files[0];
          const fileName = file.name;
          const fileType = file.type.split('/')[0]; // 'image' or 'audio'

          alert(
            `In a real app, ${fileName} would be uploaded to storage and added as a ${fileType} attachment.`
          );

          // Add a visual indicator that media was added
          const currentMessage = mediaInput.value;
          const indicatorText = `[${fileType}] `;
          mediaInput.value = currentMessage
            ? `${currentMessage} ${indicatorText}`
            : indicatorText;
          mediaInput.focus();

          // For demo purposes, add a mock attachment
          let existingAttachments = [];
          try {
            if (attachmentsInput.value) {
              existingAttachments = JSON.parse(attachmentsInput.value);
            }
          } catch (e) {
            console.warn('Error parsing existing attachments', e);
          }

          // Construct a sample URL (this wouldn't happen in a real app)
          const mockUrl =
            fileType === 'image'
              ? 'https://via.placeholder.com/300'
              : 'https://file-examples.com/storage/fe14eb58c4608145968248c/2017/11/file_example_MP3_700KB.mp3';

          // Add mock attachment
          existingAttachments.push({
            type: fileType,
            url: mockUrl,
            title: fileName,
          });

          attachmentsInput.value = JSON.stringify(existingAttachments);
        }
      }

      // Close the modal
      closeModal(mediaModal);
    });
  }

  /**
   * Opens the media modal
   */
  function openMediaModal() {
    mediaModal.classList.add('visible');

    // Focus URL input
    const urlInput = mediaModal.querySelector('#media-url');
    if (urlInput) {
      urlInput.focus();
    }
  }

  /**
   * Updates media preview based on URL
   * @param {string} url - The URL to preview
   * @param {HTMLElement} previewArea - The preview area element
   */
  function updateMediaPreview(url, previewArea) {
    if (!url) {
      previewArea.innerHTML = 'No media selected';
      return;
    }

    // Check for YouTube URL
    const youtubeRegex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const youtubeMatch = url.match(youtubeRegex);

    if (youtubeMatch) {
      const videoId = youtubeMatch[1];
      previewArea.innerHTML = `
        <div class="preview-youtube">
          <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="YouTube video thumbnail">
          <div class="preview-play-button">
            <svg viewBox="0 0 24 24" width="48" height="48">
              <path fill="#fff" d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      `;
      return;
    }

    // Check for image URL (including Unsplash URLs)
    const imageRegex =
      /(\.(jpeg|jpg|gif|png|webp)(\?[^"']*)?$|images\.unsplash\.com)/i;
    if (imageRegex.test(url)) {
      console.log('Previewing image URL:', url);
      previewArea.innerHTML = `<img src="${url}" class="preview-image" alt="Image preview">`;
      return;
    }

    // Check for audio URL
    const audioRegex = /\.(mp3|wav|ogg)(\?[^"']*)?$/i;
    if (audioRegex.test(url)) {
      previewArea.innerHTML = `
        <audio controls>
          <source src="${url}" type="audio/${url.split('.').pop().toLowerCase() === 'mp3' ? 'mpeg' : url.split('.').pop().toLowerCase()}">
          Your browser does not support the audio element.
        </audio>
      `;
      return;
    }

    // Unknown media type
    previewArea.innerHTML = 'Unable to preview this URL. Add it anyway?';
  }

  /**
   * Simple debounce function for input events
   * @param {Function} func - The function to debounce
   * @param {number} wait - The wait time in milliseconds
   * @returns {Function} The debounced function
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}
