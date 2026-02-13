import { useEffect } from "react";
import { useRoute, routes } from "../router";

type NavLink = { kind: "link"; route: (typeof routes)[keyof typeof routes]; routeName: string; label: string };
type NavSection = { kind: "section"; label: string };
type NavItem = NavLink | NavSection;

const NAV_ITEMS: NavItem[] = [
  { kind: "section", label: "Guide" },
  { kind: "link", route: routes.gettingStarted, routeName: "gettingStarted", label: "Getting Started" },
  { kind: "link", route: routes.validation, routeName: "validation", label: "Validation" },
  { kind: "link", route: routes.reusableChains, routeName: "reusableChains", label: "Reusable Chains" },
  { kind: "link", route: routes.middleware, routeName: "middleware", label: "Middleware" },
  { kind: "section", label: "Plugins" },
  { kind: "link", route: routes.customPlugins, routeName: "customPlugins", label: "Custom Plugins" },
  { kind: "link", route: routes.zodPlugin, routeName: "zodPlugin", label: "Zod Plugin" },
];

function NavContent({
  activeRouteName,
  onNavClick,
}: {
  activeRouteName: string | false;
  onNavClick?: () => void;
}) {
  return (
    <>
      {NAV_ITEMS.map((item, i) => {
        if (item.kind === "section") {
          return (
            <p
              key={item.label}
              className={`text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider ${i === 0 ? "mb-2" : "mt-4 mb-2"}`}
            >
              {item.label}
            </p>
          );
        }
        const isActive = activeRouteName === item.routeName;
        return (
          <a
            key={item.routeName}
            {...item.route().link}
            onClick={onNavClick}
            className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
              isActive
                ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {item.label}
          </a>
        );
      })}
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
    </>
  );
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const route = useRoute();
  const activeRouteName = route.name;

  // Close sidebar on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <>
      {/* Desktop sidebar - always visible at lg+ */}
      <aside className="hidden lg:block w-60 shrink-0 border-r border-slate-200 dark:border-slate-800 sticky top-[49px] h-[calc(100vh-49px)] overflow-y-auto">
        <nav className="p-4 flex flex-col gap-1">
          <NavContent activeRouteName={activeRouteName} />
        </nav>
      </aside>

      {/* Mobile drawer overlay - visible below lg when open */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Drawer panel */}
          <aside className="fixed inset-y-0 left-0 z-40 w-64 bg-light dark:bg-dark border-r border-slate-200 dark:border-slate-800 overflow-y-auto lg:hidden animate-slide-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <span className="font-bold text-lg tracking-tight">Navigation</span>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close navigation menu"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="p-4 flex flex-col gap-1">
              <NavContent activeRouteName={activeRouteName} onNavClick={onClose} />
            </nav>
          </aside>
        </>
      )}
    </>
  );
}
