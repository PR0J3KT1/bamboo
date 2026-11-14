"use client";
import { useId, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Plus, X } from "lucide-react";
import type { AdminDish, AdminMenuData } from "@/db/queries/admin-menu";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/admin/sheet";
import { Switch } from "@/components/admin/switch";
import { Button } from "@/components/ui/button";
import { TextAreaField, TextField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { removePhoto, saveDish, uploadPhoto, type DishInput } from "./actions";

type SizeRow = { id: string | null; portion: string; price: string; active: boolean; rowKey: string };

const selectCls = "h-12 w-full rounded-xl border-[1.5px] border-line bg-card px-3 text-body";

/** Shrink a phone photo in the browser before upload: at most 2000 px, WebP, usually under 0.5 MB.
    The server shrinks it again to 1600 px; this just keeps the upload small on mobile data. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const canvas = new OffscreenCanvas(Math.round(bmp.width * scale), Math.round(bmp.height * scale));
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await canvas.convertToBlob({ type: "image/webp", quality: 0.85 });
  } catch {
    return file; // the server will try
  }
}

export function DishEditor({ dish, data, defaultCategory, onClose, onSaved }: {
  dish: AdminDish | null;
  data: AdminMenuData;
  defaultCategory: string | undefined;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const ids = useId();
  const [name, setName] = useState(dish?.name ?? "");
  const [description, setDescription] = useState(dish?.description ?? "");
  const [categoryId, setCategoryId] = useState(dish?.categoryId ?? defaultCategory ?? data.categories[0].id);
  const [shelfId, setShelfId] = useState(dish?.shelfId ?? "");
  const [tag, setTag] = useState(dish?.tag ?? "");
  const [options, setOptions] = useState((dish?.options ?? []).join(", "));
  const [optionLabel, setOptionLabel] = useState(dish?.optionLabel ?? "");
  const [sizeLabel, setSizeLabel] = useState(dish?.sizeLabel ?? "How much?");
  const [alcohol, setAlcohol] = useState(dish?.alcohol ?? false);
  const [kind, setKind] = useState(dish?.kind ?? "");
  const [abv, setAbv] = useState(dish?.abv != null ? String(dish.abv) : "");
  const [origin, setOrigin] = useState(dish?.origin ?? "");
  const [serve, setServe] = useState(dish?.serve ?? "");
  const [sizes, setSizes] = useState<SizeRow[]>(
    dish?.sizes.map((s) => ({ id: s.id, portion: s.portion ?? "", price: String(s.price), active: s.active, rowKey: s.id })) ?? [
      { id: null, portion: "", price: "", active: true, rowKey: "new-0" },
    ],
  );
  const [image, setImage] = useState(dish?.image ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [uploading, startUpload] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const isDrink = categoryId === "bar" || categoryId === "soft";
  const multi = sizes.length > 1;

  function save() {
    setError(null);
    const input: DishInput = {
      key: dish?.key ?? null,
      name,
      description: description || null,
      categoryId,
      shelfId: isDrink ? shelfId || null : null,
      tag: tag || null,
      options: options.split(",").map((o) => o.trim()).filter(Boolean),
      optionLabel: optionLabel || null,
      sizeLabel: multi ? sizeLabel || null : null,
      alcohol,
      brand: dish?.brand ?? null,
      kind: isDrink ? kind || null : null,
      abv: isDrink && abv !== "" ? Number(abv) : null,
      origin: isDrink ? origin || null : null,
      serve: serve || null,
      sizes: sizes.map((s) => ({ id: s.id, portion: s.portion || null, price: Number(s.price.replace(/[,\s]/g, "")), active: s.active })),
    };
    if (sizes.some((s) => !/^\d+$/.test(s.price.replace(/[,\s]/g, "")))) return setError("Prices must be whole shillings.");
    startSave(async () => {
      const r = await saveDish(input);
      if (!r.ok) return setError(r.error);
      toast(r.message);
      onSaved();
    });
  }

  function upload(file: File) {
    if (!dish) return;
    startUpload(async () => {
      const fd = new FormData();
      fd.set("key", dish.key);
      fd.set("file", new File([await shrink(file)], "photo.webp", { type: "image/webp" }));
      const r = await uploadPhoto(fd);
      if (!r.ok) return toast(r.error, "danger");
      setImage(r.url ?? null);
      toast(r.message);
    });
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full gap-0 bg-panel p-0 sm:max-w-[640px]">
        <SheetHeader className="border-b border-line px-5 py-4">
          <SheetTitle className="font-display text-h3 font-extrabold uppercase">{dish ? dish.name : "A new dish or drink"}</SheetTitle>
          <SheetDescription>{dish ? "Changes show on the menu as soon as you save." : "It goes on the menu as soon as you save."}</SheetDescription>
        </SheetHeader>

        <form
          id={`${ids}-form`}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4 text-body"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          {dish && (
            <div className="flex items-center gap-3.5">
              {image ? (
                <Image src={image} alt={`${name}`} width={150} height={112} className="h-28 w-[150px] rounded-xl object-cover" />
              ) : (
                <span className="flex h-28 w-[150px] items-center justify-center rounded-xl bg-ground-2 px-3 text-center text-fine text-ink-2">
                  {dish.hasOldPhoto ? "A photo from the old site; upload one to replace it" : "No photo yet"}
                </span>
              )}
              <div className="flex flex-col items-start gap-2">
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? "Uploading…" : image ? "Replace photo" : "Add a photo"}
                </Button>
                {image && (
                  <button
                    type="button"
                    className="text-fine font-semibold text-danger underline"
                    onClick={() =>
                      startUpload(async () => {
                        const r = await removePhoto(dish.key);
                        if (r.ok) setImage(null);
                        toast(r.ok ? r.message : r.error, r.ok ? "ok" : "danger");
                      })
                    }
                  >
                    Remove photo
                  </button>
                )}
                <span className="text-fine text-ink-2">The lounge&rsquo;s own photo. A phone photo is fine.</span>
              </div>
            </div>
          )}

          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
          <TextAreaField label="What customers read" rows={2} maxLength={400} value={description} onChange={(e) => setDescription(e.target.value)} />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-[0.875rem] font-semibold">Menu section
              <select className={selectCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <TextField label="Badge" value={tag} onChange={(e) => setTag(e.target.value)} maxLength={30} placeholder="Signature, House…" />
          </div>

          <fieldset className="flex flex-col gap-2.5 rounded-2xl border border-line p-3.5">
            <legend className="px-1.5 font-bold">Sizes and prices</legend>
            {multi && <TextField label="Question above the sizes" value={sizeLabel} onChange={(e) => setSizeLabel(e.target.value)} maxLength={40} />}
            <div className="grid grid-cols-[minmax(0,1fr)_120px_auto_44px] items-end gap-2 text-fine font-semibold text-ink-2">
              <span>{multi ? "Size" : isDrink ? "Bottle size" : "Size (if any)"}</span><span>Price, KES</span><span>On</span><span />
            </div>
            {sizes.map((s, i) => (
              <div key={s.rowKey} className="grid grid-cols-[minmax(0,1fr)_120px_auto_44px] items-center gap-2">
                <input aria-label="Size" value={s.portion} maxLength={30} placeholder={multi ? "½ kg" : isDrink ? "750 ml" : ""} onChange={(e) => setSizes(sizes.map((x, j) => (j === i ? { ...x, portion: e.target.value } : x)))} className="h-11 rounded-[10px] border-[1.5px] border-line bg-card px-3" />
                <input aria-label={`Price${s.portion ? ` for ${s.portion}` : ""}`} inputMode="numeric" value={s.price} onChange={(e) => setSizes(sizes.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} className="figures h-11 rounded-[10px] border-[1.5px] border-line bg-card px-3 text-[1.25rem]" />
                <Switch aria-label={`${s.portion || "This size"} on the menu`} checked={s.active} onCheckedChange={(v) => setSizes(sizes.map((x, j) => (j === i ? { ...x, active: !!v } : x)))} />
                {sizes.length > 1 && !s.id ? (
                  <button type="button" aria-label="Remove this size" onClick={() => setSizes(sizes.filter((_, j) => j !== i))} className="flex size-11 items-center justify-center rounded-full bg-ground-2"><X aria-hidden className="size-4" /></button>
                ) : <span />}
              </div>
            ))}
            <button type="button" onClick={() => setSizes([...sizes, { id: null, portion: "", price: "", active: true, rowKey: `new-${Date.now()}` }])} className="flex h-10 items-center gap-1.5 self-start rounded-full border-[1.5px] border-dashed border-action px-3.5 text-[0.875rem] font-semibold text-action">
              <Plus aria-hidden className="size-4" /> Add a size
            </button>
            <p className="text-fine text-ink-2">Switch a size off to stop selling it; it stays in past orders.</p>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Customer chooses (comma between)" value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Dry fry, Wet fry" />
            <TextField label="Question for the choice" value={optionLabel} onChange={(e) => setOptionLabel(e.target.value)} placeholder="How would you like it?" />
          </div>

          {isDrink && (
            <fieldset className="grid gap-3 rounded-2xl border border-line p-3.5 sm:grid-cols-2">
              <legend className="px-1.5 font-bold">The drink</legend>
              <label className="flex flex-col gap-1.5 text-[0.875rem] font-semibold">Shelf
                <select className={selectCls} value={shelfId} onChange={(e) => setShelfId(e.target.value)}>
                  <option value="">None</option>
                  {data.shelves.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <TextField label="Kind" value={kind} onChange={(e) => setKind(e.target.value)} placeholder="Blended Scotch" />
              <TextField label="Strength, % ABV" inputMode="decimal" value={abv} onChange={(e) => setAbv(e.target.value)} />
              <TextField label="From" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Scotland" />
            </fieldset>
          )}
          <TextField label="How it's served (optional)" value={serve} onChange={(e) => setServe(e.target.value)} maxLength={200} placeholder={isDrink ? "Neat, or over one large cube." : ""} />

          <label className="flex items-center gap-3 font-semibold">
            <Switch checked={alcohol} onCheckedChange={(v) => setAlcohol(!!v)} />
            <span>Contains alcohol <span className="font-normal text-ink-2">(hidden from guests and under-18s)</span></span>
          </label>
        </form>

        <SheetFooter className="flex-row items-center justify-end gap-2 border-t border-line px-5 py-3.5">
          {error && <p role="alert" className="mr-auto text-fine font-semibold text-danger">{error}</p>}
          <Button variant="quiet" onClick={onClose}>Discard changes</Button>
          <Button type="submit" form={`${ids}-form`} variant="main" disabled={saving}>{saving ? "Saving…" : dish ? "Save changes" : "Add to the menu"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
