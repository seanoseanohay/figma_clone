# 🦖 Canvasaurus

**The Big Beast of Collaboration**

A real-time collaborative design canvas where teams can create, edit, and iterate together. Like Figma, but with more teeth.

---

## 🎯 What is Canvasaurus?

Canvasaurus is a powerful collaborative design tool that lets multiple users work on the same canvas simultaneously. Draw shapes, add text, move objects, and watch your teammates' cursors in real-time.

### Key Features

- 🎨 **Real-time Collaboration** - See your teammates working live with cursor tracking and presence indicators
- 🔧 **Rich Tool Set** - Pan, Select, Move, Resize, Rotate, Delete, Text, and Shape tools
- 🦕 **Shape Library** - Rectangles, Circles, Stars with drag-to-create functionality
- 🎨 **Color Picker** - Customize your shapes with any color
- ↶↷ **Undo/Redo** - Full history system (up to 5 actions per user)
- 🗂️ **Layer Management** - Z-index controls for object stacking
- 🤖 **AI Assistant** - Natural language canvas manipulation
- 👥 **User Presence** - See who's online and what they're editing
- 🔒 **Object Locking** - Ownership system prevents edit conflicts
- 📱 **Responsive** - Works on desktop and mobile devices

---

## 🚀 Complete Setup Guide

### Prerequisites & Requirements

Before setting up Canvasaurus, ensure you have:

**Software Requirements:**
- **Node.js 18+** (required for both frontend and Firebase Functions)
- **npm or yarn** package manager
- **Firebase CLI** (`npm install -g firebase-tools`)
- **Git** for cloning the repository

**Service Accounts Required:**
- **Firebase Project** (free tier available)
- **OpenAI API Account** with API key (for AI agent functionality)
- **Domain** (optional, for custom hosting)

**Firebase Services Needed:**
- Authentication (Email/Password + Google Sign-in)
- Firestore Database 
- Realtime Database
- Cloud Functions
- Hosting

---

## 📋 Step-by-Step Setup Process

### 1. Clone Repository & Install Dependencies

```bash
# Clone the repository
git clone <your-repository-url>
cd figma_clone

# Install frontend dependencies
npm install

# Install Firebase Functions dependencies
cd functions && npm install && cd ..
```

### 2. Firebase Project Setup

```bash
# Login to Firebase (opens browser)
firebase login

# Initialize Firebase in your project
firebase init

# When prompted, select:
# - Firestore: Configure security rules and indexes files
# - Realtime Database: Configure a security rules file
# - Functions: Configure a Cloud Functions directory and files
# - Hosting: Configure files for Firebase Hosting

# Choose "Use an existing project" or "Create a new project"
# Accept default file names and configurations
```

### 3. Firebase Services Configuration

**Authentication Setup:**
1. Go to Firebase Console → Authentication → Sign-in methods
2. Enable **Email/Password** provider
3. Enable **Google** provider (add your domain to authorized domains)

**Database Setup:**
- Firestore and Realtime Database rules will be deployed automatically
- No manual configuration needed (rules are in `firestore.rules` and `database.rules.json`)

### 4. Environment Variables Configuration

Create a `.env` file in your project root:

```bash
# Firebase Configuration (get from Firebase Console → Project Settings → General)
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com

# AI Agent Configuration (optional but recommended)
VITE_AGENT_ENABLED=true
VITE_AGENT_MOCK_MODE=false
VITE_API_BASE_URL=https://us-central1-your_project_id.cloudfunctions.net
```

**Firebase Functions Environment Variables:**

```bash
# Set OpenAI API key (get from https://platform.openai.com/api-keys)
firebase functions:config:set openai.api_key="sk-your_openai_api_key_here"

# Configure AI model settings (optional - these are defaults)
firebase functions:config:set agent.model="gpt-4o-mini"
firebase functions:config:set agent.temperature="0.1" 
firebase functions:config:set agent.max_tokens="1000"
```

### 5. Configure CORS for Your Domain

Update `functions/index.js` to include your domain in the CORS origins:

