// テクニカル分析指標の計算ユーティリティ

/**
 * 単純移動平均線 (SMA) を計算
 * @param {Array} data - 価格データ配列
 * @param {number} period - 期間
 * @returns {Array} 移動平均線データ
 */
export const calculateSMA = (data, period) => {
  const sma = []
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(null) // 期間に満たない場合はnull
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, item) => acc + item.close, 0)
      sma.push(Math.round(sum / period))
    }
  }
  
  return sma
}

/**
 * 指数移動平均線 (EMA) を計算
 * @param {Array} data - 価格データ配列
 * @param {number} period - 期間
 * @returns {Array} 指数移動平均線データ
 */
export const calculateEMA = (data, period) => {
  const ema = []
  const multiplier = 2 / (period + 1)
  
  // 最初の値はSMAで初期化
  let sum = 0
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i].close
    if (i < period - 1) {
      ema.push(null)
    } else {
      ema.push(Math.round(sum / period))
    }
  }
  
  // EMA計算
  for (let i = period; i < data.length; i++) {
    const prevEma = ema[i - 1]
    const currentEma = (data[i].close - prevEma) * multiplier + prevEma
    ema.push(Math.round(currentEma))
  }
  
  return ema
}

/**
 * ボリンジャーバンドを計算
 * @param {Array} data - 価格データ配列
 * @param {number} period - 期間（デフォルト: 20）
 * @param {number} stdDev - 標準偏差倍率（デフォルト: 2）
 * @returns {Object} {upper, middle, lower} バンドデータ
 */
export const calculateBollingerBands = (data, period = 20, stdDev = 2) => {
  const middle = calculateSMA(data, period)
  const upper = []
  const lower = []
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(null)
      lower.push(null)
    } else {
      // 標準偏差を計算
      const slice = data.slice(i - period + 1, i + 1)
      const mean = middle[i]
      const variance = slice.reduce((acc, item) => acc + Math.pow(item.close - mean, 2), 0) / period
      const standardDeviation = Math.sqrt(variance)
      
      upper.push(Math.round(mean + (standardDeviation * stdDev)))
      lower.push(Math.round(mean - (standardDeviation * stdDev)))
    }
  }
  
  return { upper, middle, lower }
}

/**
 * RSI (相対力指数) を計算
 * @param {Array} data - 価格データ配列
 * @param {number} period - 期間（デフォルト: 14）
 * @returns {Array} RSIデータ
 */
export const calculateRSI = (data, period = 14) => {
  const rsi = []
  const gains = []
  const losses = []
  
  // 価格変動を計算
  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }
  
  // RSI計算
  rsi.push(null) // 最初の値はnull
  
  for (let i = 0; i < gains.length; i++) {
    if (i < period - 1) {
      rsi.push(null)
    } else {
      // 平均利得と平均損失を計算
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
      
      if (avgLoss === 0) {
        rsi.push(100)
      } else {
        const rs = avgGain / avgLoss
        const rsiValue = 100 - (100 / (1 + rs))
        rsi.push(Math.round(rsiValue * 100) / 100)
      }
    }
  }
  
  return rsi
}

/**
 * MACD (移動平均収束拡散法) を計算
 * @param {Array} data - 価格データ配列
 * @param {number} fastPeriod - 短期EMA期間（デフォルト: 12）
 * @param {number} slowPeriod - 長期EMA期間（デフォルト: 26）
 * @param {number} signalPeriod - シグナル線期間（デフォルト: 9）
 * @returns {Object} {macd, signal, histogram} MACDデータ
 */
export const calculateMACD = (data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
  const fastEMA = calculateEMA(data, fastPeriod)
  const slowEMA = calculateEMA(data, slowPeriod)
  
  // MACD線を計算
  const macd = []
  for (let i = 0; i < data.length; i++) {
    if (fastEMA[i] === null || slowEMA[i] === null) {
      macd.push(null)
    } else {
      macd.push(Math.round((fastEMA[i] - slowEMA[i]) * 100) / 100)
    }
  }
  
  // シグナル線を計算（MACD線のEMA）
  const signal = []
  const macdData = macd.map((value, index) => ({ close: value || 0 }))
  const signalEMA = calculateEMA(macdData, signalPeriod)
  
  for (let i = 0; i < macd.length; i++) {
    if (macd[i] === null || signalEMA[i] === null) {
      signal.push(null)
    } else {
      signal.push(Math.round(signalEMA[i] * 100) / 100)
    }
  }
  
  // ヒストグラムを計算
  const histogram = []
  for (let i = 0; i < macd.length; i++) {
    if (macd[i] === null || signal[i] === null) {
      histogram.push(null)
    } else {
      histogram.push(Math.round((macd[i] - signal[i]) * 100) / 100)
    }
  }
  
  return { macd, signal, histogram }
}

/**
 * 複数の移動平均線を計算
 * @param {Array} data - 価格データ配列
 * @param {Object} params - パラメータ {short, medium, long}
 * @returns {Object} 短期・中期・長期移動平均線
 */
export const calculateMovingAverages = (data, params = { short: 5, medium: 25, long: 75 }) => {
  return {
    sma5: calculateSMA(data, params.short),   // 短期
    sma25: calculateSMA(data, params.medium), // 中期
    sma75: calculateSMA(data, params.long)    // 長期
  }
}

/**
 * すべてのテクニカル指標を計算
 * @param {Array} data - 価格データ配列
 * @param {Object} params - 各指標のパラメータ
 * @returns {Object} すべての指標データ
 */
export const calculateAllIndicators = (data, params = {}) => {
  // デフォルトパラメータ
  const defaultParams = {
    sma: { short: 5, medium: 25, long: 75 },
    bollinger: { period: 20, stdDev: 2 },
    rsi: { period: 14 },
    macd: { fast: 12, slow: 26, signal: 9 }
  }
  
  // パラメータをマージ
  const mergedParams = {
    sma: { ...defaultParams.sma, ...params.sma },
    bollinger: { ...defaultParams.bollinger, ...params.bollinger },
    rsi: { ...defaultParams.rsi, ...params.rsi },
    macd: { ...defaultParams.macd, ...params.macd }
  }
  
  const movingAverages = calculateMovingAverages(data, mergedParams.sma)
  const bollingerBands = calculateBollingerBands(data, mergedParams.bollinger.period, mergedParams.bollinger.stdDev)
  const rsi = calculateRSI(data, mergedParams.rsi.period)
  const macd = calculateMACD(data, mergedParams.macd.fast, mergedParams.macd.slow, mergedParams.macd.signal)
  
  return {
    ...movingAverages,
    bollingerBands,
    rsi,
    macd
  }
}
