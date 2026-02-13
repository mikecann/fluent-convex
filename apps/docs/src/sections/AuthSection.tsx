import { Authenticated, Unauthenticated } from "convex/react";
import { CodeBlock } from "../components/CodeBlock";
import { Prose, DemoCard } from "../components/ui";
import { TaskManager, SignInForm } from "../components/Auth";
import { authedSource } from "../sources";

export function AuthSection() {
  return (
    <section id="auth" className="flex flex-col gap-6">
      <h2 className="text-3xl font-bold">Auth Middleware</h2>
      <Prose>
        <p>
          Putting it all together: the <strong>reusable chain</strong> pattern combined with{" "}
          <strong>auth middleware</strong> gives you a powerful way to gate entire groups of
          functions behind authentication, with zero boilerplate per function.
        </p>
        <p>
          In this app, we define{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">authedQuery</code> and{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">authedMutation</code>{" "}
          as reusable chains that bake in the auth middleware. Every function built from them
          automatically requires a logged-in user and has{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">ctx.user</code>{" "}
          available — fully typed, no casting needed.
        </p>
      </Prose>
      <CodeBlock source={authedSource} region="reusableAuthChains" title="convex/authed.ts — defining reusable auth chains" file="convex/authed.ts" />
      <Prose>
        <p>
          Building functions from these chains is clean and minimal. Notice how{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">ctx.user.name</code> is
          used without any casting — TypeScript knows it&apos;s there because the auth middleware
          added it to the context type.
        </p>
      </Prose>
      <CodeBlock source={authedSource} region="listTasks" title="convex/authed.ts — a query using authedQuery" file="convex/authed.ts" />
      <CodeBlock source={authedSource} region="addTask" title="convex/authed.ts — a mutation using authedMutation" file="convex/authed.ts" />
      <DemoCard title="Live demo — sign in to manage tasks">
        <Authenticated>
          <TaskManager />
        </Authenticated>
        <Unauthenticated>
          <SignInForm />
        </Unauthenticated>
      </DemoCard>
    </section>
  );
}
