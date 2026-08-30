import React, { useEffect } from 'react';
import { CheckCircle2, Trash2, AlertTriangle, Info } from 'lucide-react';
import '../styles/FeedbackModal.css';

export interface FeedbackOptions {
  title: string;
  message: string;
  type?: 'success' | 'delete' | 'info' | 'warning';
  confirmText?: string;
  onConfirm?: () => void;
}

interface FeedbackModalProps {
  isOpen: boolean;
  options: FeedbackOptions | null;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, options, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && (e.key === 'Enter' || e.key === 'Escape')) {
        handleOk();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, options]);

  if (!isOpen || !options) return null;

  const handleOk = () => {
    if (options.onConfirm) options.onConfirm();
    onClose();
  };

  const renderIcon = () => {
    switch (options.type) {
      case 'delete':
        return <Trash2 className="w-8 h-8 text-rose-500" />;
      case 'warning':
        return <AlertTriangle className="w-8 h-8 text-amber-500" />;
      case 'info':
        return <Info className="w-8 h-8 text-blue-500" />;
      case 'success':
      default:
        return <CheckCircle2 className="w-8 h-8 text-emerald-500" />;
    }
  };

  return (
    <div className="feedback-overlay" onClick={handleOk}>
      <div className={`feedback-card feedback-${options.type || 'success'}`} onClick={(e) => e.stopPropagation()}>
        <div className={`feedback-icon-wrapper ${options.type || 'success'}`}>
          {renderIcon()}
        </div>
        <h3 className="feedback-title">{options.title}</h3>
        <p className="feedback-message">{options.message}</p>
        <button
          type="button"
          className="feedback-btn-ok"
          onClick={handleOk}
          autoFocus
        >
          {options.confirmText || 'Compris'}
        </button>
      </div>
    </div>
  );
};
