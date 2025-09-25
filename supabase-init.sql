-- 日本株チャート巡回ツール v5.0 Enterprise
-- Supabaseデータベース初期化スクリプト

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(100),
    full_name VARCHAR(255),
    subscription_type VARCHAR(50) DEFAULT 'free',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 銘柄マスターテーブル
CREATE TABLE IF NOT EXISTS stocks (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    market VARCHAR(50),
    sector VARCHAR(100),
    industry VARCHAR(100),
    market_cap BIGINT,
    listing_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- お気に入りテーブル
CREATE TABLE IF NOT EXISTS user_favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    stock_id INTEGER REFERENCES stocks(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, stock_id)
);

-- チャート設定テーブル
CREATE TABLE IF NOT EXISTS user_chart_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    setting_name VARCHAR(100) NOT NULL,
    time_period VARCHAR(10) DEFAULT '1Y',
    timeframe VARCHAR(20) DEFAULT 'daily',
    show_ma BOOLEAN DEFAULT true,
    ma_short_period INTEGER DEFAULT 5,
    ma_medium_period INTEGER DEFAULT 25,
    ma_long_period INTEGER DEFAULT 75,
    show_bollinger BOOLEAN DEFAULT true,
    bollinger_period INTEGER DEFAULT 20,
    bollinger_sigma DECIMAL(3,1) DEFAULT 2.0,
    show_rsi BOOLEAN DEFAULT false,
    rsi_period INTEGER DEFAULT 14,
    show_macd BOOLEAN DEFAULT false,
    macd_fast INTEGER DEFAULT 12,
    macd_slow INTEGER DEFAULT 26,
    macd_signal INTEGER DEFAULT 9,
    auto_rotation BOOLEAN DEFAULT false,
    rotation_interval INTEGER DEFAULT 3,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, setting_name)
);

-- アクティビティログテーブル
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- セッション管理テーブル
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_stocks_code ON stocks(code);
CREATE INDEX IF NOT EXISTS idx_stocks_market ON stocks(market);
CREATE INDEX IF NOT EXISTS idx_stocks_sector ON stocks(sector);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_sort_order ON user_favorites(user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_user_chart_settings_user_id ON user_chart_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);

-- TSE主要銘柄データ投入
INSERT INTO stocks (code, name, market, sector) VALUES
('1301', '極洋', 'PRIME', '水産・農林業'),
('1332', '日本水産', 'PRIME', '水産・農林業'),
('1333', 'マルハニチロ', 'PRIME', '水産・農林業'),
('1801', '大成建設', 'PRIME', '建設業'),
('1802', '大林組', 'PRIME', '建設業'),
('1803', '清水建設', 'PRIME', '建設業'),
('1812', '鹿島建設', 'PRIME', '建設業'),
('2502', 'アサヒグループホールディングス', 'PRIME', '食料品'),
('2503', 'キリンホールディングス', 'PRIME', '食料品'),
('2801', 'キッコーマン', 'PRIME', '食料品'),
('2802', '味の素', 'PRIME', '食料品'),
('2914', '日本たばこ産業', 'PRIME', '食料品'),
('4502', '武田薬品工業', 'PRIME', '医薬品'),
('4503', 'アステラス製薬', 'PRIME', '医薬品'),
('4568', '第一三共', 'PRIME', '医薬品'),
('6301', 'コマツ', 'PRIME', '機械'),
('6367', 'ダイキン工業', 'PRIME', '機械'),
('6501', '日立製作所', 'PRIME', '電気機器'),
('6502', '東芝', 'PRIME', '電気機器'),
('6503', '三菱電機', 'PRIME', '電気機器'),
('6701', '日本電気', 'PRIME', '電気機器'),
('6702', '富士通', 'PRIME', '電気機器'),
('6752', 'パナソニック', 'PRIME', '電気機器'),
('6758', 'ソニーグループ', 'PRIME', '電気機器'),
('7201', '日産自動車', 'PRIME', '輸送用機器'),
('7203', 'トヨタ自動車', 'PRIME', '輸送用機器'),
('7267', 'ホンダ', 'PRIME', '輸送用機器'),
('7751', 'キヤノン', 'PRIME', '精密機器'),
('7974', '任天堂', 'PRIME', 'その他製品'),
('8001', '伊藤忠商事', 'PRIME', '卸売業'),
('8031', '三井物産', 'PRIME', '卸売業'),
('8058', '三菱商事', 'PRIME', '卸売業'),
('8267', 'イオン', 'PRIME', '小売業'),
('8306', '三菱UFJフィナンシャル・グループ', 'PRIME', '銀行業'),
('8316', '三井住友フィナンシャルグループ', 'PRIME', '銀行業'),
('8411', 'みずほフィナンシャルグループ', 'PRIME', '銀行業'),
('8766', '東京海上ホールディングス', 'PRIME', '保険業'),
('8801', '三井不動産', 'PRIME', '不動産業'),
('8802', '三菱地所', 'PRIME', '不動産業'),
('9432', '日本電信電話', 'PRIME', '情報・通信業'),
('9433', 'KDDI', 'PRIME', '情報・通信業'),
('9434', 'ソフトバンク', 'PRIME', '情報・通信業'),
('9501', '東京電力ホールディングス', 'PRIME', '電気・ガス業'),
('9531', '東京ガス', 'PRIME', '電気・ガス業'),
('9983', 'ファーストリテイリング', 'PRIME', '小売業'),
('9984', 'ソフトバンクグループ', 'PRIME', '情報・通信業')
ON CONFLICT (code) DO NOTHING;

-- 完了メッセージ
SELECT 'データベース初期化完了！' as message, 
       (SELECT COUNT(*) FROM stocks) as total_stocks,
       'テーブル作成とTSE銘柄データ投入が完了しました。' as status;
