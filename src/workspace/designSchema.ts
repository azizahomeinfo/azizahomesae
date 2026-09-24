export const DESIGN_AREAS = [
  "Living & Dining", "Living Room", "Dining", "Entrance", "Kitchen", "Master Bedroom",
  "Bedroom 2", "Bedroom 3", "Bedroom 4", "Maid's Room", "Bathrooms", "Balcony",
  "Floor Plan", "Mood Board", "Other",
] as const;
export type DesignArea = (typeof DESIGN_AREAS)[number];

export const DESIGN_KINDS = ["3D render", "Mood board", "Floor plan", "Material board"] as const;
export type DesignKind = (typeof DESIGN_KINDS)[number];

export const REJECT_REASONS = [
  "Client wants changes", "Doesn’t match the brief", "Over budget",
  "Missing rooms or items", "Quality of renders", "Other",
] as const;

export const kindForArea = (area: string): DesignKind =>
  area === "Mood Board" ? "Mood board" : area === "Floor Plan" ? "Floor plan" : "3D render";

export const DESIGN_STATUSES = ["Draft", "Submitted", "Accepted", "Rejected"] as const;
export type DesignStatus = (typeof DESIGN_STATUSES)[number];

export const DESIGN_STATUS_LABEL: Record<DesignStatus, string> = {
  Draft: "In progress",
  Submitted: "Awaiting review",
  Accepted: "Accepted",
  Rejected: "Changes requested",
};

export const MAX_EDGE = 1600;
export const JPEG_QUALITY = 0.82;
export const SIGNED_URL_TTL = 3600;
