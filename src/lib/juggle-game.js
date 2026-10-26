/* =====================================================================
   JUGGLE GAME — the bounce-the-rings strip under the cover's invitation text
   (mounted from src/routes/index.tsx; styles in src/juggle-game.css).
   Usage (after the envelope opens, on the first slide):
     var game = mount(archEl, {
       below: contentEl,   // the invitation text; the game sits under it
       lang: "en" | "ar",
       delayMs: 900,       // fade in after the text's reveal animation
       minHeight: 140,     // smallest play strip, in px
       growArch: true,     // if the strip doesn't fit, make the arch taller by the difference
       fullTop: 70,        // while playing, the game uses the arch from this point down
       winHoldMs: 1800,    // how long the win message shows before the text returns
       onWin: function (r) {},
       onContinue: function () {}   // REQUIRED for "Continue": go to the next page/slide
     });
     game.setLang("ar"); game.destroy();
   archEl and contentEl must be siblings inside the same positioned parent
   (as on the site today).
   ===================================================================== */

var TEXT = {
  en: { play: "Play", overTitle: "So close!", overSub: "{n} of {goal} bounces", retry: "Try again", cont: "Continue",
        again: "Play again", stage: "Bounce the rings",
        winTitle: "You did it!", winSub: "{goal} bounces and the rings never fell. Steady hands!" },
  ar: { play: "العب", overTitle: "قربت!", overSub: "{n} من {goal} نطّات", retry: "جرب تاني", cont: "كمّل الدعوة",
        again: "العب تاني", stage: "نطّط الدبل",
        winTitle: "برافو عليك!", winSub: "{goal} قفزات متتالية دون أن تسقط الدبلتان" }
};

var ARROW_SVG = '<svg viewBox="0 0 20 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M10 2 V20"/><path d="M3 13 l7 7 7 -7"/></svg>';

/* arrows around the resting ball, all pointing at it */
var ARROWS = [-90, -45, 0, 45, 90].map(function (a) {
  return '<div class="jg-arrow" style="--a:' + a + 'deg">' + ARROW_SVG + '</div>';
}).join("");

var RINGS_SVG = '<svg viewBox="0 0 44 40" fill="none" stroke="#4D1321" stroke-width="3.4" aria-hidden="true">' +
  '<circle cx="16" cy="26" r="10"/><circle cx="28" cy="26" r="10"/><path d="M22 3 l4 4 -4 4 -4 -4 z" stroke-width="2.6"/></svg>';

