import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase-ssr";
import type { Database } from "@/integrations/supabase/types";

export type WorkspaceMember = Database["public"]["Tables"]["workspace_members"]["Row"];

interface Ctx {
  session: Session | null;
  member: WorkspaceMember | null;
  loading: boolean;
}

const WorkspaceContext = createContext<Ctx | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<WorkspaceMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadMember = async (s: Session | null) => {
      if (!s) {
        if (!cancelled) {
          setMember(null);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("user_id", s.user.id)
        .maybeSingle();
      if (!cancelled) {
        setMember(data && data.active ? data : null);
        setLoading(false);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(true);
      // defer DB call out of the auth callback
      setTimeout(() => loadMember(s), 0);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadMember(data.session);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <WorkspaceContext.Provider value={{ session, member, loading }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
};
