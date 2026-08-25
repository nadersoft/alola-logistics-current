"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { serviceIcon } from "@/components/landing/icons";
import type { CmsSectionWithItems } from "@/lib/actions/cms";

export function ServicesSection({ section }: { section: CmsSectionWithItems | null }) {
  const items = section?.items ?? [];
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const active = items.find((i) => i.id === activeId) ?? items[0];

  if (!section || items.length === 0 || !active) return null;

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="space-y-3 lg:col-span-4">
        {items.map((item) => {
          const Icon = serviceIcon(item.icon);
          const isActive = item.id === active.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveId(item.id)}
              className={`group flex w-full items-center gap-4 rounded-2xl p-5 text-left transition-all duration-300 ${
                isActive
                  ? "bg-[var(--primary)] text-white shadow-xl shadow-[var(--primary)]/20"
                  : "bg-[var(--alola-slate)] text-gray-700 hover:bg-white hover:shadow-md"
              }`}
            >
              <div
                className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${
                  isActive ? "bg-white/20" : "bg-[var(--primary)]/10"
                }`}
              >
                <Icon className={`size-6 ${isActive ? "text-white" : "text-[var(--primary)]"}`} />
              </div>
              <div className="min-w-0">
                <div className="font-semibold">{item.titleEn}</div>
                <div className={`text-xs ${isActive ? "text-white/70" : "text-gray-500"}`}>{item.shortLabelEn}</div>
              </div>
              <ChevronRight
                className={`ml-auto size-4 shrink-0 transition-transform ${
                  isActive ? "translate-x-1 opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
              />
            </button>
          );
        })}
      </div>

      <div key={active.id} className="lg:col-span-8">
        <div className="h-full rounded-3xl bg-[var(--alola-slate)] p-8 sm:p-10">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-3xl font-bold text-[var(--alola-dark)]">{active.titleEn}</h3>
              {active.shortLabelEn && <p className="mt-1 font-medium text-[var(--primary)]">{active.shortLabelEn}</p>}
            </div>
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/10">
              {(() => {
                const Icon = serviceIcon(active.icon);
                return <Icon className="size-8 text-[var(--primary)]" />;
              })()}
            </div>
          </div>

          {active.descriptionEn && (
            <p className="mb-8 leading-relaxed text-gray-600">{active.descriptionEn}</p>
          )}

          {(active.value || active.subValue) && (
            <div className="mb-8 grid gap-4 sm:grid-cols-2">
              {active.value && (
                <div className="rounded-xl border bg-white p-5">
                  <div className="mb-1 text-xs uppercase tracking-wider text-gray-500">Value</div>
                  <div className="text-2xl font-bold text-[var(--alola-dark)]">{active.value}</div>
                </div>
              )}
              {active.subValue && (
                <div className="rounded-xl border bg-white p-5">
                  <div className="mb-1 text-xs uppercase tracking-wider text-gray-500">Detail</div>
                  <div className="text-2xl font-bold text-[var(--alola-dark)]">{active.subValue}</div>
                </div>
              )}
            </div>
          )}

          {active.linkUrl && (
            <a
              href={active.linkUrl}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Learn more <ChevronRight className="size-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
