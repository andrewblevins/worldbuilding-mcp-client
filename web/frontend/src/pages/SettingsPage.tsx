import { useState, useEffect } from 'react'

interface ConnectionForm {
  serverPath: string
}

interface ServerStatus {
  connected: boolean
  tools: string[]
}

export function SettingsPage() {
  const [form, setForm] = useState<ConnectionForm>({
    serverPath: '../../../vibe-worldbuilding-mcp/vibe_worldbuilding_server.py'
  })
  const [status, setStatus] = useState<ServerStatus>({ connected: false, tools: [] })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

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
    }
  }

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('http://localhost:8000/api/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          server_path: form.serverPath
        })
      })

      const result = await response.json()

      if (result.status === 'connected') {
        setMessage({ type: 'success', text: `Successfully connected! Found ${result.tools.length} tools.` })
        await checkServerStatus()
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to connect to server' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error: Could not connect to backend server' })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">Settings</h1>
        <p className="text-xl text-gray-600">Configure your MCP server connection and preferences</p>
      </div>

      <div className="flex flex-col gap-8">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Server Connection</h2>
          
          <div className="mb-8">
            <div className={`flex items-center gap-3 font-medium p-4 rounded-lg ${
              status.connected 
                ? 'bg-green-50 text-green-600 border border-green-200' 
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              <div className={`w-3 h-3 rounded-full animate-pulse-slow ${
                status.connected ? 'bg-green-600' : 'bg-red-600'
              }`}></div>
              <span>
                {status.connected ? 'Connected' : 'Disconnected'}
                {status.connected && status.tools.length > 0 && ` (${status.tools.length} tools available)`}
              </span>
            </div>
          </div>

          <form onSubmit={handleConnect} className="flex flex-col gap-6">
            <div className="space-y-2">
              <label htmlFor="serverPath" className="block text-sm font-medium text-gray-900">MCP Server Path</label>
              <input
                type="text"
                id="serverPath"
                name="serverPath"
                value={form.serverPath}
                onChange={handleInputChange}
                placeholder="Path to your MCP server script"
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              />
              <p className="text-sm text-gray-500">
                Enter the path to your MCP server script (e.g., server.py or server.js)
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !form.serverPath.trim()}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Connecting...' : status.connected ? 'Reconnect' : 'Connect'}
            </button>
          </form>

          {message && (
            <div className={`p-4 rounded-lg font-medium mt-4 ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-600 border border-green-200' 
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}
        </div>

        {status.connected && status.tools.length > 0 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Available Tools</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {status.tools.map((tool, index) => (
                <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="font-medium text-gray-900 mb-2">{tool}</div>
                  <div className="text-green-600 text-sm font-medium">✓ Ready</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Quick Start Examples</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Worldbuilding Server</h3>
              <code className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm block mb-3 break-all font-mono">
                ../../../vibe-worldbuilding-mcp/vibe_worldbuilding_server.py
              </code>
              <p className="text-gray-600 leading-relaxed text-sm">
                Connect to the worldbuilding MCP server for creating fantasy worlds, taxonomies, and generating static sites.
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Local Server</h3>
              <code className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm block mb-3 break-all font-mono">
                ./my-server.py
              </code>
              <p className="text-gray-600 leading-relaxed text-sm">
                Connect to a local MCP server in the current directory.
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Absolute Path</h3>
              <code className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm block mb-3 break-all font-mono">
                /path/to/server.py
              </code>
              <p className="text-gray-600 leading-relaxed text-sm">
                Use an absolute path to connect to any MCP server on your system.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">About MCP</h2>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <p className="text-gray-700 leading-relaxed mb-6">
              The Model Context Protocol (MCP) enables AI assistants to securely connect to external tools and data sources. 
              This web interface provides a modern way to interact with MCP servers through natural language.
            </p>
            <div className="flex flex-wrap gap-3">
              <a 
                href="https://modelcontextprotocol.io" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Learn more about MCP
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <a 
                href="https://github.com/modelcontextprotocol" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                View on GitHub
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
