declare module '@lockup' {
  interface InkMetrics {
    ascent: number;
    descent: number;
    height: number;
    advance: number;
  }

  interface LockupOptions {
    variant?: 'full' | 'short';
    width?: number;
    height?: number;
    glow?: boolean;
    tagline?: string | null;
    color?: string;
    strokeWidth?: number;
  }

  interface LockupResult {
    svg: SVGSVGElement;
    layout: {
      ox: number;
      oy: number;
      wmX: number;
      wmY: number;
      wmInk: InkMetrics;
      markSize: number;
      wmWidth: number;
      lockupWidth: number;
      tagX: number;
      tagY: number;
      tagWidth: number;
    };
    markGroup: SVGGElement;
  }

  export function measureInk(
    text: string,
    opts?: { fontSize?: number; fontWeight?: number; fontFamily?: string; letterSpacing?: string | null }
  ): InkMetrics;

  export function createLockup(container: HTMLElement, opts?: LockupOptions): Promise<LockupResult>;

  export const BRAND: Readonly<{
    fontFamily: string;
    variants: Record<string, { text: string; fontSize: number; weight: number; ls: string | null }>;
    taglineStyle: { fontSize: number; weight: number; ls: string };
    color: string;
    taglineColor: string;
    gap: number;
    taglineGap: number;
    markViewbox: number;
    markStroke: number;
  }>;
}
