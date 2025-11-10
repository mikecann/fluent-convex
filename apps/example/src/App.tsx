import { NumbersList } from "./components/NumbersList";
import { NumberStats } from "./components/NumberStats";
import { FilteredNumbers } from "./components/FilteredNumbers";
import { Actions } from "./components/Actions";
import { AuthTesting } from "./components/AuthTesting";

export default function App() {
  return (
    <>
      <header className="sticky top-0 z-10 bg-light dark:bg-dark p-4 border-b-2 border-slate-200 dark:border-slate-800">
        Fluent Convex - Testing Library Types
      </header>
      <main className="p-8">
        <h1 className="text-4xl font-bold text-center mb-8">Fluent Convex</h1>
        <div className="flex flex-wrap gap-8 justify-center">
          <NumbersList />
          <NumberStats />
          <FilteredNumbers />
          <Actions />
          <AuthTesting />
        </div>
      </main>
    </>
  );
}
