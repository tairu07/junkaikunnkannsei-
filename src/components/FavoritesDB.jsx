// 日本株チャート巡回ツール v5.0 Enterprise
// お気に入り機能 データベース連携コンポーネント

import React, { useState, useEffect, createContext, useContext } from 'react';
import { useAuth } from './Auth.jsx';

// お気に入りコンテキスト
const FavoritesContext = createContext();

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};

// お気に入りプロバイダー
export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const { token, isAuthenticated } = useAuth();

  // APIリクエストヘルパー
  const apiRequest = async (url, options = {}) => {
    if (!token) {
      throw new Error('認証が必要です');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'APIエラーが発生しました');
    }

    return data;
  };

  // お気に入り一覧取得
  const loadFavorites = async () => {
    if (!isAuthenticated) {
      setFavorites([]);
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest('/api/favorites');
      setFavorites(data.favorites);
    } catch (error) {
      console.error('お気に入り取得エラー:', error);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  // お気に入り追加
  const addFavorite = async (stockCode) => {
    try {
      await apiRequest('/api/favorites', {
        method: 'POST',
        body: JSON.stringify({ stockCode }),
      });

      // 一覧を再読み込み
      await loadFavorites();
      await loadStats();

      return { success: true };
    } catch (error) {
      console.error('お気に入り追加エラー:', error);
      return { success: false, error: error.message };
    }
  };

  // お気に入り削除
  const removeFavorite = async (stockCode) => {
    try {
      await apiRequest(`/api/favorites/${stockCode}`, {
        method: 'DELETE',
      });

      // 一覧を再読み込み
      await loadFavorites();
      await loadStats();

      return { success: true };
    } catch (error) {
      console.error('お気に入り削除エラー:', error);
      return { success: false, error: error.message };
    }
  };

  // お気に入り並び替え
  const reorderFavorites = async (favoriteIds) => {
    try {
      await apiRequest('/api/favorites/reorder', {
        method: 'PUT',
        body: JSON.stringify({ favoriteIds }),
      });

      // 一覧を再読み込み
      await loadFavorites();

      return { success: true };
    } catch (error) {
      console.error('お気に入り並び替えエラー:', error);
      return { success: false, error: error.message };
    }
  };

  // お気に入り状態確認
  const checkFavoriteStatus = async (stockCode) => {
    try {
      const data = await apiRequest(`/api/favorites/status/${stockCode}`);
      return data;
    } catch (error) {
      console.error('お気に入り状態確認エラー:', error);
      return { success: false, isFavorite: false };
    }
  };

  // 複数銘柄のお気に入り状態確認
  const checkMultipleFavoriteStatus = async (stockCodes) => {
    try {
      const data = await apiRequest('/api/favorites/status/batch', {
        method: 'POST',
        body: JSON.stringify({ stockCodes }),
      });
      return data.favoriteStatus;
    } catch (error) {
      console.error('複数お気に入り状態確認エラー:', error);
      return {};
    }
  };

  // お気に入り統計取得
  const loadStats = async () => {
    if (!isAuthenticated) {
      setStats(null);
      return;
    }

    try {
      const data = await apiRequest('/api/favorites/stats');
      setStats(data.stats);
    } catch (error) {
      console.error('お気に入り統計取得エラー:', error);
      setStats(null);
    }
  };

  // お気に入り切り替え（追加/削除）
  const toggleFavorite = async (stockCode) => {
    const status = await checkFavoriteStatus(stockCode);
    
    if (status.isFavorite) {
      return await removeFavorite(stockCode);
    } else {
      return await addFavorite(stockCode);
    }
  };

  // 認証状態変更時にお気に入りを読み込み
  useEffect(() => {
    if (isAuthenticated) {
      loadFavorites();
      loadStats();
    } else {
      setFavorites([]);
      setStats(null);
    }
  }, [isAuthenticated, token]);

  const value = {
    favorites,
    stats,
    loading,
    loadFavorites,
    addFavorite,
    removeFavorite,
    reorderFavorites,
    checkFavoriteStatus,
    checkMultipleFavoriteStatus,
    loadStats,
    toggleFavorite,
    favoriteCount: favorites.length,
    getFavoriteCodes: () => favorites.map(f => f.code),
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

// お気に入りボタンコンポーネント
export const FavoriteButton = ({ stockCode, className = '' }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toggleFavorite, checkFavoriteStatus } = useFavorites();
  const { isAuthenticated } = useAuth();

  // お気に入り状態を確認
  useEffect(() => {
    if (isAuthenticated && stockCode) {
      checkFavoriteStatus(stockCode).then(data => {
        setIsFavorite(data.isFavorite);
      });
    } else {
      setIsFavorite(false);
    }
  }, [stockCode, isAuthenticated]);

  const handleToggle = async () => {
    if (!isAuthenticated) {
      alert('お気に入り機能を使用するにはログインが必要です');
      return;
    }

    setLoading(true);
    try {
      const result = await toggleFavorite(stockCode);
      if (result.success) {
        setIsFavorite(!isFavorite);
      } else {
        alert(result.error || 'エラーが発生しました');
      }
    } catch (error) {
      console.error('お気に入り切り替えエラー:', error);
      alert('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading || !isAuthenticated}
      className={`favorite-button ${isFavorite ? 'active' : ''} ${className}`}
      title={isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
    >
      {loading ? '⏳' : isFavorite ? '⭐' : '☆'}
    </button>
  );
};

// お気に入り一覧コンポーネント
export const FavoritesList = ({ onStockSelect }) => {
  const { favorites, loading, removeFavorite, reorderFavorites } = useFavorites();
  const [draggedItem, setDraggedItem] = useState(null);

  const handleRemove = async (stockCode) => {
    if (confirm('この銘柄をお気に入りから削除しますか？')) {
      const result = await removeFavorite(stockCode);
      if (!result.success) {
        alert(result.error || '削除に失敗しました');
      }
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedItem === null || draggedItem === dropIndex) {
      setDraggedItem(null);
      return;
    }

    // 新しい順序を計算
    const newFavorites = [...favorites];
    const draggedFavorite = newFavorites.splice(draggedItem, 1)[0];
    newFavorites.splice(dropIndex, 0, draggedFavorite);

    // 並び替えAPIを呼び出し
    const favoriteIds = newFavorites.map(f => f.id);
    const result = await reorderFavorites(favoriteIds);
    
    if (!result.success) {
      alert(result.error || '並び替えに失敗しました');
    }

    setDraggedItem(null);
  };

  if (loading) {
    return <div className=\"favorites-loading\">読み込み中...</div>;
  }

  if (favorites.length === 0) {
    return (
      <div className=\"favorites-empty\">
        <p>お気に入り銘柄がありません</p>
        <p>チャート画面で⭐ボタンを押してお気に入りに追加してください</p>
      </div>
    );
  }

  return (
    <div className=\"favorites-list\">
      <h3>📋 お気に入り銘柄 ({favorites.length}銘柄)</h3>
      <div className=\"favorites-items\">
        {favorites.map((favorite, index) => (
          <div
            key={favorite.id}
            className={`favorite-item ${draggedItem === index ? 'dragging' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
          >
            <div className=\"favorite-info\" onClick={() => onStockSelect?.(favorite.code)}>
              <span className=\"stock-code\">{favorite.code}</span>
              <span className=\"stock-name\">{favorite.name}</span>
              <span className=\"stock-market\">{favorite.market}</span>
              {favorite.sector && <span className=\"stock-sector\">{favorite.sector}</span>}
            </div>
            <div className=\"favorite-actions\">
              <button
                onClick={() => handleRemove(favorite.code)}
                className=\"remove-button\"
                title=\"削除\"
              >
                🗑️
              </button>
              <div className=\"drag-handle\" title=\"ドラッグして並び替え\">
                ⋮⋮
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// お気に入り統計コンポーネント
export const FavoritesStats = () => {
  const { stats, loading } = useFavorites();

  if (loading || !stats) {
    return null;
  }

  return (
    <div className=\"favorites-stats\">
      <h4>📊 お気に入り統計</h4>
      <div className=\"stats-grid\">
        <div className=\"stat-item\">
          <span className=\"stat-label\">総銘柄数:</span>
          <span className=\"stat-value\">{stats.totalFavorites}</span>
        </div>
        <div className=\"stat-item\">
          <span className=\"stat-label\">プライム:</span>
          <span className=\"stat-value\">{stats.marketBreakdown.prime}</span>
        </div>
        <div className=\"stat-item\">
          <span className=\"stat-label\">スタンダード:</span>
          <span className=\"stat-value\">{stats.marketBreakdown.standard}</span>
        </div>
        <div className=\"stat-item\">
          <span className=\"stat-label\">グロース:</span>
          <span className=\"stat-value\">{stats.marketBreakdown.growth}</span>
        </div>
      </div>
      {stats.sectors.length > 0 && (
        <div className=\"sectors-list\">
          <span className=\"sectors-label\">業種:</span>
          <span className=\"sectors-value\">{stats.sectors.join(', ')}</span>
        </div>
      )}
    </div>
  );
};

// お気に入り管理ページコンポーネント
export const FavoritesManagePage = ({ onBack, onStockSelect }) => {
  return (
    <div className=\"favorites-manage-page\">
      <div className=\"page-header\">
        <button onClick={onBack} className=\"back-button\">
          ← チャート画面に戻る
        </button>
        <h2>⭐ お気に入り管理</h2>
      </div>
      
      <FavoritesStats />
      <FavoritesList onStockSelect={onStockSelect} />
    </div>
  );
};
