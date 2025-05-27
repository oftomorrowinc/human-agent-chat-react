const express = require('express');
const path = require('path');
const { initializeFirebaseWithEmulators, emulatorConfig } = require('../../dist/index');
const { z } = require('zod');

// Create Express app
const app = express();
const port = 3001;

// Set up Pug as the view engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, '../../dist/css')));
app.use('/htmx', express.static(path.join(__dirname, '../../node_modules/htmx.org/dist')));

// Parse request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Firebase with emulators
// You can use real Firebase config in production by setting environment variables
const firebaseConfig = process.env.FIREBASE_API_KEY
  ? {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID
    }
  : emulatorConfig;

// Use emulators by default, but allow disabling via environment variable
const useEmulators = process.env.USE_FIREBASE_EMULATORS !== 'false';
initializeFirebaseWithEmulators(firebaseConfig, useEmulators);

// Mock users for demonstration
const mockUsers = {
  'admin1': {
    id: 'admin1',
    displayName: 'Admin User',
    email: 'admin@example.com',
    photoURL: null
  },
  'user1': {
    id: 'user1',
    displayName: 'Team Member 1',
    email: 'member1@example.com',
    photoURL: null
  },
  'user2': {
    id: 'user2',
    displayName: 'Team Member 2',
    email: 'member2@example.com',
    photoURL: null
  },
  'agent1': {
    id: 'agent1',
    displayName: 'AI Assistant',
    email: 'ai@example.com',
    photoURL: null,
    isAgent: true
  }
};

// Mock team data
const teams = [
  { id: 'team1', name: 'Project Alpha', path: 'teams/team1' },
  { id: 'team2', name: 'Project Beta', path: 'teams/team2' }
];

// Define forms with Zod
const feedbackFormSchema = z.object({
  rating: z.number().min(1).max(5),
  feedback: z.string().min(10).max(500),
  category: z.enum(['UI', 'Performance', 'Feature', 'Bug', 'Other'])
});

// Routes
app.get('/', (req, res) => {
  // Simulating a logged-in admin user
  const currentUser = mockUsers.admin1;
  
  res.render('dashboard', {
    title: 'Team Chat Dashboard',
    user: currentUser,
    teams: teams
  });
});

app.get('/team/:teamId', (req, res) => {
  const teamId = req.params.teamId;
  const team = teams.find(t => t.id === teamId);
  
  if (!team) {
    return res.status(404).send('Team not found');
  }
  
  // Simulating a logged-in admin user
  const currentUser = mockUsers.admin1;
  
  res.render('team-chat', {
    title: team.name,
    user: currentUser,
    team: team,
    members: Object.values(mockUsers),
    chatPath: team.path,
    agentIds: ['agent1']
  });
});

// API route for sending messages
app.post('/api/messages', (req, res) => {
  // In a real app, this would use the Firebase module to send messages
  // For this example, we'll just return a success response
  res.status(200).json({ success: true });
});

// API route for getting form schema
app.get('/api/forms/feedback', (req, res) => {
  res.json(feedbackFormSchema);
});

// API route for submitting form
app.post('/api/forms/submit', (req, res) => {
  try {
    const validatedData = feedbackFormSchema.parse(req.body);
    // In a real app, this would be saved to Firebase
    res.status(200).json({ success: true, data: validatedData });
  } catch (error) {
    res.status(400).json({ success: false, errors: error.errors });
  }
});

// API routes for message actions
app.post('/api/message/react', (req, res) => {
  res.status(200).json({ success: true });
});

app.post('/api/message/reply', (req, res) => {
  res.status(200).json({ success: true });
});

// Start the server
app.listen(port, () => {
  console.log(`One-to-many chat example running at http://localhost:${port}`);
});