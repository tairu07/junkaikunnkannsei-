import { createClient } from '@supabase/supabase-js'

// Supabaseクライアントの初期化
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

// デフォルトのチャート設定
const DEFAULT_SETTINGS = {
  period: '1Y',
  timeframe: 'daily',
  indicators: {
    movingAverages: true,
    bollingerBands: true,
    rsi: false,
    macd: false
  },
  indicatorParams: {
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
  }
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
    const userId = url.searchParams.get('userId') || 'anonymous'
    const method = req.method

    console.log(`⚙️ Chart Settings API Request: ${method} for user ${userId}`)

    switch (method) {
      case 'GET':
        // チャート設定を取得
        try {
          const { data: settings, error } = await supabase
            .from('user_chart_settings')
            .select('settings')
            .eq('user_id', userId)
            .single()

          if (error || !settings) {
            console.log('📊 No settings found, returning defaults')
            return setCorsHeaders(new Response(JSON.stringify({
              success: true,
              data: DEFAULT_SETTINGS,
              source: 'default'
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }))
          }

          return setCorsHeaders(new Response(JSON.stringify({
            success: true,
            data: settings.settings,
            source: 'database'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }))

        } catch (dbError) {
          console.error('❌ Database error for chart settings:', dbError)
          return setCorsHeaders(new Response(JSON.stringify({
            success: true,
            data: DEFAULT_SETTINGS,
            source: 'default',
            warning: 'Database unavailable'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }))
        }

      case 'POST':
      case 'PUT':
        // チャート設定を保存/更新
        try {
          const body = await req.json()
          const { settings } = body

          if (!settings) {
            return setCorsHeaders(new Response(JSON.stringify({
              success: false,
              error: 'Settings object is required'
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            }))
          }

          // 設定をマージ（デフォルト設定と統合）
          const mergedSettings = {
            ...DEFAULT_SETTINGS,
            ...settings,
            indicators: {
              ...DEFAULT_SETTINGS.indicators,
              ...(settings.indicators || {})
            },
            indicatorParams: {
              ...DEFAULT_SETTINGS.indicatorParams,
              ...(settings.indicatorParams || {}),
              sma: {
                ...DEFAULT_SETTINGS.indicatorParams.sma,
                ...(settings.indicatorParams?.sma || {})
              },
              bollinger: {
                ...DEFAULT_SETTINGS.indicatorParams.bollinger,
                ...(settings.indicatorParams?.bollinger || {})
              },
              rsi: {
                ...DEFAULT_SETTINGS.indicatorParams.rsi,
                ...(settings.indicatorParams?.rsi || {})
              },
              macd: {
                ...DEFAULT_SETTINGS.indicatorParams.macd,
                ...(settings.indicatorParams?.macd || {})
              }
            }
          }

          const { error } = await supabase
            .from('user_chart_settings')
            .upsert({
              user_id: userId,
              settings: mergedSettings,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id'
            })

          if (error) {
            console.warn('⚠️ Failed to save chart settings:', error.message)
            return setCorsHeaders(new Response(JSON.stringify({
              success: false,
              error: 'Failed to save settings',
              fallback: true
            }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            }))
          }

          return setCorsHeaders(new Response(JSON.stringify({
            success: true,
            message: 'Settings saved successfully',
            data: mergedSettings,
            source: 'database'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }))

        } catch (dbError) {
          console.error('❌ Database error saving chart settings:', dbError)
          return setCorsHeaders(new Response(JSON.stringify({
            success: false,
            error: 'Database unavailable',
            fallback: true
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }))
        }

      case 'DELETE':
        // チャート設定をリセット（デフォルトに戻す）
        try {
          const { error } = await supabase
            .from('user_chart_settings')
            .delete()
            .eq('user_id', userId)

          if (error) {
            console.warn('⚠️ Failed to reset chart settings:', error.message)
            return setCorsHeaders(new Response(JSON.stringify({
              success: false,
              error: 'Failed to reset settings',
              fallback: true
            }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            }))
          }

          return setCorsHeaders(new Response(JSON.stringify({
            success: true,
            message: 'Settings reset to default',
            data: DEFAULT_SETTINGS,
            source: 'default'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }))

        } catch (dbError) {
          console.error('❌ Database error resetting chart settings:', dbError)
          return setCorsHeaders(new Response(JSON.stringify({
            success: false,
            error: 'Database unavailable',
            fallback: true
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }))
        }

      default:
        return setCorsHeaders(new Response(JSON.stringify({
          success: false,
          error: 'Method not allowed'
        }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' }
        }))
    }

  } catch (error) {
    console.error('❌ Chart Settings API Error:', error)
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
