import { createFileRoute } from "@tanstack/react-router";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type MouseEvent,
  type WheelEvent,
} from "react";
import { WEDDING, siteUrl, calendarIcs } from "@/lib/wedding";
import { STRINGS, digits, type Language } from "@/lib/invite-i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "خالد وشروق | Khaled & Shorouk — Wedding Invitation" },
      {
        name: "description",
        content:
          "دعوة زفاف خالد وشروق — ٦ ديسمبر ٢٠٢٦، قلعة جرين بلازا. Khaled & Shorouk's wedding, 6 December 2026, Green Plaza Castle.",
      },
      { property: "og:title", content: "زفاف خالد وشروق | Khaled & Shorouk" },
      {
        property: "og:description",
        content:
          "شاركونا فرحتنا يوم ٦ ديسمبر ٢٠٢٦ — Join us on 6 December 2026 at Green Plaza Castle.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const musicSrc = `${import.meta.env.BASE_URL}wedding-song.mp3`;

/* ---- Stage sizing (see "Responsive stage" in styles.css) ---- */
const DESIGN_W = 390;
const DESIGN_H = 844;
/** Least design height that must fit on screen; the frame's top and bottom margins absorb the rest of 844. */
const FIT_H = 780;
/** Widest the screens' content grows on very wide screens, in design px. */
const MAX_FRAME_W = 960;
type Stage = { s: number; w: number; h: number; left: number };
const DEFAULT_STAGE: Stage = { s: 1, w: DESIGN_W, h: DESIGN_H, left: 0 };
function measureStage(): Stage {
  const vw = window.innerWidth,
    vh = window.innerHeight;
  const s = Math.min(vw / DESIGN_W, vh / FIT_H);
  return { s, w: vw / s, h: vh / s, left: 0 };
}

/* ---- Deterministic decoration (same seeds as the design) ---- */
const rnd = (i: number, k: number) => {
  const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
};
const fx = (n: number) => Number(n.toFixed(2));
const STARS = Array.from({ length: 28 }, (_, i) => ({
  x: fx(rnd(i, 1) * 386),
  y: fx(20 + rnd(i, 2) * 720),
  s: fx(1.2 + rnd(i, 3) * 2),
  d: fx(2.4 + rnd(i, 4) * 3),
  dl: fx(-rnd(i, 5) * 5),
}));
const BOKEH = Array.from({ length: 9 }, (_, i) => ({
  x: fx(rnd(i, 6) * 350),
  s: fx(14 + rnd(i, 7) * 42),
  d: fx(16 + rnd(i, 8) * 14),
  dl: fx(-rnd(i, 9) * 22),
}));
const DUST = Array.from({ length: 10 }, (_, i) => ({
  x: fx(rnd(i, 10) * 380),
  s: fx(2.5 + rnd(i, 11) * 3),
  d: fx(20 + rnd(i, 12) * 12),
  dl: fx(-rnd(i, 13) * 22),
}));
const SPARK_C = ["#F6E6BC", "#D6B06A", "#FFFFFF"];
const SPARKS = Array.from({ length: 18 }, (_, i) => {
  const sz = fx(4 + rnd(i, 14) * 5);
  return {
    a: fx(i * 20 + rnd(i, 15) * 12),
    k: fx(0.6 + rnd(i, 16) * 0.7),
    s: sz,
    m: fx(-sz / 2),
    r: i % 3 === 0 ? "1px" : "50%",
    c: SPARK_C[i % 3],
    dl: fx(rnd(i, 17) * 0.15),
  };
});
const CONF_C = ["#D6B06A", "#F3E0B0", "#F6F1E6", "#B08A45", "#C46F84"];
const CONFETTI = Array.from({ length: 30 }, (_, i) => ({
  x: fx(rnd(i, 18) * 380),
  w: fx(6 + rnd(i, 19) * 6),
  h: fx(8 + rnd(i, 20) * 8),
  c: CONF_C[i % 5],
  d: fx(2.6 + rnd(i, 21) * 1.8),
  dl: fx(rnd(i, 22) * 0.9),
}));
const HEART_C = ["#D6B06A", "#4D1422", "#C49A52", "#E3C27E"];
const HEARTS = Array.from({ length: 12 }, (_, i) => ({
  x: fx(110 + rnd(i, 23) * 160),
  s: Math.round(12 + rnd(i, 24) * 14),
  c: HEART_C[i % 4],
  d: fx(2.2 + rnd(i, 25) * 1.4),
  dl: fx(rnd(i, 26) * 1.2),
}));
const PETAL_C = ["#D6B06A", "#F3E0B0", "#C49A52"];
const PETALS = Array.from({ length: 10 }, (_, i) => ({
  x: fx(rnd(i, 27) * 255),
  s: Math.round(6 + rnd(i, 28) * 6),
  c: PETAL_C[i % 3],
  d: fx(6 + rnd(i, 29) * 4),
  dl: fx(-rnd(i, 30) * 8),
}));
/** Six reusable bursts of rose petals for tap-on-empty-space; each tap restarts the next one. */
const SLOTS = [0, 1, 2, 3, 4, 5].map((n) =>
  Array.from({ length: 10 }, (_, i) => {
    const j = n * 13 + i + 7,
      k = fx(0.6 + rnd(j, 31) * 0.7),
      sz = Math.round(10 + rnd(j, 32) * 8);
    return {
      sx: fx((i % 2 === 0 ? 1 : -1) * k),
      k,
      xc: i % 3 === 0 ? "pX2" : "pX",
      d: fx(1.5 + rnd(j, 33) * 0.8),
      dl: fx(rnd(j, 34) * 0.1),
      s: sz,
      m: fx(-sz / 2),
      c: ["#D6B06A", "#F3E0B0", "#E9B9A4", "#C49A52", "#F6E6BC"][(i + n) % 5],
    };
  }),
);

const HEART_PATH =
  "M12 21s-7.5-4.6-9.5-9.2C1 8.4 3.3 5 6.7 5c2 0 3.6 1.1 4.3 2.6h2C13.7 6.1 15.3 5 17.3 5 20.7 5 23 8.4 21.5 11.8 19.5 16.4 12 21 12 21z";
const ARCH_PATH =
  "M0 490 L0 190 C0 96 78 40 159 4 C240 40 318 96 318 190 L318 490 Q318 500 308 500 L10 500 Q0 500 0 490 Z";
const GOLD_BTN = {
  bg: "linear-gradient(180deg, #F6E3B0 0%, #D9B36C 45%, #C49A52 100%)",
  sh: "inset 0 1px 0 rgba(255,255,255,0.7), 0 4px 0 #8E6A2E, 0 12px 18px -6px rgba(0,0,0,0.6)",
};
const NAVY_BTN = {
  bg: "linear-gradient(180deg, #7A2439 0%, #521423 100%)",
  sh: "inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 0 #22070E, 0 12px 18px -6px rgba(0,0,0,0.5)",
};

const fill: CSSProperties = {
  position: "absolute",
  inset: 0,
  overflow: "hidden",
  pointerEvents: "none",
};
const column = (top: number, side: number): CSSProperties => ({
  position: "absolute",
  top,
  left: side,
  right: side,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
});
/** 0…1 progress of `p` through the stretch a…b, and a gentle ease-in-out curve. */
const seg = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));
const sine = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;
/** From a resting value `base` to 1 as `t` goes 0…1. */
const openFrom = (base: number, t: number) => base + (1 - base) * t;
/**
 * The first screen is split in two: the special invitation on the left half, the door on the right half. Scrolling
 * glides the door to the centre while it grows to fill the screen, and only then do you walk through it.
 * `box` is the door centred at full size (all the height under the top bar, up to 86% of the width; the example's
 * tall 1 : 1.72 shape, a little broader, 1 : 1.5, on landscape screens). `split` is how far it starts from there:
 * moved (dx, dy) to the middle of the right half and scaled by k to fit inside it.
 */
function doorLayout(w: number, h: number) {
  const ratio = w > h ? 1.5 : 1.72;
  const arch = 0.104; // the stone arch's outer line rises this much of the door's width above it
  const top = 96; // under the top bar
  const room = h - top - 40;
  const dw = Math.min(w * 0.86, room / (ratio + arch));
  const dh = dw * ratio;
  const box = {
    left: (w - dw) / 2,
    top: top + dw * arch + (room - dh - dw * arch) / 2,
    width: dw,
    height: dh,
  };
  // the invitation takes the left part (42% of a phone, half of anything wider) and the door the rest: centred in
  // it, with a small margin, and never bigger than it will end up
  const textW = w < 560 ? w * 0.42 : w / 2;
  const doorW = w - textW;
  const k = Math.min(1, (doorW * 0.96) / (dw * 1.21), (room * 0.96) / (dh + dw * arch));
  const split = { dx: textW + doorW / 2 - w / 2, dy: 0, k };
  // how far the leaves stand open at rest (0…1 of a full swing, 104°) for an ~8px gap at the seam, whatever size
  // the door is shown at: each leaf's inner edge moves in by half the width × (1 − cos of its angle)
  const angle = Math.acos(Math.max(0, 1 - 8 / (dw * k)));
  const crack = Math.min(0.22, (angle * 180) / Math.PI / 104);
  return { box, split, crack, textW };
}
const navyBg = (y: number) =>
  `radial-gradient(120% 75% at 50% ${y}%, #681E30 0%, #4D1422 45%, #300A13 100%)`;
const CREAM_BG = "radial-gradient(110% 70% at 50% 35%, #FBF8F1 0%, #F6F1E6 60%, #EFE7D6 100%)";
const AMIRI = "'Amiri', serif";
const CORMORANT = "'Cormorant Garamond', Georgia, serif";

