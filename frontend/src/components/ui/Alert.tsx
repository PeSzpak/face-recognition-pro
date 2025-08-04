import React from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import { AlertProps } from '@/types';

const Alert: React.FC<AlertProps> = ({ type, message, onClose }) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5" />;
      case 'error':
        return <XCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'info':
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getClasses = () => {
    const base = "p-4 rounded-lg border flex items-start space-x-3";
    
    switch (type) {
      case 'success':
        return `${base} bg-green-50 border-green-200 text-green-800`;
      case 'error':
        return `${base} bg-red-50 border-red-200 text-red-800`;
      case 'warning':
        return `${base} bg-yellow-50 border-yellow-200 text-yellow-800`;
      case 'info':
      default:
        return `${base} bg-blue-50 border-blue-200 text-blue-800`;
    }
  };

  return (
    <div className={getClasses()}>
      <div className="flex-shrink-0">
        {getIcon()}
      </div>
      <div className="flex-1">
        <p className="font-medium">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 ml-2 hover:opacity-70 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default Alert;