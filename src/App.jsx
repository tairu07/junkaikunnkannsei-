import { useState, useEffect } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

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

// カスタムローソク足コンポーネント
const CandlestickChart = ({ data, width, height }) => {
  const margin = { top: 20, right: 30, bottom: 20, left: 60 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom
  
  // データの最大値と最小値を計算
  const allPrices = data.flatMap(d => [d.open, d.high, d.low, d.close])
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

  // 高度なチャートデータを生成
  const generateAdvancedChartData = (basePrice, period, timeframe) => {
    const periodConfig = PERIOD_OPTIONS.find(p => p.value === period)
    let dataPoints = periodConfig.days
    
    // 時間軸に応じてデータポイント数を調整
    if (timeframe === 'weekly') {
      dataPoints = Math.floor(dataPoints / 5)
    } else if (timeframe === 'monthly') {
      dataPoints = Math.floor(dataPoints / 22)
    }
    
    const data = []
    let currentPrice = basePrice
    let currentDate = new Date()
    currentDate.setDate(currentDate.getDate() - dataPoints)
    
    for (let i = 0; i < dataPoints; i++) {
      // トレンドとランダムウォークを組み合わせ
      const trend = Math.sin(i / dataPoints * Math.PI * 2) * 0.001
      const randomWalk = (Math.random() - 0.5) * 0.02
      const priceChange = (trend + randomWalk) * basePrice
      
      currentPrice = Math.max(currentPrice + priceChange, basePrice * 0.3)
      
      // ローソク足データを生成
      const dayVariation = currentPrice * 0.02
      const open = currentPrice + (Math.random() - 0.5) * dayVariation
      const close = currentPrice + (Math.random() - 0.5) * dayVariation
      const high = Math.max(open, close) + Math.random() * dayVariation * 0.5
      const low = Math.min(open, close) - Math.random() * dayVariation * 0.5
      const volume = Math.floor(Math.random() * 1000000 + 100000)
      
      // 日付フォーマット
      let dateLabel
      if (timeframe === 'monthly') {
        dateLabel = `${currentDate.getFullYear()}/${String(currentDate.getMonth() + 1).padStart(2, '0')}`
      } else if (timeframe === 'weekly') {
        dateLabel = `${currentDate.getMonth() + 1}/${currentDate.getDate()}`
      } else {
        dateLabel = `${currentDate.getMonth() + 1}/${currentDate.getDate()}`
      }
      
      data.push({
        date: dateLabel,
        open: Math.round(open),
        high: Math.round(high),
        low: Math.round(low),
        close: Math.round(close),
        volume: volume,
        priceForLine: Math.round(close) // ライン表示用
      })
      
      // 次の日付
      if (timeframe === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + 1)
      } else if (timeframe === 'weekly') {
        currentDate.setDate(currentDate.getDate() + 7)
      } else {
        currentDate.setDate(currentDate.getDate() + 1)
      }
    }
    
    return data
  }

  // 初期化
  useEffect(() => {
    const initialData = STOCKS.map(generateStockData)
    setStocksData(initialData)
  }, [])

  // 現在の銘柄
  const currentStock = stocksData[currentIndex]
  const chartData = currentStock ? generateAdvancedChartData(currentStock.basePrice, selectedPeriod, selectedTimeframe) : []

  // 次の銘柄
  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % stocksData.length)
  }

  // 前の銘柄
  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + stocksData.length) % stocksData.length)
  }

  // 再生/停止
  const togglePlayback = () => {
    setIsPlaying(!isPlaying)
  }

  // 自動ローテーション
  useEffect(() => {
    if (!isPlaying || stocksData.length === 0) return

    const interval = setInterval(() => {
      goToNext()
    }, 3000) // 3秒間隔

    return () => clearInterval(interval)
  }, [isPlaying, stocksData.length])

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
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  if (!currentStock) {
    return <div>Loading...</div>
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f9fafb', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* ヘッダー */}
        <div style={{ marginBottom: '30px', textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: 'bold', 
            color: '#111827', 
            marginBottom: '10px' 
          }}>
            日本株チャート巡回ツール v2.0 Pro
          </h1>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>
            TSE主要銘柄対応 - プロレベル株価チャート分析
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
              fontSize: '14px'
            }}>
              📊 {stocksData.length}銘柄
            </span>
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
          <div style={{ height: '400px', marginBottom: '20px' }}>
            <CandlestickChart data={chartData} width={1340} height={400} />
          </div>
          
          {/* 出来高チャート */}
          <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>
            📊 出来高
          </h4>
          <div style={{ height: '150px' }}>
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
        </div>

        {/* コントロール */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '30px', 
          borderRadius: '10px', 
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
            🎮 巡回コントロール
          </h3>
          
          <div style={{ marginBottom: '20px' }}>
            <span style={{ 
              fontSize: '16px', 
              color: '#6b7280',
              marginRight: '20px'
            }}>
              {currentIndex + 1} / {stocksData.length}
            </span>
            
            {isPlaying && (
              <span style={{ 
                padding: '3px 8px', 
                backgroundColor: '#fef3c7', 
                color: '#92400e', 
                borderRadius: '5px',
                fontSize: '12px'
              }}>
                🔄 自動巡回中 (3秒間隔)
              </span>
            )}
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={goToPrevious}
              style={{
                padding: '12px 24px',
                margin: '0 10px',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              ⏮️ 前の銘柄
            </button>
            
            <button
              onClick={togglePlayback}
              style={{
                padding: '12px 24px',
                margin: '0 10px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: isPlaying ? '#dc2626' : '#2563eb',
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              {isPlaying ? '⏸️ 停止' : '▶️ 自動巡回開始'}
            </button>
            
            <button
              onClick={goToNext}
              style={{
                padding: '12px 24px',
                margin: '0 10px',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              ⏭️ 次の銘柄
            </button>
          </div>

          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            <p>キーボードショートカット: Space (再生/停止), ← → (前/次の銘柄)</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
