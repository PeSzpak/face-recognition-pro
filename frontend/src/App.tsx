import React from 'react'

function App() {
  console.log('App renderizando...')
  
  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center">
          <div className="text-6xl mb-4"></div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Face Recognition Pro
          </h1>
          <p className="text-gray-600 mb-4">
            Sistema funcionando perfeitamente!
          </p>
          <div className="bg-green-100 border border-green-200 rounded-lg p-3">
            <p className="text-green-800 font-medium"> Frontend Online</p>
          </div>
          <div className="bg-blue-100 border border-blue-200 rounded-lg p-3 mt-3">
            <p className="text-blue-800 font-medium"> Tailwind CSS Ativo</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App