import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Stage 1 — the first client call, as the GM wrote it ("Aziza Sales Call Guide", 19 Oct 2026, which
 * supersedes the Stage 1 PDF of the same day: it adds the turnkey golden rule, the package-vs-custom
 * pricing rule and the short answers). It lives in the workspace instead of as a file so there is one
 * copy, it is searchable, and it reads on a phone with the client still on the line.
 *
 * Everything inside <Script> is wording the client hears. It is the GM's; change it only when she does.
 */

const EYEBROW = "text-[11px] uppercase tracking-[0.2em] text-muted-foreground";
const H2 = "font-heading text-2xl uppercase tracking-wide text-foreground";
const CARD = "avoid-break rounded-[var(--radius)] border border-border bg-card p-5";

const Script = ({ children }: { children: ReactNode }) => (
  <p className="mt-3 border-l-2 border-primary/60 bg-muted/40 py-3 pl-4 pr-3 text-[15px] leading-7 text-foreground">
    &ldquo;{children}&rdquo;
  </p>
);

const Section = ({ id, step, title, lead, children }: {
  id: string; step: string; title: string; lead?: ReactNode; children: ReactNode;
}) => (
  <section id={id} className="scroll-mt-20 space-y-5 border-t border-border pt-8">
    <div className="space-y-2">
      <p className={EYEBROW}>{step}</p>
      <h2 className={H2}>{title}</h2>
      {lead && <p className="max-w-2xl text-[15px] leading-7 text-muted-foreground">{lead}</p>}
    </div>
    {children}
  </section>
);

/** Question → the one-line version, then the full wording. Closed by default: open the one they asked. */
const Ask = ({ q, short, children }: { q: string; short: string; children: ReactNode }) => (
  <details className="group rounded-[var(--radius)] border border-border bg-card px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
    <summary className="flex cursor-pointer items-start justify-between gap-4 text-[15px] font-medium text-foreground">
      <span>&ldquo;{q}&rdquo;</span>
      <span aria-hidden="true" className="mt-0.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-45">+</span>
    </summary>
    <p className="mt-3 text-sm text-muted-foreground"><span className="font-medium text-foreground">In short:</span> {short}</p>
    <Script>{children}</Script>
  </details>
);

const Step = ({ letter, title, children }: { letter: string; title: string; children: ReactNode }) => (
  <div className={cn(CARD, "flex gap-4")}>
    <span className="font-heading text-2xl font-semibold leading-none text-primary">{letter}</span>
    <div className="min-w-0 flex-1 space-y-2">
      <h3 className="font-medium text-foreground">{title}</h3>
      <div className="space-y-2 text-sm leading-6 text-muted-foreground">{children}</div>
    </div>
  </div>
);

const SCOPE = [
  "Furniture & décor", "Curtains", "Decorative lighting", "Appliances", "Rugs, artwork & accessories",
  "Balcony furniture", "Custom furniture (if needed)", "Wall / TV / feature walls*",
  "Holiday-home essentials*", "Delivery, install, styling, handover",
];

const FACTS: [string, string, string][] = [
  ["Timeline", "10–25 business days", "Depends on unit size, layout, custom work, stock and building access."],
  ["Furniture", "Ready-made + custom", "Mixed on dimensions, design, function, budget and availability."],
  ["Dubai pricing", "Package price", "When the client takes an existing design with its standard scope."],
  ["Outside Dubai", "~10% extra", "Abu Dhabi, RAK and the rest: a logistics charge, always subject to confirmation."],
];

const NEVER = [
  "An exact completion date", "Exact product availability", "The exact furniture in a render",
  "Free changes or upgrades", "Discounts (without approval)", "Special payment terms (without approval)",
  "Unlimited revisions", "Custom work before measuring", "Building permit timing", "Free extra scope",
];

const COLLECT: [string, string][] = [
  ["Client", "Name, phone, email"],
  ["Property", "Location, building, unit type, handover status, floor plan / photos"],
  ["Use", "Own use, long-term rental, or holiday home"],
  ["Scope", "Full turnkey by default. Note only exclusions, items they own, or special needs."],
  ["Commercial", "Approximate budget and target completion date"],
  ["Design", "Preferred style, reference images if any"],
];

