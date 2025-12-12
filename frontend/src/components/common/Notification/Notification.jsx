import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export function Notification({ type = 'info', message, onClose, show }) {
  // Auto-close after 5 seconds
  useEffect(() => {
    if (show && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  const icons = {
    success: <CheckCircle className="w-6 h-6" />,
    error: <XCircle className="w-6 h-6" />,
    warning: <AlertCircle className="w-6 h-6" />,
    info: <Info className="w-6 h-6" />,
  };

  const styles = {
    success: {
      bg: 'bg-gradient-to-r from-green-50 to-emerald-50',
      text: 'text-green-800',
      border: 'border-green-300',
      icon: 'text-green-600',
      progress: 'bg-green-500',
    },
    error: {
      bg: 'bg-gradient-to-r from-red-50 to-rose-50',
      text: 'text-red-800',
      border: 'border-red-300',
      icon: 'text-red-600',
      progress: 'bg-red-500',
    },
    warning: {
      bg: 'bg-gradient-to-r from-yellow-50 to-amber-50',
      text: 'text-yellow-800',
      border: 'border-yellow-300',
      icon: 'text-yellow-600',
      progress: 'bg-yellow-500',
    },
    info: {
      bg: 'bg-gradient-to-r from-blue-50 to-indigo-50',
      text: 'text-blue-800',
      border: 'border-blue-300',
      icon: 'text-blue-600',
      progress: 'bg-blue-500',
    },
  };

  const currentStyle = styles[type];

  return (
    <div className="fixed top-6 right-6 z-[60] animate-slide-in-right">
      <div className={`${currentStyle.bg} ${currentStyle.text} border-2 ${currentStyle.border} rounded-xl shadow-2xl min-w-[320px] max-w-[500px] overflow-hidden`}>
        {/* Main Content */}
        <div className="flex items-start gap-3 p-4">
          {/* Icon */}
          <div className={`flex-shrink-0 ${currentStyle.icon}`}>
            {icons[type]}
          </div>

          {/* Message */}
          <p className="flex-1 text-sm sm:text-base font-semibold leading-relaxed">
            {message}
          </p>

          {/* Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="flex-shrink-0 hover:opacity-70 transition-opacity p-1 rounded-lg hover:bg-black/5"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-black/10">
          <div
            className={`h-full ${currentStyle.progress} animate-progress-bar`}
            style={{ animationDuration: '5s' }}
          />
        </div>
      </div>
    </div>
  );
}