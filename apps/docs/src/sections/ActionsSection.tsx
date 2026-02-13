import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CodeBlock } from "../components/CodeBlock";
import { Prose, DemoCard, Badge, Btn } from "../components/ui";
import { actionsSource } from "../sources";

export function ActionsSection() {
  const seedNumbers = useAction(api.actions.seedNumbers);
  const getSnapshot = useAction(api.actions.getSnapshot);
  const [seedCount, setSeedCount] = useState("5");
  const [snapshot, setSnapshot] = useState<{ numberCount: number; numbers: number[] } | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <section id="actions" className="flex flex-col gap-6">
      <h2 className="text-3xl font-bold">Actions</h2>
      <Prose>
        <p>
          Actions are Convex functions that can talk to the outside world — call external APIs, run
          long computations, or orchestrate multiple queries and mutations. In fluent-convex, you
          define them with{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.action()</code> and
          the same chainable API. Middleware works with actions too.
        </p>
        <p>
          The handler receives{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">ctx.runQuery()</code> and{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">ctx.runMutation()</code>{" "}
          for calling other Convex functions, plus{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">ctx.fetch()</code> for
          HTTP requests.
        </p>
      </Prose>
      <CodeBlock source={actionsSource} region="seedNumbers" title="convex/actions.ts — action with logging middleware" />
      <CodeBlock source={actionsSource} region="getSnapshot" title="convex/actions.ts — action calling a query" />
      <DemoCard title="Live demo">
        <div className="flex gap-2 items-end flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">Numbers to seed</label>
            <input
              type="number"
              value={seedCount}
              onChange={(e) => setSeedCount(e.target.value)}
              className="bg-light dark:bg-dark border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm w-24"
            />
          </div>
          <Btn
            disabled={loading}
            onClick={() => {
              setLoading(true);
              void seedNumbers({ count: Number(seedCount) }).finally(() =>
                setLoading(false)
              );
            }}
          >
            {loading ? "Seeding..." : "Seed numbers"}
          </Btn>
          <Btn
            variant="secondary"
            disabled={loading}
            onClick={() => {
              setLoading(true);
              void getSnapshot({})
                .then((s) => setSnapshot(s))
                .finally(() => setLoading(false));
            }}
          >
            Get snapshot
          </Btn>
        </div>
        {snapshot && (
          <div className="text-sm">
            <p><Badge>{snapshot.numberCount} numbers</Badge></p>
            <p className="font-mono mt-1 text-xs">
              {JSON.stringify(snapshot.numbers.slice(0, 20))}
              {snapshot.numbers.length > 20 && "..."}
            </p>
          </div>
        )}
      </DemoCard>
    </section>
  );
}
