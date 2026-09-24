import { buildDocument } from "./proposalModel";
import { PROPOSAL_CSS, ProposalPages } from "./ProposalPages";

// TEMPORARY verification page — removed after the A4 check.
const rooms = ["Living & Dining", "Kitchenware & Tabletop", "Appliances", "Master Bedroom", "Guest Bedroom 1", "Guest Bedroom 2", "Bathroom", "DTCM", "Balcony"];
const groups = rooms.map((room, r) => ({ room, items: Array.from({ length: 10 }, (_, i) => ({ item: `${room.split(" ")[0]} item ${i + 1} with a longer name`, qty: (i % 3) + 1 })) }));
const imgs = ["/blog-dubai-investment.jpg", "/blog-furnish-home.jpg", "/blog-holiday-roi-marina.jpg"];
const mode = new URLSearchParams(location.search).get("opts") ?? "2";
const options = [
  { label: "Option A", desc: "Full furnishing, appliances & styling", amount: 181562 },
  { label: "Option B", desc: "Furnishing without appliances", amount: 149000 },
].slice(0, Number(mode));
const doc = buildDocument({
  lead: { name: "Stella Test Client", property: "Marina Gate 2", building: null, location: "Dubai Marina", unit_type: "3BR", scope: null, budget: 150000 },
  style: "Contemporary",
  design: { id: "d", version: 2, status: "Accepted", images: [
    ...imgs.map((p) => ({ storage_path: p, caption: null, room: "Living & Dining", kind: "3D render", file_name: null })),
    { storage_path: imgs[1], caption: null, room: "Master Bedroom", kind: "3D render", file_name: null },
    { storage_path: imgs[2], caption: null, room: "Mood Board", kind: "Mood board", file_name: null },
  ] },
  quote: { version: 1, options }, groups: Number(new URLSearchParams(location.search).get("small")) ? groups.slice(0, 3) : groups,
});
const Harness = () => (<><style>{PROPOSAL_CSS}</style><ProposalPages doc={doc} url={(p) => p ?? undefined} /></>);
export default Harness;
