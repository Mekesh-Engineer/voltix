import React from "react";

export function VoltixSymbol({ className = "w-5 h-5 text-current" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 -960 960 960"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="m280-80 160-300-320-40 480-460h80L520-580l320 40L360-80h-80Zm222-247 161-154-269-34 63-117-160 154 268 33-63 118Zm-22-153Z" />
    </svg>
  );
}

export function VoltixLogo({
  className = "w-8 h-8",
  symbolClassName = "w-4 h-4 text-white",
  showWordmark = false,
  wordmarkClassName = "text-base font-bold tracking-tight text-stone-900 dark:text-white",
}: {
  className?: string;
  symbolClassName?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`relative flex items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-1.5 shadow-sm shadow-blue-500/20 ring-1 ring-black/5 dark:ring-white/20 transition-transform duration-200 group-hover:scale-105 ${className}`}
      >
        <div className="absolute inset-0 rounded-xl bg-blue-400/20 blur-xs" />
        <VoltixSymbol className={`relative z-10 ${symbolClassName}`} />
      </div>
      {showWordmark && (
        <div className="flex items-center gap-1.5">
          <span className={wordmarkClassName}>
            Volt<span className="text-blue-600 dark:text-cyan-400">ix</span>
          </span>
          <span className="rounded-md bg-blue-500/10 dark:bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-blue-600 dark:text-cyan-400 border border-blue-500/20 dark:border-cyan-500/20">
            AI
          </span>
        </div>
      )}
    </div>
  );
}

export function PrelineLogo({ className = "w-7 h-7 text-blue-600 dark:text-blue-500" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 -960 960 960" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="m280-80 160-300-320-40 480-460h80L520-580l320 40L360-80h-80Zm222-247 161-154-269-34 63-117-160 154 268 33-63 118Zm-22-153Z" />
    </svg>
  );
}

export function OllamaIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 0 0-4 4v1H7a3 3 0 0 0-3 3v8a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-8a3 3 0 0 0-3-3h-1V6a4 4 0 0 0-4-4Z" />
      <path d="M9 13v2" />
      <path d="M15 13v2" />
      <path d="M10 18h4" />
    </svg>
  );
}

export function OpenAIIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.28 11.23a5.55 5.55 0 0 0-.48-4.47 5.7 5.7 0 0 0-3.66-2.73 5.6 5.6 0 0 0-4.66.69 5.6 5.6 0 0 0-4.32-1.95 5.68 5.68 0 0 0-5.38 3.86 5.65 5.65 0 0 0-3.23 2.87 5.6 5.6 0 0 0 .52 5.93 5.56 5.56 0 0 0 .48 4.47 5.7 5.7 0 0 0 3.66 2.73 5.6 5.6 0 0 0 4.66-.69 5.6 5.6 0 0 0 4.32 1.95 5.68 5.68 0 0 0 5.38-3.86 5.65 5.65 0 0 0 3.23-2.87 5.6 5.6 0 0 0-.52-5.93zM12 14.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
    </svg>
  );
}

export function ClaudeIcon({ className = "w-4 h-4 text-amber-600" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 101" fill="currentColor">
      <path d="M96 40L99.5 42L98.5 47L56 57L52 47L96 40Z" fill="#D97757"/>
      <path d="M80 10.6L85 11.6L87.5 17L58.5 58.5L49 49L75.3 14.5L80 10.6Z" fill="#D97757"/>
      <path d="M55.5 4.5L61 3.5L63.5 7L56.7 48.2L52 45L53.5 8.5L55.5 4.5Z" fill="#D97757"/>
      <path d="M23.4 5.2L28.5 0.8L34.5 2.9L48.8 34.7L47.9 53.2L23.4 5.2Z" fill="#D97757"/>
      <path d="M8.5 27L10.5 19.5L15 20L36 35.5L46.5 56L10 29L8.5 27Z" fill="#D97757"/>
      <path d="M2.5 53L0.2 48.3L28 49L53 51L4.5 53.5L2.5 53Z" fill="#D97757"/>
      <path d="M17.5 79L10.5 74L19 68L53.5 46L57 52L17.5 79Z" fill="#D97757"/>
      <path d="M27 93L22 92L52 50.5L56 56L27 93Z" fill="#D97757"/>
      <path d="M52 98L45 99L43.5 96L51 55.5L55.5 56L52 98Z" fill="#D97757"/>
      <path d="M77.5 87L75 93.5L47.5 57.3L57 50L77.5 87Z" fill="#D97757"/>
    </svg>
  );
}

export function GeminiIcon({ className = "w-4 h-4 text-blue-500" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  );
}
