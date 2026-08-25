"use client";

import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { MessageSquare, Phone } from "lucide-react";

export type FloatingActionsProps = {
  enabled: boolean;
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




const WHATSAPP_GREEN = "#25d366";
const HIDDEN_ROLES = ["ADMIN", "MANAGER", "OWNER", "SUPER_ADMIN", "SUPPORT", "STAFF"];






export function FloatingActions({
  enabled,
  showWhatsapp,
  showCall,
  showLivechat,
  whatsappNumber,
  callNumber,
  livechatUrl,
  whatsappMessage,
  position,
  color,
}: FloatingActionsProps) {
  if (!enabled) return null;
  const { data: session } = useSession();
  const role = ((session?.user as Record<string, unknown>)?.role as string || "").toUpperCase();
  if (HIDDEN_ROLES.includes(role)) return null;
  if (role && !["ADMIN", "MANAGER", "OWNER", "SUPER_ADMIN"].includes(role)) return null;
  const side = position === "left" ? "left-4" : "right-4";
  const base =
    "flex size-14 items-center justify-center rounded-full text-white shadow-xl transition-colors";

  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMessage)}`
    : "";

  const buttons: { key: string; label: string; bg: string; href?: string; icon: typeof Phone }[] = [];

  if (showWhatsapp && whatsappHref) {
    buttons.push({
      key: "whatsapp",
      label: "WhatsApp",
      bg: WHATSAPP_GREEN,
      href: whatsappHref,
      icon: MessageSquare,
    });
  }
  if (showCall && callNumber) {
    buttons.push({ key: "call", label: "Call", bg: color, href: `tel:${callNumber}`, icon: Phone });
  }
  if (showLivechat) {
    buttons.push({ key: "chat", label: "Live chat", bg: color, href: livechatUrl || "/login", icon: MessageSquare });
  }

  if (buttons.length === 0) return null;

  const container = "fixed bottom-4 z-[9999] flex flex-col gap-3 " + side;
  const item = {
    whileHover: { scale: 1.1 },
    whileTap: { scale: 0.95 },
    transition: { type: "spring" as const, stiffness: 400, damping: 17 },
  };

  return (
    <div className={container}>
      {buttons.map((b) => {
        const Icon = b.icon;
        const inner = (
          <motion.span
            key={b.key}
            {...item}
            className={base}
            style={{ backgroundColor: b.bg }}
            aria-label={b.label}
            title={b.label}
          >
            <Icon className="size-6" />
          </motion.span>
        );
        const external = b.href?.startsWith("http");
        return b.href ? (
          <a
            key={b.key}
            href={b.href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            className="group"
          >
            {inner}
          </a>
        ) : (
          <span key={b.key}>{inner}</span>
        );
      })}
    </div>
  );
}
