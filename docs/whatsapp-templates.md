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

The nudge system is **stage-aware**: each learner gets the message that moves
them one step closer to their certificate (see `stageFor` in
`src/scheduler/nudges.js`). Register these four templates. **Create a version
per locale** you serve (`en`, `am`); `om` maps to `en` (see `LANG_CODES`).

### 1. `zega_almost_there`  — *lessons nearly done*
- **Body:** `🎯 You're almost there — only {{1}} lessons left to earn your certificate! Up next: {{2}}.`
- **Samples:** `{{1}}` = `2`, `{{2}}` = `Strong Passwords`
- **Buttons:** Quick reply → `▶️ Continue learning` (payload `CONTINUE`)
- Fired when ≤ 2 lessons remain. `params: [remaining, nextLessonTitle]`.

### 2. `zega_quiz_left`  — *all lessons done, quiz not passed*
- **Body:** `📝 So close! You've finished every lesson. Just one step left — pass the short quiz to earn your certificate.`
- **Buttons:** Quick reply → `▶️ Continue learning` (payload `CONTINUE`)
- No params.

### 3. `zega_cert_ready`  — *eligible, certificate not yet claimed*
- **Body:** `🎓 You did it! You've finished everything — your certificate is ready to claim. Tap below to get it now.`
- **Buttons:** Quick reply → `🎓 Get certificate` (payload `CERTIFICATE`)
- No params.

### 4. `zega_reengagement`  — *dormant (idle ≥ 3 days)*
- **Body:** `👋 We miss you at Zega Digital! You're {{1}}% of the way to your certificate. Pick up where you left off — it only takes 2 minutes.`
- **Sample:** `{{1}}` = `40`
- **Buttons:** Quick reply → `▶️ Continue learning` (payload `CONTINUE`)
- Sent with `params: [percentComplete]`.

> The older `zega_daily_nudge` / `zega_streak_saver` habit templates are no
> longer sent (the system now focuses on the high-value certificate funnel). You
> can leave them registered or archive them.

---

## How the loop closes

```
scheduler sweep (every 15 min)
  → db.profilesDueForNudge(): opted-in, idle today, past reminder hour, not nudged today
  → per candidate: apply fatigue backoff, then stageFor() → the funnel stage
  → sendTemplate(<stage template>, params, payload)
        ↓  (user taps the quick-reply button)
  webhook receives button → text "CONTINUE" (or "CERTIFICATE")
  → engine resumes the mission / issues the certificate
  → learner re-engages → nudge_ignored resets to 0
```

Backoff: at most 1 nudge/day; after 3 ignored in a row the cadence slows to
weekly, and after 5 it pauses until the learner returns. Any inbound message
resets the counter (see `runtime.js`). Opt-in is captured at track selection
(`REMIND ON`); honour `STOP`. Payloads are set in `src/scheduler/nudges.js`.

## Testing without approval

You can't send real templates until Meta approves them, but you can preview the
exact message + button locally: open the web tester and click **🔔 Nudge**, or
run `npm run scheduler` (DRY-RUN mode logs what each due user would receive).
