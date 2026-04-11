// ── Read character ID from URL ──
const params      = new URLSearchParams(location.search);
const CHARACTER_ID = params.get('id') || '';

if (!CHARACTER_ID) {
  location.replace('/');
}

// ── Elements ──
const chatArea       = document.getElementById('chatArea');
const messageInput   = document.getElementById('messageInput');
const sendBtn        = document.getElementById('sendBtn');
const typingIndicator= document.getElementById('typingIndicator');
const typingAvatar   = document.getElementById('typingAvatar');
const resetBtn       = document.getElementById('resetBtn');
const backBtn        = document.getElementById('backBtn');
const emojiBtn       = document.getElementById('emojiBtn');
const emojiPicker    = document.getElementById('emojiPicker');
const headerAvatar   = document.getElementById('headerAvatar');
const headerName     = document.getElementById('headerName');
const headerStatus   = document.getElementById('headerStatus');
const chatHeader     = document.getElementById('chatHeader');

// ── Character data ──
let character = null;

// ── Build avatar element (image if available, else gradient initials) ──
function buildAvatarEl(char, size = 40, radius = '50%') {
  const wrap = document.createElement('div');
  wrap.style.cssText = `width:${size}px;height:${size}px;border-radius:${radius};overflow:hidden;flex-shrink:0;`;

  const tryImg = (src, fallback) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = char.name;
    img.style.cssText = `width:100%;height:100%;object-fit:cover;object-position:50% 18%;`;
    img.onerror = fallback;
    wrap.appendChild(img);
  };

  const gradFallback = () => {
    wrap.innerHTML = '';
    const initials = char.name.split(/[\s-]/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    wrap.style.background = `linear-gradient(135deg, ${char.color}, ${char.color2})`;
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.style.justifyContent = 'center';
    wrap.style.color = '#fff';
    wrap.style.fontWeight = '700';
    wrap.style.fontSize = `${Math.round(size * 0.35)}px`;
    wrap.textContent = initials;
  };

  tryImg(`/${char.id}.jpg`, () => tryImg(`/${char.id}.png`, gradFallback));
  return wrap;
}

// ── Emoji Picker ──
const EMOJIS = [
  '😊','😂','🥰','😍','🤩','😘','😗','😙','😚','🥹',
  '😅','😆','😁','😀','🙂','😉','😋','😛','😜','🤪',
  '🤭','🤫','🤔','🫠','🥲','😢','😭','😤','😠','🥺',
  '😳','🫣','😱','😨','😰','😓','🤗','🫶','👀','💀',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','💕','💞',
  '💓','💗','💖','💝','💘','💌','💟','❣️','💔','🫀',
  '🔥','✨','🎉','🎊','🌈','⭐','🌟','💫','🎵','🎶',
  '🍕','🍔','🍣','🍜','🍦','🧁','🍰','🎂','🍩','🍪',
  '🐶','🐱','🐰','🐻','🐼','🐨','🦊','🐯','🦁','🐸',
  '👍','👎','👏','🙌','🤝','🫂','💪','🤜','🤛','✌️',
];

const grid = emojiPicker.querySelector('.emoji-grid');
EMOJIS.forEach(emoji => {
  const btn = document.createElement('button');
  btn.textContent = emoji;
  btn.addEventListener('mousedown', e => e.preventDefault());
  btn.addEventListener('click', () => {
    const pos = messageInput.selectionStart ?? messageInput.value.length;
    const val = messageInput.value;
    messageInput.value = val.slice(0, pos) + emoji + val.slice(pos);
    messageInput.selectionStart = messageInput.selectionEnd = pos + emoji.length;
    messageInput.dispatchEvent(new Event('input'));
  });
  grid.appendChild(btn);
});

emojiBtn.addEventListener('click', () => {
  const isOpen = emojiPicker.style.display !== 'none';
  emojiPicker.style.display = isOpen ? 'none' : 'block';
  emojiBtn.classList.toggle('active', !isOpen);
});

messageInput.addEventListener('focus', () => {
  if (emojiPicker.style.display !== 'none') {
    emojiPicker.style.display = 'none';
    emojiBtn.classList.remove('active');
  }
});

// ── State ──
let apiHistory = [];
let uiHistory  = [];
let isWaiting  = false;