export function mount(host, opts) {
  opts = opts || {};
  var GOAL = opts.goal || 7;
  var MIN_H = opts.minHeight || 140;
  var GAP = 18;          // space between the text and the game
  var BOTTOM = 14;       // matches .jg { bottom }
  var lang = opts.lang === "ar" ? "ar" : "en";
  var below = opts.below;

  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return { setLang: function () {}, destroy: function () {} };
  }

  /* The arch div is aria-hidden as a whole. Keep its drawings hidden but let the game be reachable. */
  var hostAria = host.getAttribute("aria-hidden");
  var hiddenKids = [];
  if (hostAria !== null) {
    Array.prototype.forEach.call(host.children, function (el) {
      if (!el.hasAttribute("aria-hidden")) { el.setAttribute("aria-hidden", "true"); hiddenKids.push(el); }
    });
    host.removeAttribute("aria-hidden");
  }

  var origHeight = host.style.height;
  var archSvg = host.querySelector("svg[height]");
  var origSvgHeight = archSvg ? archSvg.getAttribute("height") : null;
  var origTransform = host.style.transform;

  var DOTS = new Array(GOAL + 1).join('<i class="jg-dot"></i>');

  var root = document.createElement("div");
  root.className = "jg is-idle";
  root.innerHTML =
    '<div class="jg-play" data-jg="play">' +
      '<div class="jg-floor"></div><div class="jg-shadow" data-jg="shadow"></div>' +
      '<div class="jg-plus" data-jg="plus" aria-hidden="true"><span>+1</span></div>' +
      '<div class="jg-ball" data-jg="ball"><div class="jg-arrows"><div class="jg-cta" data-jg-text="play"></div>' + ARROWS + '</div><div class="jg-ball-inner">' + RINGS_SVG + '</div></div>' +
      '<button class="jg-stage" type="button" data-jg="stage"></button>' +
      '<div class="jg-win" data-jg="win" hidden><div class="jg-win-title" data-jg-text="winTitle"></div>' +
        '<div class="jg-sub" data-jg="winSub"></div>' +
        '<div class="jg-actions"><button class="jg-again" type="button" data-jg="again" data-jg-text="again"></button>' +
        '<button class="jg-again jg-primary" type="button" data-jg="winCont" data-jg-text="cont"></button></div></div>' +
      '<div class="jg-win" data-jg="over" hidden><div class="jg-win-title" data-jg-text="overTitle"></div>' +
        '<div class="jg-sub" data-jg="overSub"></div>' +
        '<div class="jg-actions"><button class="jg-again jg-primary" type="button" data-jg="retry" data-jg-text="retry"></button>' +
        '<button class="jg-again" type="button" data-jg="cont" data-jg-text="cont"></button></div></div>' +
    '</div>' +
    /* bounce counter under the floor line: big number and one dot per bounce, shown while the game fills the arch */
    '<div class="jg-hud" data-jg="hud" aria-hidden="true"><div class="jg-num"><b data-jg="num">0</b><span>/ ' + GOAL + '</span></div>' +
      '<div class="jg-dots">' + DOTS + '</div></div>' +
    '<div class="jg-live" aria-live="polite" data-jg="count"></div>';
  host.appendChild(root);

  var q = function (k) { return root.querySelector('[data-jg="' + k + '"]'); };
  var ballInner = root.querySelector(".jg-ball-inner");
  var play = q("play"), ball = q("ball"), shadow = q("shadow"), stage = q("stage");
  var count = q("count"), win = q("win"), again = q("again");
  var hud = q("hud"), num = q("num"), plus = q("plus"), dots = root.querySelectorAll(".jg-dot");
  var winSub = q("winSub");
  var over = q("over"), overSub = q("overSub"), retryBtn = q("retry"), contBtn = q("cont"), winCont = q("winCont");

  var W = 0, H = 0, R = 20, FLOOR = 0, CEIL = 0, G = 0.4, KICK = -8, MAXVX = 3;
  var s = { x: 0, y: 0, vx: 0, vy: 0, rot: -14, n: 0, mode: "idle" };
  var raf = 0, destroyed = false, winTimer = 0;

  /* ---------- place the strip under the text (transform-independent) ---------- */
  /* Two layouts:
     strip — under the invitation text (resting, after a drop, after a win)
     full  — the whole arch, while the ball is in play and the text is hidden */
  var full = false, curTop = 0;
  var FULL_TOP = opts.fullTop || 70;   // clears the pointed top of the arch

  function stripTop() {
    return below ? (below.offsetTop + below.offsetHeight - host.offsetTop + GAP) : host.offsetHeight * 0.6;
  }
  function place() {
    var oldTop = curTop;
    var top = stripTop();
    var archH = parseFloat(origHeight) || host.offsetHeight;
    if (archH - top - BOTTOM < MIN_H && opts.growArch !== false) {
      var hh = Math.ceil(top + MIN_H + BOTTOM);
      host.style.height = hh + "px";
      if (archSvg) archSvg.setAttribute("height", hh);
    } else {
      host.style.height = origHeight;
      if (archSvg && origSvgHeight !== null) archSvg.setAttribute("height", origSvgHeight);
    }
    curTop = full ? Math.min(FULL_TOP, top) : top;
    root.style.top = curTop + "px";
    root.classList.toggle("is-full", full);
    // the play area's floor never moves, so shift the ball to stay where it is on screen
    if (oldTop) s.y += oldTop - curTop;
    measure();
  }
  function setFull(on) { if (full === on) return; full = on; place(); }

  /* fade the invitation text out / back in */
  var origOpacity = below ? below.style.opacity : "";
  var origTransition = below ? below.style.transition : "";
  function showText(on) {
    if (!below) return;
    below.style.transition = (origTransition ? origTransition + ", " : "") + "opacity 0.45s ease";
    below.style.opacity = on ? origOpacity : "0";
    below.style.pointerEvents = on ? "" : "none";
    if (on) below.removeAttribute("inert"); else below.setAttribute("inert", "");
  }

  function measure() {
    W = play.clientWidth; H = play.clientHeight;
    if (!W || !H) return;
    R = Math.round(Math.max(18, Math.min(36, H * 0.3)));
    FLOOR = H - R - 4;
    CEIL = R + 2;
    // jump peak ≈ 80% of the strip, at any size
    // slow, floaty fall so it's easy to keep up
    G = 0.24 * (H / 200);
    KICK = -Math.sqrt(2 * G * (FLOOR - CEIL) * 0.7);
    MAXVX = Math.max(1.5, W * 0.01);
    ball.style.width = ball.style.height = (R * 2) + "px";
    shadow.style.width = (R * 2.2) + "px";
    if (s.mode === "idle" || !s.x) rest();
    else { s.x = Math.max(R, Math.min(W - R, s.x)); s.y = Math.min(s.y, FLOOR); }
    draw();
  }
  function rest() { s.x = W / 2; s.y = FLOOR; s.vx = 0; s.vy = 0; s.rot = -14; }

  function draw() {
    ball.style.transform = "translate3d(" + (s.x - R) + "px," + (s.y - R) + "px,0) rotate(" + s.rot + "deg)";
    var k = 0.4 + 0.6 * (s.y / FLOOR);
    shadow.style.transform = "translateX(" + (s.x - R * 1.1) + "px) scaleX(" + k + ")";
  }

  /* fireworks on a win: three staggered bursts of sparks, removed when they've faded */
  var fwTimer = 0, fw = null;
  function fireworks() {
    clearFireworks();
    fw = document.createElement("div");
    fw.className = "jg-fw";
    fw.setAttribute("aria-hidden", "true");
    var html = "";
    [[26, 30, 0], [74, 22, 0.35], [50, 46, 0.7]].forEach(function (b, k) {
      html += '<div class="jg-burst" style="left:' + b[0] + '%;top:' + b[1] + '%;--t:' + b[2] + 's">';
      for (var i = 0; i < 14; i++) {
        html += '<i style="--a:' + Math.round(i * 360 / 14 + k * 9) + 'deg;--d:' + (60 + (i % 3) * 20) + 'px;--c:' +
          ["#F6E6BC", "#D6B06A", "#E9B9A4", "#FFFFFF"][(i + k) % 4] + '"></i>';
      }
      html += "</div>";
    });
    fw.innerHTML = html;
    play.appendChild(fw);
    fwTimer = setTimeout(clearFireworks, 2600);
  }
  function clearFireworks() { clearTimeout(fwTimer); if (fw) fw.remove(); fw = null; }

  /* restart a CSS animation on el by toggling cls */
  function replay(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  function showCount(hit) {
    num.textContent = s.n;
    count.textContent = s.n ? s.n + " / " + GOAL : "";
    for (var i = 0; i < dots.length; i++) dots[i].classList.toggle("is-on", i < s.n);
    if (!hit) return;
    replay(hud, "is-pop");
    if (dots[s.n - 1]) replay(dots[s.n - 1], "is-new");
    plus.style.transform = "translate(" + s.x + "px," + (s.y - R) + "px)";
    replay(plus, "is-go");
  }

  /* hold the arch's 3D tilt still only while the ball is moving */
  function setTiltFrozen(on) { if (opts.freezeTilt !== false) host.style.transform = on ? "none" : origTransform; }

  function setMode(m) {
    s.mode = m;
    root.classList.remove("is-idle", "is-playing", "is-lost", "is-won");
    root.classList.add("is-" + m);
    setTiltFrozen(m === "playing");
  }
  function applyLang() {
    var t = TEXT[lang];
    root.querySelectorAll("[data-jg-text]").forEach(function (el) { el.textContent = t[el.getAttribute("data-jg-text")]; });
    root.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    stage.setAttribute("aria-label", t.stage);
    winSub.textContent = t.winSub.replace("{goal}", GOAL);
    overSub.textContent = t.overSub.replace("{n}", s.n).replace("{goal}", GOAL);
    setMode(s.mode);
  }

  /* ---------- loop: only while the ball is in the air ---------- */
  function tick() {
    raf = 0;
    if (s.mode !== "playing") return;
    s.vy += G;
    s.vx += (W / 2 - s.x) * 0.0008;   // gentle pull back toward the middle
    s.vx *= 0.995;
    s.x += s.vx; s.y += s.vy; s.rot += s.vx * 3;
    if (s.x < R) { s.x = R; s.vx = -s.vx * 0.8; }
    if (s.x > W - R) { s.x = W - R; s.vx = -s.vx * 0.8; }
    if (s.y < CEIL) { s.y = CEIL; s.vy = Math.abs(s.vy) * 0.3; }
    if (s.y >= FLOOR) { s.y = FLOOR; s.vx = 0; s.vy = 0; draw(); setMode("lost"); showOver(); return; }
    draw();
    raf = requestAnimationFrame(tick);
  }
  function startLoop() { if (!raf) raf = requestAnimationFrame(tick); }
  function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  function kick(px, py) {
    if (destroyed || s.mode === "won") return;
    if (s.mode === "lost") return;   // use the Try again / Continue buttons
    // only touches on the ball count, with a fingertip's edge of room (a little more while it's falling)
    if (Math.hypot(px - s.x, py - s.y) > R * (s.mode === "playing" ? 1.5 : 1.3)) return;
    s.vx = Math.max(-MAXVX, Math.min(MAXVX, (s.x - px) * 0.06 + (Math.random() - 0.5) * MAXVX * 0.3));
    s.vy = KICK;
    s.n += 1;
    replay(ballInner, "is-hit");
    if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) {} }
    if (s.n >= GOAL) {
      stopLoop(); draw(); showCount(true); setMode("won"); fireworks(); win.hidden = false; winCont.hidden = false;
      // winHoldMs: Infinity keeps the win message (and its buttons) up until the guest picks one
      var hold = opts.winHoldMs == null ? 2500 : opts.winHoldMs;
      if (isFinite(hold)) winTimer = setTimeout(winDone, hold);
      if (typeof opts.onWin === "function") opts.onWin({ bounces: s.n });
      document.dispatchEvent(new CustomEvent("juggle:win"));
      return;
    }
    if (s.mode !== "playing") { setMode("playing"); showText(false); setFull(true); s.vy = KICK; }
    showCount(true); draw(); startLoop();
  }

  function onDown(e) {
    e.preventDefault();
    // Measure the touch against where the ball is drawn on screen right now (after the page's scale, the arch's
    // tilt and the resting bob), then turn the offset into play units, so a hit is exactly where the ball looks.
    var b = ballInner.getBoundingClientRect(), p = play.getBoundingClientRect();
    var k = W / p.width;
    kick(s.x + (e.clientX - (b.left + b.width / 2)) * k, s.y + (e.clientY - (b.top + b.height / 2)) * k);
  }
  function onKey(e) { if (e.detail === 0) kick(s.x, s.y + R * 0.5); }
  function onVis() { if (document.hidden) stopLoop(); else if (s.mode === "playing") startLoop(); }
  function onAgain() { clearFireworks(); win.hidden = true; over.hidden = true; s.n = 0; showCount(false); rest(); draw(); setMode("idle"); stage.focus({ preventScroll: true }); }

  /* after a drop: stay in the game, offer Try again or Continue */
  function showOver() {
    overSub.textContent = TEXT[lang].overSub.replace("{n}", s.n).replace("{goal}", GOAL);
    over.hidden = false;
    retryBtn.focus({ preventScroll: true });
  }
  function onRetry() { onAgain(); }                       // text stays hidden, ball ready in the arch
  /* Continue = go to the next page of the invitation.
     The first page is put back to normal first, so it looks right if the guest scrolls back. */
  function goNext() {
    if (typeof opts.onContinue === "function") opts.onContinue();
    document.dispatchEvent(new CustomEvent("juggle:continue"));
  }
  function onContinue() { onAgain(); showText(true); setFull(false); goNext(); }
  function winDone() { clearTimeout(winTimer); winCont.hidden = true; showText(true); setFull(false); }

  stage.addEventListener("pointerdown", onDown);
  stage.addEventListener("click", onKey);
  again.addEventListener("click", onAgain);
  retryBtn.addEventListener("click", onRetry);
  contBtn.addEventListener("click", onContinue);
  winCont.addEventListener("click", function () { winDone(); goNext(); });
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("resize", place);
  var ro = (window.ResizeObserver && below) ? new ResizeObserver(place) : null;
  if (ro) ro.observe(below);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!destroyed) place(); });

  applyLang();
  place();
  var showTimer = setTimeout(function () { root.classList.add("is-shown"); }, opts.delayMs == null ? 900 : opts.delayMs);

  return {
    setLang: function (l) { lang = l === "ar" ? "ar" : "en"; applyLang(); place(); },
    destroy: function () {
      destroyed = true; stopLoop(); clearFireworks(); clearTimeout(showTimer); clearTimeout(winTimer);
      showText(true); if (below) below.style.transition = origTransition;
      if (ro) ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", place);
      root.remove();
      host.style.height = origHeight; host.style.transform = origTransform;
      if (archSvg && origSvgHeight !== null) archSvg.setAttribute("height", origSvgHeight);
      hiddenKids.forEach(function (el) { el.removeAttribute("aria-hidden"); });
      if (hostAria !== null) host.setAttribute("aria-hidden", hostAria);
    }
  };
}

/* ===================== end of JUGGLE GAME script ===================== */
