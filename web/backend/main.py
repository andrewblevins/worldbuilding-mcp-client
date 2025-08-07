"""
FastAPI backend for the MCP Client Web Interface.
Wraps the existing MCP client and provides WebSocket and REST APIs.
Multi-server support for connecting to multiple MCP servers simultaneously.
"""

import asyncio
import json
import os
import uuid
from typing import Dict, Optional, List, Any
from contextlib import AsyncExitStack

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="MCP Client Web API", version="1.0.0")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ServerConnection:
    """Represents a connection to a single MCP server"""
    
    def __init__(self, name: str):
        self.name = name
        self.session: Optional[ClientSession] = None
        self.exit_stack = AsyncExitStack()
        self.connected = False
        self.tools = []
        self.stdio = None
        self.write = None
        
    async def connect(self, server_config: dict):
        """Connect to the MCP server with the given configuration"""
        try:
            # Handle different server types
            if "script_path" in server_config:
                # Python/JS script server
                script_path = server_config["script_path"]
                is_python = script_path.endswith('.py')
                is_js = script_path.endswith('.js')
                
                if not (is_python or is_js):
                    raise ValueError("Server script must be a .py or .js file")

                # Resolve the path relative to the backend directory
                if not os.path.isabs(script_path):
                    backend_dir = os.path.dirname(os.path.abspath(__file__))
                    resolved_path = os.path.join(backend_dir, script_path)
                    resolved_path = os.path.normpath(resolved_path)
                else:
                    resolved_path = script_path
                
                if not os.path.exists(resolved_path):
                    raise FileNotFoundError(f"Server script not found: {resolved_path}")

                # Set up environment
                env = os.environ.copy()
                if "env" in server_config:
                    env.update(server_config["env"])
                
                # Add worldbuilding base directory for worldbuilding server
                if self.name == "worldbuilding":
                    backend_dir = os.path.dirname(os.path.abspath(__file__))
                    project_root = os.path.join(backend_dir, "..", "..")
                    generated_worlds_dir = os.path.join(project_root, "generated-worlds")
                    generated_worlds_dir = os.path.normpath(generated_worlds_dir)
                    os.makedirs(generated_worlds_dir, exist_ok=True)
                    env["WORLDBUILDING_BASE_DIR"] = generated_worlds_dir
                
                command = "python" if is_python else "node"
                server_params = StdioServerParameters(
                    command=command,
                    args=[resolved_path],
                    env=env
                )
                
            elif "command" in server_config:
                # Command-based server (like npx filesystem server)
                command = server_config["command"]
                args = server_config.get("args", [])
                env = os.environ.copy()
                if "env" in server_config:
                    env.update(server_config["env"])
                
                # Ensure generated-worlds directory exists for filesystem server
                if self.name == "filesystem" and args:
                    # Extract the directory path from args (last argument is typically the path)
                    filesystem_path = args[-1]
                    os.makedirs(filesystem_path, exist_ok=True)
                
                server_params = StdioServerParameters(
                    command=command,
                    args=args,
                    env=env
                )
            else:
                raise ValueError("Server config must have either 'script_path' or 'command'")

            # Create connection
            stdio_transport = await self.exit_stack.enter_async_context(
                stdio_client(server_params)
            )
            self.stdio, self.write = stdio_transport
            self.session = await self.exit_stack.enter_async_context(
                ClientSession(self.stdio, self.write)
            )

            await self.session.initialize()

            # List available tools
            response = await self.session.list_tools()
            self.tools = [
                {
                    "name": tool.name,
                    "description": tool.description,
                    "input_schema": tool.inputSchema
                }
                for tool in response.tools
            ]
            self.connected = True
            
            return {
                "status": "connected",
                "server": self.name,
                "tools": [tool["name"] for tool in self.tools]
            }
            
        except Exception as e:
            return {"status": "error", "server": self.name, "message": str(e)}
    
    async def call_tool(self, tool_name: str, args: dict):
        """Call a tool on this server"""
        if not self.connected or not self.session:
            raise Exception(f"Server {self.name} is not connected")
        
        return await self.session.call_tool(tool_name, args)
    
    async def disconnect(self):
        """Disconnect from the server"""
        if self.connected:
            await self.exit_stack.aclose()
            self.connected = False
            self.tools = []