// ── Persistence ──
async function saveHistory() {
  try {
    await fetch(`/api/history/${CHARACTER_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiHistory, uiHistory, lang: getLang() }),
    });
  } catch (_) {}
}

async function loadHistory() {
  try {
    const res = await fetch(`/api/history/${CHARACTER_ID}`);
    if (!res.ok) return false;
    const data = await res.json();
    if (!data.uiHistory || !data.uiHistory.length) return false;

    uiHistory = data.uiHistory || [];

    apiHistory = data.apiHistory || [];
    return true;
  } catch (_) {
    return false;
  }
}

async function clearHistory() {
  apiHistory = [];
  uiHistory  = [];
  try {
    await fetch(`/api/history/${CHARACTER_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiHistory: [], uiHistory: [] }),
    });
  } catch (_) {}
}

// ── Time ──
function getTime() {
  const d = new Date();
  let h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${ampm} ${h}:${String(m).padStart(2, '0')}`;
}

// ── Emoji-only check ──
function isEmojiOnly(text) {
  const stripped = text.replace(/\p{Emoji}/gu, '').trim();
  return stripped.length === 0 && /\p{Emoji}/u.test(text);
}

// ── Render a single message row ──
function renderMessage(item, prevType) {
  const { type, text, time } = item;
  const emojiOnly = isEmojiOnly(text);

  const row = document.createElement('div');
  row.className = `message-row ${type}`;

  if (type === 'received') {
    if (prevType === 'received') {
      row.classList.add('no-avatar');
    }
    const av = buildAvatarEl(character, 38, '10px');
    av.className = 'avatar';
    row.appendChild(av);
  }

  const wrap = document.createElement('div');
  wrap.className = 'bubble-wrap';

  const bubble = document.createElement('div');
  bubble.className = emojiOnly ? 'bubble emoji-only' : 'bubble';
  bubble.textContent = text;

  const timeEl = document.createElement('div');
  timeEl.className = 'time';
  timeEl.textContent = time;

  wrap.appendChild(bubble);
  wrap.appendChild(timeEl);
  row.appendChild(wrap);
  chatArea.appendChild(row);
  return bubble;
}

// ── Render all history ──
function renderAllHistory() {
  chatArea.innerHTML = '';
  const divider = document.createElement('div');
  divider.className = 'date-divider';
  divider.innerHTML = `<span>${t('historyLabel')}</span>`;
  chatArea.appendChild(divider);

  for (let i = 0; i < uiHistory.length; i++) {
    renderMessage(uiHistory[i], i > 0 ? uiHistory[i - 1].type : null);
  }
}

// ── Scroll ──
function scrollBottom(smooth = true) {
  chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
}

// ── Add message (live) ──
function addMessage(text, type) {
  const time = getTime();
  const prevType = uiHistory.length > 0 ? uiHistory[uiHistory.length - 1].type : null;
  uiHistory.push({ type, text, time });
  saveHistory();
  renderMessage({ type, text, time }, prevType);
  scrollBottom();
}

// ── Streaming bubble ──
function addStreamingBubble() {
  const prevType = uiHistory.length > 0 ? uiHistory[uiHistory.length - 1].type : null;

  const row = document.createElement('div');
  row.className = 'message-row received';
  if (prevType === 'received') row.classList.add('no-avatar');

  const av = buildAvatarEl(character, 38, '10px');
  av.className = 'avatar';
  row.appendChild(av);

  const wrap = document.createElement('div');
  wrap.className = 'bubble-wrap';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  const timeEl = document.createElement('div');
  timeEl.className = 'time';
  timeEl.textContent = getTime();

  wrap.appendChild(bubble);
  wrap.appendChild(timeEl);
  row.appendChild(wrap);
  chatArea.appendChild(row);

  return { bubble, timeEl };
}

// ── Typing indicator ──
function showTyping() {
  chatArea.appendChild(typingIndicator);
  typingIndicator.style.display = 'flex';
  scrollBottom();
}

function hideTyping() {
  typingIndicator.style.display = 'none';
}

// ── Helpers ──
const sleep = ms => new Promise(r => setTimeout(r, ms));

function readingDelay(text) {
  const len = text.length;
  const base = len < 15 ? 500 : len < 40 ? 900 : len < 80 ? 1400 : 1900;
  return base + Math.random() * 500;
}

// ── TypeWriter — reveal one bubble at human typing speed ──
class TypeWriter {
  constructor(bubble) {
    this.bubble  = bubble;
    this.pending = '';
    this.shown   = '';
    this.apiDone = false;
    this.resolve = null;
    this._tick();
  }
  push(text)  { this.pending += text; }
  finish()    { this.apiDone = true; }
  wait()      { return new Promise(r => { this.resolve = r; }); }

  async _tick() {
    while (true) {
      if (this.pending.length > 0) {
        const n = Math.min(Math.ceil(Math.random() * 3), this.pending.length);
        this.shown  += this.pending.slice(0, n);
        this.pending = this.pending.slice(n);
        this.bubble.textContent = this.shown;
        scrollBottom(false);
        await sleep(18 + Math.random() * 32);
      } else if (this.apiDone) {
        if (this.resolve) this.resolve(this.shown);
        return;
      } else {
        await sleep(16);
      }
    }
  }
}

// ── Display | -separated segments sequentially ──
async function displaySegments(segments) {
  const results = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i].trim();
    if (!seg) continue;

    if (i > 0) {
      showTyping();
      await sleep(600 + seg.length * 30 + Math.random() * 400);
      hideTyping();
    }

    const els    = addStreamingBubble();
    const writer = new TypeWriter(els.bubble);
    writer.push(seg);
    writer.finish();
    const final = await writer.wait();

    results.push({ text: final, time: els.timeEl.textContent });
  }
  return results;
}

// ── Send message ──
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || isWaiting) return;

  isWaiting = true;
  sendBtn.disabled = true;
  messageInput.value = '';
  messageInput.style.height = 'auto';

  addMessage(text, 'sent');
  apiHistory.push({ role: 'user', content: text });
  saveHistory();

  await sleep(readingDelay(text));
  showTyping();

  let fullApiText = '';
  let apiError    = null;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: apiHistory, characterId: CHARACTER_ID, lang: getLang() }),
    });

    if (!response.ok) throw new Error('Server error');

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value, { stream: true }).split('\n')) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'delta') fullApiText += data.text;
          if (data.type === 'error') apiError = data.message;
        } catch (_) {}
      }
    }

    hideTyping();

    if (apiError) {
      addMessage(apiError, 'received');
      if (apiHistory.at(-1)?.role === 'user') { apiHistory.pop(); saveHistory(); }
    } else if (fullApiText) {
      const segments = fullApiText.split('|').map(s => s.trim()).filter(Boolean);
      const displayed = await displaySegments(segments);
      apiHistory.push({ role: 'assistant', content: fullApiText });
      for (const { text: t, time } of displayed) {
        uiHistory.push({ type: 'received', text: t, time });
      }
      saveHistory();
    }

  } catch (err) {
    hideTyping();
    addMessage(t('networkError'), 'received');
    if (apiHistory.at(-1)?.role === 'user') { apiHistory.pop(); saveHistory(); }
  } finally {
    isWaiting       = false;
    sendBtn.disabled = false;
    messageInput.focus();
  }
}

// ── First message (triggered invisibly) ──
async function triggerFirstMessage(trigger) {
  if (isWaiting) return;
  isWaiting       = true;
  sendBtn.disabled = true;

  await sleep(800 + Math.random() * 600);
  showTyping();

  const triggerMessages = [...apiHistory, { role: 'user', content: trigger }];
  let fullText = '';

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: triggerMessages, characterId: CHARACTER_ID, lang: getLang() }),
    });

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value, { stream: true }).split('\n')) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'delta') fullText += data.text;
        } catch (_) {}
      }
    }

    hideTyping();
    if (fullText) {
      const segments  = fullText.split('|').map(s => s.trim()).filter(Boolean);
      const displayed = await displaySegments(segments);
      apiHistory.push({ role: 'user', content: trigger });
      apiHistory.push({ role: 'assistant', content: fullText });
      for (const { text: t, time } of displayed) {
        uiHistory.push({ type: 'received', text: t, time });
      }
      saveHistory();
    }
  } catch (_) {
    hideTyping();
  } finally {
    isWaiting       = false;
    sendBtn.disabled = false;
    messageInput.focus();
  }
}

// ── Proactive first contact (after inactivity) ──
function checkAndSendFirstMessage() {
  if (!uiHistory.length) return;

  const stored   = localStorage.getItem(`idol_last_active_${CHARACTER_ID}`);
  const lastActive = stored ? parseInt(stored) : 0;
  const gapHours   = (Date.now() - lastActive) / 3600000;

  localStorage.setItem(`idol_last_active_${CHARACTER_ID}`, Date.now().toString());

  if (gapHours < 2) return;

  const gapText = gapHours < 6  ? t('triggerGapFew')
                : gapHours < 24 ? t('triggerGapHalf')
                : gapHours < 48 ? t('triggerGapDay')
                :                 t('triggerGapDays');

  triggerFirstMessage(`${gapText}. ${t('triggerGapSuffix')}`);
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    localStorage.setItem(`idol_last_active_${CHARACTER_ID}`, Date.now().toString());
  }
});

// ── Reset ──
resetBtn.addEventListener('click', async () => {
  if (!confirm(t('resetConfirm', character?.name ?? '...'))) return;
  await clearHistory();
  chatArea.innerHTML = '';
  const divider = document.createElement('div');
  divider.className = 'date-divider';
  divider.innerHTML = `<span>${t('todayLabel')}</span>`;
  chatArea.appendChild(divider);
  // Trigger a fresh greeting
  triggerFirstMessage(t('triggerReset'));
});

// ── Back button ──
backBtn.addEventListener('click', () => { location.href = '/'; });

// ── Auto-resize textarea ──
messageInput.addEventListener('input', () => {
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 100) + 'px';
});

// ── Enter to send ──
messageInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener('click', sendMessage);

// ── Language switch with translation ──
async function translateAndSwitch(newLang) {
  if (!uiHistory.length) {
    setLang(newLang);
    messageInput.placeholder = t('placeholder');
    return;
  }

  // Show loading state on input
  messageInput.disabled = true;
  sendBtn.disabled = true;
  messageInput.placeholder = '...';

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: uiHistory, targetLang: newLang }),
    });

    if (res.ok) {
      const data = await res.json();
      uiHistory = data.messages;
    }
  } catch (_) { /* keep original on failure */ }

  setLang(newLang);
  apiHistory = [];   // wipe so Claude starts fresh in new language
  await saveHistory();
  renderAllHistory();
  scrollBottom(false);

  messageInput.disabled = false;
  sendBtn.disabled = false;
  messageInput.placeholder = t('placeholder');
}

// ── Init ──
window.addEventListener('load', async () => {
  // Load character metadata
  try {
    const res  = await fetch('/api/characters?lang=' + getLang());
    const list = await res.json();
    character  = list.find(c => c.id === CHARACTER_ID);
    if (!character) {
      alert('Character not found.');
      location.replace('/');
      return;
    }
  } catch (e) {
    alert('Could not load character data.');
    location.replace('/');
    return;
  }

  // Mount language selector in chat header
  const chatLangMount = document.getElementById('chatLangMount');
  if (chatLangMount) {
    chatLangMount.appendChild(buildLangSelect(async (newLang) => {
      await translateAndSwitch(newLang);
    }));
  }

  // Apply language to input placeholder
  messageInput.placeholder = t('placeholder');

  // Update page title and header
  document.title = `${character.name} (${character.koreanName})`;

  headerName.textContent   = `${character.name} ${character.koreanName}`;
  headerStatus.textContent = `${character.group} · ${character.role}`;

  // Header avatar
  headerAvatar.style.borderRadius = '50%';
  headerAvatar.style.overflow     = 'hidden';
  headerAvatar.appendChild(buildAvatarEl(character, 40, '50%'));

  // Typing indicator avatar
  typingAvatar.appendChild(buildAvatarEl(character, 32, '8px'));

  // Accent color on send button
  const sendBtnEl = document.getElementById('sendBtn');
  sendBtnEl.style.background = character.color;
  sendBtnEl.style.color = '#fff';

  // Load history
  const hasHistory = await loadHistory();

  if (hasHistory) {
    renderAllHistory();
    scrollBottom(false);
    messageInput.focus();
    checkAndSendFirstMessage();
  } else {
    const divider = document.createElement('div');
    divider.className = 'date-divider';
    divider.innerHTML = `<span>${t('todayLabel')}</span>`;
    chatArea.appendChild(divider);
    scrollBottom(false);
    messageInput.focus();
    triggerFirstMessage(t('triggerFirst'));
  }
});
