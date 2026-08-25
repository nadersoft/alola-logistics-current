"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  updateRegistrationPageConfig,
  createRegistrationField,
  updateRegistrationField,
  deleteRegistrationField,
  toggleRegistrationFieldVisible,
  toggleRegistrationFieldRequired,
  toggleRegistrationFieldActive,
  reorderRegistrationFields,
} from "@/lib/actions/registration-config";

export type PageConfigData = {
  id: string;
  pageTitleAr: string;
  pageTitleEn: string;
  pageSubtitleAr: string | null;
  pageSubtitleEn: string | null;
  submitButtonAr: string;
  submitButtonEn: string;
  successToastAr: string | null;
  successToastEn: string | null;
  errorGeneralAr: string | null;
  errorGeneralEn: string | null;
  footerLoginTextAr: string | null;
  footerLoginTextEn: string | null;
  alreadyHaveAccountAr: string | null;
  alreadyHaveAccountEn: string | null;
  isActive: boolean;
};

export type RegistrationFieldData = {
  fieldKey: string;
  labelAr: string;
  labelEn: string;
  placeholderAr: string | null;
  placeholderEn: string | null;
  helpTextAr: string | null;
  helpTextEn: string | null;
  tooltipAr: string | null;
  tooltipEn: string | null;
  errorRequiredAr: string | null;
  errorRequiredEn: string | null;
  errorInvalidAr: string | null;
  errorInvalidEn: string | null;
  validationRegex: string | null;
  minLength: number | null;
  maxLength: number | null;
  allowNumbers: boolean;
  allowSpecialChars: boolean;
  isActive: boolean;
  isVisible: boolean;
  isRequired: boolean;
  order: number;
};

type FieldDraft = {
  fieldKey: string;
  labelAr: string;
  labelEn: string;
  placeholderAr: string;
  placeholderEn: string;
  minLength: string;
  maxLength: string;
  allowNumbers: boolean;
  allowSpecialChars: boolean;
  isRequired: boolean;
  isVisible: boolean;
};

const emptyDraft: FieldDraft = {
  fieldKey: "",
  labelAr: "",
  labelEn: "",
  placeholderAr: "",
  placeholderEn: "",
  minLength: "",
  maxLength: "",
  allowNumbers: true,
  allowSpecialChars: true,
  isRequired: true,
  isVisible: true,
};