class MCPMultiServerClient:
    """Multi-server MCP client that can connect to multiple servers simultaneously"""
    
    def __init__(self):
        self.servers: Dict[str, ServerConnection] = {}
        self.anthropic = Anthropic()
        # Store conversation history per client
        self.conversations: Dict[str, list] = {}
        
        # Default server configurations
        self.default_servers = {
            "worldbuilding": {
                "script_path": "../../../vibe-worldbuilding-mcp/vibe_worldbuilding_server.py",
                "env": {}
            },
            "filesystem": {
                "command": "npx",
                "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/andrew/worldbuilding/worldbuilding-mcp-client/generated-worlds"],
                "env": {}
            }
        }
    
    async def connect_to_server(self, server_name: str, server_config: dict = None):
        """Connect to a specific server"""
        if server_config is None:
            if server_name in self.default_servers:
                server_config = self.default_servers[server_name]
            else:
                return {"status": "error", "message": f"No default config for server '{server_name}'"}
        
        # Disconnect existing connection if any
        if server_name in self.servers:
            await self.servers[server_name].disconnect()
        
        # Create new connection
        server_conn = ServerConnection(server_name)
        result = await server_conn.connect(server_config)
        
        if result["status"] == "connected":
            self.servers[server_name] = server_conn
        
        return result
    
    async def connect_to_all_default_servers(self):
        """Connect to all default servers"""
        results = {}
        for server_name in self.default_servers:
            result = await self.connect_to_server(server_name)
            results[server_name] = result
        return results
    
    async def disconnect_server(self, server_name: str):
        """Disconnect from a specific server"""
        if server_name in self.servers:
            await self.servers[server_name].disconnect()
            del self.servers[server_name]
            return {"status": "disconnected", "server": server_name}
        return {"status": "error", "message": f"Server '{server_name}' not connected"}
    
    def get_all_tools(self):
        """Get all tools from all connected servers"""
        all_tools = []
        for server_name, server_conn in self.servers.items():
            if server_conn.connected:
                all_tools.extend(server_conn.tools)
        return all_tools
    
    def find_tool_server(self, tool_name: str) -> Optional[str]:
        """Find which server has the specified tool"""
        for server_name, server_conn in self.servers.items():
            if server_conn.connected:
                for tool in server_conn.tools:
                    if tool["name"] == tool_name:
                        return server_name
        return None
    
    async def call_tool(self, tool_name: str, args: dict):
        """Call a tool, automatically routing to the correct server"""
        server_name = self.find_tool_server(tool_name)
        if not server_name:
            raise Exception(f"Tool '{tool_name}' not found on any connected server")
        
        return await self.servers[server_name].call_tool(tool_name, args)
    
    def get_status(self):
        """Get status of all servers"""
        status = {
            "servers": {},
            "total_tools": 0,
            "connected_servers": 0
        }
        
        for server_name, server_conn in self.servers.items():
            status["servers"][server_name] = {
                "connected": server_conn.connected,
                "tools": [tool["name"] for tool in server_conn.tools]
            }
            if server_conn.connected:
                status["connected_servers"] += 1
                status["total_tools"] += len(server_conn.tools)
        
        return status

    async def stream_text_char_by_char(self, text: str, websocket_manager, client_id: str):
        """Helper function to stream text character by character"""
        for char in text:
            await websocket_manager.send_personal_message({
                "type": "text_delta",
                "text": char
            }, client_id)
            await asyncio.sleep(0.01)  # 10ms delay between characters

    async def process_query_streaming(self, query: str, websocket_manager, client_id: str):
        """Process a query with streaming response and proper conversation continuity"""
        print(f"[DEBUG] Processing streaming query: {query}")
        
        # Check if any servers are connected
        connected_servers = [name for name, server in self.servers.items() if server.connected]
        if not connected_servers:
            print("[DEBUG] No MCP servers connected")
            await websocket_manager.send_personal_message({
                "type": "error",
                "message": "No MCP servers connected"
            }, client_id)
            return
            
        try:
            # Get or initialize conversation history for this client
            if client_id not in self.conversations:
                self.conversations[client_id] = []
            
            # Add user message to conversation history
            self.conversations[client_id].append({"role": "user", "content": query})
            messages = self.conversations[client_id].copy()
            
            # Get all available tools
            all_tools = self.get_all_tools()
            
            # System message for first interaction
            system_prompt = f"You are a helpful assistant with access to tools from multiple MCP servers. You maintain conversation history and can remember what was discussed in this session. You have access to {len(all_tools)} tools from {len(connected_servers)} connected servers: {', '.join(connected_servers)}. The tools include worldbuilding capabilities and filesystem operations."
            
            print(f"[CLAUDE DEBUG] ===== CONVERSATION STATE =====")
            print(f"[CLAUDE DEBUG] Client ID: {client_id}")
            print(f"[CLAUDE DEBUG] Query: {query}")
            print(f"[CLAUDE DEBUG] Connected servers: {connected_servers}")
            print(f"[CLAUDE DEBUG] Available tools: {len(all_tools)}")
            print(f"[CLAUDE DEBUG] Conversation history has {len(messages)} messages")

            max_iterations = 10
            for iteration in range(max_iterations):
                print(f"[DEBUG] Iteration {iteration + 1}")
                
                # Signal start of streaming
                await websocket_manager.send_personal_message({
                    "type": "stream_start"
                }, client_id)

                # Track the complete response as it streams
                assistant_content_blocks = []
                has_tool_calls = False

                print("[DEBUG] ===== STARTING STREAM EVENT PROCESSING =====")
                
                with self.anthropic.messages.stream(
                    model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
                    max_tokens=4000,
                    messages=messages,
                    tools=all_tools,
                    system=system_prompt,
                ) as stream:
                    # Stream text content character by character
                    for text in stream.text_stream:
                        # Stream each character individually for letter-by-letter effect
                        for char in text:
                            await websocket_manager.send_personal_message({
                                "type": "text_delta",
                                "text": char
                            }, client_id)
                            await asyncio.sleep(0.01)  # 10ms delay between characters
                    
                    # Get the final message to check for tool calls
                    final_message = stream.get_final_message()
                    print(f"[CLAUDE DEBUG] Final message received with {len(final_message.content)} content blocks")
                    
                    # Process the final message content
                    for i, content_block in enumerate(final_message.content):
                        if content_block.type == "text":
                            assistant_content_blocks.append({
                                "type": "text",
                                "text": content_block.text
                            })
                        elif content_block.type == "tool_use":
                            print(f"[CLAUDE DEBUG] Tool call: {content_block.name}")
                            assistant_content_blocks.append({
                                "type": "tool_use",
                                "id": content_block.id,
                                "name": content_block.name,
                                "input": content_block.input
                            })
                            has_tool_calls = True
                
                # Add assistant message to conversation history
                if assistant_content_blocks:
                    assistant_message = {"role": "assistant", "content": assistant_content_blocks}
                    messages.append(assistant_message)
                    self.conversations[client_id].append(assistant_message)

                # Process any tool calls
                if has_tool_calls:
                    print(f"[DEBUG] Processing {len([b for b in assistant_content_blocks if b.get('type') == 'tool_use'])} tool calls")
                    
                    # Ensure streaming continues for tool execution
                    await websocket_manager.send_personal_message({
                        "type": "stream_start"
                    }, client_id)
                    
                    tool_results = []
                    for content_block in assistant_content_blocks:
                        if content_block.get("type") == "tool_use":
                            tool_name = content_block["name"]
                            tool_args = content_block["input"]
                            tool_id = content_block["id"]
                            
                            print(f"[DEBUG] Executing tool: {tool_name} with args: {tool_args}")

                            # Find which server has this tool
                            server_name = self.find_tool_server(tool_name)
                            
                            # Send explicit tool execution message
                            await websocket_manager.send_personal_message({
                                "type": "tool_execution",
                                "tool_name": tool_name,
                                "tool_args": tool_args,
                                "server": server_name
                            }, client_id)

                            try:
                                # Execute tool on the appropriate server
                                print(f"[DEBUG] About to call tool {tool_name} on server {server_name}")
                                result = await self.call_tool(tool_name, tool_args)
                                print(f"[DEBUG] Tool call completed, processing result...")
                                print(f"[DEBUG] Raw result type: {type(result)}")
                                print(f"[DEBUG] Raw result: {result}")
                                
                                # Get result text for explicit message
                                result_text = ""
                                print(f"[DEBUG] Checking result.content...")
                                if hasattr(result, 'content') and result.content:
                                    print(f"[DEBUG] result.content exists, type: {type(result.content)}, length: {len(result.content) if hasattr(result.content, '__len__') else 'unknown'}")
                                    for i, content_item in enumerate(result.content):
                                        print(f"[DEBUG] Processing content item {i}: type={type(content_item)}")
                                        if hasattr(content_item, 'text'):
                                            print(f"[DEBUG] Content item has text attribute: {content_item.text[:100]}...")
                                            result_text += content_item.text
                                        else:
                                            print(f"[DEBUG] Content item has no text attribute, converting to string")
                                            result_text += str(content_item)
                                else:
                                    print(f"[DEBUG] No result.content or result.content is empty")
                                    result_text = str(result)
                                
                                print(f"[DEBUG] Final result_text length: {len(result_text)}")
                                
                                # Send explicit tool result message
                                await websocket_manager.send_personal_message({
                                    "type": "tool_result",
                                    "success": True,
                                    "result": result_text,
                                    "tool_name": tool_name,
                                    "server": server_name
                                }, client_id)
                                
                                # Stream successful result character by character
                                await self.stream_text_char_by_char(f"✅ **Tool completed successfully on {server_name} server!**\n", websocket_manager, client_id)
                                
                                # Stream the actual tool result content character by character
                                if result_text:
                                    await self.stream_text_char_by_char(f"**Result:**\n{result_text}\n", websocket_manager, client_id)
                                
                                tool_results.append({
                                    "type": "tool_result",
                                    "tool_use_id": tool_id,
                                    "content": result.content
                                })
                                
                            except Exception as e:
                                print(f"[DEBUG] Tool execution error: {e}")
                                
                                # Send explicit tool error message
                                await websocket_manager.send_personal_message({
                                    "type": "tool_result",
                                    "success": False,
                                    "error": str(e),
                                    "tool_name": tool_name,
                                    "server": server_name
                                }, client_id)
                                
                                # Stream execution error character by character
                                await self.stream_text_char_by_char(f"❌ **Tool execution failed on {server_name}:**\n{str(e)}\n", websocket_manager, client_id)
                                
                                tool_results.append({
                                    "type": "tool_result",
                                    "tool_use_id": tool_id,
                                    "content": f"Error: {str(e)}"
                                })

                    # Add tool results to conversation
                    if tool_results:
                        tool_result_message = {"role": "user", "content": tool_results}
                        messages.append(tool_result_message)
                        self.conversations[client_id].append(tool_result_message)
                        
                        # Continue the conversation with tool results
                        continue
                
                # If no tool calls were made, we're done
                print("[DEBUG] No more tool calls, conversation complete")
                break
            
            # Signal end of streaming when everything is complete
            await websocket_manager.send_personal_message({
                "type": "stream_end"
            }, client_id)
            
            print(f"[DEBUG] Streaming processing completed after {iteration + 1} iterations")
            
        except Exception as e:
            print(f"[DEBUG] Exception in process_query_streaming: {e}")
            import traceback
            traceback.print_exc()
            await websocket_manager.send_personal_message({
                "type": "error",
                "message": str(e)
            }, client_id)

    async def cleanup(self):
        """Clean up all server connections"""
        for server_name in list(self.servers.keys()):
            await self.disconnect_server(server_name)

