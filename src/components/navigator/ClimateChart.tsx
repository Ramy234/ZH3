import { useEffect, useState } from "react";

export function ClimateChart({
  data,
  domain,
  ticks,
  height = 144,
}: {
  data: { name: string; value: number; fill: string }[];
  domain: number;
  ticks: number[];
  height?: number;
}) {
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
    return <div className="w-full rounded-2xl bg-moss" style={{ height }} aria-hidden />;
  }

  const { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } = lib;

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <XAxis
            type="number"
            domain={[0, domain]}
            ticks={ticks}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={108}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
          />
          <Bar dataKey="value" barSize={14} radius={2}>
            {data.map((row) => (
              <Cell key={row.name} fill={row.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
