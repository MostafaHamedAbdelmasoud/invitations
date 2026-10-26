# Step 1 — Build the site from the design

Paste this to Claude Code in this folder. `index.html` opens directly in any browser.

```
index.html in this folder is the finished, working wedding invitation (open it in a browser to see it). Turn it into the production site.

Hard rules:
- Keep the design pixel-identical: colors, fonts, sizes, spacing, shadows, gradients, 3D effects, animations, transitions, icons, copy (Arabic text byte-for-byte). Don't "improve" anything.
- Keep every behavior: envelope opening (the whole envelope is the tap target), swipe/drag/wheel page transitions, countdown, .ics download, copy address, RSVP + wishes flows, share sheet with optional guest name, ?to= guest name (no name shown when it's missing), background effects, celebration bursts, tap-to-petals on empty space, custom cursor (mouse only), hover effects, prefers-reduced-motion.

Conversion:
- It currently runs on inlined React 18 + a small template interpreter (the markup lives in <template id="tpl"> with {{holes}}, <sc-for>, <sc-if>; the logic is `class Component extends DCLogic`). Rewrite it as clean, maintainable code (plain HTML/CSS/JS, or our existing stack if there is one) with identical output. Remove the "start" prop; the guest name comes only from ?to=.
- It currently fits the screen by scaling a fixed 390×844 stage (#stage + the fit() script). Replace that with a real responsive layout per the section below.

Responsive:
- The design is authored at 390×844. Make it fill the real viewport on all phones (360–430px wide, short and tall screens) using 100dvh, respecting safe-area insets, with nothing clipped or overlapping.
- On tablets/desktop, show it centered as the same phone-width layout on the navy background — don't stretch it.
- Test at 360×640, 375×667, 390×844, 430×932, and desktop 1440×900.

Done when: it looks and behaves exactly like the original at 390×844, works at every size above, and you give me a list of anything you couldn't match 1:1 instead of silently changing it.
```