/** Night sky: twinkling stars, rising light orbs and an occasional meteor, stretched over the whole screen. */
function NightSky({ w, h, meteorDelay }: { w: number; h: number; meteorDelay?: string | null }) {
  return (
    <div className="fx" aria-hidden="true" style={fill}>
      {STARS.map((st, i) => (
        <div
          key={i}
          className="star"
          style={{
            left: (st.x * w) / DESIGN_W,
            top: (st.y * h) / DESIGN_H,
            width: st.s,
            height: st.s,
            animationDuration: `${st.d}s`,
            animationDelay: `${st.dl}s`,
          }}
        />
      ))}
      {BOKEH.map((b, i) => (
        <div
          key={i}
          className="orb"
          style={{
            left: (b.x * w) / DESIGN_W,
            width: b.s,
            height: b.s,
            animationDuration: `${b.d}s`,
            animationDelay: `${b.dl}s`,
          }}
        />
      ))}
      {meteorDelay !== null && (
        <div className="meteor" style={{ left: w - 50, animationDelay: meteorDelay }} />
      )}
    </div>
  );
}
function GoldDust({ w }: { w: number }) {
  return (
    <div className="fx" aria-hidden="true" style={fill}>
      {DUST.map((b, i) => (
        <div
          key={i}
          className="dust"
          style={{
            left: (b.x * w) / DESIGN_W,
            width: b.s,
            height: b.s,
            animationDuration: `${b.d}s`,
            animationDelay: `${b.dl}s`,
          }}
        />
      ))}
    </div>
  );
}
function Sparkle({ size, style }: { size: number; style: CSSProperties }) {
  return (
    <svg
      aria-hidden="true"
      className="tw"
      width={size}
      height={size}
      viewBox="0 0 18 18"
      style={{ position: "absolute", ...style }}
    >
      <path d="M9 0 L11 7 L18 9 L11 11 L9 18 L7 11 L0 9 L7 7 Z" fill="#D6B06A" />
    </svg>
  );
}
/** Ring flash with gold sparks shooting outwards, centred on (0, 0) of its parent. */
function SparkBurst() {
  return (
    <>
      <div
        className="ringflash"
        style={{
          position: "absolute",
          left: -40,
          top: -40,
          width: 80,
          height: 80,
          borderRadius: "50%",
          border: "2px solid #F3E0B0",
        }}
      />
      {SPARKS.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transform: `rotate(${p.a}deg) scale(${p.k})`,
          }}
        >
          <div
            className="shoot"
            style={{
              width: p.s,
              height: p.s,
              marginLeft: p.m,
              marginTop: p.m,
              borderRadius: p.r,
              background: p.c,
              animationDelay: `${p.dl}s`,
            }}
          />
        </div>
      ))}
    </>
  );
}
function Divider({
  line,
  diamond,
  className,
  marginTop,
}: {
  line: number;
  diamond: number;
  className: string;
  marginTop: number;
}) {
  return (
    <div
      className={className}
      aria-hidden="true"
      style={{ marginTop, display: "flex", alignItems: "center", gap: 10 }}
    >
      <div
        style={{
          width: line,
          height: 1,
          background: "linear-gradient(90deg, rgba(214,176,106,0), #D6B06A)",
        }}
      />
      <div
        style={{
          width: diamond,
          height: diamond,
          background: "#D6B06A",
          transform: "rotate(45deg)",
        }}
      />
      <div
        style={{
          width: line,
          height: 1,
          background: "linear-gradient(270deg, rgba(214,176,106,0), #D6B06A)",
        }}
      />
    </div>
  );
}
function DateRule({ text }: { text: string }) {
  const rule = <div style={{ width: "100%", height: 1, background: "rgba(122,92,36,0.45)" }} />;
  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 84 }}
    >
      {rule}
      <div style={{ fontSize: 15, color: "#5C333D" }}>{text}</div>
      {rule}
    </div>
  );
}
const RingsIcon = ({ size, stroke, width }: { size: number; stroke: string; width: number }) => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke}
    strokeWidth={width}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="9" cy="14.5" r="5.5" />
    <circle cx="15" cy="14.5" r="5.5" />
    <path d="M12 3l2 2.5-2 2.3-2-2.3z" />
  </svg>
);
const ShareIcon = ({ stroke }: { stroke: string }) => (
  <svg
    aria-hidden="true"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3v13M7 8l5-5 5 5" />
    <path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
  </svg>
);

/**
 * useState that is remembered in this browser (localStorage), so a guest's RSVP and wish survive a refresh or a
 * later visit. The saved value is read after mount so the prerendered HTML and the first render still match.
 */
function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = useState(initial);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(key);
      if (saved !== null) setValue(JSON.parse(saved) as T);
    } catch {
      /* storage blocked or unreadable: keep the default */
    }
    setLoaded(true);
  }, [key]);
  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or blocked */
    }
  }, [key, loaded, value]);
  return [value, setValue] as const;
}

/**
 * RSVPs and wishes are emailed by api/send-mail.php, hosted separately from this static site. Its full https URL is
 * set at build time with VITE_MAIL_ENDPOINT; in `npm run dev` the default "/send-mail.php" goes to the local PHP helper.
 */
const MAIL_ENDPOINT = import.meta.env.VITE_MAIL_ENDPOINT || "/send-mail.php";
// The mail server and account that send this invitation's emails, encrypted at build time (see EMAIL.md).
const MAIL_CREDENTIALS = import.meta.env.VITE_MAIL_CREDENTIALS || "";
type SendStatus = "idle" | "sending" | "error" | "rate";
// When the page was opened. Bots post instantly; a guest always takes at least a moment, so the script uses this to
// tell them apart (an autofill-proof replacement for a hidden "trap" field, which form-filler extensions fill in).
const OPENED_AT = Date.now();
// Which email template the script uses for this invitation (a folder in api/templates/; public, not a secret).
const MAIL_TEMPLATE = import.meta.env.VITE_MAIL_TEMPLATE || "";
// How long to wait for the email API before giving up (the button unlocks and shows the error).
const SEND_TIMEOUT_MS = 20000;
async function sendMail(payload: Record<string, string>): Promise<"ok" | "error" | "rate"> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), SEND_TIMEOUT_MS);
  try {
    const res = await fetch(MAIL_ENDPOINT, {
      method: "POST",
      signal: abort.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        elapsed: String(Date.now() - OPENED_AT),
        ...(MAIL_TEMPLATE && { template: MAIL_TEMPLATE }),
        ...(MAIL_CREDENTIALS && { credentials: MAIL_CREDENTIALS }),
      }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (res.ok && data?.ok) return "ok";
    return data?.error === "rate" ? "rate" : "error";
  } catch {
    return "error";
  } finally {
    clearTimeout(timer);
  }
}

const LANG_KEY = "wedding.lang";
const SCREENS = 7;
/** Screens with a cream background; the top bar and page dots switch to navy on them. */
const LIGHT = new Set([2, 3, 5]);

