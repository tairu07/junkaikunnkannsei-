import React from 'react'

const AlertManager = ({ alerts, allStocks, onAlertUpdate }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">価格アラート管理</h1>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-center text-gray-600">
            価格アラート機能は実装中です
          </p>
        </div>
      </div>
    </div>
  )
}

export default AlertManager
