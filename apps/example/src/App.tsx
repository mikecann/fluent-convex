import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";

export default function App() {
  return (
    <>
      <header className="sticky top-0 z-10 bg-light dark:bg-dark p-4 border-b-2 border-slate-200 dark:border-slate-800">
        Fluent Convex - Testing Library Types
      </header>
      <main className="p-8 flex flex-col gap-8">
        <h1 className="text-4xl font-bold text-center">Fluent Convex</h1>
        <NumbersList />
        <NumberStats />
        <FilteredNumbers />
        <Actions />
      </main>
    </>
  );
}

function NumbersList() {
  // Testing PropertyValidators with simple input
  const { numbers } =
    useQuery(api.myFunctions.listNumbersSimple, { count: 10 }) ?? {};

  // Testing PropertyValidators with optional fields
  const addNumber = useMutation(api.myFunctions.addNumber);
  const addWithMetadata = useMutation(api.myFunctions.addNumberWithMetadata);

  // Testing Zod validator with refinement
  const addPositive = useMutation(api.myFunctions.addPositiveNumber);
  const deleteAll = useMutation(api.myFunctions.deleteAllNumbers);

  const [label, setLabel] = useState("");

  if (numbers === undefined) {
    return (
      <div className="flex flex-col gap-4 p-4 bg-slate-100 dark:bg-slate-900 rounded-lg max-w-2xl mx-auto">
        <p className="text-center">Loading numbers...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-100 dark:bg-slate-900 rounded-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold">Numbers List</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Testing PropertyValidators and Zod validators
      </p>

      <div className="flex gap-2 flex-wrap">
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-md"
          onClick={() => {
            void addNumber({ value: Math.floor(Math.random() * 100) - 50 });
          }}
        >
          Add Random (-50 to 50)
        </button>

        <button
          className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-md"
          onClick={() => {
            void addPositive({
              value: Math.floor(Math.random() * 100) + 1,
              description: "Random positive number",
            });
          }}
        >
          Add Positive (Zod validation)
        </button>

        <button
          className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-md"
          onClick={() => {
            void addWithMetadata({
              value: Math.floor(Math.random() * 10),
              label: label || undefined,
              tags: ["test", "demo"],
            });
          }}
        >
          Add with Metadata (optional fields)
        </button>

        <button
          className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-md"
          onClick={() => {
            if (confirm("Delete all numbers?")) {
              void deleteAll({});
            }
          }}
        >
          Delete All
        </button>
      </div>

      <input
        type="text"
        placeholder="Optional label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
      />

      <div className="p-4 bg-white dark:bg-slate-800 rounded-md">
        <p className="font-mono text-sm">
          Numbers ({numbers.length}):{" "}
          {numbers.length === 0
            ? "Click a button to add numbers!"
            : numbers.join(", ")}
        </p>
      </div>
    </div>
  );
}

function NumberStats() {
  // Testing Zod with optional fields and complex return type
  const stats = useQuery(api.myFunctions.getNumberStats, { limit: 100 });

  if (!stats) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-100 dark:bg-slate-900 rounded-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold">Statistics</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Testing Zod return validators with complex types
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Average" value={stats.average.toFixed(2)} suffix="" />
        <StatCard label="Min" value={stats.min ?? "N/A"} suffix="" />
        <StatCard label="Max" value={stats.max ?? "N/A"} suffix="" />
      </div>

      {stats.numbers.length > 0 && (
        <div className="p-4 bg-white dark:bg-slate-800 rounded-md">
          <p className="text-sm font-semibold mb-2">Recent numbers:</p>
          <p className="font-mono text-sm">{stats.numbers.join(", ")}</p>
        </div>
      )}
    </div>
  );
}

function FilteredNumbers() {
  // Testing Zod enum types
  const [filter, setFilter] = useState<
    "all" | "positive" | "negative" | "zero"
  >("all");
  const filtered = useQuery(api.myFunctions.filterNumbers, {
    filter,
    limit: 10,
  });

  if (!filtered) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-100 dark:bg-slate-900 rounded-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold">Filtered View</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Testing Zod enum validators
      </p>

      <div className="flex gap-2 flex-wrap">
        {(["all", "positive", "negative", "zero"] as const).map((f) => (
          <button
            key={f}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="p-4 bg-white dark:bg-slate-800 rounded-md">
        <p className="text-sm mb-2">
          <span className="font-semibold">Filter:</span> {filtered.filter} (
          {filtered.totalMatching} total)
        </p>
        <p className="font-mono text-sm">
          {filtered.numbers.length === 0
            ? `No ${filtered.filter} numbers found`
            : filtered.numbers.join(", ")}
        </p>
      </div>
    </div>
  );
}

function Actions() {
  // Testing actions
  const generateNumbers = useAction(api.myFunctions.generateRandomNumbers);
  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-100 dark:bg-slate-900 rounded-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold">Actions</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Testing action functions
      </p>

      <div className="flex gap-2 flex-wrap">
        <button
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-md disabled:opacity-50"
          disabled={isGenerating}
          onClick={() => {
            setIsGenerating(true);
            generateNumbers({ count: 5, min: 1, max: 100 })
              .then((nums) => {
                alert(`Generated numbers: ${nums.join(", ")}`);
              })
              .catch((err) => {
                alert(`Error: ${err.message}`);
              })
              .finally(() => {
                setIsGenerating(false);
              });
          }}
        >
          {isGenerating ? "Generating..." : "Generate 5 Random Numbers"}
        </button>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div className="p-4 bg-white dark:bg-slate-800 rounded-md">
      <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
      <p className="text-2xl font-bold">
        {value}
        {suffix}
      </p>
    </div>
  );
}
