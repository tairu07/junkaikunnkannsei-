// リアルな株価データ生成スクリプト
import { saveStocksList, saveStockData, saveChartData, setLastUpdate } from '../src/lib/database.js'

// 実在する日本企業のデータ
const REAL_COMPANIES = [
  { code: '1301', name: '極洋', market: 'PRIME', sector: '水産・農林業', basePrice: 1500 },
  { code: '1332', name: '日本水産', market: 'PRIME', sector: '水産・農林業', basePrice: 1900 },
  { code: '1801', name: '大成建設', market: 'PRIME', sector: '建設業', basePrice: 1950 },
  { code: '1802', name: '大林組', market: 'PRIME', sector: '建設業', basePrice: 1100 },
  { code: '1803', name: '清水建設', market: 'PRIME', sector: '建設業', basePrice: 900 },
  { code: '1925', name: '大和ハウス工業', market: 'PRIME', sector: '建設業', basePrice: 3200 },
  { code: '2002', name: '日清製粉グループ本社', market: 'PRIME', sector: '食料品', basePrice: 1600 },
  { code: '2269', name: '明治ホールディングス', market: 'PRIME', sector: '食料品', basePrice: 2800 },
  { code: '2502', name: 'アサヒグループホールディングス', market: 'PRIME', sector: '食料品', basePrice: 4500 },
  { code: '2503', name: 'キリンホールディングス', market: 'PRIME', sector: '食料品', basePrice: 2100 },
  { code: '2801', name: 'キッコーマン', market: 'PRIME', sector: '食料品', basePrice: 8500 },
  { code: '2802', name: '味の素', market: 'PRIME', sector: '食料品', basePrice: 5200 },
  { code: '3101', name: '東洋紡', market: 'PRIME', sector: '繊維製品', basePrice: 1200 },
  { code: '3348', name: 'コムシード', market: 'GROWTH', sector: '情報・通信業', basePrice: 800 },
  { code: '3349', name: 'コスモス薬品', market: 'PRIME', sector: '小売業', basePrice: 15000 },
  { code: '4063', name: '信越化学工業', market: 'PRIME', sector: '化学', basePrice: 25000 },
  { code: '4502', name: '武田薬品工業', market: 'PRIME', sector: '医薬品', basePrice: 4000 },
  { code: '4503', name: 'アステラス製薬', market: 'PRIME', sector: '医薬品', basePrice: 1500 },
  { code: '6501', name: '日立製作所', market: 'PRIME', sector: '電気機器', basePrice: 3500 },
  { code: '6502', name: '東芝', market: 'PRIME', sector: '電気機器', basePrice: 4500 },
  { code: '6758', name: 'ソニーグループ', market: 'PRIME', sector: '電気機器', basePrice: 13000 },
  { code: '6861', name: 'キーエンス', market: 'PRIME', sector: '電気機器', basePrice: 50000 },
  { code: '7203', name: 'トヨタ自動車', market: 'PRIME', sector: '輸送用機器', basePrice: 2800 },
  { code: '7267', name: 'ホンダ', market: 'PRIME', sector: '輸送用機器', basePrice: 1500 },
  { code: '7974', name: '任天堂', market: 'PRIME', sector: 'その他製品', basePrice: 7500 },
  { code: '8031', name: '三井物産', market: 'PRIME', sector: '卸売業', basePrice: 3500 },
  { code: '8058', name: '三菱商事', market: 'PRIME', sector: '卸売業', basePrice: 2800 },
  { code: '8306', name: '三菱UFJフィナンシャル・グループ', market: 'PRIME', sector: '銀行業', basePrice: 1300 },
  { code: '8316', name: '三井住友フィナンシャルグループ', market: 'PRIME', sector: '銀行業', basePrice: 6500 },
  { code: '8411', name: 'みずほフィナンシャルグループ', market: 'PRIME', sector: '銀行業', basePrice: 2200 },
  { code: '9432', name: 'NTT', market: 'PRIME', sector: '情報・通信業', basePrice: 180 },
  { code: '9433', name: 'KDDI', market: 'PRIME', sector: '情報・通信業', basePrice: 4200 },
  { code: '9434', name: 'ソフトバンク', market: 'PRIME', sector: '情報・通信業', basePrice: 1500 },
  { code: '9984', name: 'ソフトバンクグループ', market: 'PRIME', sector: '情報・通信業', basePrice: 7500 }
]

// 追加の企業名リスト（残りの銘柄用）
const ADDITIONAL_COMPANIES = [
  'アイシン', 'デンソー', 'ブリヂストン', '住友電気工業', '古河電気工業',
  'フジクラ', '昭和電線ホールディングス', '三菱電機', 'パナソニック', 'シャープ',
  '富士通', 'NEC', '沖電気工業', '横河電機', 'アンリツ',
  'オムロン', 'ファナック', '安川電機', 'ダイキン工業', 'クボタ',
  'コマツ', '日立建機', 'タダノ', '三菱重工業', 'IHI',
  '川崎重工業', 'スバル', 'マツダ', 'スズキ', 'ダイハツ工業',
  'いすゞ自動車', '日野自動車', 'ヤマハ発動機', '川崎重工業', 'シマノ',
  'ヤマハ', 'カシオ計算機', 'シチズン時計', 'セイコーホールディングス', 'リコー',
  'キヤノン', 'ニコン', 'オリンパス', 'テルモ', 'オムロン',
  '島津製作所', '堀場製作所', '日本電子', '日立ハイテク', 'アドバンテスト',
  '東京エレクトロン', 'ディスコ', 'レーザーテック', 'SCREEN', 'ウシオ電機'
]

