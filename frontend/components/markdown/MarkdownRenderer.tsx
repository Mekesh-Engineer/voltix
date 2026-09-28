"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

import { CodeBlock } from "./CodeBlock";
import {
  TableRenderer,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableDataCell,
} from "./TableRenderer";

interface MarkdownRendererProps {
  content: string;
}

export const KATEX_MACROS: Record<string, string> = {
  "\\rm": "\\mathrm",
  "\\rpm": "\\text{ rpm}",
  "\\RPM": "\\text{ RPM}",
  "\\Hz": "\\text{ Hz}",
  "\\kHz": "\\text{ kHz}",
  "\\MHz": "\\text{ MHz}",
  "\\GHz": "\\text{ GHz}",
  "\\kW": "\\text{ kW}",
  "\\MW": "\\text{ MW}",
  "\\GW": "\\text{ GW}",
  "\\kVA": "\\text{ kVA}",
  "\\MVA": "\\text{ MVA}",
  "\\kV": "\\text{ kV}",
  "\\V": "\\text{ V}",
  "\\A": "\\text{ A}",
  "\\mA": "\\text{ mA}",
  "\\ohm": "\\Omega",
  "\\pu": "\\text{ p.u.}",
  "\\deg": "^\\circ",
  "\\s": "\\text{ s}",
};

/**
 * Preprocesses raw markdown and LLM responses to normalize mathematical expressions,
 * convert raw bracket notations (\[ \], \( \)) into standard LaTeX delimiters, repair escaping errors,
 * protect code blocks, and handle streaming partial tokens cleanly.
 */
