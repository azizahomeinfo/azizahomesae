/**
 * Print with a proper file name. Browsers suggest the page title as the PDF's file name, so the title is set
 * for the print and put back after: "Aziza Home Proposal - Client - Building".
 */
export const docFileName = (kind: string, client: string | null | undefined, building: string | null | undefined) =>
  ["Aziza Home " + kind, client?.trim(), building?.trim()]
    .filter((p): p is string => !!p)
    // file-name safe: no slashes, colons or other characters macOS/Windows refuse
    .map((p) => p.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim())
    .join(" - ");

export const printAs = (fileName: string) => {
  const before = document.title;
  const restore = () => { document.title = before; window.removeEventListener("afterprint", restore); };
  document.title = fileName;
  window.addEventListener("afterprint", restore);
  // Restored only on afterprint: Safari's print() can return before the user saves, and resetting the
  // title then would lose the name. If afterprint never fires, the title simply stays as the file name.
  window.print();
};
