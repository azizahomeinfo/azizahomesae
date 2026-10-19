import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "../WorkspaceProvider";
import type { WorkspaceRole } from "../access";

type Section = {
  title: string;
  content: ReactNode;
};

const workspaceLink = "font-medium text-primary underline-offset-4 hover:underline";

/** Wording the client hears, set apart so it can be read off the screen mid-call. */
const Script = ({ children }: { children: ReactNode }) => (
  <p className="mt-2 border-l-2 border-primary/60 bg-muted/40 py-2 pl-3 pr-2 text-foreground">&ldquo;{children}&rdquo;</p>
);

/**
 * Stage 1 — the first client call. The GM's sales playbook (Aziza_Home_Stage_1_Sales_Playbook.pdf,
 * 2026-10-19), written into the workspace rather than attached as a file so it is searchable, reads on a
 * phone during a call, and can never be an out-of-date copy on someone's desktop. The client-facing
 * wording is the GM's, kept as approved; change it only when she does.
 */
const SALES_PLAYBOOK: Section[] = [
  {
    title: "Aziza Home in one sentence",
    content: (
      <>
        Aziza Home provides <strong className="font-semibold text-foreground">A-to-Z turnkey furnishing and interior design</strong> for residential properties — from design concept and sourcing through procurement, delivery, installation, styling and final handover. The scope covers furniture, décor, curtains, lighting, appliances, rugs, artwork, accessories, balcony furniture, customised furniture where required, wall design depending on the package, and holiday-home essentials where included.
      </>
    ),
  },
  {
    title: "How we furnish",
    content: (
      <>
        A combination of <strong className="font-semibold text-foreground">ready-made and customised furniture</strong>, decided by the apartment&apos;s dimensions, the design, how the space has to work, the budget and what the market actually has. Ready-made where it fits the space and the design well; customised where the apartment needs a particular size, proportion or function.
      </>
    ),
  },
  {
    title: "How the design starts",
    content: (
      <>
        Share the <strong className="font-semibold text-foreground">design package catalogue first</strong>. If the client likes an existing concept, we adapt it to their property. If they want changes, the designer can modify or redesign it from the brief. Never design the apartment on the call.
      </>
    ),
  },
  {
    title: "Timeline and location",
    content: (
      <>
        Typical execution is <strong className="font-semibold text-foreground">about 10–25 business days</strong>, depending on unit size, layout, custom works, availability and building access. Dubai: standard package pricing generally applies. Outside Dubai — Abu Dhabi, Ras Al Khaimah — additional logistics and coordination charges may apply, <strong className="font-semibold text-foreground">typically around 10%, subject to confirmation</strong>.
      </>
    ),
  },
  {
    title: "The design disclaimer — say it before the contract is signed",
    content: (
      <>
        Moodboards and AI renders represent the intended design concept, colour palette, layout and aesthetic direction. We execute the apartment as closely as reasonably possible to the approved concept, but <strong className="font-semibold text-foreground">exact furniture and décor items may vary with market availability</strong>, and suitable alternatives may be used while keeping the same overall design direction. This is not small print to skip — a client who hears it on the first call does not raise it as a complaint at handover.
      </>
    ),
  },
  {
    title: "Where this lands in the system",
    content: (
      <>
        Everything you collect on the call goes straight onto the lead: <Link to="/workspace/leads" className={workspaceLink}>Leads</Link> → New lead. Fill property, unit type, handover status, use, scope, style, budget and target date while you are still on the phone — the designer&apos;s brief and the proposal are both built from those fields, so a thin lead costs you a second call. The floor plan and the client&apos;s reference photos go in the lead&apos;s Drive folder. When the client picks a direction, the next step is a <Link to="/workspace/proposals" className={workspaceLink}>proposal</Link>; the price comes from the GM, never from you.
      </>
    ),
  },
];

