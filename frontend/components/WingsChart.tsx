'use client';

import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DataPoint {
  date: string;
  total: number;
  cumulative: number;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function WingsChart({ apiUrl }: { apiUrl: string }) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${apiUrl}/api/wings-over-time`);
        if (res.ok) {
          const { data } = await res.json();
          setData(data);
        }
      } catch { /* non-fatal */ }
      setLoading(false);
    }
    load();
  }, [apiUrl]);

  if (loading) {
    return <div className="h-48 rounded-xl bg-wing-card animate-pulse" />;
  }

  if (data.length === 0) {
    return <div className="h-48 flex items-center justify-center text-stone-500 text-sm">No data yet</div>;
  }

  const chartData = data.map(d => ({ ...d, date: formatDate(d.date) }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="wingGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#E8722A" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#E8722A" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tick={{ fill: '#78716c', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#78716c', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#2A1A10', border: '1px solid #3D2618', borderRadius: 8 }}
          labelStyle={{ color: '#F5E6D3' }}
          itemStyle={{ color: '#E8722A' }}
          formatter={(val) => [`${val} wings`, 'Cumulative']}
        />
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke="#E8722A"
          strokeWidth={2}
          fill="url(#wingGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#E8722A' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
