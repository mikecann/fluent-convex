import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CodeBlock } from "../components/CodeBlock";
import { AnchorHeading, InfoCallout, Prose, DemoCard, Btn } from "../components/ui";
import { fluentSource, basicsSource } from "../sources";

export function GettingStartedSection() {
  const result = useQuery(api.basics.listNumbers, { count: 10 });
  const addNumber = useMutation(api.basics.addNumber);
  const deleteAll = useMutation(api.basics.deleteAllNumbers);

  return (
    <section id="getting-started" className="flex flex-col gap-6">
      <div>
        <img src="/logo.png" alt="fluent-convex logo" className="h-20 w-20 mb-4" />
        <h1 className="text-4xl font-extrabold tracking-tight">fluent-convex</h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 mt-2">
          A fluent API builder for Convex functions with middleware support.
        </p>
      </div>
      <Prose>
        <p>
          <strong>fluent-convex</strong> gives you a clean, chainable syntax for writing{" "}
          <a href="https://convex.dev" className="underline">Convex</a> backend functions. Instead
          of passing a configuration object, you build up your function step by step:{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.query()</code>,{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.input()</code>,{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.handler()</code>,{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.public()</code>.
        </p>
        <p>
          On top of that, you get <strong>composable middleware</strong>,{" "}
          <strong>reusable partial chains</strong>, a <strong>Zod plugin</strong> for runtime
          validation, and an <strong>extension system</strong> for building your own plugins.
        </p>
      </Prose>

      <InfoCallout>
        Every code snippet on this page is the <strong>actual source code</strong> powering this
        app, imported via Vite&apos;s <code className="bg-sky-200/60 dark:bg-sky-900/60 px-1 py-0.5 rounded text-sm">?raw</code> imports. What you see is what runs.
      </InfoCallout>

      <div className="flex flex-col gap-3">
        <AnchorHeading id="installation" className="text-xl font-semibold">Installation</AnchorHeading>
        <Prose>
          <p>
            Install via npm:
          </p>
        </Prose>
        <div className="rounded-lg bg-slate-900 dark:bg-slate-950 p-4 font-mono text-sm text-slate-100">
          <span className="select-none text-slate-500">$ </span>npm install fluent-convex
        </div>
        <Prose>
          <p>
            If you want to use the <strong>Zod plugin</strong> (<code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">fluent-convex/zod</code>),
            also install its optional peer dependencies:
          </p>
        </Prose>
        <div className="rounded-lg bg-slate-900 dark:bg-slate-950 p-4 font-mono text-sm text-slate-100">
          <span className="select-none text-slate-500">$ </span>npm install zod convex-helpers
        </div>
      </div>

      <Prose>
        <p>
          Everything starts with a single builder instance, typed to your Convex schema. Every file
          in your backend imports this builder and uses it to define functions.
        </p>
      </Prose>
      <CodeBlock source={fluentSource} region="builder" title="convex/fluent.ts" file="convex/fluent.ts" />

      <Prose>
        <p>
          With the builder in place, you can define queries, mutations, and actions using a
          fluent chain. Call{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.query()</code>,{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.mutation()</code>, or{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.action()</code> on the
          builder, add input validation with{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.input()</code>, define
          your logic with{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.handler()</code>, and
          register it with{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.public()</code> or{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.internal()</code>.
          The handler receives a fully-typed{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">ctx</code>{" "}
          (with <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">ctx.db</code> typed to your schema) and
          a validated <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">input</code> object.
        </p>
      </Prose>
      <CodeBlock source={basicsSource} region="listNumbers" title="convex/basics.ts - a simple query" file="convex/basics.ts" />
      <CodeBlock source={basicsSource} region="addNumber" title="convex/basics.ts - a simple mutation" file="convex/basics.ts" />
      <DemoCard title="Live demo">
        <p className="text-sm">
          Numbers:{" "}
          {result
            ? result.numbers.length > 0
              ? result.numbers.join(", ")
              : "(none yet - click the button)"
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
