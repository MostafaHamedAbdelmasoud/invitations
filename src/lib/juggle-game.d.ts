export type JuggleGame = { setLang(lang: "en" | "ar"): void; destroy(): void };

export function mount(
  host: HTMLElement,
  opts?: {
    below?: HTMLElement | null;
    lang?: "en" | "ar";
    goal?: number;
    delayMs?: number;
    minHeight?: number;
    growArch?: boolean;
    fullTop?: number;
    winHoldMs?: number;
    freezeTilt?: boolean;
    onWin?: (r: { bounces: number }) => void;
    onContinue?: () => void;
  },
): JuggleGame;