function Index() {
  const [stage, setStage] = useState<Stage | null>(null);
  const [lang, setLang] = useState<Language>("ar");
  const [guest, setGuest] = useState("");
  const t = STRINGS[lang];
  const ar = lang === "ar";
  const num = (n: number, pad = false) => digits(lang, n, pad);

  // Size the stage, and read ?to= / ?lang= before the stage is first shown, so nothing visibly switches.
  useLayoutEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setGuest((q.get("to") ?? "").trim());
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(LANG_KEY);
    } catch {
      /* storage blocked */
    }
    const wanted = q.get("lang") ?? saved;
    if (wanted === "en" || wanted === "ar") setLang(wanted);
    const fit = () => setStage(measureStage());
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const ready = stage !== null;
  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = lang;
    document.documentElement.dir = ar ? "rtl" : "ltr";
    try {
      window.localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* storage blocked */
    }
    // Keep the address in step (?to= is kept) so a shared or reloaded link opens in the same language.
    const url = new URL(window.location.href);
    if (ar) url.searchParams.delete("lang");
    else url.searchParams.set("lang", lang);
    window.history.replaceState(window.history.state, "", url);
  }, [ready, lang, ar]);
  const { s, w, h, left } = stage ?? DEFAULT_STAGE;
  // Taller than the design: centre the frame. Shorter: the design has ~3× more room below its content than above
  // it (under the top bar), so the frame gives up a quarter of the shortfall at the top and the rest at the bottom.
  const frameTop = h >= DESIGN_H ? (h - DESIGN_H) / 2 : (h - DESIGN_H) / 4;
  // Every screen's content stretches to the screen width, except the envelope, which keeps its 390 artwork.
  const frameW = Math.min(w, MAX_FRAME_W);
  const door = doorLayout(w, h);

  // ---- screens, swipe & pointer effects ----
  const [screen, setScreen] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const archGlare = useRef<SVGRadialGradientElement>(null);
  const tiltFrame = useRef(0);
  /** Pointer tilt for the arches and form cards: CSS variables --tx/--ty (-0.5…0.5), applied on the next frame. */
  const setTilt = (x: number, y: number) => {
    cancelAnimationFrame(tiltFrame.current);
    tiltFrame.current = requestAnimationFrame(() => {
      root.current?.style.setProperty("--tx", x.toFixed(3));
      root.current?.style.setProperty("--ty", y.toFixed(3));
      archGlare.current?.setAttribute("cx", (x + 0.5).toFixed(2));
      archGlare.current?.setAttribute("cy", (y + 0.3).toFixed(2));
    });
  };
  const pointer = useRef({
    down: false,
    startY: 0,
    moved: false,
    drag: 0,
    lastWheel: 0,
    slot: 0,
    envY: null as number | null,
    envFrom: 0,
  });
  const cursor = useRef<HTMLDivElement>(null);
  const slots = useRef<(HTMLDivElement | null)[]>([]);
  const light = LIGHT.has(screen);
  const go = (i: number) => {
    setScreen(Math.max(1, Math.min(SCREENS - 1, i)));
    setDrag(0);
  };

  // ---- music ----
  const audio = useRef<HTMLAudioElement>(null);
  const [music, setMusic] = useState(false);
  // set once the guest or the door asks for music, so the silent unlock below never pauses it
  const musicWanted = useRef(false);
  const playMusic = () => {
    const a = audio.current;
    if (!a) return;
    musicWanted.current = true;
    a.volume = 0.45;
    a.play().catch(() => setMusic(false));
  };
  const toggleMusic = () => {
    if (music) audio.current?.pause();
    else playMusic();
  };

  // Browsers only allow sound after a tap or key press (a mouse wheel doesn't count), so this is tried at the first
  // such gesture on the door, and again as it finishes opening. The music button stays there either way.
  const musicAsked = useRef(false);
  const startMusicOnce = () => {
    const a = audio.current;
    if (musicAsked.current || !a) return;
    musicAsked.current = true;
    musicWanted.current = true;
    a.volume = 0.45;
    a.play().catch(() => {
      musicAsked.current = false;
      setMusic(false);
    });
  };

  // A mouse wheel never counts as permission for sound. So at the guest's first click, tap or key press anywhere,
  // the song is started and paused in the same instant, inside that gesture: nothing is heard, but from then on the
  // browser lets the door start it, however the door is opened. (It must not be muted: Safari allows muted playback
  // anyway, so a muted start wouldn't count as permission.)
  useEffect(() => {
    const unlock = () => {
      const a = audio.current;
      if (!a || musicWanted.current) return;
      a.play().catch(() => {}); // the immediate pause makes this promise reject; that's expected
      a.pause();
    };
    const events = ["pointerdown", "keydown", "touchend"] as const;
    const once = () => {
      unlock();
      for (const ev of events) window.removeEventListener(ev, once, true);
    };
    for (const ev of events) window.addEventListener(ev, once, true);
    return () => {
      for (const ev of events) window.removeEventListener(ev, once, true);
    };
  }, []);

  // ---- the door: opens as you scroll (wheel, trackpad, drag, arrow keys) and closes if you scroll back ----
  // As in example/khaled-shorouk-door.html, one progress value (0 closed … 1 walked through) drives every part of it
  // through CSS variables. Scrolling moves a target; a loop running while the door shows glides the door after it
  // (smoothed and speed-capped, so a hard flick or the auto-finish still sweeps open gently, never jumps).
  // At the end you walk into the light: a glow fills the screen, the cover is put in place under it, and it clears.
  const doorScene = useRef<HTMLDivElement>(null);
  const doorFlash = useRef<HTMLDivElement>(null);
  const [noSlide, setNoSlide] = useState(false);
  const doorState = useRef({
    target: 0,
    shown: 0,
    last: 0,
    snap: undefined as ReturnType<typeof setTimeout> | undefined,
    lastInput: 0, // when the guest last scrolled, dragged or pressed a key (for the teaser)
    teaseAt: 0,
    teased: false,
    hover: false, // a mouse is over the door: it stands a little wider open (eased in hoverAmt)
    hoverAmt: 0,
  });
  // At rest the door stands slightly open, with light showing through (doorLayout sizes it to ~8px at the seam).
  const crack = useRef(0.12);
  crack.current = door.crack;
  const paintDoor = (p: number, tease: number) => {
    const el = doorScene.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const vars = {
      // the door glides from the right half to the centre, growing to full size, as the invitation slides away
      "--center": sine(seg(p, 0, 0.44)),
      "--kick": 1 - sine(seg(p, 0, 0.3)),
      // the leaves swing from their resting crack (wider while the teaser plays); they start once the door is well
      // on its way to the centre, so the two motions overlap into one
      "--open": openFrom(
        crack.current + 0.16 * tease * (1 - seg(p, 0, 0.1)),
        sine(seg(p, 0.22, 0.68)),
      ),
      // light grows behind them: a little already shows through the crack
      "--glow": openFrom(0.3 + 0.25 * tease * (1 - seg(p, 0, 0.1)), sine(seg(p, 0.2, 0.6))),
      "--zoom": reduce ? 0 : sine(seg(p, 0.5, 1)), // we walk through the doorway
      "--fade": seg(p, 0.9, 1),
    };
    for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v.toFixed(4));
    if (doorFlash.current) doorFlash.current.style.opacity = sine(seg(p, 0.74, 0.97)).toFixed(4);
  };
  const tickDoor = (now: number) => {
    const d = doorState.current;
    const dt = Math.min(0.05, (now - (d.last || now)) / 1000);
    d.last = now;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) d.shown = d.target;
    else {
      // ease towards the target (time constant ~0.25s), but never faster than a full opening per ~1.4s; the last
      // stretch (walking into the light) may go faster, so the glow passes quickly instead of hanging
      const want = (d.target - d.shown) * (1 - Math.exp(-dt / 0.25));
      const cap = (0.6 + 1.7 * seg(d.shown, 0.6, 0.9)) * dt;
      d.shown += Math.max(-cap, Math.min(cap, want));
      if (Math.abs(d.target - d.shown) < 0.0004) d.shown = d.target;
      // the last stretch is all glow; don't linger there while the easing creeps up to 1
      if (d.target === 1 && d.shown > 0.96) d.shown = 1;
    }
    // the teaser: after 2.5s with no input the door creaks a little wider and settles back (every 8s while idle),
    // showing that it opens; a tap on the door plays it too (see showDoorTip)
    if (!d.lastInput) d.lastInput = now;
    let tease = 0;
    if (reduce || d.target !== 0 || d.shown !== 0) d.teaseAt = 0;
    else if (!d.teaseAt && now - d.lastInput > (d.teased ? 8000 : 2500)) d.teaseAt = now;
    if (d.teaseAt) {
      const t = (now - d.teaseAt) / 1600;
      if (t >= 1) {
        d.teaseAt = 0;
        d.teased = true;
        d.lastInput = now;
      } else tease = Math.sin(Math.PI * t) ** 2;
    }
    // hovering holds the door a little wider open, easing in and out
    const hoverWant = d.hover && d.target === 0 && !reduce ? 1 : 0;
    d.hoverAmt += (hoverWant - d.hoverAmt) * (1 - Math.exp(-dt / 0.18));
    if (d.hover) d.lastInput = now; // no teaser while the guest is already on the door
    paintDoor(d.shown, Math.max(tease, d.hoverAmt));
    if (d.shown < 1) return false;
    // through the door: jump (not slide) to the cover under the glow, then let the glow clear
    startMusicOnce();
    setNoSlide(true);
    setScreen(1);
    const flash = doorFlash.current;
    if (flash) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          flash.style.transition = "opacity .55s cubic-bezier(.3,0,.2,1)";
          flash.style.opacity = "0";
          setNoSlide(false);
        }),
      );
    }
    return true;
  };
  const tickRef = useRef(tickDoor);
  tickRef.current = tickDoor;
  useEffect(() => {
    if (!ready || screen !== 0) return;
    let raf = 0;
    const loop = (now: number) => {
      if (!tickRef.current(now)) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const d = doorState.current;
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(d.snap);
      d.last = 0;
    };
  }, [ready, screen]);
  // A mouse over the door: the door stands a little wider open and the same instruction shows, while it stays.
  const [doorHover, setDoorHover] = useState(false);
  const setHover = (over: boolean) => {
    if (doorState.current.hover === over) return;
    doorState.current.hover = over;
    setDoorHover(over);
  };
  // A tap on the door (it doesn't open on a tap) dims it a moment and shows how to open it, with the teaser.
  const [doorTip, setDoorTip] = useState(false);
  const doorTipTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const showDoorTip = () => {
    setDoorTip(true);
    clearTimeout(doorTipTimer.current);
    doorTipTimer.current = setTimeout(() => setDoorTip(false), 2600);
    const d = doorState.current;
    if (d.target === 0 && d.shown === 0) d.teaseAt = performance.now();
  };
  useEffect(() => () => clearTimeout(doorTipTimer.current), []);
  /** Moves the door to `target`; with `settle`, a door left more than half open finishes opening a moment later. */
  const moveDoor = (target: number, settle: boolean) => {
    const d = doorState.current;
    if (screenRef.current !== 0 || d.shown >= 1) return;
    d.target = Math.max(0, Math.min(1, target));
    d.lastInput = performance.now();
    // the door is opening: the "swipe up to open" instruction has done its job
    if (d.target > 0) {
      clearTimeout(doorTipTimer.current);
      setDoorTip(false);
      setHover(false);
    }
    clearTimeout(d.snap);
    if (settle) d.snap = setTimeout(() => d.target > 0.5 && moveDoor(1, false), 500);
  };

  // ---- countdown (ticks only while its screen is showing) ----
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    if (screen !== 2) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [screen]);
  let rem = Math.max(
    0,
    Math.floor((WEDDING.date.getTime() - (now ?? WEDDING.date.getTime())) / 1000),
  );
  const dd = Math.floor(rem / 86400);
  rem -= dd * 86400;
  const hh = Math.floor(rem / 3600);
  rem -= hh * 3600;
  const mm = Math.floor(rem / 60);
  const ss = rem - mm * 60;
  const units = [dd, hh, mm, ss].map((v, i) => ({ v: num(v, true), l: t.units[i] }));

  const [added, setAdded] = useState(false);
  // The venue card shows an illustrated map until it's tapped, then the real Google map of the hall.
  const [mapLive, setMapLive] = useState(false);
  const addToCalendar = () => {
    const ics = calendarIcs({
      summary: t.icsSummary,
      location: t.icsLocation,
      reminder: t.icsReminder,
    });
    try {
      const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "khaled-shorouk-wedding.ics";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch {
      /* download blocked */
    }
    setAdded(true);
  };

  // ---- copy feedback (address, share link) ----
  const [copied, setCopied] = useState<"address" | "link" | null>(null);
  const flashCopied = (what: "address" | "link") => {
    setCopied(what);
    setTimeout(() => setCopied((c) => (c === what ? null : c)), 2200);
  };
  const copyText = (text: string) => {
    try {
      void navigator.clipboard?.writeText(text);
    } catch {
      /* clipboard blocked */
    }
  };

  // ---- RSVP ----
  const [rsvp, setRsvp] = useStoredState<{
    name: string | null;
    going: boolean;
    count: number;
    done: boolean;
  }>("wedding.rsvp.v2", { name: null, going: true, count: 1, done: false });
  const [rErr, setRErr] = useState(false);
  const [rStatus, setRStatus] = useState<SendStatus>("idle");
  // held from the first click until the answer arrives, so nothing sends twice (see submitRsvp)
  const rSending = useRef(false);
  const [rCelebrate, setRCelebrate] = useState(false);
  const rName = rsvp.name ?? guest;
  const submitRsvp = async () => {
    const name = rName.trim();
    if (!name) {
      setRErr(true);
      return;
    }
    // a ref, not rStatus: state only changes on the next render, so a fast double click would get past it
    if (rSending.current) return;
    rSending.current = true;
    setRStatus("sending");
    const result = await sendMail({
      type: "rsvp",
      name,
      guests: String(rsvp.count),
      attending: rsvp.going ? "yes" : "no",
    });
    rSending.current = false;
    if (result !== "ok") {
      setRStatus(result);
      return;
    }
    setRStatus("idle");
    setRCelebrate(true);
    setRsvp({ ...rsvp, name, done: true });
  };
  const choice = (on: boolean): CSSProperties => ({
    height: 56,
    borderRadius: 16,
    border: `1.5px solid ${on ? "transparent" : "rgba(214,176,106,0.4)"}`,
    background: on ? GOLD_BTN.bg : NAVY_BTN.bg,
    color: on ? "#300A13" : "#F3E0B0",
    boxShadow: on ? GOLD_BTN.sh : NAVY_BTN.sh,
    fontFamily: "inherit",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all .25s",
  });

  // ---- wishes ----
  const [wish, setWish] = useStoredState<{ name: string | null; msg: string; sent: boolean }>(
    "wedding.wish",
    { name: null, msg: "", sent: false },
  );
  const [wErr, setWErr] = useState(false);
  const [wStatus, setWStatus] = useState<SendStatus>("idle");
  const wSending = useRef(false); // as rSending, for wishes
  const [wCelebrate, setWCelebrate] = useState(false);
  const wName = wish.name ?? guest;
  const sendWish = async () => {
    const name = wName.trim();
    if (!name || !wish.msg.trim()) {
      setWErr(true);
      return;
    }
    if (wSending.current) return;
    wSending.current = true;
    setWStatus("sending");
    const result = await sendMail({ type: "wish", name, text: wish.msg.trim() });
    wSending.current = false;
    if (result !== "ok") {
      setWStatus(result);
      return;
    }
    setWStatus("idle");
    setWCelebrate(true);
    setWish({ ...wish, name, sent: true });
  };
  const sendFailure = (status: SendStatus) =>
    status === "rate" ? t.sendRate : status === "error" ? t.sendError : null;

  // ---- share sheet ----
  const [shareOpen, setShareOpen] = useState(false);
  const [shareName, setShareName] = useState("");
  const sn = shareName.trim();
  // Read after mount: the page is pre-rendered, so the browser's own address is only known on the client.
  const [baseUrl, setBaseUrl] = useState("");
  useEffect(() => setBaseUrl(siteUrl()), []);
  const link = baseUrl + (sn ? "?to=" + encodeURIComponent(sn) : "");
  const sendLink = () => {
    try {
      if (navigator.share) {
        void navigator
          .share({ title: t.shareNativeTitle, text: t.shareText(sn), url: link })
          .catch(() => {});
        return;
      }
    } catch {
      /* share unavailable */
    }
    copyText(link);
    flashCopied("link");
  };

  // ---- pointer, swipe, wheel, keys ----
  const toDesign = (e: { clientX: number; clientY: number; currentTarget: Element }) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * w) / r.width,
      y: ((e.clientY - r.top) * h) / r.height,
      nx: (e.clientX - r.left) / r.width - 0.5,
      ny: (e.clientY - r.top) / r.height - 0.5,
    };
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const p = pointer.current;
    p.moved = false;
    cursor.current?.classList.add("press");
    // On the door, dragging up opens it and dragging down closes it, like scrolling (see onPointerMove).
    p.envY = screen === 0 ? e.clientY : null;
    p.envFrom = doorState.current.target;
    if (screen === 0 || shareOpen) return;
    if (e.target instanceof Element && e.target.closest("input,textarea")) return;
    p.startY = e.clientY;
    p.down = true;
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const p = pointer.current;
    const { x, y, nx, ny } = toDesign(e);
    if (
      screen === 0 &&
      e.pointerType === "mouse" &&
      p.envY === null &&
      doorState.current.target === 0
    ) {
      const r = document.querySelector(".door")?.getBoundingClientRect();
      setHover(
        !!r &&
          e.clientX >= r.left &&
          e.clientX <= r.right &&
          e.clientY >= r.top &&
          e.clientY <= r.bottom,
      );
    }
    if (p.envY !== null) {
      p.moved = Math.abs(p.envY - e.clientY) > 6;
      moveDoor(p.envFrom + (p.envY - e.clientY) / (window.innerHeight * 1.2), false);
    }
    const cur = cursor.current;
    if (cur) {
      cur.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      const target = e.target instanceof Element ? e.target : null;
      cur.classList.toggle("show", e.pointerType === "mouse" && !target?.closest("input,textarea"));
      cur.classList.toggle("hot", !!target?.closest("button,a,label,.tile,.coin,.wk,.mapc"));
    }
    if (!p.down) {
      if (screen <= 1 || screen >= 4) setTilt(nx, ny);
      return;
    }
    let dy = (e.clientY - p.startY) / s;
    if (Math.abs(dy) < 6 && !dragging) return;
    if ((screen === 1 && dy > 0) || (screen === SCREENS - 1 && dy < 0)) dy *= 0.3;
    p.moved = true;
    p.drag = dy;
    setDrag(dy);
    setDragging(true);
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const p = pointer.current;
    cursor.current?.classList.remove("press");
    if (p.envY !== null && Math.abs(p.envY - e.clientY) > 6) {
      startMusicOnce();
      moveDoor(doorState.current.target, true);
    } else if (p.envY !== null && doorState.current.target === 0) {
      // a tap, not a drag: on the door itself, show how to open it
      const r = document.querySelector(".door")?.getBoundingClientRect();
      if (
        r &&
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom
      ) {
        showDoorTip();
      }
    }
    p.envY = null;
    if (!p.down) return;
    p.down = false;
    const d = p.drag;
    p.drag = 0;
    setDragging(false);
    go(screen + (d < -50 ? 1 : d > 50 ? -1 : 0));
  };
  const onPointerLeave = () => {
    setHover(false);
    cursor.current?.classList.remove("show", "hot", "press");
    setTilt(0, 0);
    if (pointer.current.down) {
      pointer.current.down = false;
      pointer.current.drag = 0;
      setDrag(0);
      setDragging(false);
    }
  };
  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (screen === 0) {
      // about two screens of scrolling open it fully (wheel lines and pages turned into pixels)
      const px = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
      moveDoor(doorState.current.target + px / (window.innerHeight * 2), true);
      return;
    }
    if (shareOpen) return;
    const n = Date.now(),
      p = pointer.current;
    if (n - p.lastWheel < 650 || Math.abs(e.deltaY) < 18) return;
    p.lastWheel = n;
    go(screen + (e.deltaY > 0 ? 1 : -1));
  };
  // Tapping empty space releases a burst of rose petals there.
  const onTap = (e: MouseEvent<HTMLDivElement>) => {
    const p = pointer.current;
    if (p.moved) {
      p.moved = false;
      return;
    }
    if (
      shareOpen ||
      (e.target instanceof Element && e.target.closest("button,a,input,textarea,label"))
    )
      return;
    // a tap on the door shows how to open it (see onPointerUp); no petals over that bubble
    if (screen === 0) {
      const r = document.querySelector(".door")?.getBoundingClientRect();
      if (
        r &&
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom
      )
        return;
    }
    const els = slots.current.filter((el): el is HTMLDivElement => !!el);
    if (!els.length) return;
    const { x, y } = toDesign(e);
    p.slot = (p.slot + 1) % els.length;
    const el = els[p.slot];
    if (!el) return;
    const rot = Math.round(Math.random() * 36 - 18),
      flip = Math.random() < 0.5 ? -1 : 1;
    el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${rot}deg) scaleX(${flip})`;
    el.classList.remove("go");
    void el.offsetWidth;
    el.classList.add("go");
  };
  const screenRef = useRef(screen);
  screenRef.current = screen;
  // the arrow keys and space step the door a quarter of the way (kept fresh for the listener below)
  const doorKey = useRef((step: number) => {});
  doorKey.current = (step) => {
    startMusicOnce();
    moveDoor(doorState.current.target + step * 0.25, true);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest("input,textarea,[role=dialog]")) return;
      const d = ({ ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1 } as Record<string, number>)[
        e.key
      ];
      if (screenRef.current === 0) {
        if (!d && e.key !== " ") return;
        e.preventDefault();
        doorKey.current(d ?? 1);
        return;
      }
      if (d) {
        e.preventDefault();
        setScreen((i) => Math.max(1, Math.min(SCREENS - 1, i + d)));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // Nothing in the invitation scrolls (screens move by transform), but the browser still scrolls overflow:hidden
  // boxes to bring a focused field or clicked control into view, which shifts every screen. Undo any such scroll.
  useEffect(() => {
    const onScroll = (e: Event) => {
      const el = e.target;
      if (el === document || el === window) {
        if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
      } else if (
        el instanceof Element &&
        !el.matches("textarea, input") &&
        (el.scrollTop || el.scrollLeft)
      ) {
        el.scrollTop = 0;
        el.scrollLeft = 0;
      }
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", onScroll, { capture: true });
  }, []);

  const tiltT =
    "perspective(900px) rotateX(calc(var(--ty) * -8deg)) rotateY(calc(var(--tx) * 10deg))";
  const formTilt = "rotateX(calc(3deg - var(--ty) * 5deg)) rotateY(calc(var(--tx) * 6deg))";
  const glareAt = "calc((var(--tx) + 0.5) * 100%) calc((var(--ty) + 0.25) * 100%)";
  const bar = {
    border: light ? "rgba(77,20,34,0.2)" : "rgba(214,176,106,0.45)",
    bg: light ? "rgba(255,255,255,0.7)" : "rgba(48,10,19,0.5)",
    fg: light ? "#4D1422" : "#D6B06A",
  };
  const langBtn = (on: boolean) => ({
    background: on ? (light ? "#4D1422" : "#D6B06A") : "transparent",
    color: on ? (light ? "#F6F1E6" : "#300A13") : light ? "#4D1422" : "#D6B06A",
  });
  const section = (i: number, background: string, color?: string) => ({
    className: `scr${screen === i ? " on" : ""}`,
    inert: screen !== i,
    style: {
      position: "relative",
      width: w,
      height: h,
      overflow: "hidden",
      background,
      color,
    } as CSSProperties,
  });
  const safe = (px: number, edge: "top" | "bottom") =>
    `calc(${px}px + env(safe-area-inset-${edge}) / var(--s))`;

  return (
    <div
      className={`stage${ready ? " ready" : ""}`}
      style={
        {
          left,
          width: w,
          height: h,
          transform: `scale(${s})`,
          "--s": s,
          "--frame-top": `${frameTop}px`,
          "--frame-w": `${frameW}px`,
        } as CSSProperties
      }
    >
      <div
        ref={root}
        className="root cc"
        dir={ar ? "rtl" : "ltr"}
        lang={lang}
        onClick={onTap}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
        onWheel={onWheel}
        style={{
          width: w,
          height: h,
          position: "relative",
          overflow: "hidden",
          background: "#300A13",
          color: "#F6F1E6",
          fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        <audio
          ref={audio}
          src={musicSrc}
          loop
          preload="auto"
          onPlay={() => setMusic(true)}
          onPause={() => setMusic(false)}
          onError={() => setMusic(false)}
        />

        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: w,
            transform: `translateY(${-screen * h + drag}px)`,
            transition: dragging || noSlide ? "none" : "transform .6s cubic-bezier(.22,.8,.2,1)",
          }}
        >
          {/* 0 · Door (it replaced the envelope; the old envelope is in backup-2026-10-27/index.tsx) */}
          <section
            {...section(
              0,
              "radial-gradient(120% 75% at 50% 40%, #681E30 0%, #4D1422 45%, #300A13 100%)",
            )}
          >
            <NightSky w={w} h={h} />
            <div className="frame art">
              <Sparkle size={16} style={{ top: 150, left: 40 }} />
              <Sparkle size={11} style={{ top: 560, right: 36, animationDelay: "1.2s" }} />
              <Sparkle size={13} style={{ top: 650, left: 70, animationDelay: "2.4s" }} />
            </div>

            {/* the castle door from example/khaled-shorouk-door.html, sized to the screen (see doorBox); scrolling
                swings it open and walks through into the light. خ is on the right leaf, ش on the left. */}
            <div ref={doorScene} className="door-scene">
              {/* left half: the special invitation */}
              <div className="door-invite" style={{ width: door.textW }}>
                <div style={{ fontSize: w < 560 ? 17 : 20, color: "#E0C9CF" }}>
                  {guest ? t.guestLineFor : t.guestLineGeneral}
                </div>
                <div
                  className="gt"
                  style={{
                    marginTop: 6,
                    fontFamily: AMIRI,
                    fontSize: w < 560 ? 38 : 58,
                    lineHeight: 1.3,
                    fontWeight: 700,
                  }}
                >
                  {guest || t.guestTitleGeneral}
                </div>
                <Divider className="" marginTop={20} line={48} diamond={7} />
              </div>

              {/* near the top, centred: a hand swiping up says "scroll / swipe" without words, in any language */}
              <div className="door-swipe">
                <div className="swipe-hint" aria-hidden="true">
                  <span className="swipe-trail" />
                  <svg
                    className="swipe-hand"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 14a8 8 0 0 1-8 8" />
                    <path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
                    <path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1" />
                    <path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10" />
                    <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
                  </svg>
                </div>
              </div>

              {/* the gold scroll cue, in the middle of the screen (between the two halves), near the bottom */}
              <div className="door-cue">
                <button
                  type="button"
                  className="scroll-cue"
                  aria-label={t.scrollDoor}
                  onClick={() => {
                    startMusicOnce();
                    moveDoor(1, false);
                  }}
                >
                  <svg
                    aria-hidden="true"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path className="cue-a" d="M6 6l6 6 6-6" />
                    <path className="cue-b" d="M6 12l6 6 6-6" />
                  </svg>
                </button>
              </div>

              {(doorTip || doorHover) && (
                <div className="door-tip-fade">
                  <div
                    className={`door-tip${doorTip ? "" : " hold"}`}
                    role="status"
                    style={{
                      left: Math.max(
                        10,
                        Math.min(w - 190, door.box.left + door.box.width / 2 + door.split.dx - 90),
                      ),
                      top: door.box.top + door.box.height / 2 - 34,
                    }}
                  >
                    <svg
                      aria-hidden="true"
                      className="door-tip-arrow"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 19V5M6 11l6-6 6 6" />
                    </svg>
                    {t.doorTip}
                  </div>
                </div>
              )}

              <div
                className={`door${doorTip ? " dim" : ""}`}
                aria-hidden="true"
                style={
                  {
                    ...door.box,
                    "--dw": `${door.box.width}px`,
                    "--dx": door.split.dx,
                    "--dy": door.split.dy,
                    "--k": door.split.k,
                  } as CSSProperties
                }
              >
                <div className="dr-spill" />
                <div className="dr-portal">
                  <div className="dr-inside">
                    <div className="dr-light" />
                    <div className="dr-rays" />
                  </div>
                  {(["left", "right"] as const).map((side) => (
                    <div key={side} className={`dr-leaf ${side}`}>
                      <div className="dr-panel top" />
                      <div className="dr-panel bottom" />
                      <div className="dr-studs" />
                      <div className="dr-medal">
                        <span>{side === "left" ? "ش" : "خ"}</span>
                      </div>
                      <div className="dr-shade" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 1 · Cover */}
          <section {...section(1, navyBg(36))}>
            <NightSky w={w} h={h} meteorDelay="6s" />
            <div className="frame">
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 92,
                  left: 30,
                  right: 30,
                  height: 580,
                  transform: tiltT,
                  transition: "transform .35s ease-out",
                }}
              >
                <svg
                  width="100%"
                  height="580"
                  viewBox="0 0 330 580"
                  preserveAspectRatio="none"
                  style={{ display: "block", overflow: "visible" }}
                >
                  <path
                    d="M4 580 L4 196 C4 100 84 42 165 6 C246 42 326 100 326 196 L326 580"
                    fill="rgba(255,255,255,0.025)"
                    stroke="#D6B06A"
                    strokeOpacity="0.8"
                    strokeWidth="1.2"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d="M15 580 L15 200 C15 110 90 58 165 23 C240 58 315 110 315 200 L315 580"
                    fill="none"
                    stroke="#D6B06A"
                    strokeOpacity="0.35"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d="M30 580 L30 214 C30 128 98 80 165 48 C232 80 300 128 300 214 L300 580"
                    fill="none"
                    stroke="#D6B06A"
                    strokeOpacity="0.15"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                    strokeDasharray="2 6"
                  />
                </svg>
                <svg
                  width="12"
                  height="12"
                  viewBox="159 0 12 12"
                  style={{ position: "absolute", top: 0, left: "calc(50% - 6px)" }}
                >
                  <path d="M165 0 L171 6 L165 12 L159 6 Z" fill="#D6B06A" />
                </svg>
              </div>
              <div style={column(158, 40)}>
                {guest && (
                  <div
                    className="rv"
                    style={{
                      marginBottom: 14,
                      height: 34,
                      padding: "0 16px",
                      borderRadius: 999,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      color: "#E0C9CF",
                      background: "rgba(48,10,19,0.55)",
                      boxShadow: "inset 0 0 0 1px rgba(214,176,106,0.35)",
                    }}
                  >
                    {t.guestLineFor}{" "}
                    <span style={{ color: "#F3E0B0", fontWeight: 600 }}>{guest}</span>
                  </div>
                )}
                <svg
                  aria-hidden="true"
                  className="rv"
                  width="30"
                  height="30"
                  viewBox="0 0 30 30"
                  fill="none"
                  stroke="#D6B06A"
                  strokeWidth="1.2"
                >
                  <rect x="8" y="8" width="14" height="14" />
                  <rect x="8" y="8" width="14" height="14" transform="rotate(45 15 15)" />
                  <circle cx="15" cy="15" r="2.5" fill="#D6B06A" />
                </svg>
                <h1 className="sr-only">{t.couple}</h1>
                <div aria-hidden="true" style={{ display: "contents" }}>
                  <div className="rv t2" style={{ marginTop: 14 }}>
                    <div
                      className="gt gt3d"
                      style={{ fontFamily: AMIRI, fontSize: 40, lineHeight: 1.12, fontWeight: 700 }}
                    >
                      {t.groom}
                    </div>
                  </div>
                  <div
                    className="rv t3"
                    style={{
                      fontFamily: CORMORANT,
                      fontStyle: "italic",
                      fontSize: 28,
                      lineHeight: 1,
                      color: "#D6B06A",
                    }}
                  >
                    &amp;
                  </div>
                  <div className="rv t3">
                    <div
                      className="gt gt3d"
                      style={{ fontFamily: AMIRI, fontSize: 40, lineHeight: 1.18, fontWeight: 700 }}
                    >
                      {t.bride}
                    </div>
                  </div>
                </div>
                <Divider className="rv t4" marginTop={16} line={56} diamond={7} />
                {/* a short blessing where the juggle game used to be */}
                <div
                  className="rv t4"
                  style={{
                    marginTop: 34,
                    maxWidth: 270,
                    fontFamily: AMIRI,
                    fontSize: 22,
                    lineHeight: 1.75,
                    color: "#F3E0B0",
                  }}
                >
                  {t.coverBlessing}
                </div>
                <div
                  className="rv t4"
                  style={{
                    marginTop: 12,
                    maxWidth: 270,
                    fontSize: 15,
                    lineHeight: 1.8,
                    color: "#E0C9CF",
                  }}
                >
                  {t.coverGreeting}
                </div>
              </div>
            </div>
          </section>

          {/* 2 · Date & countdown */}
          <section {...section(2, CREAM_BG, "#4D1422")}>
            <GoldDust w={w} />
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 12,
                border: "1px solid rgba(122,92,36,0.35)",
                borderRadius: 28,
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 18,
                border: "1px solid rgba(122,92,36,0.14)",
                borderRadius: 24,
              }}
            />
            <div className="frame">
              <div style={column(108, 30)}>
                <div className="rv" style={{ fontSize: 15, fontWeight: 500, color: "#7A5C24" }}>
                  {t.bigDay}
                </div>
                <div
                  className="rv t1"
                  style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 18 }}
                >
                  <DateRule text={t.bigDayName} />
                  <div
                    className="emb5"
                    style={{
                      fontFamily: AMIRI,
                      fontSize: 116,
                      lineHeight: 1,
                      fontWeight: 700,
                      color: "#4D1422",
                    }}
                  >
                    {num(6)}
                  </div>
                  <DateRule text={t.bigMonth} />
                </div>
                <div
                  className="rv t2"
                  style={{
                    marginTop: 30,
                    width: "100%",
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  {units.map((u) => (
                    <div key={u.l} className="tile">
                      <div className="num3d" style={{ position: "relative", zIndex: 1 }}>
                        <div
                          className="gt"
                          style={{
                            fontFamily: AMIRI,
                            fontSize: 36,
                            lineHeight: 1.1,
                            fontWeight: 700,
                          }}
                        >
                          {u.v}
                        </div>
                      </div>
                      <div
                        style={{
                          position: "relative",
                          zIndex: 1,
                          fontSize: 13,
                          fontWeight: 500,
                          color: "#EEDDE1",
                        }}
                      >
                        {u.l}
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  className="rv t3 c3d-l"
                  style={{
                    marginTop: 36,
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "18px 12px 16px",
                    borderRadius: 24,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#5C333D" }}>
                    {t.weddingWeek}
                  </div>
                  <div
                    style={{
                      marginTop: 12,
                      display: "grid",
                      gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                      gap: 2,
                    }}
                  >
                    {t.weekdays.map((name, i) => {
                      const on = i === 4; // Wed 2 … Tue 8 December: index 4 is Sunday the 6th
                      return (
                        <div
                          key={name}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div style={{ fontSize: 11, color: "#704A54" }}>{name}</div>
                          <div
                            className="wk"
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontFamily: AMIRI,
                              fontSize: 18,
                              fontWeight: on ? 700 : 400,
                              background: on
                                ? "radial-gradient(circle at 35% 28%, #F8E8BE 0%, #D9B36C 45%, #A97F38 100%)"
                                : "transparent",
                              color: on ? "#300A13" : "#704A54",
                              boxShadow: on
                                ? "inset 0 1px 2px rgba(255,255,255,0.75), inset 0 -2px 3px rgba(0,0,0,0.25), 0 3px 0 #8E6A2E, 0 10px 16px -4px rgba(77,20,34,0.55)"
                                : "none",
                            }}
                          >
                            {num(i + 2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  className="rv t4 btn bnavy"
                  onClick={addToCalendar}
                  style={{ marginTop: 22 }}
                >
                  <svg
                    aria-hidden="true"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#D6B06A"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="5" width="18" height="16" rx="3" />
                    <path d="M3 10h18M8 3v4M16 3v4" />
                    <path
                      d="M12 13.5l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3z"
                      fill="#D6B06A"
                      stroke="none"
                    />
                  </svg>
                  {added ? t.addedCalendar : t.addCalendar}
                </button>
              </div>
            </div>
          </section>

          {/* 3 · Venue */}
          <section {...section(3, CREAM_BG, "#4D1422")}>
            <GoldDust w={w} />
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 12,
                border: "1px solid rgba(122,92,36,0.35)",
                borderRadius: 28,
              }}
            />
            <div className="frame">
              <div style={column(104, 32)}>
                <div className="rv" style={{ fontSize: 15, fontWeight: 500, color: "#7A5C24" }}>
                  {t.venueLabel}
                </div>
                <div
                  className="rv t1 mapc"
                  role={mapLive ? undefined : "button"}
                  tabIndex={mapLive ? undefined : 0}
                  aria-label={mapLive ? undefined : t.showMap}
                  onClick={() => setMapLive(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setMapLive(true);
                  }}
                  style={{
                    marginTop: 18,
                    width: "100%",
                    cursor: mapLive ? undefined : "pointer",
                    height: 250,
                    position: "relative",
                    borderRadius: 28,
                    overflow: "hidden",
                    background: "#4D1422",
                    boxShadow:
                      "0 26px 50px -22px rgba(48,10,19,0.6), 0 0 0 1px rgba(214,176,106,0.55), 0 0 0 6px rgba(214,176,106,0.1)",
                  }}
                >
                  <svg
                    aria-hidden="true"
                    width="100%"
                    height="250"
                    viewBox="0 0 326 250"
                    preserveAspectRatio="none"
                    style={{ position: "absolute", inset: 0, overflow: "visible" }}
                  >
                    <rect width="326" height="250" fill="#4D1422" />
                    <rect x="18" y="18" width="70" height="52" rx="8" fill="#601A2B" />
                    <rect x="104" y="18" width="92" height="52" rx="8" fill="#601A2B" />
                    <rect x="236" y="156" width="72" height="78" rx="8" fill="#601A2B" />
                    <rect x="18" y="166" width="110" height="66" rx="8" fill="#5C1C2C" />
                    <rect x="216" y="18" width="92" height="64" rx="32" fill="#5C1C2C" />
                    <path
                      d="M-10 118 C 80 98, 160 138, 340 108"
                      stroke="#6E2235"
                      strokeWidth="16"
                      vectorEffect="non-scaling-stroke"
                      fill="none"
                    />
                    <path
                      d="M200 -10 L 175 260"
                      stroke="#6E2235"
                      strokeWidth="12"
                      vectorEffect="non-scaling-stroke"
                      fill="none"
                    />
                    <path
                      d="M90 260 L 140 138 L 120 -10"
                      stroke="#6E2235"
                      strokeWidth="8"
                      vectorEffect="non-scaling-stroke"
                      fill="none"
                    />
                    <path
                      className="route"
                      d="M40 222 C 80 196, 120 166, 140 138 S 170 120, 163 110"
                      stroke="#D6B06A"
                      strokeWidth="3"
                      vectorEffect="non-scaling-stroke"
                      fill="none"
                      strokeLinecap="round"
                    />
                    <circle cx="40" cy="222" r="5" fill="#D6B06A" />
                  </svg>
                  <div
                    className="pulse"
                    style={{
                      position: "absolute",
                      left: "calc(50% - 20px)",
                      top: 90,
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: "rgba(214,176,106,0.35)",
                    }}
                  />
                  <div
                    className="pulse p2"
                    style={{
                      position: "absolute",
                      left: "calc(50% - 20px)",
                      top: 90,
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: "rgba(214,176,106,0.35)",
                    }}
                  />
                  <svg
                    className="bob"
                    width="42"
                    height="54"
                    viewBox="0 0 42 54"
                    style={{ position: "absolute", left: "calc(50% - 21px)", top: 52 }}
                  >
                    <path
                      d="M21 52 C 21 52, 40 31, 40 19 A 19 19 0 0 0 2 19 C 2 31, 21 52, 21 52 Z"
                      fill="#D6B06A"
                    />
                    <path d="M16 25 V 18.5 a 5 5 0 0 1 10 0 V 25 Z" fill="#4D1422" />
                  </svg>
                  {t.mapChip && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 14,
                        right: 14,
                        padding: "6px 12px",
                        borderRadius: 999,
                        background: "#F6F1E6",
                        color: "#4D1422",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {t.mapChip}
                    </div>
                  )}
                  {mapLive && (
                    <iframe
                      title={t.mapTitle}
                      src={WEDDING.mapEmbedUrl}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        border: 0,
                      }}
                    />
                  )}
                </div>
                <h2
                  className="rv t2"
                  style={{
                    margin: "28px 0 0",
                    fontFamily: AMIRI,
                    fontSize: 38,
                    lineHeight: 1.2,
                    fontWeight: 700,
                    color: "#4D1422",
                  }}
                >
                  {t.venueName}
                </h2>
                {t.venueSub && (
                  <div
                    className="rv t2"
                    style={{ marginTop: 2, fontFamily: AMIRI, fontSize: 22, color: "#7A5C24" }}
                  >
                    {t.venueSub}
                  </div>
                )}
                {t.venueAddress && (
                  <div className="rv t3" style={{ marginTop: 12, fontSize: 15, color: "#704A54" }}>
                    {t.venueAddress}
                  </div>
                )}
                <div
                  className="rv t4"
                  style={{ marginTop: 24, width: "100%", display: "flex", gap: 10 }}
                >
                  <a
                    href={WEDDING.mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn bnavy"
                    style={{ flex: "1 1 0", padding: 0 }}
                  >
                    <svg
                      aria-hidden="true"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#D6B06A"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 11l18-8-8 18-2-8z" />
                    </svg>
                    {t.directions}
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      copyText(WEDDING.mapUrl);
                      flashCopied("address");
                    }}
                    className="btn bol"
                    style={{ flex: "1 1 0", padding: 0 }}
                  >
                    {copied === "address" ? t.copied : t.copyAddress}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 4 · RSVP */}
          <section {...section(4, navyBg(30))}>
            <NightSky w={w} h={h} meteorDelay={null} />
            {!rsvp.done ? (
              <div className="frame">
                <div style={column(100, 28)}>
                  <div className="rv" style={{ fontSize: 15, fontWeight: 500, color: "#D6B06A" }}>
                    {t.rsvpLabel}
                  </div>
                  <h2
                    className="rv t1 gt"
                    style={{
                      margin: "6px 0 0",
                      fontFamily: AMIRI,
                      fontSize: 36,
                      lineHeight: 1.3,
                      fontWeight: 700,
                    }}
                  >
                    {t.rsvpTitle}
                  </h2>
                  <div
                    className="rv t2"
                    style={{ marginTop: 22, width: "100%", perspective: 1000 }}
                  >
                    <div
                      className="c3d c3d-d"
                      style={{
                        transform: formTilt,
                        padding: "20px 18px 22px",
                        textAlign: "start",
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                      }}
                    >
                      <div
                        className="glare"
                        aria-hidden="true"
                        style={{
                          background: `radial-gradient(circle at ${glareAt}, rgba(255,255,255,0.13), rgba(255,255,255,0) 55%)`,
                        }}
                      />
                      <div
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 40,
                          right: 40,
                          height: 1,
                          background:
                            "linear-gradient(90deg, rgba(246,227,176,0), rgba(246,227,176,0.9), rgba(246,227,176,0))",
                        }}
                      />
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <label
                          htmlFor="r-name"
                          style={{ fontSize: 14, fontWeight: 500, color: "#E8E2D4" }}
                        >
                          {t.name}
                        </label>
                        <input
                          id="r-name"
                          className="fd"
                          type="text"
                          dir="auto"
                          autoComplete="name"
                          maxLength={80}
                          value={rName}
                          onChange={(e) => {
                            setRsvp({ ...rsvp, name: e.target.value });
                            setRErr(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void submitRsvp();
                          }}
                          placeholder={t.namePlaceholder}
                        />
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                          gap: 8,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setRsvp({ ...rsvp, going: true })}
                          aria-pressed={rsvp.going}
                          style={choice(rsvp.going)}
                        >
                          {t.attending}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRsvp({ ...rsvp, going: false })}
                          aria-pressed={!rsvp.going}
                          style={choice(!rsvp.going)}
                        >
                          {t.declining}
                        </button>
                      </div>
                      {rsvp.going && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: 6,
                            borderRadius: 16,
                            background: "#300A13",
                            boxShadow:
                              "inset 0 3px 8px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(214,176,106,0.3), 0 1px 0 rgba(255,255,255,0.06)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 500,
                              color: "#E8E2D4",
                              paddingInlineStart: 10,
                            }}
                          >
                            {t.guests}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button
                              type="button"
                              aria-label={t.increase}
                              onClick={() =>
                                setRsvp({ ...rsvp, count: Math.min(10, rsvp.count + 1) })
                              }
                              className="rz-gold"
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <svg
                                aria-hidden="true"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              >
                                <path d="M12 5v14M5 12h14" />
                              </svg>
                            </button>
                            <div
                              aria-live="polite"
                              style={{
                                minWidth: 34,
                                textAlign: "center",
                                fontFamily: AMIRI,
                                fontSize: 26,
                                fontWeight: 700,
                                color: "#F3E0B0",
                              }}
                            >
                              {num(rsvp.count)}
                            </div>
                            <button
                              type="button"
                              aria-label={t.decrease}
                              onClick={() =>
                                setRsvp({ ...rsvp, count: Math.max(1, rsvp.count - 1) })
                              }
                              className="rz-navy"
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <svg
                                aria-hidden="true"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              >
                                <path d="M5 12h14" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rv t3 btn bgold"
                    onClick={() => void submitRsvp()}
                    disabled={rStatus === "sending"}
                    aria-busy={rStatus === "sending"}
                    style={{ marginTop: 30, width: "100%" }}
                  >
                    {rStatus === "sending" ? (
                      <span className="btn-spin" aria-hidden="true" />
                    ) : (
                      <svg
                        aria-hidden="true"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12l5 5 9-10" />
                      </svg>
                    )}
                    {rStatus === "sending" ? t.sending : t.confirm}
                  </button>
                  {(rErr || sendFailure(rStatus)) && (
                    <div role="alert" style={{ marginTop: 10, fontSize: 13, color: "#F2B8AC" }}>
                      {rErr ? t.nameFirst : sendFailure(rStatus)}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {rCelebrate && (
                  <div aria-hidden="true" style={{ ...fill, zIndex: 3 }}>
                    {CONFETTI.map((c, i) => (
                      <div
                        key={i}
                        className="conf"
                        style={{
                          left: (c.x * w) / DESIGN_W,
                          width: c.w,
                          height: c.h,
                          background: c.c,
                          animationDuration: `${c.d}s`,
                          animationDelay: `${c.dl}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
                <div className="frame">
                  {rCelebrate && (
                    <div
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        left: 195,
                        top: 264,
                        width: 0,
                        height: 0,
                        zIndex: 3,
                        pointerEvents: "none",
                      }}
                    >
                      <SparkBurst />
                    </div>
                  )}
                  <div style={column(210, 32)}>
                    <div
                      style={{
                        width: 108,
                        height: 108,
                        borderRadius: "50%",
                        background: "#300A13",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow:
                          "inset 0 0 0 1.5px #D6B06A, 0 0 0 12px rgba(214,176,106,0.07), 0 0 0 26px rgba(214,176,106,0.035)",
                      }}
                    >
                      <RingsIcon size={50} stroke="#D6B06A" width={1.3} />
                    </div>
                    <h2
                      className="gt"
                      style={{
                        margin: "34px 0 0",
                        fontFamily: AMIRI,
                        fontSize: 34,
                        lineHeight: 1.3,
                        fontWeight: 700,
                      }}
                    >
                      {rsvp.going ? t.doneYes(rName) : t.doneNo(rName)}
                    </h2>
                    <p
                      style={{
                        margin: "10px 0 0",
                        fontSize: 15,
                        lineHeight: 1.9,
                        color: "#E0C9CF",
                        maxWidth: 280,
                      }}
                    >
                      {rsvp.going ? t.doneYesText(rsvp.count) : t.doneNoText}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setRCelebrate(false);
                        setRsvp({ ...rsvp, done: false });
                      }}
                      className="btn bod"
                      style={{ marginTop: 24, height: 48 }}
                    >
                      {t.editResponse}
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* 5 · Wishes */}
          <section {...section(5, CREAM_BG, "#4D1422")}>
            <GoldDust w={w} />
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 12,
                border: "1px solid rgba(122,92,36,0.35)",
                borderRadius: 28,
              }}
            />
            <div className="frame">
              {!wish.sent ? (
                <div style={column(100, 30)}>
                  <div className="rv" style={{ fontSize: 15, fontWeight: 500, color: "#7A5C24" }}>
                    {t.wishLabel}
                  </div>
                  <h2
                    className="rv t1"
                    style={{
                      margin: "6px 0 0",
                      fontFamily: AMIRI,
                      fontSize: 32,
                      lineHeight: 1.35,
                      fontWeight: 700,
                    }}
                  >
                    {t.wishTitle}
                  </h2>
                  <div
                    className="rv t2"
                    style={{ marginTop: 20, width: "100%", perspective: 1000 }}
                  >
                    <div
                      className="c3d c3d-l"
                      style={{
                        transform: formTilt,
                        padding: "20px 18px 22px",
                        textAlign: "start",
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                      }}
                    >
                      <div
                        className="glare"
                        aria-hidden="true"
                        style={{
                          background: `radial-gradient(circle at ${glareAt}, rgba(214,176,106,0.16), rgba(214,176,106,0) 55%)`,
                        }}
                      />
                      <div
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 40,
                          right: 40,
                          height: 2,
                          borderRadius: 2,
                          background:
                            "linear-gradient(90deg, rgba(214,176,106,0), #D6B06A, rgba(214,176,106,0))",
                        }}
                      />
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <label
                          htmlFor="w-name"
                          style={{ fontSize: 14, fontWeight: 500, color: "#4A1F2A" }}
                        >
                          {t.name}
                        </label>
                        <input
                          id="w-name"
                          className="fl"
                          type="text"
                          dir="auto"
                          autoComplete="name"
                          maxLength={80}
                          value={wName}
                          onChange={(e) => {
                            setWish({ ...wish, name: e.target.value });
                            setWErr(false);
                          }}
                          placeholder={t.wishNamePlaceholder}
                        />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "baseline",
                          }}
                        >
                          <label
                            htmlFor="w-msg"
                            style={{ fontSize: 14, fontWeight: 500, color: "#4A1F2A" }}
                          >
                            {t.wishMessage}
                          </label>
                          <div style={{ fontSize: 12, color: "#704A54" }}>
                            {num(wish.msg.length)} / {num(200)}
                          </div>
                        </div>
                        <textarea
                          id="w-msg"
                          className="fl"
                          dir="auto"
                          value={wish.msg}
                          onChange={(e) => {
                            setWish({ ...wish, msg: e.target.value.slice(0, 200) });
                            setWErr(false);
                          }}
                          maxLength={200}
                          placeholder={t.wishPlaceholder}
                        />
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {t.chips.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            className="rz-cream"
                            onClick={() => {
                              setWish({
                                ...wish,
                                msg: ((wish.msg ? wish.msg.trim() + " " : "") + chip).slice(0, 200),
                              });
                              setWErr(false);
                            }}
                            style={{
                              height: 38,
                              padding: "0 14px",
                              borderRadius: 999,
                              fontFamily: "inherit",
                              fontSize: 13,
                              fontWeight: 500,
                              cursor: "pointer",
                            }}
                          >
                            + {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rv t3 btn bnavy"
                    onClick={() => void sendWish()}
                    disabled={wStatus === "sending"}
                    aria-busy={wStatus === "sending"}
                    style={{ marginTop: 30, width: "100%" }}
                  >
                    {wStatus === "sending" ? (
                      <span className="btn-spin" aria-hidden="true" />
                    ) : (
                      <svg
                        aria-hidden="true"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#D6B06A"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ transform: ar ? "scaleX(-1)" : undefined }}
                      >
                        <path d="M22 2L11 13" />
                        <path d="M22 2l-7 20-4-9-9-4z" />
                      </svg>
                    )}
                    {wStatus === "sending" ? t.sending : t.sendWish}
                  </button>
                  {(wErr || sendFailure(wStatus)) && (
                    <div role="alert" style={{ marginTop: 10, fontSize: 13, color: "#9A3B2E" }}>
                      {wErr ? t.wishErr : sendFailure(wStatus)}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {wCelebrate && (
                    <div aria-hidden="true" style={{ ...fill, zIndex: 3 }}>
                      {HEARTS.map((ht, i) => (
                        <svg
                          key={i}
                          className="heart-up"
                          width={ht.s}
                          height={ht.s}
                          viewBox="0 0 24 24"
                          style={{
                            position: "absolute",
                            left: ht.x,
                            top: 250,
                            animationDuration: `${ht.d}s`,
                            animationDelay: `${ht.dl}s`,
                          }}
                        >
                          <path d={HEART_PATH} fill={ht.c} />
                        </svg>
                      ))}
                      <div
                        style={{ position: "absolute", left: 195, top: 252, width: 0, height: 0 }}
                      >
                        <div
                          className="ringflash"
                          style={{
                            position: "absolute",
                            left: -40,
                            top: -40,
                            width: 80,
                            height: 80,
                            borderRadius: "50%",
                            border: "2px solid #D6B06A",
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <div style={column(200, 32)}>
                    <div
                      style={{
                        width: 104,
                        height: 104,
                        borderRadius: "50%",
                        background: "#4D1422",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "inset 0 0 0 1.5px #D6B06A, 0 0 0 12px rgba(77,20,34,0.07)",
                      }}
                    >
                      <svg
                        aria-hidden="true"
                        className="beat"
                        width="44"
                        height="44"
                        viewBox="0 0 24 24"
                        fill="#D6B06A"
                      >
                        <path d={HEART_PATH} />
                      </svg>
                    </div>
                    <h2
                      style={{
                        margin: "30px 0 0",
                        fontFamily: AMIRI,
                        fontSize: 32,
                        lineHeight: 1.3,
                        fontWeight: 700,
                      }}
                    >
                      {t.wishSent}
                    </h2>
                    <p
                      style={{ margin: "8px 0 0", fontSize: 15, lineHeight: 1.9, color: "#704A54" }}
                    >
                      {t.wishThanks(wName)}
                    </p>
                    <blockquote
                      dir="auto"
                      style={{
                        margin: "20px 0 0",
                        padding: "16px 18px",
                        borderRadius: 20,
                        background: "#FFFFFF",
                        boxShadow: "inset 0 0 0 1px rgba(122,92,36,0.25)",
                        fontFamily: AMIRI,
                        fontSize: 18,
                        lineHeight: 1.8,
                        color: "#4D1422",
                        maxWidth: 300,
                      }}
                    >
                      «{wish.msg}»
                    </blockquote>
                    <button
                      type="button"
                      onClick={() => {
                        setWCelebrate(false);
                        setWish({ ...wish, sent: false, msg: "" });
                      }}
                      className="btn bol"
                      style={{ marginTop: 22, height: 48 }}
                    >
                      {t.writeAnother}
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* 6 · Closing */}
          <section {...section(6, navyBg(38))}>
            <NightSky w={w} h={h} meteorDelay="2s" />
            <div className="frame">
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 100,
                  left: 36,
                  right: 36,
                  height: 510,
                  perspective: 1000,
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: 510,
                    transform: tiltT,
                    transition: "transform .35s ease-out",
                    transformStyle: "preserve-3d",
                  }}
                >
                  <div
                    className="sway"
                    style={{ position: "relative", width: "100%", height: 510 }}
                  >
                    <svg
                      width="100%"
                      height="510"
                      viewBox="0 0 318 510"
                      preserveAspectRatio="none"
                      style={{
                        overflow: "visible",
                        filter: "drop-shadow(0 34px 30px rgba(0,0,0,0.6))",
                      }}
                    >
                      <defs>
                        <linearGradient id="archFace" x1="0" y1="0" x2="0.35" y2="1">
                          <stop offset="0" stopColor="#852C42" />
                          <stop offset="0.5" stopColor="#5A1728" />
                          <stop offset="1" stopColor="#360C16" />
                        </linearGradient>
                        <linearGradient id="archRim" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0" stopColor="#F8E8BE" />
                          <stop offset="0.5" stopColor="#C49A52" />
                          <stop offset="1" stopColor="#F3E0B0" />
                        </linearGradient>
                        <radialGradient id="archGlare" ref={archGlare} cx="0.5" cy="0.3" r="0.65">
                          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.2" />
                          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                        </radialGradient>
                      </defs>
                      <path
                        d={ARCH_PATH}
                        transform="translate(0 10)"
                        fill="#1C050B"
                        stroke="#9C7330"
                        strokeWidth="1.2"
                        vectorEffect="non-scaling-stroke"
                      />
                      <path
                        d={ARCH_PATH}
                        fill="url(#archFace)"
                        stroke="url(#archRim)"
                        strokeWidth="1.8"
                        vectorEffect="non-scaling-stroke"
                      />
                      <path
                        d="M13 484 L13 194 C13 106 86 57 159 21 C232 57 305 106 305 194 L305 484 Q305 487 302 487 L16 487 Q13 487 13 484 Z"
                        fill="none"
                        stroke="#D6B06A"
                        strokeOpacity="0.45"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                      />
                      <path d={ARCH_PATH} fill="url(#archGlare)" />
                      <path
                        d="M18 186 C 30 110, 90 60, 159 26"
                        fill="none"
                        stroke="rgba(255,255,255,0.22)"
                        strokeWidth="1.5"
                        vectorEffect="non-scaling-stroke"
                        strokeLinecap="round"
                      />
                    </svg>
                    <svg
                      width="16"
                      height="18"
                      viewBox="151 -5 16 18"
                      style={{ position: "absolute", top: -5, left: "calc(50% - 8px)" }}
                    >
                      <path d="M159 -5 L167 4 L159 13 L151 4 Z" fill="url(#archRim)" />
                    </svg>
                  </div>
                </div>
              </div>
              <div
                className="fx"
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 170,
                  left: 60,
                  right: 60,
                  height: 430,
                  overflow: "hidden",
                }}
              >
                {PETALS.map((pt, i) => (
                  <svg
                    key={i}
                    className="fall"
                    width={pt.s}
                    height={pt.s}
                    viewBox="0 0 10 10"
                    style={{
                      position: "absolute",
                      left: `${(pt.x / 270) * 100}%`,
                      top: 0,
                      animationDuration: `${pt.d}s`,
                      animationDelay: `${pt.dl}s`,
                    }}
                  >
                    <ellipse cx="5" cy="5" rx="5" ry="2.5" fill={pt.c} />
                  </svg>
                ))}
              </div>
              <div style={column(236, 56)}>
                <div className="rv" aria-hidden="true">
                  <div
                    className="beat coin"
                    style={{
                      width: 78,
                      height: 78,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <RingsIcon size={42} stroke="#4D1422" width={1.5} />
                  </div>
                </div>
                <div className="rv t1" style={{ marginTop: 22, fontSize: 16, color: "#D6B06A" }}>
                  {t.withLove}
                </div>
                <div className="rv t2 num3d">
                  <div
                    className="gt"
                    style={{
                      marginTop: 4,
                      fontFamily: AMIRI,
                      fontSize: 48,
                      lineHeight: 1.25,
                      fontWeight: 700,
                    }}
                  >
                    {t.couple}
                  </div>
                </div>
                <Divider className="rv t3" marginTop={14} line={44} diamond={6} />
                <p
                  className="rv t3"
                  style={{ margin: "14px 0 0", fontSize: 16, lineHeight: 1.9, color: "#EEDDE1" }}
                >
                  {t.completes}
                </p>
                <div
                  className="rv t4"
                  style={{
                    marginTop: 4,
                    fontFamily: CORMORANT,
                    fontSize: 22,
                    fontWeight: 500,
                    color: "#F3E0B0",
                  }}
                >
                  06 · 12 · 2026
                </div>
              </div>
              <div
                className="rv t5"
                style={{
                  position: "absolute",
                  top: 640,
                  left: 32,
                  right: 32,
                  display: "flex",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShareName("");
                    setShareOpen(true);
                  }}
                  className="btn bgold"
                  style={{ flex: "1 1 0", padding: 0 }}
                >
                  <ShareIcon stroke="currentColor" />
                  {t.share}
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="btn rz-navy"
                  style={{ flex: "1 1 0", padding: 0 }}
                >
                  {t.startOver}
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* The light you walk into through the door; it fills the screen, then clears over the cover */}
        <div ref={doorFlash} aria-hidden="true" className="door-flash" />

        {/* Rose-petal bursts for taps on empty space */}
        <div aria-hidden="true" style={{ ...fill, zIndex: 25 }}>
          {SLOTS.map((petals, n) => (
            <div
              key={n}
              className="slot"
              ref={(el) => {
                slots.current[n] = el;
              }}
              style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0 }}
            >
              <div
                className="bflash"
                style={{
                  position: "absolute",
                  left: -16,
                  top: -16,
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  boxSizing: "border-box",
                  border: "1.5px solid #E3C27E",
                }}
              />
              {petals.map((p, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    transform: `scale(${p.sx}, ${p.k})`,
                  }}
                >
                  <div
                    className={p.xc}
                    style={{ animationDuration: `${p.d}s`, animationDelay: `${p.dl}s` }}
                  >
                    <div
                      className="pY"
                      style={{ animationDuration: `${p.d}s`, animationDelay: `${p.dl}s` }}
                    >
                      <svg
                        className="pR"
                        width={p.s}
                        height={p.s}
                        viewBox="0 0 20 20"
                        style={{
                          display: "block",
                          marginLeft: p.m,
                          marginTop: p.m,
                          animationDuration: `${p.d}s`,
                          animationDelay: `${p.dl}s`,
                        }}
                      >
                        <path
                          d="M10 1.5 C15.5 5 17.5 11.5 10 18.5 C2.5 11.5 4.5 5 10 1.5 Z"
                          fill={p.c}
                          stroke="rgba(110,78,28,0.35)"
                          strokeWidth="0.6"
                        />
                        <path
                          d="M10 4.5 C11 8 11 12 10 15.5"
                          stroke="rgba(255,255,255,0.5)"
                          strokeWidth="0.8"
                          fill="none"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Share sheet */}
        {shareOpen && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 40,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              className="scrim"
              aria-label={t.close}
              onClick={() => setShareOpen(false)}
              style={{
                position: "absolute",
                inset: 0,
                border: 0,
                padding: 0,
                background: "rgba(28,5,11,0.62)",
                backdropFilter: "blur(6px)",
                cursor: "pointer",
              }}
            />
            <div
              className="sheet c3d c3d-l"
              role="dialog"
              aria-modal="true"
              aria-label={t.share}
              onKeyDown={(e) => {
                if (e.key === "Escape") setShareOpen(false);
              }}
              style={{
                margin: `0 12px ${safe(14, "bottom")}`,
                borderRadius: 30,
                padding: "14px 20px 22px",
                color: "#4D1422",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                textAlign: "start",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  alignSelf: "center",
                  width: 40,
                  height: 5,
                  borderRadius: 3,
                  background: "rgba(77,20,34,0.18)",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  className="coin"
                  aria-hidden="true"
                  style={{
                    width: 52,
                    height: 52,
                    flex: "none",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#4D1422"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 8l9 6 9-6" />
                    <rect x="3" y="5" width="18" height="14" rx="2.5" />
                  </svg>
                </div>
                <div>
                  <div
                    style={{ fontFamily: AMIRI, fontSize: 26, lineHeight: 1.3, fontWeight: 700 }}
                  >
                    {t.shareTitle}
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.7, color: "#704A54" }}>
                    {t.shareHint}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label
                  htmlFor="share-name"
                  style={{ fontSize: 14, fontWeight: 500, color: "#4A1F2A" }}
                >
                  {t.guestName}{" "}
                  <span style={{ fontWeight: 400, color: "#704A54" }}>{t.optional}</span>
                </label>
                <input
                  id="share-name"
                  className="fl"
                  type="text"
                  dir="auto"
                  value={shareName}
                  onChange={(e) => setShareName(e.target.value)}
                  placeholder={t.guestNamePlaceholder}
                />
              </div>
              <div
                style={{
                  height: 44,
                  borderRadius: 14,
                  padding: "0 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#F1EADB",
                  boxShadow: "inset 0 2px 5px rgba(77,20,34,0.12)",
                  direction: "ltr",
                  overflow: "hidden",
                }}
              >
                <svg
                  aria-hidden="true"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#7A5C24"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flex: "none" }}
                >
                  <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
                  <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
                </svg>
                <div
                  style={{
                    fontFamily: "ui-monospace, Menlo, monospace",
                    fontSize: 13,
                    color: "#5C333D",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {(baseUrl ? new URL(baseUrl).host : "") + (sn ? "/?to=" + sn : "")}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={sendLink}
                  className="btn bnavy"
                  style={{ flex: "1 1 0", padding: 0 }}
                >
                  <ShareIcon stroke="#D6B06A" />
                  {t.send}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    copyText(link);
                    flashCopied("link");
                  }}
                  className="btn rz-cream"
                  style={{ flex: "1 1 0", padding: 0 }}
                >
                  {copied === "link" ? t.linkCopied : t.copyLink}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Top bar: music + language. Kept right-to-left in both languages so the toggle never moves under a finger. */}
        <div
          dir="rtl"
          style={{
            position: "absolute",
            top: safe(22, "top"),
            left: 22,
            right: 22,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 20,
          }}
        >
          <button
            type="button"
            aria-label={music ? t.pauseMusic : t.playMusic}
            aria-pressed={music}
            onClick={toggleMusic}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: `1px solid ${bar.border}`,
              background: bar.bg,
              color: bar.fg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              cursor: "pointer",
              padding: 0,
              backdropFilter: "blur(10px)",
              transition: "all .4s",
            }}
          >
            {music ? (
              <>
                <span className="eq" />
                <span className="eq" style={{ animationDelay: ".2s" }} />
                <span className="eq" style={{ animationDelay: ".4s" }} />
                <span className="eq" style={{ animationDelay: ".1s" }} />
              </>
            ) : (
              <svg
                aria-hidden="true"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18V6l11-2v12" />
                <circle cx="6.5" cy="18" r="2.5" />
                <circle cx="17.5" cy="16" r="2.5" />
              </svg>
            )}
          </button>
          <div
            style={{
              display: "flex",
              padding: 3,
              gap: 2,
              borderRadius: 999,
              border: `1px solid ${bar.border}`,
              background: bar.bg,
              backdropFilter: "blur(10px)",
              transition: "all .4s",
            }}
          >
            <button
              type="button"
              lang="ar"
              aria-pressed={ar}
              onClick={() => setLang("ar")}
              style={{
                minWidth: 54,
                height: 38,
                border: 0,
                borderRadius: 999,
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                ...langBtn(ar),
                transition: "all .3s",
              }}
            >
              عربي
            </button>
            <button
              type="button"
              lang="en"
              aria-pressed={!ar}
              onClick={() => setLang("en")}
              style={{
                minWidth: 48,
                height: 38,
                border: 0,
                borderRadius: 999,
                fontFamily: CORMORANT,
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
                ...langBtn(!ar),
                transition: "all .3s",
              }}
            >
              EN
            </button>
          </div>
        </div>

        {screen > 0 && (
          <>
            {screen < SCREENS - 1 && (
              <button
                type="button"
                aria-label={t.nextPage}
                onClick={() => go(screen + 1)}
                className="bob"
                style={{
                  position: "absolute",
                  bottom: safe(60, "bottom"),
                  left: "calc(50% - 22px)",
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  border: `1px solid ${bar.border}`,
                  background: bar.bg,
                  color: bar.fg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: 0,
                  zIndex: 20,
                  backdropFilter: "blur(10px)",
                }}
              >
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            )}
            <div
              style={{
                position: "absolute",
                bottom: safe(22, "bottom"),
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                zIndex: 20,
              }}
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={t.page(i)}
                  aria-current={i === screen ? "page" : undefined}
                  onClick={() => go(i)}
                  style={{
                    height: 28,
                    padding: "0 3px",
                    border: 0,
                    background: "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      height: 6,
                      width: i === screen ? 22 : 6,
                      borderRadius: 3,
                      background:
                        i === screen
                          ? light
                            ? "#4D1422"
                            : "#D6B06A"
                          : light
                            ? "rgba(77,20,34,0.25)"
                            : "rgba(214,176,106,0.35)",
                      transition: "all .4s",
                    }}
                  />
                </button>
              ))}
            </div>
          </>
        )}

        <div className="cur" ref={cursor} aria-hidden="true">
          <div className="dot" />
        </div>
      </div>
    </div>
  );
}
