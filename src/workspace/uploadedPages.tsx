import { useEffect, useState, type ReactNode } from "react";

/**
 * An uploaded proposal (PDF or image) as 794×1123 page nodes, so it can be printed in the same run as
 * the agreement. Browsers can't splice a PDF file into a page they print, so each PDF page is drawn to
 * a canvas at twice print size by pdf.js (loaded only when needed) and placed as an image; a landscape
 * page is fitted into the portrait sheet. Text in these pages is therefore not selectable.
 */
type Img = { src: string; bg: string };
type State = { status: "idle" | "loading" | "ready" | "error"; images: Img[]; error?: string };

const PAGE_W = 794;
const PAGE_H = 1123;

const renderPdf = async (url: string): Promise<Img[]> => {
  const pdfjs = await import("pdfjs-dist");
  const worker = (await import("pdfjs-dist/build/pdf.worker.min.js?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  // isEvalSupported: false keeps pdf.js from compiling font programs with eval.
  const pdf = await pdfjs.getDocument({ url, isEvalSupported: false }).promise;
  const out: Img[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const base = page.getViewport({ scale: 1 });
    // Fit the page into A4 portrait, then draw at 2× for a sharp print.
    const fit = Math.min(PAGE_W / base.width, PAGE_H / base.height) * 2;
    const vp = page.getViewport({ scale: fit });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(vp.width);
    canvas.height = Math.ceil(vp.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser can't draw the PDF");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    // A Letter-size page fitted into A4 leaves bands; fill them with the page's own edge colour.
    const [r, g, b] = ctx.getImageData(2, 2, 1, 1).data;
    out.push({ src: canvas.toDataURL("image/jpeg", 0.9), bg: `rgb(${r}, ${g}, ${b})` });
    page.cleanup();
  }
  await pdf.destroy();
  return out;
};

export const isPdf = (name: string) => /\.pdf$/i.test(name);

export const useUploadedPages = (url: string | undefined, fileName: string | undefined) => {
  const [s, setS] = useState<State>({ status: "idle", images: [] });
  useEffect(() => {
    if (!url || !fileName) { setS({ status: "idle", images: [] }); return; }
    let alive = true;
    setS({ status: "loading", images: [] });
    (isPdf(fileName) ? renderPdf(url) : Promise.resolve([{ src: url, bg: "#fff" }]))
      .then((images) => alive && setS({ status: "ready", images }))
      .catch((e: unknown) => alive && setS({ status: "error", images: [], error: e instanceof Error ? e.message : String(e) }));
    return () => { alive = false; };
  }, [url, fileName]);
  const pages: ReactNode[] = s.images.map(({ src, bg }, i) => (
    <div key={i} style={{ width: PAGE_W, height: PAGE_H, background: bg, display: "flex", alignItems: "center", justifyContent: "center",
      WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
      <img src={src} alt={`Proposal page ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
    </div>
  ));
  return { ...s, pages };
};
