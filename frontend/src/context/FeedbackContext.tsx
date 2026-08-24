import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FeedbackModal, FeedbackOptions } from '../components/FeedbackModal';

interface FeedbackContextType {
  showFeedback: (options: FeedbackOptions) => void;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export const FeedbackProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<FeedbackOptions | null>(null);

  const showFeedback = (opts: FeedbackOptions) => {
    setOptions(opts);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setOptions(null);
  };

  return (
    <FeedbackContext.Provider value={{ showFeedback }}>
      {children}
      <FeedbackModal isOpen={isOpen} options={options} onClose={handleClose} />
    </FeedbackContext.Provider>
  );
};

export const useFeedback = (): FeedbackContextType => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};
