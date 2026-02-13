import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CodeBlock } from "../components/CodeBlock";
import { Prose, DemoCard, Btn } from "../components/ui";
import { basicsSource } from "../sources";

export function BasicsSection() {
  const result = useQuery(api.basics.listNumbers, { count: 10 });
  const addNumber = useMutation(api.basics.addNumber);
  const deleteAll = useMutation(api.basics.deleteAllNumbers);

  return (
    <section id="basics" className="flex flex-col gap-6">
      <h2 className="text-3xl font-bold">Basics</h2>
      <Prose>
        <p>
          At its simplest, fluent-convex replaces the standard Convex function definition with a
          fluent chain. You call <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.query()</code>,{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.mutation()</code>, or{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.action()</code> on the
          builder, add input validation with{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.input()</code>, define
          your logic with{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.handler()</code>, and
          register it with{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.public()</code> or{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.internal()</code>.
        </p>
        <p>
          The handler receives a fully-typed <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">ctx</code>{" "}
          (with <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">ctx.db</code> typed to your schema) and
          a validated <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">input</code> object. No more
          manual destructuring from <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">args</code>.
        </p>
      </Prose>
      <CodeBlock source={basicsSource} region="listNumbers" title="convex/basics.ts — a simple query" />
      <CodeBlock source={basicsSource} region="addNumber" title="convex/basics.ts — a simple mutation" />
      <DemoCard title="Live demo">
        <p className="text-sm">
          Numbers:{" "}
          {result
            ? result.numbers.length > 0
              ? result.numbers.join(", ")
              : "(none yet — click the button)"
            : "loading..."}
        </p>
        <div className="flex gap-2">
          <Btn onClick={() => void addNumber({ value: Math.floor(Math.random() * 100) })}>
            Add random number
          </Btn>
          <Btn variant="danger" onClick={() => void deleteAll({})}>
            Clear all
          </Btn>
        </div>
      </DemoCard>
    </section>
  );
}
