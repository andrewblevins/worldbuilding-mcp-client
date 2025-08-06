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
    <div className="space-y-16">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold text-gray-900 leading-tight">
          Vibe Worldbuilding
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Create rich, immersive fictional worlds through natural language conversations. Build taxonomies, generate content, and craft detailed universes with AI assistance.
        </p>
      </div>

      {/* Server Status Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Server Status</h2>
          <button 
            onClick={checkServerStatus}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Checking...' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-gray-500">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            <span>Checking connection...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                status.connected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className={`font-medium ${
                status.connected ? 'text-green-700' : 'text-red-700'
              }`}>
                {status.connected ? 'Connected' : 'Disconnected'}
              </span>
              {!status.connected && (
                <span className="text-sm text-gray-500 ml-2">
                  Make sure your MCP server is running
                </span>
              )}
            </div>

            {/* Available Tools */}
            {status.connected && status.tools.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Available Tools ({status.tools.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {status.tools.map((tool, index) => (
                    <span 
                      key={index} 
                      className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full border border-blue-200"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Features Grid */}
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-center text-gray-900">Worldbuilding Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">World Creation</h3>
            <p className="text-gray-600 leading-relaxed">
              Generate complete fictional worlds with rich lore, geography, cultures, and histories through simple conversations.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM9 7h6m-6 4h6m-7 4h8" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Taxonomy Management</h3>
            <p className="text-gray-600 leading-relaxed">
              Organize your world's elements with custom taxonomies for creatures, locations, cultures, magic systems, and more.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Content Generation</h3>
            <p className="text-gray-600 leading-relaxed">
              Create detailed entries for characters, locations, events, and lore with AI assistance and maintain consistency across your world.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Website Generation</h3>
            <p className="text-gray-600 leading-relaxed">
              Transform your world into a beautiful static website with organized content, navigation, and responsive design.
            </p>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center space-y-6">
        <div className="space-y-4">
          {status.connected ? (
            <div className="space-y-3">
              <p className="text-lg text-gray-600">Ready to start building worlds?</p>
              <Link 
                to="/chat" 
                className="inline-flex items-center px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
              >
                Start Chatting
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-lg text-gray-600">Connect to your MCP server to get started</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link 
                  to="/settings" 
                  className="inline-flex items-center px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Configure Server
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Link>
                <button 
                  onClick={checkServerStatus}
                  className="inline-flex items-center px-6 py-3 bg-white text-gray-700 font-medium rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Try Again
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Start Examples */}
        {status.connected && (
          <div className="bg-gray-50 rounded-xl p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Try these examples:</h3>
            <div className="space-y-2 text-left">
              <div className="text-sm text-gray-600 italic">"Create a fantasy world about floating crystal islands"</div>
              <div className="text-sm text-gray-600 italic">"Add a new taxonomy for magical creatures"</div>
              <div className="text-sm text-gray-600 italic">"Generate a static website for my world"</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
