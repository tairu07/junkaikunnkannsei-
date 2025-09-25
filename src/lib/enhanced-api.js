/**
 * 拡張API連携ライブラリ
 * 認証、ユーザー管理、チャートデータ管理機能
 */

// API基底URL
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://japanese-stock-chart.vercel.app/api'
  : '/api'

// ローカルストレージキー
const STORAGE_KEYS = {
  AUTH_TOKEN: 'stock_chart_auth_token',
  USER_DATA: 'stock_chart_user_data',
  FAVORITES: 'stock_chart_favorites',
  CHART_SETTINGS: 'stock_chart_settings',
  WATCHLISTS: 'stock_chart_watchlists',
  ALERTS: 'stock_chart_alerts'
}

// HTTP リクエストヘルパー
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  }
  
  // 認証トークンを自動追加
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
  if (token) {
    defaultOptions.headers.Authorization = `Bearer ${token}`
  }
  
  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  }
  
  try {
    const response = await fetch(url, config)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error(`API Request Error (${endpoint}):`, error)
    throw error
  }
}

// 認証API
export const authAPI = {
  // ユーザー登録
  async register(userData) {
    try {
      const response = await apiRequest('/auth?action=register', {
        method: 'POST',
        body: JSON.stringify(userData)
      })
      
      if (response.token) {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.token)
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response.user))
      }
      
      return response
    } catch (error) {
      throw new Error(`ユーザー登録エラー: ${error.message}`)
    }
  },
  
  // ログイン
  async login(credentials) {
    try {
      const response = await apiRequest('/auth?action=login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      })
      
      if (response.token) {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.token)
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response.user))
      }
      
      return response
    } catch (error) {
      throw new Error(`ログインエラー: ${error.message}`)
    }
  },
  
  // ログアウト
  async logout() {
    try {
      await apiRequest('/auth?action=logout', {
        method: 'POST'
      })
    } catch (error) {
      console.warn('ログアウトAPI呼び出しエラー:', error)
    } finally {
      // ローカルデータをクリア
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
      localStorage.removeItem(STORAGE_KEYS.USER_DATA)
    }
  },
  
  // ユーザー情報取得
  async getProfile() {
    try {
      const response = await apiRequest('/auth?action=profile')
      
      if (response.user) {
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response.user))
      }
      
      return response.user
    } catch (error) {
      // フォールバック: ローカルストレージから取得
      const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA)
      if (userData) {
        return JSON.parse(userData)
      }
      throw error
    }
  },
  
  // セッション検証
  async validateSession() {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
    if (!token) {
      return null
    }
    
    try {
      const response = await apiRequest('/auth?action=validate', {
        method: 'POST',
        body: JSON.stringify({ token })
      })
      
      return response.user
    } catch (error) {
      // トークンが無効な場合はクリア
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
      localStorage.removeItem(STORAGE_KEYS.USER_DATA)
      return null
    }
  },
  
  // 現在のユーザー情報をローカルから取得
  getCurrentUser() {
    const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA)
    return userData ? JSON.parse(userData) : null
  },
  
  // ログイン状態確認
  isAuthenticated() {
    return !!localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
  }
}

// 拡張株価API
export const enhancedStocksAPI = {
  // 全銘柄一覧取得
  async getAllStocks() {
    try {
      const response = await apiRequest('/stocks?action=list')
      return response.stocks || []
    } catch (error) {
      // フォールバック: ローカルデータ
      try {
        const localData = await fetch('/data/all_stocks.json')
        return await localData.json()
      } catch (localError) {
        console.warn('ローカルデータ取得エラー:', localError)
        return []
      }
    }
  },
  
  // 銘柄検索
  async searchStocks(query) {
    try {
      const response = await apiRequest(`/stocks?action=search&query=${encodeURIComponent(query)}`)
      return response.stocks || []
    } catch (error) {
      // フォールバック: 全銘柄から検索
      const allStocks = await this.getAllStocks()
      return allStocks.filter(stock => 
        stock.name.includes(query) || 
        stock.code.includes(query) ||
        (stock.sector && stock.sector.includes(query))
      )
    }
  },
  
  // 市場別銘柄取得
  async getStocksByMarket(market) {
    try {
      const response = await apiRequest(`/stocks?action=by-market&market=${market}`)
      return response.stocks || []
    } catch (error) {
      const allStocks = await this.getAllStocks()
      return allStocks.filter(stock => stock.market === market)
    }
  },
  
  // 業種別銘柄取得
  async getStocksBySector(sector) {
    try {
      const response = await apiRequest(`/stocks?action=by-sector&sector=${encodeURIComponent(sector)}`)
      return response.stocks || []
    } catch (error) {
      const allStocks = await this.getAllStocks()
      return allStocks.filter(stock => stock.sector === sector)
    }
  }
}

