import { useState, useEffect } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, ReferenceLine } from 'recharts'
import { calculateAllIndicators } from './utils/technicalIndicators'
import { stocksAPI, favoritesAPI, chartSettingsAPI } from './lib/api'

// 日本の主要企業データ
const STOCKS = [
  { code: '1301', name: '極洋', market: 'PRIME', basePrice: 1500 },
  { code: '1332', name: '日本水産', market: 'PRIME', basePrice: 1900 },
  { code: '1801', name: '大成建設', market: 'PRIME', basePrice: 1950 },
  { code: '2269', name: '明治ホールディングス', market: 'PRIME', basePrice: 2800 },
  { code: '2503', name: 'キリンホールディングス', market: 'PRIME', basePrice: 2100 },
  { code: '4502', name: '武田薬品工業', market: 'PRIME', basePrice: 4000 },
  { code: '6501', name: '日立製作所', market: 'PRIME', basePrice: 3500 },
  { code: '6758', name: 'ソニーグループ', market: 'PRIME', basePrice: 13000 },
  { code: '7203', name: 'トヨタ自動車', market: 'PRIME', basePrice: 2800 },
  { code: '7974', name: '任天堂', market: 'PRIME', basePrice: 7500 },
  { code: '8306', name: '三菱UFJ', market: 'PRIME', basePrice: 1300 },
  { code: '9432', name: 'NTT', market: 'PRIME', basePrice: 180 },
  { code: '9433', name: 'KDDI', market: 'PRIME', basePrice: 4200 },
  { code: '9984', name: 'ソフトバンクG', market: 'PRIME', basePrice: 7500 }
]

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

