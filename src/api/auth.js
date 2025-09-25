// 日本株チャート巡回ツール v5.0 Enterprise
// 認証API エンドポイント

import { UserManager, authenticateToken } from '../lib/database-pg.js';

// ユーザー登録エンドポイント
export async function registerUser(req, res) {
  try {
    const { username, email, password, displayName } = req.body;

    // 入力検証
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'ユーザー名、メールアドレス、パスワードは必須です'
      });
    }

    // ユーザー名の検証
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'ユーザー名は3文字以上50文字以下で入力してください'
      });
    }

    // メールアドレスの検証
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: '有効なメールアドレスを入力してください'
      });
    }

    // パスワードの検証
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'パスワードは8文字以上で入力してください'
      });
    }

    // ユーザー作成
    const result = await UserManager.createUser({
      username,
      email,
      password,
      displayName: displayName || username
    });

    if (result.success) {
      res.status(201).json({
        success: true,
        user: result.user,
        message: 'ユーザー登録が完了しました'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('ユーザー登録エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
}

// ユーザーログインエンドポイント
export async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    // 入力検証
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'メールアドレスとパスワードは必須です'
      });
    }

    // ログイン処理
    const result = await UserManager.loginUser(email, password);

    if (result.success) {
      res.json({
        success: true,
        user: result.user,
        token: result.token,
        message: 'ログインしました'
      });
    } else {
      res.status(401).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('ログインエラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
}

// 現在のユーザー情報取得エンドポイント
export async function getCurrentUser(req, res) {
  try {
    // authenticateTokenミドルウェアでreq.userが設定される
    const userId = req.user.userId;

    const query = `
      SELECT id, username, email, display_name, subscription_type, created_at, last_login
      FROM users 
      WHERE id = $1 AND is_active = true
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'ユーザーが見つかりません'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        subscriptionType: user.subscription_type,
        createdAt: user.created_at,
        lastLogin: user.last_login
      }
    });
  } catch (error) {
    console.error('ユーザー情報取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
}

// ユーザープロフィール更新エンドポイント
export async function updateUserProfile(req, res) {
  try {
    const userId = req.user.userId;
    const { displayName, email } = req.body;

    // 入力検証
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: '有効なメールアドレスを入力してください'
        });
      }
    }

    if (displayName && displayName.length > 100) {
      return res.status(400).json({
        success: false,
        error: '表示名は100文字以下で入力してください'
      });
    }

    // プロフィール更新
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (displayName !== undefined) {
      updateFields.push(`display_name = $${paramIndex++}`);
      updateValues.push(displayName);
    }

    if (email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      updateValues.push(email);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: '更新する項目がありません'
      });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(userId);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, username, email, display_name, subscription_type
    `;

    const result = await pool.query(query, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'ユーザーが見つかりません'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        subscriptionType: user.subscription_type
      },
      message: 'プロフィールを更新しました'
    });
  } catch (error) {
    console.error('プロフィール更新エラー:', error);
    if (error.code === '23505') {
      res.status(400).json({
        success: false,
        error: 'このメールアドレスは既に使用されています'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'サーバーエラーが発生しました'
      });
    }
  }
}

// パスワード変更エンドポイント
export async function changePassword(req, res) {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    // 入力検証
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: '現在のパスワードと新しいパスワードは必須です'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: '新しいパスワードは8文字以上で入力してください'
      });
    }

    // 現在のパスワード確認
    const userQuery = 'SELECT password_hash FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'ユーザーが見つかりません'
      });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);

    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: '現在のパスワードが正しくありません'
      });
    }

    // 新しいパスワードをハッシュ化
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // パスワード更新
    const updateQuery = `
      UPDATE users 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    await pool.query(updateQuery, [newPasswordHash, userId]);

    // ログ記録
    await UserManager.logActivity(userId, 'change_password');

    res.json({
      success: true,
      message: 'パスワードを変更しました'
    });
  } catch (error) {
    console.error('パスワード変更エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
}

// ルーター設定
export function setupAuthRoutes(app) {
  // 認証不要のエンドポイント
  app.post('/api/auth/register', registerUser);
  app.post('/api/auth/login', loginUser);

  // 認証が必要なエンドポイント
  app.get('/api/auth/me', authenticateToken, getCurrentUser);
  app.put('/api/auth/profile', authenticateToken, updateUserProfile);
  app.put('/api/auth/password', authenticateToken, changePassword);
}