// チャートデータAPI
export const chartDataAPI = {
  // チャートデータ取得
  async getChartData(stockCode, days = 250) {
    try {
      const response = await apiRequest(`/chart-data?action=get-chart-data&stockCode=${stockCode}&days=${days}`)
      return response.chartData || []
    } catch (error) {
      // フォールバック: ローカルファイル
      try {
        const localData = await fetch(`/data/charts/${stockCode}.json`)
        const data = await localData.json()
        return data.slice(-days)
      } catch (localError) {
        console.warn('チャートデータ取得エラー:', localError)
        return []
      }
    }
  },
  
  // チャート設定保存
  async saveChartConfiguration(stockCode, chartConfig) {
    const user = authAPI.getCurrentUser()
    if (!user) {
      throw new Error('ログインが必要です')
    }
    
    try {
      const response = await apiRequest('/chart-data?action=save-chart-config', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          stockCode,
          chartConfig
        })
      })
      
      return response
    } catch (error) {
      // フォールバック: ローカルストレージ
      const savedCharts = JSON.parse(localStorage.getItem('saved_charts') || '[]')
      const newChart = {
        id: Date.now().toString(),
        stockCode,
        chartConfig,
        createdAt: new Date().toISOString()
      }
      savedCharts.push(newChart)
      localStorage.setItem('saved_charts', JSON.stringify(savedCharts))
      
      return { success: true, chartId: newChart.id }
    }
  },
  
  // 保存されたチャート設定取得
  async getSavedChartConfigurations(stockCode = null) {
    const user = authAPI.getCurrentUser()
    if (!user) {
      return []
    }
    
    try {
      const params = new URLSearchParams({
        action: 'get-saved-charts',
        userId: user.id
      })
      
      if (stockCode) {
        params.append('stockCode', stockCode)
      }
      
      const response = await apiRequest(`/chart-data?${params}`)
      return response.savedCharts || []
    } catch (error) {
      // フォールバック: ローカルストレージ
      const savedCharts = JSON.parse(localStorage.getItem('saved_charts') || '[]')
      return stockCode 
        ? savedCharts.filter(chart => chart.stockCode === stockCode)
        : savedCharts
    }
  }
}

