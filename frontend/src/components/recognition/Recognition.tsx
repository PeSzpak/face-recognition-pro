import React from 'react'

const Recognition: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Face Recognition</h1>
        <p className="text-gray-600">Upload images or use webcam for face recognition</p>
      </div>
      
      <div className="card">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📸</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Face Recognition
          </h3>
          <p className="text-gray-600">
            This section will allow you to perform face recognition using uploaded images or webcam.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Recognition