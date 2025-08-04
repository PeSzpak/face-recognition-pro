import React from 'react'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="card max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 text-center">
          Face Recognition Pro
        </h1>
        <p className="text-gray-600 mb-6 text-center">
          Sistema de Reconhecimento Facial
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-center p-4 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-green-600 font-medium">✅ Frontend funcionando!</span>
          </div>
          
          <div className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-blue-600 font-medium">🎯 Vite + React + TypeScript</span>
          </div>
          
          <div className="flex items-center justify-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <span className="text-purple-600 font-medium">🎨 Tailwind CSS</span>
          </div>
        </div>
        
        <button className="btn-primary w-full mt-6">
          Teste do Sistema
        </button>
      </div>
    </div>
  )
}

export default App