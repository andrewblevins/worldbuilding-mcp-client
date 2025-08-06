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
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
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
        # Store conversation history per client
        self.conversations: Dict[str, list] = {}
        
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

    async def process_query_streaming(self, query: str, websocket_manager, client_id: str):
        """Process a query with streaming response and proper conversation continuity"""
        print(f"[DEBUG] Processing streaming query: {query}")
        
        if not self.connected:
            print("[DEBUG] Not connected to MCP server")
            await websocket_manager.send_personal_message({
                "type": "error",
                "message": "Not connected to MCP server"
            }, client_id)
            return
            
        try:
            # Get or initialize conversation history for this client
            if client_id not in self.conversations:
                self.conversations[client_id] = []
            
            # Add user message to conversation history
            self.conversations[client_id].append({"role": "user", "content": query})
            messages = self.conversations[client_id].copy()
            
            # Add system message at the beginning if this is the first message
            if len(messages) == 1:
                system_message = {
                    "role": "system", 
                    "content": "You are a helpful assistant with access to worldbuilding tools. You maintain conversation history and can remember what was discussed in this session. You have access to tools for creating worlds, taxonomies, entries, and more through the MCP (Model Context Protocol) interface."
                }
                messages.insert(0, system_message)
            
            print(f"[DEBUG] Conversation history has {len(messages)} messages")
            print(f"[DEBUG] Starting streaming processing with {len(self.tools)} tools available")

            max_iterations = 10
            for iteration in range(max_iterations):
                print(f"[DEBUG] Iteration {iteration + 1}")
                
                # Call Claude with streaming enabled and latest model
                print("[DEBUG] Calling Claude with streaming...")
                print(f"[DEBUG] Using model: {os.getenv('ANTHROPIC_MODEL', 'claude-sonnet-4-20250514')}")
                print(f"[DEBUG] Messages to send: {len(messages)} messages")
                
                # Signal start of streaming
                await websocket_manager.send_personal_message({
                    "type": "stream_start"
                }, client_id)

                # Track the complete response as it streams
                assistant_content_blocks = []
                current_text_block = None
                current_tool_block = None
                has_tool_calls = False

                # Process streaming events using the correct SDK pattern
                print("[DEBUG] ===== STARTING STREAM EVENT PROCESSING =====")
                event_count = 0
                
                with self.anthropic.messages.stream(
                    model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
                    max_tokens=2000,
                    messages=messages,
                    tools=self.tools,
                ) as stream:
                    # Stream text content with smoother chunking
                    for text in stream.text_stream:
                        print(f"[DEBUG] Streaming text: '{text}'")
                        
                        # Break large chunks into smaller pieces for smoother streaming
                        if len(text) > 5:  # If chunk is larger than 5 characters
                            # Split into smaller chunks (words or smaller pieces)
                            words = text.split(' ')
                            for i, word in enumerate(words):
                                chunk = word
                                if i < len(words) - 1:  # Add space back except for last word
                                    chunk += ' '
                                
                                # Send smaller chunk to frontend
                                await websocket_manager.send_personal_message({
                                    "type": "text_delta",
                                    "text": chunk
                                }, client_id)
                                
                                # Small delay for smoother streaming effect
                                await asyncio.sleep(0.02)  # 20ms delay between words
                        else:
                            # Send small chunks as-is
                            await websocket_manager.send_personal_message({
                                "type": "text_delta",
                                "text": text
                            }, client_id)
                            
                            # Yield control to allow WebSocket to send immediately
                            await asyncio.sleep(0)
                    
                    # Get the final message to check for tool calls
                    final_message = stream.get_final_message()
                    print(f"[DEBUG] Final message received with {len(final_message.content)} content blocks")
                    
                    # Process the final message content
                    for content_block in final_message.content:
                        if content_block.type == "text":
                            assistant_content_blocks.append({
                                "type": "text",
                                "text": content_block.text
                            })
                        elif content_block.type == "tool_use":
                            assistant_content_blocks.append({
                                "type": "tool_use",
                                "id": content_block.id,
                                "name": content_block.name,
                                "input": content_block.input
                            })
                            has_tool_calls = True
                            print(f"[DEBUG] Tool call detected: {content_block.name}")
                
                # Signal end of streaming
                await websocket_manager.send_personal_message({
                    "type": "stream_end"
                }, client_id)

                # Add assistant message to conversation history
                if assistant_content_blocks:
                    assistant_message = {"role": "assistant", "content": assistant_content_blocks}
                    messages.append(assistant_message)
                    self.conversations[client_id].append(assistant_message)

                # Process any tool calls
                if has_tool_calls:
                    print(f"[DEBUG] Processing {len([b for b in assistant_content_blocks if b.get('type') == 'tool_use'])} tool calls")
                    
                    tool_results = []
                    for content_block in assistant_content_blocks:
                        if content_block.get("type") == "tool_use":
                            tool_name = content_block["name"]
                            tool_args = content_block["input"]
                            tool_id = content_block["id"]
                            
                            print(f"[DEBUG] Executing tool: {tool_name} with args: {tool_args}")

                            # Notify frontend of tool execution
                            await websocket_manager.send_personal_message({
                                "type": "tool_execution",
                                "tool": tool_name
                            }, client_id)

                            try:
                                result = await self.session.call_tool(tool_name, tool_args)
                                print(f"[DEBUG] Tool result: {result}")
                                
                                # Notify frontend of successful tool execution
                                await websocket_manager.send_personal_message({
                                    "type": "tool_result",
                                    "tool": tool_name,
                                    "success": True
                                }, client_id)
                                
                                tool_results.append({
                                    "type": "tool_result",
                                    "tool_use_id": tool_id,
                                    "content": result.content
                                })
                                
                            except Exception as e:
                                print(f"[DEBUG] Tool execution error: {e}")
                                
                                # Notify frontend of tool execution error
                                await websocket_manager.send_personal_message({
                                    "type": "tool_result",
                                    "tool": tool_name,
                                    "success": False,
                                    "error": str(e)
                                }, client_id)
                                
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

            # Send completion signal
            await websocket_manager.send_personal_message({
                "type": "conversation_complete"
            }, client_id)
            
            print(f"[DEBUG] Streaming processing completed after {iteration + 1} iterations")
            print(f"[DEBUG] Final conversation history has {len(self.conversations[client_id])} messages")
            
        except Exception as e:
            print(f"[DEBUG] Exception in process_query_streaming: {e}")
            import traceback
            traceback.print_exc()
            await websocket_manager.send_personal_message({
                "type": "error",
                "message": str(e)
            }, client_id)

    async def process_query(self, query: str) -> Dict:
        """Process a query and return structured response (non-streaming fallback)"""
        print(f"[DEBUG] Processing non-streaming query: {query}")
        
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
                
                # Call Claude with latest model
                print("[DEBUG] Calling Claude...")
                print(f"[DEBUG] Using model: {os.getenv('ANTHROPIC_MODEL', 'claude-sonnet-4-20250514')}")
                
                response = self.anthropic.messages.create(
                    model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
                    max_tokens=2000,
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

# Auto-connect to worldbuilding server on startup
@app.on_event("startup")
async def startup_event():
    """Connect to the worldbuilding MCP server on startup"""
    print("[DEBUG] ===== STARTUP EVENT TRIGGERED =====")
    
    # Path to the worldbuilding server relative to this backend directory
    server_path = "../../../vibe-worldbuilding-mcp/vibe_worldbuilding_server.py"
    print(f"[DEBUG] Auto-connecting to worldbuilding server at: {server_path}")
    
    # Check if the file exists first
    import os
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    resolved_path = os.path.join(backend_dir, server_path)
    resolved_path = os.path.normpath(resolved_path)
    print(f"[DEBUG] Resolved server path: {resolved_path}")
    print(f"[DEBUG] Server file exists: {os.path.exists(resolved_path)}")
    
    result = await mcp_client.connect_to_server(server_path)
    print(f"[DEBUG] Connection result: {result}")
    
    if result.get("status") == "connected":
        print(f"[DEBUG] ✅ Successfully connected to worldbuilding server!")
        print(f"[DEBUG] Available tools: {result.get('tools', [])}")
        print(f"[DEBUG] MCP client connected status: {mcp_client.connected}")
    else:
        print(f"[DEBUG] ❌ Failed to connect to worldbuilding server: {result.get('message', 'Unknown error')}")
        print(f"[DEBUG] MCP client connected status: {mcp_client.connected}")

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
                
                # Send processing status
                await manager.send_personal_message({
                    "type": "status",
                    "message": "Processing your request..."
                }, client_id)
                
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

# Serve React frontend in production
# app.mount("/", StaticFiles(directory="../frontend/dist", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
