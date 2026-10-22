'use client';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingState({ message = 'Loading…', size = 'md' }: LoadingStateProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="loading-state" role="status" aria-live="polite">
      <div 
        className={`loading-spinner ${sizeClasses[size]}`}
        aria-label={message}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3" />
          <path 
            d="M12 2a10 10 0 0 1 10 10" 
            stroke="currentColor" 
            strokeLinecap="round" 
            strokeWidth="3"
          >
            <animateTransform 
              attributeName="transform" 
              type="rotate" 
              from="0 12 12" 
              to="360 12 12" 
              dur="1s" 
              repeatCount="indefinite" 
            />
          </path>
        </svg>
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
}

export function InlineLoading({ message = 'Loading…' }: { message?: string }) {
  return (
    <span className="inline-loading" aria-live="polite">
      <span className="inline-spinner" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeLinecap="round" strokeWidth="3">
            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
          </path>
        </svg>
      </span>
      <span>{message}</span>
    </span>
  );
}

export function Skeleton({ className = '', width, height }: { className?: string; width?: string; height?: string }) {
  return (
    <div 
      className={`skeleton ${className}`} 
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}