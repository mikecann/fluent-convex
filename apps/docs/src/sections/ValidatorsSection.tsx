import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CodeBlock } from "../components/CodeBlock";
import { Prose, DemoCard, Badge } from "../components/ui";
import { validatorsSource } from "../sources";

export function ValidatorsSection() {
  const propResult = useQuery(api.validators.listWithPropertyValidators, { count: 5 });
  const objResult = useQuery(api.validators.listWithObjectValidators, { count: 5 });
  const zodResult = useQuery(api.validators.listWithZod, { count: 5 });

  return (
    <section id="validation" className="flex flex-col gap-6">
      <h2 className="text-3xl font-bold">Validation</h2>
      <Prose>
        <p>
          The <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.input()</code> method
          accepts three flavors of validators, all through the same API. You can also add explicit
          return type validation with{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.returns()</code>.
        </p>
        <p>
          Here is the same query written three different ways. Each one fetches the most recent
          numbers from the database — the only difference is how the input is validated.
        </p>
      </Prose>
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">1. Property validators</h3>
          <Prose>
            <p>
              The simplest form. Pass a plain object where each key is a Convex validator. This
              is equivalent to the standard Convex{" "}
              <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">args</code> object.
            </p>
          </Prose>
        </div>
        <CodeBlock source={validatorsSource} region="propertyValidators" title="Property validators" file="convex/validators.ts" />

        <div>
          <h3 className="text-lg font-semibold mb-2">2. Object validators with .returns()</h3>
          <Prose>
            <p>
              You can also pass a{" "}
              <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">v.object()</code>{" "}
              validator directly. Pairing it with{" "}
              <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.returns()</code>{" "}
              gives you explicit return type validation — Convex will check the output matches at
              runtime.
            </p>
          </Prose>
        </div>
        <CodeBlock source={validatorsSource} region="objectValidators" title="Object validators + .returns()" file="convex/validators.ts" />

        <div>
          <h3 className="text-lg font-semibold mb-2">3. Zod schemas via .extend(WithZod)</h3>
          <Prose>
            <p>
              With the{" "}
              <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">WithZod</code>{" "}
              plugin, you can pass Zod schemas to{" "}
              <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.input()</code> and{" "}
              <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.returns()</code>.
              Zod schemas are automatically converted to Convex validators for structural
              validation, and Zod&apos;s own runtime validation (including refinements) runs on top.
              More on this in the <a href="#zod-plugin" className="underline">Zod Plugin</a> section.
            </p>
          </Prose>
        </div>
        <CodeBlock source={validatorsSource} region="zodValidation" title="Zod schemas via .extend(WithZod)" file="convex/validators.ts" />
      </div>

      <DemoCard title="Live demo — all three return the same data">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <Badge>property</Badge>
            <p className="mt-1 font-mono">
              {propResult ? JSON.stringify(propResult.numbers) : "..."}
            </p>
          </div>
          <div>
            <Badge>v.object()</Badge>
            <p className="mt-1 font-mono">
              {objResult ? JSON.stringify(objResult.numbers) : "..."}
            </p>
          </div>
          <div>
            <Badge>Zod</Badge>
            <p className="mt-1 font-mono">
              {zodResult ? JSON.stringify(zodResult.numbers) : "..."}
            </p>
          </div>
        </div>
      </DemoCard>
    </section>
  );
}
