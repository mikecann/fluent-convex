import { useEffect, useMemo, useRef, useState } from "react";
import { highlight } from "sugar-high";

/**
 * Extract lines between `// #region <name>` and `// #endregion` markers.
 * If no region is specified, the full source is returned (minus any
 * region markers and leading file-level doc comments).
 */
function extractRegion(source: string, region?: string): string {
  if (!region) return source;

  const lines = source.split("\n");
  const startMarker = `// #region ${region}`;
  let capturing = false;
  const captured: string[] = [];

  for (const line of lines) {
    if (line.trim() === startMarker) {
      capturing = true;
      continue;
    }
    if (capturing && line.trim() === "// #endregion") {
      break;
    }
    if (capturing) {
      captured.push(line);
    }
  }

  return captured.length > 0 ? dedent(captured.join("\n")) : source;
}

/** Remove common leading whitespace from a block of code. */
function dedent(code: string): string {
  const lines = code.split("\n");
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) return code;
  const minIndent = Math.min(
    ...nonEmpty.map((l) => l.match(/^(\s*)/)?.[1].length ?? 0)
  );
  return lines.map((l) => l.slice(minIndent)).join("\n").trim();
}

/** Escape HTML entities so plain code can safely be used with dangerouslySetInnerHTML. */
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Cache highlighted HTML so we never re-highlight the same source+region. */
const highlightCache = new Map<string, string>();

function getHighlightedHtml(source: string, region?: string): string {
  const key = `${region ?? ""}::${source}`;
  let html = highlightCache.get(key);
  if (html === undefined) {
    const code = extractRegion(source, region);
    html = highlight(code);
    highlightCache.set(key, html);
  }
  return html;
}

/**
 * Hook that returns true once the element has entered the viewport.
 * Once visible, it stays true (we never "un-highlight").
 */
function useIsVisible(ref: React.RefObject<HTMLElement | null>): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" } // start highlighting slightly before scrolling into view
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return visible;
}

export function CodeBlock({
  source,
  region,
  title,
}: {
  source: string;
  region?: string;
  title?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useIsVisible(containerRef);

  const html = useMemo(() => {
    if (isVisible) return getHighlightedHtml(source, region);
    return null;
  }, [source, region, isVisible]);

  const plain = useMemo(() => extractRegion(source, region), [source, region]);

  return (
    <div ref={containerRef} className="rounded-lg overflow-hidden">
      {title && (
        <div className="bg-slate-700 text-slate-300 text-xs px-4 py-2 font-mono">
          {title}
        </div>
      )}
      <pre className="bg-slate-800 text-slate-100 p-4 overflow-x-auto text-sm leading-normal"><code dangerouslySetInnerHTML={{ __html: html ?? escapeHtml(plain) }} /></pre>
    </div>
  );
}
