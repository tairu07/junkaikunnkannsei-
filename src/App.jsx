import React, { useState, useEffect, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { toast } from 'sonner'

// 拡張APIライブラリ
import { 
  authAPI, 
  enhancedStocksAPI, 
  chartDataAPI, 
  userManagementAPI,
  enhancedFavoritesAPI,
  enhancedChartSettingsAPI,
  apiUtils
} from './lib/enhanced-api'

// コンポーネント
import LoginForm from './components/auth/LoginForm'
import RegisterForm from './components/auth/RegisterForm'
import UserProfile from './components/user/UserProfile'
import Dashboard from './components/dashboard/Dashboard'
import StockChart from './components/chart/StockChart'
import WatchlistManager from './components/watchlist/WatchlistManager'
import AlertManager from './components/alerts/AlertManager'
import Navigation from './components/layout/Navigation'
import LoadingSpinner from './components/ui/LoadingSpinner'

// アイコン
import { 
  TrendingUp, 
  User, 
  Settings, 
  Heart, 
  Bell, 
  BarChart3,
  Search,
  Menu,
  X,
  LogOut,
  Shield,
  Database
} from 'lucide-react'

function App() {
  // 認証状態
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // アプリケーション状態
  const [currentView, setCurrentView] = useState('dashboard')
  const [selectedStock, setSelectedStock] = useState('7203')
  const [allStocks, setAllStocks] = useState([])
  const [favorites, setFavorites] = useState([])
  const [chartSettings, setChartSettings] = useState(null)
  const [watchlists, setWatchlists] = useState([])
  const [alerts, setAlerts] = useState([])
  const [userStats, setUserStats] = useState(null)
  
  // UI状態
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [authMode, setAuthMode] = useState('login') // 'login' | 'register'

  // 初期化
  useEffect(() => {
    initializeApp()
    
    // オンライン状態監視
    const handleOnline = () => {
      setIsOnline(true)
      toast.success('オンラインに復帰しました')
      apiUtils.syncData()
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      toast.warning('オフラインモードです')
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // アプリケーション初期化
  const initializeApp = async () => {
    try {
      setIsLoading(true)
      
      // セッション検証
      const currentUser = await authAPI.validateSession()
      if (currentUser) {
        setUser(currentUser)
        setIsAuthenticated(true)
        await loadUserData(currentUser.id)
      }
      
      // 全銘柄データ読み込み
      const stocks = await enhancedStocksAPI.getAllStocks()
      setAllStocks(stocks)
      
      // 基本データ読み込み
      await loadBasicData()
      
    } catch (error) {
      console.error('アプリケーション初期化エラー:', error)
      toast.error('アプリケーションの初期化に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  // ユーザーデータ読み込み
  const loadUserData = async (userId) => {
    try {
      const [
        userFavorites,
        userSettings,
        userWatchlists,
        userAlerts,
        statistics
      ] = await Promise.all([
        enhancedFavoritesAPI.getFavorites(),
        enhancedChartSettingsAPI.getSettings(),
        userManagementAPI.getWatchlists(),
        userManagementAPI.getPriceAlerts(),
        userManagementAPI.getUserStatistics()
      ])
      
      setFavorites(userFavorites)
      setChartSettings(userSettings)
      setWatchlists(userWatchlists)
      setAlerts(userAlerts)
      setUserStats(statistics)
      
    } catch (error) {
      console.error('ユーザーデータ読み込みエラー:', error)
    }
  }

  // 基本データ読み込み
  const loadBasicData = async () => {
    try {
      // 認証されていない場合はローカルデータのみ
      if (!isAuthenticated) {
        const localFavorites = await enhancedFavoritesAPI.getFavorites()
        const localSettings = await enhancedChartSettingsAPI.getSettings()
        
        setFavorites(localFavorites)
        setChartSettings(localSettings)
      }
    } catch (error) {
      console.error('基本データ読み込みエラー:', error)
    }
  }

  // ログイン処理
  const handleLogin = async (credentials) => {
    try {
      const response = await authAPI.login(credentials)
      setUser(response.user)
      setIsAuthenticated(true)
      
      await loadUserData(response.user.id)
      
      toast.success(`${response.user.displayName}さん、おかえりなさい！`)
      setCurrentView('dashboard')
      
    } catch (error) {
      toast.error(error.message)
      throw error
    }
  }

  // ユーザー登録処理
  const handleRegister = async (userData) => {
    try {
      const response = await authAPI.register(userData)
      setUser(response.user)
      setIsAuthenticated(true)
      
      toast.success('アカウントを作成しました！')
      setCurrentView('dashboard')
      
    } catch (error) {
      toast.error(error.message)
      throw error
    }
  }

  // ログアウト処理
  const handleLogout = async () => {
    try {
      await authAPI.logout()
      setUser(null)
      setIsAuthenticated(false)
      setFavorites([])
      setChartSettings(null)
      setWatchlists([])
      setAlerts([])
      setUserStats(null)
      
      toast.success('ログアウトしました')
      setCurrentView('dashboard')
      
    } catch (error) {
      console.error('ログアウトエラー:', error)
    }
  }

  // お気に入り追加/削除
  const toggleFavorite = async (stockCode) => {
    try {
      const isFavorite = favorites.includes(stockCode)
      
      if (isFavorite) {
        await enhancedFavoritesAPI.removeFavorite(stockCode)
        setFavorites(prev => prev.filter(code => code !== stockCode))
        toast.success('お気に入りから削除しました')
      } else {
        await enhancedFavoritesAPI.addFavorite(stockCode)
        setFavorites(prev => [...prev, stockCode])
        toast.success('お気に入りに追加しました')
      }
      
    } catch (error) {
      toast.error('お気に入りの更新に失敗しました')
    }
  }

  // チャート設定保存
  const saveChartSettings = async (settings) => {
    try {
      await enhancedChartSettingsAPI.saveSettings(settings)
      setChartSettings(settings)
      toast.success('チャート設定を保存しました')
    } catch (error) {
      toast.error('設定の保存に失敗しました')
    }
  }

  // 銘柄検索
  const searchStocks = useCallback(async (query) => {
    if (!query.trim()) return allStocks
    
    try {
      const results = await enhancedStocksAPI.searchStocks(query)
      return results
    } catch (error) {
      console.error('銘柄検索エラー:', error)
      return allStocks.filter(stock => 
        stock.name.includes(query) || 
        stock.code.includes(query)
      )
    }
  }, [allStocks])

  // ナビゲーションメニュー
  const navigationItems = [
    { id: 'dashboard', label: 'ダッシュボード', icon: BarChart3 },
    { id: 'chart', label: 'チャート', icon: TrendingUp },
    { id: 'watchlist', label: 'ウォッチリスト', icon: Heart },
    { id: 'alerts', label: 'アラート', icon: Bell },
    { id: 'profile', label: 'プロフィール', icon: User, authRequired: true }
  ]

  // 認証が必要なビューの場合、ログインフォームを表示
  const requiresAuth = ['profile', 'watchlist', 'alerts'].includes(currentView)
  if (requiresAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <TrendingUp className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900">
                日本株チャート巡回ツール v5.0 Pro
              </h1>
              <p className="text-gray-600 mt-2">
                ログインが必要な機能です
              </p>
            </div>
            
            {authMode === 'login' ? (
              <LoginForm 
                onLogin={handleLogin}
                onSwitchToRegister={() => setAuthMode('register')}
              />
            ) : (
              <RegisterForm 
                onRegister={handleRegister}
                onSwitchToLogin={() => setAuthMode('login')}
              />
            )}
          </div>
        </div>
        <Toaster position="top-right" />
      </div>
    )
  }

  // ローディング画面
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="text-gray-600 mt-4">アプリケーションを初期化中...</p>
        </div>
      </div>
    )
  }

  // メインアプリケーション
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* ロゴ */}
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  日本株チャート巡回ツール v5.0 Pro
                </h1>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>全{allStocks.length}銘柄対応</span>
                  <span>•</span>
                  <div className="flex items-center space-x-1">
                    <Database className="h-3 w-3" />
                    <span>{isOnline ? 'オンライン' : 'オフライン'}</span>
                  </div>
                  {isAuthenticated && (
                    <>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <Shield className="h-3 w-3" />
                        <span>認証済み</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* デスクトップナビゲーション */}
            <nav className="hidden md:flex items-center space-x-6">
              {navigationItems.map(item => {
                if (item.authRequired && !isAuthenticated) return null
                
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                      currentView === item.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                )
              })}
            </nav>

            {/* ユーザーメニュー */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.displayName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user?.isPremium ? 'Premium' : 'Standard'}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="ログアウト"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAuthMode('login')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  ログイン
                </button>
              )}

              {/* モバイルメニューボタン */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-gray-400 hover:text-gray-600"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* モバイルメニュー */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <nav className="container mx-auto px-4 py-4 space-y-2">
              {navigationItems.map(item => {
                if (item.authRequired && !isAuthenticated) return null
                
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id)
                      setIsMobileMenuOpen(false)
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      currentView === item.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        )}
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-6">
        {currentView === 'dashboard' && (
          <Dashboard
            user={user}
            isAuthenticated={isAuthenticated}
            allStocks={allStocks}
            favorites={favorites}
            userStats={userStats}
            onSelectStock={setSelectedStock}
            onToggleFavorite={toggleFavorite}
            onViewChange={setCurrentView}
          />
        )}

        {currentView === 'chart' && (
          <StockChart
            selectedStock={selectedStock}
            allStocks={allStocks}
            favorites={favorites}
            chartSettings={chartSettings}
            onSelectStock={setSelectedStock}
            onToggleFavorite={toggleFavorite}
            onSaveSettings={saveChartSettings}
            searchStocks={searchStocks}
          />
        )}

        {currentView === 'watchlist' && isAuthenticated && (
          <WatchlistManager
            watchlists={watchlists}
            allStocks={allStocks}
            onWatchlistUpdate={async () => {
              const updatedWatchlists = await userManagementAPI.getWatchlists()
              setWatchlists(updatedWatchlists)
            }}
            onSelectStock={setSelectedStock}
            onViewChart={() => setCurrentView('chart')}
          />
        )}

        {currentView === 'alerts' && isAuthenticated && (
          <AlertManager
            alerts={alerts}
            allStocks={allStocks}
            onAlertUpdate={async () => {
              const updatedAlerts = await userManagementAPI.getPriceAlerts()
              setAlerts(updatedAlerts)
            }}
          />
        )}

        {currentView === 'profile' && isAuthenticated && (
          <UserProfile
            user={user}
            userStats={userStats}
            onProfileUpdate={async (profileData) => {
              await userManagementAPI.updateProfile(profileData)
              const updatedUser = { ...user, ...profileData }
              setUser(updatedUser)
              toast.success('プロフィールを更新しました')
            }}
          />
        )}

        {/* 認証フォーム（独立表示） */}
        {currentView === 'auth' && (
          <div className="max-w-md mx-auto">
            {authMode === 'login' ? (
              <LoginForm 
                onLogin={handleLogin}
                onSwitchToRegister={() => setAuthMode('register')}
              />
            ) : (
              <RegisterForm 
                onRegister={handleRegister}
                onSwitchToLogin={() => setAuthMode('login')}
              />
            )}
          </div>
        )}
      </main>

      {/* フッター */}
      <footer className="bg-white border-t mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-500">
              © 2024 日本株チャート巡回ツール v5.0 Pro - 全{allStocks.length}銘柄対応
            </div>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <span className="text-xs text-gray-400">
                {isOnline ? '🟢 オンライン' : '🔴 オフライン'}
              </span>
              {isAuthenticated && (
                <span className="text-xs text-gray-400">
                  🔐 認証済み
                </span>
              )}
            </div>
          </div>
        </div>
      </footer>

      {/* トースト通知 */}
      <Toaster position="top-right" />
    </div>
  )
}

export default App
// v5.0 Pro deployment trigger Fri Sep 26 04:00:22 EDT 2025
