import { useEffect, useState } from "react";

type Point = { year: number; keep: number; swap: number };

export function CostChart({ data, ghost }: { data: Point[]; ghost?: Point[] | null }) {
  const [lib, setLib] = useState<typeof import("recharts") | null>(null);

  useEffect(() => {
    let live = true;
    void import("recharts").then((mod) => {
      if (live) setLib(mod);
    });
    return () => {
      live = false;
    };
  }, []);

  if (!lib) {
    return <div className="h-52 w-full rounded-2xl bg-moss" aria-hidden />;
  }

  const { Line, LineChart, ResponsiveContainer, XAxis, YAxis } = lib;
  const rows = ghost ? data.map((p, i) => ({ ...p, ghost: ghost[i]?.swap })) : data;

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={false}
            interval={data.length > 20 ? 7 : data.length > 13 ? 3 : 0}
            tick={{ fill: "var(--color-ink)", fontSize: 11 }}
          />
          <YAxis
            width={36}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
            tickFormatter={(n: number) => `${Math.round(Number(n) / 1000)}k`}
          />
          <Line type="monotone" dataKey="keep" stroke="var(--color-ink)" strokeWidth={2} dot={false} strokeDasharray="5 4" />
          <Line type="monotone" dataKey="swap" stroke="var(--color-spruce)" strokeWidth={3} dot={false} />
          {ghost ? <Line type="monotone" dataKey="ghost" stroke="#7a9a1a" strokeWidth={3} dot={false} strokeDasharray="2 3" isAnimationActive={false} /> : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
