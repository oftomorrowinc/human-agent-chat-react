const express = require('express');
const path = require('path');
const { initializeFirebaseWithEmulators, emulatorConfig } = require('../../dist/index');
const { z } = require('zod');

// Create Express app
const app = express();
const port = 3002;

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

// Mock organization data
const organization = {
  id: 'org1',
  name: 'Acme Corporation',
  path: 'organizations/org1'
};

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
    displayName: 'Marketing Team Lead',
    email: 'marketing@example.com',
    photoURL: null
  },
  'user2': {
    id: 'user2',
    displayName: 'Sales Rep',
    email: 'sales@example.com',
    photoURL: null
  },
  'user3': {
    id: 'user3',
    displayName: 'Product Manager',
    email: 'product@example.com',
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

// Mock channels and departments
const departments = [
  { id: 'marketing', name: 'Marketing', path: 'organizations/org1/departments/marketing' },
  { id: 'sales', name: 'Sales', path: 'organizations/org1/departments/sales' },
  { id: 'product', name: 'Product', path: 'organizations/org1/departments/product' }
];

const channels = [
  { id: 'general', name: 'General', path: 'organizations/org1/channels/general' },
  { id: 'announcements', name: 'Announcements', path: 'organizations/org1/channels/announcements' },
  { id: 'projects', name: 'Projects', path: 'organizations/org1/channels/projects' }
];

// Define interactive forms with Zod
const projectRequestFormSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(20).max(1000),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  deadline: z.date().optional(),
  department: z.enum(['Marketing', 'Sales', 'Product', 'IT', 'HR']),
  budget: z.number().positive().optional()
});

// Routes
app.get('/', (req, res) => {
  // Simulating a logged-in user
  const currentUser = mockUsers.admin1;
  
  res.render('organization', {
    title: organization.name,
    organization: organization,
    user: currentUser,
    departments: departments,
    channels: channels
  });
});

app.get('/channel/:channelId', (req, res) => {
  const channelId = req.params.channelId;
  const channel = channels.find(c => c.id === channelId);
  
  if (!channel) {
    return res.status(404).send('Channel not found');
  }
  
  // Simulating a logged-in user
  const currentUser = mockUsers.admin1;
  
  res.render('channel-chat', {
    title: channel.name,
    user: currentUser,
    channel: channel,
    organization: organization,
    departments: departments,
    channels: channels,
    members: Object.values(mockUsers),
    chatPath: channel.path,
    agentIds: ['agent1']
  });
});

app.get('/department/:departmentId', (req, res) => {
  const departmentId = req.params.departmentId;
  const department = departments.find(d => d.id === departmentId);
  
  if (!department) {
    return res.status(404).send('Department not found');
  }
  
  // Simulating a logged-in user
  const currentUser = mockUsers.admin1;
  
  res.render('department-chat', {
    title: department.name,
    user: currentUser,
    department: department,
    organization: organization,
    departments: departments,
    channels: channels,
    members: Object.values(mockUsers),
    chatPath: department.path,
    agentIds: ['agent1']
  });
});

// API routes for messages
app.post('/api/messages', (req, res) => {
  res.status(200).json({ success: true });
});

// API routes for form schemas
app.get('/api/forms/project-request', (req, res) => {
  res.json(projectRequestFormSchema);
});

// API route for submitting form
app.post('/api/forms/submit', (req, res) => {
  try {
    const validatedData = projectRequestFormSchema.parse(req.body);
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
  console.log(`Many-to-many chat example running at http://localhost:${port}`);
});