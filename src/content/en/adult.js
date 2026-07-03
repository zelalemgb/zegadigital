'use strict';

/**
 * Adult Track (Ages 18+) — module menus and lessons.
 * See system.js for the shared content model.
 */

const msg = (...lines) => lines.join('\n');

module.exports = {
  // ─── Adult module menu ────────────────────────────────────────────────
  'adult.menu': {
    type: 'menu',
    title: '🧑 Adult Module',
    body: [
      "🎉 Great! You've selected the Adult Track.",
      '📚 Learn about online safety, privacy, and more.',
      '✍️ What would you like to learn about today?',
    ].join('\n'),
    options: [
      { input: '1', label: '1️⃣ 📰 Media Literacy', next: 'adult.media' },
      { input: '2', label: '2️⃣ 🔐 Privacy', next: 'adult.privacy' },
      { input: '3', label: '3️⃣ 🛡️ Online Security', next: 'adult.security' },
      { input: '4', label: '4️⃣ 🛡️ Youth Online Safety & Wellbeing', next: 'adult.youthsafety' },
      { input: '5', label: '5️⃣ ✨ AI Literacy', next: 'adult.ai' },
      { input: '6', label: '6️⃣ 🧠 Quiz', next: 'ADULT_QUIZ' },
      { input: '0', label: '0️⃣ 🔙 Back', next: 'MAIN' },
    ],
  },

  // ═══ 1. MEDIA LITERACY ═════════════════════════════════════════════════
  'adult.media': {
    type: 'menu',
    title: '📰 Media Literacy',
    body: 'Think critically about the information you consume and share online.\n\n👉 Please choose a topic:',
    options: [
      { input: '1', label: '1️⃣ 🌐 Media Literacy, Online Identity & Reputation', next: 'adult.media.identity' },
      { input: '0', label: '0️⃣ 🔙 Back', next: 'MAIN' },
    ],
  },
  'adult.media.identity': {
    type: 'lesson',
    title: 'Media Literacy, Online Identity & Reputation',
    parent: 'adult.media',
    parentLabel: 'Media Literacy',
    messages: [
      msg('💡 Did You Know?', 'Your digital footprint includes not just what you post — but what you like, share, and comment on too.'),
      msg('👣 Digital Footprint = all the information about you that exists online.', '', 'This includes:', '📸 Photos, videos, and posts you share', '💬 Comments and likes', '🔁 Content you repost or share from others', '📝 What others post about you', '🌐 Even websites you visit leave a trace'),
      msg('💡 To craft a positive digital footprint, before you post or share, use the THINK framework:', '✅ T — Is it TRUE?', '💡 H — Is it HELPFUL?', '🌟 I — Is it INSPIRING?', '📌 N — Is it NECESSARY?', '❤️ K — Is it KIND?', '', "If you can't answer YES to most of these — pause before posting."),
      msg('💼 Your online reputation affects your career.', '', 'Employers regularly check social media before hiring.', 'If you already have a job, your employer may also monitor your public activity.', '', "💡 Ask yourself: 'Would I be comfortable if my employer saw this?'"),
      msg('🧠 Confirmation Bias: We look for information that supports what we already believe.', '⚠️ This can spread misinformation — even with good intentions.', '', 'How to combat it:', '✅ Be aware of it', '✅ Seek out diverse perspectives and credible sources', '✅ Think objectively about all content and information sources', '✅ Pause before sharing — could this be misleading?'),
      msg('🫧 Echo Chamber = only seeing content that reflects your existing views.', '🙈 Caused by algorithms and confirmation bias together.', 'This can:', '→ Make it harder to consider different perspectives', '→ Spread misinformation faster', '→ Reinforce false beliefs', '', 'Signs you might be in an echo chamber:', '→ Everyone in your online groups agrees on everything', '→ Alternative perspectives are dismissed without evidence', '', '✅ Consciously follow diverse, credible sources.'),
      msg('🌍 How to break out of your echo chamber:', '', '✅ Consciously remain open-minded', '✅ Be aware of confirmation bias', '✅ Actively seek out different perspectives and news sources', '✅ Follow accounts with different viewpoints', '✅ Before sharing — check: is this from a credible source?'),
    ],
  },

  // ═══ 2. PRIVACY ════════════════════════════════════════════════════════
  'adult.privacy': {
    type: 'menu',
    title: '🔐 Privacy',
    body: 'Protect your information and respect the privacy of others.\n\n👉 Please choose a topic:',
    options: [
      { input: '1', label: '1️⃣ 🧾 Protecting Individual Privacy', next: 'adult.privacy.protecting' },
      { input: '2', label: '2️⃣ ⚙️ Managing Personal Information', next: 'adult.privacy.managing' },
      { input: '3', label: '3️⃣ 🧍 Online Identity & Reputation', next: 'adult.privacy.identity' },
      { input: '0', label: '0️⃣ 🔙 Back', next: 'MAIN' },
    ],
  },
  'adult.privacy.protecting': {
    type: 'lesson',
    title: 'Protecting Individual Privacy',
    parent: 'adult.privacy',
    parentLabel: 'Privacy',
    next: 'adult.privacy.managing',
    messages: [
      msg('💡 Did You Know?', 'A simple post revealing your location, ID details, or personal documents can put your safety and privacy at risk.'),
      msg('🪪 Personally Identifiable Information (PII) = any data that could identify you.', 'Common types of PII:', '', '🏠 Home address', '🆔 Government ID numbers', '🏦 Bank or credit card details', '🔬 Biometric data (fingerprints, face/retina scans)', '📍 Geo-tagged posts', '', "⚠️ Be careful about what you share publicly. Don't share sensitive info publicly."),
      msg('More PII you should protect:', '', '🏥 Medical history', '💼 Employment or financial status', '🤝 Cultural or group memberships', '👩‍👩‍👧‍👦 Social or family relationships', '', '⚠️ Be careful about what you share publicly — even small details combined can identify you.'),
      msg('🌍 Privacy is personal — and cultural.', '', 'What is considered private varies between individuals, families, and communities.', 'In some cultures, sharing family or financial information freely is normal.', 'In others, the same information is strictly private.', '', "There is no single 'correct' standard — but online, even culturally 'public' info can be misused.", 'Be aware of the risks specific to your context.'),
      msg('💡 Be aware of what you can and cannot post.', "📜 Understand the platform's Community Guidelines.", 'They often prohibit sharing sensitive private info about yourself OR others.', "🛑 Don't post Personally Identifiable Information (PII).", "🚫 Don't share someone else's personal info without their consent.", "This is known as 'doxxing' — and it can cause serious harm."),
    ],
  },
  'adult.privacy.managing': {
    type: 'lesson',
    title: 'Managing Personal Information',
    parent: 'adult.privacy',
    parentLabel: 'Privacy',
    next: 'adult.privacy.identity',
    messages: [
      msg('💡 Did You Know?', 'A quick privacy check today can prevent strangers from seeing personal details about your life tomorrow.'),
      msg('🧠 Be aware of what information you are sharing with others.', '🔧 Take control of your information.', '', '📝 Review your privacy settings on social media and apps.', '🎮 Third-Party App Access: What info are you giving to games or apps that connect to social media?', '📍 Location Services: Do you want apps tagging your location on posts?'),
      msg('Be thoughtful when sharing PII with applications, software, or tools you use.', '🎮 Third-party apps connected to your social media can access:', '📇 Your contacts list', '📍 Your location', '📷 Your camera and microphone', '👤 Your profile information and friends list', '', '✅ Regularly audit your app permissions:', 'Facebook: Settings → Apps and Websites', 'Instagram: Settings → Security → Apps and Websites', "→ Remove any apps you no longer use or don't recognise."),
      msg('📍 Geo-tagging = your posts can reveal exactly where you are (or were).', 'Risk: posting your location regularly reveals your routine — home, work, school.', '✅ Turn off location tagging unless you specifically want to share it.', 'Go to: Settings → Privacy → Location → Off'),
      msg('🔒 Consider the privacy settings in other places you interact with people online.', "🤝 Others' privacy matters too.", '📸 Ask before posting photos of other people.', "🔒 Don't share private conversations without consent.", "🚫 Avoid posting info about others that they'd want kept private."),
    ],
  },
  'adult.privacy.identity': {
    type: 'lesson',
    title: 'Online Identity & Reputation',
    parent: 'adult.privacy',
    parentLabel: 'Privacy',
    messages: [
      msg('💡 Did You Know?', 'Your online reputation is shaped not only by what you post, but also by how others interpret and share it.'),
      msg('💻 Digital Footprint = all of the info about an individual that exists online.', '', '🔗 Personal information shared', '🔁 Social media posts, audio files, photos, text and videos', '🤝 Interactions with family, friends, groups and organizations online'),
      msg('🪞 Online Identity = how you present yourself online.', '🌍 Online Reputation = how others perceive you based on what they find.', '', "You control your identity — but your reputation is shaped by others' interpretations."),
      msg('😀 Even emojis, memes, and articles you share shape your reputation.', "💡 Ask: 'What does my online activity say about me?'", "'Is that the message I want to send?'", 'Employers often review social media before making hiring decisions.'),
    ],
  },

  // ═══ 3. ONLINE SECURITY ════════════════════════════════════════════════
  'adult.security': {
    type: 'menu',
    title: '🛡️ Online Security',
    body: 'Secure your devices and accounts from threats.\n\n👉 Please choose a topic:',
    options: [
      { input: '1', label: '1️⃣ 📱 Managing Personal Security', next: 'adult.security.personal' },
      { input: '2', label: '2️⃣ 🌐 Managing Online Accounts', next: 'adult.security.accounts' },
      { input: '3', label: '3️⃣ 🚨 Managing Compromised Accounts', next: 'adult.security.compromised' },
      { input: '0', label: '0️⃣ 🔙 Back', next: 'MAIN' },
    ],
  },
  'adult.security.personal': {
    type: 'lesson',
    title: 'Managing Personal Security',
    parent: 'adult.security',
    parentLabel: 'Online Security',
    next: 'adult.security.accounts',
    messages: [
      msg('💡 Did You Know?', 'Using a strong, unique password for each account is one of the most effective ways to prevent hacking.'),
      msg('🔐 Lock your devices:', '→ Use a PIN, fingerprint, or face lock on your phone and laptop.', '→ Be careful who you let use them.', '→ Review installed applications and their permissions.', '→ Back up your devices regularly.'),
      msg('🖥️ Public and shared devices:', '→ Turn off autofill and password-storing features', '→ Log out of all accounts', '→ Use private browsing mode', '→ Implement security settings such as content filtering to protect young children'),
      msg('📶 Wireless networks:', '→ Change the default name of your wireless network', '→ Set a strong and unique password', '→ Enable network encryption', "→ Keep your router's software up-to-date", '', '📶 Avoid sensitive transactions (banking, passwords) on public Wi-Fi.', '→ Use mobile data instead when doing anything important.', '🚫 Avoid accessing personal accounts or sharing PII.', '🌐 Use a VPN connection on public wireless networks for better safety.'),
      msg('🌐 Applications, web browsers and cookies:', '⬇️ Only download applications from reputable vendors.', '🛡️ Check the privacy and security settings third-party applications access.', '', '🌐 Check the domain and subdomain name of websites you visit.', '🕵️ Hackers may also play with domains and subdomains:', '→ "https://facebook.notfacebook.com" — the actual domain here is NOT "Facebook"; it\'s "notfacebook".', '', '🍪 Cookies = small text files that uniquely identify your browser or device.'),
      msg('🔑 Use strong, unique passwords for every account.', "🆔 Don't use personal information.", "🔗 Don't share your passwords.", '📌 Do not post your passwords in an easy-to-find location.', '', '🔐 Enable Two-Factor Authentication (2FA):', '→ Adds a second step to login (e.g., a code sent to your phone).', "→ Even if hackers get your password, they can't get in without your phone.", '→ Turn on 2FA wherever possible!'),
    ],
  },
  'adult.security.accounts': {
    type: 'lesson',
    title: 'Managing Online Accounts',
    parent: 'adult.security',
    parentLabel: 'Online Security',
    next: 'adult.security.compromised',
    messages: [
      msg('💡 Did You Know?', 'Meta platforms offer security checkups that help you spot risks and strengthen your account protection.'),
      msg("⚡ Be proactive! Don't wait for a problem to review your security.", '🛠️ Use the Security Checkup tools on Facebook, Instagram, and WhatsApp.', '', 'Check:', "📍 Where you're currently logged in (remove unknown devices)", '📧 Your recovery email and phone number are up to date', '🔑 Your password strength', '✅ Which apps have permission to access your account'),
      msg('🔒 More good habits:', '🔄 Change passwords periodically — especially after a data breach', '⚠️ Be cautious when engaging with strangers online', '📵 Log out of shared/public devices after use', '🧹 Delete old accounts you no longer use'),
      msg('🔑 Password Generator vs. Password Manager — what\'s the difference?', '🔐 Password Manager: a secure vault that stores all your passwords.', '⚙️ Password Generator: automatically creates strong, random passwords for you.', 'Many password managers include a built-in generator.', '', '⚠️ Important: your master password (to open your manager) must be extremely strong and memorised.', 'If someone gets your master password — they get ALL your passwords.'),
    ],
  },
  'adult.security.compromised': {
    type: 'lesson',
    title: 'Managing Compromised Accounts',
    parent: 'adult.security',
    parentLabel: 'Online Security',
    messages: [
      msg('💡 Did You Know?', 'If your account is compromised, notifying your contacts quickly can stop the hacker from targeting them next.'),
      msg('Hacking = unauthorized access to your accounts or devices.', '⚠️ Once a hacker has access to your account, they may:', '', '🕵️ Install spyware or ransomware on connected devices', '💳 Steal your financial details or personal data', '📧 Access your email and impersonate you', '📡 Watch you via your webcam (if malware is installed)', '', 'This is why IMMEDIATE action is critical — every minute counts.'),
      msg('⚠️ Warning Signs — your account may be hacked if:', '', "✉️ You see posts or messages you didn't write", '🔑 Your password stops working', '🌍 You get login alerts from unknown locations or devices', '👀 Friends tell you they received strange messages from you', '🚨 Applications or programs crashing or taking a long time to load', '📈 Increased data usage for unexplained reasons', '📉 Significant slow-down on your device, programs or websites', '❓ Unexplained online activity or purchases'),
      msg('✅ What to do immediately:', "🏢 Go to the platform's Help Centre and select 'My account is hacked'", '🔄 Change your password — and any other accounts using the same password', '🛡️ Enable 2FA right away', '❓ Review account activity and remove unknown login sessions', "📢 Let your contacts know so they don't fall for scams from your account"),
      msg("🛡️ After recovering your account — don't stop there:", '', '→ Do NOT reuse the old compromised password', "→ Check which third-party apps have access and revoke any you don't recognise", '→ Update your recovery email and phone number', '→ Report the incident formally to the platform', '', '✅ A full security review after a breach helps prevent it happening again.'),
    ],
  },

  // ═══ 4. YOUTH ONLINE SAFETY & WELLBEING ════════════════════════════════
  'adult.youthsafety': {
    type: 'menu',
    title: '💚 Youth Online Safety & Well-Being',
    body: 'Navigate the digital world with confidence and connect with care.\n\n👉 Please choose a topic:',
    options: [
      { input: '1', label: '1️⃣ ⏱️ Managing Time on Instagram', next: 'adult.youthsafety.time' },
      { input: '2', label: '2️⃣ 🎛️ Options for Controlling Experience', next: 'adult.youthsafety.control' },
      { input: '3', label: '3️⃣ 👨‍👩‍👧 Parental Supervision', next: 'adult.youthsafety.parental' },
      { input: '4', label: '4️⃣ 🪪 Age Assurance', next: 'adult.youthsafety.age' },
      { input: '0', label: '0️⃣ 🔙 Back', next: 'MAIN' },
    ],
  },
  'adult.youthsafety.time': {
    type: 'lesson',
    title: 'Managing Time on Instagram',
    parent: 'adult.youthsafety',
    parentLabel: 'Youth Online Safety',
    next: 'adult.youthsafety.control',
    messages: [
      msg('💡 Did You Know?', "Instagram has built-in tools to help teens manage how much time they spend on the app — and they're on by default for Teen Accounts."),
      msg('⏱️ Instagram Time Management Tools:', '👁️ See Your Activity: check how much time you spend on Instagram', '⏰ Set a Reminder: get notified after a set time', '🔕 Mute Push Notifications: reduce distractions', '☕ Take a Break: step away and refresh', '🔄 Nudges: interrupt dwelling on the same type of content for too long, giving a grid of alternative recommended posts instead.'),
      msg('📱 Default Time Limits for Teen Accounts:', '🕐 A 1-hour daily limit: they receive a reminder to close the app', '💤 Sleep Mode: notifications are muted during this time', '👨‍👩‍👧 For supervised teens, parents can prevent Instagram use during restricted hours.'),
    ],
  },
  'adult.youthsafety.control': {
    type: 'lesson',
    title: 'Options for Controlling Experience',
    parent: 'adult.youthsafety',
    parentLabel: 'Youth Online Safety',
    next: 'adult.youthsafety.parental',
    messages: [
      msg('💡 Did You Know?', 'Teens have different levels of control depending on their age. Younger teens get stronger default protections, while older teens have more flexibility.'),
      msg('🎛️ Teen Safety Settings — teen default settings:', '📝 Content: what you see on Instagram', '📧 Contact: who can interact with them', '🕰️ Time management: how long the teen is spending online', '', "🔒 Early teens (13–15): Require a parent's permission to change to a less restrictive setting.", '🔓 Unsupervised late teens (16–17): Can change settings without parental permission.', "🎬 Teens under 18 are automatically set to the '13+' content option."),
      msg('🔒 Privacy Settings:', '🔐 Private account: teens must approve new followers.', "People who don't follow them can't see their content or interact with them.", '👦 Early teens (13–15): Automatically defaulted to private. Parental permission needed to switch to public.', '👧 Late teens (16–17): New late teens can choose during setup.'),
      msg('💬 Messaging Restrictions:', "📩 Teens can't receive DMs from people they don't follow or haven't connected with.", 'Teens 13–15 require parental permission to change these settings.', '🚨 Safety Notices: Instagram sends in-app alerts to teens when suspicious activity is detected.', "🏷️ Tags and Mentions: Teens can't be tagged or mentioned by people they don't follow.", '', "✅ Teens are prompted to: Block, Report, Ignore, or Restrict when something doesn't seem right."),
      msg('🛠️ Teens can use these tools to stay in control:', '', '🚩 Report: flag content or accounts that seem wrong', '🚫 Block: stop someone from seeing your profile or contacting you', '🔇 Mute: hide someone\'s posts without unfollowing them', '⚠️ Restrict: limit how someone can interact with you', '🔤 Hidden Words: Offensive DMs and comments are automatically hidden'),
    ],
  },
  'adult.youthsafety.parental': {
    type: 'lesson',
    title: 'Parental Supervision',
    parent: 'adult.youthsafety',
    parentLabel: 'Youth Online Safety',
    next: 'adult.youthsafety.age',
    messages: [
      msg('💡 Did You Know?', "Parental supervision on Instagram is opt-in and requires BOTH the teen and parent to agree. A parent can't secretly supervise a teen."),
      msg('👨‍👩‍👧 How Parental Supervision Works:', 'Step 1: The teen OR parent initiates the connection. Teens look for their parent\'s name — only mutual followers appear in search. Parents can also initiate from their own account or Family Center.', 'Step 2: The parent receives a request and learns about Teen Account protections already in place.', 'Step 3: The parent completes setup in Family Center.', 'Step 4: The supervision dashboard is now accessible to both parent and teen.', '', "💯 An individual must prove they are eligible to supervise a teen's account."),
      msg('📊 From the Parental Supervision Dashboard — parents can monitor:', '', "👁️ their teen's settings and account insights", '👥 followers, following, and blocked accounts', '📧 who can message and add their teen to groups', '🔞 how much sensitive content their teen sees', '⏱️ time spent on Instagram', '⏰ Set time limits and scheduled breaks', '', '📝 The teen can also view the dashboard from their Teen Safety Settings page.'),
      msg('👦 Teen experience:', 'Can only have ONE supervisor at a time.', 'An account that is being supervised cannot supervise another account.', '👨‍👩‍👧 Parent experience:', 'Can manage MULTIPLE teens.', '', '🚩 Parents can choose to let their teen modify their own safety settings.'),
    ],
  },
  'adult.youthsafety.age': {
    type: 'lesson',
    title: 'Age Assurance',
    parent: 'adult.youthsafety',
    parentLabel: 'Youth Online Safety',
    messages: [
      msg('💡 Did You Know?', 'Some teens may try to lie about their age online. Meta uses multiple layers of technology to detect this and keep teens in age-appropriate settings.'),
      msg('🪪 How Meta Assures Age:', '📹 Video selfie or ID check', '🤖 Age verification technology', '🚫 Limit teens from using a new, adult account', '', '✅ People can verify their age to reinstate the correct settings.'),
      msg('📚 Resources for Families:', '📖 Instagram Parents Guide → about.instagram.com/community/parents', '🛡️ Facebook Safety Center for Parents → fb.com/safety/parents', '❓ Help Centre → fb.com/help · fb.com/help/Instagram', '🔐 Meta Privacy Centre → fb.com/safety'),
    ],
  },

  // ═══ 5. AI LITERACY ════════════════════════════════════════════════════
  'adult.ai': {
    type: 'menu',
    title: '✨ AI Literacy',
    body: 'Understand Artificial Intelligence and use it safely in your daily and professional life.\n\n👉 Please choose a topic:',
    options: [
      { input: '1', label: '1️⃣ 🌐 Understanding and Engaging with AI', next: 'adult.ai.understanding' },
      { input: '2', label: '2️⃣ 🕵️ Recognising AI-Generated Content', next: 'adult.ai.recognising' },
      { input: '3', label: '3️⃣ 🛠️ Using AI as a Practical Tool', next: 'adult.ai.practical' },
      { input: '4', label: '4️⃣ 🔒 AI Safety and Protection', next: 'adult.ai.safety' },
      { input: '5', label: '5️⃣ 🌍 AI and Your Future', next: 'adult.ai.future' },
      { input: '0', label: '0️⃣ 🔙 Back', next: 'MAIN' },
    ],
  },
  'adult.ai.understanding': {
    type: 'lesson',
    title: 'Understanding and Engaging with AI',
    parent: 'adult.ai',
    parentLabel: 'AI Literacy',
    next: 'adult.ai.recognising',
    messages: [
      msg('💡 Did You Know?', 'You are already an AI user. Mobile banking fraud alerts, WhatsApp voice note transcription, and Google Maps traffic predictions are all powered by Artificial Intelligence.'),
      msg('🤖 AI = a technology that enables computers to do things that require human thinking and intelligence, such as:', 'Learning', 'Reasoning', 'Problem-solving', 'Understanding language', 'Creativity', '', "⚠️ Key distinction: AI does not 'think' the way humans do."),
      msg('✍️ Learn from examples: studies millions of data such as pictures, texts, videos, sounds.', '🔄 Practice and Improve: It tries using the data again and again, getting better each time.', '🔮 Make Predictions or Decisions: It guesses, responds, or solves based on what it has learned.', '⚡ Helps do things faster: from personalized suggestions to automation.'),
      msg('🖥️ Machine Learning: How AI learns from examples without being told every rule.', '🎨 Generative AI: AI that creates new content based on patterns it has learned. → Mimics human intelligence → ChatGPT, Meta AI, image generators.', '🧠 Artificial General Intelligence: AI that can think, learn, and solve problems at a human-like level. → Understand and act like a human.', '⚙️ Algorithm: A set of rules or instructions that tells a computer how to make decisions. → Social media feeds, product recommendations.', '💬 Natural Language Processing: What allows AI to understand and use human language. → Chatbots, translation tools, voice assistants.', '', '💡 Understanding these concepts helps you use AI more confidently and safely.'),
    ],
  },
  'adult.ai.recognising': {
    type: 'lesson',
    title: 'Recognising AI-Generated Content',
    parent: 'adult.ai',
    parentLabel: 'AI Literacy',
    next: 'adult.ai.practical',
    messages: [
      msg('💡 Did You Know?', 'AI can now generate fake photos, fake news articles, fake voice recordings, and fake videos that are increasingly difficult to detect. This makes critical thinking more important than ever.'),
      msg('📲 AI-generated misinformation can affect your:', 'Finances: Scam messages from "your bank"', 'Health: False medical advice presented convincingly by AI', 'Safety: Fake emergency announcements or government notices', 'Community: Fake news and images about local policies or public figures', '', '🧠 Awareness = Protection: learn and understand how to spot them.', '❓ Ask yourself: Does this sound like how real people would write or speak?', '⚠️ If someone you know sends a voice or video message asking for money, personal information, or urgent action — verify through a different method.'),
      msg('🔍 Signs that content may be AI-generated or manipulated:', '🖼️ Images:', '→ Physical features: perfect or unnatural face, extra or missing fingers', '→ Backgrounds: inconsistent lighting, strange background', '→ Text in images is blurry or unreadable', '📝 Text:', '→ Sounds too formal or polished', '→ Missing local expressions or slang', '→ Emotionless writing', '🎤 Audio/Video:', '→ Robotic quality or unnatural pauses in voice', "→ Lip movements don't match words precisely", '→ Inconsistent lighting or blurring around the face'),
    ],
  },
  'adult.ai.practical': {
    type: 'lesson',
    title: 'Using AI as a Practical Tool',
    parent: 'adult.ai',
    parentLabel: 'AI Literacy',
    next: 'adult.ai.safety',
    messages: [
      msg('💡 Did You Know?', 'AI tools are widely available. You can use them to draft professional messages, translate documents, plan your week, or get quick answers without needing any special skills.'),
      msg('🛠️ You are already using AI every day.', '→ Recommendation AI: YouTube video suggestions', '→ Translation AI: Google Translate, WhatsApp translation', '→ Safety AI: Face recognition unlocks your phone, spam filters protect your email', '→ Behind-the-Scenes AI: your camera automatically focusing on faces', '', "✅ You're not an AI beginner."),
      msg('Practical uses for AI in daily and professional life:', '✉️ Professional communication:', '→ Draft formal letters, complaint letters, or job application messages', '→ Translate documents between languages', '🏢 Business and work:', '→ Research topics quickly and get summaries', '→ Generate ideas for community projects or presentations', '👨‍👩‍👧 Family and personal life:', "→ Translate forms or official notices you don't fully understand", '→ Find information about health symptoms (then verify with a doctor)', '', '⚠️ Always review AI output before using it. AI can make mistakes.'),
      msg('🧠 AI gives you a starting point, not a final answer.', '✅ Best practice:', '→ Use AI to draft or research', '→ Translate content', '→ Learn a new language or skill', '⚠️ Never use AI output for decisions involving:', '→ Medical diagnosis or treatment', '→ Financial commitments', '→ Family and relationships', '⚠️ For these areas, always consult a qualified human professional.'),
      msg('💬 A PROMPT is the instruction you give to an AI tool.', 'The quality of the output depends heavily on the quality of your prompt.', '✅ A strong prompt includes:', '→ WHO the content is for (your audience)', '→ WHAT you need (specific task)', '→ TONE (formal, friendly, urgent, professional)', '→ Any important details (length, language, local context)'),
      msg('🎯 Try it: Imagine you want to use Meta AI to draft a complaint letter to Ethiopian Electric Power over a series of power blackouts.', '💬 Write your own prompt for this task — what details would you include?', 'Reply with your prompt or reply NEXT ➡️ to continue.'),
    ],
  },
  'adult.ai.safety': {
    type: 'lesson',
    title: 'AI Safety and Protection',
    parent: 'adult.ai',
    parentLabel: 'AI Literacy',
    next: 'adult.ai.future',
    messages: [
      msg('💡 Did You Know?', 'AI scams are becoming more sophisticated, including fake voice messages that clone the voices of people you know. Knowing the tactics protects you and your family.'),
      msg('🔎 Use VERIFY when you encounter suspicious content:', '→ V — View the source: Who created it? Is it trustworthy or official?', '→ E — Examine the details: Are there spelling errors, strange photos, or dramatic language?', '→ R — Research Elsewhere: Look for the same info on trusted news or websites.', '→ I — Investigate with Tools: Use reverse image search or fact-checking sites like Ethiopia Check.', "→ F — Focus on Impact: Could this harm someone if it's false?", "→ Y — Yield to Experts: Ask a subject-matter professional when it's serious.", '', '✅ Pause before you share. Once misinformation spreads, it is hard to take back.'),
      msg('🛡️ Be mindful of how you share your data.', '🚩 Red Flags:', '→ AI apps asking for too many permissions', '→ Free tools asking for sensitive info', '→ Apps that pressure you to act immediately', '→ Pressure to download or sign up immediately', '→ Offers that seem too good to be true', '', "🛑 Be especially careful with apps or services that aren't well-established in Ethiopia.", '→ May not follow the same privacy standards.', '→ May not have local customer support if something goes wrong.'),
      msg('✅ Safe to Share:', '→ General location (e.g., your city or country)', '→ Non-sensitive photos and creative content', '→ Public info and general questions', '', '🚫 Not Safe to Share:', '→ Bank account numbers or internet banking details', '→ Government ID or passport info', '→ Private conversations, voice notes, or images of others', '→ Photos of your home, children, or ID documents'),
      msg('Your AI literacy protects not just you but your whole network.', '🧑‍🏫 Teach Others:', '→ Share the VERIFY method with family members', '→ Help elderly relatives recognize suspicious content', '→ Teach children about AI content they might encounter online', '', '☢️ When You Encounter Harmful Content:', "→ Don't share it further (even to warn people — this can spread it more)", '→ Report it on the platform using official reporting tools', '→ Inform affected people directly through private messages', '→ Contact authorities for serious threats or scams.', '', '✅ Digital literacy is a community resource — the more people know, the safer everyone becomes.'),
    ],
  },
  'adult.ai.future': {
    type: 'lesson',
    title: 'AI and Your Future',
    parent: 'adult.ai',
    parentLabel: 'AI Literacy',
    messages: [
      msg('💡 Did You Know?', 'AI is not simply replacing jobs; it is changing what skills are most valued. Critical thinking, cultural knowledge, and the ability to guide AI tools are becoming increasingly important across many fields.'),
      msg("💼 You don't need to become a programmer to thrive in an AI-enabled workplace.", 'Powerful skills to have in the AI future:', '🧩 Critical Thinking: Question information → Evaluate sources → Make sound judgments', '📱 Digital and Data Literacy: Understand data and how tech works → learn how to use or interpret it', '🖥️ Computational Thinking: Breaking down problems into smaller steps → Spotting patterns → providing instructions → creating logical processes that an AI can follow', '🎨 Creativity: Use AI to support your imagination, not to replace it → Solve problems → Bring new ideas to life'),
      msg("You don't need to start over:", '🛠️ Add AI skills to your current role', '✍️ Learn AI applications in your industry', '🎯 Specialize in AI training or support', '💬 Consult or freelance (advise small businesses on AI tools)', '', 'Your skills are transferable:', '📞 Customer service → valuable for training AI chatbots', '🛍️ Sales or marketing → valuable for AI content tools', '🗄️ Administration → valuable for data preparation work', '🧑‍🏫 Teaching or training → valuable for AI education roles', '', '🗺️ Your cultural and local knowledge matters.'),
      msg('Practical Approach:', '🤔 Stay curious about new AI tools relevant to your industry', "🙈 Don't fear making mistakes while learning — everyone is learning together", '📢 Share knowledge with colleagues — teaching others reinforces your own learning', '✨ Focus on understanding principles, not memorizing specific tools', '', "🛠️ AI is a powerful tool, but you bring the wisdom, context, and purpose to how it's used."),
    ],
  },
};
