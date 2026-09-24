import { Navigate, Route, Routes } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "./signOut";
import { WorkspaceProvider, useWorkspace } from "./WorkspaceProvider";
import { canSee, type WorkspacePage, type WorkspaceRole } from "./access";
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
import Reports from "./pages/Reports";
import ProposalDoc from "./ProposalDoc";

const Guard = ({ page, role, children }: { page: WorkspacePage; role: WorkspaceRole; children: ReactElement }) =>
  canSee(role, page) ? children : <Navigate to="/workspace" replace />;

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
        <Route path="leads" element={<Guard page="leads" role={role}><Leads /></Guard>} />
        <Route path="leads/:id" element={<Guard page="leads" role={role}><LeadDetail /></Guard>} />
        <Route path="briefs" element={<Guard page="briefs" role={role}><Briefs /></Guard>} />
        <Route path="proposals" element={<Guard page="proposals" role={role}><Proposals /></Guard>} />
        <Route path="proposals/:leadId" element={<Guard page="proposals" role={role}><ProposalDoc /></Guard>} />
        <Route path="reports" element={<Guard page="reports" role={role}><Reports /></Guard>} />
        <Route path="projects" element={<Guard page="projects" role={role}><Projects /></Guard>} />
        <Route path="projects/:code" element={<Guard page="projects" role={role}><ProjectDetail /></Guard>} />
        <Route path="tasks" element={<Guard page="tasks" role={role}><Tasks /></Guard>} />
        <Route path="suppliers" element={<Guard page="suppliers" role={role}><Suppliers /></Guard>} />
        <Route path="settings" element={<Guard page="settings" role={role}><Settings /></Guard>} />
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
  </WorkspaceProvider>
);

export default WorkspaceApp;
