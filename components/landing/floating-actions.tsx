"use client";

import Link from "next/link";
import { MessageCircle, MessageSquare, Phone } from "lucide-react";

export type FloatingActionsProps = {
  showWhatsapp: boolean;
  showCall: boolean;
  showLivechat: boolean;
  whatsappNumber: string;
  callNumber: string;
  livechatUrl: string;
  whatsappMessage: string;
  position: "left" | "right";
  color: string;
};

/** Floating action buttons — show/hide & edit fully from Appearance settings (no code). */
export function FloatingActions(p: FloatingActionsProps) {
  const side = p.position === "left" ? "left-4" : "right-4";
  const buttons: { key: string; href?: string; icon: typeof Phone; label: string }[] = [];

  if (p.showWhatsapp && p.whatsappNumber) {
    buttons.push({
      key: "whatsapp",
      href: `https://wa.me/${p.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(p.whatsappMessage)}`,
      icon: MessageCircle,
      label: "WhatsApp",
    });
  }
  if (p.showCall && p.callNumber) {
    buttons.push({ key: "call", href: `tel:${p.callNumber}`, icon: Phone, label: "Call" });
  }
  if (p.showLivechat) {
    buttons.push({ key: "chat", href: p.livechatUrl || "/login", icon: MessageSquare, label: "Live chat" });
  }

  if (buttons.length === 0) return null;

  return (
    <div className={`fixed bottom-5 ${side} z-40 flex flex-col gap-3`}>
      {buttons.map((b) => {
        const Icon = b.icon;
        const inner = (
          <span
            className="flex size-13 items-center justify-center rounded-full text-white shadow-xl transition-transform hover:scale-110"
            style={{ backgroundColor: p.color }}
            aria-label={b.label}
          >
            <Icon className="size-5" />
          </span>
        );
        return b.href ? (
          <Link key={b.key} href={b.href} target={b.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
            {inner}
          </Link>
        ) : (
          <span key={b.key}>{inner}</span>
        );
      })}
    </div>
  );
}
