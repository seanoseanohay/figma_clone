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

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase account

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd figma_clone

# Install dependencies
npm install

# Set up Firebase
# Copy your Firebase config to src/services/firebase.js

# Start development server
npm run dev
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report
- `npm run lint` - Lint code

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

## 📚 Documentation

Full documentation is available in the `/docs` directory:

- **[Architecture Overview](docs/CANVAS_ONLY_ARCHITECTURE_SUMMARY.md)** - System design and patterns
- **[API Documentation](docs/api/)** - REST API endpoints and examples
- **[Testing Guide](docs/TESTING_GUIDE.md)** - How to write and run tests
- **[Stage Progress](docs/)** - Feature development roadmap (stage1-8)

---

## 🎮 How to Use

1. **Sign In** - Create an account or sign in with email
2. **Create/Select Canvas** - Start a new canvas or join an existing one
3. **Invite Collaborators** - Share your canvas with teammates
4. **Start Creating** - Use tools to draw, edit, and collaborate

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

## 🧪 Testing

We maintain **96.7% test coverage** (491/508 tests passing) with comprehensive unit and integration tests:

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Visual test runner
npm run test:ui
```

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

### 🚧 In Progress
- Multi-object selection (E12)
- Tool consolidation (E13-E14)
- Performance optimization (A0)

### 📋 Planned
- Canvas export (PNG/SVG)
- Object grouping
- Alignment tools
- Keyboard-first navigation

See [docs/stage3-enhanced-features.md](docs/stage3-enhanced-features.md) for detailed roadmap.

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
