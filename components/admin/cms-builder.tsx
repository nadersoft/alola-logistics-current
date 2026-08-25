"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  GripVerticalIcon,
  LayoutTemplateIcon,
  PencilIcon,
  PlusIcon,
  Star,
  Trash2Icon,
} from "lucide-react";
import type { CmsItemRow, CmsPageDetail, CmsSectionRow } from "@/lib/actions/cms";
import {
  createCmsPage,
  updateCmsPage,
  deleteCmsPage,
  toggleCmsPageActive,
  createCmsSection,
  updateCmsSection,
  deleteCmsSection,
  toggleCmsSectionActive,
  toggleCmsSectionVisible,
  reorderCmsSections,
  createCmsItem,
  updateCmsItem,
  deleteCmsItem,
  toggleCmsItemActive,
  toggleCmsItemVisible,
  setCmsItemFeatured,
  duplicateCmsItem,
  reorderCmsItems,
} from "@/lib/actions/cms";
import { serviceIcon, SERVICE_ICON_KEYS } from "@/components/landing/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const SECTION_TYPES = ["generic", "hero", "stats", "header", "services", "features", "tracking", "contact"];

type DeleteState = { kind: "page" | "section" | "item"; id: string; label: string } | null;

export function CmsBuilder({ pages }: { pages: CmsPageDetail[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedPageId, setSelectedPageId] = useState<string | null>(pages[0]?.id ?? null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(pages[0]?.sections[0]?.id ?? null);
  const [pageDialog, setPageDialog] = useState<{ open: boolean; editing: CmsPageDetail | null }>({ open: false, editing: null });
  const [sectionDialog, setSectionDialog] = useState<{ open: boolean; editing: CmsSectionRow | null }>({ open: false, editing: null });
  const [itemDialog, setItemDialog] = useState<{ open: boolean; editing: CmsItemRow | null }>({ open: false, editing: null });
  const [deleteState, setDeleteState] = useState<DeleteState>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const selectedPage = pages.find((p) => p.id === selectedPageId) ?? null;
  const sections = selectedPage?.sections ?? [];
  const selectedSection = sections.find((s) => s.id === selectedSectionId) ?? sections[0] ?? null;

  function run(action: Promise<{ ok: boolean; error?: string }>, message = "Saved.") {
    startTransition(async () => {
      const res = await action;
      if (!res.ok) {
        toast.error(res.error ?? "Something went wrong.");
        return;
      }
      toast.success(message);
      router.refresh();
    });
  }

  function confirmDelete(state: DeleteState) {
    setDeleteState(state);
  }

  function handleDeleteConfirmed() {
    if (!deleteState) return;
    const fd = new FormData();
    fd.set("id", deleteState.id);
    if (deleteState.kind === "page") run(deleteCmsPage(fd), "Page deleted.");
    if (deleteState.kind === "section") run(deleteCmsSection(fd), "Section deleted.");
    if (deleteState.kind === "item") run(deleteCmsItem(fd), "Item deleted.");
    setDeleteState(null);
  }

  function dropOrdered(list: { id: string }[], targetId: string): string[] | null {
    const ids = list.map((x) => x.id);
    const from = ids.indexOf(dragId ?? "");
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0 || from === to) return null;
    ids.splice(from, 1);
    ids.splice(to, 0, dragId as string);
    setDragId(null);
    return ids;
  }

  function dropSection(targetId: string) {
    if (!selectedPage) return;
    const ordered = dropOrdered(sections, targetId);
    if (!ordered) return;
    const fd = new FormData();
    fd.set("payload", JSON.stringify({ pageId: selectedPage.id, sectionIds: ordered }));
    run(reorderCmsSections(fd), "Sections reordered.");
  }

  function moveSection(index: number, dir: -1 | 1) {
    if (!selectedPage) return;
    const next = [...sections];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const fd = new FormData();
    fd.set("payload", JSON.stringify({ pageId: selectedPage.id, sectionIds: next.map((s) => s.id) }));
    run(reorderCmsSections(fd), "Sections reordered.");
  }

  function dropItem(targetId: string) {
    if (!selectedSection) return;
    const ordered = dropOrdered(selectedSection.items, targetId);
    if (!ordered) return;
    const fd = new FormData();
    fd.set("payload", JSON.stringify({ sectionId: selectedSection.id, itemIds: ordered }));
    run(reorderCmsItems(fd), "Items reordered.");
  }

  function moveItem(index: number, dir: -1 | 1) {
    if (!selectedSection) return;
    const next = [...selectedSection.items];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const fd = new FormData();
    fd.set("payload", JSON.stringify({ sectionId: selectedSection.id, itemIds: next.map((i) => i.id) }));
    run(reorderCmsItems(fd), "Items reordered.");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      {/* ============ Pages ============ */}
      <Card className="lg:col-span-3">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Pages</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setPageDialog({ open: true, editing: null })}>
            <PlusIcon className="size-4" /> New
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {pages.length === 0 && <p className="text-sm text-muted-foreground">No pages yet.</p>}
          {pages.map((page) => (
            <div
              key={page.id}
              onClick={() => {
                setSelectedPageId(page.id);
                setSelectedSectionId(page.sections[0]?.id ?? null);
              }}
              className={cn(
                "cursor-pointer rounded-lg border p-3 transition-colors",
                page.id === selectedPage?.id ? "border-primary bg-primary/5" : "hover:bg-accent/50"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">{page.titleEn}</div>
                  <div className="truncate text-xs text-muted-foreground">{page.titleAr}</div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      /{page.slug}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{page.sections.length} sections</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Switch
                    checked={page.isActive}
                    onCheckedChange={(v) => {
                      const fd = new FormData();
                      fd.set("id", page.id);
                      fd.set("value", String(v));
                      run(toggleCmsPageActive(fd), "Page updated.");
                    }}
                  />
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPageDialog({ open: true, editing: page });
                      }}
                    >
                      <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDelete({ kind: "page", id: page.id, label: page.titleEn });
                      }}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ============ Sections ============ */}
      <Card className="lg:col-span-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">
            Sections {selectedPage ? <span className="font-normal text-muted-foreground">· {selectedPage.titleEn}</span> : null}
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            disabled={!selectedPage}
            onClick={() => selectedPage && setSectionDialog({ open: true, editing: null })}
          >
            <PlusIcon className="size-4" /> New
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {!selectedPage ? (
            <p className="text-sm text-muted-foreground">Select a page.</p>
          ) : sections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sections yet.</p>
          ) : (
            sections.map((section, index) => {
              const Icon = LayoutTemplateIcon;
              return (
                <div
                  key={section.id}
                  draggable
                  onDragStart={() => setDragId(section.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropSection(section.id)}
                  onClick={() => setSelectedSectionId(section.id)}
                  className={cn(
                    "cursor-pointer rounded-lg border p-2 transition-colors",
                    section.id === selectedSection?.id ? "border-primary bg-primary/5" : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <GripVerticalIcon className="size-4 shrink-0 cursor-grab text-muted-foreground" />
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <Icon className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {section.type}
                        </Badge>
                        <span className="font-mono text-[11px] text-muted-foreground">{section.key}</span>
                      </div>
                      <div className="truncate text-sm font-medium">
                        {section.titleEn || section.badgeEn || "(untitled)"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{section.items.length} items</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={section.isVisible}
                          onCheckedChange={(v) => {
                            const fd = new FormData();
                            fd.set("id", section.id);
                            fd.set("value", String(v));
                            run(toggleCmsSectionVisible(fd), "Section updated.");
                          }}
                        />
                        <Switch
                          checked={section.isActive}
                          onCheckedChange={(v) => {
                            const fd = new FormData();
                            fd.set("id", section.id);
                            fd.set("value", String(v));
                            run(toggleCmsSectionActive(fd), "Section updated.");
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Button size="icon" variant="ghost" className="size-6" disabled={index === 0} onClick={(e) => { e.stopPropagation(); moveSection(index, -1); }}>
                          <ArrowUp className="size-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-6" disabled={index === sections.length - 1} onClick={(e) => { e.stopPropagation(); moveSection(index, 1); }}>
                          <ArrowDown className="size-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-6" onClick={(e) => { e.stopPropagation(); setSectionDialog({ open: true, editing: section }); }}>
                          <PencilIcon className="size-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-6 text-destructive" onClick={(e) => { e.stopPropagation(); confirmDelete({ kind: "section", id: section.id, label: section.key }); }}>
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* ============ Items ============ */}
      <Card className="lg:col-span-5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">
            Items {selectedSection ? <span className="font-normal text-muted-foreground">· {selectedSection.key}</span> : null}
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            disabled={!selectedSection}
            onClick={() => selectedSection && setItemDialog({ open: true, editing: null })}
          >
            <PlusIcon className="size-4" /> New
          </Button>
        </CardHeader>
        <CardContent>
          {!selectedSection ? (
            <p className="text-sm text-muted-foreground">Select a section.</p>
          ) : selectedSection.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Icon</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="text-center">Featured</TableHead>
                    <TableHead className="text-center">Vis</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedSection.items.map((item, index) => {
                    const Icon = serviceIcon(item.icon);
                    return (
                      <TableRow
                        key={item.id}
                        draggable
                        onDragStart={() => setDragId(item.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => dropItem(item.id)}
                      >
                        <TableCell>
                          <GripVerticalIcon className="size-4 cursor-grab text-muted-foreground" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
                              <Icon className="size-4 text-primary" />
                            </div>
                            <span className="font-mono text-[11px] text-muted-foreground">{item.icon}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[220px]">
                            <div className="truncate font-medium">{item.titleEn}</div>
                            <div className="truncate text-xs text-muted-foreground">{item.titleAr}</div>
                            {item.subValue && <div className="text-[11px] text-muted-foreground">{item.subValue}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.value ? <Badge variant="outline">{item.value}</Badge> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            className={cn("size-7", item.isFeatured && "text-amber-500")}
                            title="Featured (single per section)"
                            onClick={() => {
                              const fd = new FormData();
                              fd.set("id", item.id);
                              fd.set("value", String(!item.isFeatured));
                              run(setCmsItemFeatured(fd), "Featured updated.");
                            }}
                          >
                            <Star className={cn("size-4", item.isFeatured && "fill-amber-400 text-amber-400")} />
                          </Button>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            title={item.isVisible ? "Visible" : "Hidden"}
                            onClick={() => {
                              const fd = new FormData();
                              fd.set("id", item.id);
                              fd.set("value", String(!item.isVisible));
                              run(toggleCmsItemVisible(fd), "Item updated.");
                            }}
                          >
                            {item.isVisible ? <EyeIcon className="size-4" /> : <EyeOffIcon className="size-4 text-muted-foreground" />}
                          </Button>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={item.isActive}
                            onCheckedChange={(v) => {
                              const fd = new FormData();
                              fd.set("id", item.id);
                              fd.set("value", String(v));
                              run(toggleCmsItemActive(fd), "Item updated.");
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-0.5">
                            <Button size="icon" variant="ghost" className="size-6" disabled={index === 0} onClick={() => moveItem(index, -1)}>
                              <ArrowUp className="size-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="size-6" disabled={index === selectedSection.items.length - 1} onClick={() => moveItem(index, 1)}>
                              <ArrowDown className="size-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="size-6" title="Duplicate" onClick={() => {
                              const fd = new FormData();
                              fd.set("id", item.id);
                              run(duplicateCmsItem(fd), "Item duplicated.");
                            }}>
                              <CopyIcon className="size-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="size-6" onClick={() => setItemDialog({ open: true, editing: item })}>
                              <PencilIcon className="size-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="size-6 text-destructive" onClick={() => confirmDelete({ kind: "item", id: item.id, label: item.titleEn })}>
                              <Trash2Icon className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============ Dialogs ============ */}
      <PageDialog
        key={`page-${pageDialog.open ? pageDialog.editing?.id ?? "new" : "closed"}`}
        open={pageDialog.open}
        editing={pageDialog.editing}
        onOpenChange={(open) => setPageDialog({ open, editing: pageDialog.editing })}
        onClose={() => setPageDialog({ open: false, editing: null })}
        onSubmit={(fd) => (pageDialog.editing ? run(updateCmsPage(fd), "Page updated.") : run(createCmsPage(fd), "Page created."))}
      />

      {selectedPage && (
        <SectionDialog
          key={`section-${sectionDialog.open ? sectionDialog.editing?.id ?? "new" : "closed"}`}
          open={sectionDialog.open}
          editing={sectionDialog.editing}
          pageId={selectedPage.id}
          onOpenChange={(open) => setSectionDialog({ open, editing: sectionDialog.editing })}
          onClose={() => setSectionDialog({ open: false, editing: null })}
          onSubmit={(fd) => (sectionDialog.editing ? run(updateCmsSection(fd), "Section updated.") : run(createCmsSection(fd), "Section created."))}
        />
      )}

      {selectedSection && (
        <ItemDialog
          key={`item-${itemDialog.open ? itemDialog.editing?.id ?? "new" : "closed"}`}
          open={itemDialog.open}
          editing={itemDialog.editing}
          sectionId={selectedSection.id}
          onOpenChange={(open) => setItemDialog({ open, editing: itemDialog.editing })}
          onClose={() => setItemDialog({ open: false, editing: null })}
          onSubmit={(fd) => (itemDialog.editing ? run(updateCmsItem(fd), "Item updated.") : run(createCmsItem(fd), "Item created."))}
        />
      )}

      <AlertDialog open={!!deleteState} onOpenChange={(open) => !open && setDeleteState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteState?.kind}?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteState?.label}&rdquo; and everything nested under it will be permanently removed from the website.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirmed}
              disabled={pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------- Page dialog ----------

type PageDialogProps = {
  open: boolean;
  editing: CmsPageDetail | null;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
};

function PageDialog({ open, editing, onOpenChange, onClose, onSubmit }: PageDialogProps) {
  const [draft, setDraft] = useState(() => ({
    slug: editing?.slug ?? "",
    titleAr: editing?.titleAr ?? "",
    titleEn: editing?.titleEn ?? "",
  }));
  const [saving, startSaving] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    if (editing) fd.set("id", editing.id);
    fd.set("slug", draft.slug);
    fd.set("titleAr", draft.titleAr);
    fd.set("titleEn", draft.titleEn);
    fd.set("isActive", String(editing?.isActive ?? true));
    startSaving(() => {
      onSubmit(fd);
      onClose();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit page" : "New page"}</DialogTitle>
          <DialogDescription>Slug determines the public path (e.g. /services).</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pg-slug">Slug</Label>
            <Input id="pg-slug" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="services" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pg-en">Title (EN)</Label>
              <Input id="pg-en" value={draft.titleEn} onChange={(e) => setDraft({ ...draft, titleEn: e.target.value })} placeholder="Services" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pg-ar">Title (AR)</Label>
              <Input id="pg-ar" value={draft.titleAr} onChange={(e) => setDraft({ ...draft, titleAr: e.target.value })} placeholder="خدماتنا" dir="rtl" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Section dialog ----------

type SectionDialogProps = {
  open: boolean;
  editing: CmsSectionRow | null;
  pageId: string;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
};

function SectionDialog({ open, editing, pageId, onOpenChange, onClose, onSubmit }: SectionDialogProps) {
  const [draft, setDraft] = useState(() => ({
    key: editing?.key ?? "",
    type: editing?.type ?? "generic",
    badgeAr: editing?.badgeAr ?? "",
    badgeEn: editing?.badgeEn ?? "",
    titleAr: editing?.titleAr ?? "",
    titleEn: editing?.titleEn ?? "",
    subtitleAr: editing?.subtitleAr ?? "",
    subtitleEn: editing?.subtitleEn ?? "",
    contentAr: editing?.contentAr ?? "",
    contentEn: editing?.contentEn ?? "",
    imageUrl: editing?.imageUrl ?? "",
    isActive: editing?.isActive ?? true,
    isVisible: editing?.isVisible ?? true,
  }));
  const [saving, startSaving] = useTransition();
  const set = (patch: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...patch }));
  const types = SECTION_TYPES.includes(draft.type) ? SECTION_TYPES : [...SECTION_TYPES, draft.type];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    if (editing) fd.set("id", editing.id);
    fd.set("pageId", pageId);
    fd.set("key", draft.key);
    fd.set("type", draft.type);
    fd.set("badgeAr", draft.badgeAr);
    fd.set("badgeEn", draft.badgeEn);
    fd.set("titleAr", draft.titleAr);
    fd.set("titleEn", draft.titleEn);
    fd.set("subtitleAr", draft.subtitleAr);
    fd.set("subtitleEn", draft.subtitleEn);
    fd.set("contentAr", draft.contentAr);
    fd.set("contentEn", draft.contentEn);
    fd.set("imageUrl", draft.imageUrl);
    fd.set("isActive", String(draft.isActive));
    fd.set("isVisible", String(draft.isVisible));
    startSaving(() => {
      onSubmit(fd);
      onClose();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit section" : "New section"}</DialogTitle>
          <DialogDescription>Key is the machine identifier used by the frontend (e.g. services_list).</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sec-key">Key</Label>
              <Input id="sec-key" value={draft.key} onChange={(e) => set({ key: e.target.value })} placeholder="services_list" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sec-type">Type</Label>
              <Select value={draft.type} onValueChange={(v) => set({ type: v })}>
                <SelectTrigger id="sec-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sec-badge-en">Badge (EN)</Label>
              <Input id="sec-badge-en" value={draft.badgeEn} onChange={(e) => set({ badgeEn: e.target.value })} placeholder="Our Services" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sec-badge-ar">Badge (AR)</Label>
              <Input id="sec-badge-ar" value={draft.badgeAr} onChange={(e) => set({ badgeAr: e.target.value })} placeholder="خدماتنا" dir="rtl" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sec-title-en">Title (EN)</Label>
              <Input id="sec-title-en" value={draft.titleEn} onChange={(e) => set({ titleEn: e.target.value })} placeholder="Multi-Modal Solutions" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sec-title-ar">Title (AR)</Label>
              <Input id="sec-title-ar" value={draft.titleAr} onChange={(e) => set({ titleAr: e.target.value })} placeholder="حلول متعددة الوسائط" dir="rtl" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sec-sub-en">Subtitle (EN)</Label>
              <Textarea id="sec-sub-en" rows={2} value={draft.subtitleEn} onChange={(e) => set({ subtitleEn: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sec-sub-ar">Subtitle (AR)</Label>
              <Textarea id="sec-sub-ar" rows={2} value={draft.subtitleAr} onChange={(e) => set({ subtitleAr: e.target.value })} dir="rtl" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sec-content-en">Content (EN)</Label>
              <Textarea id="sec-content-en" rows={3} value={draft.contentEn} onChange={(e) => set({ contentEn: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sec-content-ar">Content (AR)</Label>
              <Textarea id="sec-content-ar" rows={3} value={draft.contentAr} onChange={(e) => set({ contentAr: e.target.value })} dir="rtl" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sec-image">Image URL</Label>
            <Input id="sec-image" value={draft.imageUrl} onChange={(e) => set({ imageUrl: e.target.value })} placeholder="https://..." />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={draft.isVisible} onCheckedChange={(v) => set({ isVisible: v })} /> Visible
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={draft.isActive} onCheckedChange={(v) => set({ isActive: v })} /> Active
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Item dialog ----------

type ItemDialogProps = {
  open: boolean;
  editing: CmsItemRow | null;
  sectionId: string;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
};

function ItemDialog({ open, editing, sectionId, onOpenChange, onClose, onSubmit }: ItemDialogProps) {
  const [draft, setDraft] = useState(() => ({
    slug: editing?.slug ?? "",
    icon: editing?.icon ?? "package",
    titleAr: editing?.titleAr ?? "",
    titleEn: editing?.titleEn ?? "",
    shortLabelAr: editing?.shortLabelAr ?? "",
    shortLabelEn: editing?.shortLabelEn ?? "",
    descriptionAr: editing?.descriptionAr ?? "",
    descriptionEn: editing?.descriptionEn ?? "",
    value: editing?.value ?? "",
    subValue: editing?.subValue ?? "",
    imageUrl: editing?.imageUrl ?? "",
    linkUrl: editing?.linkUrl ?? "",
    isActive: editing?.isActive ?? true,
    isVisible: editing?.isVisible ?? true,
    isFeatured: editing?.isFeatured ?? false,
  }));
  const [saving, startSaving] = useTransition();
  const set = (patch: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...patch }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    if (editing) fd.set("id", editing.id);
    fd.set("sectionId", sectionId);
    fd.set("slug", draft.slug);
    fd.set("icon", draft.icon);
    fd.set("titleAr", draft.titleAr);
    fd.set("titleEn", draft.titleEn);
    fd.set("shortLabelAr", draft.shortLabelAr);
    fd.set("shortLabelEn", draft.shortLabelEn);
    fd.set("descriptionAr", draft.descriptionAr);
    fd.set("descriptionEn", draft.descriptionEn);
    fd.set("value", draft.value);
    fd.set("subValue", draft.subValue);
    fd.set("imageUrl", draft.imageUrl);
    fd.set("linkUrl", draft.linkUrl);
    fd.set("isActive", String(draft.isActive));
    fd.set("isVisible", String(draft.isVisible));
    fd.set("isFeatured", String(draft.isFeatured));
    startSaving(() => {
      onSubmit(fd);
      onClose();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit item" : "New item"}</DialogTitle>
          <DialogDescription>Items power the services list, stats, features and more.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="it-slug">Slug</Label>
              <Input id="it-slug" value={draft.slug} onChange={(e) => set({ slug: e.target.value })} placeholder="air-freight" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="it-icon">Icon</Label>
              <Select value={draft.icon} onValueChange={(v) => set({ icon: v })}>
                <SelectTrigger id="it-icon"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_ICON_KEYS.map((key) => {
                    const Icon = serviceIcon(key);
                    return (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <Icon className="size-4" /> {key}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="it-value">Value</Label>
              <Input id="it-value" value={draft.value} onChange={(e) => set({ value: e.target.value })} placeholder="33.2 CBM" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="it-title-en">Title (EN)</Label>
              <Input id="it-title-en" value={draft.titleEn} onChange={(e) => set({ titleEn: e.target.value })} placeholder="Air Freight" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="it-title-ar">Title (AR)</Label>
              <Input id="it-title-ar" value={draft.titleAr} onChange={(e) => set({ titleAr: e.target.value })} placeholder="الشحن الجوي" dir="rtl" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="it-short-en">Short label (EN)</Label>
              <Input id="it-short-en" value={draft.shortLabelEn} onChange={(e) => set({ shortLabelEn: e.target.value })} placeholder="Priority Express" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="it-short-ar">Short label (AR)</Label>
              <Input id="it-short-ar" value={draft.shortLabelAr} onChange={(e) => set({ shortLabelAr: e.target.value })} placeholder="شحن سريع" dir="rtl" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="it-desc-en">Description (EN)</Label>
              <Textarea id="it-desc-en" rows={3} value={draft.descriptionEn} onChange={(e) => set({ descriptionEn: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="it-desc-ar">Description (AR)</Label>
              <Textarea id="it-desc-ar" rows={3} value={draft.descriptionAr} onChange={(e) => set({ descriptionAr: e.target.value })} dir="rtl" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="it-subvalue">Sub-value</Label>
              <Input id="it-subvalue" value={draft.subValue} onChange={(e) => set({ subValue: e.target.value })} placeholder="20' GP" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="it-link">Link URL</Label>
              <Input id="it-link" value={draft.linkUrl} onChange={(e) => set({ linkUrl: e.target.value })} placeholder="/quote" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={draft.isVisible} onCheckedChange={(v) => set({ isVisible: v })} /> Visible
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={draft.isActive} onCheckedChange={(v) => set({ isActive: v })} /> Active
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={draft.isFeatured} onCheckedChange={(v) => set({ isFeatured: v })} /> Featured
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
