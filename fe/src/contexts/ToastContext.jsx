// src/contexts/ToastContext.jsx
import { Toast, ToastToggle } from 'flowbite-react';
import { createContext, useContext, useState } from 'react';
import { HiCheck, HiExclamation, HiX } from 'react-icons/hi';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = (severity, message, duration = 5000) => {
    const id = Date.now();
    const newToast = { id, severity, message };

    setToasts(prev => [...prev, newToast]);

    // Automaticky odstraň toast po určité době
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const getToastConfig = (severity) => {
    switch (severity) {
      case 'success':
        return {
          icon: HiCheck,
          bgColor: 'bg-green-100 dark:bg-green-800',
          textColor: 'text-green-500 dark:text-green-200',
        };
      case 'error':
        return {
          icon: HiX,
          bgColor: 'bg-red-100 dark:bg-red-800',
          textColor: 'text-red-500 dark:text-red-200',
        };
      case 'warning':
        return {
          icon: HiExclamation,
          bgColor: 'bg-orange-100 dark:bg-orange-700',
          textColor: 'text-orange-500 dark:text-orange-200',
        };
      default:
        return {
          icon: HiExclamation,
          bgColor: 'bg-blue-100 dark:bg-blue-800',
          textColor: 'text-blue-500 dark:text-blue-200',
        };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container - vpravo nahoře */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => {
          const config = getToastConfig(toast.severity);
          const IconComponent = config.icon;

          return (
            <Toast key={toast.id}>
              <div className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.bgColor} ${config.textColor}`}>
                <IconComponent className="h-5 w-5" />
              </div>
              <div className="ml-3 text-sm font-normal">{toast.message}</div>
              <ToastToggle onDismiss={() => removeToast(toast.id)} />
            </Toast>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
