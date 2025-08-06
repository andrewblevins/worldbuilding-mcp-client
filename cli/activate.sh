#!/bin/bash
# Activation script for worldbuilding-mcp-client

echo "🚀 Activating worldbuilding-mcp-client environment..."
source venv/bin/activate

echo "✅ Environment activated!"
echo ""
echo "📝 Next steps:"
echo "1. Add your Anthropic API key to .env file"
echo "2. Run: python client.py /path/to/your/mcp/server.py"
echo ""
echo "Example:"
echo "python client.py ../vibe-worldbuilding-mcp/vibe_worldbuilding_server.py"
echo ""
echo "Type 'deactivate' to exit the virtual environment"