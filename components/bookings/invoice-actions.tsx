"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createInvoiceFromShipment, setInvoiceStatus } from "@/lib/actions/bookings";
import { Button } from "@/components/ui/button";
import { Loader2Icon } from "lucide-react";

export function MarkPaidButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    const fd = new FormData();
    fd.set("invoiceId", invoiceId);
    fd.set("status", "PAID");
    startTransition(async () => {
      const res = await setInvoiceStatus(fd);
      if (res.ok) {
        toast.success("Invoice marked as paid");
        router.refresh();
      } else {
        toast.error(res.error ?? "Update failed.");
      }
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={pending}>
      {pending ? <Loader2Icon className="size-4 animate-spin" /> : null}
      Mark paid
    </Button>
  );
}

export function CreateInvoiceButton({ shipmentId }: { shipmentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const res = await createInvoiceFromShipment(shipmentId);
      if (res.ok) {
        toast.success(`Invoice ${res.invoiceNumber} created`);
        router.refresh();
      } else {
        toast.error(res.error ?? "Could not create invoice.");
      }
    });
  }

  return (
    <Button size="sm" onClick={onClick} disabled={pending}>
      {pending ? <Loader2Icon className="size-4 animate-spin" /> : null}
      Issue invoice
    </Button>
  );
}
