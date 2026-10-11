import { useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * An uploaded proposal (PDF or image) as 794×1123 page nodes, so it can be printed in the same run as
 * the agreement. Browsers can't splice a PDF file into a page they print, so each PDF page is drawn to
 * a canvas at twice print size by pdf.js (loaded only when needed) and placed as an image; a landscape
 * page is fitted into the portrait sheet. Text in these pages is therefore not selectable.
 *
 * Price options: the text layer is read to find a "Your investment" section laid out as side-by-side
 * "Option A / Option B" columns (the Aziza proposal template). When the client has chosen one, the
 * page is recomposed to show only that column — moved into the first column's place, the others
 * blanked with the page's own background — and the heading loses its "· two options" part.
 */

type Box = { x: number; y: number; w: number; h: number };
export type PriceOption = { letter: string; label: string; amount: number | null; box: Box };
/** heading: the part of the heading line to blank — everything after "Your investment". */
type Investment = { heading: (Box & { size?: number }) | null; options: PriceOption[] };
type Drawn = { canvas: HTMLCanvasElement; bg: string; investment: Investment | null };
type State = { status: "idle" | "loading" | "ready" | "error"; drawn: Drawn[]; images?: string[]; error?: string };

const PAGE_W = 794;
const PAGE_H = 1123;

type TextItem = { str: string; transform: number[]; width: number; height: number };
type Seg = { text: string; x: number; top: number; bottom: number; right: number; size: number };

/** Group pdf.js text items into visual segments: same baseline, small horizontal gaps. */
const segments = (items: TextItem[], toView: (x: number, y: number) => number[], scale: number): Seg[] => {
  const pts = items.filter((i) => i.str.trim()).map((i) => {
    const [x, y] = toView(i.transform[4], i.transform[5]);
    const size = (Math.hypot(i.transform[2], i.transform[3]) || i.height) * scale;
    return { str: i.str, x, base: y, right: x + i.width * scale, size };
  }).sort((a, b) => a.base - b.base || a.x - b.x);
  const out: (Seg & { base: number })[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.base - p.base) < p.size * 0.35 && p.x - last.right < p.size * 2.2) {
      last.text += p.str; last.right = Math.max(last.right, p.right);
    } else {
      out.push({ text: p.str, x: p.x, base: p.base, top: p.base - p.size * 0.85, bottom: p.base + p.size * 0.25, right: p.right, size: p.size });
    }
  }
  return out;
};
const squash = (s: string) => s.replace(/\s+/g, "").toUpperCase();
const AED = /AED\s?([\d,]+(?:\.\d+)?)/i;

const findInvestment = (segs: Seg[], pageW: number): Omit<Investment, "headingColor"> | null => {
  const head = segs.find((s) => squash(s.text).startsWith("YOURINVESTMENT"));
  if (!head) return null;
  const opts = segs.filter((s) => s.top > head.bottom && /^OPTION[A-D]/.test(squash(s.text))).sort((a, b) => a.x - b.x);
  if (opts.length < 2) return null;
  // Side-by-side columns only: the headers share a line.
  const row = opts.filter((o) => Math.abs(o.top - opts[0].top) < o.size * 1.5);
  if (row.length < 2) return null;
  const margin = row[0].x;
  const top = Math.min(...row.map((o) => o.top)) - 6;
  // The grid ends where the first full-width line (the notes) starts; columns can differ in height.
  const wide = segs.filter((s) => s.top > top + row[0].size * 2 && s.x < row[1].x - 10 && s.right > row[1].x - 2).sort((a, b) => a.top - b.top)[0];
  const limit = wide ? wide.top - 2 : Infinity;
  const bottom = Math.min(limit, Math.max(...segs.filter((s) => s.top > top && s.bottom < limit).map((s) => s.bottom)) + 8);
  const options = row.map((o, i): PriceOption => {
    const x0 = o.x - 6;
    const x1 = i + 1 < row.length ? row[i + 1].x - 10 : pageW - margin + 6;
    const inCol = segs.filter((s) => s.top >= top && s.bottom <= bottom && s.x >= x0 && s.x < x1);
    const m = inCol.map((s) => s.text.match(AED)).find(Boolean);
    // Letter-spaced headers come through as "O PT I O N  A  ·  T V …": single spaces are spacing, wider ones are words.
    const label = o.text.replace(/ {2,}/g, "\u0000").replace(/ /g, "").replace(/\u0000/g, " ").trim();
    return { letter: squash(o.text).charAt(6), label, amount: m ? Number(m[1].replace(/,/g, "")) : null, box: { x: x0, y: top, w: x1 - x0, h: bottom - top } };
  });
  // Keep the original "YOUR INVESTMENT" lettering; blank from the separator on ("· TWO OPTIONS").
  // The character count only says roughly where the separator is; the exact cut is found in the pixels.
  const sep = head.text.search(/[·•|–—-]/);
  const guess = sep > 0 ? head.x + (head.right - head.x) * (sep / head.text.length) : null;
  const heading = guess != null ? { x: guess, y: head.top - 4, w: pageW - margin - guess + 4, h: head.bottom - head.top + 8, size: head.size } : null;
  return { heading, options };
};