# Global multi-server MCP client instance
mcp_client = MCPMultiServerClient()

# Auto-connect to default servers on startup
@app.on_event("startup")
async def startup_event():
    """Connect to default MCP servers on startup"""
    print("[DEBUG] ===== STARTUP EVENT TRIGGERED =====")
    
    # Clean up any existing server processes first
    import subprocess
    try:
        subprocess.run(["pkill", "-f", "vibe_worldbuilding_server.py"], 
                      capture_output=True, check=False)
        print("[DEBUG] Cleaned up any existing MCP server processes")
    except Exception as e:
        print(f"[DEBUG] Process cleanup warning: {e}")
    
    # Connect to all default servers
    print("[DEBUG] Connecting to default servers...")
    results = await mcp_client.connect_to_all_default_servers()
    
    for server_name, result in results.items():
        if result.get("status") == "connected":
            print(f"[DEBUG] ✅ Successfully connected to {server_name} server!")
            print(f"[DEBUG] Available tools: {result.get('tools', [])}")
        else:
            print(f"[DEBUG] ❌ Failed to connect to {server_name} server: {result.get('message', 'Unknown error')}")
    
    # Print overall status
    status = mcp_client.get_status()
    print(f"[DEBUG] Overall status: {status['connected_servers']}/{len(mcp_client.default_servers)} servers connected, {status['total_tools']} total tools")

