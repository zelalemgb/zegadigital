'use strict';

/**
 * Quiz banks for the Youth and Adult tracks.
 *
 * Each quiz: { intro, questions: [{ q, options:{A,B,C,D}, answer, explain }], tiers }
 * `explain` is shown after both correct and incorrect answers.
 * `tiers` maps a minimum score to a badge line (engine picks the highest met).
 */

const youth = {
  intro: [
    '🧠 Quiz Time!',
    "Test what you've learned about online safety, privacy, and digital skills.",
    '📋 15 questions | Reply A, B, C, or D for each.',
    '',
    'Type SKIP to skip a question. Type MENU to exit.',
    "Let's go! 🚀",
  ].join('\n'),
  returnTo: 'youth.menu',
  returnLabel: 'Youth Module',
  questions: [
    {
      q: "What does 'privacy' mean in a digital context?",
      options: {
        A: 'Keeping all your information completely secret from everyone',
        B: 'Your ability to control what others know about you',
        C: 'Not using social media at all',
        D: 'Only sharing information with your family',
      },
      answer: 'B',
      explain: "Privacy is about CONTROL — deciding who knows what about you, when, and why. It doesn't mean hiding everything from everyone.",
    },
    {
      q: "You receive a friend request from someone you've never met. They ask for your home address. What should you do?",
      options: {
        A: 'Share it — they seem friendly',
        B: 'Share it only if they have mutual friends',
        C: "Decline — an online stranger doesn't need your home address",
        D: 'Ask your friend first, then decide',
      },
      answer: 'C',
      explain: "Always ask WHY someone needs your information. A stranger online has no legitimate reason to need your home address. When in doubt, don't share.",
    },
    {
      q: 'Which of these is the STRONGEST password?',
      options: {
        A: 'Kebede2008',
        B: 'password123',
        C: 'Mango-River-Blue-Star9!',
        D: '123456',
      },
      answer: 'C',
      explain: 'A passphrase of 4+ unrelated words, combined with numbers and symbols, is long, memorable, and extremely difficult to hack. Personal info like names and birth years are the first things hackers try.',
    },
    {
      q: 'What does Multi-Factor Authentication (MFA) do?',
      options: {
        A: 'It creates a stronger password for you automatically',
        B: 'It adds a second verification step after your password, like a code sent to your phone',
        C: 'It stores all your passwords in one place',
        D: 'It blocks hackers from visiting websites',
      },
      answer: 'B',
      explain: 'MFA adds an extra security layer. Even if a hacker knows your password, they cannot access your account without also having your second factor — usually your phone.',
    },
    {
      q: "You receive a message saying: 'Your account will be deleted in 24 hours! Click here NOW to verify your password.' What should you do?",
      options: {
        A: 'Click the link immediately — it sounds urgent',
        B: 'Forward it to your friends as a warning',
        C: 'Ignore or delete it — this is a phishing scam',
        D: 'Reply with your password to verify your identity',
      },
      answer: 'C',
      explain: 'Urgency and fear are key tactics in phishing scams. No legitimate platform will ever ask for your password by message. Report and delete — do NOT click the link.',
    },
    {
      q: 'A future employer searches your name online before an interview. What might they find?',
      options: {
        A: 'Nothing — the internet is private',
        B: 'Only the information you personally want them to see',
        C: 'Your social media posts, photos, tags, and comments from others',
        D: 'Only your professional documents',
      },
      answer: 'C',
      explain: "Your digital footprint includes your posts, comments, likes, tags from others, and more. It's important to search your own name regularly and manage what appears.",
    },
    {
      q: 'Your friend sends a funny photo of another classmate without their permission. What is the most responsible action?',
      options: {
        A: "Share it — it's just a joke",
        B: "Save it but don't share",
        C: "Don't share it and let your friend know it's not okay to share without consent",
        D: 'Post it with a funny caption',
      },
      answer: 'C',
      explain: "Sharing someone's photo without their consent is a violation of their privacy, even if it seems harmless. A true upstander speaks up and models respectful behaviour.",
    },
    {
      q: 'Which of the following is a sign of an UNHEALTHY online relationship?',
      options: {
        A: 'Kind, clear communication',
        B: "Mutual respect for each other's privacy",
        C: 'A partner who demands you share your passwords and checks your messages',
        D: 'Supporting each other',
      },
      answer: 'C',
      explain: 'Demanding passwords and monitoring messages are signs of controlling behaviour — unhealthy in any relationship, online or offline. Healthy relationships are built on trust, not surveillance.',
    },
    {
      q: "What is a 'social media algorithm'?",
      options: {
        A: 'A type of strong password',
        B: 'A rule that decides what content appears in your feed based on your behaviour',
        C: 'A feature that lets you filter spam messages',
        D: 'A privacy setting that hides your posts',
      },
      answer: 'B',
      explain: 'Algorithms track what you like, share, watch, and search — then show you more of the same. This can create echo chambers, limiting your exposure to different perspectives.',
    },
    {
      q: "Someone on Instagram is posting unkind comments on your posts, but you don't want to block them yet. Which tool is BEST to use first?",
      options: {
        A: 'Mute',
        B: 'Report immediately',
        C: 'Restrict',
        D: 'Delete your account',
      },
      answer: 'C',
      explain: 'Restrict quietly limits what a person can see and do on your account without notifying them — ideal for managing conflict gradually. You can escalate to Report or Block if the behaviour continues.',
    },
    {
      q: 'If you are under 16 and new to Instagram, what happens to your account by default?',
      options: {
        A: 'Your account is public and anyone can follow you',
        B: 'Your account is set to private and people must request to follow you',
        C: 'You cannot create an account at all',
        D: 'Your parents automatically manage your account',
      },
      answer: 'B',
      explain: 'Meta automatically defaults under-16 accounts to private on Instagram. This means strangers cannot follow you or message you without your approval — an important built-in safety feature.',
    },
    {
      q: 'Which of the following is an example of Artificial Intelligence (AI) in your daily life?',
      options: {
        A: 'Charging your phone overnight',
        B: 'YouTube suggesting videos based on what you watch',
        C: 'Typing a message to a friend',
        D: 'Taking a photo',
      },
      answer: 'B',
      explain: 'Social media recommendation systems are one of the most common examples of AI in everyday life. They track what you watch, like, and search, then predict what you want to see next.',
    },
    {
      q: 'You see a photo shared on WhatsApp claiming a famous Ethiopian official was at a shocking event. What should you do FIRST?',
      options: {
        A: 'Share it immediately — it looks real',
        B: 'Ignore it — all viral photos are fake',
        C: 'Use the TRACE method to verify before sharing',
        D: 'Delete WhatsApp to be safe',
      },
      answer: 'C',
      explain: 'The TRACE method — Track the source, Reverse image search, Ask an expert, Cross-reference, Evaluate the logic — is your best tool for checking suspicious content before sharing it.',
    },
    {
      q: 'Your teacher asks you to write an essay. Which of the following is the MOST responsible way to use AI?',
      options: {
        A: 'Ask AI to write the entire essay and submit it as your own',
        B: 'Use AI to brainstorm ideas, then write the essay yourself and give the ideas proper context',
        C: 'Ask AI for the answer, then change a few words so it looks like your own',
        D: 'Avoid AI completely — it is too risky to use',
      },
      answer: 'B',
      explain: 'Using AI to support your thinking is acceptable — but the thinking, writing, and understanding must still be yours. Submitting AI-generated work as entirely your own is dishonest and means you miss the learning.',
    },
    {
      q: 'You download a free AI app that asks for permission to access your SMS messages. What should you do?',
      options: {
        A: 'Allow it — free apps always need extra permissions',
        B: 'Allow it only if your friend also uses the app',
        C: 'Deny the permission — an AI app has no legitimate reason to read your SMS messages',
        D: 'Delete the app only if something bad happens',
      },
      answer: 'C',
      explain: "App permissions should match the app's purpose. An AI productivity or creativity tool has no reason to access your SMS messages — this is a major red flag. Always question permissions that seem unnecessary.",
    },
  ],
  tiers: [
    { min: 15, badge: '🏆 Digital Champion! Outstanding!' },
    { min: 11, badge: '🌟 Digital Star! Great knowledge!' },
    { min: 7, badge: '📚 Good effort! Review the topics you missed.' },
    { min: 0, badge: '💪 Keep learning! Go back and explore the modules.' },
  ],
};