export const GUIDES: Record<WorkspaceRole, Section[]> = {
  gm: SALES_PLAYBOOK,
  sales: SALES_PLAYBOOK,
  designer: [],
  coordinator: [
    {
      title: "Where you work",
      content: (
        <>
          <Link to="/workspace" className={workspaceLink}>Dashboard</Link> — what needs you today. <Link to="/workspace/projects" className={workspaceLink}>Projects</Link> → a project → Procurement — your main screen; the FF&amp;E tab beside it is the designer&apos;s costed list, Procurement is the buying view. The <strong className="font-semibold text-foreground">Download list</strong> button on that screen gives you the whole item list to tick off on your final inspection walk-through. <Link to="/workspace/tasks" className={workspaceLink}>Tasks</Link> — anything with your name and a deadline. <Link to="/workspace/suppliers" className={workspaceLink}>Suppliers</Link> — who we buy from, their terms, and the online-retailer list.
        </>
      ),
    },
    {
      title: "Before you buy anything",
      content: <>If the project still needs the GM&apos;s budget approval you&apos;ll see a banner saying so. Don&apos;t order until it clears. The list is the scope: if an item isn&apos;t on it, it doesn&apos;t get bought.</>,
    },
    {
      title: "The order you buy in",
      content: (
        <>
          Nine buying runs, in this order: <strong className="font-semibold text-foreground">1 Cabinetry</strong> (24h — made to measure, longest lead time, start it on day one), <strong className="font-semibold text-foreground">2 Furniture</strong> (24h, trade suppliers), <strong className="font-semibold text-foreground">3 Curtains</strong> (24h), <strong className="font-semibold text-foreground">4 Online furniture</strong> (48h — Home Centre, Home Box, Pan Home, Ikea, Danube…), <strong className="font-semibold text-foreground">5 Appliances</strong> (48h), <strong className="font-semibold text-foreground">6 Dragon Mart pick-up</strong> (day 4 — anything you collect yourself, including all the wall and building material in the same trip), <strong className="font-semibold text-foreground">7 Household</strong> (day 5), <strong className="font-semibold text-foreground">8 Switches</strong> (the day the contractor goes in), <strong className="font-semibold text-foreground">9 Wallpaper</strong> (ordered by day 5, installed on delivery day). Runs 1 and 2 go to the factory as one order — cabinetry and furniture are ordered together. Switch the grouping to Priority to see them. The run is worked out from the item and its supplier; if one is filed wrong you can change it on the row.
        </>
      ),
    },
    {
      title: "Working through a supplier",
      content: <>Filter by supplier, then use &quot;Order all from …&quot; to raise one PO for everything from them. The search box finds an item in a long list. Opening an item&apos;s product link keeps your place — when you come back, the buying bar is still on that item and <strong className="font-semibold text-foreground">Next</strong> moves you through the list without scrolling.</>,
    },
    {
      title: "Cost",
      content: <>Enter the real unit cost when you buy — the GM&apos;s margin is calculated from it. Cheaper than costed: carry on. Dearer: it goes to the GM and the item is held until they decide.</>,
    },
    {
      title: "When something can't be bought",
      content: <>Push it back to the designer with a note; she re-chooses while the rest of the list keeps moving. If the whole list is unusable you can return all of it. A held item can&apos;t be moved to an ordering stage, and bulk actions skip it and tell you how many were skipped.</>,
    },
    {
      title: "Moving an item along",
      content: <>Awaiting Quote → Quote Received → Negotiation → Awaiting Approval → Payment Required → Ordered → Supplier Confirmed → In Production → Ready for Delivery → Delivery Scheduled → Delivered → Installation Pending → Installed → Closed, with Issue / Replacement when something goes wrong. Record the PO reference, order date, ETA, and the delivered and installed dates as they happen. The project&apos;s procurement percentage is calculated from these — you never type it.</>,
    },
    {
      title: "Building Material",
      content: <>An internal section for paint, adhesive, fixings and the like. Real purchases for you; it never appears on the client&apos;s proposal or contract. It is bought on the <strong className="font-semibold text-foreground">Dragon Mart pick-up run (6)</strong>, collected in the same trip as the Dragon Mart items. A switch listed in this section is still bought on the switch run, to the contractor&apos;s count.</>,
    },
    {
      title: "What you can't see, and why",
      content: <>You see cost, never the contract value or the margin. Sales sees the price and never the cost. That split is deliberate — don&apos;t ask for it to be opened up, ask the GM for whatever number you actually need.</>,
    },
    {
      title: "Who hears about what",
      content: <>Change anything on a confirmed list and the GM is told. Push an item back and the designer is told and gets a 48-hour task. Moving the project&apos;s own stage is yours to do — sales can&apos;t.</>,
    },
    {
      title: "The project around you",
      content: <>Contract / Deposit → Design → Production → Installation → Snagging → Handover → Closed. Procurement runs alongside from signing, so you start buying while the designer is still drawing.</>,
    },
  ],
};

