import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AI Chat | General AI Assistant",
  description:
    "Production-Ready General-Purpose AI Chatbot Platform supporting local Ollama models, Cloud LLMs, RAG, and Autonomous Tools.",
  keywords: [
    "AI Chat",
    "Ollama",
    "ChatGPT",
    "Claude",
    "Gemini",
    "RAG",
    "FastAPI",
    "Next.js",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('hs_theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;if(d){r.classList.add('dark');r.classList.remove('light');r.setAttribute('data-theme','dark');r.style.colorScheme='dark';}else{r.classList.remove('dark');r.classList.add('light');r.setAttribute('data-theme','light');r.style.colorScheme='light';}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${inter.variable} font-sans h-full overflow-hidden bg-stone-50 dark:bg-neutral-900 text-stone-900 dark:text-neutral-100 transition-colors antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
