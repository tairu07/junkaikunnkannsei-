// 日本株チャート巡回ツール v5.0 Enterprise
// 銘柄検索・選択コンポーネント

import React, { useState, useEffect, useRef } from 'react';

// 銘柄検索コンポーネント
export const StockSearch = ({ onStockSelect, placeholder = '銘柄を検索...', className = '' }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef(null);
  const resultsRef = useRef(null);

  // 検索実行
  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(searchQuery)}&limit=10`);
      const data = await response.json();

      if (data.success) {
        setResults(data.stocks);
        setIsOpen(true);
        setSelectedIndex(-1);
      } else {
        console.error('検索エラー:', data.error);
        setResults([]);
      }
    } catch (error) {
      console.error('検索APIエラー:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // デバウンス検索
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // 外部クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // キーボード操作
  const handleKeyDown = (e) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleStockSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // 銘柄選択
  const handleStockSelect = (stock) => {
    setQuery(`${stock.code} - ${stock.name}`);
    setIsOpen(false);
    setSelectedIndex(-1);
    onStockSelect?.(stock);
  };

  // 入力変更
  const handleInputChange = (e) => {
    setQuery(e.target.value);
    if (!e.target.value.trim()) {
      setIsOpen(false);
      setResults([]);
    }
  };

  return (
    <div ref={searchRef} className={`stock-search ${className}`}>
      <div className=\"search-input-container\">
        <input
          type=\"text\"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query && results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className=\"search-input\"
        />
        {loading && <div className=\"search-loading\">🔍</div>}
      </div>

      {isOpen && results.length > 0 && (
        <div ref={resultsRef} className=\"search-results\">
          {results.map((stock, index) => (
            <div
              key={stock.code}
              className={`search-result-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleStockSelect(stock)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className=\"stock-code\">{stock.code}</div>
              <div className=\"stock-name\">{stock.name}</div>
              <div className=\"stock-details\">
                <span className=\"stock-market\">{stock.market}</span>
                {stock.sector && <span className=\"stock-sector\">{stock.sector}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {isOpen && query && !loading && results.length === 0 && (
        <div className=\"search-no-results\">
          検索結果が見つかりません
        </div>
      )}
    </div>
  );
};

