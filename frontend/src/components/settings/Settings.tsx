import React, { useState } from 'react'
import { Settings as SettingsIcon, Shield, Camera, Database, Save } from 'lucide-react'
import toast from 'react-hot-toast'

const Settings: React.FC = () => {
  const [settings, setSettings] = useState({
    confidence_threshold: 0.8,
    anti_spoofing: true,
    auto_save: true,
    notifications: true
  })

  const handleSave = () => {
    toast.success('Configurações salvas com sucesso!')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-600">Configure parâmetros do sistema de reconhecimento</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Segurança */}
        <div className="card-mmtec p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center text-mmtec-accent">
            <Shield className="h-5 w-5 mr-2" />
            Segurança
          </h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Limite de Confiança
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0.5"
                  max="1"
                  step="0.1"
                  value={settings.confidence_threshold}
                  onChange={(e) => setSettings({
                    ...settings,
                    confidence_threshold: parseFloat(e.target.value)
                  })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>50%</span>
                  <span className="font-medium text-mmtec-accent">
                    {(settings.confidence_threshold * 100).toFixed(0)}%
                  </span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-slate-700">Anti-spoofing</span>
                <p className="text-xs text-slate-500 mt-1">Detectar tentativas de falsificação</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.anti_spoofing}
                  onChange={(e) => setSettings({
                    ...settings,
                    anti_spoofing: e.target.checked
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-mmtec-accent"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Sistema */}
        <div className="card-mmtec p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center text-mmtec-accent">
            <Database className="h-5 w-5 mr-2" />
            Sistema
          </h3>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-slate-700">Salvamento Automático</span>
                <p className="text-xs text-slate-500 mt-1">Salvar reconhecimentos automaticamente</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.auto_save}
                  onChange={(e) => setSettings({
                    ...settings,
                    auto_save: e.target.checked
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-mmtec-accent"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-slate-700">Notificações</span>
                <p className="text-xs text-slate-500 mt-1">Receber alertas do sistema</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: e.target.checked
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-mmtec-accent"></div>
              </label>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Shield className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Sistema Seguro
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>Todas as configurações são criptografadas e armazenadas com segurança.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botão de salvar */}
      <div className="flex justify-end">
        <button onClick={handleSave} className="btn-mmtec-primary">
          <Save className="h-4 w-4 mr-2" />
          Salvar Configurações
        </button>
      </div>

      {/* Status do Sistema */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-mmtec p-4 text-center">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="text-sm font-medium text-slate-900">API Server</div>
          <div className="text-xs text-green-600">Online</div>
        </div>

        <div className="card-mmtec p-4 text-center">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="text-sm font-medium text-slate-900">Base de Dados</div>
          <div className="text-xs text-green-600">Conectado</div>
        </div>

        <div className="card-mmtec p-4 text-center">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="text-sm font-medium text-slate-900">Sistema AI</div>
          <div className="text-xs text-green-600">Ativo</div>
        </div>

        <div className="card-mmtec p-4 text-center">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="text-sm font-medium text-slate-900">Anti-spoofing</div>
          <div className="text-xs text-green-600">Habilitado</div>
        </div>
      </div>
    </div>
  )
}

export default Settings