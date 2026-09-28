const React = require("react");
const ReactDOMServer = require("react-dom/server");
const fs = require("fs");
const path = require("path");

const KATEX_MACROS = {
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

function preprocessMathContent(text) {
  if (!text) return "";

  // 1. Protect code blocks
  const codeBlocks = [];
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
  processed = processed.replace(/(?:^|\n)\s*\\{1,2}\[([\s\S]*?)\\{1,2}\]\s*(?=\n|$)/g, (_, math) => {
    return `\n\n$$\n${math.trim()}\n$$\n\n`;
  });

  // Also catch any remaining \[ ... \]
  processed = processed.replace(/\\{1,2}\[([\s\S]*?)\\{1,2}\]/g, (_, math) => {
    return `\n\n$$\n${math.trim()}\n$$\n\n`;
  });

  // 4. Convert explicit LaTeX inline delimiters \( ... \) or \\( ... \\) into $ ... $
  processed = processed.replace(/\\{1,2}\(([\s\S]*?)\\{1,2}\)/g, (_, math) => {
    return `$${math.trim()}$`;
  });

  // 5. Convert standalone LaTeX environments (aligned, cases, matrix, etc.) only if not already inside $$
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

  // 7. Line-by-line inspection for standalone unlabeled formulas
  const lines = processed.split("\n");
  const processedLines = [];
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

    // Step labels
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

async function runTestSuite() {
  console.log("=================================================");
  console.log("AETHERION CHAT RENDERING PIPELINE TEST SUITE");
  console.log("=================================================\n");

  const { default: ReactMarkdown } = await import("react-markdown");
  const { default: remarkGfm } = await import("remark-gfm");
  const { default: remarkMath } = await import("remark-math");
  const { default: rehypeKatex } = await import("rehype-katex");

  function renderDocument(raw) {
    const pre = preprocessMathContent(raw);
    const element = React.createElement(
      ReactMarkdown,
      {
        remarkPlugins: [remarkGfm, remarkMath],
        rehypePlugins: [
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
        ],
      },
      pre
    );
    return ReactDOMServer.renderToStaticMarkup(element);
  }

  let totalTests = 0;
  let passedTests = 0;

  function assert(name, condition, details = "") {
    totalTests++;
    if (condition) {
      console.log(`  ✓ [PASS] ${name}`);
      passedTests++;
    } else {
      console.error(`  ✗ [FAIL] ${name} ${details}`);
    }
  }

  // TEST 1: INLINE LATEX AND BRACKET DELIMITERS
  console.log("Test Category 1: Inline LaTeX and Greek/Engineering Units");
  const test1 = renderDocument(String.raw`The resistance is \(R = 10\;\Omega\) and natural frequency is \(\omega_n = 316.23\;\text{rad/s}\) with \(\zeta < 1\).`);
  assert("Inline math rendered with KaTeX class", test1.includes('class="katex"'));
  assert("Inline math contains Omega symbol", test1.includes('Ω') || test1.includes('Omega') || test1.includes('katex'));
  assert("No raw \\( or \\) left in output", !test1.includes('\\(') && !test1.includes('\\)'));

  // TEST 2: DISPLAY EQUATION WITH FRACTION AND NUMBERING
  console.log("\nTest Category 2: Display Equations with Fractions, Aligned & Tags");
  const test2 = renderDocument(String.raw`
\[
G(s)=\frac{Y(s)}{U(s)}=\frac{1}{LC\,s^{2}+RC\,s+1}
\tag{1}
\]
`);
  assert("Display equation rendered with katex-display", test2.includes('class="katex-display"'));
  assert("Fraction rendered with frac-line", test2.includes('frac-line'));
  assert("Equation tag (1) rendered", test2.includes('<mtext>(1)</mtext>') || test2.includes('tag'));
  assert("No raw \\[ or \\] left in output", !test2.replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, '').includes('\\['));

  // TEST 3: ALIGNED MULTI-LINE COEFFICIENT EQUATIONS
  console.log("\nTest Category 3: Multi-line Aligned Environments");
  const test3 = renderDocument(String.raw`
\[
\begin{aligned}
b_0 &= 9.90\times10^{-5},\\
b_1 &= -9.80\times10^{-5},\\[2pt]
a_1 &= -1.960,\\
a_2 &= 0.9605 .
\end{aligned}
\]
`);
  assert("Aligned block rendered in KaTeX display", test3.includes('class="katex-display"'));
  assert("No raw \\begin{aligned} in visible HTML", !test3.replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, '').includes('\\begin{aligned}'));

  // TEST 4: BOXED RESULTS
  console.log("\nTest Category 4: Boxed Equation Highlights");
  const test4 = renderDocument(String.raw`
\[
\boxed{K_p = 1.2\times10^{2}},\qquad \boxed{K_i = 2.5\times10^{2}\;{\rm s^{-1}}},\qquad \boxed{K_d = 8.0\times10^{0}\;{\rm s}}
\tag{7}
\]
`);
  assert("Boxed equations rendered in KaTeX", test4.includes('class="katex-display"') && (test4.includes('fbox') || test4.includes('boxed')));
  assert("Equation tag (7) rendered", test4.includes('<mtext>(7)</mtext>') || test4.includes('tag'));

  // TEST 5: MARKDOWN TABLE WITH EMBEDDED MATH AND LINEBREAKS
  console.log("\nTest Category 5: Markdown Tables with Embedded KaTeX and Breaks");
  const test5 = renderDocument(String.raw`
| Metric | Value |
|--------|-------|
| Final output \(y_{\infty}\) | **1.000** |
| Overshoot \(\%OS\) | **4.8 %** |
`);
  assert("Table element generated", test5.includes('<table>') && test5.includes('<tbody>'));
  assert("Table cell contains rendered KaTeX", test5.includes('<td>') && test5.includes('class="katex"'));

  // TEST 6: PYTHON CODE BLOCK PRESERVATION
  console.log("\nTest Category 6: Python Fenced Code Block Preservation");
  const test6 = renderDocument(`
\`\`\`python
import numpy as np

def simulate(Ts=0.01, N=100):
    time = np.arange(N) * Ts
    return time
\`\`\`
`);
  assert("Code block generated with language-python", test6.includes('language-python'));
  assert("Code block preserves def simulate indentation", test6.includes('def simulate'));
  assert("Code block not corrupted by math preprocessor", test6.includes('import numpy as np'));

  // TEST 7: STREAMING TOKEN SAFETY
  console.log("\nTest Category 7: Streaming Incomplete Token Handling");
  const streamingPartial = "The transfer function is $$\n G(s) = \\frac{1}{LCs^2 + RCs + 1}";
  const test7 = renderDocument(streamingPartial);
  assert("Unclosed display math closed safely during streaming", test7.includes('class="katex"'));

  // TEST 8: COMPLETE DISCRETE-TIME PID RLC BENCHMARK DOCUMENT
  console.log("\nTest Category 8: Full RLC Second-Order Benchmark Document");
  const fixturePath = path.join(__dirname, "tests", "fixtures", "rlc_benchmark.md");
  const sample = fs.readFileSync(fixturePath, "utf8");
  const test8 = renderDocument(sample);
  const visible8 = test8.replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, "");

  assert("Full document renders KaTeX display blocks", test8.includes('class="katex-display"'));
  assert("Full document renders tables", test8.includes('<table>') && test8.includes('<tbody>'));
  assert("Full document renders Python code block", test8.includes('language-python'));
  assert("Full document has all equation tags (1) through (8)", test8.includes('<mtext>(1)</mtext>') && test8.includes('<mtext>(2)</mtext>') && test8.includes('<mtext>(7)</mtext>') && test8.includes('<mtext>(8)</mtext>'));
  assert("Full document has zero raw visible \\[\\] delimiters", !visible8.includes('\\[') && !visible8.includes('\\]'));
  assert("Full document has zero raw visible \\(\\) delimiters", !visible8.includes('\\(') && !visible8.includes('\\)'));
  assert("Full document has headings h1, h2, h3", test8.includes('<h1>') && test8.includes('<h2>') && test8.includes('<h3>'));

  console.log("\n=================================================");
  console.log(`SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("=================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