export function RegistrationBuilder({ pageConfig, fields }: { pageConfig: PageConfigData | null; fields: RegistrationFieldData[] }) {
  const router = useRouter();
  const [pagePending, startPageTransition] = useTransition();
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<FieldDraft>(emptyDraft);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [movePending, setMovePending] = useState(false);
  const [isActive, setIsActive] = useState(pageConfig?.isActive ?? true);

  function run(action: Promise<{ ok: boolean; error?: string }>, key: string | null = null) {
    if (key) setPendingKey(key);
    startPageTransition(async () => {
      const res = await action;
      if (key) setPendingKey(null);
      if (!res.ok) {
        toast.error(res.error ?? "Something went wrong.");
        return;
      }
      toast.success("Saved.");
      router.refresh();
    });
  }

  function onSavePage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("isActive", String(isActive));
    run(updateRegistrationPageConfig(fd));
  }

  function openCreate() {
    setEditingKey(null);
    setDraft(emptyDraft);
    setFieldDialogOpen(true);
  }

  function openEdit(f: RegistrationFieldData) {
    setEditingKey(f.fieldKey);
    setDraft({
      fieldKey: f.fieldKey,
      labelAr: f.labelAr,
      labelEn: f.labelEn,
      placeholderAr: f.placeholderAr ?? "",
      placeholderEn: f.placeholderEn ?? "",
      minLength: f.minLength?.toString() ?? "",
      maxLength: f.maxLength?.toString() ?? "",
      allowNumbers: f.allowNumbers,
      allowSpecialChars: f.allowSpecialChars,
      isRequired: f.isRequired,
      isVisible: f.isVisible,
    });
    setFieldDialogOpen(true);
  }

  function onSaveField(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const action = editingKey ? updateRegistrationField(fd) : createRegistrationField(fd);
    setFieldDialogOpen(false);
    run(action);
  }

  function move(fieldKey: string, delta: number) {
    const keys = fields.map((f) => f.fieldKey);
    const idx = keys.indexOf(fieldKey);
    const target = idx + delta;
    if (idx < 0 || target < 0 || target >= keys.length) return;
    keys.splice(idx, 1);
    keys.splice(target, 0, fieldKey);
    setMovePending(true);
    const fd = new FormData();
    fd.set("fieldKeys", JSON.stringify(keys));
    startPageTransition(async () => {
      const res = await reorderRegistrationFields(fd);
      setMovePending(false);
      if (!res.ok) {
        toast.error(res.error ?? "Could not reorder.");
        return;
      }
      toast.success("Order updated.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Page copy */}
      <Card>
        <CardHeader>
          <CardTitle>Page copy</CardTitle>
          <CardDescription>Arabic and English text shown on /register.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSavePage} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pageTitleAr">Title (AR)</Label>
                <Input id="pageTitleAr" name="pageTitleAr" defaultValue={pageConfig?.pageTitleAr ?? "إنشاء حساب جديد"} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pageTitleEn">Title (EN)</Label>
                <Input id="pageTitleEn" name="pageTitleEn" defaultValue={pageConfig?.pageTitleEn ?? "Create new account"} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pageSubtitleAr">Subtitle (AR)</Label>
                <Input id="pageSubtitleAr" name="pageSubtitleAr" defaultValue={pageConfig?.pageSubtitleAr ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pageSubtitleEn">Subtitle (EN)</Label>
                <Input id="pageSubtitleEn" name="pageSubtitleEn" defaultValue={pageConfig?.pageSubtitleEn ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="submitButtonAr">Submit button (AR)</Label>
                <Input id="submitButtonAr" name="submitButtonAr" defaultValue={pageConfig?.submitButtonAr ?? "إرسال الكود"} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="submitButtonEn">Submit button (EN)</Label>
                <Input id="submitButtonEn" name="submitButtonEn" defaultValue={pageConfig?.submitButtonEn ?? "Send code"} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="successToastAr">Success toast (AR)</Label>
                <Input id="successToastAr" name="successToastAr" defaultValue={pageConfig?.successToastAr ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="successToastEn">Success toast (EN)</Label>
                <Input id="successToastEn" name="successToastEn" defaultValue={pageConfig?.successToastEn ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="errorGeneralAr">General error (AR)</Label>
                <Input id="errorGeneralAr" name="errorGeneralAr" defaultValue={pageConfig?.errorGeneralAr ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="errorGeneralEn">General error (EN)</Label>
                <Input id="errorGeneralEn" name="errorGeneralEn" defaultValue={pageConfig?.errorGeneralEn ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerLoginTextAr">Footer login text (AR)</Label>
                <Input id="footerLoginTextAr" name="footerLoginTextAr" defaultValue={pageConfig?.footerLoginTextAr ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerLoginTextEn">Footer login text (EN)</Label>
                <Input id="footerLoginTextEn" name="footerLoginTextEn" defaultValue={pageConfig?.footerLoginTextEn ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alreadyHaveAccountAr">Login link (AR)</Label>
                <Input id="alreadyHaveAccountAr" name="alreadyHaveAccountAr" defaultValue={pageConfig?.alreadyHaveAccountAr ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alreadyHaveAccountEn">Login link (EN)</Label>
                <Input id="alreadyHaveAccountEn" name="alreadyHaveAccountEn" defaultValue={pageConfig?.alreadyHaveAccountEn ?? ""} />
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-2">
                <Switch id="pageIsActive" checked={isActive} onCheckedChange={setIsActive} />
                <Label htmlFor="pageIsActive" className="text-sm">Registration page enabled</Label>
              </div>
              <Button type="submit" disabled={pagePending}>
                {pagePending ? <Loader2Icon className="size-4 animate-spin" /> : null}
                Save page copy
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Fields</CardTitle>
          <CardDescription>Fields rendered on /register. Toggles apply immediately.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {fields.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">No fields configured yet. Add the first one below.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6">Order</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Label (EN)</TableHead>
                  <TableHead>Label (AR)</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Visible</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((f) => (
                  <TableRow key={f.fieldKey}>
                    <TableCell className="px-6">
                      <div className="flex items-center gap-1">
                        <button type="button" disabled={movePending} onClick={() => move(f.fieldKey, -1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Move up">
                          ↑
                        </button>
                        <span className="w-6 text-center text-xs tabular-nums">{f.order}</span>
                        <button type="button" disabled={movePending} onClick={() => move(f.fieldKey, 1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Move down">
                          ↓
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{f.fieldKey}</TableCell>
                    <TableCell className="font-medium">{f.labelEn}</TableCell>
                    <TableCell>{f.labelAr}</TableCell>
                    <TableCell>
                      <Switch
                        size="sm"
                        checked={f.isRequired}
                        disabled={pendingKey === f.fieldKey}
                        onCheckedChange={(v) => {
                          setPendingKey(f.fieldKey);
                          const fd = new FormData();
                          fd.set("fieldKey", f.fieldKey);
                          fd.set("value", String(v));
                          startPageTransition(async () => {
                            const res = await toggleRegistrationFieldRequired(fd);
                            setPendingKey(null);
                            if (!res.ok) {
                              toast.error(res.error ?? "Could not update.");
                              return;
                            }
                            router.refresh();
                          });
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        size="sm"
                        checked={f.isVisible}
                        disabled={pendingKey === f.fieldKey}
                        onCheckedChange={(v) => {
                          setPendingKey(f.fieldKey);
                          const fd = new FormData();
                          fd.set("fieldKey", f.fieldKey);
                          fd.set("value", String(v));
                          startPageTransition(async () => {
                            const res = await toggleRegistrationFieldVisible(fd);
                            setPendingKey(null);
                            if (!res.ok) {
                              toast.error(res.error ?? "Could not update.");
                              return;
                            }
                            router.refresh();
                          });
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        size="sm"
                        checked={f.isActive}
                        disabled={pendingKey === f.fieldKey}
                        onCheckedChange={(v) => {
                          setPendingKey(f.fieldKey);
                          const fd = new FormData();
                          fd.set("fieldKey", f.fieldKey);
                          fd.set("value", String(v));
                          startPageTransition(async () => {
                            const res = await toggleRegistrationFieldActive(fd);
                            setPendingKey(null);
                            if (!res.ok) {
                              toast.error(res.error ?? "Could not update.");
                              return;
                            }
                            router.refresh();
                          });
                        }}
                      />
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => openEdit(f)}>
                          <PencilIcon className="size-3.5" />
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button type="button" variant="ghost" size="sm" className="text-destructive">
                              <Trash2Icon className="size-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete field?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This removes <span className="font-mono">{f.fieldKey}</span> from the registration form. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  const fd = new FormData();
                                  fd.set("fieldKey", f.fieldKey);
                                  run(deleteRegistrationField(fd));
                                }}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="border-t px-6 py-4">
            <Button type="button" onClick={openCreate}>
              <PlusIcon className="size-4" />
              Add field
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Field editor dialog */}
      <Dialog open={fieldDialogOpen} onOpenChange={setFieldDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingKey ? `Edit ${editingKey}` : "Add field"}</DialogTitle>
            <DialogDescription>Fields render in order on /register.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSaveField} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fieldKey">Key</Label>
              <Input id="fieldKey" name="fieldKey" value={draft.fieldKey} disabled={!!editingKey} required onChange={(e) => setDraft((d) => ({ ...d, fieldKey: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))} placeholder="fullName" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="labelAr">Label (AR)</Label>
                <Input id="labelAr" name="labelAr" value={draft.labelAr} required onChange={(e) => setDraft((d) => ({ ...d, labelAr: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="labelEn">Label (EN)</Label>
                <Input id="labelEn" name="labelEn" value={draft.labelEn} required onChange={(e) => setDraft((d) => ({ ...d, labelEn: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="placeholderAr">Placeholder (AR)</Label>
                <Input id="placeholderAr" name="placeholderAr" value={draft.placeholderAr} onChange={(e) => setDraft((d) => ({ ...d, placeholderAr: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="placeholderEn">Placeholder (EN)</Label>
                <Input id="placeholderEn" name="placeholderEn" value={draft.placeholderEn} onChange={(e) => setDraft((d) => ({ ...d, placeholderEn: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minLength">Min length</Label>
                <Input id="minLength" name="minLength" type="number" min={0} value={draft.minLength} onChange={(e) => setDraft((d) => ({ ...d, minLength: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxLength">Max length</Label>
                <Input id="maxLength" name="maxLength" type="number" min={0} value={draft.maxLength} onChange={(e) => setDraft((d) => ({ ...d, maxLength: e.target.value }))} />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Switch id="allowNumbers" checked={draft.allowNumbers} onCheckedChange={(v) => setDraft((d) => ({ ...d, allowNumbers: v }))} />
                <Label htmlFor="allowNumbers" className="text-sm">Allow numbers</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="allowSpecialChars" checked={draft.allowSpecialChars} onCheckedChange={(v) => setDraft((d) => ({ ...d, allowSpecialChars: v }))} />
                <Label htmlFor="allowSpecialChars" className="text-sm">Allow special characters</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="isRequired" checked={draft.isRequired} onCheckedChange={(v) => setDraft((d) => ({ ...d, isRequired: v }))} />
                <Label htmlFor="isRequired" className="text-sm">Required</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="isVisible" checked={draft.isVisible} onCheckedChange={(v) => setDraft((d) => ({ ...d, isVisible: v }))} />
                <Label htmlFor="isVisible" className="text-sm">Visible on form</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFieldDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pagePending}>
                {pagePending ? <Loader2Icon className="size-4 animate-spin" /> : null}
                {editingKey ? "Save changes" : "Add field"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
