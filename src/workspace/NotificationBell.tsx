import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-ssr";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useWorkspace } from "./WorkspaceProvider";
import { keys, useMarkNotificationsRead, useNotifications } from "./queries";

const NotificationBell = () => {
  const { member } = useWorkspace();
  const uid = member?.user_id;
  const qc = useQueryClient();
  const { data } = useNotifications(uid);
  const markRead = useMarkNotificationsRead();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const channel = supabase
      .channel(`ws-notifications-${uid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
        () => qc.invalidateQueries({ queryKey: keys.notifications(uid) }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, qc]);

  if (!uid) return null;
  const items = data?.items ?? [];
  const unread = data?.unread ?? 0;

  const markAll = async () => {
    try {
      await markRead.mutateAsync({ uid });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not mark as read");
    }
  };

  const openOne = (id: string, read: boolean) => {
    setOpen(false);
    if (!read) markRead.mutate({ uid, ids: [id] });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}>
          <Bell />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] leading-[18px] text-center px-1">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(360px,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <p className="text-sm text-foreground">Notifications</p>
          <Button variant="ghost" size="sm" onClick={markAll} disabled={!unread || markRead.isPending}>Mark all read</Button>
        </div>
        {items.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">You're all caught up.</p>
        ) : (
          <ul className="max-h-[60vh] overflow-y-auto divide-y divide-border">
            {items.map((n) => {
              const inner = (
                <>
                  <p className="text-sm text-foreground">{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </>
              );
              const cls = cn("block px-4 py-3 hover:bg-muted/20", !n.read && "bg-primary/5");
              return (
                <li key={n.id}>
                  {n.lead_id ? (
                    <Link to={`/workspace/leads/${n.lead_id}`} className={cls} onClick={() => openOne(n.id, n.read)}>{inner}</Link>
                  ) : (
                    <button type="button" className={cn(cls, "w-full text-left")} onClick={() => openOne(n.id, n.read)}>{inner}</button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
