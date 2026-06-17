'use strict';

/**
 * Post-lesson knowledge checks, keyed by lesson id. One quick question shown
 * after the last page of a lesson, before the completion badge.
 *
 * Shape: { q, options: { A, B, C }, answer, reinforce }
 * `reinforce` is a one-line takeaway shown after the user answers (either way).
 *
 * Lessons without an entry here simply skip straight to the badge, so this map
 * can grow incrementally. Keep keys identical to lesson node ids.
 */

module.exports = {
  // ── Youth ───────────────────────────────────────────────────────────────
  'youth.foundations.privacy-intro': {
    q: 'Privacy is best described as…',
    options: { A: 'Keeping everything secret', B: 'Controlling who knows what about you', C: 'Never posting online' },
    answer: 'B',
    reinforce: 'Privacy is about control, not secrecy.',
  },
  'youth.foundations.privacy-you': {
    q: 'Before sharing something online you should mainly think about…',
    options: { A: 'Your audience — who can see it', B: 'How many emojis to use', C: 'The time of day' },
    answer: 'A',
    reinforce: 'Always consider your audience and why they need the info.',
  },
  'youth.foundations.passwords': {
    q: 'Which makes the strongest password?',
    options: { A: 'Your birthday', B: 'A 4-word passphrase', C: '12345' },
    answer: 'B',
    reinforce: 'Length beats complexity — passphrases are strong and memorable.',
  },
  'youth.foundations.cyber': {
    q: 'A message says "Act NOW or lose your account!" This is a sign of…',
    options: { A: 'A trustworthy alert', B: 'A phishing red flag', C: 'A software update' },
    answer: 'B',
    reinforce: 'Urgency and fear are classic phishing tactics.',
  },
  'youth.wellness.reputation': {
    q: 'Once you post something for friends, it can…',
    options: { A: 'Only ever be seen by friends', B: 'Reach a much wider audience via shares', C: 'Never be screenshotted' },
    answer: 'B',
    reinforce: 'Post as if the widest possible audience could see it.',
  },
  'youth.wellness.social': {
    q: 'A key truth about sharing online is…',
    options: { A: "Once shared, it's hard to take back", B: 'Deleting removes every copy', C: 'Private posts can never spread' },
    answer: 'A',
    reinforce: 'Think before you post — sharing is hard to undo.',
  },
  'youth.wellness.presence': {
    q: 'If someone tags you in a post you dislike, you can…',
    options: { A: 'Nothing, it’s out of your hands', B: 'Untag yourself and report it', C: 'Only delete your account' },
    answer: 'B',
    reinforce: "You're not helpless — untag, ask to remove, report, or block.",
  },
  'youth.engagement.respect': {
    q: 'Before posting a photo of a friend you should…',
    options: { A: 'Ask their permission first', B: 'Post it, then ask', C: 'Add a funny caption' },
    answer: 'A',
    reinforce: 'Respecting boundaries online builds trust.',
  },
  'youth.engagement.relationships': {
    q: 'An "upstander" is someone who…',
    options: { A: 'Watches bad behaviour silently', B: 'Takes positive action to help', C: 'Joins in the teasing' },
    answer: 'B',
    reinforce: 'Be an upstander: support the target and report harm.',
  },
  'youth.opportunities.algorithms': {
    q: 'A social media algorithm decides…',
    options: { A: 'What appears in your feed based on your behaviour', B: 'Your password strength', C: 'Who your friends are' },
    answer: 'A',
    reinforce: 'Algorithms can create echo chambers — curate intentionally.',
  },
  'youth.safety.time': {
    q: 'Which Instagram tool reminds you to step away after scrolling?',
    options: { A: 'Take a Break', B: 'Boomerang', C: 'Reels' },
    answer: 'A',
    reinforce: 'Use Activity Dashboard, Reminders and Take a Break to stay intentional.',
  },
  'youth.safety.control': {
    q: 'To quietly limit someone without notifying them, use…',
    options: { A: 'Restrict', B: 'A public post', C: 'A new account' },
    answer: 'A',
    reinforce: 'Restrict, Mute, Block and Report put you in control.',
  },
  'youth.safety.age': {
    q: 'If you are under 16 and new to Instagram, your account is…',
    options: { A: 'Public by default', B: 'Private by default', C: 'Managed by Meta' },
    answer: 'B',
    reinforce: 'Under-16 accounts default to private for safety.',
  },
  'youth.ai.understanding': {
    q: 'Which is an everyday example of AI?',
    options: { A: 'Charging your phone', B: 'YouTube recommending videos', C: 'Taking a photo' },
    answer: 'B',
    reinforce: 'AI already powers recommendations, translation and more.',
  },
  'youth.ai.spotting': {
    q: 'A common clue an image is AI-generated is…',
    options: { A: 'Strange hands or extra fingers', B: 'It loads quickly', C: 'It is in colour' },
    answer: 'A',
    reinforce: 'Check hands, backgrounds, lighting and text before sharing.',
  },
  'youth.ai.creating': {
    q: 'A good AI prompt clearly states…',
    options: { A: 'Only one word', B: 'Audience, task, tone and details', C: 'Your password' },
    answer: 'B',
    reinforce: 'The clearer the prompt, the better the result.',
  },
  'youth.ai.ethics': {
    q: 'Which of the four R’s means saying when you used AI?',
    options: { A: 'Recognition', B: 'Revenge', C: 'Refresh' },
    answer: 'A',
    reinforce: 'Respect, Responsibility, Rights, Recognition.',
  },
  'youth.ai.safety': {
    q: 'A free AI game asks to read your SMS messages. You should…',
    options: { A: 'Allow it', B: 'Refuse — it doesn’t match the app’s purpose', C: 'Share your contacts too' },
    answer: 'B',
    reinforce: "If a permission doesn't match the app's purpose, refuse it.",
  },
  'youth.ai.future': {
    q: 'To thrive in an AI future you mainly need…',
    options: { A: 'To memorise everything', B: 'Critical thinking and creativity', C: 'To avoid all technology' },
    answer: 'B',
    reinforce: 'Your judgement, creativity and culture matter most.',
  },

  // ── Adult ───────────────────────────────────────────────────────────────
  'adult.media.identity': {
    q: 'The THINK framework starts with which question?',
    options: { A: 'Is it True?', B: 'Is it Trendy?', C: 'Is it Timed?' },
    answer: 'A',
    reinforce: 'True, Helpful, Inspiring, Necessary, Kind.',
  },
  'adult.privacy.protecting': {
    q: 'Which is Personally Identifiable Information (PII)?',
    options: { A: 'Your favourite colour', B: 'Your government ID number', C: 'A sunset photo' },
    answer: 'B',
    reinforce: "PII is any data that can identify you — protect it.",
  },
  'adult.privacy.managing': {
    q: 'The main risk of regularly geo-tagging posts is…',
    options: { A: 'It uses data', B: 'It reveals your routine and location', C: 'It slows your phone' },
    answer: 'B',
    reinforce: 'Turn off location tagging by default.',
  },
  'adult.privacy.identity': {
    q: 'Your online reputation is…',
    options: { A: 'Fully controlled by you', B: 'Shaped by how others interpret what they find', C: 'Only your profile photo' },
    answer: 'B',
    reinforce: 'You control your identity; others shape your reputation.',
  },
  'adult.security.personal': {
    q: 'Which adds a second step beyond your password?',
    options: { A: 'Two-Factor Authentication (2FA)', B: 'A longer username', C: 'Airplane mode' },
    answer: 'A',
    reinforce: 'Turn on 2FA wherever possible.',
  },
  'adult.security.accounts': {
    q: 'A security checkup includes…',
    options: { A: 'Deleting all posts', B: 'Reviewing logins, recovery info and app permissions', C: 'Changing your name' },
    answer: 'B',
    reinforce: 'Be proactive — don’t wait for a problem.',
  },
  'adult.security.compromised': {
    q: 'If your account is hacked, act first by…',
    options: { A: 'Waiting to see if it repeats', B: 'Changing your password and contacting the Help Centre', C: 'Posting a warning status' },
    answer: 'B',
    reinforce: 'Every minute counts — change password, enable 2FA, notify contacts.',
  },
  'adult.youthsafety.time': {
    q: 'Teen Accounts on Instagram have a default daily limit of…',
    options: { A: '1 hour', B: '6 hours', C: 'No limit' },
    answer: 'A',
    reinforce: 'Teens get a reminder at the 1-hour daily limit.',
  },
  'adult.youthsafety.control': {
    q: 'Early teens (13–15) accounts are…',
    options: { A: 'Public by default', B: 'Private by default', C: 'Unrestricted' },
    answer: 'B',
    reinforce: 'Younger teens get stronger default protections.',
  },
  'adult.youthsafety.parental': {
    q: 'Through parental supervision, a parent CANNOT…',
    options: { A: 'Set time limits', B: "Read their teen's private DMs", C: 'See who their teen follows' },
    answer: 'B',
    reinforce: 'Supervision respects a teen’s private messages.',
  },
  'adult.youthsafety.age': {
    q: 'Meta verifies age using…',
    options: { A: 'Video selfie or ID checks', B: 'Your password', C: 'Your contacts list' },
    answer: 'A',
    reinforce: 'Age assurance keeps teens in age-appropriate settings.',
  },
  'adult.ai.understanding': {
    q: 'A key distinction about AI is that it…',
    options: { A: 'Thinks exactly like a human', B: "Does not 'think' the way humans do", C: 'Has real emotions' },
    answer: 'B',
    reinforce: 'AI mimics intelligence but lacks human judgement.',
  },
  'adult.ai.recognising': {
    q: 'Which suggests content may be AI-generated?',
    options: { A: 'Robotic voice or mismatched lip movements', B: 'It has many likes', C: 'It is in your language' },
    answer: 'A',
    reinforce: 'Watch for unnatural images, polished text and robotic audio.',
  },
  'adult.ai.practical': {
    q: 'Before using AI output you should always…',
    options: { A: 'Send it without reading', B: 'Review and personalise it', C: 'Assume it is perfect' },
    answer: 'B',
    reinforce: 'AI gives a starting point — the final responsibility is yours.',
  },
  'adult.ai.safety': {
    q: 'Which is NOT safe to share with an AI tool?',
    options: { A: 'Your city', B: 'A general question', C: 'Your bank account number' },
    answer: 'C',
    reinforce: 'Never share bank details, IDs or images of others.',
  },
  'adult.ai.future': {
    q: 'The most valuable skill in an AI era is…',
    options: { A: 'Typing fast', B: 'Critical thinking and guiding AI', C: 'Memorising facts' },
    answer: 'B',
    reinforce: 'Human judgement, creativity and culture stay irreplaceable.',
  },
};
