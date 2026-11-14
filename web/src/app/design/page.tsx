import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Showcase } from "./showcase";

export const metadata: Metadata = { title: "Design system" };

/* Every customer component in every theme, for checking changes by eye. Development only. */
export default function DesignPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Showcase />;
}
