import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { Card, CardContent, CardTitle, CardDescription } from "../common/Card";

export const CallableFunctions = () => {
  const [count, setCount] = useState(5);
  const [inputCount, setInputCount] = useState("5");

  const result = useQuery(api.callableFunctions.getNumbersWithStats, {
    count,
  });

  const handleFetch = () => {
    const num = parseInt(inputCount, 10);
    if (!isNaN(num) && num > 0) {
      setCount(num);
    }
  };

  return (
    <Card>
      <CardTitle>Callable Functions</CardTitle>
      <CardDescription>
        Testing decorated methods with @input and @returns decorators
      </CardDescription>

      <div className="flex gap-2 items-center flex-wrap">
        <Input
          type="number"
          min="1"
          max="100"
          value={inputCount}
          onChange={(e) => setInputCount(e.target.value)}
          placeholder="Count"
          className="w-24"
        />
        <Button onClick={handleFetch}>Fetch Numbers</Button>
      </div>

      <CardContent>
        {result === undefined ? (
          <p className="text-center text-slate-500">Loading...</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-semibold mb-2">Numbers ({result.numbers.length}):</p>
              {result.numbers.length === 0 ? (
                <p className="text-slate-500 italic">
                  No numbers found. Add some numbers first!
                </p>
              ) : (
                <p className="font-mono text-sm break-words">
                  [{result.numbers.join(", ")}]
                </p>
              )}
            </div>

            <div>
              <p className="font-semibold mb-2">Count Result:</p>
              <p className="font-mono text-lg font-bold">
                {result.numbersCount}
              </p>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-300 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This demonstrates:
              </p>
              <ul className="text-xs text-slate-600 dark:text-slate-400 list-disc list-inside mt-1">
                <li>@input decorator validates method inputs</li>
                <li>@returns decorator validates method outputs</li>
                <li>makeCallableMethods creates validated method proxies</li>
                <li>Methods can call other decorated methods internally</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

