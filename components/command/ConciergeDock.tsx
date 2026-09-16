"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, X, ChevronDown } from "lucide-react";
import { useSim } from "@/store/sim";
import { useTwin } from "@/store/twin";
import { getModel } from "@/lib/architecture/model";
import { handleGuestMessage } from "@/lib/intelligence/concierge";
import { Button, Tag } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const suggestions = [
  "The AC is rattling and not cooling, please fix asap",
  "Can we get extra towels and two pillows?",
  "Book a table for four at 8pm tonight",
  "What time does the pool open?",
  "Two club sandwiches and coffee to the room please",
  "The room next door is extremely noisy, can't sleep",
];

export function ConciergeDock() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const { state, mutate } = useSim();
  useSim((s) => s.version);
  const selected = useTwin((s) => s.selected);
  const model = getModel();
  const occupied = Object.values(state.rooms).filter((r) => r.guestId);
  const [roomId, setRoomId] = useState<string>(occupied[0]?.id ?? model.rooms[0].id);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected?.kind === "room" && state.rooms[selected.id]?.guestId) setRoomId(selected.id);
  }, [selected, state.rooms]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [state.chat.length, open]);

  const send = (msg: string) => {
    if (!msg.trim()) return;
    mutate((s) => handleGuestMessage(s, model, roomId, msg.trim()));
    setText("");
  };

  const room = model.roomById.get(roomId);
  const guest = state.rooms[roomId]?.guestId ? state.guests[state.rooms[roomId].guestId!] : null;

  if (!open)
    return (
      <Button variant="primary" className="pointer-events-auto h-10 rounded-full px-4 shadow-[0_0_24px_rgba(45,212,191,0.35)]" onClick={() => setOpen(true)}>
        <MessageSquare size={15} /> AI Concierge
      </Button>
    );

  return (
    <div className="glass pointer-events-auto flex h-[440px] w-[360px] flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-stroke px-3 py-2">
        <MessageSquare size={14} className="text-accent" />
        <div className="flex-1 leading-tight">
          <div className="text-[12.5px] font-medium text-hi">AI Concierge</div>
          <div className="text-[10.5px] text-low">Guest simulator · intent → dispatch → twin</div>
        </div>
        <Button size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Close">
          <X size={14} />
        </Button>
      </div>
      <div className="flex items-center gap-2 border-b border-stroke px-3 py-1.5">
        <span className="label">as</span>
        <div className="relative flex-1">
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className="h-7 w-full appearance-none rounded-md border border-stroke bg-transparent pl-2 pr-6 text-[11.5px] text-hi outline-none">
            {occupied.map((r) => (
              <option key={r.id} value={r.id} className="bg-deep">
                {model.roomById.get(r.id)!.number} · {state.guests[r.guestId!]?.name}
              </option>
            ))}
          </select>
          <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-low" />
        </div>
        {guest && <Tag>{guest.segment}</Tag>}
      </div>
      <div ref={scroller} className="scrollbar-thin flex-1 space-y-2 overflow-y-auto px-3 py-2">
        {state.chat.length === 0 && (
          <div className="rounded-lg bg-white/[0.03] p-3 text-[11.5px] leading-relaxed text-mid">
            Type as a guest in <span className="text-hi">{room?.number}</span>. Messages are classified by intent, turned into a task, and dispatched to a staff agent you can watch on the twin.
          </div>
        )}
        {state.chat.map((m) => (
          <div key={m.id} className={cn("flex flex-col", m.role === "guest" ? "items-end" : "items-start")}>
            <div className={cn("max-w-[85%] rounded-xl px-3 py-2 text-[12px] leading-snug", m.role === "guest" ? "rounded-br-sm bg-accent/20 text-hi" : "rounded-bl-sm bg-white/[0.06] text-mid")}>{m.text}</div>
            {m.intent && (
              <div className="mono mt-0.5 flex items-center gap-1.5 text-[9.5px] text-low">
                <span className="uppercase tracking-wider text-accent/80">{m.intent}</span>
                {m.requestId && (
                  <button className="hover:text-hi" onClick={() => useTwin.getState().select({ kind: "room", id: roomId })}>
                    task {m.requestId.toUpperCase()} · {state.requests[m.requestId]?.status ?? "done"}
                    {state.requests[m.requestId]?.assignedTo ? ` · ${state.staff[state.requests[m.requestId]!.assignedTo!]?.name}` : ""}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="scrollbar-thin flex gap-1 overflow-x-auto border-t border-stroke px-2 py-1.5">
        {suggestions.map((s) => (
          <button key={s} onClick={() => send(s)} className="shrink-0 rounded-full border border-stroke px-2 py-0.5 text-[10.5px] text-mid hover:border-accent/50 hover:text-hi">
            {s.length > 34 ? s.slice(0, 32) + "…" : s}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        className="flex items-center gap-2 border-t border-stroke p-2"
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message the concierge…" className="h-8 flex-1 rounded-md border border-stroke bg-transparent px-2.5 text-[12px] text-hi outline-none placeholder:text-low focus:border-accent/60" />
        <Button type="submit" size="icon" variant="primary" aria-label="Send">
          <Send size={14} />
        </Button>
      </form>
    </div>
  );
}
