# Zega Digital Bot — Client Setup Guide

This guide lists everything **you (the client)** need to prepare on your side so
your developer can connect and launch the Zega Digital WhatsApp bot.

You already have the hard part done — a **Meta Business account with the
WhatsApp API configured**. The remaining tasks are mostly collecting a few
credentials, creating a **permanent access token**, and approving a couple of
settings. None of this requires coding.

> **Roles:** Tasks marked **[You]** are done by you in your Meta/Business
> account. Tasks marked **[Developer]** are done by your developer — listed only
> so you know what to expect. When you finish, you'll hand your developer the
> short checklist at the end.

Set aside about **30–45 minutes**. Have a password manager or secure note ready
to store the values you collect.

---

## Step 1 — Collect your WhatsApp API details  **[You]**

Go to **developers.facebook.com → My Apps →** *(your app)* **→ WhatsApp → API Setup**.
Copy these two values:

- [ ] **Phone Number ID** (a long number, shown under the test/sender number)
- [ ] **WhatsApp Business Account ID** (WABA ID)

> These identify which number the bot speaks through. They are *not* secret, but
> your developer needs them.

---

## Step 2 — Get your App ID and App Secret  **[You]**

Go to **your app → App Settings → Basic**.

- [ ] **App ID**
- [ ] **App Secret** (click *Show* — treat this like a password)

> The App Secret lets the bot verify that incoming messages really come from
> Meta. Keep it private.

---

## Step 3 — Create a PERMANENT access token  **[You] — most important step**

The token shown on the *API Setup* page **expires after 24 hours**. A live bot
needs a token that never expires, created through a *System User*.

1. Go to **business.facebook.com → Business Settings**.
2. In the left menu under *Users*, click **System Users**.
3. Click **Add**, give it a name like `Zega Bot`, role **Admin** (or Employee),
   and create it.
4. With the system user selected, click **Add Assets** → choose your **App** and
   your **WhatsApp Account**, and enable **full control / manage** for each.
5. Click **Generate New Token**.
   - Select your **app**.
   - Token expiration: **Never**.
   - Tick these permissions: **`whatsapp_business_messaging`** and
     **`whatsapp_business_management`**.
   - Click **Generate**.
6. **Copy the token immediately and store it securely** — Meta only shows it once.

- [ ] Permanent access token generated and saved

> This single token is what lets the bot send and receive messages indefinitely.

---

## Step 4 — Make sure billing is set up  **[You]**

WhatsApp charges per conversation, billed to your business account.

- In **WhatsApp Manager** (business.facebook.com → WhatsApp Manager), open
  **Billing / Payment settings** and confirm a **valid payment method** is
  attached.

- [ ] Payment method confirmed

> Without this, message sending can be blocked once free allowances are used.

---

## Step 5 — Confirm your phone number is ready  **[You]**

In **WhatsApp → API Setup** (or WhatsApp Manager → Phone numbers):

- [ ] The number you want the bot to use is listed and its **display name** is
      **approved** (status shows *Connected* / a green tick).
- [ ] If you're still testing, add the **phone numbers of testers** under the
      *To* / recipient list on the API Setup page (during testing, the bot can
      only message numbers you've added there).

---

## Step 6 — Business verification (for going fully live)  **[You]**

While testing, you can skip this. To message the general public at scale you
need a **verified business**.

- Go to **Business Settings → Security Center** (or *Business verification*) and
  complete verification if it isn't already done.

- [ ] Business verification complete (or planned before public launch)

---

## Step 7 — Provide a privacy policy URL  **[You]**

Meta requires a privacy policy for live messaging apps. A simple page stating
that the bot provides digital-literacy education and does not store personal
conversations is enough.

- [ ] Privacy policy URL ready (e.g. on your website)

---

## Step 8 — Approve the reminder templates (optional)  **[You + Developer]**

Only needed if you want the bot to **send daily reminders** to inactive users
(the core lessons work without this).

- Your developer will submit 3 message templates for approval. You may need to
  **review/approve** them in **WhatsApp Manager → Message templates**, and they
  take a few hours to a day to be approved by Meta.

- [ ] (Optional) Reminder templates reviewed/approved

---

## Step 9 — Decide a few things  **[You]**

Quick decisions your developer will ask about:

- [ ] **Which phone number** the bot runs on (test number vs. your real number)
- [ ] **Languages** to launch with (English is ready; Amharic / Afaan Oromo can
      be added)
- [ ] **Reminders on or off** at launch
- [ ] **Who pays for hosting** (a small monthly fee, ~$0–10) and approval to set
      it up

---

## Step 10 — Hand off to your developer  **[You]**

Send the following to your developer **securely** (use a password manager share
or an encrypted note — *not* plain email or chat):

```
Phone Number ID:            __________
WhatsApp Business Acct ID:  __________
App ID:                     __________
App Secret:                 __________  (secret)
Permanent access token:     __________  (secret)
Verify token:               (your developer can choose this; or pick a random
                             phrase and share it)
Privacy policy URL:         __________
Phone number / display name:__________
```

> **Security note:** the *App Secret* and *permanent token* give full control of
> your WhatsApp messaging. Share them only with your trusted developer, store
> them in a password manager, and rotate (regenerate) them if they ever leak.

---

## What happens next (so you know what to expect)  **[Developer]**

Your developer will:
1. Deploy the bot to a hosting service (gives a public web address).
2. Enter your credentials there as configuration.
3. Update your **Webhook** in the Meta dashboard to point at that address and
   subscribe to the `messages` field.
4. Test by messaging your number, then hand it over.

Once that's done, anyone messaging your WhatsApp number gets the bot. ✅
