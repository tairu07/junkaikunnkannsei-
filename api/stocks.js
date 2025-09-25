import { createClient } from '@supabase/supabase-js'

// Supabaseクライアントの初期化
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

// 日本の主要企業データ（フォールバック用）
const MOCK_STOCKS = [
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

// 株価データを生成する関数
function generateStockData(stock) {
  const change = (Math.random() - 0.5) * stock.basePrice * 0.05
  const currentPrice = Math.max(stock.basePrice + change, stock.basePrice * 0.5)
  const changePercent = (change / stock.basePrice) * 100
  
  return {
    ...stock,
    price: Math.round(currentPrice),
    change: Math.round(change),
    changePercent: Math.round(changePercent * 100) / 100,
    volume: Math.floor(Math.random() * 1000000) + 100000,
    lastUpdated: new Date().toISOString()
  }
}

// チャートデータを生成する関数
function generateChartData(stock, days = 250) {
  const data = []
  let currentPrice = stock.basePrice
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    
    // 価格変動を生成
    const volatility = 0.02
    const trend = (Math.random() - 0.5) * 0.001
    const change = (Math.random() - 0.5) * volatility + trend
    
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

// CORSヘッダーを設定する関数
function setCorsHeaders(response) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

export default async function handler(req, res) {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return setCorsHeaders(new Response(null, { status: 200 }))
  }

  try {
    const url = new URL(req.url, `https://${req.headers.host}`)
    const stockCode = url.searchParams.get('code')
    const action = url.searchParams.get('action') || 'list'
    const days = parseInt(url.searchParams.get('days')) || 250

    console.log(`📊 API Request: action=${action}, code=${stockCode}, days=${days}`)

    switch (action) {
      case 'list':
        // 銘柄一覧を取得
        try {
          const { data: stocks, error } = await supabase
            .from('stocks')
            .select('*')
            .order('code')

          if (error) {
            console.warn('⚠️ Supabase error, using mock data:', error.message)
            const mockData = MOCK_STOCKS.map(generateStockData)
            return setCorsHeaders(new Response(JSON.stringify({
              success: true,
              data: mockData,
              source: 'mock'
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }))
          }

          if (!stocks || stocks.length === 0) {
            console.log('📝 No stocks in database, using mock data')
            const mockData = MOCK_STOCKS.map(generateStockData)
            return setCorsHeaders(new Response(JSON.stringify({
              success: true,
              data: mockData,
              source: 'mock'
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }))
          }

          // データベースから取得した銘柄に現在価格を生成
          const stocksWithPrices = stocks.map(stock => generateStockData(stock))

          return setCorsHeaders(new Response(JSON.stringify({
            success: true,
            data: stocksWithPrices,
            source: 'database'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }))

        } catch (dbError) {
          console.error('❌ Database connection error:', dbError)
          const mockData = MOCK_STOCKS.map(generateStockData)
          return setCorsHeaders(new Response(JSON.stringify({
            success: true,
            data: mockData,
            source: 'mock',
            warning: 'Database unavailable, using mock data'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }))
        }

      case 'detail':
        if (!stockCode) {
          return setCorsHeaders(new Response(JSON.stringify({
            success: false,
            error: 'Stock code is required'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }))
        }

        // 個別銘柄の詳細データを取得
        try {
          const { data: stock, error } = await supabase
            .from('stocks')
            .select('*')
            .eq('code', stockCode)
            .single()

          let stockData
          if (error || !stock) {
            console.warn(`⚠️ Stock ${stockCode} not found in database, using mock data`)
            const mockStock = MOCK_STOCKS.find(s => s.code === stockCode)
            if (!mockStock) {
              return setCorsHeaders(new Response(JSON.stringify({
                success: false,
                error: 'Stock not found'
              }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
              }))
            }
            stockData = generateStockData(mockStock)
          } else {
            stockData = generateStockData(stock)
          }

          return setCorsHeaders(new Response(JSON.stringify({
            success: true,
            data: stockData,
            source: stock ? 'database' : 'mock'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }))

        } catch (dbError) {
          console.error('❌ Database error:', dbError)
          const mockStock = MOCK_STOCKS.find(s => s.code === stockCode)
          if (!mockStock) {
            return setCorsHeaders(new Response(JSON.stringify({
              success: false,
              error: 'Stock not found'
            }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' }
            }))
          }

          const stockData = generateStockData(mockStock)
          return setCorsHeaders(new Response(JSON.stringify({
            success: true,
            data: stockData,
            source: 'mock',
            warning: 'Database unavailable, using mock data'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }))
        }

      case 'chart':
        if (!stockCode) {
          return setCorsHeaders(new Response(JSON.stringify({
            success: false,
            error: 'Stock code is required for chart data'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }))
        }

        // チャートデータを取得
        try {
          const { data: stock, error } = await supabase
            .from('stocks')
            .select('*')
            .eq('code', stockCode)
            .single()

          let baseStock
          if (error || !stock) {
            console.warn(`⚠️ Stock ${stockCode} not found for chart, using mock data`)
            baseStock = MOCK_STOCKS.find(s => s.code === stockCode)
            if (!baseStock) {
              return setCorsHeaders(new Response(JSON.stringify({
                success: false,
                error: 'Stock not found for chart data'
              }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
              }))
            }
          } else {
            baseStock = stock
          }

          const chartData = generateChartData(baseStock, days)

          return setCorsHeaders(new Response(JSON.stringify({
            success: true,
            data: chartData,
            source: stock ? 'database' : 'mock',
            stockInfo: baseStock
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }))

        } catch (dbError) {
          console.error('❌ Chart data error:', dbError)
          const baseStock = MOCK_STOCKS.find(s => s.code === stockCode)
          if (!baseStock) {
            return setCorsHeaders(new Response(JSON.stringify({
              success: false,
              error: 'Stock not found for chart data'
            }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' }
            }))
          }

          const chartData = generateChartData(baseStock, days)
          return setCorsHeaders(new Response(JSON.stringify({
            success: true,
            data: chartData,
            source: 'mock',
            warning: 'Database unavailable, using mock data',
            stockInfo: baseStock
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }))
        }

      default:
        return setCorsHeaders(new Response(JSON.stringify({
          success: false,
          error: 'Invalid action. Use: list, detail, or chart'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }))
    }

  } catch (error) {
    console.error('❌ API Error:', error)
    return setCorsHeaders(new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }))
  }
}
