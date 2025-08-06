import { useState, useEffect, useRef } from 'react'

interface Message {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
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
      addSystemMessage('Connected to MCP server')
    }
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      if (data.type === 'status') {
        addSystemMessage(data.message)
      } else if (data.type === 'response') {
        setIsLoading(false)
        addAssistantMessage(data.data.response, data.data.tool_calls)
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
  }

  return (
    <div className="h-[calc(100vh-12.5rem)] flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 pb-4 border-b border-gray-200 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">MCP Chat Interface</h1>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 font-medium px-4 py-2 rounded-lg text-sm ${
            isConnected 
              ? 'bg-green-50 text-green-600 border border-green-200' 
              : 'bg-red-50 text-red-600 border border-red-200'
          }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse-slow ${
              isConnected ? 'bg-green-600' : 'bg-red-600'
            }`}></div>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          <button 
            onClick={clearChat} 
            className="bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-lg text-sm transition-all duration-200 hover:bg-gray-100 hover:border-gray-300"
          >
            Clear Chat
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 chat-scrollbar">
          {messages.length === 0 && (
            <div className="text-center text-gray-600 p-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Welcome to MCP Chat!</h3>
              <p className="mb-4">Start a conversation with your MCP server. Try asking:</p>
              <ul className="text-left max-w-md mx-auto space-y-2">
                <li className="italic">"Create a fantasy world about floating islands"</li>
                <li className="italic">"Add a new taxonomy for magical creatures"</li>
                <li className="italic">"Generate a static website for my world"</li>
              </ul>
            </div>
          )}
          
          {messages.map((message) => (
            <div key={message.id} className={`max-w-[80%] p-4 rounded-2xl relative ${
              message.type === 'user' 
                ? 'self-end bg-gradient-primary text-white' 
                : message.type === 'assistant'
                ? 'self-start bg-gray-50 text-gray-800 border border-gray-200'
                : 'self-center bg-yellow-50 text-yellow-800 border border-yellow-200 text-sm max-w-[60%]'
            }`}>
              <div className="flex justify-between items-center mb-2 text-xs opacity-80">
                <span className="font-semibold">
                  {message.type === 'user' ? 'You' : 
                   message.type === 'assistant' ? 'Assistant' : 'System'}
                </span>
                <span className="text-xs">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <div className="leading-relaxed whitespace-pre-wrap">
                {message.content}
              </div>
              {message.toolCalls && message.toolCalls.length > 0 && (
                <div className={`mt-4 pt-4 border-t ${
                  message.type === 'user' ? 'border-white/20' : 'border-gray-200'
                }`}>
                  <h4 className="text-sm font-medium mb-2 opacity-80">Tool Calls:</h4>
                  {message.toolCalls.map((call, index) => (
                    <div key={index} className={`text-sm p-2 rounded-lg mb-2 ${
                      message.type === 'user' ? 'bg-white/10' : 'bg-gray-100'
                    }`}>
                      <div className="font-semibold mb-1">{call.tool}</div>
                      {call.error ? (
                        <div className="text-red-600">Error: {call.error}</div>
                      ) : (
                        <div className="text-green-600">✓ Executed successfully</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="max-w-[80%] self-start bg-gray-50 text-gray-800 border border-gray-200 p-4 rounded-2xl">
              <div className="flex justify-between items-center mb-2 text-xs opacity-80">
                <span className="font-semibold">Assistant</span>
              </div>
              <div className="leading-relaxed">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-typing"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-typing"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-typing"></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isConnected ? "Type your message..." : "Connect to server first..."}
              disabled={!isConnected || isLoading}
              rows={1}
              className="flex-1 p-3 border border-gray-200 rounded-lg resize-none font-inherit text-base leading-6 min-h-[44px] max-h-[120px] transition-colors duration-200 focus:outline-none focus:border-primary-500 focus:ring-3 focus:ring-primary-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || !isConnected || isLoading}
              className="bg-gradient-primary text-white border-none px-6 py-3 rounded-lg font-semibold cursor-pointer transition-all duration-200 h-[44px] hover:not-disabled:-translate-y-0.5 hover:not-disabled:shadow-lg disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
