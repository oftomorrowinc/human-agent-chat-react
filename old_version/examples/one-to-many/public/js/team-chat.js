// Import the necessary components from the package
import { ChatUI, initializeFirebase, createModalForm } from '../../../dist/index.js';
import { z } from 'zod';

// Global chat instance
let chatInstance;

/**
 * Initialize team chat component
 * @param {Object} firebaseConfig Firebase configuration
 * @param {Object} user Current user
 * @param {string} chatPath Firebase path for chat
 * @param {string[]} agentIds IDs of AI agents
 */
window.initializeTeamChat = async (firebaseConfig, user, chatPath, agentIds) => {
  try {
    // Initialize Firebase
    initializeFirebase(firebaseConfig);
    
    // Create chat options
    const chatOptions = {
      containerId: 'chat-container',
      firebasePath: chatPath,
      currentUser: user,
      // Dark theme is the only option
      maxMessages: 100,
      enableReactions: true,
      enableReplies: true,
      enableMultiModal: true,
      enableForms: true,
      agentIds: agentIds,
      onNewMessage: (message) => {
        console.log('New message received:', message);
      }
    };
    
    // Create and initialize chat
    chatInstance = new ChatUI(chatOptions);
    await chatInstance.initialize();
    
    // Set up form button
    setupFormButton();
    
    console.log('Team chat initialized successfully');
  } catch (error) {
    console.error('Error initializing team chat:', error);
  }
};

/**
 * Set up the feedback form button
 */
function setupFormButton() {
  const formButton = document.getElementById('open-form-btn');
  if (formButton) {
    formButton.addEventListener('click', async () => {
      try {
        // Define form schema
        const feedbackFormSchema = z.object({
          rating: z.number().min(1).max(5).describe('Rate from 1-5 stars'),
          feedback: z.string().min(10).max(500).describe('Provide detailed feedback'),
          category: z.enum(['UI', 'Performance', 'Feature', 'Bug', 'Other'])
        });
        
        // Create modal form
        const modal = createModalForm(feedbackFormSchema, async (data) => {
          console.log('Form submitted:', data);
          
          // Send form as a message
          await chatInstance.sendCustomMessage({
            type: 'form_response',
            value: {
              formId: 'feedback',
              values: data
            }
          });
          
          alert('Feedback submitted successfully!');
        });
        
        // Show the form
        modal.show();
      } catch (error) {
        console.error('Error creating form:', error);
      }
    });
  }
}

// Expose chat instance to window for debugging
window.getChat = () => chatInstance;