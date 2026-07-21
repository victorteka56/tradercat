"use client";

import { SurfaceCard } from "@/components/ui/SurfaceCard";
import type { Bucket } from "@/lib/analysis/analytics";
import { usd, usdCompact } from "@/lib/format";
import { EChart, C, tooltip } from "./echart";
import { CardHead } from "./CardHead";

/**
 * Symbols as a treemap — each tile sized by how much P/L it moved and coloured
 * green (net winner) or red (net loser). The biggest contributors and biggest
 * leaks jump out by area, which a bar list can't do at a glance.
 */
export function TreemapChart({
  title,
  question,
  buckets,
  href,
}: {
  title: string;
  question?: string;
  buckets: Bucket[];
  href?: string;
}) {
  const data = [...buckets]
    .filter((b) => Math.abs(b.pnl) > 0)
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
    .slice(0, 16)
    .map((b) => ({
      name: b.key,
      value: Math.max(1, Math.abs(b.pnl)),
      b,
      itemStyle: { color: b.pnl >= 0 ? C.pos : C.neg },
    }));

  const option = {
    tooltip: {
      ...tooltip,
      formatter: (p: { data?: { b?: Bucket } }) => {
        const b = p.data?.b;
        if (!b) return "";
        const col = b.pnl >= 0 ? C.pos : C.neg;
        return `<div style="font-weight:700">${b.label}</div>
          <div style="color:${C.inkSoft}">${b.trades} trades · ${b.winRate}% win</div>
          <div style="color:${col};font-weight:700;margin-top:2px">${usd(b.pnl, { sign: true })}</div>`;
      },
    },
    series: [
      {
        type: "treemap",
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        itemStyle: { borderColor: C.surface, borderWidth: 2, gapWidth: 2, borderRadius: 4 },
        label: {
          show: true,
          position: "insideTopLeft",
          formatter: (p: { name: string; data: { b: Bucket } }) =>
            `{n|${p.name}}\n{v|${usdCompact(p.data.b.pnl)}}`,
          rich: {
            n: { color: "#fff", fontSize: 12, fontWeight: 700, lineHeight: 16 },
            v: { color: "rgba(255,255,255,0.85)", fontSize: 10.5, fontWeight: 600 },
          },
        },
        data,
      },
    ],
  };

  return (
    <SurfaceCard className="p-4">
      <CardHead title={title} question={question} href={href} />
      {data.length === 0 ? (
        <div className="mt-3 text-[12.5px] text-ink-faint">Not enough per-symbol history yet.</div>
      ) : (
        <EChart option={option} height={230} />
      )}
    </SurfaceCard>
  );
}
