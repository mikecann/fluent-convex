import { useEffect, useMemo, useRef, useState } from "react";
import { highlight } from "sugar-high";

const GITHUB_BASE = "https://github.com/mikecann/fluent-convex/blob/main/apps/docs";

/**
 * Extract lines between `// #region <name>` and `// #endregion` markers.
 * If no region is specified, the full source is returned (minus any
 * region markers and leading file-level doc comments).
 */
function extractRegion(source: string, region?: string): string {
  // Normalize Windows \r\n to \n (Vite ?raw imports preserve OS line endings)
  const normalized = source.replace(/\r\n/g, "\n");
  if (!region) return normalized;

  const lines = normalized.split("\n");
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

/**
 * Find the 1-based start and end line numbers for a `// #region` block.
 * Returns `undefined` if no region is specified or the region isn't found.
 */
function findRegionLines(
  source: string,
  region?: string
): { start: number; end: number } | undefined {
  if (!region) return undefined;
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const startMarker = `// #region ${region}`;
  let startLine: number | undefined;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === startMarker) {
      startLine = i + 2; // 1-based, skip the marker line itself
      continue;
    }
    if (startLine !== undefined && lines[i].trim() === "// #endregion") {
      return { start: startLine, end: i }; // end = line before #endregion (1-based)
    }
  }
  return undefined;
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
    html = highlight(code.replace(/\r\n/g, "\n"));
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
  file,
}: {
  source: string;
  region?: string;
  title?: string;
  /** Path relative to apps/docs/, e.g. "convex/basics.ts". Used to build a GitHub permalink. */
  file?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useIsVisible(containerRef);

  const html = useMemo(() => {
    if (isVisible) return getHighlightedHtml(source, region);
    return null;
  }, [source, region, isVisible]);

  const plain = useMemo(() => extractRegion(source, region), [source, region]);

  const githubUrl = useMemo(() => {
    if (!file) return undefined;
    const range = findRegionLines(source, region);
    if (range) return `${GITHUB_BASE}/${file}#L${range.start}-L${range.end}`;
    return `${GITHUB_BASE}/${file}`;
  }, [source, region, file]);

  return (
    <div ref={containerRef} className="rounded-lg overflow-hidden">
      {title && (
        <div className="bg-slate-700 text-slate-300 text-xs px-4 py-2 font-mono flex items-center justify-between gap-2">
          <span>{title}</span>
          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-200 transition-colors shrink-0"
              title="View on GitHub"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
            </a>
          )}
        </div>
      )}
      <pre className="bg-slate-800 text-slate-100 p-4 overflow-x-auto text-sm leading-relaxed"><code dangerouslySetInnerHTML={{ __html: html ?? escapeHtml(plain) }} /></pre>
    </div>
  );
}
