"use client";

import { useCallback, useEffect, useRef, useState, memo } from "react";
import {
  Authenticated,
  Unauthenticated,
  useConvexAuth,
  useMutation,
  useQuery,
  useAction,
} from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../convex/_generated/api";
import { CodeBlock } from "./components/CodeBlock";

// ?raw imports — the actual backend source, used for self-documenting code display
import libSource from "../convex/lib.ts?raw";
import middlewareSource from "../convex/middleware.ts?raw";
import basicsSource from "../convex/basics.ts?raw";
import validatorsSource from "../convex/validators.ts?raw";
import chainsSource from "../convex/chains.ts?raw";
import authedSource from "../convex/authed.ts?raw";
import actionsSource from "../convex/actions.ts?raw";
import pluginSource from "../convex/plugin.ts?raw";

// ---------------------------------------------------------------------------
// Navigation sections — drives both the sidebar and the content
// ---------------------------------------------------------------------------

const NAV_SECTIONS = [
  { id: "getting-started", label: "Getting Started" },
  { id: "basics", label: "Basics" },
  { id: "validation", label: "Validation" },
  { id: "middleware", label: "Middleware" },
  { id: "reusable-chains", label: "Reusable Chains" },
  { id: "zod-plugin", label: "Zod Plugin" },
  { id: "custom-plugins", label: "Custom Plugins" },
  { id: "actions", label: "Actions" },
  { id: "auth", label: "Auth Middleware" },
] as const;

// ---------------------------------------------------------------------------
// App shell — docs layout with sticky sidebar + scrollable content
// ---------------------------------------------------------------------------

export default function App() {
  const [activeSection, setActiveSection] = useState<string>("getting-started");
  const handleSectionChange = useCallback((id: string) => setActiveSection(id), []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar activeSection={activeSection} />
        <Content onSectionChange={handleSectionChange} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function Header() {
  return (
    <header className="sticky top-0 z-20 bg-light dark:bg-dark border-b border-slate-200 dark:border-slate-800">
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg tracking-tight">fluent-convex</span>
          <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
            showcase &amp; docs
          </span>
        </div>
        <div className="flex items-center gap-4">
          <SignOutButton />
          <a
            href="https://github.com/mikecann/fluent-convex"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/fluent-convex"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            npm
          </a>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Sidebar — sticky, scrollable nav
// ---------------------------------------------------------------------------

function Sidebar({ activeSection }: { activeSection: string }) {
  return (
    <aside className="hidden lg:block w-60 shrink-0 border-r border-slate-200 dark:border-slate-800 sticky top-[49px] h-[calc(100vh-49px)] overflow-y-auto">
      <nav className="p-4 flex flex-col gap-1">
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
          Guide
        </p>
        {NAV_SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
              activeSection === s.id
                ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {s.label}
          </a>
        ))}
        <div className="border-t border-slate-200 dark:border-slate-800 my-3" />
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
          Links
        </p>
        <a
          href="https://github.com/mikecann/fluent-convex"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm px-3 py-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          GitHub repo
        </a>
        <a
          href="https://docs.convex.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm px-3 py-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Convex docs
        </a>
      </nav>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Content — scrollable main area with intersection observer for active section
// ---------------------------------------------------------------------------

const Content = memo(function Content({ onSectionChange }: { onSectionChange: (id: string) => void }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onSectionChange);
  useEffect(() => {
    callbackRef.current = onSectionChange;
  }, [onSectionChange]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            callbackRef.current(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );

    const sections = contentRef.current?.querySelectorAll("section[id]");
    sections?.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <main ref={contentRef} className="flex-1 min-w-0 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col gap-20">
        <GettingStartedSection />
        <BasicsSection />
        <ValidatorsSection />
        <MiddlewareSection />
        <ReusableChainsSection />
        <ZodSection />
        <PluginSection />
        <ActionsSection />
        <AuthSection />
        <footer className="border-t border-slate-200 dark:border-slate-800 pt-8 pb-4 text-center text-sm text-slate-400">
          Built with{" "}
          <a href="https://github.com/mikecann/fluent-convex" className="underline">
            fluent-convex
          </a>{" "}
          +{" "}
          <a href="https://convex.dev" className="underline">Convex</a>{" "}
          +{" "}
          <a href="https://react.dev" className="underline">React</a>
        </footer>
      </div>
    </main>
  );
});

// ---------------------------------------------------------------------------
// Shared UI components
// ---------------------------------------------------------------------------

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-slate-600 dark:text-slate-400 leading-relaxed text-[15px] flex flex-col gap-3">
      {children}
    </div>
  );
}

function DemoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-lg p-5 flex flex-col gap-3">
      <h4 className="font-semibold text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
        {title}
      </h4>
      {children}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-slate-200 dark:bg-slate-700 text-xs font-mono px-2 py-0.5 rounded">
      {children}
    </span>
  );
}

