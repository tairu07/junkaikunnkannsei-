// 日本株チャート巡回ツール v5.0 Enterprise
// PostgreSQLデータベース接続とモデル定義

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// データベース接続設定
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/stock_chart_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// データベース接続テスト
export async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ データベース接続成功:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ データベース接続エラー:', error);
    return false;
  }
}

// ユーザー管理クラス
export class UserManager {
  // ユーザー登録
  static async createUser(userData) {
    const { username, email, password, displayName } = userData;
    
    try {
      // パスワードハッシュ化
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      const query = `
        INSERT INTO users (username, email, password_hash, display_name)
        VALUES ($1, $2, $3, $4)
        RETURNING id, username, email, display_name, created_at
      `;
      
      const result = await pool.query(query, [username, email, passwordHash, displayName]);
      
      // デフォルトチャート設定を作成
      await this.createDefaultChartSettings(result.rows[0].id);
      
      return {
        success: true,
        user: result.rows[0]
      };
    } catch (error) {
      console.error('ユーザー作成エラー:', error);
      return {
        success: false,
        error: error.code === '23505' ? 'ユーザー名またはメールアドレスが既に使用されています' : 'ユーザー作成に失敗しました'
      };
    }
  }
  
  // ユーザーログイン
  static async loginUser(email, password) {
    try {
      const query = `
        SELECT id, username, email, password_hash, display_name, subscription_type
        FROM users 
        WHERE email = $1 AND is_active = true
      `;
      
      const result = await pool.query(query, [email]);
      
      if (result.rows.length === 0) {
        return { success: false, error: 'ユーザーが見つかりません' };
      }
      
      const user = result.rows[0];
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        return { success: false, error: 'パスワードが正しくありません' };
      }
      
      // JWTトークン生成
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );
      
      // 最終ログイン時刻更新
      await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
      
      // ログ記録
      await this.logActivity(user.id, 'login');
      
      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.display_name,
          subscriptionType: user.subscription_type
        },
        token
      };
    } catch (error) {
      console.error('ログインエラー:', error);
      return { success: false, error: 'ログインに失敗しました' };
    }
  }
  
  // デフォルトチャート設定作成
  static async createDefaultChartSettings(userId) {
    const query = `
      INSERT INTO user_chart_settings (
        user_id, setting_name, is_default,
        time_period, timeframe,
        show_ma, ma_short_period, ma_medium_period, ma_long_period,
        show_bollinger, bollinger_period, bollinger_sigma,
        show_rsi, rsi_period,
        show_macd, macd_fast, macd_slow, macd_signal
      ) VALUES ($1, 'default', true, '1Y', 'daily', true, 5, 25, 75, true, 20, 2.0, false, 14, false, 12, 26, 9)
    `;
    
    await pool.query(query, [userId]);
  }
  
  // アクティビティログ記録
  static async logActivity(userId, action, stockId = null, details = null) {
    const query = `
      INSERT INTO user_activity_logs (user_id, action, stock_id, details)
      VALUES ($1, $2, $3, $4)
    `;
    
    await pool.query(query, [userId, action, stockId, details]);
  }
}

// お気に入り管理クラス
export class FavoriteManager {
  // お気に入り一覧取得
  static async getUserFavorites(userId) {
    try {
      const query = `
        SELECT f.id, f.sort_order, s.code, s.name, s.market, s.sector
        FROM user_favorites f
        JOIN stocks s ON f.stock_id = s.id
        WHERE f.user_id = $1
        ORDER BY f.sort_order ASC, f.created_at ASC
      `;
      
      const result = await pool.query(query, [userId]);
      return { success: true, favorites: result.rows };
    } catch (error) {
      console.error('お気に入り取得エラー:', error);
      return { success: false, error: 'お気に入りの取得に失敗しました' };
    }
  }
  
  // お気に入り追加
  static async addFavorite(userId, stockCode) {
    try {
      // 株式IDを取得
      const stockQuery = 'SELECT id FROM stocks WHERE code = $1';
      const stockResult = await pool.query(stockQuery, [stockCode]);
      
      if (stockResult.rows.length === 0) {
        return { success: false, error: '銘柄が見つかりません' };
      }
      
      const stockId = stockResult.rows[0].id;
      
      // 最大ソート順序を取得
      const maxSortQuery = 'SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM user_favorites WHERE user_id = $1';
      const maxSortResult = await pool.query(maxSortQuery, [userId]);
      const nextSortOrder = maxSortResult.rows[0].max_sort + 1;
      
      // お気に入り追加
      const insertQuery = `
        INSERT INTO user_favorites (user_id, stock_id, sort_order)
        VALUES ($1, $2, $3)
        RETURNING id
      `;
      
      const result = await pool.query(insertQuery, [userId, stockId, nextSortOrder]);
      
      // ログ記録
      await UserManager.logActivity(userId, 'add_favorite', stockId);
      
      return { success: true, favoriteId: result.rows[0].id };
    } catch (error) {
      console.error('お気に入り追加エラー:', error);
      if (error.code === '23505') {
        return { success: false, error: '既にお気に入りに追加されています' };
      }
      return { success: false, error: 'お気に入りの追加に失敗しました' };
    }
  }
  