const CHECKS = [
  "Property understood",
  "Client purpose understood",
  "Scope understood",
  "Budget direction understood",
  "Timeline understood",
  "Design catalogue sent / next design direction identified",
  "Next action agreed",
];

const CHECK_KEY = "ws.playbook.stage1";

/** The tick list survives a reload mid-call; "Start a new call" clears it for the next one. */
const useCallChecklist = () => {
  const [done, setDone] = useState<number[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHECK_KEY);
      if (raw) setDone(JSON.parse(raw) as number[]);
    } catch { /* storage unavailable */ }
  }, []);
  const write = (next: number[]) => {
    setDone(next);
    try { localStorage.setItem(CHECK_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  };
  return {
    done,
    toggle: (i: number) => write(done.includes(i) ? done.filter((x) => x !== i) : [...done, i]),
    reset: () => write([]),
  };
};

const NAV: [string, string][] = [
  ["know", "Know"], ["call", "The call"], ["explain", "Explain"],
  ["questions", "Questions"], ["never", "Never promise"], ["close", "Close"], ["checklist", "Checklist"],
];

/**
 * Printing is how the PDF gets made now, so there is no second document to keep in step: the disclosures
 * open for print and close again afterwards, and the app's furniture is hidden.
 */
const usePrintableDisclosures = () => {
  useEffect(() => {
    const all = () => Array.from(document.querySelectorAll<HTMLDetailsElement>("details"));
    const opened: HTMLDetailsElement[] = [];
    const before = () => all().forEach((d) => { if (!d.open) { d.open = true; opened.push(d); } });
    const after = () => { opened.splice(0).forEach((d) => { d.open = false; }); };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
};

export const SalesPlaybook = ({ isGm }: { isGm: boolean }) => {
  const { done, toggle, reset } = useCallChecklist();
  usePrintableDisclosures();

  return (
    <div className="space-y-8">
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          .playbook-hide-print { display: none !important; }
          .playbook details > summary ~ * { display: block !important; }
          .playbook section, .playbook details, .playbook table { break-inside: auto; }
          .playbook .avoid-break { break-inside: avoid; }
          .playbook h2, .playbook h3 { break-after: avoid; }
        }
      `}</style>
      <header className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className={EYEBROW}>Sales training · Stage 1</p>
          <Button size="sm" variant="outline" className="playbook-hide-print" onClick={() => window.print()}>
            Print / Save as PDF
          </Button>
        </div>
        <h1 className="font-heading text-3xl uppercase tracking-wide text-foreground sm:text-4xl">Your first client call, made simple</h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">
          Everything you need before you pick up the phone. Read it once, keep it open during the call.
          {isGm && " This is the page your sales team works from."}
        </p>
        <nav aria-label="Playbook sections" className="playbook-hide-print flex flex-wrap gap-x-4 gap-y-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
          {NAV.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="hover:text-primary">{label}</a>
          ))}
        </nav>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["1", "Qualify the lead", "Understand the property, the purpose and the opportunity."],
            ["2", "Build trust", "Explain Aziza Home clearly and accurately."],
            ["3", "Agree the next step", "Usually: send the design catalogue, or book a site visit."],
          ].map(([n, t, d]) => (
            <div key={n} className={CARD}>
              <p className="font-heading text-3xl font-semibold leading-none text-primary">{n}</p>
              <p className="mt-2 font-medium text-foreground">{t}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
        <p className="rounded-[var(--radius)] bg-primary px-5 py-4 text-[15px] leading-7 text-primary-foreground">
          <strong className="font-semibold">Don&apos;t try to design or solve the whole project on this call.</strong>{" "}
          Your only job is to understand, represent us well, and move the client forward.
        </p>
      </header>

      <Section id="know" step="01 · Before you call" title="What we do"
        lead={<>We furnish homes <strong className="font-medium text-foreground">A to Z</strong> — design, sourcing, buying, delivery, installation, styling and handover. The client gets a finished home without managing anything.</>}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map(([k, v, d]) => (
            <div key={k} className={CARD}>
              <p className={EYEBROW}>{k}</p>
              <p className="mt-2 font-heading text-xl font-semibold text-primary">{v}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="font-medium text-foreground">What&apos;s included</h3>
            <ul className="flex flex-wrap gap-2">
              {SCOPE.map((s) => (
                <li key={s} className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">{s}</li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">* Depends on the package.</p>
          </div>
          <div className="space-y-3">
            <h3 className="font-medium text-foreground">How design works</h3>
            <ol className="space-y-2 text-sm leading-6 text-muted-foreground">
              <li><span className="font-medium text-primary">1.</span> Send the <strong className="font-medium text-foreground">design catalogue</strong>.</li>
              <li><span className="font-medium text-primary">2.</span> Client likes a design → we <strong className="font-medium text-foreground">adapt it</strong> to their property.</li>
              <li><span className="font-medium text-primary">3.</span> Client wants changes → we <strong className="font-medium text-foreground">modify or redesign</strong> from their brief.</li>
            </ol>
          </div>
        </div>
        <div className="rounded-[var(--radius)] border border-warning/40 bg-warning/10 p-5">
          <p className={EYEBROW}>Must explain before signing</p>
          <h3 className="mt-2 font-medium text-foreground">Renders are a direction, not a shopping list</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Moodboards and AI renders show the concept, colours, layout and style. We match them as closely as possible,
            but exact items can change with market stock — we use suitable alternatives that keep the same look.
          </p>
        </div>
      </Section>

      <Section id="call" step="02 · During the call" title="The call in 6 steps"
        lead="Open warmly, then work through A to F. Ask, listen, take notes.">
        <div className={CARD}>
          <p className={EYEBROW}>Say this to open</p>
          <Script>
            Hi [client name], this is [your name] from Aziza Home. Thank you for your enquiry. I&apos;d just like to
            understand a little more about your property and what you&apos;re looking for, so I can recommend the most
            suitable furnishing option for you.
          </Script>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <Step letter="A" title="Property">
            <ul className="list-disc space-y-1 pl-5">
              <li>Where is it? Building, community, emirate.</li>
              <li>What type? Studio, 1BR, 2BR, 3BR, townhouse, villa.</li>
              <li>Has it been handed over?</li>
              <li>Do you have a floor plan, photos or videos?</li>
            </ul>
          </Step>
          <Step letter="B" title="Use">
            <p>Is it for your own use, long-term rental, or a holiday home? This one answer changes the whole scope.</p>
          </Step>
          <Step letter="C" title="Scope">
            <div className="rounded-[var(--radius)] border border-primary/30 bg-primary/5 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-primary">Golden rule</p>
              <p className="mt-1">Always lead with the full turnkey package. Don&apos;t ask them to pick individual items.</p>
            </div>
            <p>Only reduce scope if they already own items, have a specific need, or clearly want less. If so, note what
              to exclude: curtains, lighting, appliances, décor, wall design, balcony, holiday-home essentials.</p>
          </Step>
          <Step letter="D" title="Style">
            <ul className="list-disc space-y-1 pl-5">
              <li>Do you have a preferred style or reference?</li>
              <li>If not: offer to share our design catalogue for inspiration.</li>
            </ul>
          </Step>
          <Step letter="E" title="Budget">
            <ul className="list-disc space-y-1 pl-5">
              <li>Do you have an approximate budget in mind?</li>
              <li>If they like an existing package: the published price covers that design and its standard scope.</li>
              <li>No budget? That&apos;s fine — show options first, recommend after.</li>
            </ul>
          </Step>
          <Step letter="F" title="Timing">
            <ul className="list-disc space-y-1 pl-5">
              <li>When would you like it completed?</li>
              <li>Any hard deadline? Move-in, tenant start, photo shoot, Airbnb launch, first guest.</li>
            </ul>
          </Step>
        </div>
      </Section>

      <Section id="explain" step="03 · Pitch" title="How to explain the service">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className={CARD}>
            <p className={EYEBROW}>The story, in order</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
              <li>We recommend the <strong className="font-medium text-foreground">full turnkey solution</strong> — one coordinated project.</li>
              <li>We share our <strong className="font-medium text-foreground">catalogue</strong> so you can pick a style.</li>
              <li>Like a design? We <strong className="font-medium text-foreground">adapt it</strong>. Want changes? Our designer <strong className="font-medium text-foreground">redesigns</strong> it.</li>
              <li>We use <strong className="font-medium text-foreground">ready-made and custom</strong> furniture to fit the space.</li>
              <li>Once approved, <strong className="font-medium text-foreground">we handle everything</strong>: buying, suppliers, delivery, installation, styling, handover.</li>
              <li>Already own items or need a different scope? We tailor the proposal.</li>
            </ol>
          </div>
          <div className={CARD}>
            <p className={EYEBROW}>The pricing rule</p>
            <dl className="mt-3 space-y-3 text-sm leading-6">
              <div>
                <dt className="text-muted-foreground">Existing design + standard scope</dt>
                <dd className="font-medium text-foreground">= Package price</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Any change to design or scope</dt>
                <dd className="font-medium text-foreground">= Custom quotation, sent with the revised design</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Either way the number comes from the GM. You never price a change on the call.
            </p>
          </div>
        </div>
        <details className="group rounded-[var(--radius)] border border-border bg-card px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer items-center justify-between gap-4 text-[15px] font-medium text-foreground">
            Read the full script
            <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
          </summary>
          <Script>
            Based on what you have shared, we would normally recommend our full turnkey furnishing solution so the
            apartment is completed as one coordinated project. We start by sharing our design catalogue so you can
            identify the style you prefer. If you like one of our existing designs, we can adapt it to your property. If
            you want changes or something more personalised, our designer can redesign the concept based on your
            requirements. We use a combination of ready-made and customised furniture depending on the apartment
            dimensions, design and availability. Once the design is approved, our team handles procurement, supplier
            coordination, delivery, installation, styling and handover. If you already have certain items or require a
            different scope, we can discuss that separately and tailor the proposal accordingly.
          </Script>
        </details>
      </Section>

      <Section id="questions" step="04 · Be ready" title="When the client asks…" lead="Open the one they asked.">
        <div className="space-y-2">
          <Ask q="Will it look exactly like the render?" short="same look and feel, some items may differ.">
            We aim to achieve the final result as closely as possible to the approved concept and maintain the same
            overall aesthetic, colours and design direction. Because market stock changes, some exact furniture or décor
            items may vary. If something is unavailable, we source the closest suitable alternative that remains
            consistent with the approved design.
          </Ask>
          <Ask q="Is everything ready-made?" short="both — whatever fits the space best.">
            We use both ready-made and customised furniture. Ready-made products are used where they fit the space and
            design well. If the apartment requires a specific size, proportion or function, we can customise certain
            pieces.
          </Ask>
          <Ask q="How long will it take?" short="about 10–25 business days — exact timeline once the scope is clear.">
            The typical execution period is approximately 10 to 25 business days, depending on the size of the property,
            design complexity, custom works, product availability and building access. Once we understand the full
            scope, we can give you a more accurate estimated timeline.
          </Ask>
          <Ask q="Do you work outside Dubai?" short="yes, usually around 10% extra for logistics — confirmed in the proposal.">
            Yes, we can handle projects in other emirates such as Abu Dhabi and Ras Al Khaimah. An additional logistics
            and coordination charge may apply, usually around 10%, depending on location and scope. We will confirm this
            in the proposal.
          </Ask>
          <Ask q="How much will it cost?" short="depends on size, scope and design — understand first, then propose.">
            The final price depends on the unit size, scope, design level and whether you require items such as wall
            design, custom furniture, appliances or holiday-home essentials. Once I understand your requirements and
            preferred design direction, we can recommend the suitable package and prepare the proposal.
          </Ask>
          <Ask q="Another company is cheaper." short="we're a complete service, not just furniture — compare like-for-like.">
            Of course, there are different price levels in the market. With Aziza Home, the service is not only
            furniture supply — we manage the design, sourcing, procurement, supplier coordination, delivery,
            installation, styling and final handover as one complete solution. Once we understand the other
            quotation&apos;s scope, we can help you compare like-for-like.
          </Ask>
          <Ask q="I don't want to share a budget." short="totally fine — show options first.">
            That is absolutely fine. We can first show you our package options and design directions, and then recommend
            the most suitable solution based on the property and scope.
          </Ask>
        </div>
      </Section>

      <Section id="never" step="05 · Red lines" title="Never promise on the first call">
        <div className="rounded-[var(--radius)] border border-destructive/40 bg-destructive/5 p-5">
          <ul className="grid gap-x-6 gap-y-2 text-sm leading-6 text-muted-foreground sm:grid-cols-2">
            {NEVER.map((n) => (
              <li key={n} className="flex gap-2"><span aria-hidden="true" className="text-destructive">×</span>{n}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm font-medium text-foreground">Not sure? Say this</p>
          <Script>Let me confirm this with our design, operations or management team and come back to you.</Script>
        </div>
      </Section>

      <Section id="close" step="06 · Before you hang up" title="Collect, then close">
        <div className={CARD}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">You must have</th>
                  <th className="py-2 font-medium">Minimum</th>
                </tr>
              </thead>
              <tbody>
                {COLLECT.map(([k, v]) => (
                  <tr key={k} className="border-b border-border/60 align-top last:border-0">
                    <td className="whitespace-nowrap py-2 pr-4 font-medium text-foreground">{k}</td>
                    <td className="py-2 leading-6 text-muted-foreground">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            All of it goes straight onto the lead — <Link to="/workspace/leads" className="font-medium text-primary underline-offset-4 hover:underline">Leads</Link> → New lead.
            The designer&apos;s brief and the proposal are built from those fields, so a thin lead costs you a second call.
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className={CARD}>
            <p className={EYEBROW}>Next step: send the catalogue</p>
            <Script>
              Thank you, that gives me a good understanding of what you are looking for. I will send you our design
              catalogue now so you can review the different styles. Once you let me know which direction you prefer, we
              can proceed with the next step and prepare the suitable proposal or arrange the site visit if required.
            </Script>
          </div>
          <div className={CARD}>
            <p className={EYEBROW}>Unit already handed over</p>
            <Script>
              Since your apartment has already been handed over, the next best step would be for us to review the floor
              plan and arrange a site visit if required, so we can understand the space properly.
            </Script>
          </div>
        </div>
      </Section>

      <Section id="checklist" step="07 · After the call" title="Did you get it all?"
        lead="Tick each one. All seven is a successful Stage 1 call.">
        <div className={CARD}>
          <ul className="space-y-1">
            {CHECKS.map((label, i) => {
              const on = done.includes(i);
              return (
                <li key={label}>
                  <button type="button" onClick={() => toggle(i)} aria-pressed={on}
                    className="flex w-full items-center gap-3 rounded-[var(--radius)] px-2 py-2 text-left text-sm hover:bg-muted/60">
                    <span aria-hidden="true" className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border text-xs",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent",
                    )}>✓</span>
                    <span className={on ? "text-foreground line-through decoration-muted-foreground/60" : "text-muted-foreground"}>{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground">
              {done.length === CHECKS.length ? "Stage 1 complete" : `${done.length} of ${CHECKS.length}`}
            </p>
            <Button size="sm" variant="outline" className="playbook-hide-print" onClick={reset} disabled={!done.length}>Start a new call</Button>
          </div>
        </div>
        <p className="text-sm italic leading-7 text-muted-foreground">
          Stage 1 is qualification, trust and the next step. Don&apos;t solve the whole project on the first call.
        </p>
      </Section>

      <p className="border-t border-border pt-5 text-sm text-muted-foreground">
        {isGm
          ? "This page is the one the sales team reads, so there is no second copy to keep in step: when the playbook changes, change it here."
          : "Questions, or anything here that looks wrong, tell the GM."}
      </p>
    </div>
  );
};

export default SalesPlaybook;