const Guide = () => {
  const { member } = useWorkspace();
  const role = member?.role as WorkspaceRole | undefined;
  const sections = role ? GUIDES[role] : [];
  const isGm = role === "gm";
  const salesView = role === "sales" || isGm;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {salesView && (
        <section className="border-l-2 border-primary pl-4 sm:pl-5">
          <h2 className="font-heading text-lg uppercase tracking-wide text-foreground">Stage 1 in one line</h2>
          <p className="mt-2 text-base leading-7 text-foreground">
            Qualify the lead, explain Aziza Home clearly, build trust and agree the next step.
            {isGm ? " This is the first-call playbook your sales team works from." : " Do not try to design or solve the whole project on the first call."}
          </p>
        </section>
      )}

      {salesView && (
        <section className="rounded-[var(--radius)] border border-border bg-card p-4 sm:p-5">
          <h2 className="font-heading text-lg uppercase tracking-wide text-foreground">The first call, in order</h2>
          <div className="mt-2 space-y-4 text-sm leading-6 text-muted-foreground sm:text-[15px] sm:leading-7">
            <Script>
              Hi [client name], this is [your name] from Aziza Home. Thank you for your enquiry. I would just like to
              understand a little more about your property and what you are looking for, so I can recommend the most
              suitable furnishing option for you.
            </Script>
            <div>
              <h3 className="font-semibold text-foreground">A · Property</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>Where is it? Building, community, emirate.</li>
                <li>What type — studio, 1BR, 2BR, 3BR, townhouse, villa?</li>
                <li>Has it been handed over yet?</li>
                <li>Do you have the floor plan, or photos and videos of the unit?</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">B · Intended use</h3>
              <p className="mt-1">Own use, long-term rental, or holiday home? This one answer changes the whole scope.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">C · Scope</h3>
              <p className="mt-1">Furniture only, or the complete turnkey solution? Curtains, lighting, appliances, décor, wall design, balcony, kitchenware and holiday-home essentials — ask about each one rather than assuming.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">D · Style</h3>
              <p className="mt-1">Do they already have a preferred style or a reference? If not, tell them the Aziza Home design catalogue is coming.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">E · Budget</h3>
              <p className="mt-1">Ask for an approximate furnishing budget. If they will not give one:</p>
              <Script>
                That is absolutely fine. We can first show you our package options and design directions, and then
                recommend the most suitable solution based on the property and the scope.
              </Script>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">F · Timing</h3>
              <p className="mt-1">When do they want it finished, and is there a hard deadline — move-in, a tenant starting, photography, an Airbnb launch, the first guest?</p>
            </div>
          </div>
        </section>
      )}

      {salesView && (
        <section className="rounded-[var(--radius)] border border-border bg-card p-4 sm:p-5">
          <h2 className="font-heading text-lg uppercase tracking-wide text-foreground">What they ask, and what to answer</h2>
          <div className="mt-2 space-y-4 text-sm leading-6 text-muted-foreground sm:text-[15px] sm:leading-7">
            <div>
              <h3 className="font-semibold text-foreground">&ldquo;Will it look exactly like the render?&rdquo;</h3>
              <Script>
                We aim to achieve the final result as closely as possible to the approved concept and keep the same
                overall aesthetic, colours and design direction. Because market stock changes, some exact furniture or
                décor items may vary. If something is unavailable, we source the closest suitable alternative.
              </Script>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">&ldquo;Is everything ready-made?&rdquo;</h3>
              <Script>
                We use both ready-made and customised furniture. Ready-made products are used where they fit the space
                and the design well. If the apartment requires a specific size, proportion or function, we can customise
                certain pieces.
              </Script>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">&ldquo;How long does it take?&rdquo;</h3>
              <Script>
                The typical execution period is approximately 10 to 25 business days, depending on the property size,
                design complexity, custom works, product availability and building access. Once we understand the full
                scope, we can give you a more accurate estimated timeline.
              </Script>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">&ldquo;Do you work outside Dubai?&rdquo;</h3>
              <Script>
                Yes. We can handle projects in other emirates such as Abu Dhabi and Ras Al Khaimah. An additional
                logistics and coordination charge may apply, usually around 10%, depending on location and scope. We
                will confirm this in the proposal.
              </Script>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">&ldquo;How much will it cost?&rdquo;</h3>
              <Script>
                The final price depends on the unit size, scope, design level and whether you need wall design, custom
                furniture, appliances or holiday-home essentials. Once I understand your requirements and preferred
                design direction, we can recommend the suitable package and prepare the proposal.
              </Script>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">&ldquo;Another company is cheaper.&rdquo;</h3>
              <Script>
                Of course, there are different price levels in the market. With Aziza Home the service is not only
                furniture supply — we manage the design, sourcing, procurement, supplier coordination, delivery,
                installation, styling and final handover as one complete solution. We can also help you compare
                quotations like-for-like once the scopes are clear.
              </Script>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">How to explain the service, unprompted</h3>
              <Script>
                Based on what you have shared, we can provide the full turnkey solution. We normally start by sharing
                our design catalogue so you can identify the style you prefer. If you like one of our existing designs,
                we adapt it to your property. If you want something more personalised, our designer can redesign the
                concept from your requirements. We use a combination of ready-made and customised furniture depending on
                the dimensions, the design and availability. Once the design is approved, our team handles procurement,
                supplier coordination, delivery, installation, styling and handover.
              </Script>
            </div>
          </div>
        </section>
      )}

      {salesView && (
        <section className="rounded-[var(--radius)] border border-destructive/40 bg-destructive/5 p-4 sm:p-5">
          <h2 className="font-heading text-lg uppercase tracking-wide text-foreground">Never promise on the first call</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground sm:text-[15px] sm:leading-7">
            <li>An exact completion date before the scope is checked</li>
            <li>Exact product availability</li>
            <li>The exact furniture shown in an AI render</li>
            <li>Free changes, upgrades or extra scope</li>
            <li>A discount or special payment terms without approval — the GM sets every price</li>
            <li>Unlimited revisions</li>
            <li>That a custom piece is feasible, before it is measured</li>
            <li>When a building permit will be approved</li>
          </ul>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-[15px] sm:leading-7">When you are not sure, say so and come back:</p>
          <Script>Let me confirm this with our design, operations or management team and come back to you.</Script>
        </section>
      )}

      {salesView && (
        <section className="rounded-[var(--radius)] border border-border bg-card p-4 sm:p-5">
          <h2 className="font-heading text-lg uppercase tracking-wide text-foreground">Before you hang up</h2>
          <div className="mt-2 space-y-4 text-sm leading-6 text-muted-foreground sm:text-[15px] sm:leading-7">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">You must have</th>
                    <th className="py-2 font-medium">Minimum</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Client", "Name, phone, email"],
                    ["Property", "Location, building, unit type, handover status, floor plan or photos"],
                    ["Use", "Own use, long-term rental or holiday home"],
                    ["Scope", "Furniture, curtains, lighting, appliances, décor, wall design, kitchenware, balcony"],
                    ["Commercial", "Approximate budget and target completion date"],
                    ["Design", "Preferred style, and reference images if they have them"],
                  ].map(([k, v]) => (
                    <tr key={k} className="border-b border-border/60 last:border-0 align-top">
                      <td className="py-2 pr-4 font-medium text-foreground whitespace-nowrap">{k}</td>
                      <td className="py-2">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Closing — when the catalogue is the next step</h3>
              <Script>
                Thank you, that gives me a good understanding of what you are looking for. I will send you our design
                catalogue now so you can review the different styles. Once you let me know which direction you prefer,
                we can prepare the suitable proposal or arrange a site visit if required.
              </Script>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Closing — when the unit is already handed over</h3>
              <Script>
                Since your apartment has already been handed over, the next best step would be for us to review the
                floor plan and arrange a site visit if required, so we can understand the space properly.
              </Script>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Stage 1 is done when</h3>
              <ul className="mt-1 space-y-1">
                {[
                  "Property understood",
                  "Client's purpose understood",
                  "Scope understood",
                  "Budget direction understood",
                  "Timeline understood",
                  "Design catalogue sent, or the design direction identified",
                  "Next action agreed",
                ].map((x) => <li key={x} className="flex gap-2"><span aria-hidden="true" className="text-primary">☐</span><span>{x}</span></li>)}
              </ul>
            </div>
            <p className="italic">Stage 1 is qualification, trust and the next step — not the whole project.</p>
          </div>
        </section>
      )}

      {role === "coordinator" && (
        <section className="border-l-2 border-primary pl-4 sm:pl-5">
          <h2 className="font-heading text-lg uppercase tracking-wide text-foreground">Your job in one line</h2>
          <p className="mt-2 text-base leading-7 text-foreground">Everything the designer specified gets bought, delivered and installed — on time, at or under the costed price, with nothing forgotten.</p>
        </section>
      )}

      {role === "coordinator" && (
        <section className="rounded-[var(--radius)] border border-border bg-card p-4 sm:p-5">
          <h2 className="font-heading text-lg uppercase tracking-wide text-foreground">Your deadlines</h2>
          <div className="mt-2 space-y-3 text-sm leading-6 text-muted-foreground sm:text-[15px] sm:leading-7">
            <p>These tasks appear on <Link to="/workspace/tasks" className={workspaceLink}>Tasks</Link> by themselves; you never create them.</p>
            <div>
              <h3 className="font-semibold text-foreground">From the moment the FF&amp;E list is confirmed.</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Cabinetry and furniture ordered <strong className="font-semibold text-foreground">together within 24 hours</strong> — and ask the factory for a delivery date and put it on the rows as the ETA, because the whole site programme is built on that date.</li>
                <li>The <strong className="font-semibold text-foreground">curtain supplier told within 24 hours</strong> and brought to the apartment to measure.</li>
                <li><strong className="font-semibold text-foreground">Online furniture and appliances within 48 hours.</strong></li>
                <li><strong className="font-semibold text-foreground">Dragon Mart pick-up on day 4</strong> — the Dragon Mart items and all the wall and building material in one trip.</li>
                <li><strong className="font-semibold text-foreground">Household items and the wallpaper ordered by day 5.</strong></li>
                <li><strong className="font-semibold text-foreground">Switches on the day the contractor goes in</strong> — ask him how many he needs, order them, book a porter and get them to the apartment.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">When a drawing lands.</h3>
              <p>Each drawing the designer uploads creates its own task: order everything that drawing specifies <strong className="font-semibold text-foreground">within 24 hours</strong> of it arriving.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">The site run, before handover.</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li><strong className="font-semibold text-foreground">Wall design work finished</strong> — the contractor can only start once the cabinetry is in, so his date follows the factory&apos;s delivery date.</li>
                <li><strong className="font-semibold text-foreground">Your first visit inside</strong> — the day he finishes: check the wall work, check what is already in the apartment and list what is still missing.</li>
                <li><strong className="font-semibold text-foreground">The designer&apos;s drawings for where everything goes</strong> — lights, wall art and mirrors, in your hands before any hanging starts.</li>
                <li><strong className="font-semibold text-foreground">Everything delivered on site.</strong></li>
                <li><strong className="font-semibold text-foreground">Ali and the wallpaper — the same day as the delivery</strong>, working to those drawings: light fixtures, wall art, mirrors and the small installations.</li>
                <li><strong className="font-semibold text-foreground">Operations — final unpack and cleaning</strong>, the day after delivery. This must finish <strong className="font-semibold text-foreground">at least two days before handover</strong>, so there is a day left to rectify anything wrong.</li>
                <li><strong className="font-semibold text-foreground">Your final visit</strong> — download the item list from Procurement and walk the apartment against it item by item, raising a snag for anything missing or wrong.</li>
              </ol>
            </div>
            <p className="italic">These dates move by themselves when the handover date changes, and nothing is ever scheduled on handover day itself. On a compressed job the later steps stack onto the last day available, and the project page shows a warning when the clean cannot finish two days before handover.</p>
          </div>
        </section>
      )}

      <div className="space-y-3">
        {sections.map((section) => (
          <section key={section.title} className="rounded-[var(--radius)] border border-border bg-card p-4 sm:p-5">
            <h2 className="font-heading text-lg uppercase tracking-wide text-foreground">{section.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-[15px] sm:leading-7">{section.content}</p>
          </section>
        ))}
      </div>

      {sections.length > 0 && (
        <p className="border-t border-border pt-5 text-sm text-muted-foreground">
          {isGm
            ? "This page is the one the sales team reads, so there is no second copy to keep in step: when the playbook changes, change it here."
            : "Questions, or anything here that looks wrong, tell the GM."}
        </p>
      )}
    </div>
  );
};

export default Guide;