# Connection manager for WebSockets
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_personal_message(self, message: dict, client_id: str):
        if client_id in self.active_connections:
            try:
                message_json = json.dumps(message)
                # Only log non-text-delta messages to reduce spam
                if message.get("type") != "text_delta":
                    print(f"[DEBUG] Sending WebSocket message to {client_id}: {message_json}")
                await self.active_connections[client_id].send_text(message_json)
                # Force immediate flush by yielding control
                await asyncio.sleep(0)
            except Exception as e:
                print(f"[DEBUG] Error sending WebSocket message to {client_id}: {e}")
                # Remove broken connection
                self.disconnect(client_id)

manager = ConnectionManager()

# API Models
class ConnectRequest(BaseModel):
    server_name: str
    server_config: Optional[dict] = None

class QueryRequest(BaseModel):
    query: str

# REST API Endpoints
@app.post("/api/connect")
async def connect_to_server(request: ConnectRequest):
    """Connect to an MCP server"""
    result = await mcp_client.connect_to_server(request.server_name, request.server_config)
    return result

@app.post("/api/disconnect/{server_name}")
async def disconnect_from_server(server_name: str):
    """Disconnect from an MCP server"""
    result = await mcp_client.disconnect_server(server_name)
    return result

@app.get("/api/status")
async def get_status():
    """Get connection status and available tools for all servers"""
    return mcp_client.get_status()

