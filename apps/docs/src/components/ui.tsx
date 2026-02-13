export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-slate-600 dark:text-slate-400 leading-relaxed text-[15px] flex flex-col gap-3">
      {children}
    </div>
  );
}

export function DemoCard({
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

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-slate-200 dark:bg-slate-700 text-xs font-mono px-2 py-0.5 rounded">
      {children}
    </span>
  );
}

export function Btn({
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

export function InfoCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950/30 px-4 py-3 text-[14px] text-sky-800 dark:text-sky-300">
      <span className="mt-0.5 shrink-0 text-sky-500" aria-hidden>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
            clipRule="evenodd"
          />
        </svg>
      </span>
      <div>{children}</div>
    </div>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
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