function Btn({
  onClick,
  disabled,
  children,
  variant = "primary",
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "primary" | "danger" | "secondary";
}) {
  const base = "text-sm px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 cursor-pointer";
  const styles = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    secondary:
      "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-dark dark:text-light",
  };
  return (
    <button className={`${base} ${styles[variant]}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// 1. Getting Started
// ---------------------------------------------------------------------------

function GettingStartedSection() {
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

// ---------------------------------------------------------------------------
// 2. Basics
// ---------------------------------------------------------------------------

function BasicsSection() {
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

// ---------------------------------------------------------------------------
// 3. Validation
// ---------------------------------------------------------------------------

function ValidatorsSection() {
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
        <CodeBlock source={validatorsSource} region="propertyValidators" title="Property validators" />

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
        <CodeBlock source={validatorsSource} region="objectValidators" title="Object validators + .returns()" />

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
        <CodeBlock source={validatorsSource} region="zodValidation" title="Zod schemas via .extend(WithZod)" />
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

// ---------------------------------------------------------------------------
// 4. Middleware
// ---------------------------------------------------------------------------

function MiddlewareSection() {
  return (
    <section id="middleware" className="flex flex-col gap-6">
      <h2 className="text-3xl font-bold">Middleware</h2>
      <Prose>
        <p>
          Middleware is the heart of fluent-convex. It lets you compose reusable logic that runs
          before (and optionally after) your handler. There are two main patterns:
        </p>
        <ul className="list-disc pl-6 flex flex-col gap-2">
          <li>
            <strong>Context-enrichment</strong> — transforms the context object by adding new
            properties. The middleware calls{" "}
            <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">next(&#123; ...context, user &#125;)</code>{" "}
            and everything downstream sees the new property with full type safety.
          </li>
          <li>
            <strong>Onion (wrap)</strong> — runs code both <em>before</em> and <em>after</em> the
            rest of the chain. Because{" "}
            <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">next()</code> awaits
            the downstream middleware + handler, you can measure timing, catch errors, or
            post-process results.
          </li>
        </ul>
      </Prose>

      <h3 className="text-xl font-semibold">Defining middleware</h3>
      <Prose>
        <p>
          You create middleware with{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.createMiddleware()</code>.
          The function receives the current context and a{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">next</code> callback. Call{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">next()</code> with a new
          context to pass it downstream. If you need your middleware to work across queries,
          mutations, and actions, use{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.$context&lt;&#123; auth: Auth &#125;&gt;()</code>{" "}
          to scope the required context to the minimal shape shared by all function types.
        </p>
      </Prose>
      <CodeBlock source={middlewareSource} region="authMiddleware" title="Context-enrichment: authMiddleware" />
      <CodeBlock source={middlewareSource} region="addTimestamp" title="Simple enrichment: addTimestamp" />
      <Prose>
        <p>
          Onion middleware is especially powerful. Because it wraps the handler, it can measure
          timing, catch errors, log results, or retry. The{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">withLogging</code>{" "}
          example below is parameterized — you pass an operation name and get back a middleware
          instance:
        </p>
      </Prose>
      <CodeBlock source={middlewareSource} region="withLogging" title="Onion middleware: withLogging(name)" />

      <h3 className="text-xl font-semibold mt-4">Applying middleware with .use()</h3>
      <Prose>
        <p>
          Once defined, you apply middleware with{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.use()</code>. You can
          chain multiple{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.use()</code> calls —
          each one merges its context additions with the previous ones. The handler receives the
          combined context with everything fully typed.
        </p>
      </Prose>
      <CodeBlock source={chainsSource} region="usingMiddleware" title="convex/chains.ts — single and stacked .use() calls" />
    </section>
  );
}

// ---------------------------------------------------------------------------
// 5. Reusable Chains
// ---------------------------------------------------------------------------

function ReusableChainsSection() {
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
      <CodeBlock source={chainsSource} region="reusableBase" title="convex/chains.ts — define once, register multiple ways" />

      <h3 className="text-xl font-semibold">Stacking middleware on a callable</h3>
      <Prose>
        <p>
          You can keep adding middleware to a callable before registering it. Each{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">.use()</code> call
          returns a new builder, so the original callable is unchanged.
        </p>
      </Prose>
      <CodeBlock source={chainsSource} region="stackedMiddleware" title="Stacking middleware on a callable" />

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
      <CodeBlock source={chainsSource} region="middlewareAfterHandler" title="Middleware AFTER handler" />

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

// ---------------------------------------------------------------------------
// 6. Zod Plugin
// ---------------------------------------------------------------------------

function ZodSection() {
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
      <CodeBlock source={validatorsSource} region="zodRefinements" title="Zod refinements (.positive(), .min(), .max())" />

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
      <CodeBlock source={validatorsSource} region="zodStats" title="Complex return types with Zod" />
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

// ---------------------------------------------------------------------------
// 7. Custom Plugins
// ---------------------------------------------------------------------------

function PluginSection() {
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

// ---------------------------------------------------------------------------
// 8. Actions
// ---------------------------------------------------------------------------

function ActionsSection() {
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

// ---------------------------------------------------------------------------
// 9. Auth Middleware
// ---------------------------------------------------------------------------

function AuthSection() {
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
      <CodeBlock source={authedSource} region="reusableAuthChains" title="convex/authed.ts — defining reusable auth chains" />
      <Prose>
        <p>
          Building functions from these chains is clean and minimal. Notice how{" "}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">ctx.user.name</code> is
          used without any casting — TypeScript knows it&apos;s there because the auth middleware
          added it to the context type.
        </p>
      </Prose>
      <CodeBlock source={authedSource} region="listTasks" title="convex/authed.ts — a query using authedQuery" />
      <CodeBlock source={authedSource} region="addTask" title="convex/authed.ts — a mutation using authedMutation" />
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

// ---------------------------------------------------------------------------
// Task Manager (auth demo)
// ---------------------------------------------------------------------------

function TaskManager() {
  const data = useQuery(api.authed.listTasks, {});
  const addTask = useMutation(api.authed.addTask);
  const toggleTask = useMutation(api.authed.toggleTask);
  const deleteTask = useMutation(api.authed.deleteTask);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  if (!data) return <p className="text-sm">Loading tasks...</p>;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        Signed in as <Badge>{data.viewer}</Badge>
      </p>
      <div className="flex gap-2 items-end flex-wrap">
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-xs text-slate-500">Task title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-light dark:bg-dark border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm"
            placeholder="What needs doing?"
            onKeyDown={(e) => {
              if (e.key === "Enter" && title.trim()) {
                void addTask({ title: title.trim(), priority });
                setTitle("");
              }
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
            className="bg-light dark:bg-dark border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <Btn
          disabled={!title.trim()}
          onClick={() => {
            void addTask({ title: title.trim(), priority });
            setTitle("");
          }}
        >
          Add
        </Btn>
      </div>
      {data.tasks.length === 0 ? (
        <p className="text-sm text-slate-500">No tasks yet. Add one above!</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {data.tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-3 text-sm py-1.5 px-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => void toggleTask({ id: task.id })}
                className="accent-indigo-600"
              />
              <span className={task.completed ? "line-through text-slate-400" : ""}>
                {task.title}
              </span>
              <PriorityBadge priority={task.priority} />
              <button
                onClick={() => void deleteTask({ id: task.id })}
                className="ml-auto text-xs text-slate-400 hover:text-red-500 cursor-pointer"
              >
                delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    low: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    high: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${colors[priority] ?? ""}`}>
      {priority}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  if (!isAuthenticated) return null;
  return (
    <button
      className="text-sm bg-slate-200 dark:bg-slate-800 rounded px-3 py-1 hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer"
      onClick={() => void signOut()}
    >
      Sign out
    </button>
  );
}

function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4 max-w-sm">
      <p className="text-sm text-slate-500">
        Sign in to try the authenticated task manager demo.
      </p>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const formData = new FormData(e.target as HTMLFormElement);
          formData.set("flow", flow);
          void signIn("password", formData).catch((err) => {
            setError(err.message);
          });
        }}
      >
        <input
          className="bg-light dark:bg-dark border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm"
          type="email"
          name="email"
          placeholder="Email"
        />
        <input
          className="bg-light dark:bg-dark border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm"
          type="password"
          name="password"
          placeholder="Password"
        />
        <button
          type="submit"
          className="text-sm px-4 py-2 rounded-md font-medium bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
        >
          {flow === "signIn" ? "Sign in" : "Sign up"}
        </button>
        <p className="text-xs">
          {flow === "signIn" ? "No account? " : "Have an account? "}
          <button
            type="button"
            className="underline hover:no-underline cursor-pointer"
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
          >
            {flow === "signIn" ? "Sign up" : "Sign in"}
          </button>
        </p>
        {error && (
          <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
