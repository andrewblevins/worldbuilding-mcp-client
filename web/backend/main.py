"""
FastAPI backend for the MCP Client Web Interface.
Wraps the existing MCP client and provides WebSocket and REST APIs.
"""

import asyncio
import json
import os
import uuid
from typing import Dict, Optional
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
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MCPWebClient:
    """Web-adapted version of the MCP client"""
    
    def __init__(self):
        self.session: Optional[ClientSession] = None
        self.exit_stack = AsyncExitStack()
        self.anthropic = Anthropic()
        self.connected = False
        self.tools = []
        
    async def connect_to_server(self, server_script_path: str):
        """Connect to an MCP server"""
        try:
            is_python = server_script_path.endswith('.py')
            is_js = server_script_path.endswith('.js')
            if not (is_python or is_js):
                raise ValueError("Server script must be a .py or .js file")

            # Resolve the path relative to the backend directory
            if not os.path.isabs(server_script_path):
                # Get the directory where this script is located
                backend_dir = os.path.dirname(os.path.abspath(__file__))
                resolved_path = os.path.join(backend_dir, server_script_path)
                resolved_path = os.path.normpath(resolved_path)
            else:
                resolved_path = server_script_path
            
            # Check if the file exists
            if not os.path.exists(resolved_path):
                raise FileNotFoundError(f"Server script not found: {resolved_path}")

            command = "python" if is_python else "node"
            server_params = StdioServerParameters(
                command=command,
                args=[resolved_path],
                env=None
            )

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
                "tools": [tool["name"] for tool in self.tools]
            }
            
        except Exception as e:
            return {"status": "error", "message": str(e)}

    async def process_query(self, query: str) -> Dict:
        """Process a query and return structured response"""
        print(f"[DEBUG] Processing query: {query}")
        
        if not self.connected:
            print("[DEBUG] Not connected to MCP server")
            return {"error": "Not connected to MCP server"}
            
        try:
            messages = [{"role": "user", "content": query}]
            final_text = []
            tool_calls = []
            max_iterations = 10

            print(f"[DEBUG] Starting processing with {len(self.tools)} tools available")

            for iteration in range(max_iterations):
                print(f"[DEBUG] Iteration {iteration + 1}")
                
                # Call Claude with configurable model
                print("[DEBUG] Calling Claude...")
                response = self.anthropic.messages.create(
                    model=os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022"),
                    max_tokens=1000,
                    messages=messages,
                    tools=self.tools
                )
                print(f"[DEBUG] Claude response received with {len(response.content)} content items")

                assistant_message_content = []
                has_tool_calls = False

                # Process response content
                for i, content in enumerate(response.content):
                    print(f"[DEBUG] Processing content item {i}: type={content.type}")
                    
                    if content.type == 'text':
                        print(f"[DEBUG] Text content: {content.text[:100]}...")
                        final_text.append(content.text)
                        assistant_message_content.append(content)
                    elif content.type == 'tool_use':
                        has_tool_calls = True
                        tool_name = content.name
                        tool_args = content.input
                        print(f"[DEBUG] Tool call: {tool_name} with args: {tool_args}")

                        # Execute tool call
                        try:
                            print(f"[DEBUG] Executing tool: {tool_name}")
                            result = await self.session.call_tool(tool_name, tool_args)
                            print(f"[DEBUG] Tool result: {result}")
                            
                            tool_call_info = {
                                "tool": tool_name,
                                "args": tool_args,
                                "result": result.content[0].text if result.content else "No result"
                            }
                            tool_calls.append(tool_call_info)
                            
                            assistant_message_content.append(content)
                            
                            # Add tool result to conversation
                            messages.append({
                                "role": "assistant",
                                "content": assistant_message_content
                            })
                            messages.append({
                                "role": "user",
                                "content": [
                                    {
                                        "type": "tool_result",
                                        "tool_use_id": content.id,
                                        "content": result.content
                                    }
                                ]
                            })
                        except Exception as e:
                            print(f"[DEBUG] Tool execution error: {e}")
                            tool_calls.append({
                                "tool": tool_name,
                                "args": tool_args,
                                "error": str(e)
                            })
                            break

                # If no tool calls were made, we're done
                if not has_tool_calls:
                    print("[DEBUG] No tool calls made, finishing")
                    break

            result = {
                "response": "\n".join(final_text),
                "tool_calls": tool_calls,
                "iterations": iteration + 1
            }
            print(f"[DEBUG] Final result: {result}")
            return result
            
        except Exception as e:
            print(f"[DEBUG] Exception in process_query: {e}")
            import traceback
            traceback.print_exc()
            return {"error": str(e)}

    async def cleanup(self):
        """Clean up resources"""
        await self.exit_stack.aclose()
        self.connected = False

# Global MCP client instance
mcp_client = MCPWebClient()

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
            await self.active_connections[client_id].send_text(json.dumps(message))

manager = ConnectionManager()

# API Models
class ConnectRequest(BaseModel):
    server_path: str

class QueryRequest(BaseModel):
    query: str

# REST API Endpoints
@app.post("/api/connect")
async def connect_to_server(request: ConnectRequest):
    """Connect to an MCP server"""
    result = await mcp_client.connect_to_server(request.server_path)
    return result

@app.get("/api/status")
async def get_status():
    """Get connection status and available tools"""
    return {
        "connected": mcp_client.connected,
        "tools": [tool["name"] for tool in mcp_client.tools] if mcp_client.connected else []
    }

@app.post("/api/query")
async def process_query(request: QueryRequest):
    """Process a query through the MCP client"""
    result = await mcp_client.process_query(request.query)
    return result

# WebSocket endpoint for real-time chat
@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "query":
                # Send processing status
                await manager.send_personal_message({
                    "type": "status",
                    "message": "Processing your request..."
                }, client_id)
                
                # Process the query
                result = await mcp_client.process_query(message["query"])
                
                # Send result back
                await manager.send_personal_message({
                    "type": "response",
                    "data": result
                }, client_id)
                
    except WebSocketDisconnect:
        manager.disconnect(client_id)

# Serve React frontend in production
# app.mount("/", StaticFiles(directory="../frontend/dist", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
