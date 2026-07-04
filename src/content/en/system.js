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
      'Welcome to Zega Digital ዜጋ ዲጂታል 👋',
      '',
      'I help you build everyday digital skills — staying safe online, using social media wisely, and getting the most from the internet.',
      '',
      'First, choose your language:',
      '1  English',
      '2  Amharic',
      '3  Afaan Oromo',
    ].join('\n'),

    // Quick navigation tip, shown right after a language is chosen.
    navTip: [
      'A few quick tips:',
      '',
      '• Reply with a number to choose an option.',
      '• Reply 0 (or BACK) to go back one step.',
      '• Type MENU anytime for the main menu.',
      '• Type PROGRESS to see your profile, or LANGUAGE to switch language.',
      '• Type STOP to exit.',
      '',
      "Let's begin!",
    ].join('\n'),

    // Shown when input does not match anything valid in the current state.
    unrecognised: [
      "Sorry, I didn't understand that.",
      '',
      'Please reply with one of the options shown below.',
    ].join('\n'),

    exitMessage: [
      'Thanks for using Zega Digital ዜጋ ዲጂታል.',
      'We hope you learned something useful today.',
      'Send Hi anytime to start again. Stay safe online!',
    ].join('\n'),

    // Footer appended to every menu unless the menu defines its own.
    menuFooter: 'Reply with the number of your choice.',

    // Completion badge — {{lesson}} is replaced with the lesson title.
    completionBadge: [
      'Lesson complete: {{lesson}}. Nice work!',
      '',
      '1  Next lesson',
      '0  Back to topics',
      'MENU  Home',
    ].join('\n'),

    // Navigation footer appended to each lesson message page.
    lessonNav: 'Reply NEXT to continue, 0 to go back, or MENU for the main menu',
    lessonNavLast: 'Reply NEXT to finish, 0 to go back, or MENU for the main menu',

    // Dynamic-screen strings (mission, progress, quiz, rewards). {{...}} are
    // filled at render time. Translated per language; English is the fallback.
    ui: {
      // Level names by index (Beginner..Expert), shown on mission/progress.
      levelNames: ['Beginner', 'Learner', 'Skilled', 'Guardian', 'Expert'],
      // Track chooser (shown before a track is picked)
      chooseWelcome: 'Welcome to Zega Digital 👋',
      choosePrompt: 'Who is this for? Pick one — you can change it anytime.',
      chooseYouth: '1  Youth (ages 13–17)',
      chooseAdult: '2  Adult (18+)',
      chooseExplore: '3  Just exploring',
      // Mission (home) screen
      welcomeBack: 'Welcome back 👋',
      todaysLesson: "*Today's lesson*",
      lessonLine: '{{title}} ({{module}}, ~2 min)',
      trackDone: "You've finished this track. Well done!",
      replyNumber: '*Reply with a number:*',
      listButton: 'Select',
      optStartLesson: "1  Start today's lesson",
      optStartQuiz: '1  Take the track quiz',
      optProgress: '2  My progress & badges',
      optBrowse: '3  Main menu (switch track)',
      optQuiz: '4  Take a quiz',
      optLanguage: '5  Change language',
      optMore: '6  Browse all topics',
      statLine: 'Level: {{level}} · {{points}} points · {{streak}} · {{done}}/{{total}} lessons',
      streakDays: '{{n}}-day streak',
      streakNone: 'no streak yet',
      // Progress screen
      progTitle: '*Your progress*',
      progLevel: 'Level: {{level}} ({{index}} of {{count}})',
      progTop: 'You have reached the top level!',
      progToNext: '{{n}} more points to reach {{next}}',
      progPoints: 'Points: {{points}}',
      progStreak: 'Day streak: {{n}} days in a row (your best: {{best}})',
      progLessons: '*Lessons: {{done}} of {{total}} finished*',
      progModFinished: 'finished',
      progModNotStarted: 'not started',
      progModPartial: '{{done}} of {{total}}',
      progBadgesTitle: '*Badges earned*',
      progNoBadges: '*Badges:* none yet — finish a lesson to earn your first.',
      progFooter: 'Reply 0 or MENU to go back home.',
      // Post-lesson check
      checkTitle: '*Quick check* — worth 10 points',
      checkFooter: 'Reply with a letter, or SKIP.',
      checkCorrect: 'Correct! {{reinforce}}',
      checkWrong: 'Not quite — the answer is {{answer}}. {{reinforce}}',
      // Quiz
      quizQ: '*Question {{n}} of {{total}}*',
      quizFooter: 'Reply A, B, C, or D. SKIP to skip, MENU to exit.',
      quizCorrect: 'Correct — the answer is {{answer}}.',
      quizWrong: 'Not quite — the correct answer is {{answer}}.',
      quizContinue: 'Reply YES for the next question, or MENU to return.',
      quizNext: 'Reply YES for the next question, or MENU to stop.',
      quizDoneTitle: '*Quiz complete!*',
      quizScore: 'You answered {{score}} out of {{total}} correctly.',
      quizDoneFooter: 'Reply MENU for home, or REVIEW to revisit topics.',
      // Info pages footer
      infoFooter: 'Reply 0 to go back, or MENU for home.',
      glossaryMore: 'Reply another number for a definition, or 0 to go back.',
      // Language menu
      langTitle: '🌐 Language',
      langPrompt: 'Choose your language:',
      langBack: '0  Back',
      langSet: 'Language set to {{name}}.',
      // Rewards (runtime)
      rewardStreak: "You're on a {{n}}-day streak. +{{pts}} points for showing up today.",
      rewardStreakMilestone: '{{n}} days in a row — amazing! +{{pts}} points.',
      rewardStreakSaved: ' (we saved your streak)',
      rewardPoints: 'You earned {{pts}} points.',
      rewardBadge: 'New badge: {{name}} — {{desc}}. +{{pts}} points.',
      rewardLevelUp: 'You reached a new level: {{name}} (level {{n}} of {{count}}).',
      rewardGain: 'Your score went from {{before}}% at the start to {{after}}% now',
      rewardGainProgress: " — that's {{delta}} points of progress. Well done!",
      optInPrompt: 'Want a daily reminder to keep your streak going? Reply REMIND ON (or REMIND 19 for a 7pm reminder).',
      // Certificate of completion
      certEarnedAskName: "🎓 *Congratulations!* You've finished every lesson and passed the quiz — you've earned your Zega Digital certificate!\n\nWhat name should we print on it? Reply with your full name (or SKIP).",
      certNameInvalid: 'Please reply with the name to print on your certificate (2–48 characters), or SKIP.',
      certGenerating: '🎉 Perfect, {{name}}! Here is your certificate:',
      certCaption: '🎓 Zega Digital — Certificate of Completion',
      certVerify: '✅ Keep this! Anyone can verify it at:\n{{url}}',
      certNotYet: '🎓 Finish every lesson in your track and pass the quiz to earn your certificate. Reply 1 to keep learning!',
      certSkipped: 'No problem — reply CERTIFICATE anytime to get your certificate.',
    },
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
          "OMNI Ethiopia & Meta bring you the Zega Digital Bot—an interactive WhatsApp experience to help you stay safe online, build digital skills, and navigate today's digital world with confidence.",
          '⚖️ Non-Partisan & Neutral: Factual, balanced information without political bias.',
          '🔒 Privacy: This bot does not store your personal conversations.',
          '📧 Contact: zegadigital00@gmail.com',
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
