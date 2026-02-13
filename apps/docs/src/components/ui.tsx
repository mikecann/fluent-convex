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
