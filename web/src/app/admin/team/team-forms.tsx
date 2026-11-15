"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/select";
import { addToTeam, updateMember } from "./actions";

const LABEL: Record<string, string> = { staff: "Staff", manager: "Manager", admin: "Admin", customer: "Not on the team" };
const oneLocation = (role: string) => role === "staff" || role === "manager";

export type Place = { id: string; name: string };

/** The roles this person may hand out: admins any, managers staff only. */
export type Grant = { roles: string[]; locations: Place[]; ownLocation: string | null };

function PlaceSelect({ value, onChange, locations, label, disabled }: { value: string | null; onChange: (v: string) => void; locations: Place[]; label: string; disabled?: boolean }) {
  return (
    <Select value={value ?? ""} disabled={disabled} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger aria-label={label} className="h-12 w-40"><SelectValue>{locations.find((l) => l.id === value)?.name ?? "Choose a location"}</SelectValue></SelectTrigger>
      <SelectContent>
        {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function AddToTeam({ grant }: { grant: Grant }) {
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState(grant.roles[0]);
  const [location, setLocation] = useState<string | null>(grant.ownLocation ?? (grant.locations.length === 1 ? grant.locations[0].id : null));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const choosePlace = oneLocation(role) && !grant.ownLocation && grant.locations.length > 1;
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await addToTeam(phone, role, oneLocation(role) ? location : null);
          if (!r.ok) return setError(r.error);
          setPhone("");
          toast(r.message);
        });
      }}
    >
      <TextField label="Their mobile number" type="tel" inputMode="tel" placeholder="0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} error={error} className="min-w-0 flex-[1_1_220px]" />
      {grant.roles.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <span id="add-role" className="text-[0.875rem] font-semibold">Role</span>
          <Select value={role} onValueChange={(v) => v && setRole(v)}>
            <SelectTrigger aria-labelledby="add-role" className="h-12 w-36"><SelectValue>{LABEL[role]}</SelectValue></SelectTrigger>
            <SelectContent>
              {grant.roles.map((r) => <SelectItem key={r} value={r}>{LABEL[r]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      {choosePlace && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.875rem] font-semibold">Works at</span>
          <PlaceSelect value={location} onChange={setLocation} locations={grant.locations} label="Works at" />
        </div>
      )}
      <Button type="submit" disabled={pending || !phone || (oneLocation(role) && !location)}>{pending ? "Adding…" : "Add to the team"}</Button>
    </form>
  );
}

/** Role and location for one person on the team. */
export function MemberControls({ userId, role, locationId, name, self, grant }: { userId: string; role: string; locationId: string | null; name: string; self: boolean; grant: Grant }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  if (self) return <span className="text-ink-2">{LABEL[role]} (you)</span>;
  const save = (r: string, l: string | null) =>
    start(async () => {
      const res = await updateMember(userId, r, l);
      toast(res.ok ? res.message : res.error, res.ok ? "ok" : "danger");
    });
  const roles = [...grant.roles, "customer"];
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Select
        value={role}
        disabled={pending}
        onValueChange={(v) => {
          if (!v || v === role) return;
          /* someone new to a location role starts at the first location; the next box moves them */
          save(v, oneLocation(v) ? (locationId ?? grant.ownLocation ?? grant.locations[0]?.id ?? null) : null);
        }}
      >
        <SelectTrigger aria-label={`Role for ${name}`} className="h-12 w-44"><SelectValue>{LABEL[role]}</SelectValue></SelectTrigger>
        <SelectContent>
          {roles.map((r) => <SelectItem key={r} value={r}>{LABEL[r]}</SelectItem>)}
        </SelectContent>
      </Select>
      {oneLocation(role) && !grant.ownLocation && grant.locations.length > 1 && (
        <PlaceSelect value={locationId} onChange={(l) => l !== locationId && save(role, l)} locations={grant.locations} label={`Where ${name} works`} disabled={pending} />
      )}
    </span>
  );
}
