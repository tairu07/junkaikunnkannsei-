// 日本株チャート巡回ツール v5.0 Enterprise
// チャート設定 データベース保存API

import { ChartSettingsManager, UserManager, authenticateToken } from '../lib/database-pg.js';

// ユーザーのチャート設定取得
export async function getUserChartSettings(req, res) {
  try {
    const userId = req.user.userId;
    const { settingName = 'default' } = req.query;

    const result = await ChartSettingsManager.getUserSettings(userId, settingName);

    if (result.success) {
      // データベースの形式をフロントエンド用に変換
      const settings = result.settings;
      const chartSettings = {
        id: settings.id,
        settingName: settings.setting_name,
        timePeriod: settings.time_period,
        timeframe: settings.timeframe,
        
        // 移動平均線設定
        showMA: settings.show_ma,
        maShortPeriod: settings.ma_short_period,
        maMediumPeriod: settings.ma_medium_period,
        maLongPeriod: settings.ma_long_period,
        
        // ボリンジャーバンド設定
        showBollinger: settings.show_bollinger,
        bollingerPeriod: settings.bollinger_period,
        bollingerSigma: parseFloat(settings.bollinger_sigma),
        
        // RSI設定
        showRSI: settings.show_rsi,
        rsiPeriod: settings.rsi_period,
        
        // MACD設定
        showMACD: settings.show_macd,
        macdFast: settings.macd_fast,
        macdSlow: settings.macd_slow,
        macdSignal: settings.macd_signal,
        
        // その他設定
        autoRotation: settings.auto_rotation,
        rotationInterval: settings.rotation_interval,
        
        isDefault: settings.is_default,
        createdAt: settings.created_at,
        updatedAt: settings.updated_at
      };

      res.json({
        success: true,
        settings: chartSettings
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('チャート設定取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
}

// チャート設定保存
export async function saveUserChartSettings(req, res) {
  try {
    const userId = req.user.userId;
    const { settingName = 'default', settings } = req.body;

    // 入力検証
    if (!settings) {
      return res.status(400).json({
        success: false,
        error: '設定データは必須です'
      });
    }

    // 設定値の検証
    const validationErrors = validateChartSettings(settings);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: '設定値が無効です',
        details: validationErrors
      });
    }

    const result = await ChartSettingsManager.saveUserSettings(userId, settingName, settings);

    if (result.success) {
      // ログ記録
      await UserManager.logActivity(userId, 'save_chart_settings', null, { 
        settingName,
        settings: {
          timePeriod: settings.timePeriod,
          timeframe: settings.timeframe,
          indicators: {
            ma: settings.showMA,
            bollinger: settings.showBollinger,
            rsi: settings.showRSI,
            macd: settings.showMACD
          }
        }
      });

      res.json({
        success: true,
        message: 'チャート設定を保存しました'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('チャート設定保存エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
}

// ユーザーの全チャート設定一覧取得
export async function getAllUserChartSettings(req, res) {
  try {
    const userId = req.user.userId;

    const query = `
      SELECT 
        id, setting_name, time_period, timeframe,
        show_ma, show_bollinger, show_rsi, show_macd,
        is_default, created_at, updated_at
      FROM user_chart_settings 
      WHERE user_id = $1
      ORDER BY is_default DESC, setting_name ASC
    `;

    const result = await pool.query(query, [userId]);

    const settingsList = result.rows.map(row => ({
      id: row.id,
      settingName: row.setting_name,
      timePeriod: row.time_period,
      timeframe: row.timeframe,
      indicators: {
        ma: row.show_ma,
        bollinger: row.show_bollinger,
        rsi: row.show_rsi,
        macd: row.show_macd
      },
      isDefault: row.is_default,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.json({
      success: true,
      settings: settingsList,
      count: settingsList.length
    });
  } catch (error) {
    console.error('チャート設定一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
}

// チャート設定削除
export async function deleteUserChartSettings(req, res) {
  try {
    const userId = req.user.userId;
    const { settingName } = req.params;

    // デフォルト設定は削除不可
    if (settingName === 'default') {
      return res.status(400).json({
        success: false,
        error: 'デフォルト設定は削除できません'
      });
    }

    const query = `
      DELETE FROM user_chart_settings 
      WHERE user_id = $1 AND setting_name = $2 AND is_default = false
      RETURNING id
    `;

    const result = await pool.query(query, [userId, settingName]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '設定が見つかりません'
      });
    }

    // ログ記録
    await UserManager.logActivity(userId, 'delete_chart_settings', null, { settingName });

    res.json({
      success: true,
      message: 'チャート設定を削除しました'
    });
  } catch (error) {
    console.error('チャート設定削除エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
}

// チャート設定複製
export async function duplicateUserChartSettings(req, res) {
  try {
    const userId = req.user.userId;
    const { sourceSettingName, newSettingName } = req.body;

    // 入力検証
    if (!sourceSettingName || !newSettingName) {
      return res.status(400).json({
        success: false,
        error: 'コピー元とコピー先の設定名は必須です'
      });
    }

    if (newSettingName === 'default') {
      return res.status(400).json({
        success: false,
        error: '設定名に"default"は使用できません'
      });
    }

    // 設定名の重複チェック
    const existsQuery = `
      SELECT id FROM user_chart_settings 
      WHERE user_id = $1 AND setting_name = $2
    `;
    const existsResult = await pool.query(existsQuery, [userId, newSettingName]);

    if (existsResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'この設定名は既に使用されています'
      });
    }

    // 元設定を取得
    const sourceResult = await ChartSettingsManager.getUserSettings(userId, sourceSettingName);
    if (!sourceResult.success) {
      return res.status(404).json({
        success: false,
        error: 'コピー元の設定が見つかりません'
      });
    }

    // 新しい設定として保存
    const sourceSettings = sourceResult.settings;
    const newSettings = {
      timePeriod: sourceSettings.time_period,
      timeframe: sourceSettings.timeframe,
      showMA: sourceSettings.show_ma,
      maShortPeriod: sourceSettings.ma_short_period,
      maMediumPeriod: sourceSettings.ma_medium_period,
      maLongPeriod: sourceSettings.ma_long_period,
      showBollinger: sourceSettings.show_bollinger,
      bollingerPeriod: sourceSettings.bollinger_period,
      bollingerSigma: parseFloat(sourceSettings.bollinger_sigma),
      showRSI: sourceSettings.show_rsi,
      rsiPeriod: sourceSettings.rsi_period,
      showMACD: sourceSettings.show_macd,
      macdFast: sourceSettings.macd_fast,
      macdSlow: sourceSettings.macd_slow,
      macdSignal: sourceSettings.macd_signal,
      autoRotation: sourceSettings.auto_rotation,
      rotationInterval: sourceSettings.rotation_interval
    };

    const saveResult = await ChartSettingsManager.saveUserSettings(userId, newSettingName, newSettings);

    if (saveResult.success) {
      // ログ記録
      await UserManager.logActivity(userId, 'duplicate_chart_settings', null, { 
        sourceSettingName,
        newSettingName 
      });

      res.status(201).json({
        success: true,
        message: 'チャート設定を複製しました'
      });
    } else {
      res.status(500).json({
        success: false,
        error: saveResult.error
      });
    }
  } catch (error) {
    console.error('チャート設定複製エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラーが発生しました'
    });
  }
}

// チャート設定の検証関数
function validateChartSettings(settings) {
  const errors = [];

  // 期間設定
  const validPeriods = ['6M', '1Y', '3Y', '5Y', '10Y'];
  if (!validPeriods.includes(settings.timePeriod)) {
    errors.push('無効な期間設定です');
  }

  // 時間軸設定
  const validTimeframes = ['daily', 'weekly', 'monthly'];
  if (!validTimeframes.includes(settings.timeframe)) {
    errors.push('無効な時間軸設定です');
  }

  // 移動平均線期間
  if (settings.showMA) {
    if (!Number.isInteger(settings.maShortPeriod) || settings.maShortPeriod < 1 || settings.maShortPeriod > 200) {
      errors.push('短期移動平均線の期間は1-200の整数である必要があります');
    }
    if (!Number.isInteger(settings.maMediumPeriod) || settings.maMediumPeriod < 1 || settings.maMediumPeriod > 200) {
      errors.push('中期移動平均線の期間は1-200の整数である必要があります');
    }
    if (!Number.isInteger(settings.maLongPeriod) || settings.maLongPeriod < 1 || settings.maLongPeriod > 2000) {
      errors.push('長期移動平均線の期間は1-2000の整数である必要があります');
    }
  }

  // ボリンジャーバンド設定
  if (settings.showBollinger) {
    if (!Number.isInteger(settings.bollingerPeriod) || settings.bollingerPeriod < 5 || settings.bollingerPeriod > 100) {
      errors.push('ボリンジャーバンドの期間は5-100の整数である必要があります');
    }
    if (typeof settings.bollingerSigma !== 'number' || settings.bollingerSigma < 0.5 || settings.bollingerSigma > 5.0) {
      errors.push('ボリンジャーバンドのσは0.5-5.0の数値である必要があります');
    }
  }

  // RSI設定
  if (settings.showRSI) {
    if (!Number.isInteger(settings.rsiPeriod) || settings.rsiPeriod < 5 || settings.rsiPeriod > 50) {
      errors.push('RSIの期間は5-50の整数である必要があります');
    }
  }

  // MACD設定
  if (settings.showMACD) {
    if (!Number.isInteger(settings.macdFast) || settings.macdFast < 5 || settings.macdFast > 50) {
      errors.push('MACD短期の期間は5-50の整数である必要があります');
    }
    if (!Number.isInteger(settings.macdSlow) || settings.macdSlow < 10 || settings.macdSlow > 100) {
      errors.push('MACD長期の期間は10-100の整数である必要があります');
    }
    if (!Number.isInteger(settings.macdSignal) || settings.macdSignal < 5 || settings.macdSignal > 30) {
      errors.push('MACDシグナルの期間は5-30の整数である必要があります');
    }
    if (settings.macdFast >= settings.macdSlow) {
      errors.push('MACD短期は長期より小さい値である必要があります');
    }
  }

  // 自動巡回設定
  if (settings.autoRotation) {
    if (!Number.isInteger(settings.rotationInterval) || settings.rotationInterval < 1 || settings.rotationInterval > 60) {
      errors.push('巡回間隔は1-60秒の整数である必要があります');
    }
  }

  return errors;
}

// ルーター設定
export function setupChartSettingsRoutes(app) {
  // 全て認証が必要
  app.get('/api/chart-settings', authenticateToken, getUserChartSettings);
  app.post('/api/chart-settings', authenticateToken, saveUserChartSettings);
  app.get('/api/chart-settings/all', authenticateToken, getAllUserChartSettings);
  app.delete('/api/chart-settings/:settingName', authenticateToken, deleteUserChartSettings);
  app.post('/api/chart-settings/duplicate', authenticateToken, duplicateUserChartSettings);
}
