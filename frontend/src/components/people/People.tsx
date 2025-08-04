import React from 'react'

const People: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">People Management</h1>
        <p className="text-gray-600">Manage registered people in your system</p>
      </div>
      
      <div className="card">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            People Management
          </h3>
          <p className="text-gray-600">
            This section will allow you to add, edit, and manage people in your face recognition system.
          </p>
        </div>
      </div>
    </div>
  )
}

export default People