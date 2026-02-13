import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CodeBlock } from "../components/CodeBlock";
import { Prose, DemoCard, Btn } from "../components/ui";
import { validatorsSource } from "../sources";

export function ZodSection() {
  const addPositive = useMutation(api.validators.addPositiveNumber);
  const stats = useQuery(api.validators.getNumberStats, {});
  const [zodValue, setZodValue] = useState("");
  const [zodLabel, setZodLabel] = useState("");
  const [zodError, setZodError] = useState<string | null>(null);
  const [zodSuccess, setZodSuccess] = useState(false);

  const handleSubmit = async () => {
    setZodError(null);
    setZodSuccess(false);
    try {
      const num = Number(zodValue);
      if (isNaN(num)) {
        setZodError("Not a number");
        return;
      }
      await addPositive({ value: num, label: zodLabel || undefined });
      setZodSuccess(true);
      setZodValue("");
      setZodLabel("");
    } catch (e: any) {
      setZodError(e.message ?? String(e));
    }
  };

  return (
    <section id="zod-plugin" className="flex flex-col gap-6">
      <h2 className="text-3xl font-bold">Zod Plugin</h2>
      <Prose>
        <p>
          The <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">WithZod</code>{" "}
          plugin (imported from{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">fluent-convex/zod</code>)
          adds Zod schema support to{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.input()</code> and{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.returns()</code>.
          You enable it by calling{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.extend(WithZod)</code>{" "}
          on the builder chain.
        </p>
        <p>
          What makes this special is <strong>full runtime validation</strong>. Convex&apos;s built-in
          validators only check structural types (is this a number? is this a string?). Zod
          refinements like{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.positive()</code>,{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.min()</code>,{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.max()</code>,{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.email()</code> are
          enforced <strong>server-side</strong> before your handler runs. Invalid input throws
          before any database access happens.
        </p>
      </Prose>

      <h3 className="text-xl font-semibold">Refinements</h3>
      <Prose>
        <p>
          The example below requires the value to be a positive number. Try submitting a negative
          number or zero in the live demo — the server will reject it with a Zod validation error.
        </p>
      </Prose>
      <CodeBlock source={validatorsSource} region="zodRefinements" title="Zod refinements (.positive(), .min(), .max())" file="convex/validators.ts" />

      <DemoCard title="Live demo — try a negative number">
        <div className="flex gap-2 items-end flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">Value (must be positive)</label>
            <input
              type="number"
              value={zodValue}
              onChange={(e) => setZodValue(e.target.value)}
              className="bg-light dark:bg-dark border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm w-32"
              placeholder="e.g. 42"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">Label (optional, 1-50 chars)</label>
            <input
              type="text"
              value={zodLabel}
              onChange={(e) => setZodLabel(e.target.value)}
              className="bg-light dark:bg-dark border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm w-40"
              placeholder="optional"
            />
          </div>
          <Btn onClick={() => void handleSubmit()}>Add</Btn>
        </div>
        {zodError && (
          <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded px-3 py-2 font-mono">
            {zodError}
          </p>
        )}
        {zodSuccess && (
          <p className="text-sm text-green-600 dark:text-green-400">Added successfully!</p>
        )}
      </DemoCard>

      <h3 className="text-xl font-semibold">Complex return types</h3>
      <Prose>
        <p>
          Zod is also useful for complex return types. The{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.returns()</code> validator
          checks the handler&apos;s output before sending it to the client.
        </p>
      </Prose>
      <CodeBlock source={validatorsSource} region="zodStats" title="Complex return types with Zod" file="convex/validators.ts" />
      {stats && (
        <DemoCard title="Live stats result">
          <p className="text-sm font-mono">
            total: {stats.total}, avg: {stats.average.toFixed(1)}, min: {String(stats.min)}, max: {String(stats.max)}
          </p>
        </DemoCard>
      )}
    </section>
  );
}
