// lockup.js — Lightweight brand lockup renderer
// Pixel-perfect SVG mark + wordmark alignment via canvas ink measurement.
// Zero dependencies. Works in browser and headless pipelines.

const NS = 'http://www.w3.org/2000/svg';

// ── Brand constants ──

const MARK_VIEWBOX = 28;
const MARK_STROKE = 2;
const DEFAULT_COLOR = '#d4762c';
const TAGLINE_COLOR = '#6a6a82';
const FONT_FAMILY = "'Barlow Condensed', sans-serif";
const GAP = 16;
const TAGLINE_GAP = 24;

const VARIANTS = {
  full:  { text: 'LIGHTWEIGHT', fontSize: 108, weight: 600, ls: '0.06em' },
  short: { text: 'LW',          fontSize: 108, weight: 600, ls: null },
};

const TAGLINE_STYLE = { fontSize: 22, weight: 500, ls: '0.08em' };

// ── Public: measure text ink bounds via canvas ──

export function measureInk(text, { fontSize, fontWeight = 600, fontFamily = FONT_FAMILY, letterSpacing = null } = {}) {
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  if (letterSpacing) ctx.letterSpacing = letterSpacing;
  const m = ctx.measureText(text);
  return {
    ascent: m.actualBoundingBoxAscent,
    descent: m.actualBoundingBoxDescent,
    height: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent,
    advance: m.width,
  };
}

// ── Private: draw brand mark into a <g> ──

function drawMark(parent, ox, oy, size, color, strokeWidth) {
  const g = svgEl('g');
  const s = size / MARK_VIEWBOX;
  const sw = strokeWidth / s;
  const inset = sw / 2;
  g.setAttribute('transform', `translate(${ox},${oy}) scale(${s})`);

  const rect = svgEl('rect');
  rect.setAttribute('x', inset);
  rect.setAttribute('y', inset);
  rect.setAttribute('width', MARK_VIEWBOX - sw);
  rect.setAttribute('height', MARK_VIEWBOX - sw);
  rect.setAttribute('rx', 1);
  rect.setAttribute('stroke', color);
  rect.setAttribute('stroke-width', sw);
  rect.setAttribute('fill', 'none');
  g.appendChild(rect);

  const tri = svgEl('polygon');
  tri.setAttribute('points',
    `${inset},${inset} ${MARK_VIEWBOX - inset},${MARK_VIEWBOX * 8.2 / 28} ${MARK_VIEWBOX * 8.2 / 28},${MARK_VIEWBOX - inset}`);
  tri.setAttribute('stroke', color);
  tri.setAttribute('stroke-width', sw);
  tri.setAttribute('stroke-linejoin', 'round');
  tri.setAttribute('fill', 'none');
  g.appendChild(tri);

  parent.appendChild(g);
  return g;
}

// ── Private: create glow filter ──

function createGlowFilter(id) {
  const filter = svgEl('filter');
  filter.setAttribute('id', id);
  filter.setAttribute('x', '-20%');
  filter.setAttribute('y', '-20%');
  filter.setAttribute('width', '140%');
  filter.setAttribute('height', '140%');

  const blur = svgEl('feGaussianBlur');
  blur.setAttribute('in', 'SourceGraphic');
  blur.setAttribute('stdDeviation', '4');
  blur.setAttribute('result', 'soft');
  filter.appendChild(blur);

  const matrix = svgEl('feColorMatrix');
  matrix.setAttribute('in', 'soft');
  matrix.setAttribute('type', 'matrix');
  matrix.setAttribute('values', '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.5 0');
  matrix.setAttribute('result', 'dimmed');
  filter.appendChild(matrix);

  const merge = svgEl('feMerge');
  const dimNode = svgEl('feMergeNode');
  dimNode.setAttribute('in', 'dimmed');
  merge.appendChild(dimNode);
  const src = svgEl('feMergeNode');
  src.setAttribute('in', 'SourceGraphic');
  merge.appendChild(src);
  filter.appendChild(merge);

  return filter;
}

// ── Private: layout computation ──

