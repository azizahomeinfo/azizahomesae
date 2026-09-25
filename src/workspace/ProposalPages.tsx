import logo from "@/assets/aziza-logo.png";
import { shortDate } from "./format";
import {
  investEyebrow, layoutSheets, money, priceLines,
  type DocImage, type ItemGroup, type ProposalDocument, type Sheet,
} from "./proposalModel";

/**
 * The client document. Every page is a fixed 794 × 1123 px box (A4 at 96 dpi).
 * Colours are the document's own palette — it is printed and shared, so it does
 * not follow the workspace theme.
 */
export const PAGE_W = 794;
export const PAGE_H = 1123;
export const PREVIEW_SCALE = 0.72;

export const PROPOSAL_CSS = `
.ppd { --pp-bg: hsl(38 65% 98%); --pp-ink: hsl(30 15% 15%); --pp-olive: hsl(68 16% 22%);
  --pp-muted: hsl(30 12% 30%); --pp-label: hsl(30 12% 35%); --pp-line: hsl(32 18% 58% / 0.45); --pp-line-soft: hsl(32 18% 58% / 0.3);
  --pp-line-strong: hsl(32 18% 58% / 0.6); --pp-field: hsl(32 30% 95%); --pp-card: hsl(0 0% 100%); }
.ppd-field { background: var(--pp-field); }
.ppd-page { position: relative; overflow: hidden; width: ${PAGE_W}px; height: ${PAGE_H}px; background: var(--pp-bg); color: var(--pp-ink);
  font-family: 'Montserrat', sans-serif; box-sizing: border-box; display: flex; flex-direction: column; }
.ppd-page * { box-sizing: border-box; }
.ppd-serif { font-family: 'Cormorant Garamond', serif; font-weight: 600; text-transform: uppercase; margin: 0; }
.ppd-eyebrow { font-size: 11.5px; font-weight: 500; letter-spacing: 0.3em; text-transform: uppercase; color: var(--pp-olive); margin: 0 0 12px; }
.ppd-foot { position: absolute; left: 56px; right: 56px; bottom: 28px; display: flex; justify-content: space-between;
  font-size: 9px; font-weight: 500; letter-spacing: 0.26em; text-transform: uppercase; color: var(--pp-label); }
.ppd-img { width: 100%; height: 100%; object-fit: contain; display: block; }
.ppd-grow { flex: 1 1 auto; min-height: 0; }
.ppd-cols { column-count: 3; column-gap: 32px; column-rule: 1px solid var(--pp-line-soft); column-fill: auto; }
.ppd-cols.ppd-cols-4 { column-count: 4; column-gap: 24px; }
.ppd-group { break-inside: avoid; page-break-inside: avoid; margin-bottom: 14px; }
.ppd-group h4 { font-size: 10px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: var(--pp-olive);
  margin: 0 0 4px; padding-bottom: 5px; border-bottom: 1px solid var(--pp-line); }
.ppd-row { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; line-height: 1.3; padding: 3px 0; }
.ppd-row b { font-weight: 600; }
.ppd-card { background: var(--pp-card); border: 1px solid var(--pp-line); padding: 24px 26px; }
.ppd-line { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; padding: 5px 0; color: var(--pp-muted); }
.ppd-line span:last-child { white-space: nowrap; }
.ppd-table .r { white-space: nowrap; }
.ppd-line.total { font-size: 14px; font-weight: 600; color: var(--pp-ink); border-top: 1px solid var(--pp-line-strong); margin-top: 6px; padding-top: 10px; }
.ppd-table { display: grid; grid-template-columns: 1.6fr repeat(4, 1fr); column-gap: 12px; }
.ppd-table > div { padding: 8px 0; border-bottom: 1px solid var(--pp-line-soft); font-size: 11px; }
.ppd-table .th { font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--pp-olive); font-weight: 600; }
.ppd-table .r { text-align: right; }
@media print {
  @page { size: 210mm 297mm; margin: 0; }
  html, body { background: #fff !important; }
  body * { visibility: hidden !important; }
  [data-print-root], [data-print-root] * { visibility: visible !important; }
  [data-print-root] { position: absolute !important; left: 0 !important; top: 0 !important; padding: 0 !important; margin: 0 !important;
    gap: 0 !important; background: none !important; overflow: visible !important; width: ${PAGE_W}px !important; display: block !important; }
  [data-print-slot] { width: auto !important; height: auto !important; margin: 0 !important; box-shadow: none !important; }
  [data-print-scale] { transform: none !important; break-after: page; page-break-after: always; }
  [data-print-scale]:last-child { break-after: auto; }
  .ppd-page { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;

type Url = (p: string | null | undefined) => string | undefined;

const Foot = ({ client, n }: { client: string; n: number }) => (
  <div className="ppd-foot"><span>Aziza Home · Proposal for {client}</span><span>{String(n).padStart(2, "0")}</span></div>
);

const Cover = ({ doc, url }: { doc: ProposalDocument; url: Url }) => {
  const c = doc.cover;
  const hero = url(c.hero);
  const meta: [string, string][] = [
    ["Location", c.location || "—"], ["Date", c.date ? shortDate(c.date) : "—"], ["Validity", c.validity || "—"], ["Scope", c.scope || "—"],
  ];
  return (
    <div className="ppd-page">
      {hero && <img src={hero} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, transparent 0%, transparent 30%, hsl(38 65% 98% / 0.85) 50%, hsl(38 65% 98%) 58%, hsl(38 65% 98%) 100%)",
      }} />
      <img src={logo} alt="Aziza Home" style={{ position: "absolute", top: 62, left: 70, width: 147, height: 147, objectFit: "contain" }} />
      <div style={{ position: "absolute", left: 70, right: 70, bottom: 58 }}>
        <p className="ppd-eyebrow">Interior design proposal</p>
        <h1 className="ppd-serif" style={{ fontSize: 64, lineHeight: 1.02, letterSpacing: "0.02em" }}>Proposal for<br />{c.client}</h1>
        {c.intro && <p style={{ fontSize: 15.5, lineHeight: 1.7, maxWidth: 600, margin: "22px 0 0", color: "var(--pp-muted)" }}>{c.intro}</p>}
        <div style={{ marginTop: 40, paddingTop: 22, borderTop: "1px solid var(--pp-line)", display: "grid", gridTemplateColumns: "1.65fr 0.9fr 0.9fr 1.2fr", gap: 18 }}>
          {meta.map(([k, v]) => (
            <div key={k}>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.28em", textTransform: "uppercase", color: "var(--pp-label)", margin: "0 0 6px" }}>{k}</p>
              <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const FloorPage = ({ doc, url, n }: { doc: ProposalDocument; url: Url; n: number }) => {
  const f = doc.floorPlan;
  const src = f.path && !f.path.toLowerCase().endsWith(".pdf") ? url(f.path) : undefined;
  return (
    <div className="ppd-page" style={{ padding: "56px 56px 80px" }}>
      <p className="ppd-eyebrow">The apartment</p>
      <h2 className="ppd-serif" style={{ fontSize: 44, letterSpacing: "0.04em", lineHeight: 1.05 }}>Floor plan</h2>
      {f.text && <p style={{ fontSize: 13, lineHeight: 1.75, whiteSpace: "pre-line", margin: "14px 0 0", color: "var(--pp-muted)" }}>{f.text}</p>}
      <div className="ppd-grow" style={{ marginTop: 24, background: "var(--pp-card)", border: "1px solid var(--pp-line)", padding: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {src ? <img src={src} alt="Floor plan" className="ppd-img" /> : (
          <p style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--pp-label)", margin: 0 }}>Floor plan to be added by the designer</p>
        )}
      </div>
      <Foot client={doc.cover.client} n={n} />
    </div>
  );
};

const AreaPage = ({ s, doc, url, n }: { s: Extract<Sheet, { kind: "area" }>; doc: ProposalDocument; url: Url; n: number }) => (
  <div className="ppd-page" style={{ padding: "52px 56px 80px" }}>
    <p className="ppd-eyebrow">{s.eyebrow}</p>
    <h2 className="ppd-serif" style={{ fontSize: 40, letterSpacing: "0.04em", lineHeight: 1.05 }}>{s.title}</h2>
    {s.desc && <p style={{ fontSize: 13, lineHeight: 1.7, margin: "12px 0 0", color: "var(--pp-muted)" }}>{s.desc}</p>}
    <div className="ppd-grow" style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 14 }}>
      {s.images.map((img: DocImage) => (
        <div key={img.path} style={{ flex: "1 1 0", minHeight: 0 }}>
          {url(img.path) ? <img src={url(img.path)} alt={img.caption ?? s.title} className="ppd-img" /> : <div style={{ width: "100%", height: "100%", background: "var(--pp-field)" }} />}
        </div>
      ))}
    </div>
    <Foot client={doc.cover.client} n={n} />
  </div>
);

const InvestTable = ({ doc }: { doc: ProposalDocument }) => {
  const inv = doc.investment;
  return (
    <div style={{ marginTop: 18 }}>
      <p className="ppd-eyebrow" style={{ marginBottom: 6 }}>Your investment · {investEyebrow(inv.options.length)}</p>
      <div className="ppd-table">
        <div className="th">Package</div><div className="th r">VAT {inv.vat}%</div><div className="th r">Total incl. VAT</div>
        <div className="th r">On signing {inv.down}%</div><div className="th r">On handover {100 - inv.down}%</div>
        {inv.options.map((o, i) => {
          const p = priceLines(Number(o.amount) || 0, inv.vat, inv.down);
          return [
            <div key={`l${i}`}><div style={{ fontWeight: 600 }}>{o.label}</div><div style={{ fontSize: 10, color: "var(--pp-muted)" }}>{money(p.base)} excl. VAT</div></div>,
            <div key={`v${i}`} className="r">{money(p.vat)}</div>,
            <div key={`t${i}`} className="r" style={{ fontWeight: 600 }}>{money(p.total)}</div>,
            <div key={`d${i}`} className="r">{money(p.down)}</div>,
            <div key={`b${i}`} className="r">{money(p.balance)}</div>,
          ];
        })}
      </div>
      {inv.terms && <p style={{ fontSize: 10, lineHeight: 1.6, color: "var(--pp-muted)", margin: "10px 0 0" }}>{inv.terms}</p>}
    </div>
  );
};

const ItemsPage = ({ s, doc, n }: { s: Extract<Sheet, { kind: "items" }>; doc: ProposalDocument; n: number }) => (
  <div className="ppd-page" style={{ padding: "56px 56px 84px" }}>
    <div style={{ paddingBottom: 18, borderBottom: "1px solid var(--pp-line)", marginBottom: 22 }}>
      <p className="ppd-eyebrow">Everything included</p>
      <h2 className="ppd-serif" style={{ fontSize: 36, letterSpacing: "0.04em", lineHeight: 1.05 }}>{s.title}</h2>
    </div>
    <div className={s.withInvest ? "ppd-cols ppd-cols-4" : "ppd-cols ppd-grow"} style={s.withInvest ? { flex: "1 1 auto", minHeight: 0 } : undefined}>
      {(() => {
        const columnCount = s.withInvest ? 4 : 3;
        const itemCount = s.groups.reduce((sum, group) => sum + group.items.length, 0);
        const itemsPerColumn = Math.max(1, Math.ceil(itemCount / columnCount));
        return s.groups.flatMap((g: ItemGroup, gi) => {
          const chunks: ItemGroup["items"][] = [];
          if (g.items.length > itemsPerColumn) {
            for (let i = 0; i < g.items.length; i += itemsPerColumn) chunks.push(g.items.slice(i, i + itemsPerColumn));
          } else {
            chunks.push(g.items);
          }
          return chunks.map((items, ci) => (
            <div key={`${g.room}-${gi}-${ci}`} className="ppd-group">
              <h4>{g.room}{ci > 0 ? " · continued" : ""}</h4>
              {items.map((it, k) => <div key={k} className="ppd-row"><span>{it.item}</span><b>{it.qty}</b></div>)}
            </div>
          ));
        });
      })()}
    </div>
    {s.withInvest && <InvestTable doc={doc} />}
    <Foot client={doc.cover.client} n={n} />
  </div>
);

const InvestPage = ({ doc, n }: { doc: ProposalDocument; n: number }) => {
  const inv = doc.investment;
  return (
    <div className="ppd-page" style={{ padding: "48px 56px 80px" }}>
      <p className="ppd-eyebrow">{investEyebrow(inv.options.length)}</p>
      <h2 className="ppd-serif" style={{ fontSize: 40, letterSpacing: "0.04em", lineHeight: 1.05 }}>Your investment</h2>
      <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: inv.options.length > 1 ? "1fr 1fr" : "1fr", gap: 18 }}>
        {inv.options.map((o, i) => {
          const p = priceLines(Number(o.amount) || 0, inv.vat, inv.down);
          return (
            <div key={i} className="ppd-card">
              <p style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--pp-olive)", fontWeight: 600, margin: "0 0 12px" }}>{o.label}</p>
              <div className="ppd-line"><span>{o.desc || "Package"}</span><span>{money(p.base)}</span></div>
              <div className="ppd-line"><span>VAT ({inv.vat}%)</span><span>{money(p.vat)}</span></div>
              <div className="ppd-line total"><span>Total incl. VAT</span><span>{money(p.total)}</span></div>
              <div className="ppd-line"><span>Downpayment on signing ({inv.down}%)</span><span>{money(p.down)}</span></div>
              <div className="ppd-line"><span>Balance on handover ({100 - inv.down}%)</span><span>{money(p.balance)}</span></div>
            </div>
          );
        })}
      </div>
      {inv.terms && <p style={{ marginTop: "auto", fontSize: 11, lineHeight: 1.7, color: "var(--pp-muted)" }}>{inv.terms}</p>}
      <Foot client={doc.cover.client} n={n} />
    </div>
  );
};

const renderSheet = (s: Sheet, doc: ProposalDocument, url: Url, n: number) => {
  switch (s.kind) {
    case "cover": return <Cover doc={doc} url={url} />;
    case "floor": return <FloorPage doc={doc} url={url} n={n} />;
    case "area": return <AreaPage s={s} doc={doc} url={url} n={n} />;
    case "items": return <ItemsPage s={s} doc={doc} n={n} />;
    case "invest": return <InvestPage doc={doc} n={n} />;
  }
};

/** Pages stacked in the grey field, scaled for preview; print shows them 1:1, one per A4 sheet. */
export const ProposalPages = ({ doc, url, scale = PREVIEW_SCALE }: { doc: ProposalDocument; url: Url; scale?: number }) => {
  const { sheets } = layoutSheets(doc);
  return (
    <div className="ppd ppd-field flex flex-col items-center gap-6 p-6" data-print-root>
      {sheets.map((s, i) => (
        <div key={i} data-print-slot style={{ width: PAGE_W * scale, height: PAGE_H * scale, flex: "none", boxShadow: "0 1px 6px hsl(30 15% 15% / 0.12)" }}>
          <div data-print-scale style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: PAGE_W, height: PAGE_H }}>
            {renderSheet(s, doc, url, i + 1)}
          </div>
        </div>
      ))}
    </div>
  );
};
