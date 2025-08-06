import { Outlet, Link, useLocation } from 'react-router'

export function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gradient-primary text-white py-4 shadow-lg">
        <div className="max-w-6xl mx-auto px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold">MCP Client</h1>
          <nav className="flex gap-8">
            <Link 
              to="/" 
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:bg-white/10 hover:-translate-y-0.5 ${
                location.pathname === '/' ? 'bg-white/20 font-semibold' : ''
              }`}
            >
              Home
            </Link>
            <Link 
              to="/chat" 
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:bg-white/10 hover:-translate-y-0.5 ${
                location.pathname === '/chat' ? 'bg-white/20 font-semibold' : ''
              }`}
            >
              Chat
            </Link>
            <Link 
              to="/settings" 
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:bg-white/10 hover:-translate-y-0.5 ${
                location.pathname === '/settings' ? 'bg-white/20 font-semibold' : ''
              }`}
            >
              Settings
            </Link>
          </nav>
        </div>
      </header>
      
      <main className="flex-1 max-w-6xl mx-auto p-8 w-full">
        <Outlet />
      </main>
      
      <footer className="bg-gray-50 text-gray-600 text-center py-4 border-t border-gray-200">
        <p className="text-sm">MCP Client Web Interface - Powered by React Router & FastAPI</p>
      </footer>
    </div>
  )
}
