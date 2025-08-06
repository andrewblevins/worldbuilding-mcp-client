import { useState, useEffect } from 'react'
import { Link } from 'react-router'

interface ServerStatus {
  connected: boolean
  tools: string[]
}

export function HomePage() {
  const [status, setStatus] = useState<ServerStatus>({ connected: false, tools: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkServerStatus()
  }, [])

  const checkServerStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/status')
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error('Failed to check server status:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">MCP Client Web Interface</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          A modern web interface for interacting with Model Context Protocol servers through natural language
        </p>
      </div>

      <div className="mb-12">
        <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Server Status</h2>
          {loading ? (
            <div className="text-gray-600 italic">Checking connection...</div>
          ) : (
            <div className={`flex items-center gap-3 font-medium mb-6 ${
              status.connected ? 'text-green-600' : 'text-red-600'
            }`}>
              <div className={`w-3 h-3 rounded-full animate-pulse-slow ${
                status.connected ? 'bg-green-600' : 'bg-red-600'
              }`}></div>
              <span>{status.connected ? 'Connected' : 'Disconnected'}</span>
            </div>
          )}
          
          {status.connected && status.tools.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Available Tools ({status.tools.length})</h3>
              <div className="flex flex-wrap gap-2">
                {status.tools.map((tool, index) => (
                  <div key={index} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200">
                    {tool}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mb-12">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">🤖 Natural Language Interface</h3>
            <p className="text-gray-600 leading-relaxed">Chat with your MCP server using plain English. No need to learn complex commands or APIs.</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">🔧 Tool Discovery</h3>
            <p className="text-gray-600 leading-relaxed">Automatically discovers and displays all available tools from your connected MCP server.</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">⚡ Real-time Communication</h3>
            <p className="text-gray-600 leading-relaxed">WebSocket-based real-time communication for instant responses and live updates.</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">🎯 Smart Orchestration</h3>
            <p className="text-gray-600 leading-relaxed">Claude intelligently chains multiple tool calls to complete complex tasks automatically.</p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <div className="flex flex-wrap justify-center gap-4">
          {status.connected ? (
            <Link to="/chat" className="bg-gradient-primary text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
              Start Chatting
            </Link>
          ) : (
            <Link to="/settings" className="bg-gradient-primary text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
              Connect to Server
            </Link>
          )}
          <button 
            onClick={checkServerStatus} 
            className="bg-white text-gray-700 px-8 py-3 rounded-lg border-2 border-gray-200 font-semibold transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 hover:-translate-y-0.5"
          >
            Refresh Status
          </button>
        </div>
      </div>
    </div>
  )
}
