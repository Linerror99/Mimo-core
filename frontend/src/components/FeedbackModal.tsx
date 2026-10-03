import React, { useEffect } from 'react';
import { CheckCircle2, Trash2, AlertTriangle, Info } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import '../styles/FeedbackModal.css';

export interface FeedbackOptions {
  title: string;
  message: string;
  type?: 'success' | 'delete' | 'info' | 'warning';
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface FeedbackModalProps {
  isOpen: boolean;
  options: FeedbackOptions | null;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, options, onClose }) => {
  useBodyScrollLock(isOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        handleCancel();
      } else if (e.key === 'Enter') {
        handleOk();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, options]);

  if (!isOpen || !options) return null;

  const handleCancel = () => {
    if (options.onCancel) options.onCancel();
    onClose();
  };

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
    <div className="feedback-overlay" onClick={options.showCancel ? handleCancel : handleOk}>
      <div className={`feedback-card feedback-${options.type || 'success'}`} onClick={(e) => e.stopPropagation()}>
        <div className={`feedback-icon-wrapper ${options.type || 'success'}`}>
          {renderIcon()}
        </div>
        <h3 className="feedback-title">{options.title}</h3>
        <p className="feedback-message">{options.message}</p>

        {options.showCancel ? (
          <div className="feedback-buttons-row">
            <button
              type="button"
              className="feedback-btn-cancel"
              onClick={handleCancel}
            >
              {options.cancelText || 'Annuler'}
            </button>
            <button
              type="button"
              className={`feedback-btn-ok feedback-btn-${options.type || 'success'}`}
              onClick={handleOk}
              autoFocus
            >
              {options.confirmText || 'Confirmer'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={`feedback-btn-ok feedback-btn-${options.type || 'success'}`}
            onClick={handleOk}
            autoFocus
          >
            {options.confirmText || 'Compris'}
          </button>
        )}
      </div>
    </div>
  );
};
