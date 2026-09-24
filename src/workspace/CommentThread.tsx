import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-ssr";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useWorkspace } from "./WorkspaceProvider";
import { keys, useComments, useMembers, usePostComment, type CommentParent, type MemberLite } from "./queries";
import { initials } from "./format";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Render body with @Name mentions highlighted for the people actually mentioned. */
const renderBody = (body: string, mentioned: MemberLite[]): ReactNode => {
  if (!mentioned.length) return body;
  const names = [...mentioned].sort((a, b) => b.full_name.length - a.full_name.length).map((m) => escapeRe(m.full_name));
  const re = new RegExp(`(@(?:${names.join("|")}))`, "g");
  return body.split(re).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="rounded px-1 bg-primary/10 text-primary">{part}</span>
    ) : (
      part
    ),
  );
};

type ThreadProps =
  | { leadId: string; projectId?: never; parentName: string }
  | { projectId: string; leadId?: never; parentName: string };

const CommentThread = ({ leadId, projectId, parentName }: ThreadProps) => {
  const parent: CommentParent = leadId ? { kind: "lead", id: leadId } : { kind: "project", id: projectId! };
  const parentKey = `${parent.kind}:${parent.id}`;
  const qc = useQueryClient();
  const { member } = useWorkspace();
  const { data: comments = [], isLoading } = useComments(parent);
  const { data: members = [] } = useMembers();
  const post = usePostComment();
  const [body, setBody] = useState("");
  const [picked, setPicked] = useState<MemberLite[]>([]);
  const [query, setQuery] = useState<string | null>(null);
  const [hi, setHi] = useState(0);
  const ta = useRef<HTMLTextAreaElement>(null);

  const byId = useMemo(() => new Map(members.map((m) => [m.user_id, m])), [members]);

  useEffect(() => {
    const channel = supabase
      .channel(`ws-comments-${parentKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `${parent.kind}_id=eq.${parent.id}` },
        () => qc.invalidateQueries({ queryKey: keys.comments(parentKey) }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [parentKey, qc]); // eslint-disable-line react-hooks/exhaustive-deps

  const options = useMemo(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    return members.filter((m) => m.active && m.full_name.toLowerCase().includes(q)).slice(0, 6);
  }, [query, members]);

  const detect = (value: string, caret: number) => {
    const m = /(^|\s)@([^\s@]*)$/.exec(value.slice(0, caret));
    setQuery(m ? m[2] : null);
    setHi(0);
  };

  const pick = (m: MemberLite) => {
    const el = ta.current;
    const caret = el?.selectionStart ?? body.length;
    const before = body.slice(0, caret).replace(/@([^\s@]*)$/, `@${m.full_name} `);
    const next = before + body.slice(caret);
    setBody(next);
    setPicked((p) => (p.some((x) => x.user_id === m.user_id) ? p : [...p, m]));
    setQuery(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(before.length, before.length);
    });
  };

  const submit = async () => {
    const text = body.trim();
    if (!text || !member) return;
    const mentions = picked.filter((m) => text.includes(`@${m.full_name}`)).map((m) => m.user_id);
    try {
      await post.mutateAsync({ parent, parentName, authorId: member.user_id, authorName: member.full_name, body: text, mentions });
      setBody("");
      setPicked([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not post comment");
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (options.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => (h + 1) % options.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => (h - 1 + options.length) % options.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(options[hi]); return; }
      if (e.key === "Escape") { setQuery(null); return; }
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
  };

  return (
    <section className="rounded-[var(--radius)] border border-border bg-card p-4 md:p-6 space-y-4">
      <h2 className="font-heading uppercase text-xl tracking-wide">Comments</h2>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet. Start the conversation below.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => {
            const author = byId.get(c.author_id);
            const name = author?.full_name ?? "Former member";
            const mentioned = c.mentions.map((id) => byId.get(id)).filter(Boolean) as MemberLite[];
            return (
              <li key={c.id} className="flex gap-3">
                <div className="h-8 w-8 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                  {initials(name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="text-foreground">{name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">{renderBody(c.body, mentioned)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="relative space-y-2">
        <Textarea
          ref={ta}
          rows={3}
          value={body}
          placeholder="Write a comment… type @ to mention a colleague"
          onChange={(e) => { setBody(e.target.value); detect(e.target.value, e.target.selectionStart); }}
          onKeyDown={onKey}
          onBlur={() => setTimeout(() => setQuery(null), 150)}
        />
        {options.length > 0 && (
          <ul className="absolute left-0 right-0 bottom-full mb-1 z-20 max-h-56 overflow-y-auto rounded-[var(--radius)] border border-border bg-popover p-1 shadow-md">
            {options.map((m, i) => (
              <li key={m.user_id}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); pick(m); }}
                  className={cn("w-full text-left rounded px-2 py-1.5 text-sm", i === hi ? "bg-primary/10 text-primary" : "text-popover-foreground")}
                >
                  {m.full_name}
                  <span className="ml-2 text-xs text-muted-foreground">{m.title ?? m.role}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="hidden sm:inline text-xs text-muted-foreground">Ctrl/⌘ + Enter to post</span>
          <Button onClick={submit} disabled={!body.trim() || post.isPending} className="ml-auto">Post</Button>
        </div>
      </div>
    </section>
  );
};

export default CommentThread;
