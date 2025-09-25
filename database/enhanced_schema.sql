-- 拡張データベーススキーマ
-- 全銘柄対応、ユーザー認証、チャートデータ保存機能

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    settings JSONB DEFAULT '{}'::jsonb
);

-- ユーザープロフィールテーブル
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    location VARCHAR(100),
    website_url TEXT,
    twitter_handle VARCHAR(50),
    investment_experience VARCHAR(20) CHECK (investment_experience IN ('beginner', 'intermediate', 'advanced', 'professional')),
    risk_tolerance VARCHAR(20) CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
    investment_goals TEXT[],
    notification_preferences JSONB DEFAULT '{}'::jsonb,
    privacy_settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 銘柄マスターテーブル（拡張版）
CREATE TABLE IF NOT EXISTS stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    market VARCHAR(20) NOT NULL CHECK (market IN ('PRIME', 'STANDARD', 'GROWTH', 'TOKYO_PRO')),
    sector VARCHAR(100),
    industry VARCHAR(100),
    description TEXT,
    website_url TEXT,
    employees INTEGER,
    founded_year INTEGER,
    market_cap BIGINT,
    shares_outstanding BIGINT,
    is_active BOOLEAN DEFAULT TRUE,
    listing_date DATE,
    delisting_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 株価データテーブル（日次）
CREATE TABLE IF NOT EXISTS stock_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    open_price DECIMAL(10,2),
    high_price DECIMAL(10,2),
    low_price DECIMAL(10,2),
    close_price DECIMAL(10,2),
    volume BIGINT,
    adjusted_close DECIMAL(10,2),
    dividend_amount DECIMAL(8,4) DEFAULT 0,
    split_ratio DECIMAL(8,4) DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(stock_id, date)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_stock_prices_stock_date ON stock_prices(stock_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_prices_date ON stock_prices(date DESC);

-- ユーザーお気に入り銘柄テーブル（拡張版）
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    notes TEXT,
    alert_enabled BOOLEAN DEFAULT FALSE,
    alert_price_upper DECIMAL(10,2),
    alert_price_lower DECIMAL(10,2),
    alert_volume_threshold BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, stock_id)
);

-- ユーザーチャート設定テーブル（拡張版）
CREATE TABLE IF NOT EXISTS user_chart_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    setting_name VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, setting_name)
);

-- 保存されたチャート設定テーブル
CREATE TABLE IF NOT EXISTS saved_charts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    chart_name VARCHAR(200) NOT NULL,
    chart_config JSONB NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    tags TEXT[],
    description TEXT,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ユーザーポートフォリオテーブル
CREATE TABLE IF NOT EXISTS user_portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    portfolio_name VARCHAR(200) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    total_value DECIMAL(15,2) DEFAULT 0,
    total_cost DECIMAL(15,2) DEFAULT 0,
    total_gain_loss DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ポートフォリオ保有銘柄テーブル
CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES user_portfolios(id) ON DELETE CASCADE,
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    shares DECIMAL(10,3) NOT NULL,
    average_cost DECIMAL(10,2) NOT NULL,
    current_price DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(portfolio_id, stock_id)
);

-- 取引履歴テーブル
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    portfolio_id UUID REFERENCES user_portfolios(id) ON DELETE SET NULL,
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('BUY', 'SELL')),
    shares DECIMAL(10,3) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    fees DECIMAL(10,2) DEFAULT 0,
    transaction_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ユーザーアクティビティログテーブル
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    activity_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 価格アラートテーブル
CREATE TABLE IF NOT EXISTS price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('PRICE_ABOVE', 'PRICE_BELOW', 'VOLUME_ABOVE', 'PERCENT_CHANGE')),
    threshold_value DECIMAL(15,4) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    triggered_at TIMESTAMP WITH TIME ZONE,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ウォッチリストテーブル
CREATE TABLE IF NOT EXISTS watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ウォッチリスト銘柄テーブル
CREATE TABLE IF NOT EXISTS watchlist_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(watchlist_id, stock_id)
);

-- セッションテーブル
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- パスワードリセットトークンテーブル
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) の設定
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_chart_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成
-- ユーザーは自分のデータのみアクセス可能
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own user_profiles" ON user_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own favorites" ON user_favorites FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own chart settings" ON user_chart_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own saved charts" ON saved_charts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view public saved charts" ON saved_charts FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own portfolios" ON user_portfolios FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view public portfolios" ON user_portfolios FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own portfolio holdings" ON portfolio_holdings FOR ALL USING (
    auth.uid() = (SELECT user_id FROM user_portfolios WHERE id = portfolio_id)
);

CREATE POLICY "Users can view own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own activities" ON user_activities FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own alerts" ON price_alerts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own watchlists" ON watchlists FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view public watchlists" ON watchlists FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own watchlist stocks" ON watchlist_stocks FOR ALL USING (
    auth.uid() = (SELECT user_id FROM watchlists WHERE id = watchlist_id)
);

CREATE POLICY "Users can view own sessions" ON user_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own reset tokens" ON password_reset_tokens FOR ALL USING (auth.uid() = user_id);

