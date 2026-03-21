"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

interface DataPoint {
  time: string;
  responseTime: number | null;
  status: string;
}

interface Props {
  data: DataPoint[];
}

export function ResponseTimeChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
        No data available yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
          tickLine={false}
          tickFormatter={(v) => `${v}ms`}
        />
        <Tooltip
          formatter={(value: number) => [`${value}ms`, "Response Time"]}
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
          }}
        />
        <Line
          type="monotone"
          dataKey="responseTime"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={(props: { payload: DataPoint; cx: number; cy: number }) => {
            const { payload, cx, cy } = props;
            const color =
              payload.status === "DOWN"
                ? "#ef4444"
                : payload.status === "DEGRADED"
                ? "#f59e0b"
                : "hsl(var(--primary))";
            return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={3} fill={color} strokeWidth={0} />;
          }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