  // お気に入り削除
  static async removeFavorite(userId, stockCode) {
    try {
      const query = `
        DELETE FROM user_favorites 
        WHERE user_id = $1 AND stock_id = (SELECT id FROM stocks WHERE code = $2)
        RETURNING stock_id
      `;
      
      const result = await pool.query(query, [userId, stockCode]);
      
      if (result.rows.length === 0) {
        return { success: false, error: 'お気に入りが見つかりません' };
      }
      
      // ログ記録
      await UserManager.logActivity(userId, 'remove_favorite', result.rows[0].stock_id);
      
      return { success: true };
    } catch (error) {
      console.error('お気に入り削除エラー:', error);
      return { success: false, error: 'お気に入りの削除に失敗しました' };
    }
  }
  
  // お気に入り並び替え
  static async reorderFavorites(userId, favoriteIds) {
    try {
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        for (let i = 0; i < favoriteIds.length; i++) {
          await client.query(
            'UPDATE user_favorites SET sort_order = $1 WHERE id = $2 AND user_id = $3',
            [i + 1, favoriteIds[i], userId]
          );
        }
        
        await client.query('COMMIT');
        return { success: true };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('お気に入り並び替えエラー:', error);
      return { success: false, error: 'お気に入りの並び替えに失敗しました' };
    }
  }
}

// チャート設定管理クラス
export class ChartSettingsManager {
  // ユーザー設定取得
  static async getUserSettings(userId, settingName = 'default') {
    try {
      const query = `
        SELECT * FROM user_chart_settings 
        WHERE user_id = $1 AND setting_name = $2
      `;
      
      const result = await pool.query(query, [userId, settingName]);
      
      if (result.rows.length === 0) {
        // デフォルト設定を作成
        await UserManager.createDefaultChartSettings(userId);
        return this.getUserSettings(userId, settingName);
      }
      
      return { success: true, settings: result.rows[0] };
    } catch (error) {
      console.error('設定取得エラー:', error);
      return { success: false, error: '設定の取得に失敗しました' };
    }
  }
  
  // ユーザー設定保存
  static async saveUserSettings(userId, settingName, settings) {
    try {
      const query = `
        INSERT INTO user_chart_settings (
          user_id, setting_name,
          time_period, timeframe,
          show_ma, ma_short_period, ma_medium_period, ma_long_period,
          show_bollinger, bollinger_period, bollinger_sigma,
          show_rsi, rsi_period,
          show_macd, macd_fast, macd_slow, macd_signal,
          auto_rotation, rotation_interval,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, CURRENT_TIMESTAMP
        )
        ON CONFLICT (user_id, setting_name)
        DO UPDATE SET
          time_period = EXCLUDED.time_period,
          timeframe = EXCLUDED.timeframe,
          show_ma = EXCLUDED.show_ma,
          ma_short_period = EXCLUDED.ma_short_period,
          ma_medium_period = EXCLUDED.ma_medium_period,
          ma_long_period = EXCLUDED.ma_long_period,
          show_bollinger = EXCLUDED.show_bollinger,
          bollinger_period = EXCLUDED.bollinger_period,
          bollinger_sigma = EXCLUDED.bollinger_sigma,
          show_rsi = EXCLUDED.show_rsi,
          rsi_period = EXCLUDED.rsi_period,
          show_macd = EXCLUDED.show_macd,
          macd_fast = EXCLUDED.macd_fast,
          macd_slow = EXCLUDED.macd_slow,
          macd_signal = EXCLUDED.macd_signal,
          auto_rotation = EXCLUDED.auto_rotation,
          rotation_interval = EXCLUDED.rotation_interval,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await pool.query(query, [
        userId, settingName,
        settings.timePeriod, settings.timeframe,
        settings.showMA, settings.maShortPeriod, settings.maMediumPeriod, settings.maLongPeriod,
        settings.showBollinger, settings.bollingerPeriod, settings.bollingerSigma,
        settings.showRSI, settings.rsiPeriod,
        settings.showMACD, settings.macdFast, settings.macdSlow, settings.macdSignal,
        settings.autoRotation, settings.rotationInterval
      ]);
      
      return { success: true };
    } catch (error) {
      console.error('設定保存エラー:', error);
      return { success: false, error: '設定の保存に失敗しました' };
    }
  }
}

// 銘柄管理クラス
export class StockManager {
  // 全銘柄取得
  static async getAllStocks() {
    try {
      const query = `
        SELECT code, name, market, sector, industry
        FROM stocks 
        WHERE is_active = true
        ORDER BY code ASC
      `;
      
      const result = await pool.query(query);
      return { success: true, stocks: result.rows };
    } catch (error) {
      console.error('銘柄取得エラー:', error);
      return { success: false, error: '銘柄の取得に失敗しました' };
    }
  }
  
  // 銘柄検索
  static async searchStocks(keyword) {
    try {
      const query = `
        SELECT code, name, market, sector, industry
        FROM stocks 
        WHERE is_active = true 
        AND (code ILIKE $1 OR name ILIKE $1 OR sector ILIKE $1)
        ORDER BY 
          CASE WHEN code ILIKE $1 THEN 1 ELSE 2 END,
          code ASC
        LIMIT 50
      `;
      
      const result = await pool.query(query, [`%${keyword}%`]);
      return { success: true, stocks: result.rows };
    } catch (error) {
      console.error('銘柄検索エラー:', error);
      return { success: false, error: '銘柄の検索に失敗しました' };
    }
  }
}

// JWT認証ミドルウェア
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'アクセストークンが必要です' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'トークンが無効です' });
    }
    req.user = user;
    next();
  });
}

export default pool;
