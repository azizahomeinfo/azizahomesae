import logo from "@/assets/aziza-logo.png";
import { PAGE_W, PAGE_H } from "./ProposalPages";
import { shortDate } from "./format";

/**
 * The handover checklist as A4 sheets, so the designer can print it or save it as a PDF and carry it
 * round the unit (Veronica, 2026-11-28: "a list that Suha can download... so she can just click").
 * It prints what is on screen at that moment: a line already ticked prints ticked, a line with a snag
 * prints its reference — so the same click gives her a blank sheet before the visit and a record of
 * what was found after it.
 *
 * Paper and palette follow the proposal document (PROPOSAL_CSS, data-print-root / data-print-slot),
 * because the print plumbing that hides the rest of the workspace already lives there.
 */
export interface SheetRow {
  id: string;
  room: string;
  item: string;
  qty: number;
  present: boolean;
  note?: string | null;
  snagRef?: string | null;
  snagStatus?: string | null;
}

export interface SheetFacts {
  client: string;
  code: string;
  unit: string | null;
  unitType: string | null;
  area: string | null;
  handover: string | null;
  designer: string | null;
  coordinator: string | null;
}

/* A4 at 96dpi less the margins; a row is 26px and a section heading 46px, so a page holds whatever
   fits. Measured against the generated PDFs rather than guessed. */
const PAD = 56;
const BODY_H = PAGE_H - PAD * 2 - 40;      // 40 keeps the footer clear
const ROW_H = 26;
const HEAD_H = 46;
const FIRST_PAGE_H = BODY_H - 250;          // the title block and the instruction box

type Block = { room: string; rows: SheetRow[] };

/** Greedy pack: a room may split across pages, and carries "continued" when it does. */
const paginate = (rows: SheetRow[]): Block[][] => {
  const pages: Block[][] = [];
  let page: Block[] = [];
  let left = FIRST_PAGE_H;
  let lastRoom = "";
  for (const r of rows) {
    const needsHead = r.room !== lastRoom;
    const cost = ROW_H + (needsHead ? HEAD_H : 0);
    if (cost > left) {
      pages.push(page);
      page = [];
      left = BODY_H;
      lastRoom = "";
    }
    if (r.room !== lastRoom) {
      page.push({ room: r.room, rows: [] });
      lastRoom = r.room;
      left -= HEAD_H;
    }
    page[page.length - 1].rows.push(r);
    left -= ROW_H;
  }
  if (page.length) pages.push(page);
  return pages.length ? pages : [[]];
};

const Box = ({ on }: { on: boolean }) => (
  <span style={{
    display: "inline-block", width: 11, height: 11, marginRight: 11, flex: "0 0 auto",
    border: "1px solid var(--pp-muted)", borderRadius: 2, position: "relative",
    background: on ? "var(--pp-olive)" : "transparent",
  }}>
    {on && (
      <span style={{
        position: "absolute", left: 3, top: 0.5, width: 3.5, height: 7,
        borderRight: "1.6px solid #fff", borderBottom: "1.6px solid #fff", transform: "rotate(45deg)",
      }} />
    )}
  </span>
);

const Foot = ({ facts, n }: { facts: SheetFacts; n: number }) => (
  <div style={{
    position: "absolute", left: PAD, right: PAD, bottom: 30, display: "flex",
    justifyContent: "space-between", fontSize: 9, color: "var(--pp-muted)",
    borderTop: "1px solid var(--pp-line)", paddingTop: 10,
  }}>
    <span>Aziza Home · Handover &amp; snagging checklist · {facts.client} · {facts.code}</span>
    <span>{n}</span>
  </div>
);