-- 株価データと銘柄情報は全ユーザーが読み取り可能
CREATE POLICY "Anyone can view stocks" ON stocks FOR SELECT USING (true);
CREATE POLICY "Anyone can view stock prices" ON stock_prices FOR SELECT USING (true);

-- インデックスの追加作成
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_chart_settings_user_id ON user_chart_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_charts_user_id ON saved_charts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_charts_public ON saved_charts(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_user_portfolios_user_id ON user_portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_portfolio_id ON portfolio_holdings(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_stocks_watchlist_id ON watchlist_stocks(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);

-- 関数: ユーザー統計情報取得
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'totalFavorites', (SELECT COUNT(*) FROM user_favorites WHERE user_id = user_uuid),
        'totalWatchlists', (SELECT COUNT(*) FROM watchlists WHERE user_id = user_uuid),
        'totalPortfolios', (SELECT COUNT(*) FROM user_portfolios WHERE user_id = user_uuid),
        'totalTransactions', (SELECT COUNT(*) FROM transactions WHERE user_id = user_uuid),
        'totalSavedCharts', (SELECT COUNT(*) FROM saved_charts WHERE user_id = user_uuid),
        'totalAlerts', (SELECT COUNT(*) FROM price_alerts WHERE user_id = user_uuid AND is_active = true),
        'lastActivity', (SELECT MAX(created_at) FROM user_activities WHERE user_id = user_uuid)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 関数: 株価統計情報取得
CREATE OR REPLACE FUNCTION get_stock_stats(stock_uuid UUID, days INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'currentPrice', (
            SELECT close_price 
            FROM stock_prices 
            WHERE stock_id = stock_uuid 
            ORDER BY date DESC 
            LIMIT 1
        ),
        'priceChange', (
            SELECT 
                CASE 
                    WHEN LAG(close_price) OVER (ORDER BY date) IS NOT NULL 
                    THEN close_price - LAG(close_price) OVER (ORDER BY date)
                    ELSE 0 
                END
            FROM stock_prices 
            WHERE stock_id = stock_uuid 
            ORDER BY date DESC 
            LIMIT 1
        ),
        'volume', (
            SELECT volume 
            FROM stock_prices 
            WHERE stock_id = stock_uuid 
            ORDER BY date DESC 
            LIMIT 1
        ),
        'highPrice', (
            SELECT MAX(high_price) 
            FROM stock_prices 
            WHERE stock_id = stock_uuid 
            AND date >= CURRENT_DATE - INTERVAL '%s days'
        ),
        'lowPrice', (
            SELECT MIN(low_price) 
            FROM stock_prices 
            WHERE stock_id = stock_uuid 
            AND date >= CURRENT_DATE - INTERVAL '%s days'
        ),
        'avgVolume', (
            SELECT AVG(volume) 
            FROM stock_prices 
            WHERE stock_id = stock_uuid 
            AND date >= CURRENT_DATE - INTERVAL '%s days'
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガー関数: updated_at自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_atトリガーの作成
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stocks_updated_at BEFORE UPDATE ON stocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_favorites_updated_at BEFORE UPDATE ON user_favorites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_chart_settings_updated_at BEFORE UPDATE ON user_chart_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_saved_charts_updated_at BEFORE UPDATE ON saved_charts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_portfolios_updated_at BEFORE UPDATE ON user_portfolios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_portfolio_holdings_updated_at BEFORE UPDATE ON portfolio_holdings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_price_alerts_updated_at BEFORE UPDATE ON price_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_watchlists_updated_at BEFORE UPDATE ON watchlists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 初期データの挿入（サンプルユーザー）
INSERT INTO users (email, username, display_name, password_hash, is_verified) 
VALUES 
    ('demo@example.com', 'demo_user', 'デモユーザー', '$2b$10$dummy_hash_for_demo', true),
    ('admin@example.com', 'admin', '管理者', '$2b$10$dummy_hash_for_admin', true)
ON CONFLICT (email) DO NOTHING;

-- コメント追加
COMMENT ON TABLE users IS 'ユーザーアカウント情報';
COMMENT ON TABLE user_profiles IS 'ユーザープロフィール詳細情報';
COMMENT ON TABLE stocks IS '銘柄マスターデータ（全上場企業対応）';
COMMENT ON TABLE stock_prices IS '株価履歴データ（日次OHLCV）';
COMMENT ON TABLE user_favorites IS 'ユーザー別お気に入り銘柄';
COMMENT ON TABLE user_chart_settings IS 'ユーザー別チャート表示設定';
COMMENT ON TABLE saved_charts IS '保存されたチャート設定';
COMMENT ON TABLE user_portfolios IS 'ユーザーポートフォリオ';
COMMENT ON TABLE portfolio_holdings IS 'ポートフォリオ保有銘柄';
COMMENT ON TABLE transactions IS '取引履歴';
COMMENT ON TABLE user_activities IS 'ユーザーアクティビティログ';
COMMENT ON TABLE price_alerts IS '価格アラート設定';
COMMENT ON TABLE watchlists IS 'ウォッチリスト';
COMMENT ON TABLE watchlist_stocks IS 'ウォッチリスト銘柄';
COMMENT ON TABLE user_sessions IS 'ユーザーセッション管理';
COMMENT ON TABLE password_reset_tokens IS 'パスワードリセットトークン';
