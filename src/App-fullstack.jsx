import { useState, useEffect } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, ReferenceLine } from 'recharts'
import { calculateAllIndicators } from './utils/technicalIndicators'
import { stocksAPI, favoritesAPI, chartSettingsAPI } from './lib/api'

// 表示期間オプション
const PERIOD_OPTIONS = [
  { value: '6M', label: '6ヶ月', days: 130 },
  { value: '1Y', label: '1年', days: 250 },
  { value: '3Y', label: '3年', days: 750 },
  { value: '5Y', label: '5年', days: 1250 },
  { value: '10Y', label: '10年', days: 2500 }
]

// 時間軸オプション
const TIMEFRAME_OPTIONS = [
  { value: 'daily', label: '日足' },
  { value: 'weekly', label: '週足' },
  { value: 'monthly', label: '月足' }
]

// カスタムローソク足チャート（テクニカル指標付き）
const CandlestickChart = ({ data, indicators, width, height, showIndicators }) => {
  const margin = { top: 20, right: 30, bottom: 20, left: 60 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom
  
  // データの最大値と最小値を計算（ボリンジャーバンドも考慮）
  const allPrices = data.flatMap(d => [d.open, d.high, d.low, d.close])
  if (showIndicators.bollingerBands && indicators.bollingerBands) {
    indicators.bollingerBands.upper.forEach(val => val && allPrices.push(val))
    indicators.bollingerBands.lower.forEach(val => val && allPrices.push(val))
  }
  
  const minPrice = Math.min(...allPrices)
  const maxPrice = Math.max(...allPrices)
  const priceRange = maxPrice - minPrice
  const padding = priceRange * 0.1
  const yMin = Math.max(0, minPrice - padding)
  const yMax = maxPrice + padding
  const yRange = yMax - yMin
  
  // X軸の計算
  const candleWidth = Math.max(chartWidth / data.length * 0.7, 3)
  const candleSpacing = chartWidth / data.length
  
  // パスデータを生成するヘルパー関数
  const generatePath = (values) => {
    let path = ''
    let started = false
    
    for (let index = 0; index < data.length; index++) {
      const value = values[index]
      if (value !== null && value !== undefined && !isNaN(value)) {
        const x = margin.left + index * candleSpacing + candleSpacing / 2
        const y = margin.top + ((yMax - value) / yRange) * chartHeight
        
        if (!started) {
          path += `M ${x} ${y}`
          started = true
        } else {
          path += ` L ${x} ${y}`
        }
      }
    }
    
    return path
  }
  
  return (
    <svg width={width} height={height}>
      {/* 背景 */}
      <rect width={width} height={height} fill="white" />
      
      {/* グリッド線 */}
      <g>
        {/* 水平グリッド線 */}
        {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const y = margin.top + chartHeight * ratio
          return (
            <line
              key={ratio}
              x1={margin.left}
              y1={y}
              x2={margin.left + chartWidth}
              y2={y}
              stroke="#e5e7eb"
              strokeDasharray="3 3"
            />
          )
        })}
        
        {/* 垂直グリッド線 */}
        {data.map((_, index) => {
          if (index % Math.ceil(data.length / 10) === 0) {
            const x = margin.left + index * candleSpacing + candleSpacing / 2
            return (
              <line
                key={index}
                x1={x}
                y1={margin.top}
                x2={x}
                y2={margin.top + chartHeight}
                stroke="#e5e7eb"
                strokeDasharray="3 3"
              />
            )
          }
          return null
        })}
      </g>
      
      {/* ボリンジャーバンド */}
      {showIndicators.bollingerBands && indicators.bollingerBands && (
        <g>
          {/* 上部バンド */}
          <path
            d={generatePath(indicators.bollingerBands.upper)}
            stroke="#9ca3af"
            strokeWidth={1}
            fill="none"
            strokeDasharray="5 5"
          />
          
          {/* 下部バンド */}
          <path
            d={generatePath(indicators.bollingerBands.lower)}
            stroke="#9ca3af"
            strokeWidth={1}
            fill="none"
            strokeDasharray="5 5"
          />
          
          {/* 中央線（移動平均線） */}
          <path
            d={generatePath(indicators.bollingerBands.middle)}
            stroke="#6b7280"
            strokeWidth={2}
            fill="none"
          />
        </g>
      )}
      
      {/* 移動平均線 */}
      {showIndicators.movingAverages && indicators.sma5 && indicators.sma25 && indicators.sma75 && (
        <g>
          {/* 短期移動平均線 (5日) */}
          <path
            d={generatePath(indicators.sma5)}
            stroke="#f59e0b"
            strokeWidth={2}
            fill="none"
          />
          
          {/* 中期移動平均線 (25日) */}
          <path
            d={generatePath(indicators.sma25)}
            stroke="#3b82f6"
            strokeWidth={2}
            fill="none"
          />
          
          {/* 長期移動平均線 (75日) */}
          <path
            d={generatePath(indicators.sma75)}
            stroke="#8b5cf6"
            strokeWidth={2}
            fill="none"
          />
        </g>
      )}
      
      {/* Y軸ラベル */}
      <g>
        {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const y = margin.top + chartHeight * ratio
          const price = yMax - (yMax - yMin) * ratio
          return (
            <text
              key={ratio}
              x={margin.left - 10}
              y={y + 4}
              textAnchor="end"
              fontSize="12"
              fill="#6b7280"
            >
              ¥{Math.round(price).toLocaleString()}
            </text>
          )
        })}
      </g>
      
      {/* X軸ラベル */}
      <g>
        {data.map((item, index) => {
          if (index % Math.ceil(data.length / 10) === 0) {
            const x = margin.left + index * candleSpacing + candleSpacing / 2
            return (
              <text
                key={index}
                x={x}
                y={margin.top + chartHeight + 15}
                textAnchor="middle"
                fontSize="12"
                fill="#6b7280"
              >
                {item.date}
              </text>
            )
          }
          return null
        })}
      </g>
      
      {/* ローソク足 */}
      <g>
        {data.map((item, index) => {
          const { open, high, low, close } = item
          const isPositive = close >= open
          const color = isPositive ? '#22c55e' : '#ef4444'
          
          const x = margin.left + index * candleSpacing + candleSpacing / 2
          
          // Y座標の計算
          const highY = margin.top + ((yMax - high) / yRange) * chartHeight
          const lowY = margin.top + ((yMax - low) / yRange) * chartHeight
          const openY = margin.top + ((yMax - open) / yRange) * chartHeight
          const closeY = margin.top + ((yMax - close) / yRange) * chartHeight
          
          const bodyTop = Math.min(openY, closeY)
          const bodyHeight = Math.abs(closeY - openY) || 2
          const wickX = x
          const bodyX = x - candleWidth / 2
          
          return (
            <g key={index}>
              {/* 上ヒゲ */}
              <line
                x1={wickX}
                y1={highY}
                x2={wickX}
                y2={bodyTop}
                stroke={color}
                strokeWidth={1}
              />
              
              {/* 下ヒゲ */}
              <line
                x1={wickX}
                y1={bodyTop + bodyHeight}
                x2={wickX}
                y2={lowY}
                stroke={color}
                strokeWidth={1}
              />
              
              {/* ローソク足の実体 */}
              <rect
                x={bodyX}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                fill={isPositive ? color : color}
                stroke={color}
                strokeWidth={1}
                opacity={isPositive ? 0.8 : 1}
              />
              
              {/* 始値・終値の線（十字線） */}
              {bodyHeight < 3 && (
                <line
                  x1={bodyX}
                  y1={openY}
                  x2={bodyX + candleWidth}
                  y2={openY}
                  stroke={color}
                  strokeWidth={2}
                />
              )}
            </g>
          )
        })}
      </g>
    </svg>
  )
}

