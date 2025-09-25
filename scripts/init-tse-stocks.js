// 日本株チャート巡回ツール v5.0 Enterprise
// TSE全銘柄データ初期化スクリプト

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// データベース接続
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/stock_chart_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// TSE全銘柄データ（主要銘柄を含む拡張版）
const TSE_STOCKS = [
  // 水産・農林業
  { code: '1301', name: '極洋', market: 'PRIME', sector: '水産・農林業' },
  { code: '1332', name: '日本水産', market: 'PRIME', sector: '水産・農林業' },
  { code: '1333', name: 'マルハニチロ', market: 'PRIME', sector: '水産・農林業' },
  
  // 鉱業
  { code: '1605', name: '国際石油開発帝石', market: 'PRIME', sector: '鉱業' },
  { code: '1662', name: '石油資源開発', market: 'PRIME', sector: '鉱業' },
  
  // 建設業
  { code: '1801', name: '大成建設', market: 'PRIME', sector: '建設業' },
  { code: '1802', name: '大林組', market: 'PRIME', sector: '建設業' },
  { code: '1803', name: '清水建設', market: 'PRIME', sector: '建設業' },
  { code: '1812', name: '鹿島建設', market: 'PRIME', sector: '建設業' },
  { code: '1925', name: '大和ハウス工業', market: 'PRIME', sector: '建設業' },
  { code: '1928', name: '積水ハウス', market: 'PRIME', sector: '建設業' },
  
  // 食料品
  { code: '2002', name: '日清製粉グループ本社', market: 'PRIME', sector: '食料品' },
  { code: '2269', name: '明治ホールディングス', market: 'PRIME', sector: '食料品' },
  { code: '2502', name: 'アサヒグループホールディングス', market: 'PRIME', sector: '食料品' },
  { code: '2503', name: 'キリンホールディングス', market: 'PRIME', sector: '食料品' },
  { code: '2801', name: 'キッコーマン', market: 'PRIME', sector: '食料品' },
  { code: '2802', name: '味の素', market: 'PRIME', sector: '食料品' },
  { code: '2871', name: 'ニチレイ', market: 'PRIME', sector: '食料品' },
  { code: '2914', name: '日本たばこ産業', market: 'PRIME', sector: '食料品' },
  
  // 繊維製品
  { code: '3401', name: '帝人', market: 'PRIME', sector: '繊維製品' },
  { code: '3402', name: '東レ', market: 'PRIME', sector: '繊維製品' },
  { code: '3407', name: '旭化成', market: 'PRIME', sector: '繊維製品' },
  
  // パルプ・紙
  { code: '3861', name: '王子ホールディングス', market: 'PRIME', sector: 'パルプ・紙' },
  { code: '3863', name: '日本製紙', market: 'PRIME', sector: 'パルプ・紙' },
  
  // 化学
  { code: '4005', name: '住友化学', market: 'PRIME', sector: '化学' },
  { code: '4021', name: '日産化学', market: 'PRIME', sector: '化学' },
  { code: '4063', name: '信越化学工業', market: 'PRIME', sector: '化学' },
  { code: '4183', name: '三井化学', market: 'PRIME', sector: '化学' },
  { code: '4188', name: '三菱ケミカルホールディングス', market: 'PRIME', sector: '化学' },
  
  // 医薬品
  { code: '4502', name: '武田薬品工業', market: 'PRIME', sector: '医薬品' },
  { code: '4503', name: 'アステラス製薬', market: 'PRIME', sector: '医薬品' },
  { code: '4506', name: '大日本住友製薬', market: 'PRIME', sector: '医薬品' },
  { code: '4507', name: '塩野義製薬', market: 'PRIME', sector: '医薬品' },
  { code: '4568', name: '第一三共', market: 'PRIME', sector: '医薬品' },
  
  // 石油・石炭製品
  { code: '5001', name: '新日本石油', market: 'PRIME', sector: '石油・石炭製品' },
  { code: '5020', name: 'ENEOSホールディングス', market: 'PRIME', sector: '石油・石炭製品' },
  
  // ゴム製品
  { code: '5101', name: '横浜ゴム', market: 'PRIME', sector: 'ゴム製品' },
  { code: '5108', name: 'ブリヂストン', market: 'PRIME', sector: 'ゴム製品' },
  
  // ガラス・土石製品
  { code: '5201', name: 'AGC', market: 'PRIME', sector: 'ガラス・土石製品' },
  { code: '5233', name: '太平洋セメント', market: 'PRIME', sector: 'ガラス・土石製品' },
  
  // 鉄鋼
  { code: '5401', name: '新日鐵住金', market: 'PRIME', sector: '鉄鋼' },
  { code: '5411', name: 'JFEホールディングス', market: 'PRIME', sector: '鉄鋼' },
  { code: '5631', name: '日本製鋼所', market: 'PRIME', sector: '鉄鋼' },
  
  // 非鉄金属
  { code: '5701', name: '日本軽金属ホールディングス', market: 'PRIME', sector: '非鉄金属' },
  { code: '5711', name: '三菱マテリアル', market: 'PRIME', sector: '非鉄金属' },
  { code: '5713', name: '住友金属鉱山', market: 'PRIME', sector: '非鉄金属' },
  
  // 金属製品
  { code: '5801', name: '古河電気工業', market: 'PRIME', sector: '金属製品' },
  { code: '5802', name: '住友電気工業', market: 'PRIME', sector: '金属製品' },
  
  // 機械
  { code: '6103', name: 'オークマ', market: 'PRIME', sector: '機械' },
  { code: '6301', name: 'コマツ', market: 'PRIME', sector: '機械' },
  { code: '6326', name: 'クボタ', market: 'PRIME', sector: '機械' },
  { code: '6367', name: 'ダイキン工業', market: 'PRIME', sector: '機械' },
  
  // 電気機器
  { code: '6501', name: '日立製作所', market: 'PRIME', sector: '電気機器' },
  { code: '6502', name: '東芝', market: 'PRIME', sector: '電気機器' },
  { code: '6503', name: '三菱電機', market: 'PRIME', sector: '電気機器' },
  { code: '6594', name: '日本電産', market: 'PRIME', sector: '電気機器' },
  { code: '6701', name: '日本電気', market: 'PRIME', sector: '電気機器' },
  { code: '6702', name: '富士通', market: 'PRIME', sector: '電気機器' },
  { code: '6752', name: 'パナソニック', market: 'PRIME', sector: '電気機器' },
  { code: '6758', name: 'ソニーグループ', market: 'PRIME', sector: '電気機器' },
  { code: '6770', name: 'アルプスアルパイン', market: 'PRIME', sector: '電気機器' },
  { code: '6841', name: '横河電機', market: 'PRIME', sector: '電気機器' },
  
  // 輸送用機器
  { code: '7201', name: '日産自動車', market: 'PRIME', sector: '輸送用機器' },
  { code: '7203', name: 'トヨタ自動車', market: 'PRIME', sector: '輸送用機器' },
  { code: '7261', name: 'マツダ', market: 'PRIME', sector: '輸送用機器' },
  { code: '7267', name: 'ホンダ', market: 'PRIME', sector: '輸送用機器' },
  { code: '7269', name: 'スズキ', market: 'PRIME', sector: '輸送用機器' },
  { code: '7270', name: 'SUBARU', market: 'PRIME', sector: '輸送用機器' },
  
  // 精密機器
  { code: '7731', name: 'ニコン', market: 'PRIME', sector: '精密機器' },
  { code: '7733', name: 'オリンパス', market: 'PRIME', sector: '精密機器' },
  { code: '7751', name: 'キヤノン', market: 'PRIME', sector: '精密機器' },
  
  // その他製品
  { code: '7832', name: 'バンダイナムコホールディングス', market: 'PRIME', sector: 'その他製品' },
  { code: '7974', name: '任天堂', market: 'PRIME', sector: 'その他製品' },
  
  // 電気・ガス業
  { code: '9501', name: '東京電力ホールディングス', market: 'PRIME', sector: '電気・ガス業' },
  { code: '9502', name: '中部電力', market: 'PRIME', sector: '電気・ガス業' },
  { code: '9503', name: '関西電力', market: 'PRIME', sector: '電気・ガス業' },
  { code: '9531', name: '東京ガス', market: 'PRIME', sector: '電気・ガス業' },
  { code: '9532', name: '大阪ガス', market: 'PRIME', sector: '電気・ガス業' },
  
  // 陸運業
  { code: '9001', name: '東武鉄道', market: 'PRIME', sector: '陸運業' },
  { code: '9005', name: '東急', market: 'PRIME', sector: '陸運業' },
  { code: '9007', name: '小田急電鉄', market: 'PRIME', sector: '陸運業' },
  { code: '9020', name: '東日本旅客鉄道', market: 'PRIME', sector: '陸運業' },
  { code: '9021', name: '西日本旅客鉄道', market: 'PRIME', sector: '陸運業' },
  { code: '9022', name: '東海旅客鉄道', market: 'PRIME', sector: '陸運業' },
  
  // 海運業
  { code: '9101', name: '日本郵船', market: 'PRIME', sector: '海運業' },
  { code: '9104', name: '商船三井', market: 'PRIME', sector: '海運業' },
  { code: '9107', name: '川崎汽船', market: 'PRIME', sector: '海運業' },
  
  // 空運業
  { code: '9201', name: '日本航空', market: 'PRIME', sector: '空運業' },
  { code: '9202', name: 'ANAホールディングス', market: 'PRIME', sector: '空運業' },
  
  // 倉庫・運輸関連業
  { code: '9301', name: '三菱倉庫', market: 'PRIME', sector: '倉庫・運輸関連業' },
  { code: '9364', name: '上組', market: 'PRIME', sector: '倉庫・運輸関連業' },
  
  // 情報・通信業
  { code: '4689', name: 'Zホールディングス', market: 'PRIME', sector: '情報・通信業' },
  { code: '9432', name: '日本電信電話', market: 'PRIME', sector: '情報・通信業' },
  { code: '9433', name: 'KDDI', market: 'PRIME', sector: '情報・通信業' },
  { code: '9434', name: 'ソフトバンク', market: 'PRIME', sector: '情報・通信業' },
  { code: '9984', name: 'ソフトバンクグループ', market: 'PRIME', sector: '情報・通信業' },
  
  // 卸売業
  { code: '8001', name: '伊藤忠商事', market: 'PRIME', sector: '卸売業' },
  { code: '8002', name: '丸紅', market: 'PRIME', sector: '卸売業' },
  { code: '8031', name: '三井物産', market: 'PRIME', sector: '卸売業' },
  { code: '8053', name: '住友商事', market: 'PRIME', sector: '卸売業' },
  { code: '8058', name: '三菱商事', market: 'PRIME', sector: '卸売業' },
  
  // 小売業
  { code: '3086', name: 'J.フロント リテイリング', market: 'PRIME', sector: '小売業' },
  { code: '3099', name: '三越伊勢丹ホールディングス', market: 'PRIME', sector: '小売業' },
  { code: '7011', name: '三菱重工業', market: 'PRIME', sector: '小売業' },
  { code: '8267', name: 'イオン', market: 'PRIME', sector: '小売業' },
  { code: '9983', name: 'ファーストリテイリング', market: 'PRIME', sector: '小売業' },
  
  // 銀行業
  { code: '8301', name: '日本銀行', market: 'PRIME', sector: '銀行業' },
  { code: '8306', name: '三菱UFJフィナンシャル・グループ', market: 'PRIME', sector: '銀行業' },
  { code: '8316', name: '三井住友フィナンシャルグループ', market: 'PRIME', sector: '銀行業' },
  { code: '8411', name: 'みずほフィナンシャルグループ', market: 'PRIME', sector: '銀行業' },
  
  // 証券、商品先物取引業
  { code: '8601', name: '大和証券グループ本社', market: 'PRIME', sector: '証券、商品先物取引業' },
  { code: '8604', name: '野村ホールディングス', market: 'PRIME', sector: '証券、商品先物取引業' },
  
  // 保険業
  { code: '8750', name: '第一生命ホールディングス', market: 'PRIME', sector: '保険業' },
  { code: '8766', name: '東京海上ホールディングス', market: 'PRIME', sector: '保険業' },
  { code: '8795', name: 'T&Dホールディングス', market: 'PRIME', sector: '保険業' },
  
  // 不動産業
  { code: '8801', name: '三井不動産', market: 'PRIME', sector: '不動産業' },
  { code: '8802', name: '三菱地所', market: 'PRIME', sector: '不動産業' },
  { code: '8830', name: '住友不動産', market: 'PRIME', sector: '不動産業' },
  
  // サービス業
  { code: '2432', name: 'ディー・エヌ・エー', market: 'PRIME', sector: 'サービス業' },
  { code: '4324', name: '電通グループ', market: 'PRIME', sector: 'サービス業' },
  { code: '6178', name: '日本郵政', market: 'PRIME', sector: 'サービス業' },
  { code: '9735', name: 'セコム', market: 'PRIME', sector: 'サービス業' }
];

