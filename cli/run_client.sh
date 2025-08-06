#!/bin/bash

# Convenience script to run the MCP client with proper environment setup

if [ $# -eq 0 ]; then
    echo "Usage: $0 <path_to_server_script>"
    echo "Example: $0 ../vibe-worldbuilding-mcp/vibe_worldbuilding_server.py"
    exit 1
fi

# Add uv to PATH and activate virtual environment
export PATH="$HOME/.local/bin:$PATH"
source .venv/bin/activate

# Run the client
python client.py "$1"
