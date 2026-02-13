import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CodeBlock } from "../components/CodeBlock";
import { Prose, DemoCard } from "../components/ui";
import { pluginSource } from "../sources";

export function PluginSection() {
  const [echoInput, setEchoInput] = useState("hello fluent-convex!");
  const timedResult = useQuery(api.plugin.timedQuery as any, { echo: echoInput });

  return (
    <section id="custom-plugins" className="flex flex-col gap-6">
      <h2 className="text-3xl font-bold">Custom Plugins</h2>
      <Prose>
        <p>
          The <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.extend()</code>{" "}
          method lets you swap the builder class for your own subclass. This is how the Zod plugin
          works internally, and you can use the same pattern to add any custom methods to the chain.
        </p>
        <p>
          The key requirement is overriding{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">_clone()</code> so your
          plugin type is preserved through{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.use()</code>,{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.input()</code>, and{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.returns()</code> calls.
          Without this, the chain would revert to the base builder type after the first method call.
        </p>
        <p>
          The example below defines a <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">TimedBuilder</code>{" "}
          plugin that adds a{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.withTiming(name)</code>{" "}
          method. Calling it wraps the function in an onion middleware that logs start/end times.
        </p>
      </Prose>
      <CodeBlock source={pluginSource} region="TimedBuilder" title="convex/plugin.ts — defining a plugin" />

      <h3 className="text-xl font-semibold">Using the plugin</h3>
      <Prose>
        <p>
          Once defined, you use it with{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.extend(TimedBuilder)</code> and
          then call your custom method. The rest of the chain works as normal.
        </p>
      </Prose>
      <CodeBlock source={pluginSource} region="timedQuery" title="convex/plugin.ts — using the plugin" />
      <DemoCard title="Live demo">
        <div className="flex gap-2 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">Echo input</label>
            <input
              type="text"
              value={echoInput}
              onChange={(e) => setEchoInput(e.target.value)}
              className="bg-light dark:bg-dark border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm w-64"
            />
          </div>
        </div>
        <p className="text-sm font-mono">
          {timedResult ? JSON.stringify(timedResult) : "..."}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Check the Convex dashboard logs to see the timing output from the plugin.
        </p>
      </DemoCard>
    </section>
  );
}