// お気に入り管理ユーティリティ
const FavoritesManager = {
  // お気に入りを取得
  getFavorites: () => {
    try {
      const favorites = localStorage.getItem('stockFavorites')
      return favorites ? JSON.parse(favorites) : []
    } catch (error) {
      console.error('Failed to load favorites:', error)
      return []
    }
  },

  // お気に入りを保存
  saveFavorites: (favorites) => {
    try {
      localStorage.setItem('stockFavorites', JSON.stringify(favorites))
      return true
    } catch (error) {
      console.error('Failed to save favorites:', error)
      return false
    }
  },

  // お気に入りに追加
  addFavorite: (stockCode) => {
    const favorites = FavoritesManager.getFavorites()
    if (!favorites.includes(stockCode)) {
      favorites.push(stockCode)
      return FavoritesManager.saveFavorites(favorites)
    }
    return true
  },

  // お気に入りから削除
  removeFavorite: (stockCode) => {
    const favorites = FavoritesManager.getFavorites()
    const updatedFavorites = favorites.filter(code => code !== stockCode)
    return FavoritesManager.saveFavorites(updatedFavorites)
  },

  // お気に入りかどうかチェック
  isFavorite: (stockCode) => {
    const favorites = FavoritesManager.getFavorites()
    return favorites.includes(stockCode)
  },

  // お気に入り順序を更新
  updateOrder: (orderedCodes) => {
    return FavoritesManager.saveFavorites(orderedCodes)
  }
}

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

  // お気に入り機能の初期化
  useEffect(() => {
    const savedFavorites = FavoritesManager.getFavorites()
    setFavorites(savedFavorites)
  }, [])

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
  const toggleFavorite = () => {
    const currentStock = getDisplayStocks()[currentIndex]
    if (!currentStock) return

    const isFav = favorites.includes(currentStock.code)
    let updatedFavorites

    if (isFav) {
      // お気に入りから削除
      updatedFavorites = favorites.filter(code => code !== currentStock.code)
      FavoritesManager.removeFavorite(currentStock.code)
    } else {
      // お気に入りに追加
      updatedFavorites = [...favorites, currentStock.code]
      FavoritesManager.addFavorite(currentStock.code)
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
  const removeFavoriteFromList = (stockCode) => {
    const updatedFavorites = favorites.filter(code => code !== stockCode)
    setFavorites(updatedFavorites)
    FavoritesManager.removeFavorite(stockCode)
  }

  // お気に入りの並び替え
  const reorderFavorites = (fromIndex, toIndex) => {
    const newFavorites = [...favorites]
    const [removed] = newFavorites.splice(fromIndex, 1)
    newFavorites.splice(toIndex, 0, removed)
    setFavorites(newFavorites)
    FavoritesManager.updateOrder(newFavorites)
  }

  // 株価データを生成
  const generateStockData = (stock) => {
    const change = (Math.random() - 0.5) * stock.basePrice * 0.05
    const currentPrice = Math.max(stock.basePrice + change, stock.basePrice * 0.5)
    const changePercent = (change / stock.basePrice) * 100
    
    return {
      ...stock,
      price: Math.round(currentPrice),
      change: Math.round(change),
      changePercent: Math.round(changePercent * 100) / 100
    }
  }

  // 高度なチャートデータを生成（長期移動平均線対応）
  const generateChartDataWithMA = () => {
    const displayStocks = getDisplayStocks()
    const currentStock = displayStocks[currentIndex]
    
    if (!currentStock) return { chartData: [], indicators: {} }
    
    const periodConfig = PERIOD_OPTIONS.find(p => p.value === selectedPeriod)
    let displayDataPoints = periodConfig.days
    
    // 時間軸に応じてデータポイント数を調整
    if (selectedTimeframe === 'weekly') {
      displayDataPoints = Math.floor(displayDataPoints / 5)
    } else if (selectedTimeframe === 'monthly') {
      displayDataPoints = Math.floor(displayDataPoints / 22)
    }
    
    // 長期移動平均線のための追加データポイントを計算
    const maxMAPeriod = Math.max(
      indicatorParams.sma.short,
      indicatorParams.sma.medium, 
      indicatorParams.sma.long,
      indicatorParams.bollinger.period,
      indicatorParams.rsi.period,
      indicatorParams.macd.slow
    )
    
    // 表示期間 + 最大移動平均期間分のデータを生成
    const totalDataPoints = displayDataPoints + maxMAPeriod
    
    const allData = []
    let currentPrice = currentStock.basePrice
    let currentDate = new Date()
    currentDate.setDate(currentDate.getDate() - totalDataPoints)
    
    for (let i = 0; i < totalDataPoints; i++) {
      // トレンドとランダムウォークを組み合わせ
      const trend = Math.sin(i / totalDataPoints * Math.PI * 4) * 0.001
      const randomWalk = (Math.random() - 0.5) * 0.02
      const priceChange = (trend + randomWalk) * currentStock.basePrice
      
      currentPrice = Math.max(currentPrice + priceChange, currentStock.basePrice * 0.3)
      
      // ローソク足データを生成
      const dayVariation = currentPrice * 0.02
      const open = currentPrice + (Math.random() - 0.5) * dayVariation
      const close = currentPrice + (Math.random() - 0.5) * dayVariation
      const high = Math.max(open, close) + Math.random() * dayVariation * 0.5
      const low = Math.min(open, close) - Math.random() * dayVariation * 0.5
      const volume = Math.floor(Math.random() * 1000000 + 100000)
      
      // 日付フォーマット
      let dateLabel
      if (selectedTimeframe === 'monthly') {
        dateLabel = `${currentDate.getFullYear()}/${String(currentDate.getMonth() + 1).padStart(2, '0')}`
      } else if (selectedTimeframe === 'weekly') {
        dateLabel = `${currentDate.getMonth() + 1}/${currentDate.getDate()}`
      } else {
        dateLabel = `${currentDate.getMonth() + 1}/${currentDate.getDate()}`
      }
      
      allData.push({
        date: dateLabel,
        open: Math.round(open),
        high: Math.round(high),
        low: Math.round(low),
        close: Math.round(close),
        volume: volume,
        priceForLine: Math.round(close)
      })
      
      // 次の日付
      if (selectedTimeframe === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + 1)
      } else if (selectedTimeframe === 'weekly') {
        currentDate.setDate(currentDate.getDate() + 7)
      } else {
        currentDate.setDate(currentDate.getDate() + 1)
      }
    }
    
    // 全データでテクニカル指標を計算
    const allIndicators = calculateAllIndicators(allData, indicatorParams)
    
    // 表示用データは最後の期間分のみ
    const chartData = allData.slice(-displayDataPoints)
    
    // 指標データも表示期間に合わせて切り出し
    const indicators = {}
    Object.keys(allIndicators).forEach(key => {
      if (key === 'bollingerBands') {
        indicators[key] = {
          upper: allIndicators[key].upper.slice(-displayDataPoints),
          middle: allIndicators[key].middle.slice(-displayDataPoints),
          lower: allIndicators[key].lower.slice(-displayDataPoints)
        }
      } else if (key === 'macd') {
        indicators[key] = {
          macd: allIndicators[key].macd.slice(-displayDataPoints),
          signal: allIndicators[key].signal.slice(-displayDataPoints),
          histogram: allIndicators[key].histogram.slice(-displayDataPoints)
        }
      } else {
        indicators[key] = allIndicators[key].slice(-displayDataPoints)
      }
    })
    
    return { chartData, indicators }
  }

  // 初期化
  useEffect(() => {
    const initialData = STOCKS.map(generateStockData)
    setStocksData(initialData)
  }, [])

  const { chartData, indicators } = generateChartDataWithMA()

  // RSIとMACDのチャートデータを準備
  const rsiData = chartData.map((item, index) => ({
    date: item.date,
    rsi: indicators.rsi ? indicators.rsi[index] : null
  }))

  const macdData = chartData.map((item, index) => ({
    date: item.date,
    macd: indicators.macd ? indicators.macd.macd[index] : null,
    signal: indicators.macd ? indicators.macd.signal[index] : null,
    histogram: indicators.macd ? indicators.macd.histogram[index] : null
  }))

  // 次の銘柄
  const goToNext = () => {
    const displayStocks = getDisplayStocks()
    setCurrentIndex((prev) => (prev + 1) % displayStocks.length)
  }

  // 前の銘柄
  const goToPrevious = () => {
    const displayStocks = getDisplayStocks()
    setCurrentIndex((prev) => (prev - 1 + displayStocks.length) % displayStocks.length)
  }

  // 再生/停止
  const togglePlayback = () => {
    setIsPlaying(!isPlaying)
  }

  // パラメータ更新関数
  const updateIndicatorParam = (indicator, param, value) => {
    setIndicatorParams(prev => ({
      ...prev,
      [indicator]: {
        ...prev[indicator],
        [param]: parseFloat(value)
      }
    }))
  }

  // 自動ローテーション
  useEffect(() => {
    const displayStocks = getDisplayStocks()
    if (!isPlaying || displayStocks.length === 0) return

    const interval = setInterval(() => {
      goToNext()
    }, 3000) // 3秒間隔

    return () => clearInterval(interval)
  }, [isPlaying, viewMode, favorites])

  // キーボードショートカット
  useEffect(() => {
    const handleKeyPress = (e) => {
      switch (e.key) {
        case ' ':
          e.preventDefault()
          togglePlayback()
          break
        case 'ArrowLeft':
          e.preventDefault()
          goToPrevious()
          break
        case 'ArrowRight':
          e.preventDefault()
          goToNext()
          break
        case 'f':
        case 'F':
          e.preventDefault()
          toggleFavorite()
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentIndex, viewMode, favorites])

  const displayStocks = getDisplayStocks()
  const currentStock = displayStocks[currentIndex]

  if (!currentStock) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f9fafb', 
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>
            {viewMode === 'favorites' ? 'お気に入り銘柄がありません' : 'Loading...'}
          </h2>
          {viewMode === 'favorites' && (
            <button
              onClick={() => switchViewMode('all')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              全銘柄表示に戻る
            </button>
          )}
        </div>
      </div>
    )
  }

  // お気に入り管理画面
  if (showFavoritesManager) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f9fafb', 
        padding: '20px',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* ヘッダー */}
          <div style={{ marginBottom: '30px', textAlign: 'center' }}>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: 'bold', 
              color: '#111827', 
              marginBottom: '10px' 
            }}>
              ⭐ お気に入り銘柄管理
            </h1>
            <p style={{ color: '#6b7280', fontSize: '16px' }}>
              お気に入り銘柄の一覧・削除・並び替えができます
            </p>
          </div>

          {/* 戻るボタン */}
          <div style={{ marginBottom: '30px' }}>
            <button
              onClick={toggleFavoritesManager}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              ← チャート画面に戻る
            </button>
          </div>

          {/* お気に入り一覧 */}
          <div style={{ 
            backgroundColor: 'white', 
            padding: '30px', 
            borderRadius: '10px', 
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px' }}>
              お気に入り一覧 ({favorites.length}銘柄)
            </h2>

            {favorites.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <p style={{ fontSize: '18px', marginBottom: '20px' }}>
                  お気に入り銘柄がありません
                </p>
                <p style={{ fontSize: '14px' }}>
                  チャート画面で⭐ボタンを押してお気に入りに追加してください
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '15px' }}>
                {favorites.map((code, index) => {
                  const stock = STOCKS.find(s => s.code === code)
                  if (!stock) return null

                  return (
                    <div
                      key={code}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '15px 20px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ 
                          fontSize: '16px', 
                          fontWeight: '600', 
                          color: '#6b7280',
                          minWidth: '30px'
                        }}>
                          {index + 1}
                        </div>
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '2px' }}>
                            {stock.code} - {stock.name}
                          </div>
                          <div style={{ fontSize: '14px', color: '#6b7280' }}>
                            {stock.market}市場
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '10px' }}>
                        {/* 上に移動 */}
                        {index > 0 && (
                          <button
                            onClick={() => reorderFavorites(index, index - 1)}
                            style={{
                              padding: '8px 12px',
                              backgroundColor: '#e5e7eb',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            ↑
                          </button>
                        )}
                        
                        {/* 下に移動 */}
                        {index < favorites.length - 1 && (
                          <button
                            onClick={() => reorderFavorites(index, index + 1)}
                            style={{
                              padding: '8px 12px',
                              backgroundColor: '#e5e7eb',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            ↓
                          </button>
                        )}
                        
                        {/* 削除ボタン */}
                        <button
                          onClick={() => removeFavoriteFromList(code)}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600'
                          }}
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f9fafb', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        {/* ヘッダー */}
        <div style={{ marginBottom: '30px', textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: 'bold', 
            color: '#111827', 
            marginBottom: '10px' 
          }}>
            日本株チャート巡回ツール v5.0 Pro
          </h1>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>
            TSE主要銘柄対応 - プロレベル株価チャート分析 + 長期移動平均線完全対応 + お気に入り機能
          </p>
          <div style={{ marginTop: '10px' }}>
            <span style={{ 
              padding: '5px 10px', 
              backgroundColor: '#dcfce7', 
              color: '#166534', 
              borderRadius: '5px',
              fontSize: '14px',
              marginRight: '10px'
            }}>
              ✓ システム正常動作中
            </span>
            <span style={{ 
              padding: '5px 10px', 
              backgroundColor: '#dbeafe', 
              color: '#1e40af', 
              borderRadius: '5px',
              fontSize: '14px',
              marginRight: '10px'
            }}>
              📊 {displayStocks.length}銘柄 ({viewMode === 'favorites' ? 'お気に入り' : '全銘柄'})
            </span>
            <span style={{ 
              padding: '5px 10px', 
              backgroundColor: '#fef3c7', 
              color: '#92400e', 
              borderRadius: '5px',
              fontSize: '14px',
              marginRight: '10px'
            }}>
              🚀 長期MA対応
            </span>
            <span style={{ 
              padding: '5px 10px', 
              backgroundColor: '#fce7f3', 
              color: '#be185d', 
              borderRadius: '5px',
              fontSize: '14px'
            }}>
              ⭐ お気に入り機能
            </span>
          </div>
        </div>

        {/* 表示モード切り替え */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '10px', 
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
            <button
              onClick={() => switchViewMode('all')}
              style={{
                padding: '12px 24px',
                border: viewMode === 'all' ? '2px solid #2563eb' : '1px solid #d1d5db',
                borderRadius: '8px',
                backgroundColor: viewMode === 'all' ? '#eff6ff' : 'white',
                color: viewMode === 'all' ? '#2563eb' : '#374151',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              📊 全銘柄表示 ({STOCKS.length}銘柄)
            </button>
            <button
              onClick={() => switchViewMode('favorites')}
              style={{
                padding: '12px 24px',
                border: viewMode === 'favorites' ? '2px solid #be185d' : '1px solid #d1d5db',
                borderRadius: '8px',
                backgroundColor: viewMode === 'favorites' ? '#fdf2f8' : 'white',
                color: viewMode === 'favorites' ? '#be185d' : '#374151',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              ⭐ お気に入り表示 ({favorites.length}銘柄)
            </button>
            <button
              onClick={toggleFavoritesManager}
              style={{
                padding: '12px 24px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                backgroundColor: 'white',
                color: '#374151',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              🛠️ お気に入り管理
            </button>
          </div>
        </div>

        {/* 銘柄情報 */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '30px', 
          borderRadius: '10px', 
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '5px' }}>
                {currentStock.code} - {currentStock.name}
                {isCurrentFavorite() && (
                  <span style={{ marginLeft: '10px', fontSize: '24px' }}>⭐</span>
                )}
              </h2>
              <span style={{ 
                padding: '3px 8px', 
                backgroundColor: '#f3f4f6', 
                borderRadius: '5px',
                fontSize: '14px'
              }}>
                {currentStock.market}市場
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '36px', fontWeight: 'bold' }}>
                ¥{currentStock.price.toLocaleString()}
              </div>
              <div style={{ 
                fontSize: '20px', 
                color: currentStock.change >= 0 ? '#059669' : '#dc2626' 
              }}>
                {currentStock.change >= 0 ? '+' : ''}{currentStock.change} 
                ({currentStock.changePercent >= 0 ? '+' : ''}{currentStock.changePercent}%)
              </div>
            </div>
          </div>
        </div>

        {/* メインコンテンツエリア */}
        <div style={{ display: 'flex', gap: '20px' }}>
          {/* 左側: チャートエリア */}
          <div style={{ flex: '1' }}>
            {/* チャート設定 */}
            <div style={{ 
              backgroundColor: 'white', 
              padding: '20px', 
              borderRadius: '10px', 
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '600', marginRight: '10px' }}>表示期間:</label>
                  {PERIOD_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedPeriod(option.value)}
                      style={{
                        padding: '5px 12px',
                        margin: '0 3px',
                        border: selectedPeriod === option.value ? '2px solid #2563eb' : '1px solid #d1d5db',
                        borderRadius: '5px',
                        backgroundColor: selectedPeriod === option.value ? '#eff6ff' : 'white',
                        color: selectedPeriod === option.value ? '#2563eb' : '#374151',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '600', marginRight: '10px' }}>時間軸:</label>
                  {TIMEFRAME_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedTimeframe(option.value)}
                      style={{
                        padding: '5px 12px',
                        margin: '0 3px',
                        border: selectedTimeframe === option.value ? '2px solid #059669' : '1px solid #d1d5db',
                        borderRadius: '5px',
                        backgroundColor: selectedTimeframe === option.value ? '#f0fdf4' : 'white',
                        color: selectedTimeframe === option.value ? '#059669' : '#374151',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* テクニカル指標設定 */}
            <div style={{ 
              backgroundColor: 'white', 
              padding: '20px', 
              borderRadius: '10px', 
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              marginBottom: '20px'
            }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '15px' }}>
                📈 テクニカル指標 & パラメータ設定 (長期MA対応)
              </h4>
              
              {/* 指標の表示/非表示切り替え */}
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showIndicators.movingAverages}
                    onChange={(e) => setShowIndicators(prev => ({ ...prev, movingAverages: e.target.checked }))}
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ fontSize: '14px' }}>移動平均線</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showIndicators.bollingerBands}
                    onChange={(e) => setShowIndicators(prev => ({ ...prev, bollingerBands: e.target.checked }))}
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ fontSize: '14px' }}>ボリンジャーバンド</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showIndicators.rsi}
                    onChange={(e) => setShowIndicators(prev => ({ ...prev, rsi: e.target.checked }))}
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ fontSize: '14px' }}>RSI</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showIndicators.macd}
                    onChange={(e) => setShowIndicators(prev => ({ ...prev, macd: e.target.checked }))}
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ fontSize: '14px' }}>MACD</span>
                </label>
              </div>

              {/* パラメータ設定 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                {/* 移動平均線設定 */}
                {showIndicators.movingAverages && (
                  <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                    <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#374151' }}>
                      移動平均線期間 (長期対応)
                    </h5>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280' }}>短期:</label>
                        <input
                          type="number"
                          value={indicatorParams.sma.short}
                          onChange={(e) => updateIndicatorParam('sma', 'short', e.target.value)}
                          style={{ width: '50px', padding: '2px 5px', marginLeft: '5px', border: '1px solid #d1d5db', borderRadius: '3px' }}
                          min="1"
                          max="100"
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280' }}>中期:</label>
                        <input
                          type="number"
                          value={indicatorParams.sma.medium}
                          onChange={(e) => updateIndicatorParam('sma', 'medium', e.target.value)}
                          style={{ width: '50px', padding: '2px 5px', marginLeft: '5px', border: '1px solid #d1d5db', borderRadius: '3px' }}
                          min="1"
                          max="500"
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280' }}>長期:</label>
                        <input
                          type="number"
                          value={indicatorParams.sma.long}
                          onChange={(e) => updateIndicatorParam('sma', 'long', e.target.value)}
                          style={{ width: '60px', padding: '2px 5px', marginLeft: '5px', border: '1px solid #d1d5db', borderRadius: '3px' }}
                          min="1"
                          max="1000"
                        />
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '5px' }}>
                      💡 200日、1000日移動平均も最初から表示可能
                    </div>
                  </div>
                )}

                {/* ボリンジャーバンド設定 */}
                {showIndicators.bollingerBands && (
                  <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                    <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#374151' }}>
                      ボリンジャーバンド
                    </h5>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280' }}>期間:</label>
                        <input
                          type="number"
                          value={indicatorParams.bollinger.period}
                          onChange={(e) => updateIndicatorParam('bollinger', 'period', e.target.value)}
                          style={{ width: '50px', padding: '2px 5px', marginLeft: '5px', border: '1px solid #d1d5db', borderRadius: '3px' }}
                          min="5"
                          max="200"
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280' }}>σ:</label>
                        <input
                          type="number"
                          step="0.1"
                          value={indicatorParams.bollinger.stdDev}
                          onChange={(e) => updateIndicatorParam('bollinger', 'stdDev', e.target.value)}
                          style={{ width: '50px', padding: '2px 5px', marginLeft: '5px', border: '1px solid #d1d5db', borderRadius: '3px' }}
                          min="0.5"
                          max="5"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* RSI設定 */}
                {showIndicators.rsi && (
                  <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                    <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#374151' }}>
                      RSI設定
                    </h5>
                    <div>
                      <label style={{ fontSize: '12px', color: '#6b7280' }}>期間:</label>
                      <input
                        type="number"
                        value={indicatorParams.rsi.period}
                        onChange={(e) => updateIndicatorParam('rsi', 'period', e.target.value)}
                        style={{ width: '50px', padding: '2px 5px', marginLeft: '5px', border: '1px solid #d1d5db', borderRadius: '3px' }}
                        min="5"
                        max="50"
                      />
                    </div>
                  </div>
                )}

                {/* MACD設定 */}
                {showIndicators.macd && (
                  <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                    <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#374151' }}>
                      MACD設定
                    </h5>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280' }}>短期:</label>
                        <input
                          type="number"
                          value={indicatorParams.macd.fast}
                          onChange={(e) => updateIndicatorParam('macd', 'fast', e.target.value)}
                          style={{ width: '40px', padding: '2px 5px', marginLeft: '3px', border: '1px solid #d1d5db', borderRadius: '3px' }}
                          min="5"
                          max="50"
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280' }}>長期:</label>
                        <input
                          type="number"
                          value={indicatorParams.macd.slow}
                          onChange={(e) => updateIndicatorParam('macd', 'slow', e.target.value)}
                          style={{ width: '40px', padding: '2px 5px', marginLeft: '3px', border: '1px solid #d1d5db', borderRadius: '3px' }}
                          min="10"
                          max="100"
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#6b7280' }}>Signal:</label>
                        <input
                          type="number"
                          value={indicatorParams.macd.signal}
                          onChange={(e) => updateIndicatorParam('macd', 'signal', e.target.value)}
                          style={{ width: '40px', padding: '2px 5px', marginLeft: '3px', border: '1px solid #d1d5db', borderRadius: '3px' }}
                          min="3"
                          max="30"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* 凡例 */}
              {showIndicators.movingAverages && (
                <div style={{ marginTop: '15px', display: 'flex', gap: '15px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '20px', height: '3px', backgroundColor: '#f59e0b', marginRight: '5px' }}></div>
                    <span>短期 ({indicatorParams.sma.short}日)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '20px', height: '3px', backgroundColor: '#3b82f6', marginRight: '5px' }}></div>
                    <span>中期 ({indicatorParams.sma.medium}日)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '20px', height: '3px', backgroundColor: '#8b5cf6', marginRight: '5px' }}></div>
                    <span>長期 ({indicatorParams.sma.long}日)</span>
                  </div>
                </div>
              )}
            </div>

            {/* チャート */}
            <div style={{ 
              backgroundColor: 'white', 
              padding: '30px', 
              borderRadius: '10px', 
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              marginBottom: '30px'
            }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
                🕯️ ローソク足チャート ({PERIOD_OPTIONS.find(p => p.value === selectedPeriod)?.label} - {TIMEFRAME_OPTIONS.find(t => t.value === selectedTimeframe)?.label})
              </h3>
              
              {/* 株価チャート */}
              <div style={{ height: '500px', marginBottom: '20px' }}>
                <CandlestickChart 
                  data={chartData} 
                  indicators={indicators}
                  width={1200} 
                  height={500}
                  showIndicators={showIndicators}
                />
              </div>
              
              {/* 出来高チャート */}
              <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>
                📊 出来高
              </h4>
              <div style={{ height: '150px', marginBottom: '30px' }}>
                <ResponsiveContainer width="100%" height="100%">
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
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: '1px solid #ccc',
                              borderRadius: '5px',
                              padding: '10px'
                            }}>
                              <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{label}</p>
                              <p style={{ margin: '2px 0', fontSize: '12px' }}>出来高: {data.volume?.toLocaleString()}株</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="volume" fill="#8884d8" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* RSIチャート */}
              {showIndicators.rsi && (
                <>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>
                    📈 RSI (相対力指数) - {indicatorParams.rsi.period}期間
                  </h4>
                  <div style={{ height: '200px', marginBottom: '30px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={rsiData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          interval="preserveStartEnd"
                        />
                        <YAxis 
                          domain={[0, 100]}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip 
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div style={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                  border: '1px solid #ccc',
                                  borderRadius: '5px',
                                  padding: '10px'
                                }}>
                                  <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{label}</p>
                                  <p style={{ margin: '2px 0', fontSize: '12px' }}>RSI: {data.rsi?.toFixed(2)}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="5 5" />
                        <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="5 5" />
                        <ReferenceLine y={50} stroke="#6b7280" strokeDasharray="2 2" />
                        <Line type="monotone" dataKey="rsi" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}

              {/* MACDチャート */}
              {showIndicators.macd && (
                <>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>
                    📊 MACD ({indicatorParams.macd.fast},{indicatorParams.macd.slow},{indicatorParams.macd.signal})
                  </h4>
                  <div style={{ height: '200px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={macdData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          interval="preserveStartEnd"
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div style={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                  border: '1px solid #ccc',
                                  borderRadius: '5px',
                                  padding: '10px'
                                }}>
                                  <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{label}</p>
                                  <p style={{ margin: '2px 0', fontSize: '12px' }}>MACD: {data.macd?.toFixed(2)}</p>
                                  <p style={{ margin: '2px 0', fontSize: '12px' }}>Signal: {data.signal?.toFixed(2)}</p>
                                  <p style={{ margin: '2px 0', fontSize: '12px' }}>Histogram: {data.histogram?.toFixed(2)}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="2 2" />
                        <Bar dataKey="histogram" fill="#94a3b8" />
                        <Line type="monotone" dataKey="macd" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="signal" stroke="#ef4444" strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 右側: コントロールパネル */}
          <div style={{ width: '300px' }}>
            {/* お気に入りコントロール */}
            <div style={{ 
              backgroundColor: 'white', 
              padding: '25px', 
              borderRadius: '10px', 
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              marginBottom: '20px'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', textAlign: 'center' }}>
                ⭐ お気に入り
              </h3>
              
              <button
                onClick={toggleFavorite}
                style={{
                  width: '100%',
                  padding: '15px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: isCurrentFavorite() ? '#ef4444' : '#fbbf24',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  marginBottom: '15px'
                }}
              >
                {isCurrentFavorite() ? '⭐ お気に入りから削除' : '⭐ お気に入りに追加'}
              </button>

              <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
                <p>キーボードショートカット: F</p>
                <p>お気に入り: {favorites.length}銘柄</p>
              </div>
            </div>

            {/* 巡回コントロール */}
            <div style={{ 
              backgroundColor: 'white', 
              padding: '25px', 
              borderRadius: '10px', 
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              marginBottom: '20px'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', textAlign: 'center' }}>
                🎮 巡回コントロール
              </h3>
              
              <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                <span style={{ 
                  fontSize: '16px', 
                  color: '#6b7280',
                  marginRight: '20px'
                }}>
                  {currentIndex + 1} / {displayStocks.length}
                </span>
                
                {isPlaying && (
                  <div style={{ marginTop: '10px' }}>
                    <span style={{ 
                      padding: '3px 8px', 
                      backgroundColor: '#fef3c7', 
                      color: '#92400e', 
                      borderRadius: '5px',
                      fontSize: '12px'
                    }}>
                      🔄 自動巡回中 (3秒間隔)
                    </span>
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={goToPrevious}
                  style={{
                    padding: '12px 20px',
                    border: '2px solid #d1d5db',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    width: '100%'
                  }}
                >
                  ⏮️ 前の銘柄
                </button>
                
                <button
                  onClick={togglePlayback}
                  style={{
                    padding: '15px 20px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: isPlaying ? '#dc2626' : '#2563eb',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    width: '100%'
                  }}
                >
                  {isPlaying ? '⏸️ 停止' : '▶️ 自動巡回開始'}
                </button>
                
                <button
                  onClick={goToNext}
                  style={{
                    padding: '12px 20px',
                    border: '2px solid #d1d5db',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    width: '100%'
                  }}
                >
                  ⏭️ 次の銘柄
                </button>
              </div>

              <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', marginTop: '15px' }}>
                <p>キーボードショートカット:</p>
                <p>Space (再生/停止)</p>
                <p>← → (前/次の銘柄)</p>
                <p>F (お気に入り切り替え)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
