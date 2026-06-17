# Zega Digital ዜጋ ዲጂታል — WhatsApp Bot

A menu-driven WhatsApp bot that teaches digital-literacy skills to Ethiopians,
built from the **My Digital World (MDW)** content. It runs on the official
**Meta WhatsApp Cloud API** and ships with a local simulator so you can test the
entire experience without any credentials.

> Content source: `Zega Digital - MDW Adopted WA Content.docx` (adapted from
> Meta's *My Digital World*). The bot is non-partisan and does not store users'
> personal conversations.

---

## What it does

```
Entry (Ad / "Hi") → Language → Track (Youth / Adult) → Module → Lesson → Quiz → Badge
```

- **Onboarding** with language selection (English · Amharic · Afaan Oromo)
- **Youth track** (ages 13–17): Digital Foundations, Wellness, Engagement,
  Opportunities, Online Safety & Well-Being, AI Literacy
- **Adult track** (18+): Media Literacy, Privacy, Online Security, Youth Online
  Safety, AI Literacy
- **Lessons** delivered one message bubble at a time (reply `NEXT` to advance)
- **Quizzes**: 15 questions per track with instant feedback and a score badge
- **Glossary** (18 terms), **Help & Resources**, **About**, **Exit**
- **Global commands** everywhere: `MENU`, `STOP`, `HELP`, `0` (back)

---

## Gamified habit loop (proactive, not passive)

The bot is built as a daily **habit loop** rather than a passive menu, to drive
completion and retention:

- A `Today's mission` home screen pushes the next lesson — one tap to start.
- `XP` for every action; an identity `level` ladder (Curious → Aware → Skilled
  → Guardian → Digital Citizen).
- Daily `streaks` with a one-day "freeze" so a single miss doesn't reset you.
- `Badges` (First Steps, module masters, streak milestones, Quiz Ace, Perfect
  Score, track champion) with instant celebration messages.
- A post-lesson `knowledge check` (formative evaluation) worth bonus XP.
- A `My progress` view with a per-module progress bar and earned badges.
- Context-aware quick-reply `actions` so users tap instead of typing numbers.

State is durable (SQLite via the built-in `node:sqlite`, no native deps), so XP,
streaks and badges persist across sessions and restarts.

### Proactive reminders (the bot reaches out)

The loop is closed by a scheduler that re-engages idle users:

- Users **opt in** with `REMIND ON` (or `REMIND 19` for a 7pm reminder); they're
  prompted once after their first lesson. `REMIND OFF` / `STOP` opt out.
- `npm run scheduler` runs a sweep that finds opted-in users who haven't engaged
  today and whose reminder time has passed, then sends a **template message**
  with a "▶️ Continue learning" quick-reply button (daily / streak-saver /
  re-engagement variants depending on the user's state).
- Tapping the button re-opens WhatsApp's 24-hour window (payload `CONTINUE`) and
  the bot resumes the mission — turning a one-time learner into a daily habit.

Without WhatsApp credentials the scheduler runs in **DRY-RUN** (logs what it
would send), and the web tester's **🔔 Nudge** button previews the exact message
+ button. Template definitions to register in Meta are in
[`docs/whatsapp-templates.md`](docs/whatsapp-templates.md).

### Evaluation & analytics

The bot measures learning, not just usage:

- **Baseline → endline assessment:** a 5-question diagnostic offered after track
  selection (baseline) and again when the track is finished (endline, also via
  `FINAL`). The same items both times, so we report each learner's **learning
  gain** (endline % − baseline %) — the headline impact metric.
- **Knowledge-check mastery:** every post-lesson check result is stored, giving a
  module/lesson **accuracy** signal.
- **KPI dashboard:** `npm run tester` then open
  `http://localhost:3100/dashboard.html` — reach, an engagement funnel
  (joined → picked track → ≥1 lesson → completed track), learning gain, quiz
  pass rate, check accuracy, streak distribution, learners-by-level and a daily
  active-users sparkline. Raw JSON at `/api/metrics`.
- **CLI:** `npm run metrics` prints the same summary in the terminal.

All metrics are computed from an append-only `events` log plus the `assessments`
and `check_results` tables, so they're reproducible and exportable.

### Message format (taps, cards, images)

To keep messages light and app-like rather than emoji-heavy text walls, the
engine emits **rich bubbles** and **quick-reply actions**:

- Each outgoing bubble is `{ text, image? }` — lessons can be **one idea per
  card** with an **illustration header** (see the Youth → Digital Foundations
  module, reformatted as the reference pattern; assets in `public/img/`).
- Every turn returns `actions` (tappable choices) and an `actionStyle`:
  `buttons` (≤3 → WhatsApp **reply buttons**) or `list` (→ a WhatsApp **list
  message**). The tester renders both; `cloudApi.sendTurn()` maps them to the
  real Cloud API (`sendButtons` with an optional image header, `sendImage`,
  `sendList`).
- Lesson copy guidelines: one idea per bubble, a single emoji anchor, the key
  term in `*bold*`, and a `(1/4)` progress marker.

> Real WhatsApp images need a public URL (set `MEDIA_BASE_URL`) and a supported
> format — **rasterise the SVGs to PNG/JPEG** before going live; `sendTurn`
> skips `.svg` automatically and sends the caption as text. The remaining
> modules still use the original text format and can be migrated the same way.

## Quick start (local, no WhatsApp account needed)

```bash
npm install
npm run tester     # browser chat tester at http://localhost:3100 (recommended)
npm run cli        # or chat in your terminal
npm test           # run the test suite
```

The browser tester shows a live stats bar (level · XP · streak · badges),
tappable action buttons, a `Restart`, and a `＋ Day` button to simulate the next
calendar day so you can watch streaks grow. Progress persists per browser.

In the terminal CLI, type `Hi` to begin; `.reset` restarts, `.quit` exits.

---

## Project layout

```
src/
  config.js              Environment configuration
  runtime.js             Orchestrator: storage + engine + gamification + rewards
  curriculum.js          Derives modules/lessons, next lesson, progress from content
  analytics.js           Program KPIs (funnel, learning gain, mastery, retention)
  content/
    index.js             i18n loader + English-fallback deep-merge
    en/                  English content (fully populated)
      system.js          Onboarding, menus, glossary, help, about, exit
      youth.js           Youth track menus + lessons
      adult.js           Adult track menus + lessons
      quiz.js            Youth + Adult quiz banks
      checks.js          Per-lesson knowledge checks (formative evaluation)
      assessment.js      Baseline/endline diagnostic items (learning gain)
      index.js           Assembles the English pack
    am/ , om/            Amharic / Afaan Oromo packs (placeholders — see below)
  engine/
    engine.js            The finite-state conversation machine (emits events)
  gamification/
    xp.js                XP awards, levels, progress bar
    streak.js            Daily streaks + one-day freeze
    badges.js            Badge catalog + evaluation
  scheduler/
    nudges.js            Nudge selection + message/template builder (pure)
  store/
    db.js                Durable storage (node:sqlite): profiles, progress, badges,
                         events, assessments, check_results
  whatsapp/
    cloudApi.js          Meta Cloud API client: text, templates, buttons, webhook parser
  server.js              Express webhook (GET verify, POST messages)
scripts/
  cli.js                 Local terminal simulator
  web-tester.js          Local browser chat tester (+ /api/metrics)
  scheduler.js           Proactive nudge runner (npm run scheduler)
  metrics.js             Print KPI summary to the terminal (npm run metrics)
public/
  index.html             WhatsApp-style chat tester
  dashboard.html         KPI dashboard (http://localhost:3100/dashboard.html)
docs/
  whatsapp-templates.md  Templates to register in Meta for proactive nudges
test/
  engine.test.js         Flow + content-integrity tests
  gamification.test.js   XP, streaks, badges, persistence (in-memory DB)
  scheduler.test.js      Nudge selection + sweep (in-memory DB)
  analytics.test.js      Assessments, learning gain, KPI summary (in-memory DB)
```

The engine is decoupled from WhatsApp and from persistence: `handle(session,
text, ctx)` returns message bubbles plus `events` (lessonCompleted, quizFinished
…). `runtime.js` turns those events into XP/badges/streaks, persists to SQLite,
and appends reward bubbles. The webhook, CLI and web tester are thin drivers
over `runtime.processMessage(userId, text)`.

---

## Going live on the Meta WhatsApp Cloud API

1. **Create a Meta app**
   - Go to <https://developers.facebook.com> → *My Apps* → *Create App* →
     *Business* → add the **WhatsApp** product.
   - In *WhatsApp → API Setup*, note your **Phone number ID** and a
     **temporary access token** (good for 24h; create a permanent token via a
     System User for production).

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Fill in:
   ```
   WHATSAPP_TOKEN=...        # access token
   PHONE_NUMBER_ID=...       # from API Setup
   VERIFY_TOKEN=...          # any random string you choose
   ```

3. **Run the server and expose it over HTTPS**
   ```bash
   npm start
   # in another terminal, tunnel port 3000 (example):
   npx ngrok http 3000
   ```
   Meta requires a public **https** callback URL.

4. **Register the webhook**
   - In *WhatsApp → Configuration → Webhook*, set the Callback URL to
     `https://<your-tunnel>/webhook` and the Verify Token to the same
     `VERIFY_TOKEN` from your `.env`.
   - Click *Verify and save* (you should see `✅ Webhook verified` in the logs).
   - **Subscribe** to the `messages` field.

5. **Test**
   - In *API Setup*, add your own number as a recipient and send the template
     message, or just message the test number from WhatsApp.
   - Send `Hi` — the bot replies with onboarding.

> **Production notes**
> - Replace the temporary token with a permanent System User token.
> - Replace the in-memory `store.js` with Redis/DB so sessions survive restarts
>   and scale across instances.
> - Consider verifying the `X-Hub-Signature-256` header on incoming POSTs
>   (set an App Secret and validate the HMAC) for webhook authenticity.

---

## Adding translations (Amharic / Afaan Oromo)

The language menu already works end-to-end. Until a pack is translated, that
language **falls back to English** automatically — nothing breaks.

To translate, edit `src/content/am/index.js` (or `om/index.js`) and mirror the
shape of the English files. The loader **deep-merges** your pack over English,
so you can translate incrementally — a single string, menu label, lesson, term,
or quiz question at a time.

**Rule:** translate only human-readable text. Keep every `input`, `next`, and
`answer` key **identical** to English, or navigation will break. The placeholder
files contain worked examples.

---

## Content integrity

`npm test` checks, among other flows, that **every menu option and every lesson
link points to a node that actually exists** — so a typo in a `next:` target is
caught before it reaches a user.

---

## License

MIT
