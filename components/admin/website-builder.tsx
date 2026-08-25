"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon, PencilIcon, Trash2Icon, GripVerticalIcon, Star, ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  upsertPartner, deletePartner,
  upsertTestimonial, deleteTestimonial,
  upsertFaq, deleteFaq,
} from "@/lib/actions/website-content";
import { LogoUploader } from "@/components/admin/logo-uploader";
import { normalizeLogoUrl } from "@/lib/utils/logo-helpers";

type PartnerRow = { id: string; name: string; logoUrl: string | null; website: string | null; isActive: boolean; sortOrder: number };
type TestimonialRow = { id: string; name: string; company: string | null; content: string; rating: number; isActive: boolean; sortOrder: number };
type FaqRow = { id: string; question: string; answer: string; sortOrder: number; isActive: boolean };

export function WebsiteBuilder({
  partners: initPartners,
  testimonials: initTestimonials,
  faqs: initFaqs,
}: {
  partners: PartnerRow[];
  testimonials: TestimonialRow[];
  faqs: FaqRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState("partners");
  const [partnerDialog, setPartnerDialog] = useState<{ open: boolean; editing: PartnerRow | null }>({ open: false, editing: null });
  const [testimonialDialog, setTestimonialDialog] = useState<{ open: boolean; editing: TestimonialRow | null }>({ open: false, editing: null });
  const [faqDialog, setFaqDialog] = useState<{ open: boolean; editing: FaqRow | null }>({ open: false, editing: null });
  const [partnerActive, setPartnerActive] = useState(true);
  const [testimonialActive, setTestimonialActive] = useState(true);
  const [faqActive, setFaqActive] = useState(true);
  const [deleteState, setDeleteState] = useState<{ kind: string; id: string; label: string } | null>(null);
  const [partnerLogoUrl, setPartnerLogoUrl] = useState("");

  function run(action: Promise<{ ok: boolean; error?: string }>, msg = "Saved.") {
    startTransition(async () => {
      const res = await action;
      if (!res.ok) { toast.error(res.error ?? "Failed"); return; }
      toast.success(msg);
      router.refresh();
    });
  }

  // ---------- Partners ----------
  function onSavePartner(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("isActive", String(partnerActive));
    fd.set("logoUrl", normalizeLogoUrl(partnerLogoUrl));
    run(upsertPartner(fd), partnerDialog.editing ? "Partner updated" : "Partner added");
    setPartnerDialog({ open: false, editing: null });
  }

  // ---------- Testimonials ----------
  function onSaveTestimonial(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("isActive", String(testimonialActive));
    run(upsertTestimonial(fd), testimonialDialog.editing ? "Testimonial updated" : "Testimonial added");
    setTestimonialDialog({ open: false, editing: null });
  }

  // ---------- FAQ ----------
  function onSaveFaq(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("isActive", String(faqActive));
    run(upsertFaq(fd), faqDialog.editing ? "FAQ updated" : "FAQ added");
    setFaqDialog({ open: false, editing: null });
  }

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="partners">Partners ({initPartners.length})</TabsTrigger>
        <TabsTrigger value="testimonials">Testimonials ({initTestimonials.length})</TabsTrigger>
        <TabsTrigger value="faq">FAQ ({initFaqs.length})</TabsTrigger>
      </TabsList>

      {/* ========== PARTNERS ========== */}
      <TabsContent value="partners" className="space-y-4">
        <div className="flex justify-end">
          <Button size="sm" className="gap-1" onClick={() => { setPartnerActive(true); setPartnerLogoUrl(""); setPartnerDialog({ open: true, editing: null }); }}>
            <PlusIcon className="size-4" /> Add partner
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Logo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initPartners.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No partners yet.</TableCell></TableRow>
                ) : initPartners.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell><GripVerticalIcon className="size-4 text-muted-foreground" /></TableCell>
                    <TableCell>
                      {p.logoUrl ? <img src={normalizeLogoUrl(p.logoUrl)} alt={p.name} className="h-8 w-auto object-contain" /> : <span className="text-xs text-muted-foreground">No logo</span>}
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.website ? <a href={p.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline text-xs"><ExternalLinkIcon className="size-3" />{p.website}</a> : "—"}
                    </TableCell>
                    <TableCell><Badge variant={p.isActive ? "default" : "outline"}>{p.isActive ? "Active" : "Hidden"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => { setPartnerActive(p.isActive); setPartnerDialog({ open: true, editing: p }); }}><PencilIcon className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => setDeleteState({ kind: "partner", id: p.id, label: p.name })}><Trash2Icon className="size-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ========== TESTIMONIALS ========== */}
      <TabsContent value="testimonials" className="space-y-4">
        <div className="flex justify-end">
          <Button size="sm" className="gap-1" onClick={() => { setTestimonialActive(true); setTestimonialDialog({ open: true, editing: null }); }}>
            <PlusIcon className="size-4" /> Add testimonial
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initTestimonials.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No testimonials yet.</TableCell></TableRow>
                ) : initTestimonials.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-muted-foreground">{t.company ?? "—"}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{t.content}</TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`size-3 ${i < t.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />)}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={t.isActive ? "default" : "outline"}>{t.isActive ? "Active" : "Hidden"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => { setTestimonialActive(t.isActive); setTestimonialDialog({ open: true, editing: t }); }}><PencilIcon className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => setDeleteState({ kind: "testimonial", id: t.id, label: t.name })}><Trash2Icon className="size-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ========== FAQ ========== */}
      <TabsContent value="faq" className="space-y-4">
        <div className="flex justify-end">
          <Button size="sm" className="gap-1" onClick={() => { setFaqActive(true); setFaqDialog({ open: true, editing: null }); }}>
            <PlusIcon className="size-4" /> Add FAQ
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Answer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initFaqs.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">No FAQs yet.</TableCell></TableRow>
                ) : initFaqs.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium max-w-xs">{f.question}</TableCell>
                    <TableCell className="max-w-sm truncate text-muted-foreground">{f.answer}</TableCell>
                    <TableCell><Badge variant={f.isActive ? "default" : "outline"}>{f.isActive ? "Active" : "Hidden"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => { setFaqActive(f.isActive); setFaqDialog({ open: true, editing: f }); }}><PencilIcon className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => setDeleteState({ kind: "faq", id: f.id, label: f.question.slice(0, 40) })}><Trash2Icon className="size-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ========== PARTNER DIALOG ========== */}
      <Dialog open={partnerDialog.open} onOpenChange={(o) => !o && setPartnerDialog({ open: false, editing: null })}>
        <DialogContent>
          <DialogHeader><DialogTitle>{partnerDialog.editing ? "Edit partner" : "Add partner"}</DialogTitle></DialogHeader>
          <form onSubmit={onSavePartner} className="space-y-4">
            {partnerDialog.editing && <input type="hidden" name="id" value={partnerDialog.editing.id} />}
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input name="name" required defaultValue={partnerDialog.editing?.name ?? ""} placeholder="e.g. Mediterranean Shipping Co." />
            </div>
            <div className="space-y-1.5">
              <Label>Logo</Label>
              <LogoUploader
                currentUrl={partnerDialog.editing?.logoUrl}
                onUpload={(url) => setPartnerLogoUrl(url)}
                type="carrier"
                label="Upload Partner Logo"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Website URL</Label>
              <Input name="website" defaultValue={partnerDialog.editing?.website ?? ""} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sort order</Label>
                <Input type="number" name="sortOrder" defaultValue={partnerDialog.editing?.sortOrder ?? 0} />
              </div>
              <div className="flex items-end gap-2 pb-0.5">
                <Label>Active</Label>
                <Switch checked={partnerActive} onCheckedChange={setPartnerActive} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPartnerDialog({ open: false, editing: null })} disabled={pending}>Cancel</Button>
              <Button type="submit" disabled={pending}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========== TESTIMONIAL DIALOG ========== */}
      <Dialog open={testimonialDialog.open} onOpenChange={(o) => !o && setTestimonialDialog({ open: false, editing: null })}>
        <DialogContent>
          <DialogHeader><DialogTitle>{testimonialDialog.editing ? "Edit testimonial" : "Add testimonial"}</DialogTitle></DialogHeader>
          <form onSubmit={onSaveTestimonial} className="space-y-4">
            {testimonialDialog.editing && <input type="hidden" name="id" value={testimonialDialog.editing.id} />}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input name="name" required defaultValue={testimonialDialog.editing?.name ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label>Company</Label>
                <Input name="company" defaultValue={testimonialDialog.editing?.company ?? ""} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Content</Label>
              <Textarea name="content" required rows={3} defaultValue={testimonialDialog.editing?.content ?? ""} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Rating (1-5)</Label>
                <Input type="number" name="rating" min={1} max={5} defaultValue={testimonialDialog.editing?.rating ?? 5} />
              </div>
              <div className="space-y-1.5">
                <Label>Sort order</Label>
                <Input type="number" name="sortOrder" defaultValue={testimonialDialog.editing?.sortOrder ?? 0} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label>Active</Label>
              <Switch name="isActive" defaultChecked={testimonialDialog.editing?.isActive ?? true} />
              <input type="hidden" name="isActive" value={testimonialDialog.editing?.isActive !== false ? "true" : "false"} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTestimonialDialog({ open: false, editing: null })} disabled={pending}>Cancel</Button>
              <Button type="submit" disabled={pending}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========== FAQ DIALOG ========== */}
      <Dialog open={faqDialog.open} onOpenChange={(o) => !o && setFaqDialog({ open: false, editing: null })}>
        <DialogContent>
          <DialogHeader><DialogTitle>{faqDialog.editing ? "Edit FAQ" : "Add FAQ"}</DialogTitle></DialogHeader>
          <form onSubmit={onSaveFaq} className="space-y-4">
            {faqDialog.editing && <input type="hidden" name="id" value={faqDialog.editing.id} />}
            <div className="space-y-1.5">
              <Label>Question</Label>
              <Input name="question" required defaultValue={faqDialog.editing?.question ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label>Answer</Label>
              <Textarea name="answer" required rows={4} defaultValue={faqDialog.editing?.answer ?? ""} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sort order</Label>
                <Input type="number" name="sortOrder" defaultValue={faqDialog.editing?.sortOrder ?? 0} />
              </div>
              <div className="flex items-center gap-2 pb-0.5">
                <Label>Active</Label>
                <Switch checked={faqActive} onCheckedChange={setFaqActive} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFaqDialog({ open: false, editing: null })} disabled={pending}>Cancel</Button>
              <Button type="submit" disabled={pending}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========== DELETE CONFIRM ========== */}
      <AlertDialog open={!!deleteState} onOpenChange={(o) => !o && setDeleteState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteState?.kind}?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove &ldquo;{deleteState?.label}&rdquo;. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (!deleteState) return;
              const { kind, id } = deleteState;
              if (kind === "partner") run(deletePartner(id), "Partner deleted");
              else if (kind === "testimonial") run(deleteTestimonial(id), "Testimonial deleted");
              else if (kind === "faq") run(deleteFaq(id), "FAQ deleted");
              setDeleteState(null);
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
}
