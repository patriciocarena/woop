import { MetricRing } from "./MetricRing";

function recoveryColor(value: number) {
  if (value >= 67) return "var(--color-recovery-high)";
  if (value >= 34) return "var(--color-recovery-mid)";
  return "var(--color-recovery-low)";
}

export function RecoveryRing({ value, size }: { value: number; size?: number }) {
  return (
    <MetricRing
      value={value}
      color={recoveryColor(value)}
      size={size}
      caption="Recovery"
      centerLabel={`${Math.round(value)}%`}
    />
  );
}

export function StrainRing({ value, size }: { value: number; size?: number }) {
  return (
    <MetricRing
      value={value}
      max={21}
      color="var(--color-strain)"
      size={size}
      caption="Day Strain"
      centerLabel={value.toFixed(1)}
    />
  );
}

export function SleepRing({ value, size }: { value: number; size?: number }) {
  return (
    <MetricRing
      value={value}
      color="var(--color-sleep)"
      size={size}
      caption="Sleep Performance"
      centerLabel={`${Math.round(value)}%`}
    />
  );
}
