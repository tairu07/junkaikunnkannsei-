// 日本株チャート巡回ツール v5.0 Enterprise
// TSE全銘柄データ統合API

import { StockManager, UserManager, authenticateToken } from '../lib/database-pg.js';

// 全銘柄一覧取得
export async function getAllStocks(req, res) {
  try {
    const { 
      market, 
      sector, 
      search, 
      limit = 100, 
      offset = 0,
      sortBy = 'code',
      sortOrder = 'ASC'
    } = req.query;

    // パラメータ検証
    const validSortBy = ['code', 'name', 'market', 'sector', 'market_cap'];
    const validSortOrder = ['ASC', 'DESC'];
    
    if (!validSortBy.includes(sortBy)) {
      return res.status(400).json({
        success: false,
        error: '無効なソート項目です'
      });
    }

    if (!validSortOrder.includes(sortOrder.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: '無効なソート順序です'
      });
    }

    // クエリ構築
    let query = `
      SELECT code, name, market, sector, industry, market_cap, listing_date
      FROM stocks 
      WHERE is_active = true
    `;
    const queryParams = [];
    let paramIndex = 1;

    // フィルター条件追加
    if (market) {
      query += ` AND market = $${paramIndex++}`;
      queryParams.push(market);
    }

    if (sector) {
      query += ` AND sector = $${paramIndex++}`;
      queryParams.push(sector);
    }

    if (search) {
      query += ` AND (code ILIKE $${paramIndex} OR name ILIKE $${paramIndex} OR sector ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // ソート追加
    query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

    // ページネーション追加
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    queryParams.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, queryParams);

    // 総件数取得
    let countQuery = `
      SELECT COUNT(*) as total
      FROM stocks 
      WHERE is_active = true
    `;
    const countParams = [];
    let countParamIndex = 1;

    if (market) {
      countQuery += ` AND market = $${countParamIndex++}`;
      countParams.push(market);
    }

    if (sector) {
      countQuery += ` AND sector = $${countParamIndex++}`;
      countParams.push(sector);
    }

    if (search) {
      countQuery += ` AND (code ILIKE $${countParamIndex} OR name ILIKE $${countParamIndex} OR sector ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      stocks: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total
      }
    });
  } catch (error) {
    console.error('銘柄一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
}

// 銘柄検索
export async function searchStocks(req, res) {
  try {
    const { q: keyword, limit = 20 } = req.query;

    if (!keyword || keyword.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '検索キーワードは必須です'
      });
    }

    const result = await StockManager.searchStocks(keyword.trim());

    if (result.success) {
      // 検索結果を制限
      const limitedStocks = result.stocks.slice(0, parseInt(limit));

      res.json({
        success: true,
        stocks: limitedStocks,
        total: result.stocks.length,
        keyword: keyword.trim()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('銘柄検索エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
}

// 個別銘柄情報取得
export async function getStockInfo(req, res) {
  try {
    const { stockCode } = req.params;

    // 銘柄コードの形式チェック
    if (!/^\d{4}$/.test(stockCode)) {
      return res.status(400).json({
        success: false,
        error: '有効な銘柄コードを入力してください（4桁の数字）'
      });
    }

    const query = `
      SELECT 
        code, name, market, sector, industry, 
        market_cap, listing_date, created_at, updated_at
      FROM stocks 
      WHERE code = $1 AND is_active = true
    `;

    const result = await pool.query(query, [stockCode]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '銘柄が見つかりません'
      });
    }

    const stock = result.rows[0];

    res.json({
      success: true,
      stock: {
        code: stock.code,
        name: stock.name,
        market: stock.market,
        sector: stock.sector,
        industry: stock.industry,
        marketCap: stock.market_cap,
        listingDate: stock.listing_date,
        createdAt: stock.created_at,
        updatedAt: stock.updated_at
      }
    });
  } catch (error) {
    console.error('銘柄情報取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
}

// 市場別銘柄数取得
export async function getMarketStats(req, res) {
  try {
    const query = `
      SELECT 
        market,
        COUNT(*) as count,
        COUNT(CASE WHEN market_cap IS NOT NULL THEN 1 END) as with_market_cap
      FROM stocks 
      WHERE is_active = true
      GROUP BY market
      ORDER BY market
    `;

    const result = await pool.query(query);

    const marketStats = result.rows.map(row => ({
      market: row.market,
      count: parseInt(row.count),
      withMarketCap: parseInt(row.with_market_cap)
    }));

    res.json({
      success: true,
      marketStats
    });
  } catch (error) {
    console.error('市場統計取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
}

// 業種別銘柄数取得
export async function getSectorStats(req, res) {
  try {
    const query = `
      SELECT 
        sector,
        COUNT(*) as count,
        array_agg(DISTINCT market) as markets
      FROM stocks 
      WHERE is_active = true AND sector IS NOT NULL
      GROUP BY sector
      ORDER BY count DESC, sector
    `;

    const result = await pool.query(query);

    const sectorStats = result.rows.map(row => ({
      sector: row.sector,
      count: parseInt(row.count),
      markets: row.markets
    }));

    res.json({
      success: true,
      sectorStats
    });
  } catch (error) {
    console.error('業種統計取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
}

// 銘柄データ一括更新（管理者用）
export async function bulkUpdateStocks(req, res) {
  try {
    const { stocks } = req.body;

    if (!Array.isArray(stocks)) {
      return res.status(400).json({
        success: false,
        error: '銘柄データは配列である必要があります'
      });
    }

    const client = await pool.connect();
    let successCount = 0;
    let errorCount = 0;

    try {
      await client.query('BEGIN');

      for (const stock of stocks) {
        try {
          // 銘柄データの検証
          if (!stock.code || !stock.name) {
            errorCount++;
            continue;
          }

          const query = `
            INSERT INTO stocks (code, name, market, sector, industry, market_cap, listing_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (code)
            DO UPDATE SET
              name = EXCLUDED.name,
              market = EXCLUDED.market,
              sector = EXCLUDED.sector,
              industry = EXCLUDED.industry,
              market_cap = EXCLUDED.market_cap,
              listing_date = EXCLUDED.listing_date,
              updated_at = CURRENT_TIMESTAMP
          `;

          await client.query(query, [
            stock.code,
            stock.name,
            stock.market || null,
            stock.sector || null,
            stock.industry || null,
            stock.marketCap || null,
            stock.listingDate || null
          ]);

          successCount++;
        } catch (error) {
          console.error(`銘柄 ${stock.code} の更新エラー:`, error);
          errorCount++;
        }
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: '銘柄データを一括更新しました',
        successCount,
        errorCount,
        totalCount: stocks.length
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('銘柄一括更新エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
}

// 人気銘柄ランキング取得（お気に入り数ベース）
export async function getPopularStocks(req, res) {
  try {
    const { limit = 20 } = req.query;

    const query = `
      SELECT 
        s.code, s.name, s.market, s.sector,
        COUNT(f.id) as favorite_count
      FROM stocks s
      LEFT JOIN user_favorites f ON s.id = f.stock_id
      WHERE s.is_active = true
      GROUP BY s.id, s.code, s.name, s.market, s.sector
      ORDER BY favorite_count DESC, s.code ASC
      LIMIT $1
    `;

    const result = await pool.query(query, [parseInt(limit)]);

    const popularStocks = result.rows.map(row => ({
      code: row.code,
      name: row.name,
      market: row.market,
      sector: row.sector,
      favoriteCount: parseInt(row.favorite_count)
    }));

    res.json({
      success: true,
      popularStocks
    });
  } catch (error) {
    console.error('人気銘柄取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
}

// ランダム銘柄取得
export async function getRandomStocks(req, res) {
  try {
    const { count = 10, market } = req.query;

    let query = `
      SELECT code, name, market, sector
      FROM stocks 
      WHERE is_active = true
    `;
    const queryParams = [];

    if (market) {
      query += ` AND market = $1`;
      queryParams.push(market);
    }

    query += ` ORDER BY RANDOM() LIMIT $${queryParams.length + 1}`;
    queryParams.push(parseInt(count));

    const result = await pool.query(query, queryParams);

    res.json({
      success: true,
      stocks: result.rows
    });
  } catch (error) {
    console.error('ランダム銘柄取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
}

// ルーター設定
export function setupStocksRoutes(app) {
  // 認証不要のエンドポイント
  app.get('/api/stocks', getAllStocks);
  app.get('/api/stocks/search', searchStocks);
  app.get('/api/stocks/info/:stockCode', getStockInfo);
  app.get('/api/stocks/stats/market', getMarketStats);
  app.get('/api/stocks/stats/sector', getSectorStats);
  app.get('/api/stocks/popular', getPopularStocks);
  app.get('/api/stocks/random', getRandomStocks);

  // 管理者用エンドポイント（認証必要）
  app.post('/api/stocks/bulk-update', authenticateToken, bulkUpdateStocks);
}
