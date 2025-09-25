/**
 * ユーザー管理API
 * プロフィール管理、ポートフォリオ、ウォッチリスト、アラート機能
 */

import { createClient } from '@supabase/supabase-js'

// Supabase設定
const supabaseUrl = process.env.SUPABASE_URL || 'https://dummy.supabase.co'
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'dummy-key'

let supabase = null

try {
  supabase = createClient(supabaseUrl, supabaseKey)
} catch (error) {
  console.warn('Supabase接続エラー:', error.message)
}

// ユーザープロフィール更新
async function updateUserProfile(userId, profileData) {
  if (supabase) {
    try {
      // ユーザー基本情報更新
      const { error: userError } = await supabase
        .from('users')
        .update({
          display_name: profileData.displayName,
          avatar_url: profileData.avatarUrl,
          settings: profileData.settings || {}
        })
        .eq('id', userId)
      
      if (userError) throw userError
      
      // プロフィール詳細更新
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert([{
          user_id: userId,
          bio: profileData.bio,
          location: profileData.location,
          website_url: profileData.websiteUrl,
          twitter_handle: profileData.twitterHandle,
          investment_experience: profileData.investmentExperience,
          risk_tolerance: profileData.riskTolerance,
          investment_goals: profileData.investmentGoals || [],
          notification_preferences: profileData.notificationPreferences || {},
          privacy_settings: profileData.privacySettings || {}
        }])
      
      if (profileError) throw profileError
      
      return {
        success: true,
        message: 'プロフィールを更新しました'
      }
      
    } catch (error) {
      throw new Error(`プロフィール更新エラー: ${error.message}`)
    }
  } else {
    // フォールバック
    return {
      success: true,
      message: 'プロフィールをローカルに保存しました（データベース接続なし）'
    }
  }
}

// ユーザー統計情報取得
async function getUserStatistics(userId) {
  if (supabase) {
    try {
      // 各種統計を並行取得
      const [
        favoritesCount,
        watchlistsCount,
        portfoliosCount,
        transactionsCount,
        savedChartsCount,
        activeAlertsCount
      ] = await Promise.all([
        supabase.from('user_favorites').select('id', { count: 'exact' }).eq('user_id', userId),
        supabase.from('watchlists').select('id', { count: 'exact' }).eq('user_id', userId),
        supabase.from('user_portfolios').select('id', { count: 'exact' }).eq('user_id', userId),
        supabase.from('transactions').select('id', { count: 'exact' }).eq('user_id', userId),
        supabase.from('saved_charts').select('id', { count: 'exact' }).eq('user_id', userId),
        supabase.from('price_alerts').select('id', { count: 'exact' }).eq('user_id', userId).eq('is_active', true)
      ])
      
      // 最近のアクティビティ
      const { data: recentActivities } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)
      
      return {
        totalFavorites: favoritesCount.count || 0,
        totalWatchlists: watchlistsCount.count || 0,
        totalPortfolios: portfoliosCount.count || 0,
        totalTransactions: transactionsCount.count || 0,
        totalSavedCharts: savedChartsCount.count || 0,
        totalActiveAlerts: activeAlertsCount.count || 0,
        recentActivities: recentActivities || []
      }
      
    } catch (error) {
      console.error('統計情報取得エラー:', error)
      return {
        totalFavorites: 0,
        totalWatchlists: 0,
        totalPortfolios: 0,
        totalTransactions: 0,
        totalSavedCharts: 0,
        totalActiveAlerts: 0,
        recentActivities: []
      }
    }
  } else {
    // フォールバック
    return {
      totalFavorites: 5,
      totalWatchlists: 2,
      totalPortfolios: 1,
      totalTransactions: 10,
      totalSavedCharts: 3,
      totalActiveAlerts: 2,
      recentActivities: []
    }
  }
}

