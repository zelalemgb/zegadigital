'use strict';

/**
 * Afaan Oromo content pack.
 *
 * Deep-merged over English (see ../index.js), so anything not translated here
 * falls back to English automatically. Keep every `input` / `next` / `answer`
 * key identical to English — translate only the human-readable text.
 *
 * Coverage (batch 1): onboarding, navigation menus, glossary, about, help,
 * and system strings. Lessons, quizzes and per-lesson checks still fall back to
 * English and are translated in later batches.
 */

// Quiz questions extracted from the Afaan Oromo doc (scripts/parse_quiz.py).
const quiz = require('./quiz.json');

module.exports = {
  meta: { code: 'om', name: 'Afaan Oromo', complete: false },

  quizzes: {
    youth: {
      intro: [
        '🧠 Yeroo Battallee!',
        'Waa’ee nageenya, iccitii dhuunfaafi dandeettii dijitaalaa baratte qoramta.',
        '📋 Gaaffii 12 — A, B, C ykn D deebisi.',
        'Darbuuf SKIP, ba’uuf MENU.',
      ].join('\n'),
      questions: quiz.youth.questions,
    },
    adult: {
      intro: [
        '🧠 Yeroo Battallee!',
        'Beekumsa miidiyaa, iccitii dhuunfaafi nageenya toora interneetii irratti baratte qoramta.',
        '📋 Gaaffii 10 — A, B, C ykn D deebisi.',
        'Darbuuf SKIP, ba’uuf MENU.',
      ].join('\n'),
      questions: quiz.adult.questions,
    },
  },

  strings: {
    onboarding: [
      'Baga gara Zega Digital ዜጋ ዲጂታልtti nagaan dhuftan 👋',
      '',
      'Dandeettiiwwan beekumsa dijitaalaa barbaachisoo — toora interneetii irratti nagaan turuu, miidiyaa hawaasaa hubachuu fi muuxannoo gaarii horachuu — akka gabbifattan isin gargaara.',
      '',
      'Jalqaba, afaan kee filadhu:',
      '1  Ingiliffa',
      '2  Amaariffa',
      '3  Afaan Oromoo',
    ].join('\n'),

    navTip: [
      'Yaada dabalataa muraasa:',
      '',
      '• Filannoo filachuuf lakkoofsa deebisi.',
      '• Tarkaanfii tokko duubatti deebi’uuf 0 barreessi.',
      '• Yeroo mara Menuu Ijootiif MENU jedhii barreessi.',
      '• Seelfii kee ilaaluuf PROGRESS, afaan jijjiiruuf LANGUAGE jedhi.',
      '• Ba’uuf STOP jedhi.',
      '',
      'Haa jalqabnu!',
    ].join('\n'),

    unrecognised: [
      'Dhiifama, sirriitti naaf hin galle.',
      '',
      'Maaloo filannoowwan armaan gadii keessaa tokkoon deebisi.',
    ].join('\n'),

    exitMessage: [
      'Zega Digital ዜጋ ዲጂታል fayyadamuu keetif galatoomi!',
      'Har’a waan si gargaaru akka baratte abdii qabna.',
      'Yeroo barbaaddetti Hi erguun ammas jalqabuu ni dandeessa. Toora interneetii irra nagaan turi!',
    ].join('\n'),

    menuFooter: 'Filannoo keessan lakkoofsaan deebisaa.',

    completionBadge: [
      'Barnootni xumurame: {{lesson}}. Hojii gaarii!',
      '',
      '1  Barnoota itti aanu',
      '0  Gara mata-dureewwaniitti deebi’i',
      'MENU  Menuu Ijoo',
    ].join('\n'),

    lessonNav: 'Itti fufuuf NEXT, duubatti deebi’uuf 0, ykn Menuu Ijootiif MENU jedhi',

    ui: {
      levelNames: ['Jalqabaa', 'Barataa', 'Dandeettii', 'Eegduu', 'Ogeessa'],
      chooseWelcome: 'Baga gara Zega Digital ዜጋ ዲጂታልtti nagaan dhuftan 👋',
      choosePrompt: 'Kun eenyuuf? Filadhu — yeroo barbaaddetti jijjiiruu ni dandeessa.',
      chooseYouth: '1  Dargaggoo (Umurii 13–17)',
      chooseAdult: '2  Ga’eessa (18+)',
      chooseExplore: '3  Daaw’achuu qofa',
      welcomeBack: 'Baga deebitan 👋',
      todaysLesson: '*Barnoota har’aa*',
      lessonLine: '{{title}} ({{module}}, ~daq. 2)',
      trackDone: 'Karaa kana xumurtan. Hojii gaarii!',
      replyNumber: '*Lakkoofsaan deebisi:*',
      optStartLesson: '1  Barnoota har’aa jalqabi',
      optStartQuiz: '1  Battallee karaa fudhadhu',
      optProgress: '2  Guddina koo fi badhaasota',
      optBrowse: '3  Mata-dureewwan hunda daaw’adhu',
      optQuiz: '4  Battallee fudhadhu',
      optLanguage: '5  Afaan jijjiiri',
      optMore: '6  Dabalata (hiikaa, gargaarsa, waayee)',
      statLine: 'Sadarkaa: {{level}} · qabxii {{points}} · {{streak}} · barnoota {{done}}/{{total}}',
      streakDays: 'guyyaa {{n}} walitti aanaa',
      streakNone: 'ammatti walitti aanaa hin qabu',
      progTitle: '*Guddina kee*',
      progLevel: 'Sadarkaa: {{level}} ({{index}} kan {{count}})',
      progTop: 'Sadarkaa ol’aanaa geessee jirta!',
      progToNext: '{{next}} bira ga’uuf qabxii {{n}} dabalataa',
      progPoints: 'Qabxii: {{points}}',
      progStreak: 'Guyyaa walitti aanaa: {{n}} (kan hunda caalu: {{best}})',
      progLessons: '*Barnoota: {{done}} kan {{total}} xumurame*',
      progModFinished: 'xumurame',
      progModNotStarted: 'hin jalqabamne',
      progModPartial: '{{done}} kan {{total}}',
      progBadgesTitle: '*Badhaasota argatan*',
      progNoBadges: '*Badhaasota:* ammatti hin jiran — isa jalqabaa argachuuf barnoota tokko xumuri.',
      progFooter: 'Gara manaatti deebi’uuf 0 ykn MENU jedhi.',
      checkTitle: '*Qorannoo saffisaa* — qabxii 10',
      checkFooter: 'Qubeedhaan deebisi, ykn SKIP jedhi.',
      checkCorrect: 'Sirriidha! {{reinforce}}',
      checkWrong: 'Sirrii miti — deebiin {{answer}} dha. {{reinforce}}',
      quizQ: '*Gaaffii {{n}} kan {{total}}*',
      quizFooter: 'A, B, C ykn D deebisi. Darbuuf SKIP, ba’uuf MENU.',
      quizCorrect: 'Sirriidha — deebiin {{answer}} dha.',
      quizWrong: 'Sirrii miti — deebiin sirriin {{answer}} dha.',
      quizContinue: 'Gaaffii itti aanuuf YES jedhi, ykn deebi’uuf MENU.',
      quizNext: 'Gaaffii itti aanuuf YES jedhi, ykn dhaabuuf MENU.',
      quizDoneTitle: '*Battalleen xumurame!*',
      quizScore: '{{total}} keessaa {{score}} sirriitti deebifte.',
      quizDoneFooter: 'Manaaf MENU, ykn mata-dureewwan irra deebi’uuf REVIEW jedhi.',
      infoFooter: 'Duubatti deebi’uuf 0, ykn manaaf MENU jedhi.',
      glossaryMore: 'Hiika biraaf lakkoofsa deebisi, ykn deebi’uuf 0 jedhi.',
      langTitle: '🌐 Afaan',
      langPrompt: 'Afaan filadhu:',
      langBack: '0  Duubatti',
      langSet: 'Afaan gara {{name}}tti jijjiirame.',
      rewardStreak: 'Guyyaa {{n}} walitti aanaa baratte. Har’a waan dhufteef +qabxii {{pts}}.',
      rewardStreakMilestone: 'Guyyaa {{n}} walitti aanaa — baay’ee gaarii! +qabxii {{pts}}.',
      rewardStreakSaved: ' (walitti aanaa kee olkaawwe)',
      rewardPoints: 'Qabxii {{pts}} argatte.',
      rewardBadge: 'Badhaasa haaraa: {{name}} — {{desc}}. +qabxii {{pts}}.',
      rewardLevelUp: 'Sadarkaa haaraa geesse: {{name}} (sadarkaa {{n}} kan {{count}}).',
      rewardGain: 'Qabxiin kee jalqaba {{before}}% irraa gara {{after}}% amma ga’e',
      rewardGainProgress: ' — kun guddina qabxii {{delta}} ti. Hojii gaarii!',
      optInPrompt: 'Guyyaa guyyaan yaadachiisa argachuu barbaaddaa? REMIND ON jedhi (ykn sa’a 7pmf REMIND 19).',
    },
  },

  glossary: {
    intro: [
      '📖 Hiikaa Jechootaa — hiika gabaabaa jechoota furtuu.',
      'Hiika argachuuf lakkoofsa deebisi, ykn deebi’uuf 0 jedhi.',
    ].join('\n'),
    terms: [
      { label: 'Algoorizimii', definition: `Seera kompiutaraa kan gocha keessan irratti hundaa’uun dhangaa miidiyaa hawaasummaa (feed) keessan irratti waan argamu murteessu dha.` },
      { label: 'Lallaba Humnaa', definition: `Mala jorree (hacking) kan sagantaan kompiutaraa tokko ofumaan kuusaa jecha iccitii (password) kumaatamaan lakkaawamu hanga isa sirrii argatutti yaalu dha.` },
      { label: 'Dhugoomsa Jal’inaa', definition: `Fedhii odeeffannoo dhimma duraan sammuu keessan keessa jiru deeggaru qofa barbaaduu fi amanuu — kunis odeeffannoo sobaa babal’isuuf daandii kan saaqu dha.` },
      { label: 'Kuukisii', definition: `Faayiloota xixiqqoo websaayitoonni eenyummaa keessan yaadachuuf — akkasumas beeksisaaf jecha websaayitoota adda addaa irratti isin hordofuuf meeshaa keessan irratti kuusani dha.` },
      { label: 'Odeeffannoo Badii', definition: `Odeeffannoo sobaa kan namoota gowwomsuuf jedhamee ta’e jedhamee uumamee fi babal’ifamu dha. Kun odeeffannoo dogoggoraa (misinformation) kan yaada gowwomsuu hin qabne irraa adda.` },
      { label: 'Faana Miila Diyaajitaalaa', definition: `Odeeffannoo waa’ee keessan sarara intarneetii irratti argamu hundumaa dha — waan isin maxxansitan, qooddan, jaallattan (like), yaada irratti kennitan, fi waan namoonni biroon waa’ee keessan maxxansan dabalata.` },
      { label: 'Doksiing', definition: `Heyyama isaanii malee odeeffannoo dhuunfaa nama tokkoo sarara intarneetii irratti qooduu dha. Miidhaa kan geessisuu fi yeroo baay’ee seeraan ala kan ta’e dha.` },
      { label: 'Man-sagalee Echoo', definition: `Sababa algoorizimii fi dhugoomsa jal’inaatiin qabiyyee ilaalcha keessan qofa calaqqisiisu yeroo argitan dhufe dha.` },
      { label: 'HTTPS', definition: `Ulaagaa quunnamtii amansiisaa websaayitootaaf ta’e dha. 'S'n quunnamtiin keessan of-eeggannoodhaan kofamee (encrypted) darbuu isaa agarsiisa.` },
      { label: 'Hinfudhannaa Eenyummeessaa', definition: `Yeroo namni biraa odeeffannoo dhuunfaa keessanitti fayyadamee isin fakkaatee dhiyaatu dha — fkn. maqaa keessaniin kaardii liqii ykn herrega banuun.` },
      { label: 'Maalweerii', definition: `Sagantaa sooftiweerii miidhaa geessisu kan meeshaa keessan hordofuu, data hatuuf, faayiloota keessan cufuuf (ransomware), ykn jorreitootaaf (hackers) to’annoo kennuu danda’u dha.` },
      { label: 'Meetadetaa', definition: `Data waa’ee dataati. Fkn. yeroo isin itti seentan (logged in), teessoo keessan yeroo maxxansitanii, fi eenyuun wajjin akka walquunnamtan — qabiyyeen keessan dhuunfaa yoo ta’ellee.` },
      { label: 'MFA / 2FA', definition: `Mirkaneessa Factora-Dacha (Multi-Factor Authentication): jecha iccitii keessan booda tarkaanfii nageenyaa lammaffaa dha, kan akka koodii bilbila keessanitti ergamuutii.` },
      { label: 'Fiishiing', definition: `Ergaa sobaa kan jecha iccitii ykn odeeffannoo dhuunfaa keessan gowwomsee akka saaxiltan godhuuf qophaa’e dha — yeroo baay’ee dhaabbata dhugaa irraa dhufe fakkaata.` },
      { label: 'PII', definition: `Odeeffannoo Eenyummeessaa Dhuunfaa (Personally Identifiable Information) — data isin addaan baasuu danda’u kamiyyuu dha, kan akka teessoo keessani, lakkoofsa eenyummaa, ykn odeeffannoo baankii.` },
      { label: 'Raansomweerii', definition: `Akaakuu maalweerii kan faayiloota keessan cufuun, isaan hiikuuf kaffaltii (furmaata) gaafatu dha.` },
      { label: 'Injineeringii Hawaasummaa', definition: `Namoota (kompiutaroota utuu hin taane) gowwomsuun odeeffannoo dhuunfaa akka qoodan gochuu dha, yeroo baay’ee nama ykn dhaabbata amanamu fakkaatanii dhiyaachuuni.` },
      { label: 'Gargaaraa Ijaa', definition: `Nama yeroo amala badaa sarara intarneetii irratti argu callisee ilaaluu (bystander ta’uu) mannaa, tarkaanfii gaarii fudhatu dha.` },
    ],
  },

  nodes: {
    MAIN: {
      title: '🏠 Menuu Ijoo',
      body: '👉 Maaloo filadhaa:',
      options: [
        { label: '🧒 Mojula Dargaggootaa (Umurii 13–17)' },
        { label: '🧑 Mojula Ga’eessootaa (Umurii 18+)' },
        { label: '🌍 Filannoo afaanii' },
        { label: 'ℹ️ Waayee Robotii Zeegaa' },
        { label: '📖 Hiikaa Jechootaa' },
        { label: '🆘 Deeggarsaafi Leecalloowwan' },
        { label: '❌ Ba’umsa' },
      ],
    },

    'youth.menu': {
      title: '🧒 Mojula Dargaggootaa',
      body: [
        '🎉 Akkasi! Karaa Dargaggootaa filattanii jirtu.',
        '📚 Waa’ee nageenya toora interneetii, iccitii dhuunfaafi kanneen biroo baradhu.',
        '✍️ Har’aa maal barachuu barbaaddu?',
      ].join('\n'),
      options: [
        { label: '🌐 Utubaawwan Dijiitaalaa' },
        { label: '💚 Gaarummaa Dijiitaalaa' },
        { label: '🤝 Hirmaannaa Dijiitaalaa' },
        { label: '💻 Carraawwan Dijiitaalaa' },
        { label: '🛡️ Nageenyaafi Gaarummaa Toora Interneetii' },
        { label: '🤖 Beekumsa Bu’uuraa Hubannoo Namtolchee' },
        { label: '🧠 Battallee' },
        { label: '🔙 Menuu Ijootti deebi’i' },
      ],
    },

    'adult.menu': {
      title: '🧑 Moojula Ga’eessotaa',
      body: [
        '🎉 Baay’ee gaaridha! Moojula Ga’eessotaa filattee jirta.',
        '📚 Waa’ee nageenya toora interneetii, iccitii dhuunfaafi kanneen biroo baradhu.',
        '✍️ Har’aa waa’ee maal barachuu barbaadda?',
      ].join('\n'),
      options: [
        { label: '📰 Beekumsa Bu’uuraa Miidiyaa Qabaachuu' },
        { label: '🔐 Icciitii Dhuunfummaa' },
        { label: '🛡️ Nageenya Toora Interneetii' },
        { label: '🛡️ Nageenyaafi Gaarummaa Toora Interneetii' },
        { label: '✨ Beekumsa Bu’uuraa Hubannoo Namtolchee (AI)' },
        { label: '🧠 Battalleewwan' },
        { label: '🔙 Menuu Ijootti Deebi’i' },
      ],
    },

    'help.menu': {
      title: '🆘 Gargaarsaa fi Maddoota Odeeffannoo',
      options: [
        { label: '📞 Meta’f Gabaasuu (Facebook/Instagram/WA)' },
        { label: '🔒 Akkaataa herrega hatame deebisanii sajeessan' },
        { label: '🔗 Maddoota barnootaa dabalataa' },
        { label: 'Gara Baafata Guddaatti Deebi’i' },
      ],
    },

    about: {
      messages: [
        [
          'ℹ️ Waa’ee Dijitaala Zeegaa',
          '🎯 Kaayyoo: Itoophiyaanota dandeettii bu’uuraa dijitaalaa qaban ga’oomsuun karaa imalaa toora interneetii nageenyaafi ofitti amanamummaa qaban uumuu.',
          '⚖️ Gartummaarraa bilisa ta’uu: Odeeffannoo haqaa, madaalawaa ta’eefi loogii siyaasaa hin qabne.',
          '📚 Maddootni: \'Addunyaa Dijiitaalaa Koo\' kan Meetaafi leecalloowwan nageenya dijiitaalaa amanamoo biroo irraa madaqfame.',
          '🔒 Icciitii dhuunfaa: Robotiin kuni haasawaa dhuunfaa keetii hin kuusu.',
        ].join('\n'),
      ],
    },
  },
};
