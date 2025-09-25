// 日本株チャート巡回ツール v5.0 Enterprise
// ユーザー認証システム（登録・ログイン）

import React, { useState, useContext, createContext } from 'react';

// 認証コンテキスト
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 認証プロバイダー
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));

  // ログイン
  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('auth_token', data.token);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('ログインエラー:', error);
      return { success: false, error: 'ログインに失敗しました' };
    } finally {
      setLoading(false);
    }
  };

  // ユーザー登録
  const register = async (userData) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (data.success) {
        // 登録後自動ログイン
        return await login(userData.email, userData.password);
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('登録エラー:', error);
      return { success: false, error: 'ユーザー登録に失敗しました' };
    } finally {
      setLoading(false);
    }
  };

  // ログアウト
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
  };

  // ユーザー情報取得
  const getCurrentUser = async () => {
    if (!token) return null;

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        return data.user;
      } else {
        logout();
        return null;
      }
    } catch (error) {
      console.error('ユーザー情報取得エラー:', error);
      logout();
      return null;
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    getCurrentUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ログインフォーム
export const LoginForm = ({ onSuccess, onSwitchToRegister }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const { login, loading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const result = await login(formData.email, formData.password);
    if (result.success) {
      onSuccess();
    } else {
      setError(result.error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className=\"auth-form\">
      <h2>🔐 ログイン</h2>
      <form onSubmit={handleSubmit}>
        <div className=\"form-group\">
          <label htmlFor=\"email\">メールアドレス:</label>
          <input
            type=\"email\"
            id=\"email\"
            name=\"email\"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <div className=\"form-group\">
          <label htmlFor=\"password\">パスワード:</label>
          <input
            type=\"password\"
            id=\"password\"
            name=\"password\"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        {error && <div className=\"error-message\">{error}</div>}

        <button type=\"submit\" disabled={loading} className=\"auth-button\">
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>

      <p className=\"auth-switch\">
        アカウントをお持ちでない方は{' '}
        <button onClick={onSwitchToRegister} className=\"link-button\">
          新規登録
        </button>
      </p>
    </div>
  );
};

// 登録フォーム
export const RegisterForm = ({ onSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  });
  const [error, setError] = useState('');
  const { register, loading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // パスワード確認
    if (formData.password !== formData.confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    // パスワード強度チェック
    if (formData.password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return;
    }

    const result = await register({
      username: formData.username,
      email: formData.email,
      password: formData.password,
      displayName: formData.displayName || formData.username,
    });

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className=\"auth-form\">
      <h2>📝 新規登録</h2>
      <form onSubmit={handleSubmit}>
        <div className=\"form-group\">
          <label htmlFor=\"username\">ユーザー名:</label>
          <input
            type=\"text\"
            id=\"username\"
            name=\"username\"
            value={formData.username}
            onChange={handleChange}
            required
            disabled={loading}
            minLength={3}
            maxLength={50}
          />
        </div>

        <div className=\"form-group\">
          <label htmlFor=\"email\">メールアドレス:</label>
          <input
            type=\"email\"
            id=\"email\"
            name=\"email\"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <div className=\"form-group\">
          <label htmlFor=\"displayName\">表示名 (任意):</label>
          <input
            type=\"text\"
            id=\"displayName\"
            name=\"displayName\"
            value={formData.displayName}
            onChange={handleChange}
            disabled={loading}
            maxLength={100}
            placeholder={formData.username}
          />
        </div>

        <div className=\"form-group\">
          <label htmlFor=\"password\">パスワード:</label>
          <input
            type=\"password\"
            id=\"password\"
            name=\"password\"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={loading}
            minLength={8}
          />
          <small>8文字以上で入力してください</small>
        </div>

        <div className=\"form-group\">
          <label htmlFor=\"confirmPassword\">パスワード確認:</label>
          <input
            type=\"password\"
            id=\"confirmPassword\"
            name=\"confirmPassword\"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        {error && <div className=\"error-message\">{error}</div>}

        <button type=\"submit\" disabled={loading} className=\"auth-button\">
          {loading ? '登録中...' : '新規登録'}
        </button>
      </form>

      <p className=\"auth-switch\">
        既にアカウントをお持ちの方は{' '}
        <button onClick={onSwitchToLogin} className=\"link-button\">
          ログイン
        </button>
      </p>
    </div>
  );
};

// 認証モーダル
export const AuthModal = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);

  if (!isOpen) return null;

  const handleSuccess = () => {
    onClose();
  };

  return (
    <div className=\"auth-modal-overlay\" onClick={onClose}>
      <div className=\"auth-modal\" onClick={(e) => e.stopPropagation()}>
        <button className=\"close-button\" onClick={onClose}>
          ×
        </button>
        
        {isLogin ? (
          <LoginForm
            onSuccess={handleSuccess}
            onSwitchToRegister={() => setIsLogin(false)}
          />
        ) : (
          <RegisterForm
            onSuccess={handleSuccess}
            onSwitchToLogin={() => setIsLogin(true)}
          />
        )}
      </div>
    </div>
  );
};

// ユーザープロフィール
export const UserProfile = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className=\"user-profile\">
      <div className=\"user-info\">
        <span className=\"user-name\">👤 {user.displayName || user.username}</span>
        <span className=\"user-subscription\">{user.subscriptionType}</span>
      </div>
      <button onClick={logout} className=\"logout-button\">
        ログアウト
      </button>
    </div>
  );
};

// 認証が必要なコンポーネントのラッパー
export const RequireAuth = ({ children, fallback }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className=\"loading\">読み込み中...</div>;
  }

  if (!isAuthenticated) {
    return fallback || <div>ログインが必要です</div>;
  }

  return children;
};