// 市場とセクターの組み合わせ
const MARKETS = ['PRIME', 'STANDARD', 'GROWTH']
const SECTORS = [
  '水産・農林業', '鉱業', '建設業', '食料品', '繊維製品', 'パルプ・紙', '化学',
  '医薬品', '石油・石炭製品', 'ゴム製品', 'ガラス・土石製品', '鉄鋼', '非鉄金属',
  '金属製品', '機械', '電気機器', '輸送用機器', '精密機器', 'その他製品',
  '電気・ガス業', '陸運業', '海運業', '空運業', '倉庫・運輸関連業', '情報・通信業',
  '卸売業', '小売業', '銀行業', '証券・商品先物取引業', '保険業', 'その他金融業',
  '不動産業', 'サービス業'
]

// 全銘柄データを生成
function generateAllStocks() {
  const stocks = []
  
  // 実在企業データを追加
  REAL_COMPANIES.forEach(company => {
    stocks.push(company)
  })
  
  // 残りの銘柄を生成（3900 - 実在企業数）
  const remainingCount = 3900 - REAL_COMPANIES.length
  
  for (let i = 0; i < remainingCount; i++) {
    const code = (2000 + i).toString()
    const companyName = ADDITIONAL_COMPANIES[i % ADDITIONAL_COMPANIES.length]
    const market = MARKETS[i % MARKETS.length]
    const sector = SECTORS[i % SECTORS.length]
    const basePrice = Math.floor(Math.random() * 10000) + 500 // 500-10500円
    
    stocks.push({
      code,
      name: companyName,
      market,
      sector,
      basePrice
    })
  }
  
  return stocks.sort((a, b) => parseInt(a.code) - parseInt(b.code))
}

// リアルな株価推移を生成（ランダムウォーク + トレンド）
function generateRealisticPriceData(basePrice, days = 365) {
  const data = []
  let currentPrice = basePrice
  
  // 年間トレンド（-20% ～ +30%）
  const yearlyTrend = (Math.random() - 0.3) * 0.5
  const dailyTrend = yearlyTrend / days
  
  // ボラティリティ（価格帯に応じて調整）
  const volatility = Math.min(0.05, Math.max(0.01, 1000 / basePrice * 0.02))
  
  for (let i = 0; i < days; i++) {
    const date = new Date()
    date.setDate(date.getDate() - (days - i))
    
    // 週末をスキップ
    if (date.getDay() === 0 || date.getDay() === 6) {
      continue
    }
    
    // 日次変動（平均回帰 + トレンド + ランダム）
    const meanReversion = (basePrice - currentPrice) * 0.001
    const randomChange = (Math.random() - 0.5) * volatility
    const dailyChange = meanReversion + dailyTrend + randomChange
    
    currentPrice = Math.max(currentPrice * (1 + dailyChange), basePrice * 0.3)
    
    const open = currentPrice * (0.995 + Math.random() * 0.01)
    const high = Math.max(open, currentPrice) * (1 + Math.random() * 0.02)
    const low = Math.min(open, currentPrice) * (1 - Math.random() * 0.02)
    const close = currentPrice
    const volume = Math.floor(Math.random() * 5000000) + 100000
    
    data.push({
      date: date.toISOString().split('T')[0],
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume
    })
  }
  
  return data
}

// 現在の株価情報を生成
function generateCurrentStockInfo(stock, chartData) {
  const latestData = chartData[chartData.length - 1]
  const previousData = chartData[chartData.length - 2]
  
  const currentPrice = latestData.close
  const previousPrice = previousData.close
  const change = currentPrice - previousPrice
  const changePercent = (change / previousPrice) * 100
  
  return {
    code: stock.code,
    name: stock.name,
    market: stock.market,
    sector: stock.sector,
    price: currentPrice,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    volume: latestData.volume,
    high: latestData.high,
    low: latestData.low,
    open: latestData.open,
    lastUpdate: new Date().toISOString()
  }
}

// メイン実行関数
export async function generateAndSaveAllData() {
  console.log('🚀 株価データ生成を開始します...')
  
  try {
    // 1. 全銘柄リストを生成
    console.log('📊 銘柄リストを生成中...')
    const stocks = generateAllStocks()
    await saveStocksList(stocks)
    console.log(`✅ ${stocks.length}銘柄のリストを保存しました`)
    
    // 2. 各銘柄のデータを生成・保存
    console.log('📈 各銘柄の株価データを生成中...')
    
    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i]
      
      // チャートデータ生成（365日分）
      const chartData = generateRealisticPriceData(stock.basePrice, 365)
      
      // 現在の株価情報生成
      const stockInfo = generateCurrentStockInfo(stock, chartData)
      
      // データベースに保存
      await saveStockData(stock.code, stockInfo)
      await saveChartData(stock.code, chartData)
      
      // 進捗表示
      if ((i + 1) % 100 === 0) {
        console.log(`📊 進捗: ${i + 1}/${stocks.length} 銘柄完了`)
      }
    }
    
    // 3. 最終更新時刻を保存
    await setLastUpdate()
    
    console.log('🎉 全データの生成・保存が完了しました！')
    console.log(`📊 総銘柄数: ${stocks.length}`)
    console.log(`📈 チャートデータ: 各銘柄365日分`)
    console.log(`💾 データベース: Vercel KV`)
    
    return true
    
  } catch (error) {
    console.error('❌ データ生成中にエラーが発生しました:', error)
    return false
  }
}

// スクリプトが直接実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
  generateAndSaveAllData()
    .then(() => {
      console.log('✅ スクリプト実行完了')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ スクリプト実行エラー:', error)
      process.exit(1)
    })
}
