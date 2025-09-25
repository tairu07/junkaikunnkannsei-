-- 日本株チャートツール用データベーススキーマ
-- Supabase対応版

-- 銘柄マスターテーブル
CREATE TABLE IF NOT EXISTS stocks (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    market VARCHAR(20) NOT NULL DEFAULT 'PRIME',
    base_price INTEGER NOT NULL DEFAULT 1000,
    sector VARCHAR(50),
    industry VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ユーザーお気に入りテーブル
CREATE TABLE IF NOT EXISTS user_favorites (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    stock_code VARCHAR(10) NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, stock_code)
);

-- ユーザーチャート設定テーブル
CREATE TABLE IF NOT EXISTS user_chart_settings (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 株価履歴テーブル（将来の拡張用）
CREATE TABLE IF NOT EXISTS stock_prices (
    id SERIAL PRIMARY KEY,
    stock_code VARCHAR(10) NOT NULL,
    date DATE NOT NULL,
    open_price INTEGER NOT NULL,
    high_price INTEGER NOT NULL,
    low_price INTEGER NOT NULL,
    close_price INTEGER NOT NULL,
    volume BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(stock_code, date)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_stocks_code ON stocks(code);
CREATE INDEX IF NOT EXISTS idx_stocks_market ON stocks(market);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_stock_code ON user_favorites(stock_code);
CREATE INDEX IF NOT EXISTS idx_user_favorites_order ON user_favorites(user_id, order_index);
CREATE INDEX IF NOT EXISTS idx_user_chart_settings_user_id ON user_chart_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_prices_code_date ON stock_prices(stock_code, date);

-- 初期データの挿入
INSERT INTO stocks (code, name, market, base_price, sector, industry) VALUES
('1301', '極洋', 'PRIME', 1500, '水産・農林業', '水産業'),
('1332', '日本水産', 'PRIME', 1900, '水産・農林業', '水産業'),
('1801', '大成建設', 'PRIME', 1950, '建設業', '総合建設業'),
('2269', '明治ホールディングス', 'PRIME', 2800, '食品', '乳製品'),
('2503', 'キリンホールディングス', 'PRIME', 2100, '食品', 'ビール類'),
('4502', '武田薬品工業', 'PRIME', 4000, '医薬品', '医薬品'),
('6501', '日立製作所', 'PRIME', 3500, '電気機器', '総合電機'),
('6758', 'ソニーグループ', 'PRIME', 13000, '電気機器', 'AV機器'),
('7203', 'トヨタ自動車', 'PRIME', 2800, '輸送用機器', '自動車'),
('7974', '任天堂', 'PRIME', 7500, '情報・通信業', 'ゲーム'),
('8306', '三菱UFJ', 'PRIME', 1300, '銀行業', '都市銀行'),
('9432', 'NTT', 'PRIME', 180, '情報・通信業', '固定通信'),
('9433', 'KDDI', 'PRIME', 4200, '情報・通信業', '移動体通信'),
('9984', 'ソフトバンクG', 'PRIME', 7500, '情報・通信業', '持株会社')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    market = EXCLUDED.market,
    base_price = EXCLUDED.base_price,
    sector = EXCLUDED.sector,
    industry = EXCLUDED.industry,
    updated_at = NOW();

-- RLS (Row Level Security) の設定
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_chart_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_prices ENABLE ROW LEVEL SECURITY;

-- 公開読み取りポリシー（銘柄データ）
CREATE POLICY "Allow public read access to stocks" ON stocks
    FOR SELECT USING (true);

-- ユーザー固有データのポリシー
CREATE POLICY "Users can manage their own favorites" ON user_favorites
    FOR ALL USING (true);

CREATE POLICY "Users can manage their own chart settings" ON user_chart_settings
    FOR ALL USING (true);

-- 株価データの公開読み取りポリシー
CREATE POLICY "Allow public read access to stock prices" ON stock_prices
    FOR SELECT USING (true);

-- 更新時刻の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stocks_updated_at BEFORE UPDATE ON stocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_chart_settings_updated_at BEFORE UPDATE ON user_chart_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
