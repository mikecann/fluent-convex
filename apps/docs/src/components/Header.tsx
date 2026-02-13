import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";

export function Header() {
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
