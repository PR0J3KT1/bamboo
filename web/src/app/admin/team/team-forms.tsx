"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/select";
import { addToTeam, changeRole } from "./actions";

const LABEL: Record<string, string> = { staff: "Staff", admin: "Admin", customer: "Not on the team" };

export function AddToTeam() {
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("staff");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await addToTeam(phone, role);
          if (!r.ok) return setError(r.error);
          setPhone("");
          toast(r.message);
        });
      }}
    >
      <TextField label="Their mobile number" type="tel" inputMode="tel" placeholder="0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} error={error} className="min-w-60 flex-1" />
      <div className="flex flex-col gap-1.5">
        <span id="add-role" className="text-[0.875rem] font-semibold">Role</span>
        <Select value={role} onValueChange={(v) => v && setRole(v)}>
          <SelectTrigger aria-labelledby="add-role" className="h-12 w-36"><SelectValue>{LABEL[role]}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={pending || !phone}>{pending ? "Adding…" : "Add to the team"}</Button>
    </form>
  );
}

export function RoleSelect({ userId, role, name, self }: { userId: string; role: string; name: string; self: boolean }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  if (self) return <span className="text-ink-2">{LABEL[role]} (you)</span>;
  return (
    <Select
      value={role}
      disabled={pending}
      onValueChange={(v) => {
        if (!v || v === role) return;
        start(async () => {
          const r = await changeRole(userId, v);
          toast(r.ok ? r.message : r.error, r.ok ? "ok" : "danger");
        });
      }}
    >
      <SelectTrigger aria-label={`Role for ${name}`} className="w-44"><SelectValue>{LABEL[role]}</SelectValue></SelectTrigger>
      <SelectContent>
        <SelectItem value="staff">Staff</SelectItem>
        <SelectItem value="admin">Admin</SelectItem>
        <SelectItem value="customer">Not on the team</SelectItem>
      </SelectContent>
    </Select>
  );
}
