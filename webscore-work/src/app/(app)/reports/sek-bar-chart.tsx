"use client";

import { SimpleBarChart } from "@/components/charts/charts";
import { formatSEK } from "@/lib/utils";

/** Client wrapper so the SEK formatter (a function) is created on the client
 *  rather than passed across the server/client boundary. */
export function SekBarChart({ data }: { data: { label: string; value: number }[] }) {
  return <SimpleBarChart data={data} format={(v) => formatSEK(v)} />;
}
