// ── Supported languages ──
const LANG_NAMES = {
  en: 'English',
  ko: '한국어',
  ja: '日本語',
  es: 'Español',
  zh: '中文',
};

// ── UI string translations ──
const TRANSLATIONS = {
  en: {
    subtitle:       'Choose who you want to talk to',
    filterAll:      'All',
    filterFemale:   'Female',
    filterMale:     'Male',
    loading:        'Loading...',
    noChars:        'No characters found.',
    serverError:    'Could not load characters. Is the server running?',
    historyLabel:   'Conversation history',
    todayLabel:     'Today',
    placeholder:    'Send a message',
    resetConfirm:   (name) => `Reset your conversation with ${name}?`,
    networkError:   'Check your internet connection~',
    noCharError:    'No characters configured. Add JSON files to characters/.',
    triggerFirst:   'This is the very first time the user is opening a chat with you. Send a natural opening text — as if you just felt like reaching out.',
    triggerReset:   'The conversation is starting fresh. Send a natural opening text, as if you just felt like texting them.',
    triggerGapFew:  "It's been a few hours since we last talked.",
    triggerGapHalf: "It's been almost a day since we last talked.",
    triggerGapDay:  "It's been over a day since we last talked.",
    triggerGapDays: "It's been a few days since we last talked.",
    triggerGapSuffix: 'Text them naturally — like you just thought of them.',
  },
  ko: {
    subtitle:       '대화할 아이돌을 선택해 주세요',
    filterAll:      '전체',
    filterFemale:   '여자',
    filterMale:     '남자',
    loading:        '불러오는 중...',
    noChars:        '캐릭터를 찾을 수 없습니다.',
    serverError:    '캐릭터를 불러오지 못했어요. 서버가 실행 중인가요?',
    historyLabel:   '대화 기록',
    todayLabel:     '오늘',
    placeholder:    '메시지를 보내세요',
    resetConfirm:   (name) => `${name}와의 대화를 초기화할까요?`,
    networkError:   '인터넷 연결을 확인해봐~',
    noCharError:    '캐릭터가 없습니다. characters/ 폴더에 JSON 파일을 추가하세요.',
    triggerFirst:   '처음으로 채팅을 여는 상황이야. 그냥 생각나서 연락하는 것처럼 자연스럽게 먼저 문자 보내줘.',
    triggerReset:   '대화를 처음부터 다시 시작하는 상황이야. 그냥 생각나서 연락하는 것처럼 자연스럽게 먼저 문자 보내줘.',
    triggerGapFew:  '몇 시간 동안 연락이 없었어.',
    triggerGapHalf: '반나절 넘게 연락이 없었어.',
    triggerGapDay:  '하루 넘게 연락이 없었어.',
    triggerGapDays: '며칠째 연락이 없었어.',
    triggerGapSuffix: '그냥 생각나서 문자하는 것처럼 자연스럽게 연락해줘.',
  },
  ja: {
    subtitle:       '話しかけるアイドルを選んでください',
    filterAll:      '全員',
    filterFemale:   '女性',
    filterMale:     '男性',
    loading:        '読み込み中...',
    noChars:        'キャラクターが見つかりません。',
    serverError:    '読み込み失敗。サーバーは起動していますか？',
    historyLabel:   '会話履歴',
    todayLabel:     '今日',
    placeholder:    'メッセージを送る',
    resetConfirm:   (name) => `${name}との会話をリセットしますか？`,
    networkError:   'インターネット接続を確認してください',
    noCharError:    'キャラクターがありません。characters/ にJSONを追加してください。',
    triggerFirst:   '初めてチャットを開いた状況です。ふと思い出して連絡するように、自然にメッセージを送ってください。',
    triggerReset:   '会話を最初からやり直す状況です。ふと思い出して連絡するように、自然にメッセージを送ってください。',
    triggerGapFew:  '数時間連絡がなかった。',
    triggerGapHalf: '半日以上連絡がなかった。',
    triggerGapDay:  '1日以上連絡がなかった。',
    triggerGapDays: '数日間連絡がなかった。',
    triggerGapSuffix: 'ふと思い出して連絡するように、自然にメッセージを送ってください。',
  },
  es: {
    subtitle:       'Elige con quién quieres hablar',
    filterAll:      'Todos',
    filterFemale:   'Chicas',
    filterMale:     'Chicos',
    loading:        'Cargando...',
    noChars:        'No se encontraron personajes.',
    serverError:    'No se pudieron cargar los personajes. ¿El servidor está activo?',
    historyLabel:   'Historial de conversación',
    todayLabel:     'Hoy',
    placeholder:    'Envía un mensaje',
    resetConfirm:   (name) => `¿Reiniciar la conversación con ${name}?`,
    networkError:   'Verifica tu conexión a internet~',
    noCharError:    'Sin personajes. Añade archivos JSON a characters/.',
    triggerFirst:   'Es la primera vez que el usuario abre el chat. Escríbele de forma natural, como si de repente pensaras en él/ella.',
    triggerReset:   'La conversación empieza de cero. Escríbele de forma natural, como si de repente pensaras en él/ella.',
    triggerGapFew:  'Han pasado unas horas sin hablar.',
    triggerGapHalf: 'Ha pasado casi un día sin hablar.',
    triggerGapDay:  'Ha pasado más de un día sin hablar.',
    triggerGapDays: 'Han pasado varios días sin hablar.',
    triggerGapSuffix: 'Escríbele de forma natural, como si de repente pensaras en él/ella.',
  },
  zh: {
    subtitle:       '选择你想聊天的偶像',
    filterAll:      '全部',
    filterFemale:   '女生',
    filterMale:     '男生',
    loading:        '加载中...',
    noChars:        '未找到角色。',
    serverError:    '无法加载角色，服务器正在运行吗？',
    historyLabel:   '聊天记录',
    todayLabel:     '今天',
    placeholder:    '发送消息',
    resetConfirm:   (name) => `要重置与${name}的对话吗？`,
    networkError:   '请检查网络连接~',
    noCharError:    '没有角色。请在 characters/ 中添加 JSON 文件。',
    triggerFirst:   '这是用户第一次打开聊天。就像突然想到对方、自然地发一条消息。',
    triggerReset:   '对话重新开始。就像突然想到对方、自然地发一条消息。',
    triggerGapFew:  '已经好几个小时没联系了。',
    triggerGapHalf: '已经将近一天没联系了。',
    triggerGapDay:  '已经超过一天没联系了。',
    triggerGapDays: '已经好几天没联系了。',
    triggerGapSuffix: '就像突然想到对方一样，自然地发一条消息。',
  },
};

