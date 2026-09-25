import { ContractPaper } from "./workspace/ContractDoc";
import { buildContract } from "./workspace/contractModel";
import { sectionsForLayout } from "./workspace/briefSchema";
const groups = sectionsForLayout("3 Bedroom").map((s) => ({ room: s.title, items: s.items.map((i) => ({ item: i.item, qty: Number(i.std) || 1 })) }));
const d = { ...buildContract({ lead: { name: "Björn Test", unit_type: "3 Bedroom", building: "Tower A", property: "Sobha Hartland", use_type: "Holiday home" }, unit: "1204", option: { label: "Option A", amount: 172916 }, vat: 5, down: 50, groups }), delivery: 20 };
export default function T() { return <ContractPaper d={d} />; }
