"use client";

import { SurfaceCard } from "@/components/ui/SurfaceCard";
import type { Bucket } from "@/lib/analysis/analytics";
import { usd } from "@/lib/format";
import { EChart, C, tooltip } from "./echart";
import { CardHead } from "./CardHead";

/**
 * Composition donut — sized by trade count, coloured by each category's P/L, so
 * a category you trade a lot and lose on reads as a big red ring.
 */
export function PieCard({
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
  const total = buckets.reduce((s, b) => s + b.trades, 0);

  const option = {
    tooltip: {
      ...tooltip,
      formatter: (p: { percent: number; data: { b: Bucket } }) => {
        const b = p.data.b;
        const col = b.pnl >= 0 ? C.pos : C.neg;
        return `<div style="font-weight:700">${b.label}</div>
          <div style="color:${C.inkSoft}">${Math.round(p.percent)}% of trades · ${b.trades} · ${b.winRate}% win</div>
          <div style="color:${col};font-weight:700;margin-top:2px">${usd(b.pnl, { sign: true })}</div>`;
      },
    },
    graphic: [
      { type: "text", left: "center", top: "43%", style: { text: String(total), fill: C.ink, fontSize: 22, fontWeight: 700, textAlign: "center" } },
      { type: "text", left: "center", top: "56%", style: { text: "trades", fill: C.inkFaint, fontSize: 11 } },
    ],
    series: [
      {
        type: "pie",
        radius: ["58%", "82%"],
        center: ["50%", "50%"],
        avoidLabelOverlap: false,
        label: { show: false },
        labelLine: { show: false },
        data: buckets.map((b) => ({
          value: b.trades,
          name: b.label,
          b,
          itemStyle: {
            color: b.pnl >= 0 ? C.pos : C.neg,
            borderColor: C.surface,
            borderWidth: 3,
            borderRadius: 6,
          },
        })),
      },
    ],
  };

  return (
    <SurfaceCard className="p-4">
      <CardHead title={title} question={question} href={href} />

      {total === 0 ? (
        <div className="mt-3 text-[12.5px] text-ink-faint">Not enough data yet.</div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="w-[46%] shrink-0">
            <EChart option={option} height={168} />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            {buckets.map((b) => (
              <div key={b.key} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: b.pnl >= 0 ? C.pos : C.neg }}
                />
                <span className="flex-1 truncate text-[13px] font-semibold text-ink">
                  {b.label}
                </span>
                <span className="tnum text-[11px] text-ink-faint">
                  {total ? Math.round((b.trades / total) * 100) : 0}%
                </span>
                <span
                  className={`tnum w-20 text-right text-[13px] font-semibold ${
                    b.pnl >= 0 ? "text-pos" : "text-neg"
                  }`}
                >
                  {usd(b.pnl, { sign: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </SurfaceCard>
  );
}
