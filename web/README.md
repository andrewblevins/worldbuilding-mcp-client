# MCP Client Web Interface

A modern React web interface for interacting with Model Context Protocol (MCP) servers through natural language. Built with React Router v7, FastAPI, and WebSockets for real-time communication.

## Features

- 🌐 **Modern Web Interface** - Clean, responsive React frontend with React Router v7
- 🤖 **Natural Language Chat** - Talk to your MCP server in plain English
- ⚡ **Real-time Communication** - WebSocket-based chat with live updates
- 🔧 **Tool Discovery** - Automatically discovers and displays available MCP tools
- 🎯 **Smart Orchestration** - Claude intelligently chains multiple tool calls
- 📱 **Mobile Responsive** - Works great on desktop and mobile devices
- ⚙️ **Easy Configuration** - Simple settings page for server connection

## Architecture

```
mcp-client-web/
├── frontend/          # React + TypeScript frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route pages (Home, Chat, Settings)
│   │   └── App.tsx        # React Router configuration
│   └── package.json
├── backend/           # FastAPI backend
│   ├── main.py           # FastAPI server with WebSocket support
│   └── requirements.txt
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- An MCP server (like the worldbuilding server)
- Anthropic API key

### 1. Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with your Anthropic API key
echo "ANTHROPIC_API_KEY=your_api_key_here" > .env
```

### 2. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Start Backend Server

```bash
cd backend
source venv/bin/activate
python main.py
```

### 4. Open in Browser

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Usage

1. **Connect to MCP Server**
   - Go to Settings page
   - Enter path to your MCP server script
   - Click "Connect"

2. **Start Chatting**
   - Navigate to Chat page
   - Type natural language queries
   - Watch as Claude orchestrates tool calls automatically

3. **Example Queries**
   - "Create a fantasy world about floating islands"
   - "Add a new taxonomy for magical creatures"
   - "Generate a static website for my world"

## API Endpoints

### REST API
- `GET /api/status` - Get connection status and available tools
- `POST /api/connect` - Connect to an MCP server
- `POST /api/query` - Process a query (alternative to WebSocket)

### WebSocket
- `WS /ws/{client_id}` - Real-time chat communication

## React Router v7 Features Used

- **Data Mode** - Uses `createBrowserRouter` for enhanced data loading
- **Nested Routes** - Layout component with nested page routes
- **Navigation** - `Link` and `useLocation` for active states
- **Modern Patterns** - Latest React Router v7 best practices

## Development

### Frontend Development
```bash
cd frontend
npm run dev     # Start dev server
npm run build   # Build for production
npm run preview # Preview production build
```

### Backend Development
```bash
cd backend
python main.py  # Start FastAPI server
# Server auto-reloads on file changes
```

## Deployment

### Production Build
```bash
# Build frontend
cd frontend
npm run build

# The backend serves the built frontend automatically
# Uncomment the static files line in main.py
```

### Environment Variables
```bash
# Backend (.env)
ANTHROPIC_API_KEY=your_api_key_here

# Frontend (optional)
VITE_API_URL=http://localhost:8000  # API base URL
```

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Ensure backend server is running on port 8000
   - Check that MCP server path is correct
   - Verify Anthropic API key is set

2. **WebSocket Connection Issues**
   - Check browser console for errors
   - Ensure no firewall blocking WebSocket connections
   - Try refreshing the page

3. **CORS Issues**
   - Backend is configured for localhost:5173 (Vite dev server)
   - Update CORS origins in main.py for different URLs

### Debug Mode
```bash
# Backend with debug logging
cd backend
uvicorn main:app --reload --log-level debug

# Frontend with debug info
cd frontend
npm run dev -- --debug
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Related Projects

- [MCP Specification](https://modelcontextprotocol.io)
- [React Router v7](https://reactrouter.com)
- [FastAPI](https://fastapi.tiangolo.com)
- [Anthropic Claude API](https://docs.anthropic.com)
