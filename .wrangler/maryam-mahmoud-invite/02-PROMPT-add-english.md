# Step 2 — Add English (only after Step 1 is done and reviewed)

```
Add English language support to this wedding invitation site. This is an i18n-only task.

## Hard rules — do NOT break these
- Do NOT change any design: no CSS values, colors, fonts, font sizes, spacing, radii, shadows, gradients, animations, transitions, layout, or component structure.
- Do NOT change, reword, or "fix" any Arabic text. Arabic copy stays byte-for-byte identical.
- Do NOT add, remove, or reorder pages, sections, or features.
- If something can't be done without a visual change, stop and ask me first.

## What to build
1. Extract every user-facing string (visible text, placeholders, aria-labels, alert/error text, button labels, <title>, meta/OG tags, share text, .ics SUMMARY/LOCATION/DESCRIPTION) into one dictionary: { ar: {...}, en: {...} }. Arabic is the default.
2. Wire the EXISTING "عربي / EN" toggle (keep its current look exactly) to switch language instantly, with no reload.
3. On switch, set <html lang> and dir: ar → lang="ar" dir="rtl", en → lang="en" dir="ltr".
4. In LTR, only mirror what is direction-dependent (text alignment, flex row order via dir, directional icons such as the send arrow). Symmetric things (arches, envelope, seal, centered layouts) must not move.
5. Numbers: Arabic-Indic digits (٠١٢٣) in ar, Western digits in en — including the countdown, guest counter, char counter, and week strip.
6. Persist the choice in localStorage, and support ?lang=en in the URL. Never drop the ?to= guest-name param; both must work together (?to=Ahmed&lang=en).
7. The guest name from ?to= is shown as-is in both languages (don't translate or transliterate it).
8. English uses the font families already on the site (Amiri/Cormorant for display, IBM Plex Sans Arabic for body — it includes Latin). Don't add new fonts.

## English copy (use exactly)
- دعوة خاصة لـ → Special invitation for
- دعوة خاصة / من محمود ومريم (envelope, no guest) → A special invitation / from Mahmoud & Maryam
- اضغط على الظرف لفتح الدعوة → Tap the envelope to open your invitation
- دعوة زفاف → Wedding Invitation
- محمود / مريم / محمود ومريم → Mahmoud / Maryam / Mahmoud & Maryam
- السبت · ٥ ديسمبر ٢٠٢٦ → Saturday · December 5, 2026
- بكل الحب، وبمباركة أهلنا، يسعدنا دعوتكم للاحتفال بزفافنا وبداية حياتنا معًا → With love, and with the blessing of our families, we joyfully invite you to celebrate our wedding and the beginning of our life together
- موعد الفرح → The Big Day
- يوم / ساعة / دقيقة / ثانية → Days / Hours / Minutes / Seconds
- أسبوع الفرح → Wedding Week
- أربعاء خميس جمعة سبت أحد اثنين ثلاثاء → Wed Thu Fri Sat Sun Mon Tue
- السبت / ديسمبر ٢٠٢٦ (big date block) → Saturday / December 2026
- أضف للتقويم / اتضاف للتقويم → Add to Calendar / Added to Calendar
- مكان الفرح → The Venue
- وايت بلازا / عسكر جروب → White Plaza / Askar Group
- طريق المشير طنطاوي — مدينة نصر → El-Mosheer Tantawy Rd — Nasr City
- مدينة نصر (map chip) → Nasr City
- الاتجاهات → Directions
- نسخ العنوان / تم النسخ → Copy Address / Copied
- تأكيد الحضور → RSVP
- وجودك هيفرّحنا → Your presence would make our day
- نرجو التأكيد قبل [X] → Kindly reply by [X]
- الاسم → Name
- اكتب اسمك → Your name
- هحضر إن شاء الله → Joyfully attending
- للأسف مش هقدر → Sadly can't make it
- عدد الحضور → Number of guests
- تأكيد → Confirm
- اكتب اسمك الأول → Please enter your name first
- مستنيينك يا {name} → We can't wait to see you, {name}
- شكرًا يا {name} → Thank you, {name}
- اتسجل حضور {n} فرد/أفراد. نشوفك يوم ٥ ديسمبر إن شاء الله → {n} guest(s) confirmed. See you on December 5!
- هتوحشنا، ودعواتك توصلنا من قلبك → We'll miss you — your prayers mean the world to us
- تعديل الرد → Edit Response
- كلمة حلوة للعروسين → A Note for the Couple
- اكتب لهم دعوة من القلب → Write them a wish from the heart
- اسمك → Your name
- تهنئتك → Your wish
- ألف مبروك… (placeholder) → Congratulations…
- Chips: ألف مبروك → Congratulations! · ربنا يتمم بخير → May God bless your union · بالرفاه والبنين → Wishing you a lifetime of happiness
- إرسال التهنئة → Send Wish
- اكتب اسمك وتهنئتك الأول → Please add your name and a wish
- وصلت تهنئتك → Your wish was sent
- شكرًا يا {name}، كلامك هيفرّح محمود ومريم → Thank you, {name} — Mahmoud & Maryam will love it
- اكتب تهنئة تانية → Write Another
- بكل الحب → With love
- بوجودكم تكتمل فرحتنا → Your presence completes our joy
- شارك الدعوة → Share Invitation
- من الأول → Start Over
- ابعت الدعوة لمين؟ → Who's this invitation for?
- لو كتبت اسم، هيظهر على الظرف. ولو سبته فاضي، الدعوة هتتبعت من غير اسم → If you add a name, it appears on the envelope. Leave it empty to send a general invitation
- اسم الضيف (اختياري) → Guest name (optional)
- مثلًا: أحمد → e.g. Ahmed
- إرسال → Send
- نسخ الرابط / اتنسخ → Copy Link / Copied
- تشغيل الموسيقى / إيقاف الموسيقى → Play music / Pause music
- الصفحة التالية → Next page
- إغلاق → Close

## Done when
- Every page works in both languages with zero visual changes in Arabic.
- English has no clipped or overflowing text at 360px and 390px widths. If an English string overflows, tell me instead of changing font sizes.
- Switching languages keeps the current page, the form inputs, and ?to=.
- Show me a list of every file you changed and why.
```
