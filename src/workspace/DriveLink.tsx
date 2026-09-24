import { ExternalLink } from "lucide-react";

export const DRIVE_ERROR = "Enter a full link starting with https://";
export const DRIVE_HINT = "That is not a Google Drive link — fine if intended.";

/** Validate a pasted folder link. Helpful, not strict: any https URL passes; non-Drive hosts only get a hint. */
export const checkDriveUrl = (raw: string): { value: string | null; error?: string; hint?: string } => {
  const value = raw.trim();
  if (!value) return { value: null };
  if (!/^https:\/\//i.test(value)) return { value, error: DRIVE_ERROR };
  let host = "";
  try { host = new URL(value).hostname.toLowerCase(); } catch { return { value, error: DRIVE_ERROR }; }
  const drive = host === "drive.google.com" || host === "docs.google.com";
  return { value, hint: drive ? undefined : DRIVE_HINT };
};

/** Read-only rendering: a real link labelled "Open Drive folder", never the raw URL. */
export const DriveLink = ({ url, className }: { url: string | null | undefined; className?: string }) =>
  url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={className ?? "inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"}
    >
      Open Drive folder <ExternalLink className="h-3.5 w-3.5" aria-hidden />
    </a>
  ) : null;
