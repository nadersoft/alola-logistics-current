"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { bookQuote } from "@/lib/actions/bookings";
import { Button } from "@/components/ui/button";
import { Loader2Icon } from "lucide-react";

export function BookQuoteButton({ quoteId, label = "Book this quote" }: { quoteId: string; label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const res = await bookQuote(quoteId);
      if (res.ok) {
        toast.success(`Booking ${res.shipmentNumber} confirmed`);
        router.refresh();
        router.push("/shipments");
      } else {
        toast.error(res.error ?? "Could not book the quote.");
      }
    });
  }

  return (
    <Button onClick={onClick} disabled={pending}>
      {pending ? <Loader2Icon className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}
