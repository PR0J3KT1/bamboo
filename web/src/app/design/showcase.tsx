"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChoicePill, Tag } from "@/components/ui/pill";
import { Price } from "@/components/ui/price";
import { Stepper } from "@/components/ui/stepper";
import { TextAreaField, TextField } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { ThemePicker } from "@/components/ui/theme-picker";
import { Button as AdminButton } from "@/components/admin/button";
import { Switch } from "@/components/admin/switch";
import { Badge } from "@/components/admin/badge";
import { Input } from "@/components/admin/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/table";

const SIZES = [["¼ kg", 450], ["½ kg", 900], ["¾ kg", 1500], ["1 kg", 1800]] as const;

export function Showcase() {
  const [qty, setQty] = useState(2);
  const [size, setSize] = useState("1 kg");
  const [open, setOpen] = useState(false);
  const [soldOut, setSoldOut] = useState(false);
  const toast = useToast();

  return (
    <div className="flex flex-col">
      <header className="grove-bg text-on-grove">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-5 md:px-8">
          <h1 className="font-stencil text-h2 font-black">DESIGN SYSTEM</h1>
          <ThemePicker onGrove />
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-8 md:px-8">
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-h2 font-extrabold uppercase">Type</h2>
          <p className="font-stencil text-h1 font-black">ON THE COALS</p>
          <p className="font-display text-h2 font-extrabold uppercase">Kienyeji chicken</p>
          <p className="font-display text-h3 font-extrabold uppercase">Mbuzi ribs</p>
          <p className="font-serif text-lead text-ink-2 italic">Choma takes time: allow about 35 minutes.</p>
          <p className="max-w-prose text-body">Free-range kienyeji chicken, cooked the house way. Dry fry or wet fry, with ugali and greens on the side.</p>
          <p className="text-fine text-ink-2">Fine print: the rider checks ID at handover.</p>
          <div className="flex flex-wrap items-baseline gap-6">
            <Price amount={450} from size="md" />
            <Price amount={1800} size="lg" />
            <Price amount={2450} size="xl" />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-h2 font-extrabold uppercase">Buttons</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="main" size="lg" onClick={() => toast("Order placed")}>Place order</Button>
            <Button onClick={() => toast("Added to your order")}>Add to order</Button>
            <Button variant="outline">Change</Button>
            <Button variant="danger" onClick={() => toast("Order cancelled", "danger")}>Cancel order</Button>
            <Button variant="quiet">Discard changes</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-grove p-4">
            <Button variant="grove" size="sm">Sign in</Button>
            <Button variant="main" size="sm">Accept</Button>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-h2 font-extrabold uppercase">Choices and counts</h2>
          <div className="flex flex-wrap gap-2">
            {SIZES.map(([s, p]) => (
              <ChoicePill key={s} selected={size === s} onClick={() => setSize(s)}>
                {s} <span className="figures text-[1.0625rem]">{p.toLocaleString("en-KE")}</span>
              </ChoicePill>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Stepper value={qty} onChange={setQty} label="Chips" />
            <Stepper value={qty} onChange={setQty} label="Ugali" size="sm" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Tag tone="ok">Open, 18+</Tag>
            <Tag tone="danger">Closed, under 18</Tag>
            <Tag tone="warn">22 min</Tag>
            <Tag>Account not finished</Tag>
            <Tag tone="grove">Blocked</Tag>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <h2 className="font-display text-h2 font-extrabold uppercase md:col-span-2">Fields</h2>
          <TextField label="Directions for the rider" defaultValue="Gate B, Chiromo Lane flats, 3rd floor" hint="The rider sees this." />
          <TextField label="Mobile number" defaultValue="0712 34" error="Enter a Kenyan mobile number, like 0712 345 678." />
          <TextAreaField label="A note for the kitchen" defaultValue="Choma well done, please. Extra kachumbari." className="md:col-span-2" />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-h2 font-extrabold uppercase">Sheet</h2>
          <div><Button onClick={() => setOpen(true)}>Open the Mbuzi choma sheet</Button></div>
          <Sheet
            open={open}
            onClose={() => setOpen(false)}
            title="Mbuzi choma"
            footer={
              <div className="flex items-center gap-3">
                <Stepper value={qty} onChange={setQty} label="Mbuzi choma" min={1} />
                <Button variant="main" size="lg" className="flex-1 justify-between" onClick={() => { setOpen(false); toast("Added to your order"); }}>
                  Add to order <Price amount={1800 * qty} size="sm" />
                </Button>
              </div>
            }
          >
            <p className="text-body text-ink-2">Goat grilled over charcoal and chopped on the board. By weight, or a half or whole goat for a party.</p>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 font-bold">How much?</legend>
              <div className="flex flex-wrap gap-2">
                {SIZES.map(([s]) => (
                  <ChoicePill key={s} selected={size === s} onClick={() => setSize(s)}>{s}</ChoicePill>
                ))}
              </div>
            </fieldset>
            <p className="font-serif text-[1rem] text-ink-2 italic">Allow about 35 minutes from the coals.</p>
          </Sheet>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-h2 font-extrabold uppercase">Admin (shadcn, restyled)</h2>
          <div className="flex flex-wrap items-center gap-3">
            <AdminButton>Save prices</AdminButton>
            <AdminButton variant="outline">Add an item</AdminButton>
            <AdminButton variant="destructive">Block this number</AdminButton>
            <Badge>Signature</Badge>
            <Input placeholder="Search 427 items" className="max-w-60" />
            <label className="flex items-center gap-2 text-body font-semibold">
              <Switch checked={!soldOut} onCheckedChange={(v) => setSoldOut(!v)} />
              {soldOut ? "Sold out" : "On the menu"}
            </label>
          </div>
          <div className="overflow-hidden rounded-2xl border bg-panel">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Dish</TableHead><TableHead className="text-right">Sold</TableHead><TableHead className="text-right">Taken, KES</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                <TableRow><TableCell>Mbuzi choma, 1 kg</TableCell><TableCell className="figures text-right text-lead">41</TableCell><TableCell className="figures text-right text-lead">73,800</TableCell></TableRow>
                <TableRow><TableCell>Kienyeji chicken, whole</TableCell><TableCell className="figures text-right text-lead">22</TableCell><TableCell className="figures text-right text-lead">55,000</TableCell></TableRow>
              </TableBody>
            </Table>
          </div>
        </section>
      </main>
    </div>
  );
}
