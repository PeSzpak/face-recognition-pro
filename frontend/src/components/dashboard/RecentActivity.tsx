import React from 'react'

const RecentActivity: React.FC = () => {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-4">
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <div>
            <p className="text-sm font-medium">John Doe recognized</p>
            <p className="text-xs text-gray-500">2 minutes ago - 95% confidence</p>
          </div>
        </div>
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <div>
            <p className="text-sm font-medium">New person added</p>
            <p className="text-xs text-gray-500">5 minutes ago - Jane Smith</p>
          </div>
        </div>
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
          <div>
            <p className="text-sm font-medium">Unknown face detected</p>
            <p className="text-xs text-gray-500">10 minutes ago</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RecentActivity