"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtEur, fmtG, fmtKg } from "@/lib/labels";

const C = {
  plate: "#166534",
  surplus: "#86efac",
  line: "#166534",
  grid: "#e5e7eb",
  target: "#b45309",
  bar: "#22c55e",
  barStrong: "#166534",
};

const tooltipStyle = {
  contentStyle: { borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13, fontFamily: "inherit" },
  labelStyle: { fontWeight: 600, color: "#1f2937" },
};

export interface ChartPoint {
  label: string;
  plateKg: number;
  surplusKg: number;
  gPerMeal: number | null;
  cost: number;
}

/** Pertes empilées : restes d'assiette (vert foncé) et excédents non servis (vert clair). */
export function WasteBars({ data, height = 260 }: { data: ChartPoint[]; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label="Kilos jetés par période, restes d'assiette et excédents de cuisine">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} />
          <YAxis tickLine={false} axisLine={false} width={62} tickFormatter={(v) => `${v} kg`} />
          <Tooltip {...tooltipStyle} formatter={(v, name) => [fmtKg(Number(v)), name]} cursor={{ fill: "#f3f4f6" }} />
          <Legend iconType="square" wrapperStyle={{ fontSize: 13 }} formatter={(value) => <span style={{ color: "#4b5563" }}>{value}</span>} />
          <Bar dataKey="plateKg" name="Restes d'assiette" stackId="w" fill={C.plate} maxBarSize={36} />
          <Bar dataKey="surplusKg" name="Excédents de cuisine" stackId="w" fill={C.surplus} radius={[3, 3, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GramsLine({ data, target, height = 240 }: { data: ChartPoint[]; target?: number | null; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label="Grammes jetés par repas servi">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} />
          <YAxis tickLine={false} axisLine={false} width={52} tickFormatter={(v) => `${v} g`} />
          <Tooltip {...tooltipStyle} formatter={(v) => [fmtG(Number(v)), "Par repas servi"]} />
          {target ? (
            <ReferenceLine y={target} stroke={C.target} strokeDasharray="5 4" label={{ value: `Objectif ${target} g`, position: "insideBottomLeft", fill: C.target, fontSize: 12 }} />
          ) : null}
          <Line type="monotone" dataKey="gPerMeal" stroke={C.line} strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls name="g/repas" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CostLine({ data, height = 220 }: { data: ChartPoint[]; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label="Coût estimé des pertes">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -4, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} />
          <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v) => `${v} €`} />
          <Tooltip {...tooltipStyle} formatter={(v) => [fmtEur(Number(v)), "Coût estimé"]} />
          <Line type="monotone" dataKey="cost" stroke={C.target} strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Barres horizontales : catégories, établissements, jours… */
export function RankBars({
  data,
  unit,
  highlightFirst = false,
  height,
  ariaLabel,
}: {
  data: { label: string; value: number }[];
  unit: "kg" | "g" | "%";
  highlightFirst?: boolean;
  height?: number;
  ariaLabel: string;
}) {
  const fmt = (v: number) => (unit === "kg" ? fmtKg(v) : unit === "g" ? fmtG(v) : `${Math.round(v)} %`);
  const h = height ?? Math.max(160, data.length * 40 + 20);
  return (
    <div style={{ height: h }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="label" width={170} tickLine={false} axisLine={false} />
          <Tooltip {...tooltipStyle} formatter={(v) => [fmt(Number(v)), ""]} cursor={{ fill: "#f3f4f6" }} />
          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            maxBarSize={24}
            label={{ position: "right", formatter: (v: unknown) => fmt(Number(v)), fontSize: 12, fill: "#4b5563" }}
            shape={(props: unknown) => {
              const p = props as { x: number; y: number; width: number; height: number; index: number };
              return (
                <rect x={p.x} y={p.y} width={Math.max(p.width, 0)} height={p.height} rx={4}
                  fill={highlightFirst && p.index === 0 ? C.barStrong : C.bar} />
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