export function preprocessMathContent(text: string): string {
  if (!text) return "";

  // 1. Protect code blocks (fenced ``` and inline `) from math modifications
  const codeBlocks: string[] = [];
  let processed = text.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  // 2. Normalize double backslashes before common LaTeX commands and mathematical symbols
  processed = processed.replace(
    /\\\\(?=(frac|text|boxed|sqrt|sum|int|partial|alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|times|div|pm|mp|approx|neq|le|ge|cdot|mathbf|mathbb|mathrm|left|right|begin|end|quad|qquad|nabla|infty|to|rightarrow|leftarrow|leftrightarrow|leq|geq|rpm|RPM|Hz|kHz|MHz|GHz|kW|MW|kV|mA|pu|ohm|degree|tag))/g,
    "\\"
  );

  // 3. Convert explicit LaTeX display blocks \[ ... \] or \\[ ... \\] into standard $$ ... $$
  processed = processed.replace(/\\{1,2}\[([\s\S]*?)\\{1,2}\]/g, (_, math) => {
    return `\n\n$$\n${math.trim()}\n$$\n\n`;
  });

  // 4. Convert explicit LaTeX inline delimiters \( ... \) or \\( ... \\) into $ ... $
  processed = processed.replace(/\\{1,2}\(([\s\S]*?)\\{1,2}\)/g, (_, math) => {
    return `$${math.trim()}$`;
  });

  // 5. Convert standalone LaTeX environments (aligned, cases, matrix, pmatrix, etc.) only if not already inside $$
  processed = processed.replace(
    /(?:^|\n)\s*(\\begin\{(?:aligned|cases|matrix|pmatrix|bmatrix|vmatrix|align\*?)\}[\s\S]*?\\end\{(?:aligned|cases|matrix|pmatrix|bmatrix|vmatrix|align\*?)\})\s*(?=\n|$)/g,
    (match, env, offset, fullStr) => {
      const textBefore = fullStr.substring(0, offset);
      const doubleDollarCount = (textBefore.match(/\$\$/g) || []).length;
      if (doubleDollarCount % 2 === 1) {
        return match;
      }
      return `\n\n$$\n${env.trim()}\n$$\n\n`;
    }
  );

  // 6. Convert bracketed formula lines: e.g. [ n_s = \frac{120\cdot f}{p} ] or [ f_r = s \cdot f ]
  processed = processed.replace(
    /(?:^|\n)\s*\[\s*([^\[\]\(\)\n]*?(?:\\frac|\\cdot|\\times|\\sqrt|\\sum|\\int|\\boxed|\\theta|\\alpha|\\beta|\\omega|\\mu|\\lambda|\\sigma|\\Delta|=|\^|_|\\text\{|\\nabla)[^\[\]\(\)\n]*?)\s*\]\s*(?=\n|$)/g,
    (_, math) => `\n\n$$\n${math.trim()}\n$$\n\n`
  );

  // 7. Line-by-line inspection to format textbook solution step labels
  const lines = processed.split("\n");
  const processedLines: string[] = [];
  let inDisplayMath = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("$$")) {
      const isSingleLineBlock = trimmed.length > 2 && trimmed.endsWith("$$") && trimmed.slice(2, -2).trim().length > 0;
      if (isSingleLineBlock) {
        processedLines.push(line);
        continue;
      }
      inDisplayMath = !inDisplayMath;
      processedLines.push(line);
      continue;
    }

    if (inDisplayMath) {
      processedLines.push(line);
      continue;
    }

    // Identify textbook solution step labels
    const textbookHeaderMatch = /^(Given|Formula|Formulas|Substitution|Calculation|Calculations|Result|Final Result|Rotor speed|Synchronous speed|Rotor frequency|Step \d+|Note|Explanation):/i.exec(trimmed);
    if (textbookHeaderMatch && trimmed === textbookHeaderMatch[0]) {
      processedLines.push(`\n**${trimmed}**\n`);
      continue;
    }

    // Only wrap lines that are pure formulas (no surrounding English prose or markdown elements)
    const isProseOrList = /^(#|\*|-|\d+\.|>|\||```|[A-Z][a-z]+\s+[a-z]+)/.test(trimmed);
    const hasInlineMath = /\$[^$]+\$/.test(trimmed);
    const isAlreadyDelimited = (trimmed.startsWith("$") && trimmed.endsWith("$")) || (trimmed.startsWith("$$") && trimmed.endsWith("$$"));
    const isPureMathFormula = !isProseOrList && !hasInlineMath && !isAlreadyDelimited &&
      /^[a-zA-Z0-9_\\{}()[\],\s=+\-*\/^<>≈≤≥±·]+$/.test(trimmed) &&
      (/[=<>≈≤≥±]/.test(trimmed) || /\\(frac|sqrt|boxed|sum|int|partial)\b/.test(trimmed)) &&
      trimmed.length < 150 &&
      !/\b(the|is|and|with|for|where|thus|over|from|into|was|were|are)\b/i.test(trimmed);

    if (isPureMathFormula) {
      processedLines.push(`\n$$\n${trimmed}\n$$\n`);
    } else {
      processedLines.push(line);
    }
  }

  processed = processedLines.join("\n");

  // 8. Streaming safety: Auto-complete open delimiters at the very end of streaming content
  const displayMathOpenings = (processed.match(/\$\$/g) || []).length;
  if (displayMathOpenings % 2 !== 0) {
    processed += "\n$$";
  }

  // 9. Clean up extra repeated newlines around $$
  processed = processed.replace(/\n{3,}\$\$/g, () => "\n\n$$");
  processed = processed.replace(/\$\$\n{3,}/g, () => "$$\n\n");

  // 10. Restore protected code blocks
  processed = processed.replace(/__CODE_BLOCK_(\d+)__/g, (_, idx) => {
    return codeBlocks[parseInt(idx, 10)] || "";
  });

  return processed;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const normalizedContent = useMemo(() => {
    return preprocessMathContent(content);
  }, [content]);

  return (
    <div className="prose prose-stone dark:prose-invert max-w-none text-stone-800 dark:text-neutral-200 text-[15px] leading-relaxed break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [
            rehypeKatex,
            {
              output: "htmlAndMathml",
              throwOnError: false,
              strict: false,
              trust: true,
              macros: KATEX_MACROS,
            },
          ],
        ]}
        components={{
          code({ inline, className, children, ...props }: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");

            if (!inline && match) {
              return <CodeBlock language={match[1]} value={codeString} />;
            } else if (!inline && codeString.includes("\n")) {
              return <CodeBlock language="text" value={codeString} />;
            }
            return (
              <code
                className="px-1.5 py-0.5 rounded-md font-mono text-xs bg-stone-100 dark:bg-neutral-800 text-blue-600 dark:text-blue-400 font-medium"
                {...props}
              >
                {children}
              </code>
            );
          },
          table({ children }) {
            return <TableRenderer>{children}</TableRenderer>;
          },
          thead({ children }) {
            return <TableHead>{children}</TableHead>;
          },
          tbody({ children }) {
            return <TableBody>{children}</TableBody>;
          },
          tr({ children }) {
            return <TableRow>{children}</TableRow>;
          },
          th({ children }) {
            return <TableHeaderCell>{children}</TableHeaderCell>;
          },
          td({ children }) {
            return <TableDataCell>{children}</TableDataCell>;
          },
          h1({ children }) {
            return (
              <h1 className="text-2xl font-bold mt-7 mb-3 text-stone-900 dark:text-white tracking-tight">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-xl font-bold mt-6 mb-2.5 text-stone-900 dark:text-neutral-100 tracking-tight pb-1.5 border-b border-stone-200/60 dark:border-neutral-800">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-base font-semibold mt-5 mb-2 text-stone-800 dark:text-neutral-200">
                {children}
              </h3>
            );
          },
          p({ children }) {
            return <p className="mb-3.5 leading-relaxed">{children}</p>;
          },
          ul({ children }) {
            return <ul className="list-disc pl-5 my-3 space-y-1.5">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-5 my-3 space-y-1.5">{children}</ol>;
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>;
          },
          hr() {
            return <hr className="my-6 border-stone-200 dark:border-neutral-800" />;
          },
          blockquote({ children }) {
            const raw = React.Children.toArray(children);
            const firstChild = raw[0];
            const textContent =
              typeof firstChild === "object" &&
              firstChild &&
              "props" in firstChild &&
              (firstChild as { props: { children?: React.ReactNode } }).props.children
                ? String((firstChild as { props: { children?: React.ReactNode } }).props.children)
                : String(children);

            if (textContent.includes("[!WARNING]") || textContent.includes("[!CAUTION]")) {
              return (
                <div className="my-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1" />
                  <div className="flex-1 not-italic font-normal">{children}</div>
                </div>
              );
            }

            if (textContent.includes("[!NOTE]") || textContent.includes("[!TIP]") || textContent.includes("[!IMPORTANT]")) {
              return (
                <div className="my-4 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-900 dark:text-blue-200 text-xs flex items-start gap-2.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1" />
                  <div className="flex-1 not-italic font-normal">{children}</div>
                </div>
              );
            }

            return (
              <blockquote className="border-l-2 border-blue-500/70 pl-3.5 py-1 my-4 bg-blue-50/40 dark:bg-blue-950/20 rounded-r-lg italic text-stone-700 dark:text-neutral-300 text-sm">
                {children}
              </blockquote>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}
