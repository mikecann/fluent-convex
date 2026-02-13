import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { Badge, Btn, PriorityBadge } from "./ui";

export function TaskManager() {
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

export function SignInForm() {
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
