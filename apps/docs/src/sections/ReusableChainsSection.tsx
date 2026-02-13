import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CodeBlock } from "../components/CodeBlock";
import { Prose, DemoCard, Badge } from "../components/ui";
import { chainsSource } from "../sources";

export function ReusableChainsSection() {
  const publicResult = useQuery(api.chains.listNumbers, { count: 5 });
  const metadataResult = useQuery(api.chains.listNumbersWithMetadata, { count: 5 });

  return (
    <section id="reusable-chains" className="flex flex-col gap-6">
      <h2 className="text-3xl font-bold">Reusable Chains &amp; Callable Syntax</h2>
      <Prose>
        <p>
          This is where fluent-convex really shines. Because the builder is immutable and each
          method returns a new instance, you can <strong>stop the chain at any point</strong> and
          reuse that partial builder later. A builder that has a{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.handler()</code> but
          no{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.public()</code> /{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.internal()</code> is
          called a <strong>callable</strong> — it&apos;s a function you can invoke directly for
          testing, or extend with more middleware before registering.
        </p>
      </Prose>

      <h3 className="text-xl font-semibold">Define once, register multiple ways</h3>
      <Prose>
        <p>
          In the example below, <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">listNumbersBase</code> is
          a callable. It defines the input, handler, and query logic — but is not yet registered
          with Convex. We then create two registered functions from it: one public, one with auth
          middleware added on top. Same logic, two different access patterns.
        </p>
      </Prose>
      <CodeBlock source={chainsSource} region="reusableBase" title="convex/chains.ts — define once, register multiple ways" file="convex/chains.ts" />

      <h3 className="text-xl font-semibold">Stacking middleware on a callable</h3>
      <Prose>
        <p>
          You can keep adding middleware to a callable before registering it. Each{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.use()</code> call
          returns a new builder, so the original callable is unchanged.
        </p>
      </Prose>
      <CodeBlock source={chainsSource} region="stackedMiddleware" title="Stacking middleware on a callable" file="convex/chains.ts" />

      <h3 className="text-xl font-semibold">Middleware after handler</h3>
      <Prose>
        <p>
          A surprising but useful feature:{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.use()</code> can be
          called <em>after</em>{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.handler()</code>.
          Even though it appears later in the code, the middleware still runs before the handler at
          runtime. This is useful when you want to wrap an existing handler with additional
          functionality without restructuring your code.
        </p>
      </Prose>
      <CodeBlock source={chainsSource} region="middlewareAfterHandler" title="Middleware AFTER handler" file="convex/chains.ts" />

      <DemoCard title="Live demo">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <Badge>listNumbers (public, no middleware)</Badge>
            <p className="mt-1 font-mono">
              {publicResult ? JSON.stringify(publicResult.numbers) : "..."}
            </p>
          </div>
          <div>
            <Badge>listNumbersWithMetadata (logging + timestamp)</Badge>
            <p className="mt-1 font-mono">
              {metadataResult ? JSON.stringify(metadataResult.numbers) : "..."}
            </p>
            {metadataResult?.timestamp && (
              <p className="mt-1 text-xs text-slate-500">
                timestamp: {metadataResult.timestamp}
              </p>
            )}
          </div>
        </div>
      </DemoCard>
    </section>
  );
}
