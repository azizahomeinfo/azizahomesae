import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "../WorkspaceProvider";
import type { WorkspaceRole } from "../access";

type Section = {
  title: string;
  content: ReactNode;
};

const workspaceLink = "font-medium text-primary underline-offset-4 hover:underline";

export const GUIDES: Record<WorkspaceRole, Section[]> = {
  gm: [],
  sales: [],
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

  return (
    <div className="mx-auto max-w-3xl space-y-5">
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
              <p>Online and large furniture — Pan Home, Home Centre, Home Box and the big pieces — ordered <strong className="font-semibold text-foreground">within 24 hours</strong>. Everything else on the list ordered <strong className="font-semibold text-foreground">within 72 hours</strong>.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">When a drawing lands.</h3>
              <p>Each drawing the designer uploads creates its own task: order everything that drawing specifies <strong className="font-semibold text-foreground">within 24 hours</strong> of it arriving.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">The site run, before handover.</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li><strong className="font-semibold text-foreground">Wall design work</strong> — the contractor finishes the walls. Delivery follows; on a tight programme they can overlap, but the walls lead.</li>
                <li><strong className="font-semibold text-foreground">Everything delivered on site.</strong></li>
                <li><strong className="font-semibold text-foreground">Ali, and the wallpaper</strong> — hanging items, light fixtures, wall art and the small installations. Wallpaper runs the same day.</li>
                <li><strong className="font-semibold text-foreground">Operations</strong> — final unpack and cleaning.</li>
                <li><strong className="font-semibold text-foreground">You on site</strong> — the quality check.</li>
              </ol>
            </div>
            <p className="italic">These dates move by themselves if the handover date changes. Nothing is ever scheduled on handover day itself.</p>
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
        <p className="border-t border-border pt-5 text-sm text-muted-foreground">Questions, or anything here that looks wrong, tell the GM.</p>
      )}
    </div>
  );
};

export default Guide;