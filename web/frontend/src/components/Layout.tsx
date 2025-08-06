import { Outlet, Link, useLocation } from 'react-router'

export function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 py-4">
        <div className="max-w-4xl mx-auto px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Vibe Worldbuilding</h1>
          <nav className="flex gap-6">
            <Link 
              to="/" 
              className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                location.pathname === '/' 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Home
            </Link>
            <Link 
              to="/chat" 
              className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                location.pathname === '/chat' 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Chat
            </Link>
            <Link 
              to="/settings" 
              className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                location.pathname === '/settings' 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Settings
            </Link>
          </nav>
        </div>
      </header>
      
      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
        <Outlet />
      </main>
      
      <footer className="bg-white text-gray-500 text-center py-6 border-t border-gray-100">
        <p className="text-sm">Vibe Worldbuilding - Create immersive fictional worlds</p>
      </footer>
    </div>
  )
}
