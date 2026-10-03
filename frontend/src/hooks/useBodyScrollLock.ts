import { useEffect } from 'react';

let lockCount = 0;

/**
 * Hook to lock body and layout scroll when a modal or dialog is open.
 * Supports nested / multiple modals gracefully using a lock counter.
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    lockCount++;
    if (lockCount === 1) {
      document.body.classList.add('modal-open');
      document.documentElement.classList.add('modal-open');
    }

    const preventTouch = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target?.closest('.modal, .quick-tx-modal, .feedback-card, [role="dialog"], .scrollable-content')) {
        e.preventDefault();
      }
    };

    window.addEventListener('touchmove', preventTouch, { passive: false });

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.classList.remove('modal-open');
        document.documentElement.classList.remove('modal-open');
      }
      window.removeEventListener('touchmove', preventTouch);
    };
  }, [isLocked]);
}
