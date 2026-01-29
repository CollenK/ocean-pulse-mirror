'use client';

import { ReactNode, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
type ModalVariant = 'default' | 'navy' | 'glass';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  size?: ModalSize;
  variant?: ModalVariant;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  footer?: ReactNode;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-[calc(100%-2rem)] h-[calc(100%-2rem)]',
};

const variantClasses: Record<ModalVariant, { container: string; header: string; title: string }> = {
  default: {
    container: 'bg-white border border-balean-gray-100',
    header: 'border-b border-balean-gray-100',
    title: 'text-balean-navy',
  },
  navy: {
    container: 'bg-balean-navy border border-balean-navy-light/20',
    header: 'border-b border-white/10',
    title: 'text-white',
  },
  glass: {
    container: 'bg-white/90 backdrop-blur-xl border border-white/20',
    header: 'border-b border-balean-gray-100/50',
    title: 'text-balean-navy',
  },
};

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  variant = 'default',
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  footer,
}: ModalProps) {
  // Close on escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (closeOnEscape && e.key === 'Escape') {
      onClose();
    }
  }, [onClose, closeOnEscape]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  const handleBackdropClick = () => {
    if (closeOnBackdrop) {
      onClose();
    }
  };

  const styles = variantClasses[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-balean-navy/60 backdrop-blur-sm z-[60]"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className={`
              fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
              w-[calc(100%-2rem)] ${sizeClasses[size]}
              rounded-2xl shadow-2xl z-[60]
              max-h-[85vh] overflow-hidden flex flex-col
              ${styles.container}
            `}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className={`flex items-start justify-between px-6 py-4 ${styles.header}`}>
                <div className="flex-1 pr-4">
                  {title && (
                    <h2
                      id="modal-title"
                      className={`text-xl font-semibold ${styles.title}`}
                    >
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className={`mt-1 text-sm ${variant === 'navy' ? 'text-white/70' : 'text-balean-gray-500'}`}>
                      {subtitle}
                    </p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className={`
                      w-9 h-9 rounded-xl flex items-center justify-center
                      transition-all duration-200
                      ${variant === 'navy'
                        ? 'bg-white/10 hover:bg-white/20 text-white'
                        : 'bg-balean-gray-100 hover:bg-balean-gray-200 text-balean-gray-500 hover:text-balean-navy'
                      }
                    `}
                    aria-label="Close modal"
                  >
                    <i className="fi fi-rr-cross-small text-lg" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 px-6 py-4 overflow-y-auto">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className={`px-6 py-4 ${styles.header}`}>
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Confirmation Modal - specialized for confirm/cancel actions
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      showCloseButton={false}
      footer={
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="
              px-4 py-2.5 rounded-xl text-sm font-medium
              bg-balean-gray-100 text-balean-navy
              hover:bg-balean-gray-200
              transition-colors disabled:opacity-50
            "
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`
              px-4 py-2.5 rounded-xl text-sm font-medium
              transition-colors disabled:opacity-50
              flex items-center gap-2
              ${variant === 'danger'
                ? 'bg-critical text-white hover:bg-critical/90'
                : 'bg-balean-cyan text-white hover:bg-balean-cyan-dark'
              }
            `}
          >
            {isLoading && (
              <i className="fi fi-rr-spinner animate-spin" />
            )}
            {confirmText}
          </button>
        </div>
      }
    >
      <p className="text-balean-gray-600">{message}</p>
    </Modal>
  );
}
