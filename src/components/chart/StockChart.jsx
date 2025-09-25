import React from 'react'

const StockChart = ({ selectedStock, allStocks, favorites, chartSettings, onSelectStock, onToggleFavorite, onSaveSettings, searchStocks }) => {
  const stock = allStocks.find(s => s.code === selectedStock)
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">株価チャート</h1>
        {stock && (
          <div>
            <h2 className="text-xl font-semibold">{stock.name} ({stock.code})</h2>
            <p className="text-gray-600">{stock.market}</p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-center text-gray-600">
                チャートコンポーネントは実装中です
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StockChart
