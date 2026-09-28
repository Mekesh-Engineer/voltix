import React from "react";

/**
 * Recursively parses and formats strings within table cells to render <br> linebreaks
 * and clean bullet styling.
 */
function renderCellContent(nodes: React.ReactNode): React.ReactNode {
  return React.Children.map(nodes, (child, idx) => {
    if (typeof child === "string") {
      if (child.includes("<br>") || child.includes("<br/>") || child.includes("<br />")) {
        const parts = child.split(/<br\s*\/?>/gi);
        return parts.map((part, pIdx) => (
          <React.Fragment key={`${idx}-${pIdx}`}>
            {pIdx > 0 && <br className="my-0.5" />}
            {part}
          </React.Fragment>
        ));
      }
      return child;
    }
    if (React.isValidElement(child) && (child.props as { children?: React.ReactNode })?.children) {
      return React.cloneElement(child as React.ReactElement<{ children?: React.ReactNode }>, {
        children: renderCellContent((child.props as { children?: React.ReactNode }).children),
      });
    }
    return child;
  });
}

export function TableRenderer({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto my-5 rounded-xl border border-stone-200 dark:border-neutral-800 shadow-xs bg-white dark:bg-neutral-900/60">
      <table className="min-w-full divide-y divide-stone-200 dark:divide-neutral-800 text-sm">
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-stone-100/80 dark:bg-neutral-800/80 text-stone-900 dark:text-neutral-100 backdrop-blur-xs">
      {children}
    </thead>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return (
    <tbody className="divide-y divide-stone-200/80 dark:divide-neutral-800/80 bg-white dark:bg-neutral-900/40">
      {children}
    </tbody>
  );
}

export function TableRow({ children }: { children: React.ReactNode }) {
  return (
    <tr className="hover:bg-blue-50/40 dark:hover:bg-neutral-800/50 transition-colors">
      {children}
    </tr>
  );
}

export function TableHeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-stone-700 dark:text-neutral-200">
      {renderCellContent(children)}
    </th>
  );
}

export function TableDataCell({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-3 whitespace-normal text-stone-700 dark:text-neutral-300 leading-relaxed">
      {renderCellContent(children)}
    </td>
  );
}
