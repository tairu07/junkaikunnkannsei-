import { kv } from '@vercel/kv'

// データベース接続設定
export const db = kv

// キー定義
export const KEYS = {
  STOCKS_LIST: 'stocks:list',
  STOCK_DATA: (code) => `stock:${code}:data`,
  STOCK_CHART: (code) => `stock:${code}:chart`,
  LAST_UPDATE: 'system:last_update'
}

// 銘柄リストを取得
export async function getStocksList() {
  try {
    const stocks = await db.get(KEYS.STOCKS_LIST)
    return stocks || []
  } catch (error) {
    console.error('Failed to get stocks list:', error)
    return []
  }
}

// 銘柄リストを保存
export async function saveStocksList(stocks) {
  try {
    await db.set(KEYS.STOCKS_LIST, stocks)
    return true
  } catch (error) {
    console.error('Failed to save stocks list:', error)
    return false
  }
}

// 個別銘柄データを取得
export async function getStockData(code) {
  try {
    const data = await db.get(KEYS.STOCK_DATA(code))
    return data
  } catch (error) {
    console.error(`Failed to get stock data for ${code}:`, error)
    return null
  }
}

// 個別銘柄データを保存
export async function saveStockData(code, data) {
  try {
    await db.set(KEYS.STOCK_DATA(code), data)
    return true
  } catch (error) {
    console.error(`Failed to save stock data for ${code}:`, error)
    return false
  }
}

// チャートデータを取得
export async function getChartData(code) {
  try {
    const data = await db.get(KEYS.STOCK_CHART(code))
    return data
  } catch (error) {
    console.error(`Failed to get chart data for ${code}:`, error)
    return null
  }
}

// チャートデータを保存
export async function saveChartData(code, data) {
  try {
    await db.set(KEYS.STOCK_CHART(code), data)
    return true
  } catch (error) {
    console.error(`Failed to save chart data for ${code}:`, error)
    return false
  }
}

// 複数の銘柄データを一括取得
export async function getBatchStockData(codes) {
  try {
    const keys = codes.map(code => KEYS.STOCK_DATA(code))
    const results = await db.mget(...keys)
    
    const stockData = {}
    codes.forEach((code, index) => {
      if (results[index]) {
        stockData[code] = results[index]
      }
    })
    
    return stockData
  } catch (error) {
    console.error('Failed to get batch stock data:', error)
    return {}
  }
}

// 最終更新時刻を取得
export async function getLastUpdate() {
  try {
    const timestamp = await db.get(KEYS.LAST_UPDATE)
    return timestamp ? new Date(timestamp) : null
  } catch (error) {
    console.error('Failed to get last update:', error)
    return null
  }
}

// 最終更新時刻を保存
export async function setLastUpdate() {
  try {
    await db.set(KEYS.LAST_UPDATE, new Date().toISOString())
    return true
  } catch (error) {
    console.error('Failed to set last update:', error)
    return false
  }
}