// ユーザー管理API
export const userManagementAPI = {
  // プロフィール更新
  async updateProfile(profileData) {
    const user = authAPI.getCurrentUser()
    if (!user) {
      throw new Error('ログインが必要です')
    }
    
    try {
      const response = await apiRequest('/user-management?action=update-profile', {
        method: 'PUT',
        body: JSON.stringify({ userId: user.id, ...profileData })
      })
      
      // ローカルユーザーデータも更新
      const updatedUser = { ...user, ...profileData }
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser))
      
      return response
    } catch (error) {
      throw new Error(`プロフィール更新エラー: ${error.message}`)
    }
  },
  
  // ユーザー統計取得
  async getUserStatistics() {
    const user = authAPI.getCurrentUser()
    if (!user) {
      return null
    }
    
    try {
      const response = await apiRequest(`/user-management?action=get-statistics&userId=${user.id}`)
      return response.statistics
    } catch (error) {
      // フォールバック: デフォルト統計
      return {
        totalFavorites: 0,
        totalWatchlists: 0,
        totalPortfolios: 0,
        totalTransactions: 0,
        totalSavedCharts: 0,
        totalActiveAlerts: 0,
        recentActivities: []
      }
    }
  },
  
  // ウォッチリスト管理
  async manageWatchlist(action, watchlistData) {
    const user = authAPI.getCurrentUser()
    if (!user) {
      throw new Error('ログインが必要です')
    }
    
    try {
      const response = await apiRequest('/user-management?action=manage-watchlist', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          watchlistAction: action,
          watchlistData
        })
      })
      
      return response
    } catch (error) {
      // フォールバック: ローカルストレージ
      const watchlists = JSON.parse(localStorage.getItem(STORAGE_KEYS.WATCHLISTS) || '[]')
      
      switch (action) {
        case 'create':
          const newWatchlist = {
            id: Date.now().toString(),
            ...watchlistData,
            createdAt: new Date().toISOString()
          }
          watchlists.push(newWatchlist)
          break
        case 'update':
          const updateIndex = watchlists.findIndex(w => w.id === watchlistData.id)
          if (updateIndex !== -1) {
            watchlists[updateIndex] = { ...watchlists[updateIndex], ...watchlistData }
          }
          break
        case 'delete':
          const deleteIndex = watchlists.findIndex(w => w.id === watchlistData.id)
          if (deleteIndex !== -1) {
            watchlists.splice(deleteIndex, 1)
          }
          break
      }
      
      localStorage.setItem(STORAGE_KEYS.WATCHLISTS, JSON.stringify(watchlists))
      return { success: true }
    }
  },
  
  // ウォッチリスト一覧取得
  async getWatchlists() {
    const user = authAPI.getCurrentUser()
    if (!user) {
      return []
    }
    
    try {
      const response = await apiRequest(`/user-management?action=get-watchlists&userId=${user.id}`)
      return response.watchlists || []
    } catch (error) {
      // フォールバック: ローカルストレージ
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.WATCHLISTS) || '[]')
    }
  },
  
  // 価格アラート管理
  async managePriceAlert(action, alertData) {
    const user = authAPI.getCurrentUser()
    if (!user) {
      throw new Error('ログインが必要です')
    }
    
    try {
      const response = await apiRequest('/user-management?action=manage-alert', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          alertAction: action,
          alertData
        })
      })
      
      return response
    } catch (error) {
      // フォールバック: ローカルストレージ
      const alerts = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALERTS) || '[]')
      
      switch (action) {
        case 'create':
          const newAlert = {
            id: Date.now().toString(),
            ...alertData,
            createdAt: new Date().toISOString()
          }
          alerts.push(newAlert)
          break
        case 'update':
          const updateIndex = alerts.findIndex(a => a.id === alertData.id)
          if (updateIndex !== -1) {
            alerts[updateIndex] = { ...alerts[updateIndex], ...alertData }
          }
          break
        case 'delete':
          const deleteIndex = alerts.findIndex(a => a.id === alertData.id)
          if (deleteIndex !== -1) {
            alerts.splice(deleteIndex, 1)
          }
          break
        case 'toggle':
          const toggleIndex = alerts.findIndex(a => a.id === alertData.id)
          if (toggleIndex !== -1) {
            alerts[toggleIndex].isActive = alertData.isActive
          }
          break
      }
      
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts))
      return { success: true }
    }
  },
  
  // 価格アラート一覧取得
  async getPriceAlerts() {
    const user = authAPI.getCurrentUser()
    if (!user) {
      return []
    }
    
    try {
      const response = await apiRequest(`/user-management?action=get-alerts&userId=${user.id}`)
      return response.alerts || []
    } catch (error) {
      // フォールバック: ローカルストレージ
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.ALERTS) || '[]')
    }
  }
}

