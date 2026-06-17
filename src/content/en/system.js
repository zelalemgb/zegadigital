'use strict';

/**
 * System-level content: onboarding, global navigation strings, the main track
 * menu, language menu, About, Help & Resources, Glossary, completion badge and
 * the exit message.
 *
 * Content model (shared by every node):
 *   menu   → { type:'menu', title?, body?, options:[{input,label,next}], footer? }
 *   lesson → { type:'lesson', title, parent, parentLabel, next?, messages:[...] }
 *   info   → { type:'info', messages:[...], back? }
 *
 * `next` / `back` / `parent` are either another node id or one of the reserved
 * special targets handled directly by the engine:
 *   MAIN · LANGUAGE · GLOSSARY · EXIT · YOUTH_QUIZ · ADULT_QUIZ
 */

module.exports = {
  strings: {
    // Shown to a brand-new user (or on "Hi"/"Start"). Also where language is chosen.
    onboarding: [
      '👋 Welcome to Zega Digital ዜጋ ዲጂታል!',
      "💡 I'm here to help you build essential digital literacy skills — from staying safe online to understanding social media to positive online experiences!",
      '',
      'You can reply with a number at any time to navigate.',
      'Type MENU to return to the main menu. Type STOP to exit.',
      '',
      "Let's start — please choose your language:",
      '1️⃣ English',
      '2️⃣ Amharic',
      '3️⃣ Afaan Oromo',
    ].join('\n'),

    // Quick navigation tip, shown right after a language is chosen.
    navTip: [
      '🧭 Quick tip before we start:',
      '',
      '✅ Reply with a NUMBER to choose a menu option.',
      '0️⃣ Reply 0 to go back one level.',
      '📋 Type MENU anytime for the Main Menu.',
      '❌ Type STOP to exit.',
      '',
      "Ready? Let's go! 🚀",
    ].join('\n'),

    // Shown when input does not match anything valid in the current state.
    unrecognised: [
      "🤔 Hmm, I didn't quite get that!",
      '',
      'Try replying with a number from the menu.',
      'Type MENU to see all options, or HELP for support.',
    ].join('\n'),

    exitMessage: [
      '👋 Thank you for using Zega Digital ዜጋ ዲጂታል!',
      'We hope you learned something new to help you navigate the digital world safely and confidently.',
      "You can start a new session anytime by sending 'Hi' or 'Menu'.",
      'Stay safe online! 🌍✨',
    ].join('\n'),

    // Footer appended to every menu unless the menu defines its own.
    menuFooter: 'Reply with the number of your choice.',

    // Completion badge — {{lesson}} is replaced with the lesson title.
    completionBadge: [
      "🏅 Great work! You've completed {{lesson}}.",
      '',
      '1️⃣ Continue to the next lesson',
      '0️⃣ Return to the module menu',
      'Type MENU for the Main Menu',
    ].join('\n'),

    // Navigation footer appended to each lesson message page.
    lessonNav: 'Reply NEXT ➡️ to continue · 0️⃣ back · MENU for Main Menu',
  },

  nodes: {
    // ─── Main track selection ───────────────────────────────────────────
    MAIN: {
      type: 'menu',
      title: '🏠 Main Menu',
      body: '👉 Please choose:',
      options: [
        { input: '1', label: '1️⃣ 🧒 Youth Module (Ages 13–17)', next: 'youth.menu' },
        { input: '2', label: '2️⃣ 🧑 Adult Module (Ages 18+)', next: 'adult.menu' },
        { input: '3', label: '3️⃣ 🌍 Language selection', next: 'LANGUAGE' },
        { input: '4', label: '4️⃣ ℹ️ About Zega bot', next: 'about' },
        { input: '5', label: '5️⃣ 📖 Glossary', next: 'GLOSSARY' },
        { input: '6', label: '6️⃣ 🆘 Help & Resources', next: 'help.menu' },
        { input: '7', label: '7️⃣ ❌ Exit', next: 'EXIT' },
      ],
    },

    // ─── About ──────────────────────────────────────────────────────────
    about: {
      type: 'info',
      back: 'MAIN',
      messages: [
        [
          'ℹ️ About Zega Digital ዜጋ ዲጂታል',
          '🎯 Purpose: To empower Ethiopians with digital literacy skills for safe, confident online navigation.',
          '⚖️ Non-Partisan & Neutral: Factual, balanced information without political bias.',
          "📚 Sources: Adapted from Meta's 'My Digital World' and other credible digital safety resources.",
          '🔒 Privacy: This bot does not store your personal conversations.',
        ].join('\n'),
      ],
    },

    // ─── Help & Resources ───────────────────────────────────────────────
    'help.menu': {
      type: 'menu',
      title: '🆘 Help & Resources',
      options: [
        { input: '1', label: '1️⃣ 📞 Report to Meta (Facebook/Instagram/WA)', next: 'help.report' },
        { input: '2', label: '2️⃣ 🔒 How to reset a hacked account', next: 'help.hacked' },
        { input: '3', label: '3️⃣ 🔗 More learning resources', next: 'help.resources' },
        { input: '0', label: '0️⃣ Back to Main Menu', next: 'MAIN' },
      ],
    },
    'help.report': {
      type: 'info',
      back: 'help.menu',
      messages: [
        [
          '📞 To report content on Meta platforms:',
          'Facebook: facebook.com/help',
          'Instagram: instagram.com/support',
          'WhatsApp: Settings → Help → Contact Us',
          '',
          'All reports are anonymous and reviewed by safety teams 24/7.',
        ].join('\n'),
      ],
    },
    'help.hacked': {
      type: 'info',
      back: 'help.menu',
      messages: [
        [
          '🔒 If your account has been hacked:',
          '',
          'Facebook: facebook.com/hacked',
          'Instagram: help.instagram.com',
          'WhatsApp: faq.whatsapp.com (WhatsApp Help)',
          '',
          'Act fast — the sooner you report, the better.',
        ].join('\n'),
      ],
    },
    'help.resources': {
      type: 'info',
      back: 'help.menu',
      messages: [
        [
          '🔗 More learning resources:',
          '• Home Page — MyDigitalWorld (SSA): mydigitalworld.fb.com/ssa',
          '• Community Standards | Transparency Centre: transparency.fb.com',
          '• Family Center | Meta: familycenter.meta.com',
          '• Facebook Safety Center: facebook.com/safety',
          '• Instagram Safety: about.instagram.com/safety',
          '• WhatsApp Security: whatsapp.com/security',
          '• Facebook Help Center: facebook.com/help',
          '• Instagram Help Center: help.instagram.com',
          '• WhatsApp Help Center: faq.whatsapp.com',
          '• ConnectSafely: connectsafely.org',
        ].join('\n'),
      ],
    },
  },

  // ─── Glossary (handled specially by the engine) ───────────────────────
  glossary: {
    intro: [
      '📖 Glossary — Quick definitions of key terms.',
      'Reply with a number for a definition, or 0 to go back.',
    ].join('\n'),
    back: 'MAIN',
    terms: [
      { input: '1', label: 'Algorithm', definition: 'A set of computer rules that decides what you see in your social media feed based on your activity.' },
      { input: '2', label: 'Brute Force Attack', definition: 'A hacking method where a computer program automatically tries thousands of password combinations until it finds the right one.' },
      { input: '3', label: 'Confirmation Bias', definition: 'The tendency to seek out and believe information that supports what you already think — making it easy to spread misinformation.' },
      { input: '4', label: 'Cookies', definition: 'Tiny files stored on your device by websites to remember who you are — and to track you across different websites for advertising.' },
      { input: '5', label: 'Disinformation', definition: 'False information that is deliberately created and spread to deceive people. Different from misinformation (which lacks intent to deceive).' },
      { input: '6', label: 'Digital Footprint', definition: 'All the information about you that exists online — including what you post, share, like, comment on, and what others post about you.' },
      { input: '7', label: 'Doxxing', definition: "Sharing someone's private personal information online without their consent. Harmful and often illegal." },
      { input: '8', label: 'Echo Chamber', definition: 'When you only see content that reflects your own views because of algorithms and confirmation bias.' },
      { input: '9', label: 'HTTPS', definition: "A secure connection standard for websites. The 'S' means your connection is encrypted. Look for the 🔒 lock icon in your browser." },
      { input: '10', label: 'Identity Theft', definition: 'When someone uses your personal information to impersonate you — e.g. opening credit cards or accounts in your name.' },
      { input: '11', label: 'Malware', definition: 'Harmful software code that can spy on your device, steal data, lock your files (ransomware), or give hackers control.' },
      { input: '12', label: 'Metadata', definition: "Data about data. E.g. the time you logged in, your location when you posted, and who you're connected to — even if your content is private." },
      { input: '13', label: 'MFA / 2FA', definition: 'Multi-Factor Authentication: a second security step after your password, such as a code sent to your phone.' },
      { input: '14', label: 'Phishing', definition: "A fake message designed to trick you into revealing passwords or personal info — often looks like it's from a real company." },
      { input: '15', label: 'PII', definition: 'Personally Identifiable Information — any data that could identify you, such as your address, ID number, or bank details.' },
      { input: '16', label: 'Ransomware', definition: 'A type of malware that locks your files and demands payment (ransom) to unlock them.' },
      { input: '17', label: 'Social Engineering', definition: 'Tricking people (not computers) into sharing private information, often by pretending to be a trusted person or organisation.' },
      { input: '18', label: 'Upstander', definition: 'Someone who takes positive action when they see bad behaviour online — instead of just watching like a bystander.' },
    ],
  },
};
