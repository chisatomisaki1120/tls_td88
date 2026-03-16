import { Card } from "@/components/ui/card";

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="space-y-2">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-3xl font-semibold text-slate-900">{value}</div>
    </Card>
  );
}
