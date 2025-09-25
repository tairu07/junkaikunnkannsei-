import { createClient } from '@supabase/supabase-js'

// Supabaseクライアントの初期化
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

// CORSヘッダーを設定する関数
function setCorsHeaders(response) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

// ローカルストレージのフォールバック（クライアントサイド用）
const LocalStorageFallback = {
  getFavorites: () => {
    if (typeof window === 'undefined') return []
    try {
      const favorites = localStorage.getItem('stockFavorites')
      return favorites ? JSON.parse(favorites) : []
    } catch (error) {
      console.error('Failed to load favorites from localStorage:', error)
      return []
    }
  },

  saveFavorites: (favorites) => {
    if (typeof window === 'undefined') return false
    try {
      localStorage.setItem('stockFavorites', JSON.stringify(favorites))
      return true
    } catch (error) {
      console.error('Failed to save favorites to localStorage:', error)
      return false
    }
  }
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

    console.log(`⭐ Favorites API Request: ${method} for user ${userId}`)

    switch (method) {
      case 'GET':
        // お気に入り一覧を取得
        try {
          const { data: favorites, error } = await supabase
            .from('user_favorites')
            .select('stock_code, order_index')
            .eq('user_id', userId)
            .order('order_index')

          if (error) {
            console.warn('⚠️ Supabase error for favorites, using fallback:', error.message)
            return setCorsHeaders(new Response(JSON.stringify({
              success: true,
              data: [],
              source: 'fallback',
              warning: 'Database unavailable'
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }))
          }

          const favoritesList = favorites ? favorites.map(f => f.stock_code) : []

          return setCorsHeaders(new Response(JSON.stringify({
            success: true,
            data: favoritesList,
            source: 'database'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }))

        } catch (dbError) {
          console.error('❌ Database error for favorites:', dbError)
          return setCorsHeaders(new Response(JSON.stringify({
            success: true,
            data: [],
            source: 'fallback',
            warning: 'Database unavailable'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }))
        }

      case 'POST':
        // お気に入りを追加
        try {
          const body = await req.json()
          const { stockCode } = body

          if (!stockCode) {
            return setCorsHeaders(new Response(JSON.stringify({
              success: false,
              error: 'Stock code is required'
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            }))
          }

          // 既存のお気に入り数を取得して順序を決定
          const { count } = await supabase
            .from('user_favorites')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)

          const orderIndex = (count || 0) + 1

          const { error } = await supabase
            .from('user_favorites')
            .upsert({
              user_id: userId,
              stock_code: stockCode,
              order_index: orderIndex,
              created_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,stock_code'
            })

          if (error) {
            console.warn('⚠️ Failed to add favorite to database:', error.message)
            return setCorsHeaders(new Response(JSON.stringify({
              success: false,
              error: 'Failed to add favorite',
              fallback: true
            }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            }))
          }

          return setCorsHeaders(new Response(JSON.stringify({
            success: true,
            message: 'Favorite added successfully',
            source: 'database'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }))

        } catch (dbError) {
          console.error('❌ Database error adding favorite:', dbError)
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
        // お気に入りを削除
        try {
          const body = await req.json()
          const { stockCode } = body

          if (!stockCode) {
            return setCorsHeaders(new Response(JSON.stringify({
              success: false,
              error: 'Stock code is required'
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            }))
          }

          const { error } = await supabase
            .from('user_favorites')
            .delete()
            .eq('user_id', userId)
            .eq('stock_code', stockCode)

          if (error) {
            console.warn('⚠️ Failed to remove favorite from database:', error.message)
            return setCorsHeaders(new Response(JSON.stringify({
              success: false,
              error: 'Failed to remove favorite',
              fallback: true
            }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            }))
          }

          return setCorsHeaders(new Response(JSON.stringify({
            success: true,
            message: 'Favorite removed successfully',
            source: 'database'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }))

        } catch (dbError) {
          console.error('❌ Database error removing favorite:', dbError)
          return setCorsHeaders(new Response(JSON.stringify({
            success: false,
            error: 'Database unavailable',
            fallback: true
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }))
        }

      case 'PUT':
        // お気に入りの順序を更新
        try {
          const body = await req.json()
          const { favorites } = body

          if (!Array.isArray(favorites)) {
            return setCorsHeaders(new Response(JSON.stringify({
              success: false,
              error: 'Favorites array is required'
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            }))
          }

          // 既存のお気に入りを削除
          await supabase
            .from('user_favorites')
            .delete()
            .eq('user_id', userId)

          // 新しい順序でお気に入りを挿入
          const favoritesToInsert = favorites.map((stockCode, index) => ({
            user_id: userId,
            stock_code: stockCode,
            order_index: index + 1,
            created_at: new Date().toISOString()
          }))

          const { error } = await supabase
            .from('user_favorites')
            .insert(favoritesToInsert)

          if (error) {
            console.warn('⚠️ Failed to update favorites order:', error.message)
            return setCorsHeaders(new Response(JSON.stringify({
              success: false,
              error: 'Failed to update favorites order',
              fallback: true
            }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            }))
          }

          return setCorsHeaders(new Response(JSON.stringify({
            success: true,
            message: 'Favorites order updated successfully',
            source: 'database'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }))

        } catch (dbError) {
          console.error('❌ Database error updating favorites order:', dbError)
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
    console.error('❌ Favorites API Error:', error)
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
