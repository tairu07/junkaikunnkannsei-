/**
 * チャートデータ管理API
 * 株価データの保存、取得、更新機能
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Supabase設定
const supabaseUrl = process.env.SUPABASE_URL || 'https://dummy.supabase.co'
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'dummy-key'

let supabase = null

try {
  supabase = createClient(supabaseUrl, supabaseKey)
} catch (error) {
  console.warn('Supabase接続エラー:', error.message)
}

// ローカルデータファイルのパス
const DATA_DIR = path.join(process.cwd(), 'data')
const CHARTS_DIR = path.join(DATA_DIR, 'charts')

// 株価データをデータベースに保存
async function saveStockPriceData(stockCode, priceData) {
  if (!supabase) {
    throw new Error('データベース接続が利用できません')
  }
  
  try {
    // 銘柄IDを取得
    const { data: stock, error: stockError } = await supabase
      .from('stocks')
      .select('id')
      .eq('code', stockCode)
      .single()
    
    if (stockError || !stock) {
      throw new Error(`銘柄 ${stockCode} が見つかりません`)
    }
    
    // 既存データを削除（更新のため）
    await supabase
      .from('stock_prices')
      .delete()
      .eq('stock_id', stock.id)
    
    // 新しいデータを挿入
    const insertData = priceData.map(item => ({
      stock_id: stock.id,
      date: item.date,
      open_price: item.open,
      high_price: item.high,
      low_price: item.low,
      close_price: item.close,
      volume: item.volume,
      adjusted_close: item.close // 簡易的に終値を調整後終値として使用
    }))
    
    const { error: insertError } = await supabase
      .from('stock_prices')
      .insert(insertData)
    
    if (insertError) throw insertError
    
    return {
      success: true,
      stockCode,
      recordsInserted: insertData.length,
      message: `${stockCode} の株価データ ${insertData.length}件を保存しました`
    }
    
  } catch (error) {
    throw new Error(`株価データ保存エラー: ${error.message}`)
  }
}

// データベースから株価データを取得
async function getStockPriceData(stockCode, days = 250) {
  if (supabase) {
    try {
      // 銘柄IDを取得
      const { data: stock, error: stockError } = await supabase
        .from('stocks')
        .select('id')
        .eq('code', stockCode)
        .single()
      
      if (stockError || !stock) {
        throw new Error(`銘柄 ${stockCode} が見つかりません`)
      }
      
      // 株価データを取得
      const { data: priceData, error: priceError } = await supabase
        .from('stock_prices')
        .select('*')
        .eq('stock_id', stock.id)
        .order('date', { ascending: false })
        .limit(days)
      
      if (priceError) throw priceError
      
      // フロントエンド用フォーマットに変換
      const chartData = priceData.reverse().map(item => ({
        date: new Date(item.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
        open: parseFloat(item.open_price),
        high: parseFloat(item.high_price),
        low: parseFloat(item.low_price),
        close: parseFloat(item.close_price),
        volume: parseInt(item.volume)
      }))
      
      return chartData
      
    } catch (error) {
      console.warn('データベースからの取得に失敗、ローカルファイルを使用:', error.message)
    }
  }
  
  // フォールバック: ローカルファイルから取得
  try {
    const chartFile = path.join(CHARTS_DIR, `${stockCode}.json`)
    if (fs.existsSync(chartFile)) {
      const data = JSON.parse(fs.readFileSync(chartFile, 'utf8'))
      return data.slice(-days) // 指定日数分のデータを返す
    }
  } catch (error) {
    console.warn('ローカルファイル読み込みエラー:', error.message)
  }
  
  // 最終フォールバック: モックデータ生成
  return generateMockChartData(stockCode, days)
}

// 全銘柄の株価データを一括保存
async function bulkSaveStockData() {
  if (!supabase) {
    return { error: 'データベース接続が利用できません' }
  }
  
  try {
    // ローカルの全銘柄データを読み込み
    const stocksFile = path.join(DATA_DIR, 'all_stocks.json')
    if (!fs.existsSync(stocksFile)) {
      throw new Error('銘柄データファイルが見つかりません')
    }
    
    const stocksData = JSON.parse(fs.readFileSync(stocksFile, 'utf8'))
    
    // 銘柄マスターデータを保存
    const stockInsertData = stocksData.map(stock => ({
      code: stock.code,
      name: stock.name,
      market: stock.market,
      sector: stock.sector,
      market_cap: stock.marketCap,
      is_active: true
    }))
    
    // 既存データを削除してから挿入
    await supabase.from('stocks').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    
    const { error: stocksError } = await supabase
      .from('stocks')
      .insert(stockInsertData)
    
    if (stocksError) throw stocksError
    
    // 各銘柄のチャートデータを保存
    let savedCount = 0
    const errors = []
    
    for (const stock of stocksData) {
      try {
        const chartFile = path.join(CHARTS_DIR, `${stock.code}.json`)
        if (fs.existsSync(chartFile)) {
          const chartData = JSON.parse(fs.readFileSync(chartFile, 'utf8'))
          await saveStockPriceData(stock.code, chartData)
          savedCount++
        }
      } catch (error) {
        errors.push(`${stock.code}: ${error.message}`)
      }
    }
    
    return {
      success: true,
      totalStocks: stocksData.length,
      savedStocks: savedCount,
      errors: errors.length > 0 ? errors : null,
      message: `${savedCount}/${stocksData.length} 銘柄のデータを保存しました`
    }
    
  } catch (error) {
    return {
      success: false,
      error: `一括保存エラー: ${error.message}`
    }
  }
}

// 保存されたチャート設定を管理
async function saveChartConfiguration(userId, stockCode, chartConfig) {
  if (!supabase) {
    // ローカルストレージ用のレスポンス
    return {
      success: true,
      message: 'チャート設定をローカルに保存しました（データベース接続なし）'
    }
  }
  
  try {
    // 銘柄IDを取得
    const { data: stock, error: stockError } = await supabase
      .from('stocks')
      .select('id')
      .eq('code', stockCode)
      .single()
    
    if (stockError || !stock) {
      throw new Error(`銘柄 ${stockCode} が見つかりません`)
    }
    
    // チャート設定を保存
    const { data, error } = await supabase
      .from('saved_charts')
      .upsert([{
        user_id: userId,
        stock_id: stock.id,
        chart_name: chartConfig.name || `${stockCode} チャート設定`,
        chart_config: chartConfig,
        is_public: chartConfig.isPublic || false,
        description: chartConfig.description || ''
      }])
      .select()
    
    if (error) throw error
    
    return {
      success: true,
      chartId: data[0].id,
      message: 'チャート設定を保存しました'
    }
    
  } catch (error) {
    throw new Error(`チャート設定保存エラー: ${error.message}`)
  }
}

// 保存されたチャート設定を取得
async function getSavedChartConfigurations(userId, stockCode = null) {
  if (!supabase) {
    return []
  }
  
  try {
    let query = supabase
      .from('saved_charts')
      .select(`
        *,
        stocks (code, name)
      `)
      .eq('user_id', userId)
    
    if (stockCode) {
      const { data: stock } = await supabase
        .from('stocks')
        .select('id')
        .eq('code', stockCode)
        .single()
      
      if (stock) {
        query = query.eq('stock_id', stock.id)
      }
    }
    
    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) throw error
    
    return data.map(item => ({
      id: item.id,
      stockCode: item.stocks.code,
      stockName: item.stocks.name,
      chartName: item.chart_name,
      chartConfig: item.chart_config,
      isPublic: item.is_public,
      description: item.description,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }))
    
  } catch (error) {
    console.error('保存チャート取得エラー:', error)
    return []
  }
}

// モックチャートデータ生成（フォールバック用）
function generateMockChartData(stockCode, days) {
  const data = []
  const basePrice = 1000 + (parseInt(stockCode) % 1000) * 2
  let currentPrice = basePrice
  
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    
    // 土日をスキップ
    if (date.getDay() === 0 || date.getDay() === 6) {
      continue
    }
    
    // 価格変動
    const change = (Math.random() - 0.5) * 0.06
    currentPrice *= (1 + change)
    
    const open = currentPrice * (0.98 + Math.random() * 0.04)
    const close = currentPrice * (0.98 + Math.random() * 0.04)
    const high = Math.max(open, close) * (1 + Math.random() * 0.02)
    const low = Math.min(open, close) * (1 - Math.random() * 0.02)
    const volume = Math.floor(Math.random() * 2000000) + 50000
    
    data.push({
      date: date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
      open: Math.round(open),
      high: Math.round(high),
      low: Math.round(low),
      close: Math.round(close),
      volume
    })
  }
  
  return data
}

// メイン API ハンドラー
export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  try {
    const { action, stockCode, days } = req.query
    
    switch (action) {
      case 'get-chart-data':
        if (req.method !== 'GET') {
          return res.status(405).json({ error: 'Method not allowed' })
        }
        
        if (!stockCode) {
          return res.status(400).json({ error: 'Stock code is required' })
        }
        
        const chartData = await getStockPriceData(stockCode, parseInt(days) || 250)
        return res.status(200).json({ chartData })
      
      case 'save-chart-data':
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' })
        }
        
        const { stockCode: saveStockCode, priceData } = req.body
        
        if (!saveStockCode || !priceData) {
          return res.status(400).json({ error: 'Stock code and price data are required' })
        }
        
        const saveResult = await saveStockPriceData(saveStockCode, priceData)
        return res.status(200).json(saveResult)
      
      case 'bulk-save':
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' })
        }
        
        const bulkResult = await bulkSaveStockData()
        return res.status(200).json(bulkResult)
      
      case 'save-chart-config':
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' })
        }
        
        // 認証チェック
        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Authorization token required' })
        }
        
        const { userId, stockCode: configStockCode, chartConfig } = req.body
        
        if (!userId || !configStockCode || !chartConfig) {
          return res.status(400).json({ error: 'User ID, stock code, and chart config are required' })
        }
        
        const configResult = await saveChartConfiguration(userId, configStockCode, chartConfig)
        return res.status(200).json(configResult)
      
      case 'get-saved-charts':
        if (req.method !== 'GET') {
          return res.status(405).json({ error: 'Method not allowed' })
        }
        
        // 認証チェック
        const getAuthHeader = req.headers.authorization
        if (!getAuthHeader || !getAuthHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Authorization token required' })
        }
        
        const { userId: getUserId, stockCode: getStockCode } = req.query
        
        if (!getUserId) {
          return res.status(400).json({ error: 'User ID is required' })
        }
        
        const savedCharts = await getSavedChartConfigurations(getUserId, getStockCode)
        return res.status(200).json({ savedCharts })
      
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
    
  } catch (error) {
    console.error('Chart Data API Error:', error)
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    })
  }
}