// 拡張お気に入りAPI（ユーザー認証対応）
export const enhancedFavoritesAPI = {
  // お気に入り一覧取得
  async getFavorites() {
    const user = authAPI.getCurrentUser()
    
    if (user) {
      try {
        const response = await apiRequest(`/favorites?action=list&userId=${user.id}`)
        return response.favorites || []
      } catch (error) {
        console.warn('サーバーからのお気に入り取得エラー:', error)
      }
    }
    
    // フォールバック: ローカルストレージ
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '[]')
  },
  
  // お気に入り追加
  async addFavorite(stockCode) {
    const user = authAPI.getCurrentUser()
    
    if (user) {
      try {
        const response = await apiRequest('/favorites?action=add', {
          method: 'POST',
          body: JSON.stringify({ userId: user.id, stockCode })
        })
        return response
      } catch (error) {
        console.warn('サーバーへのお気に入り追加エラー:', error)
      }
    }
    
    // フォールバック: ローカルストレージ
    const favorites = await this.getFavorites()
    if (!favorites.includes(stockCode)) {
      favorites.push(stockCode)
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites))
    }
    
    return { success: true }
  },
  
  // お気に入り削除
  async removeFavorite(stockCode) {
    const user = authAPI.getCurrentUser()
    
    if (user) {
      try {
        const response = await apiRequest('/favorites?action=remove', {
          method: 'POST',
          body: JSON.stringify({ userId: user.id, stockCode })
        })
        return response
      } catch (error) {
        console.warn('サーバーからのお気に入り削除エラー:', error)
      }
    }
    
    // フォールバック: ローカルストレージ
    const favorites = await this.getFavorites()
    const updatedFavorites = favorites.filter(code => code !== stockCode)
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updatedFavorites))
    
    return { success: true }
  }
}

// 拡張チャート設定API（ユーザー認証対応）
export const enhancedChartSettingsAPI = {
  // 設定取得
  async getSettings() {
    const user = authAPI.getCurrentUser()
    
    if (user) {
      try {
        const response = await apiRequest(`/chart-settings?action=get&userId=${user.id}`)
        return response.settings
      } catch (error) {
        console.warn('サーバーからの設定取得エラー:', error)
      }
    }
    
    // フォールバック: ローカルストレージ
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CHART_SETTINGS) || 'null')
  },
  
  // 設定保存
  async saveSettings(settings) {
    const user = authAPI.getCurrentUser()
    
    if (user) {
      try {
        const response = await apiRequest('/chart-settings?action=save', {
          method: 'POST',
          body: JSON.stringify({ userId: user.id, settings })
        })
        
        // ローカルにも保存
        localStorage.setItem(STORAGE_KEYS.CHART_SETTINGS, JSON.stringify(settings))
        
        return response
      } catch (error) {
        console.warn('サーバーへの設定保存エラー:', error)
      }
    }
    
    // フォールバック: ローカルストレージ
    localStorage.setItem(STORAGE_KEYS.CHART_SETTINGS, JSON.stringify(settings))
    return { success: true }
  }
}

// ユーティリティ関数
export const apiUtils = {
  // オンライン状態確認
  isOnline() {
    return navigator.onLine
  },
  
  // ローカルデータクリア
  clearLocalData() {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  },
  
  // データ同期（オンライン復帰時）
  async syncData() {
    if (!this.isOnline() || !authAPI.isAuthenticated()) {
      return
    }
    
    try {
      // お気に入りの同期
      const localFavorites = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '[]')
      const serverFavorites = await enhancedFavoritesAPI.getFavorites()
      
      // 差分があれば同期
      const favoritesToAdd = localFavorites.filter(code => !serverFavorites.includes(code))
      for (const code of favoritesToAdd) {
        await enhancedFavoritesAPI.addFavorite(code)
      }
      
      // 設定の同期
      const localSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHART_SETTINGS) || 'null')
      if (localSettings) {
        await enhancedChartSettingsAPI.saveSettings(localSettings)
      }
      
      console.log('データ同期完了')
    } catch (error) {
      console.error('データ同期エラー:', error)
    }
  }
}
