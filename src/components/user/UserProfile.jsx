import React from 'react'

const UserProfile = ({ user, userStats, onProfileUpdate }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">ユーザープロフィール</h1>
        {user && (
          <div>
            <h2 className="text-xl font-semibold">{user.displayName}</h2>
            <p className="text-gray-600">{user.email}</p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-center text-gray-600">
                プロフィール編集機能は実装中です
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default UserProfile