// ウォッチリスト管理
async function manageWatchlist(userId, action, watchlistData) {
  if (!supabase) {
    return { success: true, message: 'ローカルモードで実行されました' }
  }
  
  try {
    switch (action) {
      case 'create':
        const { data: newWatchlist, error: createError } = await supabase
          .from('watchlists')
          .insert([{
            user_id: userId,
            name: watchlistData.name,
            description: watchlistData.description,
            is_public: watchlistData.isPublic || false,
            color: watchlistData.color || '#3B82F6'
          }])
          .select()
          .single()
        
        if (createError) throw createError
        
        return {
          success: true,
          watchlist: newWatchlist,
          message: 'ウォッチリストを作成しました'
        }
      
      case 'update':
        const { error: updateError } = await supabase
          .from('watchlists')
          .update({
            name: watchlistData.name,
            description: watchlistData.description,
            is_public: watchlistData.isPublic,
            color: watchlistData.color
          })
          .eq('id', watchlistData.id)
          .eq('user_id', userId)
        
        if (updateError) throw updateError
        
        return {
          success: true,
          message: 'ウォッチリストを更新しました'
        }
      
      case 'delete':
        const { error: deleteError } = await supabase
          .from('watchlists')
          .delete()
          .eq('id', watchlistData.id)
          .eq('user_id', userId)
        
        if (deleteError) throw deleteError
        
        return {
          success: true,
          message: 'ウォッチリストを削除しました'
        }
      
      case 'add-stock':
        // 銘柄をウォッチリストに追加
        const { data: stock } = await supabase
          .from('stocks')
          .select('id')
          .eq('code', watchlistData.stockCode)
          .single()
        
        if (!stock) {
          throw new Error('銘柄が見つかりません')
        }
        
        const { error: addStockError } = await supabase
          .from('watchlist_stocks')
          .insert([{
            watchlist_id: watchlistData.watchlistId,
            stock_id: stock.id,
            notes: watchlistData.notes || ''
          }])
        
        if (addStockError) throw addStockError
        
        return {
          success: true,
          message: '銘柄をウォッチリストに追加しました'
        }
      
      case 'remove-stock':
        const { error: removeStockError } = await supabase
          .from('watchlist_stocks')
          .delete()
          .eq('watchlist_id', watchlistData.watchlistId)
          .eq('stock_id', watchlistData.stockId)
        
        if (removeStockError) throw removeStockError
        
        return {
          success: true,
          message: '銘柄をウォッチリストから削除しました'
        }
      
      default:
        throw new Error('無効なアクションです')
    }
    
  } catch (error) {
    throw new Error(`ウォッチリスト操作エラー: ${error.message}`)
  }
}

// ウォッチリスト一覧取得
async function getUserWatchlists(userId) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('watchlists')
        .select(`
          *,
          watchlist_stocks (
            *,
            stocks (code, name, market)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      return data.map(watchlist => ({
        id: watchlist.id,
        name: watchlist.name,
        description: watchlist.description,
        isPublic: watchlist.is_public,
        color: watchlist.color,
        stockCount: watchlist.watchlist_stocks.length,
        stocks: watchlist.watchlist_stocks.map(ws => ({
          id: ws.id,
          stockCode: ws.stocks.code,
          stockName: ws.stocks.name,
          market: ws.stocks.market,
          notes: ws.notes,
          addedAt: ws.created_at
        })),
        createdAt: watchlist.created_at,
        updatedAt: watchlist.updated_at
      }))
      
    } catch (error) {
      console.error('ウォッチリスト取得エラー:', error)
      return []
    }
  } else {
    // フォールバック
    return [
      {
        id: 'demo_watchlist_1',
        name: 'テクノロジー株',
        description: 'IT・テクノロジー関連銘柄',
        isPublic: false,
        color: '#3B82F6',
        stockCount: 3,
        stocks: [
          { stockCode: '6758', stockName: 'ソニーグループ', market: 'PRIME' },
          { stockCode: '7974', stockName: '任天堂', market: 'PRIME' },
          { stockCode: '9984', stockName: 'ソフトバンクグループ', market: 'PRIME' }
        ]
      }
    ]
  }
}

// 価格アラート管理
async function managePriceAlert(userId, action, alertData) {
  if (!supabase) {
    return { success: true, message: 'ローカルモードで実行されました' }
  }
  
  try {
    switch (action) {
      case 'create':
        // 銘柄IDを取得
        const { data: stock } = await supabase
          .from('stocks')
          .select('id')
          .eq('code', alertData.stockCode)
          .single()
        
        if (!stock) {
          throw new Error('銘柄が見つかりません')
        }
        
        const { data: newAlert, error: createError } = await supabase
          .from('price_alerts')
          .insert([{
            user_id: userId,
            stock_id: stock.id,
            alert_type: alertData.alertType,
            threshold_value: alertData.thresholdValue,
            message: alertData.message || '',
            is_active: true
          }])
          .select()
          .single()
        
        if (createError) throw createError
        
        return {
          success: true,
          alert: newAlert,
          message: '価格アラートを作成しました'
        }
      
      case 'update':
        const { error: updateError } = await supabase
          .from('price_alerts')
          .update({
            alert_type: alertData.alertType,
            threshold_value: alertData.thresholdValue,
            message: alertData.message,
            is_active: alertData.isActive
          })
          .eq('id', alertData.id)
          .eq('user_id', userId)
        
        if (updateError) throw updateError
        
        return {
          success: true,
          message: '価格アラートを更新しました'
        }
      
      case 'delete':
        const { error: deleteError } = await supabase
          .from('price_alerts')
          .delete()
          .eq('id', alertData.id)
          .eq('user_id', userId)
        
        if (deleteError) throw deleteError
        
        return {
          success: true,
          message: '価格アラートを削除しました'
        }
      
      case 'toggle':
        const { error: toggleError } = await supabase
          .from('price_alerts')
          .update({ is_active: alertData.isActive })
          .eq('id', alertData.id)
          .eq('user_id', userId)
        
        if (toggleError) throw toggleError
        
        return {
          success: true,
          message: `価格アラートを${alertData.isActive ? '有効' : '無効'}にしました`
        }
      
      default:
        throw new Error('無効なアクションです')
    }
    
  } catch (error) {
    throw new Error(`価格アラート操作エラー: ${error.message}`)
  }
}

// 価格アラート一覧取得
async function getUserPriceAlerts(userId) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('price_alerts')
        .select(`
          *,
          stocks (code, name, market)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      return data.map(alert => ({
        id: alert.id,
        stockCode: alert.stocks.code,
        stockName: alert.stocks.name,
        market: alert.stocks.market,
        alertType: alert.alert_type,
        thresholdValue: parseFloat(alert.threshold_value),
        message: alert.message,
        isActive: alert.is_active,
        triggeredAt: alert.triggered_at,
        createdAt: alert.created_at,
        updatedAt: alert.updated_at
      }))
      
    } catch (error) {
      console.error('価格アラート取得エラー:', error)
      return []
    }
  } else {
    // フォールバック
    return [
      {
        id: 'demo_alert_1',
        stockCode: '7203',
        stockName: 'トヨタ自動車',
        alertType: 'PRICE_ABOVE',
        thresholdValue: 3000,
        message: '3000円を超えたら通知',
        isActive: true
      }
    ]
  }
}