// ── Active language (persisted to localStorage) ──
const LANG_KEY = 'idol_lang';

function getLang() {
  return localStorage.getItem(LANG_KEY) || 'en';
}

function setLang(lang) {
  if (!TRANSLATIONS[lang]) return;
  localStorage.setItem(LANG_KEY, lang);
}

function t(key, ...args) {
  const lang   = getLang();
  const bundle = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const val    = bundle[key] ?? TRANSLATIONS.en[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}

// ── Build the language <select> element ──
function buildLangSelect(onChange) {
  const current = getLang();
  const wrap = document.createElement('div');
  wrap.className = 'lang-selector-wrap';

  const globe = document.createElement('span');
  globe.className = 'lang-globe';
  globe.textContent = '🌐';

  const sel = document.createElement('select');
  sel.className = 'lang-select';
  sel.setAttribute('aria-label', 'Language');

  Object.entries(LANG_NAMES).forEach(([code, label]) => {
    const opt = document.createElement('option');
    opt.value   = code;
    opt.textContent = label;
    if (code === current) opt.selected = true;
    sel.appendChild(opt);
  });

  sel.addEventListener('change', () => {
    setLang(sel.value);
    if (onChange) onChange(sel.value);
  });

  wrap.appendChild(globe);
  wrap.appendChild(sel);
  return wrap;
}
