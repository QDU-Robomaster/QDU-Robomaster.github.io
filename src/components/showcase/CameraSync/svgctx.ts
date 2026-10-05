/* A tiny recorder with the part of the canvas 2D API that lanes.ts uses; it writes SVG markup instead of pixels.
   Colours and fonts are passed through as CSS values (var(--ink), var(--font-mono)), so the browser resolves them and a theme
   switch needs no redraw. Only text measuring needs real font names (measureFonts), because a canvas cannot read var(). */

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n2 = (v: number): string => String(Math.round(v * 100) / 100);

let measurer: CanvasRenderingContext2D | null = null;
export interface MeasureFonts { mono: string; sans: string }
let uid = 0;

export class SvgCtx {
  fillStyle = '#000'; strokeStyle = '#000'; lineWidth = 1; globalAlpha = 1; font = '12px sans-serif';
  textAlign: 'left' | 'center' | 'right' = 'left'; textBaseline = 'alphabetic'; lineJoin: 'miter' | 'round' = 'miter';
  out: string[] = [];
  private d = '';
  private dash: number[] = [];
  private stack: Array<{ open: number; fill: string; stroke: string; lw: number; ga: number; dash: number[] }> = [];
  private open = 0;
  private cache = new Map<string, number>();
  private pre = 'c' + (uid++).toString(36);
  private nClip = 0;
  constructor(private fonts: MeasureFonts) {}

  html(): string { return this.out.join('') + '</g>'.repeat(this.open); }

  private style(kind: 'fill' | 'stroke'): string {
    const o = this.globalAlpha < 1 ? `;opacity:${n2(this.globalAlpha)}` : '';
    if (kind === 'fill') return `fill:${this.fillStyle}${o}`;
    return `fill:none;stroke:${this.strokeStyle};stroke-width:${n2(this.lineWidth)}${this.dash.length ? `;stroke-dasharray:${this.dash.join(' ')}` : ''}${this.lineJoin !== 'miter' ? `;stroke-linejoin:${this.lineJoin}` : ''}${o}`;
  }
  clearRect(): void { /* the caller replaces the whole markup */ }
  fillRect(x: number, y: number, w: number, h: number): void { this.out.push(`<rect x="${n2(x)}" y="${n2(y)}" width="${n2(Math.max(0, w))}" height="${n2(Math.max(0, h))}" style="${this.style('fill')}"/>`); }
  strokeRect(x: number, y: number, w: number, h: number): void { this.out.push(`<rect x="${n2(x)}" y="${n2(y)}" width="${n2(Math.max(0, w))}" height="${n2(Math.max(0, h))}" style="${this.style('stroke')}"/>`); }
  beginPath(): void { this.d = ''; }
  moveTo(x: number, y: number): void { this.d += `M${n2(x)} ${n2(y)}`; }
  lineTo(x: number, y: number): void { this.d += `L${n2(x)} ${n2(y)}`; }
  bezierCurveTo(a: number, b: number, c: number, d: number, x: number, y: number): void { this.d += `C${n2(a)} ${n2(b)} ${n2(c)} ${n2(d)} ${n2(x)} ${n2(y)}`; }
  closePath(): void { this.d += 'Z'; }
  rect(x: number, y: number, w: number, h: number): void { this.d += `M${n2(x)} ${n2(y)}h${n2(w)}v${n2(h)}h${n2(-w)}Z`; }
  arc(x: number, y: number, r: number): void { this.d += `M${n2(x - r)} ${n2(y)}a${n2(r)} ${n2(r)} 0 1 0 ${n2(2 * r)} 0a${n2(r)} ${n2(r)} 0 1 0 ${n2(-2 * r)} 0Z`; }
  stroke(): void { if (this.d) this.out.push(`<path d="${this.d}" style="${this.style('stroke')}"/>`); }
  fill(): void { if (this.d) this.out.push(`<path d="${this.d}" style="${this.style('fill')}"/>`); }
  setLineDash(a: number[]): void { this.dash = a; }
  save(): void { this.stack.push({ open: this.open, fill: this.fillStyle, stroke: this.strokeStyle, lw: this.lineWidth, ga: this.globalAlpha, dash: this.dash }); }
  restore(): void {
    const s = this.stack.pop(); if (!s) return;
    while (this.open > s.open) { this.out.push('</g>'); this.open--; }
    this.fillStyle = s.fill; this.strokeStyle = s.stroke; this.lineWidth = s.lw; this.globalAlpha = s.ga; this.dash = s.dash;
  }
  /** only the rectangle clip (beginPath, rect, clip) is supported */
  clip(): void {
    const m = /^M([-\d.]+) ([-\d.]+)h([-\d.]+)v([-\d.]+)/.exec(this.d); if (!m) return;
    const id = this.pre + 'k' + this.nClip++;
    this.out.push(`<clipPath id="${id}"><rect x="${m[1]}" y="${m[2]}" width="${m[3]}" height="${m[4]}"/></clipPath><g clip-path="url(#${id})">`);
    this.open++;
  }
  measureText(s: string): { width: number } {
    const key = this.font + '|' + s, hit = this.cache.get(key); if (hit !== undefined) return { width: hit };
    if (!measurer) measurer = document.createElement('canvas').getContext('2d');
    let w = s.length * 7;
    if (measurer) {
      measurer.font = this.font.replace('var(--font-mono)', this.fonts.mono).replace('var(--font-sans)', this.fonts.sans);
      w = measurer.measureText(s).width;
    }
    this.cache.set(key, w);
    return { width: w };
  }
  fillText(s: string, x: number, y: number): void {
    const m = /^(?:(\d+)\s+)?([\d.]+)px\s+(.*)$/.exec(this.font);
    const wt = m && m[1] ? m[1] : '400', sz = m ? m[2] : '12', fam = m ? m[3] : 'sans-serif';
    const anchor = this.textAlign === 'center' ? 'middle' : this.textAlign === 'right' ? 'end' : 'start';
    this.out.push(`<text x="${n2(x)}" y="${n2(y)}" text-anchor="${anchor}" style="fill:${this.fillStyle};font:${wt} ${sz}px ${esc(fam)}${this.globalAlpha < 1 ? `;opacity:${n2(this.globalAlpha)}` : ''}">${esc(s)}</text>`);
  }
}
