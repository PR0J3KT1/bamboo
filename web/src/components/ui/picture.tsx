import Image from "next/image";
import type { Picture } from "@/lib/pictures";
import { cn } from "@/lib/utils";

/* An item's picture, filling its (relative, sized) parent. A photo covers it; a bottle stands in
   the middle of it, cut from its sheet, so the parent should be a dark stage. */
export function Pic({ picture, alt, sizes, className, priority }: { picture: Picture; alt: string; sizes: string; className?: string; priority?: boolean }) {
  if (picture.kind === "photo") {
    return <Image src={picture.src} alt={alt} fill sizes={sizes} priority={priority} className={cn("object-cover", className)} />;
  }
  return (
    <span
      role="img"
      aria-label={alt}
      className={cn("bottle-shot absolute bottom-[7%] left-1/2 h-[87%] -translate-x-1/2", className)}
      style={
        {
          "--webp": `url("/drinks/${picture.sheet}.webp")`,
          "--avif": `url("/drinks/${picture.sheet}.avif")`,
          backgroundPosition: `${picture.x * 20}% ${picture.y * 25}%`,
        } as React.CSSProperties
      }
    />
  );
}

/** Who took a free-licensed photo, as its licence asks; and that a dish photo is only an
    illustration. Nothing for the lounge's own photos. */
export function PhotoCredit({ picture, className }: { picture: Picture; className?: string }) {
  if (!picture.credit) return null;
  const [author, licence, page, note] = picture.credit;
  const lead = note ? `${note} ` : picture.kind === "photo" && picture.illustration ? "A photo for illustration; the lounge’s plate may look different. " : "";
  return (
    <p className={cn("text-fine text-ink-3", className)}>
      {lead}Photo: {author}, {licence},{" "}
      <a href={page} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Wikimedia Commons</a>.
    </p>
  );
}
