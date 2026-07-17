import { StatusChip } from "./StatusChip";

const map = {
  low: { tone: "pos", label: "Low risk" },
  moderate: { tone: "amber", label: "Moderate risk" },
  high: { tone: "neg", label: "High risk" },
} as const;

export function RiskBadge({ level }: { level: keyof typeof map }) {
  const { tone, label } = map[level];
  return <StatusChip tone={tone}>{label}</StatusChip>;
}
