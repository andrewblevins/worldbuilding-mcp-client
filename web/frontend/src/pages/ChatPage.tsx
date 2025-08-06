import { useState, useEffect, useRef } from 'react'

interface Message {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  isStreaming?: boolean
  toolCalls?: ToolCall[]
}

interface ToolCall {
  tool: string
  args: any
  result?: string
  error?: string
}

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [ws, setWs] = useState<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const clientId = useRef(Math.random().toString(36).substring(7))
  const currentAssistantMessageId = useRef<string | null>(null)

  useEffect(() => {
    connectWebSocket()
    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const connectWebSocket = () => {
    const websocket = new WebSocket(`ws://localhost:8000/ws/${clientId.current}`)
    
    websocket.onopen = () => {
      setIsConnected(true)
      // Don't show redundant connection messages - the status indicator shows this
    }
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log('[FRONTEND DEBUG] Received WebSocket message:', data)
      
      switch (data.type) {
        case 'status':
          // Skip showing "Processing your request..." messages - they're redundant
          if (!data.message.includes('Processing your request') && !data.message.includes('cleared')) {
            addSystemMessage(data.message)
          }
          break
          
        case 'stream_start':
          // Start a new assistant message for streaming
          const assistantMessageId = Date.now().toString()
          currentAssistantMessageId.current = assistantMessageId
          const assistantMessage: Message = {
            id: assistantMessageId,
            type: 'assistant',
            content: '',
            timestamp: new Date(),
            isStreaming: true
          }
          setMessages(prev => [...prev, assistantMessage])
          setIsLoading(false)
          break
          
        case 'text_delta':
          // Append streaming text to the current assistant message
          if (currentAssistantMessageId.current) {
            setMessages(prev => prev.map(msg => 
              msg.id === currentAssistantMessageId.current 
                ? { ...msg, content: msg.content + data.text }
                : msg
            ))
          }
          break
          
        case 'stream_end':
          // Mark streaming as complete
          if (currentAssistantMessageId.current) {
            setMessages(prev => prev.map(msg => 
              msg.id === currentAssistantMessageId.current 
                ? { ...msg, isStreaming: false }
                : msg
            ))
            currentAssistantMessageId.current = null
          }
          break
          
        case 'tool_execution':
          // Don't show tool execution messages - they clutter the interface
          // The backend logs show this information for debugging
          break
          
        case 'tool_result':
          // Don't show tool result messages - they clutter the interface
          // Only show errors if they're critical
          if (!data.success && data.error) {
            addSystemMessage(`Error: ${data.error}`)
          }
          break
          
        case 'conversation_complete':
          // Don't show confusing "conversation complete" messages to user
          // This just means the current query processing is done
          break
          
        case 'error':
          addSystemMessage(`Error: ${data.message}`)
          setIsLoading(false)
          break
          
        // Fallback for old non-streaming responses
        case 'response':
          setIsLoading(false)
          addAssistantMessage(data.data.response, data.data.tool_calls)
          break
      }
    }
    
    websocket.onclose = () => {
      setIsConnected(false)
      addSystemMessage('Disconnected from server')
    }
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error)
      addSystemMessage('Connection error occurred')
    }
    
    setWs(websocket)
  }

  const addSystemMessage = (content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      type: 'system',
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, message])
  }

  const addUserMessage = (content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, message])
  }

  const addAssistantMessage = (content: string, toolCalls?: ToolCall[]) => {
    const message: Message = {
      id: Date.now().toString(),
      type: 'assistant',
      content,
      timestamp: new Date(),
      toolCalls
    }
    setMessages(prev => [...prev, message])
  }

  const sendMessage = () => {
    if (!input.trim() || !ws || !isConnected) return

    const userMessage = input.trim()
    addUserMessage(userMessage)
    setInput('')
    setIsLoading(true)

    ws.send(JSON.stringify({
      type: 'query',
      query: userMessage
    }))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const clearChat = () => {
    setMessages([])
    currentAssistantMessageId.current = null
    
    // Send a message to backend to clear conversation history
    if (ws && isConnected) {
      ws.send(JSON.stringify({
        type: 'clear_history'
      }))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Chat</h1>
            <p className="text-gray-600 mt-1">Interact with your MCP server</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium ${
              isConnected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
            
            <button 
              onClick={clearChat} 
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear Chat
            </button>
          </div>
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Messages */}
          <div className="h-[600px] overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Start a conversation</h3>
                <p className="text-gray-600 mb-6">Ask your MCP server to create worlds, generate content, or manage your projects.</p>
                <div className="text-left max-w-md mx-auto space-y-2 text-sm text-gray-500">
                  <div className="italic">"Create a fantasy world about floating islands"</div>
                  <div className="italic">"Add a new taxonomy for magical creatures"</div>
                  <div className="italic">"Generate a static website for my world"</div>
                </div>
              </div>
            )}
            
            {messages.map((message) => (
              <div key={message.id} className={`flex ${
                message.type === 'user' ? 'justify-end' : 
                message.type === 'system' ? 'justify-center' : 'justify-start'
              }`}>
                <div className={`max-w-[80%] ${
                  message.type === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : message.type === 'assistant'
                    ? 'bg-gray-100 text-gray-900'
                    : 'bg-yellow-50 text-yellow-800 border border-yellow-200 max-w-[60%]'
                } rounded-2xl px-4 py-3 relative`}>
                  
                  {/* Message Header */}
                  <div className="flex items-center justify-between mb-2 text-xs opacity-75">
                    <span className="font-medium">
                      {message.type === 'user' ? 'You' : 
                       message.type === 'assistant' ? 'Assistant' : 'System'}
                    </span>
                    <span>{message.timestamp.toLocaleTimeString()}</span>
                  </div>
                  
                  {/* Message Content */}
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-left">
                    {message.content}
                    {message.isStreaming && (
                      <span className="inline-block w-2 h-4 bg-current opacity-75 animate-pulse ml-1"></span>
                    )}
                  </div>
                  
                  {/* Tool Calls */}
                  {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/20 space-y-2">
                      <div className="text-xs font-medium opacity-75">Tool Calls:</div>
                      {message.toolCalls.map((call, index) => (
                        <div key={index} className="text-xs bg-white/10 rounded-lg p-2">
                          <div className="font-medium mb-1">{call.tool}</div>
                          {call.error ? (
                            <div className="text-red-300">Error: {call.error}</div>
                          ) : (
                            <div className="text-green-300">✓ Success</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 rounded-2xl px-4 py-3">
                  <div className="flex items-center justify-between mb-2 text-xs opacity-75">
                    <span className="font-medium">Assistant</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isConnected ? "Type your message..." : "Connect to server first..."}
                disabled={!isConnected || isLoading}
                rows={1}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg resize-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                style={{
                  minHeight: '44px',
                  maxHeight: '120px'
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || !isConnected || isLoading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
