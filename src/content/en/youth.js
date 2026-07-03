'use strict';

/**
 * Youth Track (Ages 13–17) — module menus and lessons.
 * See system.js for the shared content model.
 */

// Small helper to keep lesson authoring readable.
const msg = (...lines) => lines.join('\n');

module.exports = {
  // ─── Youth module menu ────────────────────────────────────────────────
  'youth.menu': {
    type: 'menu',
    title: '🧒 Youth Module',
    body: [
      "🎉 Great! You've selected the Youth Track.",
      '📚 Learn about online safety, privacy, and more.',
      '✍️ What would you like to learn about today?',
    ].join('\n'),
    options: [
      { input: '1', label: '1️⃣ 🌐 Digital Foundations', next: 'youth.foundations' },
      { input: '2', label: '2️⃣ 💚 Digital Wellness', next: 'youth.wellness' },
      { input: '3', label: '3️⃣ 🤝 Digital Engagement', next: 'youth.engagement' },
      { input: '4', label: '4️⃣ 💻 Digital Opportunities', next: 'youth.opportunities' },
      { input: '5', label: '5️⃣ 🛡️ Online Safety & Well-Being', next: 'youth.safety' },
      { input: '6', label: '6️⃣ 🤖 AI Literacy', next: 'youth.ai' },
      { input: '7', label: '7️⃣ 🧠 Quiz', next: 'YOUTH_QUIZ' },
      { input: '0', label: '0️⃣ 🔙 Back', next: 'MAIN' },
    ],
  },

  // ═══ 1. DIGITAL FOUNDATIONS ════════════════════════════════════════════
  'youth.foundations': {
    type: 'menu',
    title: '🌐 Digital Foundations',
    image: '/img/foundations.png',
    body: 'The basics of staying safe online. Pick a topic:',
    options: [
      { input: '1', label: '1️⃣ 🔐 Introduction to Privacy', next: 'youth.foundations.privacy-intro' },
      { input: '2', label: '2️⃣ 👤 Privacy and You', next: 'youth.foundations.privacy-you' },
      { input: '3', label: '3️⃣ 🔑 Passwords', next: 'youth.foundations.passwords' },
      { input: '4', label: '4️⃣ ⚠️ Cybersecurity, Phishing & Spam', next: 'youth.foundations.cyber' },
      { input: '0', label: '0️⃣ 🔙 Back', next: 'MAIN' },
    ],
  },
  'youth.foundations.privacy-intro': {
    type: 'lesson',
    title: 'Introduction to Privacy',
    parent: 'youth.foundations',
    parentLabel: 'Digital Foundations',
    next: 'youth.foundations.privacy-you',
    messages: [
      { image: '/img/privacy-intro.png', text: "💡 *Privacy = control.*\nIt's not about hiding everything — it's about deciding who knows what about you." },
      { text: "Your birthday isn't a secret — lots of people know it. But it can still feel private.\n\n_Privacy isn't the same as secrecy._" },
      { text: '🏫 It also depends on context.\nYou might share your home address with your school — but not with a stranger online.' },
      { text: 'So before you share, ask yourself:\nis this the *right person, place and reason*?' },
    ],
  },
  'youth.foundations.privacy-you': {
    type: 'lesson',
    title: 'Privacy and You',
    parent: 'youth.foundations',
    parentLabel: 'Digital Foundations',
    next: 'youth.foundations.passwords',
    messages: [
      { image: '/img/privacy-you.png', text: '⚙️ *Every post is a privacy choice.*\nBefore you share, think about your audience.' },
      { text: 'Privacy settings — *Friends only* or *Public* — control who sees what.\nFind them in Settings → Privacy.' },
      { text: '🤔 Quick one: would you share your home address with a teacher? A new online friend? A company?\n\nThere\'s no single right answer — context decides.' },
      { text: "One catch: settings don't hide everything.\n*Metadata* (when and where you posted) and 🍪 *cookies* still leave a trail." },
    ],
  },
  'youth.foundations.passwords': {
    type: 'lesson',
    title: 'Passwords',
    parent: 'youth.foundations',
    parentLabel: 'Digital Foundations',
    next: 'youth.foundations.cyber',
    messages: [
      { image: '/img/passwords.png', text: '🔐 *A password is a lock on your digital life.*\nThe stronger it is, the safer you are.' },
      { text: 'The secret is *length*.\nA passphrase of 4 random words — like river-mango-blue-star — beats a short, complex one.' },
      { text: 'Hackers use programs that guess millions of passwords a second.\nShort ones fall in seconds; long passphrases take *years*.' },
      { text: '🛡️ Add a second lock: *two-factor authentication* (a code sent to your phone).\nEven a stolen password won\'t get them in.' },
      { text: 'And never share it.\nNo real company will *ever* ask for your password by message.' },
    ],
  },
  'youth.foundations.cyber': {
    type: 'lesson',
    title: 'Cybersecurity, Phishing & Spam',
    parent: 'youth.foundations',
    parentLabel: 'Digital Foundations',
    messages: [
      { image: '/img/cyber.png', text: '🎣 *Phishing* is a fake message designed to steal your info.\nLearning the signs protects you better than any app.' },
      { text: '🚩 Red flags:\nurgent threats, bad spelling, strange links, surprise prizes, or anyone asking for your password.' },
      { text: 'If you take the bait, someone can impersonate you or lock you out of your accounts.\nSo never tap links you didn\'t expect.' },
      { text: '✅ Safe habits:\ncheck the web address, download apps only from official stores, and report & block spammers.' },
    ],
  },

  // ═══ 2. DIGITAL WELLNESS ═══════════════════════════════════════════════
  'youth.wellness': {
    type: 'menu',
    title: '💚 Digital Wellness',
    body: 'Build a positive online life and protect your well-being.\n\n👉 Please choose a topic:',
    options: [
      { input: '1', label: '1️⃣ ⭐ Online Reputation', next: 'youth.wellness.reputation' },
      { input: '2', label: '2️⃣ 📱 Social Media & Sharing', next: 'youth.wellness.social' },
      { input: '3', label: '3️⃣ 🧍 Online Presence', next: 'youth.wellness.presence' },
      { input: '0', label: '0️⃣ 🔙 Back', next: 'MAIN' },
    ],
  },
  'youth.wellness.reputation': {
    type: 'lesson',
    title: 'Online Reputation',
    parent: 'youth.wellness',
    parentLabel: 'Digital Wellness',
    next: 'youth.wellness.social',
    messages: [
      msg('💡 Did You Know?', 'Future employers and universities often search for you online before making decisions about you.'),
      msg('Your audience depends on your privacy settings.', '', '🌐 Your online reputation = what others think of you based on what they find online.', '🔎 Future employers, schools, and new friends might search for your name.', 'Try it: search for your own name right now. What do you find?'),
      msg('📢 The Audience Problem:', '', 'When you post something, you choose your INTENDED audience.', 'Once it\'s online, it can reach a much WIDER audience through shares, screenshots, reposts.', '', 'Content shared with friends can reach colleagues, family, employers — people you never intended to see it.', 'Always post as if the widest possible audience could see it.'),
      msg("❌ Found content you don't like online?", '', "Here's what you can do:", '🗑️ Ask the person who posted it to remove it', '🚩 Report it to the platform', '✨ Create more positive content to push it down in search results', '⚖️ In some cases, you may have legal rights to request removal'),
    ],
  },
  'youth.wellness.social': {
    type: 'lesson',
    title: 'Social Media & Sharing',
    parent: 'youth.wellness',
    parentLabel: 'Digital Wellness',
    next: 'youth.wellness.presence',
    messages: [
      msg('💡 Did You Know?', 'If you have 300 followers and each shares your post with 300 people, up to 90,300 people could see it!'),
      msg('👀 Who is your AUDIENCE?', 'Your posts can reach far more people than you think.', '🔁 Once something is shared, it can spread — fast.', "♻️ Once something is shared, it's hard to take back.", '✋ Think before you post. Can this be misunderstood? Could it hurt someone?', '', '⚙️ Review your privacy settings and decide who you want to see your content.'),
      msg('🔥 Content can go VIRAL — spreading fast and far out of your control.', 'Viral can be positive (sharing important news) or negative (embarrassing moments).', 'A private video shared without permission could damage your reputation.', '', '➡️ Review your privacy settings and decide who you want to see your content.'),
      msg("⚙️ Privacy settings differ by platform — here's a quick guide:", '', '📘 Facebook: Settings → Privacy → Who can see your posts?', '📸 Instagram: Settings → Privacy → Account → Private Account', '💬 WhatsApp: Settings → Privacy → Who can see my info', '', 'Review each platform you use and set it intentionally.'),
    ],
  },
  'youth.wellness.presence': {
    type: 'lesson',
    title: 'Online Presence',
    parent: 'youth.wellness',
    parentLabel: 'Digital Wellness',
    messages: [
      msg('💡 Did You Know?', 'Even though you control what you post online, your digital story is also shaped by what others share about you.'),
      msg('✅ What YOU control:', '→ Your own posts, photos, and stories', '→ Your username and bio', '→ Your comments', '', "❌ What you DON'T directly control:", '→ What others post about you', '→ Screenshots others take', '→ Tags from others'),
      msg("🛠️ But you're not helpless! You can:", '', '🏷️ Untag yourself from posts', '🙏 Ask someone to remove content', '🚨 Report harmful content to the platform', '⛔ Block users who post about you without consent'),
    ],
  },

  // ═══ 3. DIGITAL ENGAGEMENT ═════════════════════════════════════════════
  'youth.engagement': {
    type: 'menu',
    title: '🤝 Digital Engagement',
    body: 'Interact with others online respectfully and build healthy relationships.\n\n👉 Please choose a topic:',
    options: [
      { input: '1', label: '1️⃣ 🤝 Respect & Boundaries', next: 'youth.engagement.respect' },
      { input: '2', label: '2️⃣ ❤️ Healthy Online Relationships', next: 'youth.engagement.relationships' },
      { input: '0', label: '0️⃣ 🔙 Back', next: 'MAIN' },
    ],
  },
  'youth.engagement.respect': {
    type: 'lesson',
    title: 'Respect & Boundaries',
    parent: 'youth.engagement',
    parentLabel: 'Digital Engagement',
    next: 'youth.engagement.relationships',
    messages: [
      msg('💡 Did You Know?', 'Personal boundaries exist online too — and respecting them shows empathy, maturity, and digital responsibility.'),
      msg('💡 Respect others like you would offline.', '', '🏷️ What feels like a joke to you might feel like an invasion of privacy to someone else.', '📸 Always ask before tagging a friend in a photo.', '🤔 Ask yourself: would THEY be okay with this post?', '🤝 Respecting boundaries builds trust.'),
      msg('📜 Platforms like Facebook, WhatsApp and Instagram have Community Standards.', '⚖️ The policies try to balance freedom of expression and safety.', "These rules decide what is and isn't allowed.", 'Violations can lead to content removal or account suspension.', '', '✅ Anyone can report content. Reports are anonymous and reviewed 24/7.'),
      msg("💭 Before you act online, ask: 'How would I feel if this happened to me?'", '', 'Scenario: Someone screenshots a private conversation and shares it.', '→ How would the sender feel?', "→ Is it okay because 'it was just a private chat'?", '', "True digital respect means thinking about the other person's experience, not just your own intention."),
    ],
  },
  'youth.engagement.relationships': {
    type: 'lesson',
    title: 'Healthy Online Relationships',
    parent: 'youth.engagement',
    parentLabel: 'Digital Engagement',
    messages: [
      msg('💡 Did You Know?', "An 'upstander' is someone who takes positive action when they see bad behaviour online — not just a bystander."),
      msg('💚 Healthy relationships are built on trust and respect — both online and offline.', '✅ Healthy Signs:', '', '🤝 Mutual respect and support', "🔒 Respecting each other's privacy", '💬 Kind, clear communication'),
      msg('❌ Unhealthy Signs:', '', '🔑 Pressure to share passwords', '📲 Constant messaging / over-messaging', '😠 Spreading rumours online', '⛓️ Controlling behaviour (checking your phone, demanding replies)', '⚠️ Threatening to share private content'),
      msg("📲 What is 'over-messaging'?", 'Over-messaging = sending so many messages that the other person feels overwhelmed or controlled.', "It can start small: 'Why aren't you replying?' → escalating to checking on someone constantly.", 'If someone asks you to message less — respect that. If it continues, it may be a pattern of control.', '', 'If a FRIEND is experiencing this, reach out privately and support them.'),
      msg('🦸 Be an UPSTANDER:', '👀 Bystander = sees unhealthy behaviour, does nothing.', '🦸 Upstander = takes positive action to help.', '', 'Ways to be an upstander:', '→ Check in privately with the person being targeted', '→ Support the victim', '→ Report the behaviour to the platform', '→ Tell a trusted adult if things escalate'),
      msg('🛠️ Tools to protect yourself on Meta Platforms:', '', '❌ Unfriend: Remove someone from your friend list.', "🚫 Unfollow: Stop seeing someone's posts in your News Feed.", '📵 Block: Stops someone contacting you or seeing your profile.', '🔕 Mute: Hides someone\'s posts without unfriending them.', "🔒 Restrict: Limits their interactions quietly — they won't know.", "🚨 Report: Anonymous. Reviewed by Meta's safety team 24/7."),
    ],
  },

  // ═══ 4. DIGITAL OPPORTUNITIES ══════════════════════════════════════════
  'youth.opportunities': {
    type: 'menu',
    title: '💻 Digital Opportunities',
    body: 'Understand the technology behind your online experience.\n\n👉 Please choose a topic:',
    options: [
      { input: '1', label: '1️⃣ 🤖 Social Media & Algorithms', next: 'youth.opportunities.algorithms' },
      { input: '0', label: '0️⃣ 🔙 Back', next: 'MAIN' },
    ],
  },
  'youth.opportunities.algorithms': {
    type: 'lesson',
    title: 'Social Media & Algorithms',
    parent: 'youth.opportunities',
    parentLabel: 'Digital Opportunities',
    messages: [
      msg('💡 Did You Know?', "Social media algorithms are designed to show you content you'll engage with — which can create an 'echo chamber' of only one viewpoint."),
      msg('⚙️ An ALGORITHM is a set of rules a computer follows.', '📱 On social media, algorithms predict what you want to see and decide what appears in your feed based on:', '', '👍 What you like', '🔁 What you share', '⏱️ How long you watch a video', '🔎 What you search for'),
      msg('✨ Actively curate the content you see through:', '🚫 Unfollowing and muting accounts', '🤫 Using "muted" words', '⭐ Setting preferences to "Favourites" or "Latest"', '', '🚫 Avoiding interacting with, commenting on, or sharing posts you dislike.', '🤝 Intentionally engage with content you want to see more of.'),
      msg('📊 Platforms collect data about you that informs the algorithm on your feed:', '', 'Facebook/Instagram let you download your data:', '→ Facebook: Settings → Your Facebook Information → Download Your Information', '→ Instagram: Settings → Security → Download Data', '', 'Try it! You might be surprised what they know about you.', 'This data helps the algorithm — and advertisers — target you more precisely.'),
    ],
  },

  // ═══ 5. ONLINE SAFETY & WELL-BEING ═════════════════════════════════════
  'youth.safety': {
    type: 'menu',
    title: '🛡️ Online Safety & Well-Being',
    body: 'Manage your time and control your experience on social media.\n\n👉 Please choose a topic:',
    options: [
      { input: '1', label: '1️⃣ ⏱️ Managing Time on Instagram & Facebook', next: 'youth.safety.time' },
      { input: '2', label: '2️⃣ 🎛️ Controlling Your Experience', next: 'youth.safety.control' },
      { input: '3', label: '3️⃣ 👶 Age-Appropriate Experiences', next: 'youth.safety.age' },
      { input: '0', label: '0️⃣ 🔙 Back', next: 'MAIN' },
    ],
  },
  'youth.safety.time': {
    type: 'lesson',
    title: 'Managing Time on Instagram & Facebook',
    parent: 'youth.safety',
    parentLabel: 'Online Safety',
    next: 'youth.safety.control',
    messages: [
      msg('💡 Did You Know?', "It's easy to lose track of time scrolling — Instagram has built-in tools to help you be more intentional with your time."),
      msg('💭 Before we look at the tools — a quick reflection:', '', '→ How do you balance online and offline time?', '→ Have you ever felt pressure to stay connected?', "→ What are YOUR warning signs that you've been online too long?", '', 'Awareness is the first step.'),
      msg('📊 Instagram tools overview:', '', '📊 Activity Dashboard: See your daily and weekly time on Instagram.', "⏰ Daily Reminder: Set a time limit — Instagram notifies you when you've hit it.", '🔕 Quiet Mode: Mutes notifications for set hours (e.g., during homework or sleep).', '☕ Take a Break: Reminds you to step away after scrolling for a while.', "🔔 Nudges: Suggests new content when you're stuck in a loop."),
      msg('📊 Facebook tools overview:', '', '📊 Your Time on Facebook: See average time per day you spend using Facebook.', "⏰ Daily limits: Set a time limit — Facebook notifies you when you've hit it.", '🔕 Sleep mode: Mutes notifications for set hours (e.g., during homework or sleep).'),
    ],
  },
  'youth.safety.control': {
    type: 'lesson',
    title: 'Controlling Your Experience',
    parent: 'youth.safety',
    parentLabel: 'Online Safety',
    next: 'youth.safety.age',
    messages: [
      msg('💡 Did You Know?', 'You have more control over your online experience than you think — from who can message you to what comments you see.'),
      msg('🎛️ You have control over who interacts with you on Meta Platforms:', '', '🚨 Report: Anonymous. Tell Meta about harmful accounts, posts, or DMs.', "⛔ Block: Stops someone contacting you or seeing your profile. They're not notified.", "🔒 Restrict: Limits their interactions quietly — they won't know.", '🔕 Mute: Hides their posts without unfriending.', '👋 Unfriend: Remove someone from your friends list.', '🏷️ Tags and Mentions: Switch off the ability for people to tag or mention you.', '', '💬 Control your DMs: Decide who can send you messages.'),
      msg('🔐 More safety tools:', '⚠️ Safety Notices: Alert you when a suspicious adult tries to contact you, giving you the option to end the conversation, block, report or restrict that adult.', '🙈 Sensitive Content Controls: Choose how much sensitive content you see.', '🚫 Hidden Words: Auto-hides DMs with abusive language — you never see them.', '', '📌 Pinned Comments: Pin a positive comment to set a good tone on your posts.'),
      msg('📱 WhatsApp tip:', 'You can control who adds you to groups:', '→ Settings → Account → Privacy → Groups', '→ Choose: Everyone | My Contacts | My Contacts Except', "Group admins who can't add you will be prompted to send you an invite instead."),
    ],
  },
  'youth.safety.age': {
    type: 'lesson',
    title: 'Age-Appropriate Experiences',
    parent: 'youth.safety',
    parentLabel: 'Online Safety',
    messages: [
      msg('💡 Did You Know?', 'Meta platforms design special safety features to make online spaces more age appropriate for teens.'),
      msg('👨‍👩‍👧 Family Centre — Parental Supervision Tools:', '', 'Parents/guardians can:', '✅ Check how much time you spend on Instagram', '✅ Set time limits and scheduled breaks', '✅ See the accounts you follow', '✅ Review your privacy and messaging settings', '📣 Both you AND your parent must agree to supervision.', '', "You'll get 72 hours' notice before any changes take effect."),
      msg('🔒 Private by Default:', "If you're under 16 and new to Instagram, your account is automatically set to PRIVATE.", '→ People must request to follow you.', '→ Messages go to a request folder.'),
    ],
  },

  // ═══ 6. AI LITERACY ════════════════════════════════════════════════════
  'youth.ai': {
    type: 'menu',
    title: '🤖 AI Literacy',
    body: 'Learn the basics of AI, create with AI, and stay safe in an AI-driven world.\n\n👉 Please choose a topic:',
    options: [
      { input: '1', label: '1️⃣ 🔎 Understanding AI', next: 'youth.ai.understanding' },
      { input: '2', label: '2️⃣ 🕵️ Spotting AI Content', next: 'youth.ai.spotting' },
      { input: '3', label: '3️⃣ 🎨 Creating with AI', next: 'youth.ai.creating' },
      { input: '4', label: '4️⃣ ⚠️ AI Ethics and Safety', next: 'youth.ai.ethics' },
      { input: '5', label: '5️⃣ 🔒 Staying Safe with AI', next: 'youth.ai.safety' },
      { input: '6', label: '6️⃣ 🤖 AI & Your Future', next: 'youth.ai.future' },
      { input: '0', label: '0️⃣ 🔙 Back', next: 'MAIN' },
    ],
  },
  'youth.ai.understanding': {
    type: 'lesson',
    title: 'Understanding AI',
    parent: 'youth.ai',
    parentLabel: 'AI Literacy',
    next: 'youth.ai.spotting',
    messages: [
      msg('💡 Did You Know?', 'You have already been using Artificial Intelligence today. Every time you watch a YouTube video or scroll Instagram, AI is working behind the scenes!'),
      msg('🤖 AI = Artificial Intelligence.', '💡 AI = computers or machines that are made to think and learn like people.', '📱 AI is not science fiction. It is already part of your everyday life:', '→ YouTube suggesting videos you might like', '→ WhatsApp transcribing your voice notes to text', '→ Instagram filters that follow your face', '→ Google Translate turning Amharic into English in real time'),
      msg('📚 AI is like a student who never gets tired.', '🧐 It reads millions of books, images, and videos.', "✍️ Keeps learning by trying things over and over, and checking if it's right.", '🌀 It spots patterns — like how a cat always has whiskers and pointy ears.', "🔮 It uses those patterns to make predictions: 'Is this picture a cat or a dog?'", '', '🔄 The more data AI sees, the smarter it gets.'),
      msg('🧰 AI is a toolbox that supports you.', '', "🖌️ AI is a tool like a paintbrush — it can't paint without the person using it.", "✨ It's here to help you enhance your work, not do it for you.", '🌟 It relies on your creativity, judgement, and guidance.', '✅ You decide what to ask, what to accept, and what to change.'),
      msg("❤️ AI can recognize emotions in text, but doesn't actually feel them.", '🤡 AI struggles with humor, especially cultural jokes.', '🪄 AI can combine ideas in new ways, but needs humans to guide creativity.', "🧠 AI can't behave like a human or apply common sense.", '', '💡 AI does not have feelings, common sense, or cultural understanding.'),
      msg('🤔 Quick reflection: Which AI feature do YOU use most often on your phone?', 'Reply with your answer or reply NEXT ➡️ to continue.'),
    ],
  },
  'youth.ai.spotting': {
    type: 'lesson',
    title: 'Spotting AI Content',
    parent: 'youth.ai',
    parentLabel: 'AI Literacy',
    next: 'youth.ai.creating',
    messages: [
      msg('💡 Did You Know?', 'AI-generated images, text, and audio are getting more realistic every day. But there are still clues you can look for. Knowing these clues is a superpower!'),
      msg('📸 AI can create photos of people who DO NOT EXIST.', '🔍 How to spot an AI image:', '→ Hands often look strange — too many or too few fingers.', '→ Backgrounds can blur or repeat unnaturally.', '→ Lighting on the face may not match the background.', '→ Text inside images is often blurry or nonsensical.', "🧠 Always look carefully before sharing a photo, especially 'news' photos."),
      msg('📝 AI can write essays, posts, and messages.', '🕵️ AI writing often sounds:', '🤵 Very formal, like a textbook even in casual conversations.', '👌 Too perfect, with no typos or local expressions.', '🕉️ Missing local slang, humour, or cultural references.'),
      msg('🎵 AI can now clone voices and create fake videos.', "⚠️ Deepfakes = AI-generated videos where a person's face or voice is replaced.", '🚨 Why these matter:', '🎭 Fake videos of public figures can spread false information.', '💀 Scammers use a cloned voice to pretend to be a family member asking for money.', '', '✅ If you get an urgent message, even a voice message, verify through another method.'),
    ],
  },
  'youth.ai.creating': {
    type: 'lesson',
    title: 'Creating with AI',
    parent: 'youth.ai',
    parentLabel: 'AI Literacy',
    next: 'youth.ai.ethics',
    messages: [
      msg('💡 Did You Know?', 'AI can help you write, draw, and create. But your ideas, culture, and creativity are what make the output truly meaningful. AI is your assistant, not your replacement!'),
      msg('🎨 Generative AI = AI that CREATES new content. It can generate:', '📝 Text: essays, stories, messages, captions', '🖼️ Images: artwork, illustrations, designs', '🎵 Music: songs and beats', '🎬 Short videos', '', '💡 Examples you might already know:', 'Meta AI (inside WhatsApp, Facebook, Instagram)', 'ChatGPT', 'Bing Image Creator', '', '🤖 These tools learn from millions of human-created works, then generate new combinations.'),
      msg('💬 A PROMPT is the instruction you give an AI tool.', '✅ The clearer and more specific your prompt, the better the result.', '💡 A strong prompt includes:', '→ WHO the content is for (your audience)', '→ WHAT you need (specific task)', '→ TONE (formal, friendly, urgent, professional)', '→ Any important details (length, language, local context)', '', '🤖 State any content generated using AI as AI-generated when sharing publicly.'),
      msg('🎯 Try it: Imagine you want to use Meta AI to create a picture of the Merkato market.', '💬 Write your own prompt for this task — what details would you include?', 'Reply with your prompt or reply NEXT ➡️ to continue.'),
    ],
  },
  'youth.ai.ethics': {
    type: 'lesson',
    title: 'AI Ethics and Safety',
    parent: 'youth.ai',
    parentLabel: 'AI Literacy',
    next: 'youth.ai.safety',
    messages: [
      msg('💡 Did You Know?', 'Using AI to write your entire school essay is like asking someone else to run your race for you. Responsible AI use means using it to help you think, not to think for you.'),
      msg("🚦 Remember these four R's whenever you use AI:", "✅ RESPECT: Don't use AI to create fake content about others.", '✅ RESPONSIBILITY: Always verify AI information before sharing.', "✅ RIGHTS: Understand what data you're sharing with AI apps.", "✅ RECOGNITION: Say when you've used AI to create."),
      msg('🚦 Traffic light test: is this AI use okay?', '', '🟢 GREEN — Go ahead:', '→ Using AI to research homework topics', '→ Using AI for learning a language', '🟡 YELLOW — Be careful:', '→ Sharing personal data or photos with AI apps', '→ Believing everything AI says is true', '🔴 RED — Do NOT do this:', '→ Creating fake photos or harmful content of others', '→ Pretending AI-generated work is your own'),
    ],
  },
  'youth.ai.safety': {
    type: 'lesson',
    title: 'Staying Safe with AI',
    parent: 'youth.ai',
    parentLabel: 'AI Literacy',
    next: 'youth.ai.future',
    messages: [
      msg('💡 Did You Know?', 'AI apps may ask for permissions like access to your camera, microphone, or contacts. Not all of these requests are necessary — some may be a privacy risk.'),
      msg('🔎 Use the TRACE method to check if content is AI-generated or fake:', '🐾 T — Track the source: Who created this? Is it from a trusted outlet?', '🔄 R — Reverse image search: check if a photo appears elsewhere with Google Lens or others.', '🎓 A — Ask an expert: Talk to a teacher, parent, or someone you trust.', '📖 C — Cross-reference: Do other reliable sources say the same thing?', '🤔 E — Evaluate the logic: Does it make sense? Too good (or scary) to be true?', '', '✅ Use TRACE before sharing any surprising news or photo!'),
      msg('🔐 Always ask: WHY does this AI tool need this permission?', '', '✅ SAFE: AI photo editor wants access to your camera (it needs to work).', '⚠️ RISKY: AI homework helper wants access to your contacts.', '🚫 DANGEROUS: Free AI game wants to read your SMS messages.', '', "💡 Rule of thumb: if a permission does not match the app's purpose, refuse it."),
      msg('🚨 What to do if AI content upsets or harms you:', '→ Stop using the tool immediately.', '→ Tell a trusted adult.', '→ Report the content on the platform (reports are anonymous).', "→ Don't share it further.", '→ Screenshot evidence only if it is safe to do so.', '', '✅ You always have the right to say NO to technology.'),
    ],
  },
  'youth.ai.future': {
    type: 'lesson',
    title: 'AI & Your Future',
    parent: 'youth.ai',
    parentLabel: 'AI Literacy',
    messages: [
      msg('💡 Did You Know?', 'You are not just consumers of AI technology — you can pursue AI-related opportunities as content creators.'),
      msg('🌍 AI is not just happening in big cities abroad — it is happening everywhere you are.', "🧑‍💻 You don't need to become a computer programmer to be part of the AI future.", '🛠️ Valuable skills in the AI future:', '📱 Digital Literacy: Understand how tech works so you can use it wisely and safely.', '🧩 Critical Thinking: Ask smart questions, spot fake info, and think for yourself.', '🧠 Creativity: Use AI to support your imagination, not replace it.', '🏺 Cultural Knowledge: Bring your language, humor, history, and values into the AI space.'),
      msg('📚 Learn: Keep exploring AI tools safely and stay curious.', '✨ Create: Use AI to tell African stories. Share your world with the world!', '🛡️ Safety: Help your friends stay safe online.', '🚧 Build: Think of smart AI solutions for your community.', "🚀 Lead: Be part of Africa's AI generation. Make sure our voices shape how AI works for us."),
    ],
  },
};
