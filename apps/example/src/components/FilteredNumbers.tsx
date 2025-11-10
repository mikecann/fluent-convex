import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Button } from "../common/Button";
import { Card, CardContent, CardTitle, CardDescription } from "../common/Card";

export const FilteredNumbers = () => {
  const [filter, setFilter] = useState<
    "all" | "positive" | "negative" | "zero"
  >("all");
  const filtered = useQuery(api.myFunctions.filterNumbers, {
    filter,
    limit: 10,
  });

  if (!filtered) {
    return null;
  }

  return (
    <Card>
      <CardTitle>Filtered View</CardTitle>
      <CardDescription>Testing Zod enum validators</CardDescription>

      <div className="flex gap-2 flex-wrap">
        {(["all", "positive", "negative", "zero"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "primary" : "secondary"}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      <CardContent>
        <p className="text-sm mb-2">
          <span className="font-semibold">Filter:</span> {filtered.filter} (
          {filtered.totalMatching} total)
        </p>
        <p className="font-mono text-sm">
          {filtered.numbers.length === 0
            ? `No ${filtered.filter} numbers found`
            : filtered.numbers.join(", ")}
        </p>
      </CardContent>
    </Card>
  );
};
