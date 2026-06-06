import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type Props = {
  /** 0 → 1 */
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  label?: string;
};

export function ProgressRing({
  progress,
  size = 72,
  stroke = 7,
  color = '#00C896',
  trackColor = '#1E2126',
  label,
}: Props) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = circumference * (1 - clamped);

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text className="text-text text-base font-bold">{Math.round(clamped * 100)}%</Text>
      {label ? <Text className="text-muted2 text-[9px] mt-0.5">{label}</Text> : null}
    </View>
  );
}
