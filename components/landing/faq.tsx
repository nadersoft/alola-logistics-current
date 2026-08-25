"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function Faq({ items }: { items: { question: string; answer: string }[] }) {
  const [open, setOpen] = useState<string | null>(items[0]?.question ?? null);

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {items.map((item) => {
        const isOpen = open === item.question;
        return (
          <div key={item.question} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <button
              onClick={() => setOpen(isOpen ? null : item.question)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
            >
              <span className="font-semibold text-[var(--alola-dark)]">{item.question}</span>
              <ChevronDown
                className={`size-5 shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && <p className="border-t px-6 py-5 text-sm leading-relaxed text-gray-600">{item.answer}</p>}
          </div>
        );
      })}
    </div>
  );
}
