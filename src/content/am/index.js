'use strict';

/**
 * Amharic (አማርኛ) content pack.
 *
 * Deep-merged over English (see ../index.js), so anything not translated here
 * falls back to English automatically. Keep every `input` / `next` / `answer`
 * key identical to English — translate only the human-readable text.
 *
 * Coverage: onboarding, navigation menus, glossary, about, help, system
 * strings, quizzes, and lesson bodies (all ~35 lessons). Per-lesson checks and
 * the quiz tier-badge lines still fall back to English.
 */

// Quiz questions extracted from the Amharic doc (scripts/parse_quiz.py).
const quiz = require('./quiz.json');
// Translated lesson bodies (scripts/parse_lessons.py). Overrides `messages` only;
// all other lesson fields (checks, next, title) fall back to English.
const lessons = require('./lessons.json');

module.exports = {
  meta: { code: 'am', name: 'Amharic', complete: false },

  quizzes: {
    youth: {
      intro: [
        '🧠 የፈተና ጊዜ!',
        'በኦንላይን ደህንነት፣ ግላዊነት እና ዲጂታል ክህሎት ላይ ያገኙትን እውቀት ይፈትሹ።',
        '📋 13 ጥያቄዎች — A፣ B፣ C ወይም D ይመልሱ።',
        'ለመዝለል SKIP፣ ለመውጣት MENU።',
      ].join('\n'),
      questions: quiz.youth.questions,
    },
    adult: {
      intro: [
        '🧠 የፈተና ጊዜ!',
        'በሚዲያ ግንዛቤ፣ ግላዊነት እና የኦንላይን ደህንነት ላይ ያገኙትን እውቀት ይፈትሹ።',
        '📋 16 ጥያቄዎች — A፣ B፣ C ወይም D ይመልሱ።',
        'ለመዝለል SKIP፣ ለመውጣት MENU።',
      ].join('\n'),
      questions: quiz.adult.questions,
    },
  },

  strings: {
    onboarding: [
      'ወደ Zega Digital ዜጋ ዲጂታል በደህና መጡ 👋',
      '',
      'የኦንላይን ደህንነትን መጠበቅ፣ ማህበራዊ ሚዲያን መረዳት እና አውንታዊ የኦንላይን ተሞክሮ መፍጠር የሚያስችሉ ወሳኝ የዲጂታል ክህሎቶችን እንዲገነቡ ልረዳዎ እችላለሁ።',
      '',
      'መጀመሪያ ቋንቋ ይምረጡ፡',
      '1  እንግሊዝኛ',
      '2  አማርኛ',
      '3  አፋን ኦሮሞ',
    ].join('\n'),

    navTip: [
      'ጥቂት ፈጣን ጥቆማዎች፡',
      '',
      '• አማራጭ ለመምረጥ ቁጥር ይላኩ።',
      '• አንድ ደረጃ ወደኋላ ለመመለስ 0 (ወይም BACK) ይላኩ።',
      '• በማንኛውም ጊዜ ወደ ዋና ማውጫ ለመመለስ MENU ይላኩ።',
      '• መገለጫዎን ለማየት PROGRESS፣ ቋንቋ ለመቀየር LANGUAGE ይላኩ።',
      '• ለመውጣት STOP ይላኩ።',
      '',
      'እንጀምር!',
    ].join('\n'),

    unrecognised: [
      'ይቅርታ፣ ያሉትን አልገባኝም።',
      '',
      'እባክዎ ከታች ከሚታዩት አማራጮች አንዱን ይመልሱ።',
    ].join('\n'),

    exitMessage: [
      'Zega Digital ዜጋ ዲጂታልን ስለተጠቀሙ እናመሰግናለን።',
      'ዛሬ የሚጠቅም ነገር እንደተማሩ ተስፋ እናደርጋለን።',
      'እንደገና ለመጀመር በማንኛውም ጊዜ Hi ይላኩ። የኦንላይን ደህንነትዎን ይጠብቁ!',
    ].join('\n'),

    menuFooter: 'በመረጡት ቁጥር ይመልሱ።',

    completionBadge: [
      'ትምህርቱ ተጠናቋል፡ {{lesson}}። በጣም ጥሩ!',
      '',
      '1  ቀጣይ ትምህርት',
      '0  ወደ ርዕሶች መመለስ',
      'MENU  መነሻ',
    ].join('\n'),

    lessonNav: 'ለመቀጠል NEXT ይላኩ፣ ወደኋላ ለመመለስ 0፣ ወይም ወደ ዋና ማውጫ MENU',

    ui: {
      levelNames: ['ጀማሪ', 'ተማሪ', 'ብቁ', 'ጠባቂ', 'ባለሙያ'],
      chooseWelcome: 'ወደ Zega Digital ዜጋ ዲጂታል በደህና መጡ 👋',
      choosePrompt: 'ይህ ለማን ነው? ይምረጡ — በማንኛውም ጊዜ መቀየር ይችላሉ።',
      chooseYouth: '1  ወጣት (ዕድሜ 13–17)',
      chooseAdult: '2  አዋቂ (18+)',
      chooseExplore: '3  ማሰስ ብቻ',
      welcomeBack: 'እንኳን ተመልሰው መጡ 👋',
      todaysLesson: '*የዛሬ ትምህርት*',
      lessonLine: '{{title}} ({{module}}፣ ~2 ደቂቃ)',
      trackDone: 'ይህን ትራክ አጠናቀዋል። በጣም ጥሩ!',
      replyNumber: '*በቁጥር ይመልሱ፡*',
      optStartLesson: '1  የዛሬውን ትምህርት ጀምር',
      optStartQuiz: '1  የትራክ ፈተና ውሰድ',
      optProgress: '2  የኔ እድገት እና ባጆች',
      optBrowse: '3  ዋና ማውጫ (ትራክ መቀየሪያ)',
      optQuiz: '4  ፈተና ውሰድ',
      optLanguage: '5  ቋንቋ ቀይር',
      optMore: '6  ሁሉንም ርዕሶች አስስ',
      statLine: 'ደረጃ፡ {{level}} · {{points}} ነጥብ · {{streak}} · {{done}}/{{total}} ትምህርቶች',
      streakDays: '{{n}} ቀናት ተከታታይ',
      streakNone: 'ገና ተከታታይ የለም',
      progTitle: '*የእርስዎ እድገት*',
      progLevel: 'ደረጃ፡ {{level}} ({{index}} ከ {{count}})',
      progTop: 'ከፍተኛውን ደረጃ ደርሰዋል!',
      progToNext: 'ወደ {{next}} ለመድረስ {{n}} ተጨማሪ ነጥብ',
      progPoints: 'ነጥብ፡ {{points}}',
      progStreak: 'ተከታታይ ቀናት፡ {{n}} (ምርጥ፡ {{best}})',
      progLessons: '*ትምህርቶች፡ {{done}} ከ {{total}} ተጠናቀዋል*',
      progModFinished: 'ተጠናቋል',
      progModNotStarted: 'አልተጀመረም',
      progModPartial: '{{done}} ከ {{total}}',
      progBadgesTitle: '*የተገኙ ባጆች*',
      progNoBadges: '*ባጆች፡* ገና የሉም — የመጀመሪያዎን ለማግኘት ትምህርት ያጠናቁ።',
      progFooter: 'ወደ መነሻ ለመመለስ 0 ወይም MENU ይላኩ።',
      checkTitle: '*ፈጣን ፍተሻ* — 10 ነጥብ',
      checkFooter: 'በፊደል ይመልሱ፣ ወይም SKIP ይላኩ።',
      checkCorrect: 'ትክክል! {{reinforce}}',
      checkWrong: 'ትክክል አይደለም — መልሱ {{answer}} ነው። {{reinforce}}',
      quizQ: '*ጥያቄ {{n}} ከ {{total}}*',
      quizFooter: 'A፣ B፣ C ወይም D ይመልሱ። ለመዝለል SKIP፣ ለመውጣት MENU።',
      quizCorrect: 'ትክክል — መልሱ {{answer}} ነው።',
      quizWrong: 'ትክክል አይደለም — ትክክለኛው መልስ {{answer}} ነው።',
      quizContinue: 'ለቀጣይ ጥያቄ YES ይላኩ፣ ወይም ለመመለስ MENU።',
      quizNext: 'ለቀጣይ ጥያቄ YES ይላኩ፣ ወይም ለማቆም MENU።',
      quizDoneTitle: '*ፈተናው ተጠናቋል!*',
      quizScore: 'ከ {{total}} ውስጥ {{score}} በትክክል መልሰዋል።',
      quizDoneFooter: 'ለመነሻ MENU፣ ወይም ርዕሶችን ለመከለስ REVIEW ይላኩ።',
      infoFooter: 'ወደኋላ ለመመለስ 0፣ ወይም ለመነሻ MENU ይላኩ።',
      glossaryMore: 'ለሌላ ፍቺ ቁጥር ይላኩ፣ ወይም ለመመለስ 0 ይላኩ።',
      langTitle: '🌐 ቋንቋ',
      langPrompt: 'ቋንቋ ይምረጡ፡',
      langBack: '0  ወደኋላ',
      langSet: 'ቋንቋ ወደ {{name}} ተቀይሯል።',
      rewardStreak: '{{n}} ቀናት ተከታታይ ተምረዋል። ዛሬ ስለመጡ +{{pts}} ነጥብ።',
      rewardStreakMilestone: '{{n}} ቀናት ተከታታይ — በጣም ጥሩ! +{{pts}} ነጥብ።',
      rewardStreakSaved: ' (ተከታታይነትዎን አስቀርተናል)',
      rewardPoints: '{{pts}} ነጥብ አግኝተዋል።',
      rewardBadge: 'አዲስ ባጅ፡ {{name}} — {{desc}}። +{{pts}} ነጥብ።',
      rewardLevelUp: 'አዲስ ደረጃ ደርሰዋል፡ {{name}} (ደረጃ {{n}} ከ {{count}})።',
      rewardGain: 'ውጤትዎ ከመነሻ {{before}}% ወደ {{after}}% ደርሷል',
      rewardGainProgress: ' — ያ {{delta}} ነጥብ እድገት ነው። በጣም ጥሩ!',
      optInPrompt: 'ተከታታይነትዎን ለመጠበቅ ዕለታዊ ማስታወሻ ይፈልጋሉ? REMIND ON ይላኩ (ወይም ለ7pm REMIND 19)።',
      certEarnedAskName: '🎓 *እንኳን ደስ አለዎት!* ሁሉንም ትምህርቶች አጠናቅቀው ፈተናውን አልፈዋል — የዜጋ ዲጂታል የምስክር ወረቀትዎን አግኝተዋል!\n\nበላዩ ላይ የሚጻፈውን ስም ይላኩ (ወይም SKIP)።',
      certNameInvalid: 'እባክዎ በምስክር ወረቀትዎ ላይ የሚጻፈውን ስም ይላኩ (2–48 ፊደላት)፣ ወይም SKIP።',
      certGenerating: '🎉 በጣም ጥሩ፣ {{name}}! የእርስዎ የምስክር ወረቀት ይኸውና፡',
      certCaption: '🎓 ዜጋ ዲጂታል — የማጠናቀቅ የምስክር ወረቀት',
      certVerify: '✅ ይህን ያስቀምጡ! ማንኛውም ሰው እዚህ ማረጋገጥ ይችላል፡\n{{url}}',
      certNotYet: '🎓 የምስክር ወረቀትዎን ለማግኘት ሁሉንም ትምህርቶች ጨርሰው ፈተናውን ያልፉ። ለመቀጠል 1 ይላኩ!',
      certSkipped: 'ችግር የለም — በማንኛውም ጊዜ የምስክር ወረቀትዎን ለማግኘት CERTIFICATE ይላኩ።',
    },
  },

  glossary: {
    intro: [
      '📖 የቃላት መፍቻ — የቁልፍ ቃላት አጭር ፍቺዎች።',
      'ለሚፈልጉት ፍቺ ቁጥር ይላኩ፣ ወይም ለመመለስ 0 ይላኩ።',
    ].join('\n'),
    terms: [
      { label: 'አልጎሪዝም', definition: 'በአጠቃቀሞ ላይ ተመስርቶ በማህበራዊ ሚዲያ ላይ የሚያዩትን የሚወስኑ የኮምፒውተር ህጎች።' },
      { label: 'የብሩት ፎርስ ጥቃት', definition: 'ትክክለኛው እስኪገኝ ድረስ በሺዎች የሚቆጠሩ የይለፍ ቃል ጥምረቶችን በሶፍትዌር የመሞከር የጠለፋ ዘዴ።' },
      { label: 'የማረጋገጫ አድልዎ', definition: 'ቀድመን ያመንነውን የሚደግፍ መረጃ የመፈለግ እና የማመን አዝማሚያ።' },
      { label: 'ኩኪዎች', definition: 'ማንነትዎን ለማስታወስ ድረ-ገጾች በመሣሪያዎ ላይ የሚያከማቿቸው ትናንሽ ፋይሎች።' },
      { label: 'የተሳሳተ መረጃ', definition: 'ሰዎችን ለማታለል ሆን ተብሎ የተፈጠረ እና የተሰራጨ የውሸት መረጃ።' },
      { label: 'ዲጂታል አሻራ', definition: 'የሚፖስቱትን፣ የሚያጋሩትን፣ የሚወዱትን፣ አስተያየት የሚሰጡበትን እና ሌሎች ስለእርስዎ የሚፖስቱትን ጨምሮ ኦንላይን ስለእርስዎ የሚገኝ መረጃ።' },
      { label: 'ዶክሲንግ', definition: 'ያለፈቃዳቸው የሌላ ሰው የግል መረጃን ኦንላይን ማጋራት። ጎጂ እና ብዙውን ጊዜ ህገ ወጥ ነው።' },
      { label: 'ኢኮ ቻምበር', definition: 'በአልጎሪዝም እና በማረጋገጫ አድልዎ ምክንያት የራስዎን አመለካከት የሚያንጸባርቅ ይዘት ብቻ የሚያዩበት ሁኔታ።' },
      { label: 'HTTPS', definition: 'ደህንነቱ የተጠበቀ የድረ-ገጾች ግንኙነት። \'S\' ማለት ግንኙነትዎ ተመስጥሯል ማለት ነው።' },
      { label: 'ማንነት ስርቆት', definition: 'አንድ ሰው የግል መረጃዎን ተጠቅሞ እርስዎን ለመምሰል ሲሞክር። ለምሳሌ በስምዎ አካውንቶች መክፈት።' },
      { label: 'ማልዌር', definition: 'በመሣሪያዎ ላይ ሊሰልል፣ መረጃ ሊሰርቅ፣ ፋይሎችዎን ሊቆልፍ፣ ወይም ለጠላፊዎች ቁጥጥር ሊሰጥ የሚችል ጎጂ ሶፍትዌር።' },
      { label: 'ሜታ ዳታ', definition: 'የዳታ ዳታ። ለምሳሌ የገቡበት ጊዜ፣ የፖሰቱበት ጊዜ፣ የተጠቀሙበት አካባቢ፣ የተገናኙት ሰው እና የመሳሰሉት።' },
      { label: 'MFA / 2FA', definition: 'ከይለፍ ቃልዎ በኋላ ሁለተኛ የደህንነት ደረጃ መጨመር፣ ለምሳሌ ወደ ስልክዎ የሚላክ ኮድ።' },
      { label: 'ፊሺንግ', definition: 'የይለፍ ቃሎችን ወይም የግል መረጃን አታለው ለመስረቅ ከእውነተኛ ድርጅት በማስመሰል የሚላክ ሐሰተኛ መልእክት።' },
      { label: 'PII', definition: 'እርስዎን ሊለይ የሚችል እንደ አድራሻዎ፣ መታወቂያ ቁጥርዎ፣ ወይም የባንክ መረጃ ያሉ የግል መረጃዎች።' },
      { label: 'ራንሰምዌር', definition: 'ፋይሎችዎን በመቆለፍ ለማስከፈት ክፍያ (ቤዛ) የሚጠይቅ የማልዌር አይነት።' },
      { label: 'ማህበራዊ ምህንድስና', definition: 'ታማኝ ሰው ወይም ድርጅት በመምሰል ኮምፒውተሮችን ሳይሆን ሰዎችን የማታለል ዘዴ።' },
      { label: 'አፕስታንደር', definition: 'ኦንላይን መጥፎ ባህሪ ሲመለከት ዝም ብሎ ከማለፍ ይልቅ አውንታዊ እርምጃ የሚወስድ ሰው።' },
    ],
  },

  nodes: {
    ...lessons.nodes,
    MAIN: {
      title: '🏠 ዋና ማውጫ',
      body: '👉 እባክዎ ይምረጡ፡',
      options: [
        { label: '🧒 የወጣቶች ሞጁል (ዕድሜ 13–17)' },
        { label: '🧑 የአዋቂዎች ሞጁል (ዕድሜ 18+)' },
        { label: '🌍 ቋንቋ ምርጫ' },
        { label: 'ℹ️ ስለ ዜጋ ቦት' },
        { label: '📖 የቃላት መፍቻ' },
        { label: '🆘 እርዳታ እና መርጃዎች' },
        { label: '❌ ውጣ' },
      ],
    },

    'youth.menu': {
      title: '🧒 የወጣቶች ሞጁል',
      body: [
        '🎉 በጣም ጥሩ! የወጣቶች ትራክን መርጠሃል።',
        '📚 ስለ ኦንላይን ደህንነት፣ ግላዊነት እና ሌሎችን ተማር።',
        '✍️ ዛሬ ምን መማር ትፈልጋለህ?',
      ].join('\n'),
      options: [
        { label: '🌐 ዲጂታል መሰረቶች' },
        { label: '💚 ዲጂታል ጤንነት' },
        { label: '🤝 ዲጂታል ተሳትፎ' },
        { label: '💻 ዲጂታል እድሎች' },
        { label: '🛡️ የኦንላይን ደህንነት እና ጤንነት' },
        { label: '🤖 የሰው ሰራሽ አስተውሎት (AI) ግንዛቤ' },
        { label: '🧠 ፈተና' },
        { label: '🔙 ወደ ዋናው ማውጫ' },
      ],
    },

    'adult.menu': {
      title: '🧑 የአዋቂዎች ሞጁል',
      body: [
        '🎉 በጣም ጥሩ! የአዋቂ ትራክ መርጠዋል።',
        '📚 የኦንላይን ደህንነት፣ ግላዊነት እና ሌሎችን ይማሩ።',
        '✍️ ዛሬ ስለ ምን መማር ይፈልጋሉ?',
      ].join('\n'),
      options: [
        { label: '📰 የሚዲያ ግንዛቤ' },
        { label: '🔐 ግላዊነት' },
        { label: '🛡️ የኦንላይን ደህንነት' },
        { label: '🛡️ የኦንላይን ደህንነት እና ጤንነት' },
        { label: '✨ የሰው ሰራሽ አስተውሎ (AI) ግንዛቤ' },
        { label: '🧠 ፈተና' },
        { label: '🔙 ወደ ዋናው ማውጫ' },
      ],
    },

    'help.menu': {
      title: '🆘 እርዳታ እና መርጃዎች',
      options: [
        { label: '📞 ለሜታ ሪፖርት ማድረግ (ፌስቡክ/ኢንስታግራም/ዋትሳፕ)' },
        { label: '🔒 የተጠለፈ አካውንት ማስመለስ' },
        { label: '🔗 ተጨማሪ የመማሪያ መርጃዎች' },
        { label: 'ወደ ዋና ማውጫ ተመለስ' },
      ],
    },

    about: {
      messages: [
        [
          'ℹ️ ስለ Zega Digital ዜጋ ዲጂታል',
          "OMNI Ethiopia እና Meta 'የዜጋ ዲጂታል ቦት'ን አቅርበውልዎታል—ኦንላይን ደህንነትዎን እንዲጠብቁ፣ የዲጂታል ክህሎት እንዲያዳብሩ እና የዛሬውን ዲጂታል ዓለም በልበ ሙሉነት እንዲዳስሱ የሚያግዝ መስተጋብራዊ የ WhatsApp አገልግሎት።",
          '⚖️ ገለልተኝነት፡ ያለፖለቲካ አድልዎ እውነተኛ እና ሚዛናዊ መረጃ ማቅረብ።',
          '🔒 ግላዊነት፡ ይህ ቦት የግል ውይይቶችዎን አያከማችም።',
          '📧 አድራሻ፡ zegadigital00@gmail.com',
        ].join('\n'),
      ],
    },
  },
};