```javascript
const corsOptions = {
  origin: [
    'http://localhost:5173', // Keep for local development
    'https://your-custom-domain.com', // Add your domain here
    'https://your_project_id.web.app', // Firebase default domain
    'https://your_project_id.firebaseapp.com' // Firebase fallback domain
  ],
  // ... rest of config
};
```

### 6. Deploy Firebase Services

```bash
# Deploy database rules
firebase deploy --only firestore:rules
firebase deploy --only database

# Deploy cloud functions
firebase deploy --only functions

# Build and deploy the frontend
npm run build
firebase deploy --only hosting
```

### 7. Domain Configuration (Optional)

For custom domains:
1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Follow the DNS configuration instructions
4. Update your `.env` file with the custom domain

---

## 🔧 Development Setup

### Local Development

```bash
# Start development server
npm run dev

# Run with Firebase emulators (optional)
firebase emulators:start
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run preview` - Preview production build
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report
- `npm run lint` - Lint code

### Firebase Functions Scripts

```bash
cd functions

# Start local functions emulator
npm run serve

# Deploy functions only
npm run deploy

# View function logs
npm run logs
```

---

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool with Rolldown
- **Material-UI** - Component library
- **Konva** - Canvas rendering engine
- **React Router** - Navigation

### Backend
- **Firebase** - Authentication, Firestore (persistence), Realtime Database (real-time sync)
- **Firebase Functions** - REST API endpoints
- **OpenAI** - AI Assistant integration

### Testing
- **Vitest** - Unit testing framework
- **React Testing Library** - Component testing 
- **Playwright** - E2E testing (in progress)

---

## 🔒 Security & Configuration

### Firebase Security Rules
- **Production-ready** security rules are already configured
- **Firestore rules** (`firestore.rules`) - Canvas-based access control
- **Realtime Database rules** (`database.rules.json`) - Presence and cursor tracking
- **API rate limiting** - 10 requests/minute for AI agent, 30/minute for general API

### Environment Security
- All sensitive data uses environment variables
- OpenAI API keys are stored securely in Firebase Functions config
- CORS is configured for specific domains only
- All API endpoints require authentication

---

## 🧪 Testing & Verification

### Post-Deployment Testing Checklist
After deploying to your server, verify these features work:

- [ ] **Authentication** - Email/password and Google sign-in
- [ ] **Canvas Creation** - Users can create new canvases  
- [ ] **Real-time Collaboration** - Multiple users see each other's cursors
- [ ] **Object Creation** - Draw rectangles, circles, stars
- [ ] **Object Editing** - Move, resize, rotate, delete objects
- [ ] **Undo/Redo** - History system works for each user
- [ ] **AI Agent** - Natural language commands work (if enabled)
- [ ] **Persistence** - State survives page refresh
- [ ] **Mobile Compatibility** - Works on touch devices

### Automated Testing

We maintain **96.7% test coverage** (491/508 tests passing):

```bash
# Run all tests
npm test

# Watch mode during development
npm run test:watch

# Generate coverage report
npm run test:coverage

# Visual test runner
npm run test:ui
```

---

## 🚨 Troubleshooting

### Common Setup Issues

**1. Firebase Configuration Errors**
```bash
# Symptoms: "Firebase config is invalid" or auth errors
# Solution: Double-check all environment variables in .env
# Verify project ID, API keys, and database URLs are correct
```

**2. CORS Errors** 
```bash
# Symptoms: "Access blocked by CORS policy"
# Solution: Update functions/index.js corsOptions with your domain
# Redeploy functions: firebase deploy --only functions
```

**3. AI Agent Not Working**
```bash
# Symptoms: "AI service not configured" 
# Solutions:
firebase functions:config:get  # Check if OpenAI key is set
firebase functions:config:set openai.api_key="sk-your-key"
firebase deploy --only functions
```

**4. Build/Deploy Failures**
```bash
# Check Node.js version (must be 18+)
node --version

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Build locally first
npm run build
```

