// Import the necessary components from the package
import { ChatUI, initializeFirebase } from '../../../dist/index.js';
import { z } from 'zod';

// Global chat instance
let chatInstance;

/**
 * Initialize organization chat component
 * @param {Object} firebaseConfig Firebase configuration
 * @param {Object} user Current user
 * @param {Object} chatInfo Chat information (path, type, name, agentIds)
 */
window.initializeOrgChat = async (firebaseConfig, user, chatInfo) => {
  try {
    // Initialize Firebase
    initializeFirebase(firebaseConfig);
    
    // Create chat options
    const chatOptions = {
      containerId: 'chat-container',
      firebasePath: chatInfo.path,
      currentUser: user,
      // Dark theme is the only option
      maxMessages: 100,
      enableReactions: true,
      enableReplies: true,
      enableMultiModal: true,
      enableForms: true,
      agentIds: chatInfo.agentIds,
      onNewMessage: (message) => {
        console.log(`New message in ${chatInfo.type} ${chatInfo.name}:`, message);
      }
    };
    
    // Create and initialize chat
    chatInstance = new ChatUI(chatOptions);
    await chatInstance.initialize();
    
    // Set up project request button
    setupProjectRequestButton();
    
    console.log(`${chatInfo.type} chat initialized successfully`);
  } catch (error) {
    console.error(`Error initializing ${chatInfo.type} chat:`, error);
  }
};

/**
 * Set up the project request form button
 */
function setupProjectRequestButton() {
  const formButton = document.getElementById('create-project-request');
  if (formButton) {
    formButton.addEventListener('click', async () => {
      try {
        // Define project request schema
        const projectRequestSchema = z.object({
          title: z.string().min(5).max(100).describe('Project title'),
          description: z.string().min(20).max(1000).describe('Detailed project description'),
          priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
          deadline: z.string().optional().describe('Target completion date (optional)'),
          department: z.enum(['Marketing', 'Sales', 'Product', 'IT', 'HR']),
          budget: z.number().positive().optional().describe('Estimated budget (optional)')
        });
        
        // Send form as a message
        await chatInstance.sendCustomMessage({
          type: 'form',
          value: projectRequestSchema,
          caption: 'Project Request Form'
        });
        
      } catch (error) {
        console.error('Error creating project request form:', error);
      }
    });
  }
}

// Expose chat instance to window for debugging
window.getChat = () => chatInstance;