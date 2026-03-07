import { type ReactNode, type CSSProperties } from 'react';

interface Props {
  loading: boolean;
  fallbackHeight: number;
  children?: ReactNode;
  style?: CSSProperties;
}

export function LoadingCard({ loading, fallbackHeight, children, style }: Props) {
  return (
    <div
      className="card"
      style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: loading ? fallbackHeight : undefined,
        ...style,
      }}
    >
      <div style={{ visibility: loading ? 'hidden' : 'visible' }}>
        {children}
      </div>
      {loading && <div className="skeleton-shimmer" />}
    </div>
  );
}
