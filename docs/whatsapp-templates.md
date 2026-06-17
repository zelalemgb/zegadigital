# WhatsApp message templates (for proactive nudges)

WhatsApp only allows free-form messages within **24 hours** of the user's last
message. To reach users *outside* that window — the whole point of proactive
reminders — you must send a **pre-approved template**. Each template below
carries a **quick-reply button**; when the user taps it, WhatsApp delivers a
message to your webhook (payload `CONTINUE`), which re-opens the 24-hour window
and the bot resumes the lesson.

Register these in **Meta Business Suite → WhatsApp Manager → Message templates**
(or via the API). The scheduler (`scripts/scheduler.js`) sends them by name.

> **Category:** these are engagement reminders — register as **MARKETING**
> (Meta generally classifies learning nudges as marketing). Users must have
> **opted in** (the bot captures this via `REMIND ON`). Honour `STOP`.
>
> **Languages:** create a template version per locale you serve (`en`, `am`).
> `om` currently maps to the `en` template (see `LANG_CODES` in the scheduler).

---

### 1. `zega_daily_nudge`
- **Body:** `👋 Ready for today's 2-minute lesson? Up next: {{1}}. Tap below to keep learning!`
- **Body sample for {{1}}:** `Introduction to Privacy`
- **Buttons:** Quick reply → `▶️ Continue learning`
- Sent by `buildNudge(... 'daily')` with `params: [nextLessonTitle]`.

### 2. `zega_streak_saver`
- **Body:** `🔥 Don't lose your {{1}}-day streak! A quick 2-minute lesson on {{2}} keeps it alive.`
- **Samples:** `{{1}}` = `5`, `{{2}}` = `Passwords`
- **Buttons:** Quick reply → `▶️ Continue learning`
- Sent with `params: [streak, nextLessonTitle]`.

### 3. `zega_reengagement`
- **Body:** `👋 We miss you at Zega Digital! You're {{1}}% through your track. Pick up where you left off — it only takes 2 minutes.`
- **Sample:** `{{1}}` = `40`
- **Buttons:** Quick reply → `▶️ Continue learning`
- Sent with `params: [percentComplete]`.

---

## How the loop closes

```
scheduler sweep (hourly)
  → selectDueNudges(): opted-in, inactive today, reminder time passed
  → sendTemplate(zega_daily_nudge, [nextTitle], payload="CONTINUE")
        ↓  (user taps "▶️ Continue learning")
  webhook receives button → text "CONTINUE"
  → engine treats CONTINUE as "go to mission home"
  → user taps "▶️ Start" → lesson resumes  → XP / streak / badges
```

The button payload (`CONTINUE`) is configurable in `src/scheduler/nudges.js`.
The engine maps `CONTINUE`/`RESUME` to the mission home screen.

## Testing without approval

You can't send real templates until Meta approves them, but you can preview the
exact message + button locally: open the web tester and click **🔔 Nudge**, or
run `npm run scheduler` (DRY-RUN mode logs what each due user would receive).
