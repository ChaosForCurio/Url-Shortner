import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { Toast as ToastType } from '../types';

interface ToastContainerProps {
  toasts: ToastType[];
  onRemove: (id: string) => void;
}

const iconMap = {
  success: <CheckCircle2 size={18} />,
  error: <AlertCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
};

const styleMap = {
  success: 'bg-emerald-50 border-emerald-300 text-emerald-800',
  error: 'bg-red-50 border-red-300 text-red-800',
  warning: 'bg-amber-50 border-amber-300 text-amber-800',
  info: 'bg-blue-50 border-blue-300 text-blue-800',
};

const iconColorMap = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
};

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg animate-[slideIn_0.3s_ease-out] ${styleMap[toast.type]}`}
        >
          <span className={`shrink-0 mt-0.5 ${iconColorMap[toast.type]}`}>
            {iconMap[toast.type]}
          </span>
          <p className="flex-1 text-sm font-medium">{toast.message}</p>
          <button
            onClick={() => onRemove(toast.id)}
            className="shrink-0 p-0.5 rounded-md hover:bg-black/5 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
