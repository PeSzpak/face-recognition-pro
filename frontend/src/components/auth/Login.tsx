import React, { useState } from 'react'
import { Shield, User, Lock, Eye, EyeOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { authService } from '../../services/auth'
import toast from 'react-hot-toast'

const Login: React.FC = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Login usando API real
      const response = await authService.login({
        username: credentials.username,
        password: credentials.password
      })
      
      // Buscar dados do usuário após login
      const currentUser = await authService.getCurrentUser()
      
      const user = {
        id: currentUser.id,
        name: currentUser.full_name || currentUser.username,
        username: currentUser.username,
        role: 'admin',
        email: currentUser.email
      }
      
      login(user, response.access_token)
      toast.success('Login realizado com sucesso!')
      navigate('/dashboard')
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.response?.data?.detail || 'Credenciais inválidas!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-layout">
      {/* Brand Panel */}
      <div className="hidden lg:flex lg:flex-1 auth-brand">
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-8">
            <Shield className="h-10 w-10 text-mmtec-primary" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">MMTec</h1>
          <h2 className="text-xl font-medium text-blue-100 mb-6">
            Face Recognition Pro
          </h2>
          <p className="text-blue-200 max-w-md leading-relaxed">
            Sistema profissional de reconhecimento facial com tecnologia avançada 
            e recursos de anti-spoofing.
          </p>
        </div>
      </div>

      {/* Login Panel */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="lg:hidden w-16 h-16 bg-mmtec-gradient rounded-xl mx-auto mb-4 flex items-center justify-center">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900">Entrar</h2>
            <p className="mt-2 text-slate-600">
              Acesse o sistema MMTec Face Recognition
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Usuário
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({
                    ...credentials,
                    username: e.target.value
                  })}
                  className="input-mmtec pl-10"
                  placeholder="Digite seu usuário"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={credentials.password}
                  onChange={(e) => setCredentials({
                    ...credentials,
                    password: e.target.value
                  })}
                  className="input-mmtec pl-10 pr-10"
                  placeholder="Digite sua senha"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-mmtec-primary"
            >
              {loading ? (
                <>
                  <div className="loading-mmtec mr-2" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => navigate('/face-auth')}
              className="btn-mmtec-outline"
            >
              <Shield className="h-4 w-4 mr-2" />
              Usar Face ID
            </button>
          </div>

          <div className="mt-8 text-center text-sm text-slate-500">
            <p>Credenciais de acesso:</p>
            <p><strong>Email:</strong> admin@facerecognition.pro | <strong>Senha:</strong> admin123</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login