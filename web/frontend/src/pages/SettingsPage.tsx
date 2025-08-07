import { useState, useEffect } from 'react'

interface ServerStatus {
  connected: boolean
  tools: string[]
}

interface MultiServerStatus {
  servers: Record<string, ServerStatus>
  total_tools: number
  connected_servers: number
}

interface ServerConfig {
  script_path?: string
  command?: string
  args?: string[]
  env?: Record<string, string>
}

export function SettingsPage() {
  const [status, setStatus] = useState<MultiServerStatus>({ 
    servers: {}, 
    total_tools: 0, 
    connected_servers: 0 
  })
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [availableServers, setAvailableServers] = useState<{
    default_servers: string[]
    connected_servers: string[]
  }>({ default_servers: [], connected_servers: [] })

  useEffect(() => {
    checkServerStatus()
    getAvailableServers()
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

  const getAvailableServers = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/servers')
      const data = await response.json()
      setAvailableServers(data)
    } catch (error) {
      console.error('Failed to get available servers:', error)
    }
  }

  const handleConnect = async (serverName: string) => {
    setLoading(prev => ({ ...prev, [serverName]: true }))
    setMessage(null)

    try {
      const response = await fetch('http://localhost:8000/api/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          server_name: serverName
        })
      })

      const result = await response.json()

      if (result.status === 'connected') {
        setMessage({ 
          type: 'success', 
          text: `Successfully connected to ${serverName}! Found ${result.tools.length} tools.` 
        })
        await checkServerStatus()
        await getAvailableServers()
      } else {
        setMessage({ 
          type: 'error', 
          text: `Failed to connect to ${serverName}: ${result.message}` 
        })
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Network error: Could not connect to backend server' 
      })
    } finally {
      setLoading(prev => ({ ...prev, [serverName]: false }))
    }
  }

  const handleDisconnect = async (serverName: string) => {
    setLoading(prev => ({ ...prev, [serverName]: true }))
    setMessage(null)

    try {
      const response = await fetch(`http://localhost:8000/api/disconnect/${serverName}`, {
        method: 'POST'
      })

      const result = await response.json()

      if (result.status === 'disconnected') {
        setMessage({ 
          type: 'success', 
          text: `Successfully disconnected from ${serverName}` 
        })
        await checkServerStatus()
        await getAvailableServers()
      } else {
        setMessage({ 
          type: 'error', 
          text: `Failed to disconnect from ${serverName}: ${result.message}` 
        })
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Network error: Could not connect to backend server' 
      })
    } finally {
      setLoading(prev => ({ ...prev, [serverName]: false }))
    }
  }

  const getServerDescription = (serverName: string) => {
    switch (serverName) {
      case 'worldbuilding':
        return 'Create fantasy worlds, taxonomies, characters, and generate static sites'
      case 'filesystem':
        return 'Read, write, and manage files in your worldbuilding directory'
      default:
        return 'Custom MCP server'
    }
  }

  const getServerIcon = (serverName: string) => {
    switch (serverName) {
      case 'worldbuilding':
        return '🌍'
      case 'filesystem':
        return '📁'
      default:
        return '🔧'
    }
  }

  return (
    <div className="space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">Settings</h1>
        <p className="text-xl text-gray-600">Manage your MCP server connections and preferences</p>
      </div>

      <div className="flex flex-col gap-8">
        {/* Overall Status */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Connection Overview</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{status.connected_servers}</div>
              <div className="text-sm font-medium text-gray-600">Connected Servers</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{status.total_tools}</div>
              <div className="text-sm font-medium text-gray-600">Available Tools</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">{availableServers.default_servers.length}</div>
              <div className="text-sm font-medium text-gray-600">Available Servers</div>
            </div>
          </div>

          <div className={`flex items-center gap-3 font-medium p-4 rounded-lg ${
            status.connected_servers > 0
              ? 'bg-green-50 text-green-600 border border-green-200' 
              : 'bg-red-50 text-red-600 border border-red-200'
          }`}>
            <div className={`w-3 h-3 rounded-full animate-pulse-slow ${
              status.connected_servers > 0 ? 'bg-green-600' : 'bg-red-600'
            }`}></div>
            <span>
              {status.connected_servers > 0 
                ? `${status.connected_servers} server${status.connected_servers > 1 ? 's' : ''} connected`
                : 'No servers connected'
              }
            </span>
          </div>
        </div>

        {/* Server Management */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Server Management</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {availableServers.default_servers.map((serverName) => {
              const serverStatus = status.servers[serverName]
              const isConnected = serverStatus?.connected || false
              const isLoading = loading[serverName] || false
              
              return (
                <div key={serverName} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getServerIcon(serverName)}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 capitalize">
                          {serverName} Server
                        </h3>
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                          isConnected 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            isConnected ? 'bg-green-500' : 'bg-gray-400'
                          }`}></div>
                          {isConnected ? 'Connected' : 'Disconnected'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                    {getServerDescription(serverName)}
                  </p>
                  
                  {isConnected && serverStatus?.tools && (
                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Available Tools ({serverStatus.tools.length})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {serverStatus.tools.slice(0, 3).map((tool, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md font-medium">
                            {tool}
                          </span>
                        ))}
                        {serverStatus.tools.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">
                            +{serverStatus.tools.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    {isConnected ? (
                      <button
                        onClick={() => handleDisconnect(serverName)}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {isLoading ? 'Disconnecting...' : 'Disconnect'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(serverName)}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {isLoading ? 'Connecting...' : 'Connect'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {message && (
            <div className={`p-4 rounded-lg font-medium mt-6 ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-600 border border-green-200' 
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}
        </div>

        {/* All Available Tools */}
        {status.total_tools > 0 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">All Available Tools</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(status.servers).map(([serverName, serverStatus]) => 
                serverStatus.connected && serverStatus.tools.map((tool, index) => (
                  <div key={`${serverName}-${tool}-${index}`} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-gray-900">{tool}</div>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                        {serverName}
                      </span>
                    </div>
                    <div className="text-green-600 text-sm font-medium">✓ Ready</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Multi-Server Benefits */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Multi-Server Architecture</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">🌍 Worldbuilding Server</h3>
              <p className="text-gray-700 leading-relaxed text-sm mb-4">
                Specialized tools for creating fantasy worlds, managing taxonomies, generating content, and building static sites.
              </p>
              <div className="text-xs text-blue-600 font-medium">
                Perfect for creative worldbuilding projects
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">📁 Filesystem Server</h3>
              <p className="text-gray-700 leading-relaxed text-sm mb-4">
                General-purpose file operations including reading, writing, creating directories, and searching files.
              </p>
              <div className="text-xs text-green-600 font-medium">
                Essential for file management tasks
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-gray-700 text-sm leading-relaxed">
              <strong>Why Multi-Server?</strong> This architecture keeps each server focused on its specialty while allowing you to use them together. 
              The worldbuilding server stays clean and focused, while the filesystem server provides general file operations. 
              Both can be used independently in other MCP clients like Claude Desktop.
            </p>
          </div>
        </div>

        {/* About MCP */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">About MCP</h2>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <p className="text-gray-700 leading-relaxed mb-6">
              The Model Context Protocol (MCP) enables AI assistants to securely connect to external tools and data sources. 
              This web interface provides a modern way to interact with multiple MCP servers simultaneously through natural language.
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
