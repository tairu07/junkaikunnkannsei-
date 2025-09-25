import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Play, Pause, SkipForward, SkipBack, Search, Database, Wifi, WifiOff } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar } from 'recharts'
import { getStocksList, getStockData, getChartData, getBatchStockData } from './lib/database.js'
import './App.css'

function App() {
  const [stocks, setStocks] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(2000)
  const [searchQuery, setSearchQuery] = useState('')
  const [marketFilter, setMarketFilter] = useState('ALL')
  const [chartData, setChartData] = useState([])
  const [currentStock, setCurrentStock] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isOnline, setIsOnline] = useState(true)
  const [dataCache, setDataCache] = useState({})

  // フィルタリングされた銘柄リスト
  const filteredStocks = stocks.filter(stock => {
    const matchesSearch = stock.code.includes(searchQuery) || 
                         stock.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesMarket = marketFilter === 'ALL' || stock.market === marketFilter
    return matchesSearch && matchesMarket
  })

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
      
      console.log('📊 銘柄リストを読み込み中...')
      const stocksList = await getStocksList()
      
      if (!stocksList || stocksList.length === 0) {
        throw new Error('銘柄データが見つかりません。データベースの初期化が必要です。')
      }
      
      setStocks(stocksList)
      console.log(`✅ ${stocksList.length}銘柄を読み込みました`)
      
      // 最初の銘柄データを読み込み
      if (stocksList.length > 0) {
        await loadStockData(stocksList[0].code)
      }
      
    } catch (err) {
      console.error('❌ 初期データ読み込みエラー:', err)
      setError(err.message)
      
      // フォールバック: モックデータを使用
      console.log('🔄 モックデータにフォールバック中...')
      const mockStocks = generateMockStocks()
      setStocks(mockStocks)
      if (mockStocks.length > 0) {
        setCurrentStock(generateMockStockData(mockStocks[0]))
        setChartData(generateMockChartData())
      }
    } finally {
      setLoading(false)
    }
  }

  // 個別銘柄データ読み込み
  async function loadStockData(code) {
    try {
      // キャッシュから確認
      if (dataCache[code]) {
        setCurrentStock(dataCache[code].stock)
        setChartData(dataCache[code].chart)
        return
      }
      
      console.log(`📈 ${code}のデータを読み込み中...`)
      
      // 並行してデータを取得
      const [stockData, chartDataResult] = await Promise.all([
        getStockData(code),
        getChartData(code)
      ])
      
      if (!stockData || !chartDataResult) {
        throw new Error(`${code}のデータが見つかりません`)
      }
      
      // キャッシュに保存
      setDataCache(prev => ({
        ...prev,
        [code]: {
          stock: stockData,
          chart: chartDataResult,
          timestamp: Date.now()
        }
      }))
      
      setCurrentStock(stockData)
      setChartData(chartDataResult)
      
    } catch (err) {
      console.error(`❌ ${code}のデータ読み込みエラー:`, err)
      
      // フォールバック: モックデータ
      const stock = stocks.find(s => s.code === code)
      if (stock) {
        setCurrentStock(generateMockStockData(stock))
        setChartData(generateMockChartData())
      }
    }
  }

  // 現在の銘柄が変更された時にデータを読み込み
  useEffect(() => {
    if (filteredStocks.length > 0 && currentIndex < filteredStocks.length) {
      const stock = filteredStocks[currentIndex]
      loadStockData(stock.code)
    }
  }, [currentIndex, filteredStocks])

  // 自動ローテーション
  useEffect(() => {
    if (!isPlaying || filteredStocks.length === 0) return

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % filteredStocks.length)
    }, speed)

    return () => clearInterval(interval)
  }, [isPlaying, speed, filteredStocks.length])

  // キーボードショートカット
  useEffect(() => {
    const handleKeyPress = (e) => {
      switch (e.key) {
        case ' ':
          e.preventDefault()
          setIsPlaying(prev => !prev)
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

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % filteredStocks.length)
  }, [filteredStocks.length])

  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + filteredStocks.length) % filteredStocks.length)
  }, [filteredStocks.length])

  const togglePlayback = () => {
    setIsPlaying(prev => !prev)
  }

  // モックデータ生成（フォールバック用）
  function generateMockStocks() {
    const companies = ['極洋', '日本水産', '大成建設', '明治ホールディングス', 'キリンホールディングス']
    const markets = ['PRIME', 'STANDARD', 'GROWTH']
    
    return Array.from({ length: 100 }, (_, i) => ({
      code: (1301 + i).toString(),
      name: companies[i % companies.length],
      market: markets[i % markets.length],
      sector: '食料品'
    }))
  }

  function generateMockStockData(stock) {
    const basePrice = 1000 + Math.random() * 4000
    return {
      ...stock,
      price: Math.round(basePrice * 100) / 100,
      change: Math.round((Math.random() - 0.5) * 200 * 100) / 100,
      changePercent: Math.round((Math.random() - 0.5) * 10 * 100) / 100,
      volume: Math.floor(Math.random() * 10000000),
      high: Math.round(basePrice * 1.05 * 100) / 100,
      low: Math.round(basePrice * 0.95 * 100) / 100,
      open: Math.round(basePrice * (0.98 + Math.random() * 0.04) * 100) / 100
    }
  }

  function generateMockChartData() {
    const data = []
    let price = 1000 + Math.random() * 4000
    
    for (let i = 0; i < 100; i++) {
      const change = (Math.random() - 0.5) * price * 0.02
      price = Math.max(price + change, price * 0.8)
      
      data.push({
        date: new Date(Date.now() - (100 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
        price: Math.round(price * 100) / 100,
        volume: Math.floor(Math.random() * 1000000)
      })
    }
    
    return data
  }

  // ローディング状態
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Database className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
          <h2 className="text-xl font-semibold mb-2">データベースから読み込み中...</h2>
          <p className="text-gray-600">TSE全銘柄データを取得しています</p>
        </div>
      </div>
    )
  }

  // エラー状態
  if (error && stocks.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <WifiOff className="w-12 h-12 mx-auto mb-4 text-red-600" />
          <h2 className="text-xl font-semibold mb-2 text-red-600">データ読み込みエラー</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadInitialData}>再試行</Button>
        </div>
      </div>
    )
  }

  if (!currentStock) return <div>Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                日本株チャート巡回ツール v2.0
              </h1>
              <p className="text-gray-600">
                TSE全銘柄対応 - Vercel KVデータベース連携
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <Wifi className="w-3 h-3 mr-1" />
                  オンライン
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <WifiOff className="w-3 h-3 mr-1" />
                  オフライン
                </Badge>
              )}
              {error && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  <Database className="w-3 h-3 mr-1" />
                  モックデータ
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左サイドバー: コントロールパネル */}
          <div className="lg:col-span-1 space-y-4">
            {/* 検索・フィルタ */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  検索・フィルタ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">銘柄検索</label>
                  <Input
                    placeholder="銘柄コードまたは名称"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">市場</label>
                  <Select value={marketFilter} onValueChange={setMarketFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">全市場</SelectItem>
                      <SelectItem value="PRIME">プライム</SelectItem>
                      <SelectItem value="STANDARD">スタンダード</SelectItem>
                      <SelectItem value="GROWTH">グロース</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* ナビゲーションコントロール */}
            <Card>
              <CardHeader>
                <CardTitle>巡回コントロール</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPrevious}
                    title="前の銘柄 (←)"
                    disabled={filteredStocks.length === 0}
                  >
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={isPlaying ? "destructive" : "default"}
                    size="sm"
                    onClick={togglePlayback}
                    title={isPlaying ? "停止 (Space)" : "再生 (Space)"}
                    disabled={filteredStocks.length === 0}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNext}
                    title="次の銘柄 (→)"
                    disabled={filteredStocks.length === 0}
                  >
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </div>

                <div className="text-center text-sm text-gray-600">
                  {filteredStocks.length > 0 ? `${currentIndex + 1} / ${filteredStocks.length}` : '0 / 0'}
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">巡回速度</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[1000, 2000, 3000].map((ms) => (
                      <Button
                        key={ms}
                        variant={speed === ms ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSpeed(ms)}
                      >
                        {ms / 1000}s
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* データベース情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  データベース
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span>総銘柄数:</span>
                  <span className="font-semibold">{stocks.length.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>キャッシュ:</span>
                  <span className="font-semibold">{Object.keys(dataCache).length}銘柄</span>
                </div>
                <div className="flex justify-between">
                  <span>データソース:</span>
                  <span className="font-semibold">{error ? 'Mock' : 'Vercel KV'}</span>
                </div>
              </CardContent>
            </Card>

            {/* ショートカット */}
            <Card>
              <CardHeader>
                <CardTitle>ショートカット</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div>Space: 再生/停止</div>
                <div>←/→: 前/次の銘柄</div>
              </CardContent>
            </Card>
          </div>

          {/* メインエリア: チャートと銘柄情報 */}
          <div className="lg:col-span-3 space-y-6">
            {/* 銘柄情報ヘッダー */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {currentStock.code} - {currentStock.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{currentStock.market}</Badge>
                      {currentStock.sector && (
                        <Badge variant="outline">{currentStock.sector}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">
                      ¥{currentStock.price.toLocaleString()}
                    </div>
                    <div className={`text-lg ${currentStock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {currentStock.change >= 0 ? '+' : ''}{currentStock.change} 
                      ({currentStock.changePercent >= 0 ? '+' : ''}{currentStock.changePercent}%)
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">始値</div>
                    <div className="font-semibold">¥{currentStock.open.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">高値</div>
                    <div className="font-semibold">¥{currentStock.high.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">安値</div>
                    <div className="font-semibold">¥{currentStock.low.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">出来高</div>
                    <div className="font-semibold">{currentStock.volume.toLocaleString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* チャート */}
            <Card>
              <CardHeader>
                <CardTitle>株価チャート (365日間)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        yAxisId="price"
                        orientation="left"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        yAxisId="volume"
                        orientation="right"
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'close' ? `¥${value.toLocaleString()}` : value.toLocaleString(),
                          name === 'close' ? '終値' : '出来高'
                        ]}
                      />
                      <Line
                        yAxisId="price"
                        type="monotone"
                        dataKey="close"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Bar
                        yAxisId="volume"
                        dataKey="volume"
                        fill="#94a3b8"
                        opacity={0.3}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 統計情報 */}
            <Card>
              <CardHeader>
                <CardTitle>統計情報</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {filteredStocks.length}
                    </div>
                    <div className="text-sm text-gray-600">対象銘柄数</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {stocks.filter(s => s.change > 0).length}
                    </div>
                    <div className="text-sm text-gray-600">上昇銘柄</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {stocks.filter(s => s.change < 0).length}
                    </div>
                    <div className="text-sm text-gray-600">下落銘柄</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">
                      {Object.keys(dataCache).length}
                    </div>
                    <div className="text-sm text-gray-600">キャッシュ済み</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
