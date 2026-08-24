import React, { useEffect } from 'react';
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

  const getIcon = () => {
    switch (options.type) {
      case 'delete':
        return '🗑️';
      case 'warning':
        return '⚠️';
      case 'info':
        return '💡';
      case 'success':
      default:
        return '✅';
    }
  };

  return (
    <div className="feedback-overlay" onClick={handleOk}>
      <div className={`feedback-card feedback-${options.type || 'success'}`} onClick={(e) => e.stopPropagation()}>
        <div className={`feedback-icon-wrapper ${options.type || 'success'}`}>
          <span className="feedback-icon">{getIcon()}</span>
        </div>
        <h3 className="feedback-title">{options.title}</h3>
        <p className="feedback-message">{options.message}</p>
        <button
          type="button"
          className="feedback-btn-ok"
          onClick={handleOk}
          autoFocus
        >
          {options.confirmText || 'OK, compris ! 👍'}
        </button>
      </div>
    </div>
  );
};
