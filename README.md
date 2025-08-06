# Worldbuilding MCP Client

A comprehensive client suite for interacting with the Vibe Worldbuilding MCP server. Create detailed fictional worlds through natural language conversations with Claude AI.

## 🌟 Features

- **🌐 Modern Web Interface** - React + Tailwind CSS frontend with real-time chat
- **🤖 Natural Language Worldbuilding** - Talk to Claude to create worlds, characters, locations
- **⚡ Real-time Communication** - WebSocket-based chat with live tool execution
- **🔧 Tool Discovery** - Automatically discovers and uses MCP server tools
- **📱 Mobile Responsive** - Works great on desktop and mobile devices
- **🏗️ CLI Client** - Command-line interface for advanced users

## 🚀 Quick Start (Web Interface)

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- Anthropic API key

### 1. Setup
```bash
cd worldbuilding-mcp-client/web
./setup.sh
```

### 2. Configure API Key
```bash
# Edit backend/.env and add your Anthropic API key
echo "ANTHROPIC_API_KEY=your_api_key_here" > backend/.env
```

### 3. Start the Application
```bash
# Terminal 1: Start backend
cd backend
source venv/bin/activate
python main.py

# Terminal 2: Start frontend
cd frontend
npm run dev
```

### 4. Open in Browser
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000

## 📁 Project Structure

```
worldbuilding-mcp-client/
├── web/                          # Modern web interface (PRIMARY)
│   ├── frontend/                 # React + Tailwind frontend
│   ├── backend/                  # FastAPI backend with WebSocket
│   ├── setup.sh                  # Automated setup script
│   └── README.md                 # Web client documentation
├── cli/                          # Command-line interface
│   ├── client.py                 # Python CLI client
│   ├── run_client.sh            # CLI runner script
│   └── ...
├── generated-worlds/             # Example generated worlds
│   ├── context-appreciation-society-20250731/
│   └── lepidoptera-society-20250806-091601/
├── docs/                         # Project documentation
│   └── context-appreciation-society/
├── archive/                      # Archived/incomplete projects
└── README.md                     # This file
```

## 🎯 Usage Examples

### Web Interface
1. **Connect to MCP Server**
   - Go to Settings page
   - Enter path: `../vibe-worldbuilding-mcp/vibe_worldbuilding_server.py`
   - Click "Connect"

2. **Create a World**
   - Navigate to Chat page
   - Type: "Create a fantasy world about floating islands"
   - Watch Claude orchestrate tool calls automatically

3. **Explore Generated Content**
   - Generated worlds appear in `generated-worlds/`
   - Each world includes entries, images, and a navigable website

### CLI Interface
```bash
cd cli
source activate.sh
python client.py ../../vibe-worldbuilding-mcp/vibe_worldbuilding_server.py
```

## 🛠️ Available MCP Tools

When connected to the Vibe Worldbuilding MCP server:

- **`instantiate_world`** - Create a new world with theme and structure
- **`create_taxonomy`** - Add taxonomy categories (characters, locations, etc.)
- **`create_world_entry`** - Add detailed entries to your world
- **`generate_entry_descriptions`** - Generate rich content with AI
- **`analyze_world_consistency`** - Check for consistency issues
- **`build_static_site`** - Generate a navigable website for your world

## 🔧 Development

### Web Client Development
```bash
cd web/frontend
npm run dev     # Start dev server with hot reload
npm run build   # Build for production
```

### Backend Development
```bash
cd web/backend
source venv/bin/activate
python main.py  # Auto-reloads on file changes
```

## 📚 Documentation

- **[Web Client Guide](web/README.md)** - Detailed web interface documentation
- **[CLI Client Guide](cli/EXPLANATION.md)** - Command-line interface guide
- **[Generated Worlds](generated-worlds/)** - Example worlds and their structure

## 🌍 Example Worlds

Explore the `generated-worlds/` directory to see examples of what the system can create:

- **Context Appreciation Society** - A philosophical society exploring context and meaning
- **Lepidoptera Society** - A world centered around butterfly-inspired culture

Each generated world includes:
- Rich lore and world overview
- Detailed character and location entries
- AI-generated images
- Navigable static website
- Organized taxonomy structure

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with both web and CLI clients
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Related Projects

- **[Vibe Worldbuilding MCP](../vibe-worldbuilding-mcp/)** - The MCP server that powers this client
- **[MCP Specification](https://modelcontextprotocol.io)** - Model Context Protocol documentation
- **[Anthropic Claude API](https://docs.anthropic.com)** - AI model powering the worldbuilding

---

**🎯 Focus: Web Interface MVP** - The web interface in `web/` is the primary client and recommended starting point.
