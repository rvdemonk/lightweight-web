import { useEffect, useRef } from 'react';
import { createLockup } from '@lockup';

interface LockupProps {
  width?: number | string;
  glow?: boolean;
}

export function Lockup({ width = '100%', glow = true }: LockupProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;

    const renderW = 1024;
    const renderH = 500;

    createLockup(el, {
      variant: 'full',
      width: renderW,
      height: renderH,
      glow,
    }).then(({ svg, layout }) => {
      if (cancelled) {
        svg.remove();
        return;
      }
      const pad = glow ? 12 : 4;
      const vbX = layout.ox - pad;
      const vbY = layout.oy - pad;
      const vbW = layout.lockupWidth + pad * 2;
      const vbH = layout.wmInk.height + pad * 2;
      svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.style.width = typeof width === 'number' ? `${width}px` : width;
      svg.style.height = 'auto';
      svg.style.display = 'block';
    });

    return () => {
      cancelled = true;
      el.innerHTML = '';
    };
  }, [width, glow]);

  return <div ref={ref} style={{ display: 'flex', justifyContent: 'center' }} />;
}
