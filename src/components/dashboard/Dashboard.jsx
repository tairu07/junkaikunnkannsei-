import React from 'react'
import { TrendingUp, Heart, BarChart3, Users } from 'lucide-react'

const Dashboard = ({ 
  user, 
  isAuthenticated, 
  allStocks, 
  favorites, 
  userStats, 
  onSelectStock, 
  onToggleFavorite, 
  onViewChange 
}) => {
  const featuredStocks = allStocks.slice(0, 6)

  return (
    <div className="space-y-6">
      {/* ウェルカムセクション */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-2">
          {isAuthenticated ? `${user?.displayName}さん、おかえりなさい！` : 'ようこそ！'}
        </h1>
        <p className="text-blue-100">
          日本株チャート巡回ツール v5.0 Pro - 全{allStocks.length}銘柄対応
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">総銘柄数</p>
              <p className="text-2xl font-bold text-gray-900">{allStocks.length}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">お気に入り</p>
              <p className="text-2xl font-bold text-gray-900">{favorites.length}</p>
            </div>
            <Heart className="h-8 w-8 text-red-500" />
          </div>
        </div>

        {isAuthenticated && userStats && (
          <>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">ウォッチリスト</p>
                  <p className="text-2xl font-bold text-gray-900">{userStats.totalWatchlists}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">アラート</p>
                  <p className="text-2xl font-bold text-gray-900">{userStats.totalActiveAlerts}</p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* 注目銘柄 */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">注目銘柄</h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredStocks.map(stock => (
              <div
                key={stock.code}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  onSelectStock(stock.code)
                  onViewChange('chart')
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{stock.name}</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleFavorite(stock.code)
                    }}
                    className={`p-1 rounded ${
                      favorites.includes(stock.code)
                        ? 'text-red-500'
                        : 'text-gray-400 hover:text-red-500'
                    }`}
                  >
                    <Heart className="h-4 w-4" fill={favorites.includes(stock.code) ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <p className="text-sm text-gray-600">{stock.code}</p>
                <p className="text-xs text-gray-500">{stock.market}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* クイックアクション */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">クイックアクション</h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => onViewChange('chart')}
              className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <TrendingUp className="h-6 w-6 text-blue-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">チャート表示</p>
                <p className="text-sm text-gray-600">株価チャートを確認</p>
              </div>
            </button>

            {isAuthenticated && (
              <>
                <button
                  onClick={() => onViewChange('watchlist')}
                  className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Heart className="h-6 w-6 text-red-500" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">ウォッチリスト</p>
                    <p className="text-sm text-gray-600">銘柄を管理</p>
                  </div>
                </button>

                <button
                  onClick={() => onViewChange('alerts')}
                  className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Users className="h-6 w-6 text-purple-500" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">価格アラート</p>
                    <p className="text-sm text-gray-600">通知を設定</p>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
