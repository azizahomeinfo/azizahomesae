import { Link, Navigate, Route, Routes } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "./signOut";
import { WorkspaceProvider, useWorkspace } from "./WorkspaceProvider";
import { canSeeAny, type WorkspacePage, type WorkspaceRole } from "./access";
import Login from "./Login";
import WorkspaceLayout from "./WorkspaceLayout";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import LeadDetail from "./pages/LeadDetail";
import Briefs from "./pages/Briefs";
import Proposals from "./pages/Proposals";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import ProjectDetail from "./pages/ProjectDetail";
import Settings from "./pages/Settings";
import Suppliers from "./pages/Suppliers";
import Guide from "./pages/Guide";
import Reports from "./pages/Reports";
import ProposalDoc from "./ProposalDoc";
import ContractDoc from "./ContractDoc";
import { UpdateNotice } from "./UpdateNotice";

// Both of someone's roles open their pages: a designer who also coordinates gets the coordinator's too.
const Guard = ({ page, member, children }: { page: WorkspacePage; member: { role: string; second_role?: string | null } | null; children: ReactElement }) =>
  canSeeAny(member, page) ? children : (
    <div className="space-y-4">
      <Link to="/workspace" className="text-sm text-muted-foreground hover:text-primary">← Dashboard</Link>
      <p className="text-muted-foreground">You don't have access to this page.</p>
    </div>
  );

const Gate = () => {
  const { session, member, loading } = useWorkspace();

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }
  if (!session) return <Login />;
  if (!member) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-[var(--radius)] border border-border bg-card p-8 text-center space-y-6">
          <p className="font-body text-foreground">This account has no workspace access.</p>
          <Button onClick={signOut}>Sign out</Button>
        </div>
      </div>
    );
  }

  const role = member.role as WorkspaceRole;
  return (
    <Routes>
      <Route element={<WorkspaceLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="leads" element={<Guard page="leads" member={member}><Leads /></Guard>} />
        <Route path="leads/:id" element={<Guard page="leads" member={member}><LeadDetail /></Guard>} />
        <Route path="briefs" element={<Guard page="briefs" member={member}><Briefs /></Guard>} />
        <Route path="proposals" element={<Guard page="proposals" member={member}><Proposals /></Guard>} />
        <Route path="proposals/:leadId" element={<Guard page="proposals" member={member}><ProposalDoc /></Guard>} />
        <Route path="contracts/:leadId" element={<Guard page="contracts" member={member}><ContractDoc /></Guard>} />
        <Route path="reports" element={<Guard page="reports" member={member}><Reports /></Guard>} />
        <Route path="projects" element={<Guard page="projects" member={member}><Projects /></Guard>} />
        <Route path="projects/:code" element={<Guard page="projects" member={member}><ProjectDetail /></Guard>} />
        <Route path="tasks" element={<Guard page="tasks" member={member}><Tasks /></Guard>} />
        <Route path="suppliers" element={<Guard page="suppliers" member={member}><Suppliers /></Guard>} />
        <Route path="guide" element={<Guard page="guide" member={member}><Guide /></Guard>} />
        <Route path="settings" element={<Guard page="settings" member={member}><Settings /></Guard>} />
        <Route path="*" element={<Navigate to="/workspace" replace />} />
      </Route>
    </Routes>
  );
};

const WorkspaceApp = () => (
  <WorkspaceProvider>
    <Helmet>
      <title>Workspace · Aziza Home</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
    <Gate />
    <UpdateNotice />
  </WorkspaceProvider>
);

export default WorkspaceApp;
