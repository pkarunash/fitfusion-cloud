import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cld, uploadToCloudinary } from "@/lib/cloudinary";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Coach Chat | IronForge Gym" },
      {
        name: "description",
        content: "Message the IronForge Gym team about memberships, orders and training — live replies.",
      },
      { property: "og:title", content: "Coach Chat | IronForge Gym" },
      { property: "og:description", content: "Live chat with the IronForge Gym team." },
    ],
  }),
  component: ChatPage,
});

type Message = {
  id: string;
  conversation_user_id: string;
  sender_id: string;
  body: string | null;
  image_url: string | null;
  created_at: string;
};

function ChatPage() {
  const { user, isAdmin, loading } = useAuth();
  const [conversation, setConversation] = useState<string | null>(null);
  const activeConversation = isAdmin ? conversation : (user?.id ?? null);

  useEffect(() => {
    if (!isAdmin && user) setConversation(user.id);
  }, [isAdmin, user]);

  if (loading) return <div className="px-4 py-10 text-muted-foreground">Loading…</div>;

  if (!user)
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-3xl">Sign in to chat</h1>
        <p className="mt-2 text-muted-foreground">Your conversation with the gym team stays private.</p>
        <Link to="/auth" className="btn-primary mt-6">
          Sign in
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        {isAdmin && <ConversationList active={activeConversation} onSelect={setConversation} />}
        {activeConversation ? (
          <Thread conversationId={activeConversation} senderId={user.id} isAdmin={isAdmin} />
        ) : (
          <div className="surface-card grid h-[70vh] place-items-center text-muted-foreground">
            Select a member conversation
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationList({ active, onSelect }: { active: string | null; onSelect: (id: string) => void }) {
  const { data } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data: msgs, error } = await supabase
        .from("messages")
        .select("conversation_user_id, body, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const seen = new Map<string, { id: string; last: string; at: string }>();
      for (const m of msgs ?? []) {
        if (!seen.has(m.conversation_user_id))
          seen.set(m.conversation_user_id, {
            id: m.conversation_user_id,
            last: m.body ?? "📷 Photo",
            at: m.created_at,
          });
      }
      const ids = [...seen.keys()];
      const names = new Map<string, string>();
      if (ids.length) {
        const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", ids);
        for (const p of profiles ?? []) names.set(p.id, p.display_name ?? "Member");
      }
      return [...seen.values()].map((c) => ({ ...c, name: names.get(c.id) ?? "Member" }));
    },
    refetchInterval: 15000,
  });

  return (
    <aside className="surface-card h-[70vh] overflow-y-auto">
      <h2 className="border-b border-border p-3 text-xl">Conversations</h2>
      {(data ?? []).length === 0 && <p className="p-3 text-sm text-muted-foreground">No member messages yet.</p>}
      {(data ?? []).map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={`flex w-full flex-col items-start gap-0.5 border-b border-border p-3 text-left hover:bg-muted ${
            active === c.id ? "bg-muted" : ""
          }`}
        >
          <span className="text-sm font-bold">{c.name}</span>
          <span className="line-clamp-1 text-xs text-muted-foreground">{c.last}</span>
        </button>
      ))}
    </aside>
  );
}

function Thread({
  conversationId,
  senderId,
  isAdmin,
}: {
  conversationId: string;
  senderId: string;
  isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: messages } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_user_id", conversationId)
        .order("created_at");
      if (error) throw error;
      return data as Message[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_user_id=eq.${conversationId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["messages", conversationId] });
          qc.invalidateQueries({ queryKey: ["conversations"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  async function send(body: string | null, imageUrl: string | null) {
    if (!body && !imageUrl) return;
    const { error } = await supabase.from("messages").insert({
      conversation_user_id: conversationId,
      sender_id: senderId,
      body,
      image_url: imageUrl,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setText("");
    qc.invalidateQueries({ queryKey: ["messages", conversationId] });
  }

  async function pickImage(file: File) {
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, "gym/chat");
      await send(null, url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="surface-card flex h-[70vh] flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-border p-3">
        <span className="grid size-9 place-items-center rounded-full bg-primary font-display text-lg text-primary-foreground">
          IF
        </span>
        <div>
          <p className="font-bold leading-tight">{isAdmin ? "Member chat" : "IronForge Support"}</p>
          <p className="text-xs text-success">online</p>
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto bg-background/40 p-3">
        {(messages ?? []).length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Say hi 👋 — ask about plans, protein or equipment.
          </p>
        )}
        {(messages ?? []).map((m) => {
          const mine = m.sender_id === senderId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? "bg-chat-out text-foreground" : "bg-chat-in text-foreground"
                }`}
              >
                {m.image_url && (
                  <img
                    src={cld(m.image_url, 500)}
                    alt="Shared photo"
                    loading="lazy"
                    className="mb-1 max-h-64 rounded-lg object-cover"
                  />
                )}
                {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
                <p className="mt-1 text-right text-[10px] text-muted-foreground">
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(text.trim() || null, null);
        }}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void pickImage(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="btn-outline px-3 py-2"
          aria-label="Send photo"
        >
          <ImagePlus className="size-4" />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={uploading ? "Uploading photo…" : "Type a message"}
          className="field"
        />
        <button type="submit" className="btn-primary px-4 py-2" aria-label="Send">
          <Send className="size-4" />
        </button>
      </form>
    </section>
  );
}
