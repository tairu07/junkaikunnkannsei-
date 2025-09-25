/**
 * ユーザー認証API
 * ログイン、ログアウト、ユーザー登録、セッション管理
 */

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// Supabase設定
const supabaseUrl = process.env.SUPABASE_URL || 'https://dummy.supabase.co'
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'dummy-key'
const jwtSecret = process.env.JWT_SECRET || 'your-jwt-secret-key'

let supabase = null

try {
  supabase = createClient(supabaseUrl, supabaseKey)
} catch (error) {
  console.warn('Supabase接続エラー:', error.message)
}

// JWT トークン生成
function generateToken(user) {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      username: user.username 
    },
    jwtSecret,
    { expiresIn: '7d' }
  )
}

// JWT トークン検証
function verifyToken(token) {
  try {
    return jwt.verify(token, jwtSecret)
  } catch (error) {
    return null
  }
}

// パスワードハッシュ化
async function hashPassword(password) {
  const saltRounds = 10
  return await bcrypt.hash(password, saltRounds)
}

// パスワード検証
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash)
}

// ユーザー登録
async function registerUser(userData) {
  const { email, username, password, displayName } = userData
  
  // バリデーション
  if (!email || !username || !password) {
    throw new Error('必須フィールドが不足しています')
  }
  
  if (password.length < 8) {
    throw new Error('パスワードは8文字以上である必要があります')
  }
  
  // パスワードハッシュ化
  const passwordHash = await hashPassword(password)
  
  if (supabase) {
    try {
      // 既存ユーザーチェック
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .or(`email.eq.${email},username.eq.${username}`)
        .single()
      
      if (existingUser) {
        throw new Error('メールアドレスまたはユーザー名が既に使用されています')
      }
      
      // ユーザー作成
      const { data: newUser, error } = await supabase
        .from('users')
        .insert([{
          email,
          username,
          display_name: displayName || username,
          password_hash: passwordHash,
          is_verified: false
        }])
        .select()
        .single()
      
      if (error) throw error
      
      // プロフィール作成
      await supabase
        .from('user_profiles')
        .insert([{
          user_id: newUser.id,
          investment_experience: 'beginner',
          risk_tolerance: 'moderate'
        }])
      
      return {
        user: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          displayName: newUser.display_name,
          isVerified: newUser.is_verified,
          isPremium: newUser.is_premium
        },
        token: generateToken(newUser)
      }
      
    } catch (error) {
      throw new Error(`ユーザー登録エラー: ${error.message}`)
    }
  } else {
    // フォールバック: ローカルストレージ用のモックレスポンス
    const mockUser = {
      id: `user_${Date.now()}`,
      email,
      username,
      displayName: displayName || username,
      isVerified: false,
      isPremium: false
    }
    
    return {
      user: mockUser,
      token: generateToken(mockUser)
    }
  }
}

// ユーザーログイン
async function loginUser(credentials) {
  const { email, password } = credentials
  
  if (!email || !password) {
    throw new Error('メールアドレスとパスワードが必要です')
  }
  
  if (supabase) {
    try {
      // ユーザー検索
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()
      
      if (error || !user) {
        throw new Error('ユーザーが見つかりません')
      }
      
      // パスワード検証
      const isValidPassword = await verifyPassword(password, user.password_hash)
      if (!isValidPassword) {
        throw new Error('パスワードが正しくありません')
      }
      
      // 最終ログイン時刻更新
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id)
      
      // セッション作成
      const sessionToken = generateToken(user)
      await supabase
        .from('user_sessions')
        .insert([{
          user_id: user.id,
          session_token: sessionToken,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7日後
        }])
      
      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.display_name,
          isVerified: user.is_verified,
          isPremium: user.is_premium
        },
        token: sessionToken
      }
      
    } catch (error) {
      throw new Error(`ログインエラー: ${error.message}`)
    }
  } else {
    // フォールバック: デモユーザー
    if (email === 'demo@example.com' && password === 'demo123') {
      const mockUser = {
        id: 'demo_user_id',
        email: 'demo@example.com',
        username: 'demo_user',
        displayName: 'デモユーザー',
        isVerified: true,
        isPremium: false
      }
      
      return {
        user: mockUser,
        token: generateToken(mockUser)
      }
    } else {
      throw new Error('デモ環境では demo@example.com / demo123 でログインしてください')
    }
  }
}

// ユーザー情報取得
async function getUserProfile(userId) {
  if (supabase) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select(`
          *,
          user_profiles (*)
        `)
        .eq('id', userId)
        .single()
      
      if (error) throw error
      
      return {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        isVerified: user.is_verified,
        isPremium: user.is_premium,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
        profile: user.user_profiles
      }
      
    } catch (error) {
      throw new Error(`ユーザー情報取得エラー: ${error.message}`)
    }
  } else {
    // フォールバック
    return {
      id: userId,
      email: 'demo@example.com',
      username: 'demo_user',
      displayName: 'デモユーザー',
      isVerified: true,
      isPremium: false
    }
  }
}

// セッション検証
async function validateSession(token) {
  const decoded = verifyToken(token)
  if (!decoded) {
    return null
  }
  
  if (supabase) {
    try {
      // セッション確認
      const { data: session } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('session_token', token)
        .eq('user_id', decoded.userId)
        .gt('expires_at', new Date().toISOString())
        .single()
      
      if (!session) {
        return null
      }
      
      // ユーザー情報取得
      return await getUserProfile(decoded.userId)
      
    } catch (error) {
      return null
    }
  } else {
    // フォールバック
    return {
      id: decoded.userId,
      email: decoded.email,
      username: decoded.username
    }
  }
}

// ログアウト
async function logoutUser(token) {
  if (supabase) {
    try {
      // セッション削除
      await supabase
        .from('user_sessions')
        .delete()
        .eq('session_token', token)
      
      return { success: true }
      
    } catch (error) {
      throw new Error(`ログアウトエラー: ${error.message}`)
    }
  } else {
    return { success: true }
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
    
    switch (action) {
      case 'register':
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' })
        }
        
        const registerResult = await registerUser(req.body)
        return res.status(201).json(registerResult)
      
      case 'login':
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' })
        }
        
        const loginResult = await loginUser(req.body)
        return res.status(200).json(loginResult)
      
      case 'profile':
        if (req.method !== 'GET') {
          return res.status(405).json({ error: 'Method not allowed' })
        }
        
        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Authorization token required' })
        }
        
        const token = authHeader.substring(7)
        const user = await validateSession(token)
        
        if (!user) {
          return res.status(401).json({ error: 'Invalid or expired token' })
        }
        
        return res.status(200).json({ user })
      
      case 'logout':
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' })
        }
        
        const logoutAuthHeader = req.headers.authorization
        if (!logoutAuthHeader || !logoutAuthHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Authorization token required' })
        }
        
        const logoutToken = logoutAuthHeader.substring(7)
        const logoutResult = await logoutUser(logoutToken)
        
        return res.status(200).json(logoutResult)
      
      case 'validate':
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' })
        }
        
        const { token: validateToken } = req.body
        const validatedUser = await validateSession(validateToken)
        
        if (!validatedUser) {
          return res.status(401).json({ error: 'Invalid or expired token' })
        }
        
        return res.status(200).json({ user: validatedUser })
      
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
    
  } catch (error) {
    console.error('Auth API Error:', error)
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    })
  }
}
