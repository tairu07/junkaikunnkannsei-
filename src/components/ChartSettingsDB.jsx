// 日本株チャート巡回ツール v5.0 Enterprise
// チャート設定 データベース連携コンポーネント

import React, { useState, useEffect, createContext, useContext } from 'react';
import { useAuth } from './Auth.jsx';

// チャート設定コンテキスト
const ChartSettingsContext = createContext();

export const useChartSettings = () => {
  const context = useContext(ChartSettingsContext);
  if (!context) {
    throw new Error('useChartSettings must be used within a ChartSettingsProvider');
  }
  return context;
};

// デフォルト設定
const DEFAULT_SETTINGS = {
  timePeriod: '1Y',
  timeframe: 'daily',
  showMA: true,
  maShortPeriod: 5,
  maMediumPeriod: 25,
  maLongPeriod: 75,
  showBollinger: true,
  bollingerPeriod: 20,
  bollingerSigma: 2.0,
  showRSI: false,
  rsiPeriod: 14,
  showMACD: false,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  autoRotation: false,
  rotationInterval: 3
};

// チャート設定プロバイダー
export const ChartSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsList, setSettingsList] = useState([]);
  const [currentSettingName, setCurrentSettingName] = useState('default');
  const [loading, setLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
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

  // 設定読み込み
  const loadSettings = async (settingName = 'default') => {
    if (!isAuthenticated) {
      setSettings(DEFAULT_SETTINGS);
      setCurrentSettingName('default');
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest(`/api/chart-settings?settingName=${settingName}`);
      setSettings(data.settings);
      setCurrentSettingName(settingName);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('設定読み込みエラー:', error);
      setSettings(DEFAULT_SETTINGS);
      setCurrentSettingName('default');
    } finally {
      setLoading(false);
    }
  };

  // 設定保存
  const saveSettings = async (settingName = currentSettingName, settingsToSave = settings) => {
    try {
      await apiRequest('/api/chart-settings', {
        method: 'POST',
        body: JSON.stringify({
          settingName,
          settings: settingsToSave
        }),
      });

      setHasUnsavedChanges(false);
      await loadSettingsList();
      return { success: true };
    } catch (error) {
      console.error('設定保存エラー:', error);
      return { success: false, error: error.message };
    }
  };

  // 設定一覧読み込み
  const loadSettingsList = async () => {
    if (!isAuthenticated) {
      setSettingsList([]);
      return;
    }

    try {
      const data = await apiRequest('/api/chart-settings/all');
      setSettingsList(data.settings);
    } catch (error) {
      console.error('設定一覧読み込みエラー:', error);
      setSettingsList([]);
    }
  };

  // 設定削除
  const deleteSettings = async (settingName) => {
    try {
      await apiRequest(`/api/chart-settings/${settingName}`, {
        method: 'DELETE',
      });

      await loadSettingsList();
      
      // 削除した設定が現在の設定の場合、デフォルトに戻す
      if (settingName === currentSettingName) {
        await loadSettings('default');
      }

      return { success: true };
    } catch (error) {
      console.error('設定削除エラー:', error);
      return { success: false, error: error.message };
    }
  };

  // 設定複製
  const duplicateSettings = async (sourceSettingName, newSettingName) => {
    try {
      await apiRequest('/api/chart-settings/duplicate', {
        method: 'POST',
        body: JSON.stringify({
          sourceSettingName,
          newSettingName
        }),
      });

      await loadSettingsList();
      return { success: true };
    } catch (error) {
      console.error('設定複製エラー:', error);
      return { success: false, error: error.message };
    }
  };

  // 設定更新
  const updateSettings = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    setHasUnsavedChanges(true);
  };

  // 設定リセット
  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    setHasUnsavedChanges(true);
  };

  // 認証状態変更時に設定を読み込み
  useEffect(() => {
    if (isAuthenticated) {
      loadSettings();
      loadSettingsList();
    } else {
      setSettings(DEFAULT_SETTINGS);
      setSettingsList([]);
      setCurrentSettingName('default');
      setHasUnsavedChanges(false);
    }
  }, [isAuthenticated, token]);

  const value = {
    settings,
    settingsList,
    currentSettingName,
    loading,
    hasUnsavedChanges,
    loadSettings,
    saveSettings,
    loadSettingsList,
    deleteSettings,
    duplicateSettings,
    updateSettings,
    resetSettings,
    isAuthenticated,
  };

  return (
    <ChartSettingsContext.Provider value={value}>
      {children}
    </ChartSettingsContext.Provider>
  );
};

// 設定保存ボタンコンポーネント
export const SaveSettingsButton = ({ className = '' }) => {
  const { saveSettings, hasUnsavedChanges, loading } = useChartSettings();
  const { isAuthenticated } = useAuth();

  const handleSave = async () => {
    const result = await saveSettings();
    if (result.success) {
      alert('設定を保存しました');
    } else {
      alert(`保存に失敗しました: ${result.error}`);
    }
  };

  if (!isAuthenticated || !hasUnsavedChanges) {
    return null;
  }

  return (
    <button
      onClick={handleSave}
      disabled={loading}
      className={`save-settings-button ${className}`}
      title=\"設定を保存\"
    >
      {loading ? '保存中...' : '💾 設定保存'}
    </button>
  );
};

