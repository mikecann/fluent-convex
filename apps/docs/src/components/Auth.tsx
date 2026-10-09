import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { Badge, Btn, ErrorNote, PriorityBadge } from "./ui";

export function TaskManager() {
  const data = useQuery(api.authed.listTasks, {});
  const addTask = useMutation(api.authed.addTask);
  const toggleTask = useMutation(api.authed.toggleTask);
  const deleteTask = useMutation(api.authed.deleteTask);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [error, setError] = useState<unknown>(null);

  if (!data) return <p className="text-sm">Loading tasks...</p>;

  const submit = () => {
    const submitted = title;
    setError(null);
    setTitle("");
    void addTask({ title: submitted.trim(), priority }).catch((err: unknown) => {
      setError(err);
      // Put the title back so a rejected task can be retried
      setTitle((current) => current || submitted);
    });
  };

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
            maxLength={200}
            className="bg-light dark:bg-dark border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-sm"
            placeholder="What needs doing?"
            onKeyDown={(e) => {
              if (e.key === "Enter" && title.trim()) submit();
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
        <Btn disabled={!title.trim()} onClick={submit}>
          Add
        </Btn>
      </div>
      <ErrorNote error={error} />
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

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const demoLogin = () => {
    setError(null);
    setLoading(true);
    const formData = new FormData();
    formData.set("email", "demo@fluent-convex.dev");
    formData.set("password", "demodemo");
    formData.set("flow", "signUp");
    // Try sign-up first (creates the account if it doesn't exist),
    // fall back to sign-in if the account already exists.
    void signIn("password", formData)
      .catch(() => {
        formData.set("flow", "signIn");
        return signIn("password", formData);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  return (
    <div className="flex flex-col gap-3 max-w-sm">
      <p className="text-sm text-slate-500">
        Sign in to try the authenticated task manager demo.
      </p>
      <button
        type="button"
        disabled={loading}
        onClick={demoLogin}
        className="text-sm px-4 py-2 rounded-md font-medium bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer disabled:opacity-50"
      >
        {loading ? "Signing in..." : "Try with demo account"}
      </button>
      {error && (
        <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