const adult = {
  intro: [
    '🧠 Quiz Time!',
    "Test what you've learned about media literacy, privacy, and online security.",
    '📋 15 questions | Reply A, B, C, or D for each.',
    'Type SKIP to skip a question. Type MENU to exit.',
    "Let's begin! 🚀",
  ].join('\n'),
  returnTo: 'adult.menu',
  returnLabel: 'Adult Module',
  questions: [
    {
      q: 'Which of the following is NOT part of your digital footprint?',
      options: {
        A: 'Photos you upload to social media',
        B: "Comments you make on others' posts",
        C: 'Thoughts you have but never write down or post',
        D: 'Articles you share from a news website',
      },
      answer: 'C',
      explain: 'Your digital footprint includes everything you post, share, like, and comment on — and what others post about you. Private thoughts that are never expressed online leave no footprint.',
    },
    {
      q: "You want to share a news story that supports your opinion, but you're not sure if it's from a credible source. Using the THINK framework, which letter should you focus on FIRST?",
      options: {
        A: 'H — Is it Helpful?',
        B: 'T — Is it True?',
        C: 'K — Is it Kind?',
        D: 'N — Is it Necessary?',
      },
      answer: 'B',
      explain: "The THINK framework starts with Truth. Sharing false information — even unintentionally — spreads misinformation. Always verify a source's credibility before sharing.",
    },
    {
      q: "What is 'confirmation bias'?",
      options: {
        A: 'A feature that confirms your login on social media',
        B: 'The tendency to seek out and believe information that supports what you already think',
        C: 'A type of cyber-attack that targets your beliefs',
        D: 'A social media algorithm setting',
      },
      answer: 'B',
      explain: 'Confirmation bias causes us to favour information that matches our existing views — making it easier to spread misinformation even with good intentions. Awareness is the first step to overcoming it.',
    },
    {
      q: 'Which of the following is the BEST strategy to avoid an echo chamber?',
      options: {
        A: 'Only follow accounts you fully agree with',
        B: 'Avoid social media entirely',
        C: 'Actively seek out diverse, credible news sources and perspectives',
        D: 'Share only content from your own community',
      },
      answer: 'C',
      explain: 'Actively engaging with diverse, credible sources helps you develop a fuller, more accurate picture of the world and counteracts the tendency of algorithms to show you only familiar viewpoints.',
    },
    {
      q: 'Which of the following is an example of Personally Identifiable Information (PII)?',
      options: {
        A: 'Your favourite colour',
        B: 'A photo of a sunset you took',
        C: 'Your government-issued ID number',
        D: 'The name of a book you enjoyed',
      },
      answer: 'C',
      explain: 'PII is any data that can identify you — directly or indirectly. This includes ID numbers, home addresses, bank details, biometric data, and medical history. Protect this information carefully.',
    },
    {
      q: 'What is the main privacy risk of regularly geo-tagging your social media posts?',
      options: {
        A: 'It uses too much mobile data',
        B: 'It reveals your routine and location patterns to anyone who can see your posts',
        C: 'It prevents your posts from appearing in search results',
        D: "It slows down your phone's battery",
      },
      answer: 'B',
      explain: 'Regularly geo-tagging posts tells others exactly where you are — and where you routinely go (home, work, gym, school). Strangers can use this to track your movements. Turn off location tagging by default.',
    },
    {
      q: "What is 'doxxing'?",
      options: {
        A: 'A method of creating strong passwords',
        B: "Sharing someone else's private personal information online without their consent",
        C: 'A privacy setting on Facebook',
        D: 'A type of spam email',
      },
      answer: 'B',
      explain: "Doxxing is publishing someone's private information — such as home address, phone number, or workplace — online without their consent. It is harmful, often illegal, and violates community guidelines on all major platforms.",
    },
    {
      q: 'Why should you avoid doing online banking on public Wi-Fi?',
      options: {
        A: 'Public Wi-Fi is too slow for banking websites',
        B: "Banks don't allow transactions on Wi-Fi",
        C: 'Others on the same network may be able to intercept your data',
        D: 'It drains your phone battery faster',
      },
      answer: 'C',
      explain: 'Public Wi-Fi networks are often unsecured. A hacker on the same network can use tools to intercept data you send and receive — including your banking credentials. Use mobile data for any sensitive transactions.',
    },
    {
      q: 'What should you do during a regular account security checkup?',
      options: {
        A: 'Change your username',
        B: 'Delete all your old posts',
        C: 'Review active login sessions, update recovery info, and check app permissions',
        D: 'Turn off all notifications',
      },
      answer: 'C',
      explain: "A security checkup means reviewing where you're logged in, ensuring your recovery email and phone are current, checking which third-party apps have access to your account, and assessing password strength.",
    },
    {
      q: "You notice posts appearing on your Facebook page that you didn't write. What is your FIRST action?",
      options: {
        A: 'Delete your Facebook account',
        B: 'Post a status update warning your friends',
        C: "Contact Facebook's Help Centre and immediately change your password",
        D: 'Wait to see if it happens again',
      },
      answer: 'C',
      explain: 'Act immediately. Go to the platform Help Centre, report the account as compromised, change your password, enable 2FA, and review your active sessions to remove any unknown devices. Then notify your contacts.',
    },
    {
      q: 'Which of the following can a parent NOT do through the Instagram Parental Supervision dashboard?',
      options: {
        A: 'Set time limits and scheduled breaks',
        B: 'See accounts their teen follows',
        C: "Read their teen's private direct messages",
        D: 'Review privacy and messaging settings',
      },
      answer: 'C',
      explain: "Parental supervision gives parents oversight over time, settings, and account insights — but it does not give access to a teen's private messages. Privacy is still respected.",
    },
    {
      q: 'A mobile banking app sends you an alert about an unusual transaction and temporarily freezes your card. Which technology is most likely responsible?',
      options: {
        A: 'A bank employee monitoring your account manually',
        B: 'Artificial Intelligence detecting unusual spending patterns',
        C: 'The government monitoring your transactions',
        D: 'A random security setting on your phone',
      },
      answer: 'B',
      explain: 'AI-powered fraud detection analyses your spending history to identify unusual activity in real time. This is one of the most beneficial everyday applications of AI in financial services.',
    },
    {
      q: 'You receive a voice note in a family WhatsApp group — it sounds exactly like your cousin, saying they are in an emergency and need money urgently. What should you do?',
      options: {
        A: 'Transfer the money immediately — it sounds exactly like them',
        B: 'Hang up and do nothing',
        C: 'Call your cousin directly on their known phone number to verify before taking any action',
        D: 'Forward the message to other family members',
      },
      answer: 'C',
      explain: 'AI can now clone voices convincingly. Always verify an emergency request through a separate channel — call the person directly using a number you already know. A family code word can also help identify genuine emergencies.',
    },
    {
      q: 'You need to write a professional complaint letter to a service provider. What is the BEST use of an AI tool like Meta AI in this situation?',
      options: {
        A: 'Ask AI to write the letter and send it without reading it',
        B: 'Avoid AI entirely and write the letter from scratch',
        C: 'Use AI to draft the letter, then edit it carefully to add accurate personal details before sending',
        D: 'Copy the AI output into a message and share it immediately',
      },
      answer: 'C',
      explain: 'AI can produce a strong structural draft, but you must review and personalise it. AI may include incorrect details or miss important cultural nuances. The final responsibility is always yours.',
    },
    {
      q: 'Which of the following skills is MOST valuable in an era of increasing AI automation?',
      options: {
        A: 'The ability to type quickly',
        B: 'Memorising large amounts of information',
        C: 'Critical thinking, cultural knowledge, and the ability to guide and evaluate AI tools',
        D: 'Using social media as much as possible',
      },
      answer: 'C',
      explain: 'AI can perform many routine tasks, but human strengths — including empathy, ethical judgment, creativity, and cultural understanding — remain irreplaceable. These are the skills most valued in the evolving workplace.',
    },
  ],
  tiers: [
    { min: 15, badge: '🏆 Digital Expert! Excellent work!' },
    { min: 11, badge: '🌟 Strong knowledge! Well done.' },
    { min: 7, badge: '📚 Good start! Review the topics you missed.' },
    { min: 0, badge: '💪 Keep going! Explore the modules to strengthen your skills.' },
  ],
};

module.exports = { youth, adult };
