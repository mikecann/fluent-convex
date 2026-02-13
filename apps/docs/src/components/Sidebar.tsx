export const NAV_SECTIONS = [
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

export function Sidebar({ activeSection }: { activeSection: string }) {
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
