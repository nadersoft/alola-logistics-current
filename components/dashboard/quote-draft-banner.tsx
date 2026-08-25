"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Box, Ruler, Sparkles, Trash2, Weight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Draft = {
  mode?: string;
  origin?: string;
  destination?: string;
  containerType?: string | null;
  quantity?: number;
  weight?: number;
  cbm?: number;
  lwh?: string;
  savedAt?: string;
};

const MODE_LABEL: Record<string, string> = { FCL: "FCL", LCL: "LCL", AIR: "AIR" };

export function QuoteDraftBanner() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("alola_quote_draft");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Draft;
      if (parsed && (parsed.origin || parsed.weight || parsed.cbm)) setDraft(parsed);
    } catch {
      /* ignore malformed draft */
    }
  }, []);

  if (!draft) return null;

  function bookNow() {
    router.push("/quote");
  }

  function dismiss() {
    try {
      localStorage.removeItem("alola_quote_draft");
    } catch {
      /* ignore */
    }
    setDraft(null);
  }

  return (
    <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-[var(--primary)]/30 bg-gradient-to-r from-[var(--primary)]/10 to-transparent">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-white">
            <Sparkles className="size-5" />
          </div>
          <div className="flex-1">
            <div className="text-base font-semibold">مرحباً، هذه هي تكلفة شحنتك</div>
            <div className="mt-0.5 text-sm text-muted-foreground">
              {draft.mode ? (
                <span className="font-medium text-foreground">{MODE_LABEL[draft.mode] ?? draft.mode} · </span>
              ) : null}
              <span className="font-medium text-foreground">
                {draft.origin || "—"} → {draft.destination || "—"}
              </span>
              {draft.containerType ? <span> · {draft.containerType}</span> : null}
              {draft.quantity && draft.quantity > 1 ? <span> × {draft.quantity}</span> : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {typeof draft.weight === "number" && draft.weight > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <Weight className="size-3" /> {draft.weight} kg
                </span>
              ) : null}
              {typeof draft.cbm === "number" && draft.cbm > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <Box className="size-3" /> {draft.cbm} CBM
                </span>
              ) : null}
              {draft.lwh ? (
                <span className="inline-flex items-center gap-1">
                  <Ruler className="size-3" /> {draft.lwh} cm
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={bookNow} className="bg-[var(--primary)] text-white hover:bg-[var(--accent)]">
              احجز الآن
              <ArrowRight className="size-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss} aria-label="Dismiss saved quote">
              <Trash2 className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
