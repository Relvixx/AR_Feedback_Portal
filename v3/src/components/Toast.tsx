interface ToastProps {
  message: string | null | undefined;
  type: 'success' | 'error' | null | undefined;
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  if (!message || !type) return null;

  return (
    <div
      className={`toast show ${type === 'error' ? 'toast-error' : ''}`}
      role="alert"
      aria-live="polite"
    >
      {message}
      <button className="toast-close" onClick={onClose} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}