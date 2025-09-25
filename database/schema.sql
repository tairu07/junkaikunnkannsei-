-- 日本株チャート巡回ツール v5.0 Enterprise
-- データベーススキーマ定義

-- ユーザーテーブル
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    subscription_type VARCHAR(20) DEFAULT 'free' -- free, pro, enterprise
);

-- TSE全銘柄マスターテーブル
CREATE TABLE stocks (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL, -- 証券コード (例: 1301)
    name VARCHAR(100) NOT NULL, -- 銘柄名 (例: 極洋)
    market VARCHAR(20) NOT NULL, -- 市場 (PRIME, STANDARD, GROWTH)
    sector VARCHAR(50), -- 業種
    industry VARCHAR(100), -- 業界
    market_cap BIGINT, -- 時価総額
    listing_date DATE, -- 上場日
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- お気に入り銘柄テーブル
CREATE TABLE user_favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    stock_id INTEGER REFERENCES stocks(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0, -- 表示順序
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, stock_id)
);

-- ユーザーチャート設定テーブル
CREATE TABLE user_chart_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    setting_name VARCHAR(50) NOT NULL, -- 設定名 (default, custom1, etc.)
    
    -- 表示設定
    time_period VARCHAR(10) DEFAULT '1Y', -- 6M, 1Y, 3Y, 5Y, 10Y
    timeframe VARCHAR(10) DEFAULT 'daily', -- daily, weekly, monthly
    
    -- テクニカル指標設定
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
    
    -- その他設定
    auto_rotation BOOLEAN DEFAULT false,
    rotation_interval INTEGER DEFAULT 3, -- 秒
    
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, setting_name)
);

-- 株価データテーブル (将来の拡張用)
CREATE TABLE stock_prices (
    id SERIAL PRIMARY KEY,
    stock_id INTEGER REFERENCES stocks(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    open_price DECIMAL(10,2),
    high_price DECIMAL(10,2),
    low_price DECIMAL(10,2),
    close_price DECIMAL(10,2),
    volume BIGINT,
    adjusted_close DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(stock_id, date)
);

-- ユーザーアクティビティログテーブル
CREATE TABLE user_activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- login, view_chart, add_favorite, etc.
    stock_id INTEGER REFERENCES stocks(id) ON DELETE SET NULL,
    details JSONB, -- 追加情報をJSON形式で保存
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ユーザーセッションテーブル
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_stocks_code ON stocks(code);
CREATE INDEX idx_stocks_market ON stocks(market);
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_stock_id ON user_favorites(stock_id);
CREATE INDEX idx_user_chart_settings_user_id ON user_chart_settings(user_id);
CREATE INDEX idx_stock_prices_stock_date ON stock_prices(stock_id, date);
CREATE INDEX idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_created_at ON user_activity_logs(created_at);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- 初期データ挿入: TSE主要銘柄
INSERT INTO stocks (code, name, market, sector) VALUES
('1301', '極洋', 'PRIME', '水産・農林業'),
('1332', '日本水産', 'PRIME', '水産・農林業'),
('1605', '国際石油開発帝石', 'PRIME', '鉱業'),
('1801', '大成建設', 'PRIME', '建設業'),
('1802', '大林組', 'PRIME', '建設業'),
('1803', '清水建設', 'PRIME', '建設業'),
('1925', '大和ハウス工業', 'PRIME', '建設業'),
('2002', '日清製粉グループ本社', 'PRIME', '食料品'),
('2269', '明治ホールディングス', 'PRIME', '食料品'),
('2502', 'アサヒグループホールディングス', 'PRIME', '食料品'),
('2503', 'キリンホールディングス', 'PRIME', '食料品'),
('2801', 'キッコーマン', 'PRIME', '食料品'),
('2802', '味の素', 'PRIME', '食料品'),
('2871', 'ニチレイ', 'PRIME', '食料品');

-- デフォルトチャート設定テンプレート
INSERT INTO user_chart_settings (user_id, setting_name, is_default) VALUES
(0, 'system_default', true); -- システムデフォルト設定
