// 日本株チャート巡回ツール v5.0 Enterprise
// お気に入り機能 データベース連携API

import { FavoriteManager, UserManager, authenticateToken } from '../lib/database-pg.js';

// ユーザーのお気に入り一覧取得
export async function getUserFavorites(req, res) {
  try {
    const userId = req.user.userId;

    const result = await FavoriteManager.getUserFavorites(userId);

    if (result.success) {
      res.json({
        success: true,
        favorites: result.favorites,
        count: result.favorites.length
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('お気に入り取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
}

// お気に入り追加
export async function addFavorite(req, res) {
  try {
    const userId = req.user.userId;
    const { stockCode } = req.body;

    // 入力検証
    if (!stockCode) {
      return res.status(400).json({
        success: false,
        error: '銘柄コードは必須です'
      });
    }

    // 銘柄コードの形式チェック（4桁の数字）
    if (!/^\d{4}$/.test(stockCode)) {
      return res.status(400).json({
        success: false,
        error: '有効な銘柄コードを入力してください（4桁の数字）'
      });
    }

    const result = await FavoriteManager.addFavorite(userId, stockCode);

    if (result.success) {
      // ログ記録
      await UserManager.logActivity(userId, 'add_favorite', null, { stockCode });

      res.status(201).json({
        success: true,
        favoriteId: result.favoriteId,
        message: 'お気に入りに追加しました'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('お気に入り追加エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
}

// お気に入り削除
export async function removeFavorite(req, res) {
  try {
    const userId = req.user.userId;
    const { stockCode } = req.params;

    // 入力検証
    if (!stockCode) {
      return res.status(400).json({
        success: false,
        error: '銘柄コードは必須です'
      });
    }

    const result = await FavoriteManager.removeFavorite(userId, stockCode);

    if (result.success) {
      // ログ記録
      await UserManager.logActivity(userId, 'remove_favorite', null, { stockCode });

      res.json({
        success: true,
        message: 'お気に入りから削除しました'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('お気に入り削除エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
}

// お気に入り並び替え
export async function reorderFavorites(req, res) {
  try {
    const userId = req.user.userId;
    const { favoriteIds } = req.body;

    // 入力検証
    if (!Array.isArray(favoriteIds)) {
      return res.status(400).json({
        success: false,
        error: 'favoriteIdsは配列である必要があります'
      });
    }

    if (favoriteIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '並び替えするお気に入りがありません'
      });
    }

    // 全てが数値であることを確認
    if (!favoriteIds.every(id => Number.isInteger(id) && id > 0)) {
      return res.status(400).json({
        success: false,
        error: '無効なお気に入りIDが含まれています'
      });
    }

    const result = await FavoriteManager.reorderFavorites(userId, favoriteIds);

    if (result.success) {
      // ログ記録
      await UserManager.logActivity(userId, 'reorder_favorites', null, { 
        favoriteIds,
        count: favoriteIds.length 
      });

      res.json({
        success: true,
        message: 'お気に入りの並び順を更新しました'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('お気に入り並び替えエラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
}

// お気に入り状態確認
export async function checkFavoriteStatus(req, res) {
  try {
    const userId = req.user.userId;
    const { stockCode } = req.params;

    // 入力検証
    if (!stockCode) {
      return res.status(400).json({
        success: false,
        error: '銘柄コードは必須です'
      });
    }

    const query = `
      SELECT f.id
      FROM user_favorites f
      JOIN stocks s ON f.stock_id = s.id
      WHERE f.user_id = $1 AND s.code = $2
    `;

    const result = await pool.query(query, [userId, stockCode]);

    res.json({
      success: true,
      isFavorite: result.rows.length > 0,
      favoriteId: result.rows.length > 0 ? result.rows[0].id : null
    });
  } catch (error) {
    console.error('お気に入り状態確認エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
}

// 複数銘柄のお気に入り状態を一括確認
export async function checkMultipleFavoriteStatus(req, res) {
  try {
    const userId = req.user.userId;
    const { stockCodes } = req.body;

    // 入力検証
    if (!Array.isArray(stockCodes)) {
      return res.status(400).json({
        success: false,
        error: 'stockCodesは配列である必要があります'
      });
    }

    if (stockCodes.length === 0) {
      return res.json({
        success: true,
        favoriteStatus: {}
      });
    }

    // 銘柄コードの形式チェック
    const invalidCodes = stockCodes.filter(code => !/^\d{4}$/.test(code));
    if (invalidCodes.length > 0) {
      return res.status(400).json({
        success: false,
        error: `無効な銘柄コードが含まれています: ${invalidCodes.join(', ')}`
      });
    }

    const query = `
      SELECT s.code, f.id as favorite_id
      FROM stocks s
      LEFT JOIN user_favorites f ON s.id = f.stock_id AND f.user_id = $1
      WHERE s.code = ANY($2)
    `;

    const result = await pool.query(query, [userId, stockCodes]);

    const favoriteStatus = {};
    result.rows.forEach(row => {
      favoriteStatus[row.code] = {
        isFavorite: row.favorite_id !== null,
        favoriteId: row.favorite_id
      };
    });

    // 存在しない銘柄コードも含める
    stockCodes.forEach(code => {
      if (!favoriteStatus[code]) {
        favoriteStatus[code] = {
          isFavorite: false,
          favoriteId: null
        };
      }
    });

    res.json({
      success: true,
      favoriteStatus
    });
  } catch (error) {
    console.error('複数お気に入り状態確認エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
}

// お気に入り統計情報取得
export async function getFavoriteStats(req, res) {
  try {
    const userId = req.user.userId;

    const query = `
      SELECT 
        COUNT(*) as total_favorites,
        COUNT(CASE WHEN s.market = 'PRIME' THEN 1 END) as prime_count,
        COUNT(CASE WHEN s.market = 'STANDARD' THEN 1 END) as standard_count,
        COUNT(CASE WHEN s.market = 'GROWTH' THEN 1 END) as growth_count,
        array_agg(DISTINCT s.sector) FILTER (WHERE s.sector IS NOT NULL) as sectors
      FROM user_favorites f
      JOIN stocks s ON f.stock_id = s.id
      WHERE f.user_id = $1
    `;

    const result = await pool.query(query, [userId]);
    const stats = result.rows[0];

    res.json({
      success: true,
      stats: {
        totalFavorites: parseInt(stats.total_favorites),
        marketBreakdown: {
          prime: parseInt(stats.prime_count),
          standard: parseInt(stats.standard_count),
          growth: parseInt(stats.growth_count)
        },
        sectors: stats.sectors || []
      }
    });
  } catch (error) {
    console.error('お気に入り統計取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
}

// ルーター設定
export function setupFavoritesRoutes(app) {
  // 全て認証が必要
  app.get('/api/favorites', authenticateToken, getUserFavorites);
  app.post('/api/favorites', authenticateToken, addFavorite);
  app.delete('/api/favorites/:stockCode', authenticateToken, removeFavorite);
  app.put('/api/favorites/reorder', authenticateToken, reorderFavorites);
  app.get('/api/favorites/status/:stockCode', authenticateToken, checkFavoriteStatus);
  app.post('/api/favorites/status/batch', authenticateToken, checkMultipleFavoriteStatus);
  app.get('/api/favorites/stats', authenticateToken, getFavoriteStats);
}
