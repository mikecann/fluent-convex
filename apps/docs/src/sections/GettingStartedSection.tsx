import { CodeBlock } from "../components/CodeBlock";
import { Prose } from "../components/ui";
import { libSource, authedSource } from "../sources";

export function GettingStartedSection() {
  return (
    <section id="getting-started" className="flex flex-col gap-6">
      <div>
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
        <p>
          Everything starts with a single builder instance, typed to your Convex schema. Every file
          in your backend imports this builder and uses it to define functions.
        </p>
      </Prose>
      <div className="grid md:grid-cols-2 gap-4">
        <CodeBlock source={libSource} region="builder" title="convex/lib.ts" />
        <CodeBlock source={authedSource} region="reusableAuthChains" title="convex/authed.ts — reusable chains" />
      </div>
      <Prose>
        <p className="text-sm italic text-slate-400 dark:text-slate-500">
          Every code snippet on this page is the <strong>actual source code</strong> powering this
          app, imported via Vite&apos;s <code>?raw</code> imports. What you see is what runs.
        </p>
      </Prose>
    </section>
  );
}