function computeLayout(variant, tagline, width, height) {
  const v = VARIANTS[variant];
  const wmInk = measureInk(v.text, { fontSize: v.fontSize, fontWeight: v.weight, letterSpacing: v.ls });

  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = `${v.weight} ${v.fontSize}px ${FONT_FAMILY}`;
  if (v.ls) ctx.letterSpacing = v.ls;
  const wmWidth = ctx.measureText(v.text).width;

  let tagInk = null, tagWidth = 0;
  if (tagline) {
    tagInk = measureInk(tagline, { fontSize: TAGLINE_STYLE.fontSize, fontWeight: TAGLINE_STYLE.weight, letterSpacing: TAGLINE_STYLE.ls });
    const tctx = document.createElement('canvas').getContext('2d');
    tctx.font = `${TAGLINE_STYLE.weight} ${TAGLINE_STYLE.fontSize}px ${FONT_FAMILY}`;
    tctx.letterSpacing = TAGLINE_STYLE.ls;
    tagWidth = tctx.measureText(tagline).width;
  }

  const markSize = wmInk.height;
  const lockupWidth = markSize + GAP + wmWidth;
  const totalH = tagInk ? wmInk.height + TAGLINE_GAP + tagInk.ascent : wmInk.height;

  const ox = (width - lockupWidth) / 2;
  const oy = (height - totalH) / 2;
  const wmX = ox + markSize + GAP;
  const wmY = oy + wmInk.ascent;

  let tagX = 0, tagY = 0;
  if (tagInk) {
    tagX = (width - tagWidth) / 2;
    tagY = oy + wmInk.height + TAGLINE_GAP + tagInk.ascent;
  }

  return { ox, oy, wmX, wmY, wmInk, markSize, wmWidth, lockupWidth, tagX, tagY, tagWidth };
}

// ── Public: create a brand lockup SVG ──

export async function createLockup(container, {
  variant = 'full',
  width = 1024,
  height = 500,
  glow = true,
  tagline = null,
  color = DEFAULT_COLOR,
  strokeWidth = MARK_STROKE,
} = {}) {
  // Explicitly load the brand font — document.fonts.ready only waits for
  // fonts already requested by the page, so Canvas measureText can race
  // against lazy font loading and measure with the fallback instead.
  const v = VARIANTS[variant];
  await document.fonts.load(`${v.weight} ${v.fontSize}px ${FONT_FAMILY}`);
  if (tagline) {
    await document.fonts.load(`${TAGLINE_STYLE.weight} ${TAGLINE_STYLE.fontSize}px ${FONT_FAMILY}`);
  }

  const layout = computeLayout(variant, tagline, width, height);

  // Build SVG
  const svg = svgEl('svg');
  svg.setAttribute('xmlns', NS);
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Lightweight${tagline ? ' — ' + tagline : ''}`);

  // Glow filter
  const filterId = `lw-glow-${Math.random().toString(36).slice(2, 8)}`;
  if (glow) {
    const defs = svgEl('defs');
    defs.appendChild(createGlowFilter(filterId));
    svg.appendChild(defs);
  }

  // Glow group
  const glowGroup = svgEl('g');
  if (glow) glowGroup.setAttribute('filter', `url(#${filterId})`);
  svg.appendChild(glowGroup);

  // Mark
  const markGroup = drawMark(glowGroup, layout.ox, layout.oy, layout.markSize, color, strokeWidth);

  // Wordmark
  const wm = svgEl('text');
  wm.setAttribute('font-family', FONT_FAMILY);
  wm.setAttribute('font-weight', v.weight);
  wm.setAttribute('font-size', v.fontSize);
  if (v.ls) wm.setAttribute('letter-spacing', v.ls);
  wm.setAttribute('fill', color);
  wm.setAttribute('x', layout.wmX);
  wm.setAttribute('y', layout.wmY);
  wm.textContent = v.text;
  glowGroup.appendChild(wm);

  // Tagline
  if (tagline) {
    const tag = svgEl('text');
    tag.setAttribute('font-family', FONT_FAMILY);
    tag.setAttribute('font-weight', TAGLINE_STYLE.weight);
    tag.setAttribute('font-size', TAGLINE_STYLE.fontSize);
    tag.setAttribute('letter-spacing', TAGLINE_STYLE.ls);
    tag.setAttribute('fill', TAGLINE_COLOR);
    tag.setAttribute('x', layout.tagX);
    tag.setAttribute('y', layout.tagY);
    tag.textContent = tagline;
    svg.appendChild(tag);
  }

  container.appendChild(svg);
  return { svg, layout, markGroup };
}

// ── Exported constants (for animation consumers) ──

export const BRAND = Object.freeze({
  fontFamily: FONT_FAMILY,
  variants: VARIANTS,
  taglineStyle: TAGLINE_STYLE,
  color: DEFAULT_COLOR,
  taglineColor: TAGLINE_COLOR,
  gap: GAP,
  taglineGap: TAGLINE_GAP,
  markViewbox: MARK_VIEWBOX,
  markStroke: MARK_STROKE,
});

// ── Helpers ──

function svgEl(tag) {
  return document.createElementNS(NS, tag);
}
