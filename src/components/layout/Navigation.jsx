import React from 'react'

const Navigation = ({ currentView, onViewChange, isAuthenticated }) => {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="text-xl font-bold text-gray-900">
            日本株チャート v5.0 Pro
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => onViewChange('dashboard')}
              className={`px-3 py-2 rounded-lg ${
                currentView === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
              }`}
            >
              ダッシュボード
            </button>
            <button
              onClick={() => onViewChange('chart')}
              className={`px-3 py-2 rounded-lg ${
                currentView === 'chart' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
              }`}
            >
              チャート
            </button>
            {isAuthenticated && (
              <>
                <button
                  onClick={() => onViewChange('watchlist')}
                  className={`px-3 py-2 rounded-lg ${
                    currentView === 'watchlist' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
                  }`}
                >
                  ウォッチリスト
                </button>
                <button
                  onClick={() => onViewChange('profile')}
                  className={`px-3 py-2 rounded-lg ${
                    currentView === 'profile' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
                  }`}
                >
                  プロフィール
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
