import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Button } from './button';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  const duration = toast.duration || 5000;

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const decrement = 100 / (duration / 100);
        return Math.max(0, prev - decrement);
      });
    }, 100);

    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(dismissTimer);
    };
  }, [duration]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-white" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-white" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-white" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-white" />;
    }
  };

  const getTypeClasses = () => {
    switch (toast.type) {
      case 'success':
        return 'toast-success';
      case 'error':
        return 'toast-error';
      case 'warning':
        return 'toast-warning';
      case 'info':
      default:
        return 'toast-info';
    }
  };

  return (
    <div className={`
      relative overflow-hidden rounded-lg shadow-lg border-2 p-4 mb-3 min-w-[350px] max-w-[500px] text-white
      ${getTypeClasses()}
      ${isExiting ? 'toast-exit' : 'toast-enter'}
      gpu-accelerated
    `}>
      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-white/20 w-full">
        <div 
          className="h-full bg-white/60 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 animate-in bounce-in duration-300">
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white mb-1 animate-in slide-in-from-left duration-300 delay-100">
            {toast.title}
          </h4>
          {toast.message && (
            <p className="text-sm text-white/90 leading-relaxed animate-in slide-in-from-left duration-300 delay-200">
              {toast.message}
            </p>
          )}
          
          {/* Action Button */}
          {toast.action && (
            <div className="mt-3 animate-in slide-in-from-bottom duration-300 delay-300">
              <Button
                variant="outline"
                size="sm"
                onClick={toast.action.onClick}
                className="bg-white/20 border-white/30 text-white hover:bg-white/30 btn-hover"
              >
                {toast.action.label}
              </Button>
            </div>
          )}
        </div>

        {/* Close Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="flex-shrink-0 h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/20 btn-scale animate-in scale-in duration-300 delay-400"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end animate-in fade-in duration-300">
      {toasts.map((toast, index) => (
        <div 
          key={toast.id} 
          className="animate-in slide-in-from-right duration-300"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <ToastItem toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
};

// Toast Hook
let toastId = 0;

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = `toast-${++toastId}`;
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);
    
    return id;
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const toast = {
    success: (title: string, message?: string, options?: Partial<Toast>) => 
      addToast({ type: 'success', title, message, ...options }),
    
    error: (title: string, message?: string, options?: Partial<Toast>) => 
      addToast({ type: 'error', title, message, ...options }),
    
    info: (title: string, message?: string, options?: Partial<Toast>) => 
      addToast({ type: 'info', title, message, ...options }),
    
    warning: (title: string, message?: string, options?: Partial<Toast>) => 
      addToast({ type: 'warning', title, message, ...options }),
  };

  return {
    toasts,
    toast,
    dismissToast,
    ToastContainer: () => <ToastContainer toasts={toasts} onDismiss={dismissToast} />
  };
};
