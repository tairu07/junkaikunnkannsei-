# Supabaseセットアップガイド
## 日本株チャート巡回ツール v5.0 Enterprise

### 🎯 概要

このガイドでは、日本株チャート巡回ツール v5.0 Enterprise をSupabaseデータベースで動作させるための完全なセットアップ手順を説明します。

---

## 📋 事前準備

### 必要なもの
- GitHubアカウント（Supabaseサインアップ用）
- Node.js v18以上
- 本プロジェクトのクローン

### 推奨環境
- OS: Windows/Mac/Linux
- ブラウザ: Chrome/Firefox/Safari最新版
- エディタ: VS Code推奨

---

## 🚀 ステップ1: Supabaseアカウント作成

### 1.1 サインアップ
1. https://supabase.com にアクセス
2. 「Start your project」ボタンをクリック
3. 「Continue with GitHub」を選択（推奨）
4. GitHubアカウントでログイン
5. Supabaseの利用規約に同意

### 1.2 組織設定
- **Organization name**: 個人名またはプロジェクト名
- **Organization type**: Personal（個人利用）を選択

---

## 🏗️ ステップ2: プロジェクト作成

### 2.1 新規プロジェクト作成
1. ダッシュボードで「New Project」をクリック
2. 以下の情報を入力：

```
Project name: japanese-stock-chart
Database Password: [強力なパスワードを設定]
Region: Northeast Asia (Tokyo)
Pricing Plan: Free tier
```

### 2.2 重要な注意事項
- **Database Password**: 必ず安全な場所に保存してください
- **Region**: 東京リージョンを選択することで低レイテンシを実現
- **作成時間**: 通常2-3分で完了

---

## 🔗 ステップ3: 接続情報取得

### 3.1 データベース接続文字列
1. プロジェクト作成完了後、左サイドバー「Settings」をクリック
2. 「Database」セクションを選択
3. 「Connection string」で「URI」タブを選択
4. 接続文字列をコピー

```
例: postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijklmnop.supabase.co:5432/postgres
```

### 3.2 API設定
1. 左サイドバー「Settings」→「API」
2. 以下の情報をメモ：
   - **Project URL**: `https://abcdefghijklmnop.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role secret**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## ⚙️ ステップ4: 環境変数設定

### 4.1 .env.localファイル作成
プロジェクトルートに`.env.local`ファイルを作成：

```bash
# Supabase設定
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijklmnop.supabase.co:5432/postgres
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT設定
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# アプリケーション設定
NODE_ENV=development
PORT=3000
```

### 4.2 セキュリティ注意事項
- `.env.local`は`.gitignore`に含まれています
- JWT_SECRETは32文字以上の強力な文字列を使用
- 本番環境では環境変数を適切に設定

---

## 🗄️ ステップ5: データベーススキーマ初期化

### 5.1 Supabase SQL Editorでスキーマ作成
1. Supabaseダッシュボードで「SQL Editor」をクリック
2. 「New query」を選択
3. 以下のSQLを実行：

```sql
-- ユーザーテーブル
CREATE TABLE users (
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
CREATE TABLE stocks (
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
CREATE TABLE user_favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    stock_id INTEGER REFERENCES stocks(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, stock_id)
);

-- チャート設定テーブル
CREATE TABLE user_chart_settings (
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
CREATE TABLE user_activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- セッション管理テーブル
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_stocks_code ON stocks(code);
CREATE INDEX idx_stocks_market ON stocks(market);
CREATE INDEX idx_stocks_sector ON stocks(sector);
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_sort_order ON user_favorites(user_id, sort_order);
CREATE INDEX idx_user_chart_settings_user_id ON user_chart_settings(user_id);
CREATE INDEX idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);
```

### 5.2 実行確認
- 「Run」ボタンをクリック
- エラーがないことを確認
- 左サイドバー「Table Editor」でテーブルが作成されていることを確認

---

## 📊 ステップ6: TSE銘柄データ投入

### 6.1 銘柄データ投入SQL
SQL Editorで以下を実行：

```sql
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
('9984', 'ソフトバンクグループ', 'PRIME', '情報・通信業');
```

---

## 🔧 ステップ7: アプリケーション設定

### 7.1 依存関係インストール
```bash
cd /path/to/japanese-stock-chart
npm install pg bcryptjs jsonwebtoken
```

### 7.2 package.json更新
以下のスクリプトを追加：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "db:init": "node scripts/init-tse-stocks.js",
    "server": "node server/index.js"
  }
}
```

### 7.3 サーバー起動
```bash
# 開発サーバー起動
npm run dev

# または本格サーバー起動
npm run server
```

---

## ✅ ステップ8: 動作確認

### 8.1 基本動作確認
1. ブラウザで `http://localhost:3000` にアクセス
2. ユーザー登録機能をテスト
3. ログイン機能をテスト
4. お気に入り機能をテスト
5. チャート設定保存をテスト

### 8.2 データベース確認
Supabaseダッシュボードで：
1. 「Table Editor」でデータを確認
2. 「Authentication」でユーザー登録を確認
3. 「Logs」でクエリログを確認

---

## 🚨 トラブルシューティング

### よくある問題と解決方法

#### 接続エラー
```
Error: connect ECONNREFUSED
```
**解決方法**: 
- DATABASE_URLが正しいか確認
- Supabaseプロジェクトが起動しているか確認
- パスワードに特殊文字が含まれている場合はURLエンコード

#### 認証エラー
```
Error: JWT malformed
```
**解決方法**:
- JWT_SECRETが32文字以上か確認
- 環境変数が正しく読み込まれているか確認

#### テーブル作成エラー
```
Error: relation already exists
```
**解決方法**:
- 既存テーブルを削除してから再作成
- または `IF NOT EXISTS` を使用

---

## 📚 参考リンク

- [Supabase公式ドキュメント](https://supabase.com/docs)
- [PostgreSQL公式ドキュメント](https://www.postgresql.org/docs/)
- [React公式ドキュメント](https://react.dev/)
- [Node.js公式ドキュメント](https://nodejs.org/docs/)

---

## 🎯 次のステップ

セットアップ完了後：
1. **カスタマイズ**: 独自の銘柄データ追加
2. **拡張**: リアルタイム株価連携
3. **デプロイ**: Vercel + Supabaseで本番環境構築
4. **監視**: Supabaseダッシュボードでの運用監視

---

**セットアップ完了おめでとうございます！** 🎉  
日本株チャート巡回ツール v5.0 Enterprise をお楽しみください！
