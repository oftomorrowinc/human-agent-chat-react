# NPM Scripts Reference

This document provides a comprehensive overview of all available npm scripts in the Human Agent Chat project.

## 📚 Example Scripts

### Quick Start
```bash
# The fastest way to see everything working
npm run demo
```
This runs the advanced example with Firebase emulators on:
- **Advanced Example**: http://localhost:3002  
- **Firebase Emulator UI**: http://localhost:4000

### Individual Examples
```bash
# Basic example - simple chat features
npm run example:basic
# → http://localhost:3001

# Advanced example - full feature showcase  
npm run example:advanced
# → http://localhost:3002

# Run both examples simultaneously
npm run examples
# → Basic: http://localhost:3001
# → Advanced: http://localhost:3002
```

### Firebase Emulators
```bash
# Start Firebase emulators only
npm run emulators
# → Firestore: localhost:8080
# → Auth: localhost:9099  
# → Storage: localhost:9199
# → UI: http://localhost:4000
```

## 🛠 Development Scripts

### Core Development
```bash
# Start main React development server
npm start
# → http://localhost:3000

# Build for production
npm build

# Run test suite
npm test

# Run tests once (CI mode)
npm test -- --watchAll=false
```

### Code Quality
```bash
# Check ESLint rules
npm run lint

# Fix ESLint issues automatically
npm run lint:fix

# Format code with Prettier
npm run format

# Check Prettier formatting
npm run format:check

# TypeScript type checking
npm run type-check
```

## 🔧 Script Details

### Example Scripts Configuration

| Script | Port | Purpose | Firebase |
|--------|------|---------|----------|
| `example:basic` | 3001 | Simple chat demo | Optional |
| `example:advanced` | 3002 | Full feature demo | Optional |
| `demo` | 3002 + emulators | Complete experience | Required |
| `examples` | 3001 + 3002 | Both examples | Optional |

### Firebase Emulator Ports

| Service | Port | Purpose |
|---------|------|---------|
| Firestore | 8080 | Database |
| Auth | 9099 | Authentication |
| Storage | 9199 | File storage |
| UI | 4000 | Admin interface |

### Dependencies

The example scripts require:
- `serve` - Static file server
- `npm-run-all` - Run multiple scripts
- `firebase-tools` - Firebase emulators

All are included as devDependencies.

## 🚀 Usage Patterns

### Development Workflow
```bash
# 1. Start with examples to understand features
npm run demo

# 2. Develop your integration
npm start

# 3. Test and validate
npm run lint
npm run type-check
npm test
```

### CI/CD Pipeline
```bash
# Install dependencies
npm ci

# Type checking
npm run type-check

# Linting
npm run lint

# Testing
npm test -- --watchAll=false

# Build
npm run build
```

### Quick Demo for Stakeholders
```bash
# Start everything needed for demo
npm run demo

# Or just the advanced example
npm run example:advanced
```

## 🎯 Example Features

### Basic Example
- User switching simulation
- AI agent integration  
- @mention system
- Real-time updates
- Simple message types

### Advanced Example
- **Rich Media**: Images, videos, audio, documents
- **Interactive Forms**: Zod schema-based forms
- **AI Interactions**: Smart responses and analysis
- **Role Management**: Multiple user types
- **System Messages**: Automated notifications

## 📝 Configuration Files

### package.json
Contains all script definitions and dependencies.

### firebase.json
Configures Firebase emulator ports and settings:
```json
{
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "storage": { "port": 9199 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

## 🔍 Troubleshooting

### Port Conflicts
If ports are in use:
```bash
# Find processes using ports
lsof -i :3001,3002,8080,9099,9199,4000

# Kill specific processes
kill -9 <PID>
```

### Firebase Emulator Issues
```bash
# Reset emulator data
firebase emulators:start --only firestore,auth,storage --clear-data

# Check emulator status
firebase emulators:status
```

### Script Not Found
```bash
# List all available scripts
npm run

# Check script definition
grep -A1 "script-name" package.json
```

### Permission Issues
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 🎉 Next Steps

1. **Try the demo**: `npm run demo`
2. **Explore examples**: Check both basic and advanced
3. **Read documentation**: See examples/README.md
4. **Build your integration**: Use patterns from examples
5. **Deploy**: Build and deploy your app

The scripts are designed to provide a smooth developer experience from initial exploration to production deployment!