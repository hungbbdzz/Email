import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  isDestructive = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible && !isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`relative bg-white dark:bg-[#1E1F20] w-full max-w-md rounded-[28px] shadow-2xl transform transition-all duration-200 scale-100 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'} overflow-hidden border border-transparent dark:border-gray-700`}>
        
        <div className="p-6 pb-4">
          <h2 className="text-xl font-normal text-slate-900 dark:text-[#E3E3E3] mb-2">
            {title}
          </h2>
          <p className="text-sm text-slate-600 dark:text-[#C4C7C5] leading-relaxed">
            {message}
          </p>
        </div>

        <div className="p-6 pt-2 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full text-sm font-medium text-blue-600 dark:text-[#A8C7FA] hover:bg-blue-50 dark:hover:bg-[#004A77]/30 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-6 py-2.5 rounded-full text-sm font-medium text-white transition-colors shadow-none hover:shadow-md ${
              isDestructive 
                ? 'bg-red-600 hover:bg-red-700 dark:bg-[#93000A] dark:hover:bg-[#FFB4AB] dark:text-[#690005]' 
                : 'bg-blue-600 hover:bg-blue-700 dark:bg-[#A8C7FA] dark:hover:bg-[#D3E3FD] dark:text-[#062E6F]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};