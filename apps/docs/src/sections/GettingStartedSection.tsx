import { CodeBlock } from "../components/CodeBlock";
import { InfoCallout, Prose } from "../components/ui";
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
      </Prose>

      <div className="flex flex-col gap-3">
        <h3 className="text-xl font-semibold">Installation</h3>
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
      <div className="grid md:grid-cols-2 gap-4">
        <CodeBlock source={libSource} region="builder" title="convex/lib.ts" file="convex/lib.ts" />
        <CodeBlock source={authedSource} region="reusableAuthChains" title="convex/authed.ts — reusable chains" file="convex/authed.ts" />
      </div>
      <InfoCallout>
        Every code snippet on this page is the <strong>actual source code</strong> powering this
        app, imported via Vite&apos;s <code className="bg-sky-200/60 dark:bg-sky-900/60 px-1 py-0.5 rounded text-sm">?raw</code> imports. What you see is what runs.
      </InfoCallout>
    </section>
  );
}
