import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
} from "../common/Card";

interface StatCardProps {
  label: string;
  value: string | number;
  suffix?: string;
}

const StatCard = ({ label, value, suffix = "" }: StatCardProps) => {
  return (
    <div className="p-4 bg-white dark:bg-slate-800 rounded-md">
      <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
      <p className="text-2xl font-bold">
        {value}
        {suffix}
      </p>
    </div>
  );
};

export const NumberStats = () => {
  const stats = useQuery(api.myFunctions.getNumberStats, { limit: 100 });

  if (!stats) {
    return null;
  }

  return (
    <Card>
      <CardTitle>Statistics</CardTitle>
      <CardDescription>
        Testing Zod return validators with complex types
      </CardDescription>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Average" value={stats.average.toFixed(2)} suffix="" />
        <StatCard label="Min" value={stats.min ?? "N/A"} suffix="" />
        <StatCard label="Max" value={stats.max ?? "N/A"} suffix="" />
      </div>

      {stats.numbers.length > 0 && (
        <CardContent>
          <p className="text-sm font-semibold mb-2">Recent numbers:</p>
          <p className="font-mono text-sm">{stats.numbers.join(", ")}</p>
        </CardContent>
      )}
    </Card>
  );
};

