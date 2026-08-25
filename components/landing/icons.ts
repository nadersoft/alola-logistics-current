import {
  Activity,
  Anchor,
  BarChart3,
  Boxes,
  Container,
  CreditCard,
  FileCheck2,
  Globe2,
  Package,
  Plane,
  Ship,
  ShieldCheck,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  container: Container,
  boxes: Boxes,
  ship: Ship,
  plane: Plane,
  "file-check": FileCheck2,
  truck: Truck,
  shield: ShieldCheck,
  globe: Globe2,
  "bar-chart": BarChart3,
  users: Users,
  "credit-card": CreditCard,
  activity: Activity,
  anchor: Anchor,
  package: Package,
};

export const SERVICE_ICON_KEYS = [
  "container",
  "boxes",
  "ship",
  "plane",
  "file-check",
  "truck",
  "shield",
  "globe",
  "bar-chart",
  "users",
  "credit-card",
  "activity",
  "anchor",
  "package",
] as const;

export function serviceIcon(name: string): LucideIcon {
  return MAP[name] ?? Anchor;
}