// 銘柄一覧コンポーネント
export const StockList = ({ 
  onStockSelect, 
  market = null, 
  sector = null, 
  limit = 50,
  className = '' 
}) => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState(null);
  const [sortBy, setSortBy] = useState('code');
  const [sortOrder, setSortOrder] = useState('ASC');

  // 銘柄一覧取得
  const loadStocks = async (offset = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        sortBy,
        sortOrder
      });

      if (market) params.append('market', market);
      if (sector) params.append('sector', sector);

      const response = await fetch(`/api/stocks?${params}`);
      const data = await response.json();

      if (data.success) {
        if (offset === 0) {
          setStocks(data.stocks);
        } else {
          setStocks(prev => [...prev, ...data.stocks]);
        }
        setPagination(data.pagination);
      } else {
        console.error('銘柄一覧取得エラー:', data.error);
      }
    } catch (error) {
      console.error('銘柄一覧APIエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初期読み込み
  useEffect(() => {
    loadStocks();
  }, [market, sector, sortBy, sortOrder]);

  // ソート変更
  const handleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(newSortBy);
      setSortOrder('ASC');
    }
  };

  // 追加読み込み
  const loadMore = () => {
    if (pagination && pagination.hasMore && !loading) {
      loadStocks(pagination.offset + pagination.limit);
    }
  };

  return (
    <div className={`stock-list ${className}`}>
      <div className=\"list-header\">
        <div className=\"sort-controls\">
          <button
            onClick={() => handleSort('code')}
            className={`sort-button ${sortBy === 'code' ? 'active' : ''}`}
          >
            コード {sortBy === 'code' && (sortOrder === 'ASC' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => handleSort('name')}
            className={`sort-button ${sortBy === 'name' ? 'active' : ''}`}
          >
            銘柄名 {sortBy === 'name' && (sortOrder === 'ASC' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => handleSort('market')}
            className={`sort-button ${sortBy === 'market' ? 'active' : ''}`}
          >
            市場 {sortBy === 'market' && (sortOrder === 'ASC' ? '↑' : '↓')}
          </button>
        </div>
        {pagination && (
          <div className=\"pagination-info\">
            {pagination.total}銘柄中 {Math.min(pagination.offset + pagination.limit, pagination.total)}銘柄表示
          </div>
        )}
      </div>

      <div className=\"stocks-grid\">
        {stocks.map(stock => (
          <div
            key={stock.code}
            className=\"stock-item\"
            onClick={() => onStockSelect?.(stock)}
          >
            <div className=\"stock-code\">{stock.code}</div>
            <div className=\"stock-name\">{stock.name}</div>
            <div className=\"stock-market\">{stock.market}</div>
            {stock.sector && <div className=\"stock-sector\">{stock.sector}</div>}
          </div>
        ))}
      </div>

      {loading && (
        <div className=\"loading-indicator\">読み込み中...</div>
      )}

      {pagination && pagination.hasMore && !loading && (
        <button onClick={loadMore} className=\"load-more-button\">
          さらに読み込む ({pagination.total - stocks.length}銘柄)
        </button>
      )}
    </div>
  );
};

// 市場フィルターコンポーネント
export const MarketFilter = ({ selectedMarket, onMarketChange, className = '' }) => {
  const [marketStats, setMarketStats] = useState([]);

  useEffect(() => {
    const loadMarketStats = async () => {
      try {
        const response = await fetch('/api/stocks/stats/market');
        const data = await response.json();
        if (data.success) {
          setMarketStats(data.marketStats);
        }
      } catch (error) {
        console.error('市場統計取得エラー:', error);
      }
    };

    loadMarketStats();
  }, []);

  return (
    <div className={`market-filter ${className}`}>
      <label>市場:</label>
      <select
        value={selectedMarket || ''}
        onChange={(e) => onMarketChange(e.target.value || null)}
      >
        <option value=\"\">全市場</option>
        {marketStats.map(stat => (
          <option key={stat.market} value={stat.market}>
            {stat.market} ({stat.count}銘柄)
          </option>
        ))}
      </select>
    </div>
  );
};

// 業種フィルターコンポーネント
export const SectorFilter = ({ selectedSector, onSectorChange, className = '' }) => {
  const [sectorStats, setSectorStats] = useState([]);

  useEffect(() => {
    const loadSectorStats = async () => {
      try {
        const response = await fetch('/api/stocks/stats/sector');
        const data = await response.json();
        if (data.success) {
          setSectorStats(data.sectorStats);
        }
      } catch (error) {
        console.error('業種統計取得エラー:', error);
      }
    };

    loadSectorStats();
  }, []);

  return (
    <div className={`sector-filter ${className}`}>
      <label>業種:</label>
      <select
        value={selectedSector || ''}
        onChange={(e) => onSectorChange(e.target.value || null)}
      >
        <option value=\"\">全業種</option>
        {sectorStats.map(stat => (
          <option key={stat.sector} value={stat.sector}>
            {stat.sector} ({stat.count}銘柄)
          </option>
        ))}
      </select>
    </div>
  );
};

// 人気銘柄コンポーネント
export const PopularStocks = ({ onStockSelect, limit = 10, className = '' }) => {
  const [popularStocks, setPopularStocks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadPopularStocks = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/stocks/popular?limit=${limit}`);
        const data = await response.json();
        if (data.success) {
          setPopularStocks(data.popularStocks);
        }
      } catch (error) {
        console.error('人気銘柄取得エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPopularStocks();
  }, [limit]);

  if (loading) {
    return <div className=\"loading\">読み込み中...</div>;
  }

  return (
    <div className={`popular-stocks ${className}`}>
      <h3>🔥 人気銘柄</h3>
      <div className=\"popular-list\">
        {popularStocks.map((stock, index) => (
          <div
            key={stock.code}
            className=\"popular-item\"
            onClick={() => onStockSelect?.(stock)}
          >
            <div className=\"rank\">#{index + 1}</div>
            <div className=\"stock-info\">
              <div className=\"stock-code\">{stock.code}</div>
              <div className=\"stock-name\">{stock.name}</div>
              <div className=\"favorite-count\">⭐ {stock.favoriteCount}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 銘柄選択モーダルコンポーネント
export const StockSelectModal = ({ isOpen, onClose, onStockSelect }) => {
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [selectedSector, setSelectedSector] = useState(null);

  if (!isOpen) return null;

  const handleStockSelect = (stock) => {
    onStockSelect?.(stock);
    onClose();
  };

  return (
    <div className=\"stock-select-modal-overlay\" onClick={onClose}>
      <div className=\"stock-select-modal\" onClick={(e) => e.stopPropagation()}>
        <div className=\"modal-header\">
          <h2>📈 銘柄選択</h2>
          <button onClick={onClose} className=\"close-button\">×</button>
        </div>

        <div className=\"modal-content\">
          <div className=\"search-section\">
            <StockSearch
              onStockSelect={handleStockSelect}
              placeholder=\"銘柄コードまたは銘柄名で検索...\"
            />
          </div>

          <div className=\"filters-section\">
            <MarketFilter
              selectedMarket={selectedMarket}
              onMarketChange={setSelectedMarket}
            />
            <SectorFilter
              selectedSector={selectedSector}
              onSectorChange={setSelectedSector}
            />
          </div>

          <div className=\"content-grid\">
            <div className=\"popular-section\">
              <PopularStocks onStockSelect={handleStockSelect} />
            </div>

            <div className=\"list-section\">
              <StockList
                onStockSelect={handleStockSelect}
                market={selectedMarket}
                sector={selectedSector}
                limit={20}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
