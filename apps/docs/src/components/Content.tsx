import { memo, useEffect, useRef } from "react";
import { GettingStartedSection } from "../sections/GettingStartedSection";
import { BasicsSection } from "../sections/BasicsSection";
import { ValidatorsSection } from "../sections/ValidatorsSection";
import { MiddlewareSection } from "../sections/MiddlewareSection";
import { ReusableChainsSection } from "../sections/ReusableChainsSection";
import { ZodSection } from "../sections/ZodSection";
import { PluginSection } from "../sections/PluginSection";
import { ActionsSection } from "../sections/ActionsSection";
import { AuthSection } from "../sections/AuthSection";

export const Content = memo(function Content({
  onSectionChange,
}: {
  onSectionChange: (id: string) => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onSectionChange);
  useEffect(() => {
    callbackRef.current = onSectionChange;
  }, [onSectionChange]);

  // Scroll to the target section on initial load or when the hash changes.
  // Because <main> is the scroll container (overflow-y-auto), the browser's
  // native #hash scrolling targets the document and misses our container.
  useEffect(() => {
    function scrollToHash() {
      const hash = window.location.hash.replace("#", "");
      if (!hash) return;
      // Small delay to let sections render before measuring
      requestAnimationFrame(() => {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      });
    }

    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);

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