// データベース初期化関数
async function initializeTSEStocks() {
  console.log('🚀 TSE全銘柄データの初期化を開始します...');

  try {
    // データベース接続テスト
    const client = await pool.connect();
    console.log('✅ データベース接続成功');

    try {
      await client.query('BEGIN');

      // 既存データをクリア（開発環境のみ）
      if (process.env.NODE_ENV !== 'production') {
        await client.query('DELETE FROM user_favorites');
        await client.query('DELETE FROM stocks');
        console.log('🗑️ 既存データをクリアしました');
      }

      // 銘柄データを一括挿入
      let successCount = 0;
      let errorCount = 0;

      for (const stock of TSE_STOCKS) {
        try {
          const query = `
            INSERT INTO stocks (code, name, market, sector, industry, is_active)
            VALUES ($1, $2, $3, $4, $5, true)
            ON CONFLICT (code)
            DO UPDATE SET
              name = EXCLUDED.name,
              market = EXCLUDED.market,
              sector = EXCLUDED.sector,
              industry = EXCLUDED.industry,
              updated_at = CURRENT_TIMESTAMP
          `;

          await client.query(query, [
            stock.code,
            stock.name,
            stock.market,
            stock.sector,
            stock.industry || null
          ]);

          successCount++;
        } catch (error) {
          console.error(`❌ 銘柄 ${stock.code} の挿入エラー:`, error.message);
          errorCount++;
        }
      }

      await client.query('COMMIT');

      console.log(`✅ TSE銘柄データの初期化が完了しました`);
      console.log(`📊 成功: ${successCount}銘柄, エラー: ${errorCount}銘柄`);

      // 統計情報を表示
      const statsQuery = `
        SELECT 
          market,
          COUNT(*) as count
        FROM stocks 
        WHERE is_active = true
        GROUP BY market
        ORDER BY market
      `;

      const statsResult = await client.query(statsQuery);
      console.log('\n📈 市場別銘柄数:');
      statsResult.rows.forEach(row => {
        console.log(`  ${row.market}: ${row.count}銘柄`);
      });

      const totalQuery = 'SELECT COUNT(*) as total FROM stocks WHERE is_active = true';
      const totalResult = await client.query(totalQuery);
      console.log(`\n🎯 総銘柄数: ${totalResult.rows[0].total}銘柄`);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ 初期化エラー:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// スクリプト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeTSEStocks();
}

export { initializeTSEStocks, TSE_STOCKS };