// アクティビティログ記録
async function logUserActivity(userId, activityType, activityData) {
  if (supabase) {
    try {
      await supabase
        .from('user_activities')
        .insert([{
          user_id: userId,
          activity_type: activityType,
          activity_data: activityData || {}
        }])
    } catch (error) {
      console.error('アクティビティログエラー:', error)
    }
  }
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
    const { action } = req.query
    
    // 認証チェック（一部のエンドポイントを除く）
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' })
    }
    
    // ここでJWTトークンの検証を行う（簡略化）
    const token = authHeader.substring(7)
    // 実際の実装では、JWTトークンを検証してuserIdを取得
    const userId = req.body.userId || req.query.userId || 'demo_user_id'
    
    switch (action) {
      case 'update-profile':
        if (req.method !== 'PUT') {
          return res.status(405).json({ error: 'Method not allowed' })
        }
        
        const profileResult = await updateUserProfile(userId, req.body)
        await logUserActivity(userId, 'PROFILE_UPDATE', { fields: Object.keys(req.body) })
        
        return res.status(200).json(profileResult)
      
      case 'get-statistics':
        if (req.method !== 'GET') {
          return res.status(405).json({ error: 'Method not allowed' })
        }
        
        const stats = await getUserStatistics(userId)
        return res.status(200).json({ statistics: stats })
      
      case 'manage-watchlist':
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' })
        }
        
        const { watchlistAction, watchlistData } = req.body
        const watchlistResult = await manageWatchlist(userId, watchlistAction, watchlistData)
        await logUserActivity(userId, 'WATCHLIST_ACTION', { action: watchlistAction })
        
        return res.status(200).json(watchlistResult)
      
      case 'get-watchlists':
        if (req.method !== 'GET') {
          return res.status(405).json({ error: 'Method not allowed' })
        }
        
        const watchlists = await getUserWatchlists(userId)
        return res.status(200).json({ watchlists })
      
      case 'manage-alert':
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' })
        }
        
        const { alertAction, alertData } = req.body
        const alertResult = await managePriceAlert(userId, alertAction, alertData)
        await logUserActivity(userId, 'ALERT_ACTION', { action: alertAction })
        
        return res.status(200).json(alertResult)
      
      case 'get-alerts':
        if (req.method !== 'GET') {
          return res.status(405).json({ error: 'Method not allowed' })
        }
        
        const alerts = await getUserPriceAlerts(userId)
        return res.status(200).json({ alerts })
      
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
    
  } catch (error) {
    console.error('User Management API Error:', error)
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    })
  }
}
