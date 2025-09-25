import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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

function App() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [stocksData, setStocksData] = useState([])

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

  // チャートデータを生成
  const generateChartData = (basePrice) => {
    const data = []
    let price = basePrice
    
    for (let i = 0; i < 5; i++) {
      const change = (Math.random() - 0.5) * basePrice * 0.02
      price = Math.max(price + change, basePrice * 0.9)
      
      data.push({
        date: `9/${20 + i}`,
        price: Math.round(price)
      })
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
  const chartData = currentStock ? generateChartData(currentStock.basePrice) : []

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
    }, 2000) // 2秒間隔

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
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* ヘッダー */}
        <div style={{ marginBottom: '30px', textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: 'bold', 
            color: '#111827', 
            marginBottom: '10px' 
          }}>
            日本株チャート巡回ツール v2.0
          </h1>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>
            TSE主要銘柄対応 - 自動ローテーション機能付き
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

        {/* チャート */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '30px', 
          borderRadius: '10px', 
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
            📈 株価チャート (5日間)
          </h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`¥${value.toLocaleString()}`, '株価']}
                />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
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
                🔄 自動巡回中
              </span>
            )}
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={goToPrevious}
              style={{
                padding: '10px 20px',
                margin: '0 10px',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ⏮️ 前の銘柄
            </button>
            
            <button
              onClick={togglePlayback}
              style={{
                padding: '10px 20px',
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
                padding: '10px 20px',
                margin: '0 10px',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '16px'
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
