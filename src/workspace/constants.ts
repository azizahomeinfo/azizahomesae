export const LEAD_STATUSES = ["New Lead", "Contacted", "Qualified", "Proposal Sent", "Won", "Lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_HELP: Record<LeadStatus, string> = {
  "New Lead": "Enquiry received — not yet contacted.",
  Contacted: "First call or WhatsApp done; needs and timing being discussed.",
  Qualified: "Budget, scope and timing confirmed. Complete the requirement brief for design.",
  "Proposal Sent": "Quotation and design proposal shared with the client.",
  Won: "Contract signed and deposit received — ready to convert to a project.",
  Lost: "Closed without a contract.",
};

export const AREAS = ["Dubai Marina", "Downtown Dubai", "Business Bay", "Dubai Harbour", "JVC", "Creek Harbour", "Palm Jumeirah", "Dubai Hills", "Other"];
export const UNIT_TYPES = ["Studio", "1 Bedroom", "2 Bedroom", "3 Bedroom", "3 Bedroom + Maid", "4 Bedroom", "4 Bedroom + Maid"];
export const USES = ["Holiday home", "Short-term rental", "Long-term rental", "Own use"];
export const SCOPES = ["Aziza Essential", "Aziza Premium", "Aziza Luxury", "Full furnishing", "Furniture + décor", "Other"];
export const SOURCES = ["Instagram", "Website", "Google", "Referral", "Agent referral", "WhatsApp", "Walk-in", "Other"];
export const HANDOVER_STATUSES = ["Handed over", "Pending handover"];

export const isClosed = (s: string) => s === "Won" || s === "Lost";
