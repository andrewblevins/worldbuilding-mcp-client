# Worldbuilding MCP Client

A Python client for interacting with Model Context Protocol (MCP) servers, specifically designed for worldbuilding applications. This client provides an interactive interface to connect to MCP servers and process queries using Claude AI.

## Features

- Connect to MCP servers via stdio transport
- Interactive chat interface for querying worldbuilding data
- Integration with Claude AI for natural language processing
- Support for tool calling and result processing
- Automatic dependency management

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/worldbuilding-mcp-client.git
cd worldbuilding-mcp-client
```

2. Install dependencies:
```bash
pip install -e .
```

3. Set up environment variables:
Create a `.env` file with your Anthropic API key:
```
ANTHROPIC_API_KEY=your_api_key_here
```

## Usage

Run the client with a path to your MCP server script:

```bash
python client.py /path/to/your/server.py
```

The client will:
1. Connect to the specified MCP server
2. List available tools
3. Start an interactive chat loop
4. Process your queries using Claude AI and available tools

## Example

```bash
python client.py ../vibe-worldbuilding-mcp/vibe_worldbuilding_server.py
```

## Requirements

- Python 3.12+
- Anthropic API key
- MCP server to connect to

## Dependencies

- `anthropic>=0.61.0` - Claude AI client
- `mcp>=1.12.3` - Model Context Protocol
- `python-dotenv>=1.1.1` - Environment variable management

## License

MIT License
