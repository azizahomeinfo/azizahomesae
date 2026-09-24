import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { signOut } from "./signOut";
import { cn } from "@/lib/utils";
import logo from "@/assets/aziza-logo.png";
import { useWorkspace } from "./WorkspaceProvider";
import { PAGES_BY_ROLE, PAGE_META, ROLE_LABEL, type WorkspacePage, type WorkspaceRole } from "./access";
import NotificationBell from "./NotificationBell";

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

const SidebarBody = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { member } = useWorkspace();
  if (!member) return null;
  const role = member.role as WorkspaceRole;
  return (
    <div className="flex h-full flex-col">
      <div className="p-5 space-y-2">
        <img src={logo} alt="Aziza Home" className="h-10 w-auto" />
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Workspace</p>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {PAGES_BY_ROLE[role].map((p) => (
          <NavLink
            key={p}
            to={PAGE_META[p].path}
            end={p === "dashboard"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "block rounded-[var(--radius)] px-3 py-2 text-sm transition-colors",
                isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted/20",
              )
            }
          >
            {PAGE_META[p].label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
            {initials(member.full_name)}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-foreground truncate">{member.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{member.title || ROLE_LABEL[role]}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
};

const pageFromPath = (path: string): WorkspacePage => {
  const seg = path.replace(/^\/workspace\/?/, "").split("/")[0];
  return (seg && seg in PAGE_META ? seg : "dashboard") as WorkspacePage;
};

const WorkspaceLayout = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const meta = PAGE_META[pageFromPath(pathname)];

  return (
    <div className="min-h-screen bg-background text-foreground font-body md:flex">
      <aside className="hidden md:block w-[232px] shrink-0 sticky top-0 h-screen bg-card border-r border-border">
        <SidebarBody />
      </aside>
      <div className="flex-1 min-w-0">
        <div className="md:hidden flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <img src={logo} alt="Aziza Home" className="h-8 w-auto" />
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu"><Menu /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[232px] p-0 bg-card">
                <SidebarBody onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
        </div>
        <main className="p-4 md:p-8 space-y-6">
          <header className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <p className="text-[11px] uppercase tracking-[0.25em] text-primary">Aziza Workspace</p>
              <h1 className="font-heading uppercase text-3xl tracking-wide">{meta.label}</h1>
              <p className="text-sm text-muted-foreground">{meta.description}</p>
            </div>
            <div className="hidden md:block">
              <NotificationBell />
            </div>
          </header>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default WorkspaceLayout;
