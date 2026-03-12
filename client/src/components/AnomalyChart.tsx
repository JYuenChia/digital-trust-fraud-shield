import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AnomalyChartProps {
  data: Array<{ time: string; value: number; anomaly?: boolean }>;
  title: string;
  color: 'cyan' | 'magenta';
  height?: number;
}

/**
 * AnomalyChart Component
 * 
 * Design Philosophy: Ethereal Cyberpunk Minimalism
 * - Minimal line charts with glowing gradient fills
 * - Cyan for normal transactions, Magenta for anomalies
 * - Smooth animations and subtle grid
 * - Real-time data visualization
 */
export const AnomalyChart: React.FC<AnomalyChartProps> = ({
  data,
  title,
  color,
  height = 250,
}) => {
  const colorMap = {
    cyan: '#00d9ff',
    magenta: '#ff006e',
  };

  const glowColor = colorMap[color];

  return (
    <div className="w-full h-full flex flex-col">
      {/* Title */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {title}
        </h3>
        <div
          className="h-0.5 w-12 mt-2 rounded-full"
          style={{ background: glowColor }}
        />
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            {/* Gradient definition */}
            <defs>
              <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={glowColor} stopOpacity={0.4} />
                <stop offset="100%" stopColor={glowColor} stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Minimal grid */}
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(0, 217, 255, 0.05)"
              vertical={false}
            />

            {/* Axes */}
            <XAxis
              dataKey="time"
              stroke="rgba(148, 163, 184, 0.5)"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#94a3b8' }}
            />
            <YAxis
              stroke="rgba(148, 163, 184, 0.5)"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#94a3b8' }}
            />

            {/* Tooltip */}
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                border: `1px solid ${glowColor}40`,
                borderRadius: '8px',
                boxShadow: `0 0 20px ${glowColor}40`,
              }}
              labelStyle={{ color: '#f8f9fa' }}
              formatter={(value) => [`${value}%`, 'Risk']}
            />

            {/* Line with glow effect */}
            <Line
              type="monotone"
              dataKey="value"
              stroke={glowColor}
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={true}
              animationDuration={800}
              fill={`url(#gradient-${color})`}
              style={{
                filter: `drop-shadow(0 0 8px ${glowColor}60)`,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnomalyChart;
