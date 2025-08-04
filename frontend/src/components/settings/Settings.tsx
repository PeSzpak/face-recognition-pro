import React, { useState } from 'react';
import { Settings as SettingsIcon, User, Shield, Database, Bell } from 'lucide-react';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'database', name: 'Database', icon: Database },
    { id: 'notifications', name: 'Notifications', icon: Bell },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">
          Manage your account, security, and system preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'profile' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Settings</h3>
            <p className="text-gray-600">Profile settings will be implemented here.</p>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h3>
            <p className="text-gray-600">Security settings will be implemented here.</p>
          </div>
        )}

        {activeTab === 'database' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Settings</h3>
            <p className="text-gray-600">Database configuration will be implemented here.</p>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="card">
            <h3 className="text-lg font-semibient text-gray-900 mb-4">Notification Preferences</h3>
            <p className="text-gray-600">Notification settings will be implemented here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;