@app.get("/api/servers")
async def get_servers():
    """Get list of available server configurations"""
    return {
        "default_servers": list(mcp_client.default_servers.keys()),
        "connected_servers": list(mcp_client.servers.keys())
    }

# WebSocket endpoint for real-time chat
@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    print(f"[DEBUG] WebSocket connection established for client: {client_id}")
    await manager.connect(websocket, client_id)
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)
            print(f"[DEBUG] Received WebSocket message: {message}")
            
            if message["type"] == "query":
                print(f"[DEBUG] Processing query via WebSocket: {message['query']}")
                
                # Process the query with streaming
                await mcp_client.process_query_streaming(message["query"], manager, client_id)
                
            elif message["type"] == "clear_history":
                print(f"[DEBUG] Clearing conversation history for client: {client_id}")
                # Clear conversation history for this client
                if client_id in mcp_client.conversations:
                    del mcp_client.conversations[client_id]
                
                # Send confirmation
                await manager.send_personal_message({
                    "type": "status",
                    "message": "Conversation history cleared"
                }, client_id)
                
    except WebSocketDisconnect:
        print(f"[DEBUG] WebSocket disconnected for client: {client_id}")
        manager.disconnect(client_id)
    except Exception as e:
        print(f"[DEBUG] WebSocket error for client {client_id}: {e}")
        import traceback
        traceback.print_exc()
        manager.disconnect(client_id)

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up MCP resources on shutdown"""
    print("[DEBUG] ===== SHUTDOWN EVENT TRIGGERED =====")
    
    # Close all MCP client connections
    await mcp_client.cleanup()
    print("[DEBUG] Closed all MCP client connections")
    
    # Clean up MCP server processes
    import subprocess
    try:
        subprocess.run(["pkill", "-f", "vibe_worldbuilding_server.py"], 
                      capture_output=True, check=False)
        print("[DEBUG] Cleaned up MCP server processes on shutdown")
    except Exception as e:
        print(f"[DEBUG] Shutdown cleanup warning: {e}")

# Serve React frontend in production
# app.mount("/", StaticFiles(directory="../frontend/dist", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
