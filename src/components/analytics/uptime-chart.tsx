"use client";

interface DailyStat {
  date: string;
  uptimePercent: number;
  avgResponseTime: number | null;
}

interface Props {
  data: DailyStat[];
}

export function UptimeChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-16 flex items-center justify-center text-muted-foreground text-sm">
        No uptime data yet
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-0.5 h-10 items-end">
        {data.map((day) => {
          const color =
            day.uptimePercent >= 99.9
              ? "bg-green-500"
              : day.uptimePercent >= 99.0
              ? "bg-yellow-500"
              : day.uptimePercent >= 90
              ? "bg-orange-500"
              : "bg-red-500";

          const height = `${Math.max(10, day.uptimePercent)}%`;

          return (
            <div
              key={day.date}
              className="flex-1 group relative"
              title={`${day.date}: ${day.uptimePercent.toFixed(2)}% uptime`}
            >
              <div
                className={`${color} rounded-sm transition-all group-hover:opacity-80`}
                style={{ height }}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-foreground text-background text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                {day.date}: {day.uptimePercent.toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-2">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}
