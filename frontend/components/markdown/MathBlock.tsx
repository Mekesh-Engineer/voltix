"use client";

import React, { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { KATEX_MACROS } from "./MarkdownRenderer";

interface MathBlockProps {
  math: string;
  block?: boolean;
  className?: string;
}

export function MathBlock({ math, block = false, className = "" }: MathBlockProps) {
  const html = useMemo(() => {
    if (!math) return "";
    try {
      const cleanMath = math.trim().replace(/^(\$\$|\$)|(\$\$|\$)$/g, "");
      return katex.renderToString(cleanMath, {
        displayMode: block,
        throwOnError: false,
        strict: false,
        trust: true,
        macros: KATEX_MACROS,
      });
    } catch {
      return math;
    }
  }, [math, block]);

  if (block) {
    return (
      <div
        className={`katex-display my-4 overflow-x-auto ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      className={`inline-block px-0.5 align-baseline ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
