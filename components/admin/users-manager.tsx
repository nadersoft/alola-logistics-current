"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PlusIcon, PencilIcon, Trash2Icon, KeyRoundIcon, Loader2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createUser, updateUser, resetPassword, deleteUser } from "@/lib/actions/users";

export type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
};

const ROLE_STYLE: Record<string, "default" | "outline" | "secondary" | "destructive"> = {
  SUPER_ADMIN: "default",
  MANAGER: "secondary",
  SUPPORT: "outline",
  CLIENT: "outline",
};

export function UsersManager({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<UserRow | "new" | null>(null);
  const [resetting, setResetting] = useState<UserRow | null>(null);

  function refresh() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1" onClick={() => setEditing("new")}>
          <PlusIcon className="size-4" /> New user
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.name}
                    {u.id === currentUserId ? <span className="ml-1 text-xs text-muted-foreground">(you)</span> : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.email ?? "—"}
                    {u.phone ? <span className="block text-xs">{u.phone}</span> : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ROLE_STYLE[u.role] ?? "outline"}>{u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? "default" : "destructive"}>{u.isActive ? "Active" : "Disabled"}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditing(u)}>
                        <PencilIcon className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => setResetting(u)}>
                        <KeyRoundIcon className="size-3.5" />
                      </Button>
                      {u.id !== currentUserId ? <DeleteUserButton id={u.id} name={u.name ?? u.email ?? u.id} onDone={refresh} /> : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing !== null ? (
        <UserDialog
          user={editing === "new" ? null : editing}
          isNew={editing === "new"}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            toast.success(editing === "new" ? "User created" : "User updated");
            refresh();
          }}
        />
      ) : null}
      {resetting ? (
        <ResetPasswordDialog
          user={resetting}
          onClose={() => setResetting(null)}
          onSaved={() => {
            setResetting(null);
            toast.success("Password reset");
          }}
        />
      ) : null}
    </div>
  );
}

function DeleteUserButton({ id, name, onDone }: { id: string; name: string; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7 text-destructive">
          <Trash2Icon className="size-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete user “{name}”?</AlertDialogTitle>
          <AlertDialogDescription>Sessions are revoked and the account is removed. This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const res = await deleteUser(id);
                if (res.ok) {
                  toast.success("User deleted");
                  onDone();
                } else toast.error(res.error ?? "Delete failed");
              });
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function UserDialog({ user, isNew, onClose, onSaved }: { user: UserRow | null; isNew: boolean; onClose: () => void; onSaved: () => void }) {
  const [pending, startTransition] = useTransition();
  const [isActive, setIsActive] = useState(user?.isActive ?? true);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (!isNew) data.set("id", user!.id);
    startTransition(async () => {
      const res = isNew ? await createUser(data) : await updateUser(data);
      if (res.ok) onSaved();
      else toast.error(res.error ?? "Save failed");
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isNew ? "New user" : "Edit user"}</DialogTitle>
          <DialogDescription>Role gates access — middleware enforces it on every route.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" required defaultValue={user?.name ?? ""} />
          </div>
          {isNew ? (
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required defaultValue={user?.email ?? ""} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Email: {user?.email}</p>
          )}
          {isNew ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={user?.phone ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Initial password</Label>
                <Input id="password" name="password" type="password" required minLength={8} />
              </div>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select name="role" defaultValue={user?.role ?? "CLIENT"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUPER_ADMIN">SUPER_ADMIN</SelectItem>
                <SelectItem value="MANAGER">MANAGER</SelectItem>
                <SelectItem value="SUPPORT">SUPPORT</SelectItem>
                <SelectItem value="CLIENT">CLIENT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="isActive">Account enabled</Label>
            <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
            <input type="hidden" name="isActive" value={isActive ? "true" : "false"} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {isNew ? "Create user" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ user, onClose, onSaved }: { user: UserRow; onClose: () => void; onSaved: () => void }) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    data.set("id", user.id);
    startTransition(async () => {
      const res = await resetPassword(data);
      if (res.ok) onSaved();
      else toast.error(res.error ?? "Reset failed");
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password for {user.name ?? user.email}</DialogTitle>
          <DialogDescription>The current password stops working immediately.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <Input id="password" name="password" type="password" required minLength={8} placeholder="At least 8 characters" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
            I understand this logs the user out on their next request.
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !confirm}>
              {pending ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Reset password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