export const HandoverSheet = ({ facts, rows, source }: {
  facts: SheetFacts; rows: SheetRow[]; source: string;
}) => {
  const pages = paginate(rows);
  const done = rows.filter((r) => r.present).length;
  const fact = (k: string, v: string | null | undefined) => (
    <div style={{ display: "flex", gap: 10, padding: "3px 0" }}>
      <span style={{ width: 74, flex: "0 0 auto", fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--pp-muted)", paddingTop: 2 }}>{k}</span>
      <span style={{ fontSize: 11 }}>{v || "—"}</span>
    </div>
  );
  return (
    <div className="ppd" data-print-root>
      {pages.map((blocks, p) => (
        <div key={p} data-print-slot className="ppd-page" style={{ padding: PAD, position: "relative" }}>
          {p === 0 ? (
            <>
              <img src={logo} alt="" style={{ height: 22, width: "auto", marginBottom: 20 }} />
              <h1 className="ppd-serif" style={{ fontSize: 26, lineHeight: 1.1, margin: 0, letterSpacing: "0.01em" }}>
                Handover &amp; snagging checklist
              </h1>
              <p style={{ margin: "7px 0 0", fontSize: 11, color: "var(--pp-muted)" }}>
                Every item on the {source}, checked in the unit
              </p>
              <div style={{ borderTop: "1px solid var(--pp-olive)", margin: "16px 0 14px" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 26 }}>
                {fact("Client", facts.client)}
                {fact("Project", facts.code)}
                {fact("Unit", facts.unit)}
                {fact("Type", facts.unitType)}
                {fact("Area", facts.area)}
                {fact("Handover", facts.handover ? shortDate(facts.handover) : null)}
                {fact("Designer", facts.designer)}
                {fact("Coordinator", facts.coordinator)}
              </div>
              <div className="ppd-field" style={{
                border: "1px solid var(--pp-line)", padding: "11px 13px", margin: "14px 0 18px",
                fontSize: 10, lineHeight: 1.5,
              }}>
                Tick only what is actually in the unit and acceptable. If you cannot tick a line (missing,
                damaged, wrong finish, or short on quantity), write what is wrong in Notes and raise it as a
                snag in the workspace, so it is fixed before the client signs off.
              </div>
            </>
          ) : (
            <p style={{ margin: "0 0 18px", fontSize: 9, color: "var(--pp-muted)" }}>
              Handover &amp; snagging checklist · continued
            </p>
          )}

          {blocks.map((b, i) => (
            <section key={`${b.room}-${i}`} style={{ marginBottom: 12 }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "var(--pp-field)", padding: "7px 10px", marginBottom: 4,
              }}>
                <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--pp-olive)" }}>
                  {b.room}
                </span>
                <span style={{ fontSize: 9, color: "var(--pp-muted)" }}>
                  {b.rows.filter((r) => r.present).length} of {b.rows.length}
                </span>
              </div>
              {b.rows.map((r) => (
                <div key={r.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 8, height: ROW_H,
                  borderBottom: "1px solid var(--pp-line-soft)", paddingTop: 5, boxSizing: "border-box",
                }}>
                  <Box on={r.present} />
                  <span style={{ flex: "1 1 auto", fontSize: 10.5, minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    {r.item}
                    {r.qty > 1 && <span style={{ color: "var(--pp-muted)" }}> × {r.qty}</span>}
                  </span>
                  <span style={{ flex: "0 0 auto", width: 150, fontSize: 9.5, color: "var(--pp-muted)", borderBottom: "1px solid var(--pp-line)", minHeight: 13 }}>
                    {r.snagRef ? `${r.snagRef} · ${r.snagStatus ?? ""}` : ""}{r.snagRef && r.note ? " — " : ""}{r.note ?? ""}
                  </span>
                </div>
              ))}
            </section>
          ))}

          {p === pages.length - 1 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ borderTop: "1px solid var(--pp-olive)", marginBottom: 12 }} />
              <h2 className="ppd-serif" style={{ fontSize: 15, margin: "0 0 4px" }}>Sign-off</h2>
              <p style={{ margin: "0 0 14px", fontSize: 9.5, color: "var(--pp-muted)" }}>
                {rows.length} items on the {source} · {done} checked
              </p>
              {["Checked by (designer)", "Date", "Snags raised", "Client sign-off"].map((l) => (
                <div key={l} style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 15 }}>
                  <span style={{ width: 128, flex: "0 0 auto", fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--pp-muted)" }}>{l}</span>
                  <span style={{ flex: "1 1 auto", borderBottom: "1px solid var(--pp-line)", height: 13 }} />
                </div>
              ))}
            </div>
          )}
          <Foot facts={facts} n={p + 1} />
        </div>
      ))}
    </div>
  );
};