const bgOf = (r: number, g: number, b: number) => r + g + b;
/** Move the heading cut into the blank gap just before the separator, so no letter is clipped. */
const snapCut = (ctx: CanvasRenderingContext2D, h: Box & { size?: number }, bgSum: number) => {
  const size = h.size ?? 20;
  const x0 = Math.max(0, Math.round(h.x - size * 1.6)), x1 = Math.round(h.x + size * 0.6);
  const y0 = Math.round(h.y + 4), hh = Math.max(1, Math.round(h.h - 8));
  const d = ctx.getImageData(x0, y0, Math.max(1, x1 - x0), hh).data, w = Math.max(1, x1 - x0);
  const inked = (x: number) => { for (let y = 0; y < hh; y++) { const i = (y * w + x) * 4; if (bgSum - (d[i] + d[i + 1] + d[i + 2]) > 90) return true; } return false; };
  // From the left of the window, find the end of the last letter before a gap at least a quarter-size wide.
  let lastInk = -1, gap = 0, cut = -1;
  for (let x = 0; x < w; x++) {
    if (inked(x)) { if (lastInk >= 0 && gap >= size * 0.25 && cut < 0) cut = lastInk + Math.round(gap / 2); lastInk = x; gap = 0; } else gap++;
  }
  if (cut < 0) return h;
  const nx = x0 + cut;
  return { ...h, w: h.w + (h.x - nx), x: nx };
};

const renderPdf = async (url: string): Promise<Drawn[]> => {
  const pdfjs = await import("pdfjs-dist");
  const worker = (await import("pdfjs-dist/build/pdf.worker.min.js?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  // isEvalSupported: false keeps pdf.js from compiling font programs with eval.
  const pdf = await pdfjs.getDocument({ url, isEvalSupported: false }).promise;
  const out: Drawn[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const base = page.getViewport({ scale: 1 });
    // Fit the page into A4 portrait, then draw at 2× for a sharp print.
    const fit = Math.min(PAGE_W / base.width, PAGE_H / base.height) * 2;
    const vp = page.getViewport({ scale: fit });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(vp.width);
    canvas.height = Math.ceil(vp.height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("This browser can't draw the PDF");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    // A Letter-size page fitted into A4 leaves bands; fill them with the page's own edge colour.
    const [r, g, b] = ctx.getImageData(2, 2, 1, 1).data;
    let investment: Investment | null = null;
    try {
      const text = await page.getTextContent();
      const found = findInvestment(segments(text.items as TextItem[], (x, y) => vp.convertToViewportPoint(x, y), fit), canvas.width);
      if (found?.heading) found.heading = snapCut(ctx, found.heading, bgOf(r, g, b));
      if (found) investment = found;
    } catch { /* no usable text layer: the page prints as it is */ }
    out.push({ canvas, bg: `rgb(${r}, ${g}, ${b})`, investment });
    page.cleanup();
  }
  await pdf.destroy();
  return out;
};

/** The page with only option `keep`, moved into the first column, and the heading without "· two options". */
const compose = (d: Drawn, keep: number | null): string => {
  const inv = d.investment;
  if (!inv || keep == null || !inv.options[keep]) return d.canvas.toDataURL("image/jpeg", 0.9);
  const c = document.createElement("canvas");
  c.width = d.canvas.width; c.height = d.canvas.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(d.canvas, 0, 0);
  const all = inv.options, first = all[0].box, chosen = all[keep].box, last = all[all.length - 1].box;
  ctx.fillStyle = d.bg;
  ctx.fillRect(first.x, first.y, last.x + last.w - first.x, first.h);
  ctx.drawImage(d.canvas, chosen.x, chosen.y, chosen.w, chosen.h, first.x, first.y, chosen.w, chosen.h);
  if (inv.heading) ctx.fillRect(inv.heading.x, inv.heading.y, inv.heading.w, inv.heading.h);
  return c.toDataURL("image/jpeg", 0.9);
};

export const isPdf = (name: string) => /\.pdf$/i.test(name);

/** `keep`: index of the price option to show, or null for the pages as sent. */
export const useUploadedPages = (url: string | undefined, fileName: string | undefined, keep: number | null = null) => {
  const [s, setS] = useState<State>({ status: "idle", drawn: [] });
  useEffect(() => {
    if (!url || !fileName) { setS({ status: "idle", drawn: [] }); return; }
    let alive = true;
    if (!isPdf(fileName)) { setS({ status: "ready", drawn: [], images: [url] }); return; }
    setS({ status: "loading", drawn: [] });
    renderPdf(url)
      .then((drawn) => { if (alive) setS({ status: "ready", drawn }); })
      .catch((e: unknown) => { if (alive) setS({ status: "error", drawn: [], error: e instanceof Error ? e.message : String(e) }); });
    return () => { alive = false; };
  }, [url, fileName]);
  const options = useMemo(() => s.drawn.find((d) => d.investment)?.investment?.options ?? [], [s.drawn]);
  const images = useMemo(
    () => s.images ? s.images.map((src) => ({ src, bg: "#fff" })) : s.drawn.map((d) => ({ src: compose(d, keep), bg: d.bg })),
    [s.drawn, s.images, keep],
  );
  const pages: ReactNode[] = images.map(({ src, bg }, i) => (
    <div key={i} style={{ width: PAGE_W, height: PAGE_H, background: bg, display: "flex", alignItems: "center", justifyContent: "center",
      WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
      <img src={src} alt={`Proposal page ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
    </div>
  ));
  return { status: s.status, error: s.error, pages, options };
};
