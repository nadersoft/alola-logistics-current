"use client";

import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { serviceIcon } from "./icons";

export type ServiceSpec = { label: string; value: string; detail: string };

export type ServiceItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  description: string;
  specs: ServiceSpec[];
  features: string[];
};

export function Services({ services }: { services: ServiceItem[] }) {
  const [activeId, setActiveId] = useState(services[0]?.id ?? "");
  const active = services.find((s) => s.id === activeId) ?? services[0];

  if (!active) return null;

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="space-y-3 lg:col-span-4">
        {services.map((service) => {
          const Icon = serviceIcon(service.icon);
          const isActive = service.id === active.id;
          return (
            <button
              key={service.id}
              onClick={() => setActiveId(service.id)}
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
                <div className="font-semibold">{service.title}</div>
                <div className={`text-xs ${isActive ? "text-white/70" : "text-gray-500"}`}>
                  {service.subtitle}
                </div>
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
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h3 className="text-3xl font-bold text-[var(--alola-dark)]">{active.title}</h3>
              <p className="mt-1 font-medium text-[var(--primary)]">{active.subtitle}</p>
            </div>
            <div className="flex size-16 items-center justify-center rounded-2xl bg-[var(--primary)]/10">
              {(() => {
                const Icon = serviceIcon(active.icon);
                return <Icon className="size-8 text-[var(--primary)]" />;
              })()}
            </div>
          </div>

          <p className="mb-8 leading-relaxed text-gray-600">{active.description}</p>

          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            {active.specs.map((spec, i) => (
              <div key={i} className="rounded-xl border bg-white p-5">
                <div className="mb-1 text-xs uppercase tracking-wider text-gray-500">{spec.label}</div>
                <div className="text-2xl font-bold text-[var(--alola-dark)]">{spec.value}</div>
                <div className="mt-1 text-xs text-gray-400">{spec.detail}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            {active.features.map((feature, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-medium text-gray-700"
              >
                <Check className="size-3.5 text-emerald-500" />
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