**5. Functions Deployment Issues**
```bash
# Check functions dependencies
cd functions && npm install

# Deploy functions separately
firebase deploy --only functions

# Check function logs
firebase functions:log
```

### Performance Issues

**High Firebase Usage:**
- Monitor usage in Firebase Console
- Consider upgrading to paid plan if needed
- Adjust real-time sync frequency if necessary

**AI Agent Rate Limits:**
- Default: 10 requests/minute per user
- Upgrade OpenAI plan for higher limits
- Enable mock mode for development: `VITE_AGENT_MOCK_MODE=true`

---

## 💰 Cost Considerations

### Firebase Costs (Free Tier Limits)
- **Firestore**: 50K reads, 20K writes, 20K deletes per day
- **Realtime Database**: 1GB storage, 10GB bandwidth per month
- **Cloud Functions**: 2M invocations, 400K GB-seconds per month
- **Authentication**: Unlimited users
- **Hosting**: 10GB storage, 360MB per day transfer

### OpenAI API Costs
- **GPT-4o-mini**: ~$0.0015 per 1K input tokens, ~$0.006 per 1K output tokens
- **Average cost per AI request**: $0.001-0.006
- **Daily usage estimate**: $1-5 for moderate use (100-500 requests)

### Scaling Recommendations
- Start with Firebase free tier
- Monitor usage in Firebase Console
- Upgrade to paid plans as needed
- Consider implementing usage quotas for AI features

---

## 🎮 How to Use

1. **Sign In** - Create an account or sign in with email/Google
2. **Create/Select Canvas** - Start a new canvas or join an existing one  
3. **Invite Collaborators** - Share your canvas with teammates
4. **Start Creating** - Use tools to draw, edit, and collaborate
5. **Try AI Commands** - Use natural language to create objects ("draw a red circle")

### Keyboard Shortcuts

- `V` - Select Tool
- `D` - Delete Tool  
- `M` - Move Tool (requires selection)
- `R` - Resize Tool (requires selection)
- `T` - Rotate Tool (requires selection)
- `Space` - Pan Tool (hold)
- `Ctrl+Z` - Undo
- `Ctrl+Y` - Redo
- `Delete` - Delete selected object

---

## 📚 Documentation

Full documentation is available in the `/docs` directory:

- **[Architecture Overview](docs/CANVAS_ONLY_ARCHITECTURE_SUMMARY.md)** - System design and patterns
- **[API Documentation](docs/api/)** - REST API endpoints and examples  
- **[AI Agent Setup](docs/AI_AGENT_SETUP.md)** - Detailed AI configuration
- **[Testing Guide](docs/TESTING_GUIDE.md)** - How to write and run tests
- **[Stage Progress](docs/)** - Feature development roadmap (stage1-8)

---

## 🗺️ Development Roadmap

### ✅ Completed (Stages 1-8)
- Core canvas functionality
- Real-time collaboration  
- Object ownership & locking
- Undo/Redo system
- AI Assistant integration
- Comprehensive testing framework
- REST API endpoints
- Production deployment ready

### 🚧 In Progress  
- Multi-object selection (E12)
- Tool consolidation (E13-E14)
- Performance optimization (A0)

### 📋 Planned
- Canvas export (PNG/SVG)
- Object grouping
- Alignment tools  
- Keyboard-first navigation

---

## 🤝 Contributing

We welcome contributions! Please see our contribution guidelines (coming soon).

### Development Workflow

1. Create a feature branch
2. Write tests for new functionality  
3. Implement the feature
4. Ensure all tests pass
5. Submit a pull request

---

## 📄 License

[Your License Here]

---

## 🦖 Why "Canvasaurus"?

Because collaboration should be BIG, POWERFUL, and maybe a little bit FEROCIOUS. 

Like a T-Rex working on design projects with its tiny arms but massive brain.

**RAWR!** 🦖

---

## 🙏 Acknowledgments

Built with inspiration from Figma, Miro, and other amazing collaborative tools.

Special thanks to the open-source community for the incredible libraries that make this possible.

---

**Made with ❤️ and 🦖 by the Canvasaurus team**