// 設定選択コンポーネント
export const SettingsSelector = ({ className = '' }) => {
  const { 
    settingsList, 
    currentSettingName, 
    loadSettings, 
    hasUnsavedChanges 
  } = useChartSettings();
  const { isAuthenticated } = useAuth();

  const handleChange = async (e) => {
    const newSettingName = e.target.value;
    
    if (hasUnsavedChanges) {
      if (!confirm('未保存の変更があります。設定を切り替えますか？')) {
        e.target.value = currentSettingName;
        return;
      }
    }

    await loadSettings(newSettingName);
  };

  if (!isAuthenticated || settingsList.length === 0) {
    return null;
  }

  return (
    <div className={`settings-selector ${className}`}>
      <label htmlFor=\"setting-select\">設定:</label>
      <select
        id=\"setting-select\"
        value={currentSettingName}
        onChange={handleChange}
        className=\"setting-select\"
      >
        {settingsList.map(setting => (
          <option key={setting.settingName} value={setting.settingName}>
            {setting.settingName}
            {setting.isDefault && ' (デフォルト)'}
          </option>
        ))}
      </select>
    </div>
  );
};

// 設定管理コンポーネント
export const SettingsManager = ({ isOpen, onClose }) => {
  const { 
    settingsList, 
    currentSettingName,
    deleteSettings, 
    duplicateSettings,
    loadSettings 
  } = useChartSettings();
  const [newSettingName, setNewSettingName] = useState('');
  const [selectedSetting, setSelectedSetting] = useState('');

  const handleDelete = async () => {
    if (!selectedSetting || selectedSetting === 'default') {
      alert('デフォルト設定は削除できません');
      return;
    }

    if (!confirm(`設定「${selectedSetting}」を削除しますか？`)) {
      return;
    }

    const result = await deleteSettings(selectedSetting);
    if (result.success) {
      alert('設定を削除しました');
      setSelectedSetting('');
    } else {
      alert(`削除に失敗しました: ${result.error}`);
    }
  };

  const handleDuplicate = async () => {
    if (!selectedSetting || !newSettingName.trim()) {
      alert('コピー元の設定と新しい設定名を入力してください');
      return;
    }

    if (newSettingName === 'default') {
      alert('設定名に\"default\"は使用できません');
      return;
    }

    const result = await duplicateSettings(selectedSetting, newSettingName.trim());
    if (result.success) {
      alert('設定を複製しました');
      setNewSettingName('');
      setSelectedSetting('');
    } else {
      alert(`複製に失敗しました: ${result.error}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className=\"settings-manager-overlay\" onClick={onClose}>
      <div className=\"settings-manager\" onClick={(e) => e.stopPropagation()}>
        <div className=\"manager-header\">
          <h3>⚙️ 設定管理</h3>
          <button onClick={onClose} className=\"close-button\">×</button>
        </div>

        <div className=\"settings-list\">
          <h4>保存済み設定一覧</h4>
          <div className=\"settings-items\">
            {settingsList.map(setting => (
              <div key={setting.settingName} className=\"setting-item\">
                <div className=\"setting-info\">
                  <span className=\"setting-name\">
                    {setting.settingName}
                    {setting.isDefault && ' (デフォルト)'}
                  </span>
                  <span className=\"setting-details\">
                    {setting.timePeriod} | {setting.timeframe} | 
                    指標: {Object.values(setting.indicators).filter(Boolean).length}個
                  </span>
                  <span className=\"setting-date\">
                    更新: {new Date(setting.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className=\"setting-actions\">
                  <button
                    onClick={() => loadSettings(setting.settingName)}
                    className=\"load-button\"
                    disabled={setting.settingName === currentSettingName}
                  >
                    {setting.settingName === currentSettingName ? '使用中' : '読み込み'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className=\"settings-actions\">
          <div className=\"action-group\">
            <h4>設定操作</h4>
            <div className=\"form-group\">
              <label>操作対象設定:</label>
              <select
                value={selectedSetting}
                onChange={(e) => setSelectedSetting(e.target.value)}
              >
                <option value=\"\">選択してください</option>
                {settingsList.map(setting => (
                  <option key={setting.settingName} value={setting.settingName}>
                    {setting.settingName}
                  </option>
                ))}
              </select>
            </div>

            <div className=\"form-group\">
              <label>新しい設定名 (複製用):</label>
              <input
                type=\"text\"
                value={newSettingName}
                onChange={(e) => setNewSettingName(e.target.value)}
                placeholder=\"例: my_custom_setting\"
                maxLength={50}
              />
            </div>

            <div className=\"action-buttons\">
              <button
                onClick={handleDuplicate}
                disabled={!selectedSetting || !newSettingName.trim()}
                className=\"duplicate-button\"
              >
                📋 設定複製
              </button>
              <button
                onClick={handleDelete}
                disabled={!selectedSetting || selectedSetting === 'default'}
                className=\"delete-button\"
              >
                🗑️ 設定削除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 未保存変更警告コンポーネント
export const UnsavedChangesWarning = () => {
  const { hasUnsavedChanges, saveSettings } = useChartSettings();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated || !hasUnsavedChanges) {
    return null;
  }

  return (
    <div className=\"unsaved-changes-warning\">
      <span className=\"warning-text\">⚠️ 未保存の変更があります</span>
      <SaveSettingsButton className=\"warning-save-button\" />
    </div>
  );
};
