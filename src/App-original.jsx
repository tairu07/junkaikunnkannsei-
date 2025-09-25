import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Play, Pause, SkipForward, SkipBack, Search } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar } from 'recharts'
import './App.css'

// TSE全銘柄のモックデータ
const generateTSEStocks = () => {
  const stocks = []
  const companies = [
    '極洋', '日本水産', '大成建設', '明治ホールディングス', 'キリンホールディングス',
    'トヨタ自動車', 'ソニーグループ', '任天堂', 'ソフトバンクグループ', '三菱UFJフィナンシャル・グループ',
    '三井住友フィナンシャルグループ', 'みずほフィナンシャルグループ', '東京海上ホールディングス', '第一生命ホールディングス',
    'KDDI', 'NTTドコモ', 'JR東日本', 'JR東海', 'ANA', 'JAL',
    '三菱商事', '三井物産', '伊藤忠商事', '住友商事', '丸紅',
    'ファーストリテイリング', 'セブン&アイ・ホールディングス', 'イオン', 'ローソン', 'ファミリーマート',
    '武田薬品工業', 'アステラス製薬', '第一三共', 'エーザイ', '中外製薬'
  ]
  
  const markets = ['PRIME', 'STANDARD', 'GROWTH']
  
  for (let i = 0; i < 3900; i++) {
    const code = (1301 + i).toString()
    const company = companies[i % companies.length]
    const market = markets[i % markets.length]
    const basePrice = 500 + Math.random() * 4500
    
    stocks.push({
      code,
      name: company,
      market,
      price: Math.round(basePrice * 100) / 100,
      change: Math.round((Math.random() - 0.5) * 200 * 100) / 100,
      changePercent: Math.round((Math.random() - 0.5) * 10 * 100) / 100,
      volume: Math.floor(Math.random() * 10000000),
      high: Math.round(basePrice * 1.05 * 100) / 100,
      low: Math.round(basePrice * 0.95 * 100) / 100,
      open: Math.round(basePrice * (0.98 + Math.random() * 0.04) * 100) / 100
    })
  }
  
  return stocks
}

// チャートデータ生成
const generateChartData = (stock) => {
  const data = []
  let price = stock.price
  
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

function App() {
  const [stocks] = useState(() => generateTSEStocks())
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(2000) // 2秒間隔
  const [searchQuery, setSearchQuery] = useState('')
  const [marketFilter, setMarketFilter] = useState('ALL')
  const [chartData, setChartData] = useState([])

  const currentStock = stocks[currentIndex]

  // フィルタリングされた銘柄リスト
  const filteredStocks = stocks.filter(stock => {
    const matchesSearch = stock.code.includes(searchQuery) || 
                         stock.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesMarket = marketFilter === 'ALL' || stock.market === marketFilter
    return matchesSearch && matchesMarket
  })

  // チャートデータの更新
  useEffect(() => {
    if (currentStock) {
      setChartData(generateChartData(currentStock))
    }
  }, [currentStock])

  // 自動ローテーション
  useEffect(() => {
    if (!isPlaying) return

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

  if (!currentStock) return <div>Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            日本株チャート巡回ツール v2.0
          </h1>
          <p className="text-gray-600">
            TSE全銘柄対応 - 自動ローテーション機能付き
          </p>
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
                  >
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={isPlaying ? "destructive" : "default"}
                    size="sm"
                    onClick={togglePlayback}
                    title={isPlaying ? "停止 (Space)" : "再生 (Space)"}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNext}
                    title="次の銘柄 (→)"
                  >
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </div>

                <div className="text-center text-sm text-gray-600">
                  {currentIndex + 1} / {filteredStocks.length}
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
                    <Badge variant="secondary">{currentStock.market}</Badge>
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
                <CardTitle>株価チャート (100日間)</CardTitle>
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
                          name === 'price' ? `¥${value.toLocaleString()}` : value.toLocaleString(),
                          name === 'price' ? '株価' : '出来高'
                        ]}
                      />
                      <Line
                        yAxisId="price"
                        type="monotone"
                        dataKey="price"
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
                      {filteredStocks.filter(s => s.change > 0).length}
                    </div>
                    <div className="text-sm text-gray-600">上昇銘柄</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {filteredStocks.filter(s => s.change < 0).length}
                    </div>
                    <div className="text-sm text-gray-600">下落銘柄</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">
                      {filteredStocks.filter(s => s.change === 0).length}
                    </div>
                    <div className="text-sm text-gray-600">変わらず</div>
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
