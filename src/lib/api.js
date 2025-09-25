// API連携ライブラリ
// Vercel Functions との通信を管理

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' // 本番環境では相対パス
  : 'http://localhost:3000' // 開発環境

// APIリクエストのヘルパー関数
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}/api${endpoint}`
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  }

  const config = {
    ...defaultOptions,
    ...options
  }

  try {
    console.log(`🌐 API Request: ${config.method || 'GET'} ${url}`)
    
    const response = await fetch(url, config)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'API request failed')
    }
    
    return data
  } catch (error) {
    console.error(`❌ API Error for ${endpoint}:`, error)
    throw error
  }
}

// 株価データAPI
export const stocksAPI = {
  // 銘柄一覧を取得
  async getStocksList() {
    try {
      const response = await apiRequest('/stocks?action=list')
      return response.data || []
    } catch (error) {
      console.warn('⚠️ Failed to fetch stocks list, using fallback')
      return getFallbackStocks()
    }
  },

  // 個別銘柄の詳細データを取得
  async getStockDetail(stockCode) {
    try {
      const response = await apiRequest(`/stocks?action=detail&code=${stockCode}`)
      return response.data
    } catch (error) {
      console.warn(`⚠️ Failed to fetch stock detail for ${stockCode}, using fallback`)
      return getFallbackStockDetail(stockCode)
    }
  },

  // チャートデータを取得
  async getChartData(stockCode, days = 250) {
    try {
      const response = await apiRequest(`/stocks?action=chart&code=${stockCode}&days=${days}`)
      return response.data || []
    } catch (error) {
      console.warn(`⚠️ Failed to fetch chart data for ${stockCode}, using fallback`)
      return getFallbackChartData(stockCode, days)
    }
  }
}

// お気に入りAPI
export const favoritesAPI = {
  // お気に入り一覧を取得
  async getFavorites(userId = 'anonymous') {
    try {
      const response = await apiRequest(`/favorites?userId=${userId}`)
      return response.data || []
    } catch (error) {
      console.warn('⚠️ Failed to fetch favorites, using localStorage fallback')
      return getLocalStorageFavorites()
    }
  },

  // お気に入りに追加
  async addFavorite(stockCode, userId = 'anonymous') {
    try {
      await apiRequest('/favorites', {
        method: 'POST',
        body: JSON.stringify({ stockCode })
      })
      return true
    } catch (error) {
      console.warn('⚠️ Failed to add favorite to server, using localStorage fallback')
      return addLocalStorageFavorite(stockCode)
    }
  },

  // お気に入りから削除
  async removeFavorite(stockCode, userId = 'anonymous') {
    try {
      await apiRequest('/favorites', {
        method: 'DELETE',
        body: JSON.stringify({ stockCode })
      })
      return true
    } catch (error) {
      console.warn('⚠️ Failed to remove favorite from server, using localStorage fallback')
      return removeLocalStorageFavorite(stockCode)
    }
  },

  // お気に入りの順序を更新
  async updateFavoritesOrder(favorites, userId = 'anonymous') {
    try {
      await apiRequest('/favorites', {
        method: 'PUT',
        body: JSON.stringify({ favorites })
      })
      return true
    } catch (error) {
      console.warn('⚠️ Failed to update favorites order on server, using localStorage fallback')
      return updateLocalStorageFavoritesOrder(favorites)
    }
  }
}

// チャート設定API
export const chartSettingsAPI = {
  // チャート設定を取得
  async getSettings(userId = 'anonymous') {
    try {
      const response = await apiRequest(`/chart-settings?userId=${userId}`)
      return response.data || getDefaultSettings()
    } catch (error) {
      console.warn('⚠️ Failed to fetch chart settings, using defaults')
      return getDefaultSettings()
    }
  },

  // チャート設定を保存
  async saveSettings(settings, userId = 'anonymous') {
    try {
      await apiRequest('/chart-settings', {
        method: 'POST',
        body: JSON.stringify({ settings })
      })
      return true
    } catch (error) {
      console.warn('⚠️ Failed to save chart settings to server')
      return false
    }
  },

  // チャート設定をリセット
  async resetSettings(userId = 'anonymous') {
    try {
      await apiRequest(`/chart-settings?userId=${userId}`, {
        method: 'DELETE'
      })
      return getDefaultSettings()
    } catch (error) {
      console.warn('⚠️ Failed to reset chart settings on server')
      return getDefaultSettings()
    }
  }
}

// フォールバック関数群
function getFallbackStocks() {
  return [
    { code: '1301', name: '極洋', market: 'PRIME', basePrice: 1500, price: 1482, change: -18, changePercent: -1.21 },
    { code: '1332', name: '日本水産', market: 'PRIME', basePrice: 1900, price: 1876, change: -24, changePercent: -1.26 },
    { code: '1801', name: '大成建設', market: 'PRIME', basePrice: 1950, price: 1965, change: 15, changePercent: 0.77 },
    { code: '2269', name: '明治ホールディングス', market: 'PRIME', basePrice: 2800, price: 2834, change: 34, changePercent: 1.21 },
    { code: '2503', name: 'キリンホールディングス', market: 'PRIME', basePrice: 2100, price: 2087, change: -13, changePercent: -0.62 },
    { code: '4502', name: '武田薬品工業', market: 'PRIME', basePrice: 4000, price: 4056, change: 56, changePercent: 1.40 },
    { code: '6501', name: '日立製作所', market: 'PRIME', basePrice: 3500, price: 3478, change: -22, changePercent: -0.63 },
    { code: '6758', name: 'ソニーグループ', market: 'PRIME', basePrice: 13000, price: 13145, change: 145, changePercent: 1.12 },
    { code: '7203', name: 'トヨタ自動車', market: 'PRIME', basePrice: 2800, price: 2789, change: -11, changePercent: -0.39 },
    { code: '7974', name: '任天堂', market: 'PRIME', basePrice: 7500, price: 7623, change: 123, changePercent: 1.64 },
    { code: '8306', name: '三菱UFJ', market: 'PRIME', basePrice: 1300, price: 1287, change: -13, changePercent: -1.00 },
    { code: '9432', name: 'NTT', market: 'PRIME', basePrice: 180, price: 182, change: 2, changePercent: 1.11 },
    { code: '9433', name: 'KDDI', market: 'PRIME', basePrice: 4200, price: 4178, change: -22, changePercent: -0.52 },
    { code: '9984', name: 'ソフトバンクG', market: 'PRIME', basePrice: 7500, price: 7634, change: 134, changePercent: 1.79 }
  ]
}

function getFallbackStockDetail(stockCode) {
  const stocks = getFallbackStocks()
  return stocks.find(stock => stock.code === stockCode) || stocks[0]
}

function getFallbackChartData(stockCode, days) {
  const stock = getFallbackStockDetail(stockCode)
  const data = []
  let currentPrice = stock.basePrice
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    
    const volatility = 0.02
    const change = (Math.random() - 0.5) * volatility
    currentPrice = Math.max(currentPrice * (1 + change), stock.basePrice * 0.3)
    
    const open = currentPrice
    const high = open * (1 + Math.random() * 0.03)
    const low = open * (1 - Math.random() * 0.03)
    const close = low + Math.random() * (high - low)
    const volume = Math.floor(Math.random() * 1000000) + 50000
    
    data.push({
      date: date.toISOString().split('T')[0],
      open: Math.round(open),
      high: Math.round(high),
      low: Math.round(low),
      close: Math.round(close),
      volume: volume
    })
    
    currentPrice = close
  }
  
  return data
}

// ローカルストレージフォールバック関数
function getLocalStorageFavorites() {
  try {
    const favorites = localStorage.getItem('stockFavorites')
    return favorites ? JSON.parse(favorites) : []
  } catch (error) {
    console.error('Failed to load favorites from localStorage:', error)
    return []
  }
}

function addLocalStorageFavorite(stockCode) {
  try {
    const favorites = getLocalStorageFavorites()
    if (!favorites.includes(stockCode)) {
      favorites.push(stockCode)
      localStorage.setItem('stockFavorites', JSON.stringify(favorites))
    }
    return true
  } catch (error) {
    console.error('Failed to add favorite to localStorage:', error)
    return false
  }
}

function removeLocalStorageFavorite(stockCode) {
  try {
    const favorites = getLocalStorageFavorites()
    const updatedFavorites = favorites.filter(code => code !== stockCode)
    localStorage.setItem('stockFavorites', JSON.stringify(updatedFavorites))
    return true
  } catch (error) {
    console.error('Failed to remove favorite from localStorage:', error)
    return false
  }
}

function updateLocalStorageFavoritesOrder(favorites) {
  try {
    localStorage.setItem('stockFavorites', JSON.stringify(favorites))
    return true
  } catch (error) {
    console.error('Failed to update favorites order in localStorage:', error)
    return false
  }
}

function getDefaultSettings() {
  return {
    period: '1Y',
    timeframe: 'daily',
    indicators: {
      movingAverages: true,
      bollingerBands: true,
      rsi: false,
      macd: false
    },
    indicatorParams: {
      sma: {
        short: 5,
        medium: 25,
        long: 75
      },
      bollinger: {
        period: 20,
        stdDev: 2
      },
      rsi: {
        period: 14
      },
      macd: {
        fast: 12,
        slow: 26,
        signal: 9
      }
    }
  }
}
