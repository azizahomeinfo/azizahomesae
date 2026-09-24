import type { WorkspaceRole } from "./access";

export type BriefStatus =
  | "Draft" | "Submitted" | "Assigned" | "In Design" | "Design Ready" | "Design Approved" | "Revision Requested";

export const BRIEF_STATUSES: BriefStatus[] = [
  "Draft", "Submitted", "Assigned", "In Design", "Design Ready", "Revision Requested", "Design Approved",
];

export const BRIEF_LABEL: Record<BriefStatus, string> = {
  Draft: "Draft",
  Submitted: "Awaiting designer",
  Assigned: "Assigned",
  "In Design": "In Design",
  "Design Ready": "Awaiting sales review",
  "Design Approved": "Design Approved",
  "Revision Requested": "Rejected · revision",
};

export interface Actor {
  userId: string;
  role: WorkspaceRole;
  isSalesOwner: boolean;
  isAssignedDesigner: boolean;
}

const isSalesSide = (a: Actor) => a.role === "gm" || a.isSalesOwner;

/** Which parts of the brief this person may edit at this status. Mirrors the database guard. */
export const editRights = (status: BriefStatus, a: Actor) => {
  const full = isSalesSide(a) && (status === "Draft" || status === "Revision Requested");
  const designer = (a.isAssignedDesigner || a.role === "gm") && (status === "Assigned" || status === "In Design");
  return { full, ffeAndColours: full || designer };
};

export type BriefAction =
  | { kind: "submit"; label: string; to: "Submitted" }
  | { kind: "assign"; label: string; to: "Assigned" }
  | { kind: "start"; label: string; to: "In Design" }
  | { kind: "ready"; label: string; to: "Design Ready" }
  | { kind: "approve"; label: string; to: "Design Approved" }
  | { kind: "revise"; label: string; to: "Revision Requested" }
  | { kind: "resume"; label: string; to: "In Design" };

export const availableActions = (status: BriefStatus, a: Actor): BriefAction[] => {
  const out: BriefAction[] = [];
  const des = a.isAssignedDesigner;
  switch (status) {
    case "Draft":
      if (isSalesSide(a)) out.push({ kind: "submit", label: "Submit to design", to: "Submitted" });
      break;
    case "Submitted":
      if (a.role === "gm") out.push({ kind: "assign", label: "Assign designer", to: "Assigned" });
      break;
    case "Assigned":
      if (des) out.push({ kind: "start", label: "Start design", to: "In Design" });
      break;
    case "In Design":
      if (des) out.push({ kind: "ready", label: "Mark design ready", to: "Design Ready" });
      break;
    case "Design Ready":
      if (isSalesSide(a)) {
        out.push({ kind: "approve", label: "Approve design", to: "Design Approved" });
        out.push({ kind: "revise", label: "Request revision", to: "Revision Requested" });
      }
      break;
    case "Revision Requested":
      if (des) out.push({ kind: "resume", label: "Resume design", to: "In Design" });
      break;
  }
  return out;
};
