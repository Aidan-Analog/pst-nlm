/**
 * WaveformViewer
 *
 * Renders LTspice simulation waveforms using recharts.
 * Receives parsed .raw data: { variables, time, signals }
 *
 * Will be wired into the Figma Make CXR Workbench layout as the
 * waveform display area.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface WaveformData {
  variables: string[];
  time: number[];
  signals: Record<string, number[]>;
}

interface WaveformViewerProps {
  data: WaveformData;
  /** Which signals to display. Defaults to all non-time variables. */
  visibleSignals?: string[];
  /** Maximum number of data points to render (downsampled for performance) */
  maxPoints?: number;
}

const SIGNAL_COLORS = [
  '#0066cc', // ADI blue
  '#e05c00', // ADI orange
  '#00875a', // green
  '#6a1fae', // purple
  '#c0392b', // red
  '#2980b9', // light blue
];

/** Format seconds into human-readable: ns, µs, ms, s */
function formatTime(t: number): string {
  const abs = Math.abs(t);
  if (abs === 0) return '0';
  if (abs < 1e-6) return `${(t * 1e9).toPrecision(3)}ns`;
  if (abs < 1e-3) return `${(t * 1e6).toPrecision(3)}µs`;
  if (abs < 1) return `${(t * 1e3).toPrecision(3)}ms`;
  return `${t.toPrecision(3)}s`;
}

/** Format a signal value with appropriate SI prefix */
function formatValue(v: number, name: string): string {
  const abs = Math.abs(v);
  const isCurrentish = name.startsWith('I') || name.includes('(I') || name.toLowerCase().includes('current');
  const unit = isCurrentish ? 'A' : 'V';
  if (abs < 1e-6) return `${(v * 1e9).toPrecision(4)}n${unit}`;
  if (abs < 1e-3) return `${(v * 1e6).toPrecision(4)}µ${unit}`;
  if (abs < 1) return `${(v * 1e3).toPrecision(4)}m${unit}`;
  return `${v.toPrecision(4)}${unit}`;
}

export default function WaveformViewer({
  data,
  visibleSignals,
  maxPoints = 500,
}: WaveformViewerProps) {
  const { variables, time, signals } = data;

  // Determine which signals to show (skip the time variable at index 0)
  const timeVar = variables[0] ?? 'time';
  const signalNames = (visibleSignals ?? variables.slice(1)).filter(
    n => n !== timeVar && signals[n],
  );

  if (signalNames.length === 0 || time.length === 0) {
    return (
      <div style={{ padding: 24, color: 'var(--adi-gray-500)', textAlign: 'center' }}>
        No waveform data to display.
      </div>
    );
  }

  // Downsample if too many points
  const step = Math.max(1, Math.floor(time.length / maxPoints));
  const chartData = [];
  for (let i = 0; i < time.length; i += step) {
    const point: Record<string, number> = { time: time[i] };
    for (const name of signalNames) {
      if (signals[name]?.[i] !== undefined) {
        point[name] = signals[name][i];
      }
    }
    chartData.push(point);
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 16, left: 8, bottom: 24 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--adi-gray-200)" />
          <XAxis
            dataKey="time"
            tickFormatter={formatTime}
            label={{ value: 'Time', position: 'insideBottomRight', offset: -4, fontSize: 11 }}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={v => {
              const abs = Math.abs(v as number);
              if (abs >= 1) return `${(v as number).toPrecision(3)}`;
              if (abs >= 1e-3) return `${((v as number) * 1e3).toPrecision(3)}m`;
              return `${((v as number) * 1e6).toPrecision(3)}µ`;
            }}
          />
          <Tooltip
            formatter={(value: number, name: string) => [formatValue(value, name), name]}
            labelFormatter={formatTime}
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          {signalNames.map((name, i) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={SIGNAL_COLORS[i % SIGNAL_COLORS.length]}
              dot={false}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