function App() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [stocksData, setStocksData] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState('1Y')
  const [selectedTimeframe, setSelectedTimeframe] = useState('daily')
  const [showIndicators, setShowIndicators] = useState({
    movingAverages: true,
    bollingerBands: true,
    rsi: false,
    macd: false
  })
  
  // お気に入り機能の状態
  const [favorites, setFavorites] = useState([])
  const [viewMode, setViewMode] = useState('all') // 'all' or 'favorites'
  const [showFavoritesManager, setShowFavoritesManager] = useState(false)
  
  // テクニカル指標のパラメータ設定
  const [indicatorParams, setIndicatorParams] = useState({
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
  })

  // ローディング状態
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // 初期データ読み込み
  useEffect(() => {
    loadInitialData()
  }, [])

  // オンライン状態の監視
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // 初期データ読み込み
  async function loadInitialData() {
    try {
      setLoading(true)
      setError(null)
      
      console.log('📊 初期データを読み込み中...')
      
      // 並行して各種データを読み込み
      const [stocksList, favoritesList, settings] = await Promise.all([
        stocksAPI.getStocksList(),
        favoritesAPI.getFavorites(),
        chartSettingsAPI.getSettings()
      ])
      
      setStocksData(stocksList)
      setFavorites(favoritesList)
      
      // 設定を適用
      if (settings) {
        setSelectedPeriod(settings.period || '1Y')
        setSelectedTimeframe(settings.timeframe || 'daily')
        setShowIndicators(settings.indicators || showIndicators)
        setIndicatorParams(settings.indicatorParams || indicatorParams)
      }
      
      console.log(`✅ ${stocksList.length}銘柄、${favoritesList.length}お気に入りを読み込みました`)
      
    } catch (err) {
      console.error('❌ 初期データ読み込みエラー:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 表示する銘柄リストを取得
  const getDisplayStocks = () => {
    if (viewMode === 'favorites') {
      return stocksData.filter(stock => favorites.includes(stock.code))
    }
    return stocksData
  }

  // 現在表示中の銘柄がお気に入りかどうか
  const isCurrentFavorite = () => {
    const currentStock = getDisplayStocks()[currentIndex]
    return currentStock ? favorites.includes(currentStock.code) : false
  }

  // お気に入りの追加/削除
  const toggleFavorite = async () => {
    const currentStock = getDisplayStocks()[currentIndex]
    if (!currentStock) return

    const isFav = favorites.includes(currentStock.code)
    let updatedFavorites

    try {
      if (isFav) {
        // お気に入りから削除
        await favoritesAPI.removeFavorite(currentStock.code)
        updatedFavorites = favorites.filter(code => code !== currentStock.code)
      } else {
        // お気に入りに追加
        await favoritesAPI.addFavorite(currentStock.code)
        updatedFavorites = [...favorites, currentStock.code]
      }

      setFavorites(updatedFavorites)

      // お気に入りモードで削除した場合、インデックスを調整
      if (viewMode === 'favorites' && isFav) {
        const newDisplayStocks = stocksData.filter(stock => updatedFavorites.includes(stock.code))
        if (newDisplayStocks.length === 0) {
          setViewMode('all')
          setCurrentIndex(0)
        } else if (currentIndex >= newDisplayStocks.length) {
          setCurrentIndex(newDisplayStocks.length - 1)
        }
      }
    } catch (error) {
      console.error('❌ お気に入り操作エラー:', error)
    }
  }

  // 表示モードの切り替え
  const switchViewMode = (mode) => {
    setViewMode(mode)
    setCurrentIndex(0)
    setIsPlaying(false)
  }

  // お気に入り管理画面の表示切り替え
  const toggleFavoritesManager = () => {
    setShowFavoritesManager(!showFavoritesManager)
    setIsPlaying(false)
  }

  // お気に入り一覧での削除
  const removeFavoriteFromList = async (stockCode) => {
    try {
      await favoritesAPI.removeFavorite(stockCode)
      const updatedFavorites = favorites.filter(code => code !== stockCode)
      setFavorites(updatedFavorites)
    } catch (error) {
      console.error('❌ お気に入り削除エラー:', error)
    }
  }

  // お気に入りの並び替え
  const reorderFavorites = async (fromIndex, toIndex) => {
    const newFavorites = [...favorites]
    const [removed] = newFavorites.splice(fromIndex, 1)
    newFavorites.splice(toIndex, 0, removed)
    
    try {
      await favoritesAPI.updateFavoritesOrder(newFavorites)
      setFavorites(newFavorites)
    } catch (error) {
      console.error('❌ お気に入り並び替えエラー:', error)
    }
  }

  // 設定の保存
  const saveSettings = async () => {
    const settings = {
      period: selectedPeriod,
      timeframe: selectedTimeframe,
      indicators: showIndicators,
      indicatorParams: indicatorParams
    }
    
    try {
      await chartSettingsAPI.saveSettings(settings)
      console.log('✅ 設定を保存しました')
    } catch (error) {
      console.error('❌ 設定保存エラー:', error)
    }
  }

  // 設定変更時の自動保存
  useEffect(() => {
    if (!loading) {
      saveSettings()
    }
  }, [selectedPeriod, selectedTimeframe, showIndicators, indicatorParams])

  // 高度なチャートデータを生成（長期移動平均線対応）
  const generateChartDataWithMA = async () => {
    const displayStocks = getDisplayStocks()
    const currentStock = displayStocks[currentIndex]
    
    if (!currentStock) return { chartData: [], indicators: {} }
    
    const periodConfig = PERIOD_OPTIONS.find(p => p.value === selectedPeriod)
    let displayDataPoints = periodConfig.days
    
    try {
      // APIからチャートデータを取得
      const chartData = await stocksAPI.getChartData(currentStock.code, displayDataPoints)
      
      if (!chartData || chartData.length === 0) {
        return { chartData: [], indicators: {} }
      }
      
      // テクニカル指標を計算
      const indicators = calculateAllIndicators(chartData, indicatorParams)
      
      return { chartData, indicators }
    } catch (error) {
      console.error('❌ チャートデータ取得エラー:', error)
      return { chartData: [], indicators: {} }
    }
  }

  // チャートデータの状態管理
  const [chartData, setChartData] = useState([])
  const [indicators, setIndicators] = useState({})

  // チャートデータの更新
  useEffect(() => {
    if (!loading && stocksData.length > 0) {
      generateChartDataWithMA().then(({ chartData, indicators }) => {
        setChartData(chartData)
        setIndicators(indicators)
      })
    }
  }, [currentIndex, selectedPeriod, selectedTimeframe, indicatorParams, stocksData, viewMode])

  // 自動再生機能
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        const displayStocks = getDisplayStocks()
        setCurrentIndex(prev => (prev + 1) % displayStocks.length)
      }, 3000)
      
      return () => clearInterval(interval)
    }
  }, [isPlaying, stocksData, viewMode, favorites])

  // ローディング画面
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">日本株チャート巡回ツール</h2>
          <p className="text-gray-600">データを読み込み中...</p>
          {!isOnline && (
            <p className="text-orange-600 mt-2">⚠️ オフライン状態です</p>
          )}
        </div>
      </div>
    )
  }

  // エラー画面
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">エラーが発生しました</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={loadInitialData}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            再試行
          </button>
        </div>
      </div>
    )
  }

  const displayStocks = getDisplayStocks()
  const currentStock = displayStocks[currentIndex]

  if (!currentStock) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">表示する銘柄がありません</h2>
          <p className="text-gray-600">お気に入りに銘柄を追加してください</p>
          <button 
            onClick={() => switchViewMode('all')}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            全銘柄表示に戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* ヘッダー */}
      <div className="bg-white shadow-lg border-b-4 border-blue-600">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                日本株チャート<span className="text-blue-600">巡回ツール</span> v5.0 Pro
              </h1>
              <p className="text-gray-600 mt-1">
                TSE主要銘柄対応 • プロレベル株価チャート分析 • 長期移動平均線完全対応 • お気に入り機能
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {isOnline ? 'システム正常稼働中' : 'オフライン'}
                </span>
              </div>
              <div className="bg-blue-100 px-3 py-1 rounded-full">
                <span className="text-blue-800 font-medium">📊 {stocksData.length}銘柄</span>
              </div>
              <div className="bg-orange-100 px-3 py-1 rounded-full">
                <span className="text-orange-800 font-medium">🔥 長期MA対応</span>
              </div>
              <div className="bg-yellow-100 px-3 py-1 rounded-full">
                <span className="text-yellow-800 font-medium">⭐ お気に入り機能</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 表示モード切り替えボタン */}
        <div className="flex justify-center space-x-4 mb-6">
          <button
            onClick={() => switchViewMode('all')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              viewMode === 'all'
                ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                : 'bg-white text-gray-700 hover:bg-blue-50 border border-gray-200'
            }`}
          >
            📊 全銘柄表示 ({stocksData.length}銘柄)
          </button>
          <button
            onClick={() => switchViewMode('favorites')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              viewMode === 'favorites'
                ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                : 'bg-white text-gray-700 hover:bg-blue-50 border border-gray-200'
            }`}
          >
            ⭐ お気に入り表示 ({favorites.length}銘柄)
          </button>
          <button
            onClick={toggleFavoritesManager}
            className="px-6 py-3 rounded-lg font-medium bg-white text-gray-700 hover:bg-blue-50 border border-gray-200 transition-all duration-200"
          >
            🛠️ お気に入り管理
          </button>
        </div>

        {/* 設定パネル */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 表示期間設定 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">表示期間:</label>
              <div className="flex flex-wrap gap-2">
                {PERIOD_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedPeriod(option.value)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      selectedPeriod === option.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 時間軸設定 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">時間軸:</label>
              <div className="flex flex-wrap gap-2">
                {TIMEFRAME_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedTimeframe(option.value)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      selectedTimeframe === option.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* テクニカル指標設定 */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">📈 テクニカル指標&パラメータ設定 (長期MA対応)</label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={showIndicators.movingAverages}
                      onChange={(e) => setShowIndicators(prev => ({ ...prev, movingAverages: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">移動平均線</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={showIndicators.bollingerBands}
                      onChange={(e) => setShowIndicators(prev => ({ ...prev, bollingerBands: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">ボリンジャーバンド</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={showIndicators.rsi}
                      onChange={(e) => setShowIndicators(prev => ({ ...prev, rsi: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">RSI</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={showIndicators.macd}
                      onChange={(e) => setShowIndicators(prev => ({ ...prev, macd: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">MACD</span>
                  </label>
                </div>
                
                <div className="space-y-2 text-xs">
                  {/* 移動平均線パラメータ */}
                  <div className="grid grid-cols-3 gap-1">
                    <label className="text-xs text-gray-600">短期:</label>
                    <input
                      type="number"
                      value={indicatorParams.sma.short}
                      onChange={(e) => setIndicatorParams(prev => ({
                        ...prev,
                        sma: { ...prev.sma, short: parseInt(e.target.value) || 5 }
                      }))}
                      className="w-full px-1 py-1 text-xs border rounded"
                      min="1"
                      max="100"
                    />
                    <label className="text-xs text-gray-600">中期:</label>
                    <input
                      type="number"
                      value={indicatorParams.sma.medium}
                      onChange={(e) => setIndicatorParams(prev => ({
                        ...prev,
                        sma: { ...prev.sma, medium: parseInt(e.target.value) || 25 }
                      }))}
                      className="w-full px-1 py-1 text-xs border rounded"
                      min="1"
                      max="200"
                    />
                    <label className="text-xs text-gray-600">長期:</label>
                    <input
                      type="number"
                      value={indicatorParams.sma.long}
                      onChange={(e) => setIndicatorParams(prev => ({
                        ...prev,
                        sma: { ...prev.sma, long: parseInt(e.target.value) || 75 }
                      }))}
                      className="w-full px-1 py-1 text-xs border rounded"
                      min="1"
                      max="500"
                    />
                  </div>
                  
                  {/* ボリンジャーバンドパラメータ */}
                  <div className="grid grid-cols-2 gap-1">
                    <label className="text-xs text-gray-600">期間:</label>
                    <input
                      type="number"
                      value={indicatorParams.bollinger.period}
                      onChange={(e) => setIndicatorParams(prev => ({
                        ...prev,
                        bollinger: { ...prev.bollinger, period: parseInt(e.target.value) || 20 }
                      }))}
                      className="w-full px-1 py-1 text-xs border rounded"
                      min="5"
                      max="100"
                    />
                    <label className="text-xs text-gray-600">σ:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={indicatorParams.bollinger.stdDev}
                      onChange={(e) => setIndicatorParams(prev => ({
                        ...prev,
                        bollinger: { ...prev.bollinger, stdDev: parseFloat(e.target.value) || 2 }
                      }))}
                      className="w-full px-1 py-1 text-xs border rounded"
                      min="0.5"
                      max="5"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 銘柄情報とチャート */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* 銘柄ヘッダー */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {currentStock.code} - {currentStock.name}
                </h2>
                <p className="text-blue-100">{currentStock.market}市場</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">¥{currentStock.price?.toLocaleString() || 'N/A'}</div>
                <div className={`text-lg ${
                  (currentStock.change || 0) >= 0 ? 'text-green-300' : 'text-red-300'
                }`}>
                  {(currentStock.change || 0) >= 0 ? '+' : ''}{currentStock.change || 0}
                  ({(currentStock.changePercent || 0) >= 0 ? '+' : ''}{currentStock.changePercent || 0}%)
                </div>
              </div>
            </div>
          </div>

          {/* コントロールパネル */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ⏮️
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isPlaying
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isPlaying ? '⏸️ 停止' : '▶️ 再生'}
                </button>
                <button
                  onClick={() => setCurrentIndex(Math.min(displayStocks.length - 1, currentIndex + 1))}
                  disabled={currentIndex === displayStocks.length - 1}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ⏭️
                </button>
                <span className="text-gray-600">
                  {currentIndex + 1} / {displayStocks.length}
                </span>
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleFavorite}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    isCurrentFavorite()
                      ? 'bg-yellow-500 text-white hover:bg-yellow-600 transform scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-yellow-50 border border-gray-200'
                  }`}
                >
                  {isCurrentFavorite() ? '⭐ お気に入り済み' : '☆ お気に入りに追加'}
                </button>
              </div>
            </div>
          </div>

          {/* チャート表示エリア */}
          <div className="p-6">
            {chartData.length > 0 ? (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  📊 ローソク足チャート ({selectedPeriod}・{TIMEFRAME_OPTIONS.find(t => t.value === selectedTimeframe)?.label})
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <CandlestickChart
                    data={chartData}
                    indicators={indicators}
                    width={1000}
                    height={400}
                    showIndicators={showIndicators}
                  />
                </div>
                
                {/* 出来高チャート */}
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-800 mb-2">📊 出来高</h4>
                  <ResponsiveContainer width="100%" height={150}>
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                      />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${value.toLocaleString()}株`,
                          '出来高'
                        ]}
                        labelFormatter={(label) => `日付: ${label}`}
                      />
                      <Bar dataKey="volume" fill="#3b82f6" opacity={0.7} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📊</div>
                <h3 className="text-lg font-semibold text-gray-600 mb-2">チャートデータを読み込み中...</h3>
                <p className="text-gray-500">しばらくお待ちください</p>
              </div>
            )}
          </div>
        </div>

        {/* お気に入り管理モーダル */}
        {showFavoritesManager && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-96 overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-4">
                <h3 className="text-lg font-bold">⭐ お気に入り管理</h3>
              </div>
              <div className="p-4 max-h-64 overflow-y-auto">
                {favorites.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">お気に入りがありません</p>
                ) : (
                  <div className="space-y-2">
                    {favorites.map((code, index) => {
                      const stock = stocksData.find(s => s.code === code)
                      return stock ? (
                        <div key={code} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="font-medium">{stock.code} - {stock.name}</span>
                          <button
                            onClick={() => removeFavoriteFromList(code)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                      ) : null
                    })}
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={toggleFavoritesManager}
                  className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
