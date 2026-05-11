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
const avatarModal    = document.getElementById('avatarModal');
const avatarModalImg = document.getElementById('avatarModalImg');
const avatarModalClose = document.getElementById('avatarModalClose');
const profileBtn = document.getElementById('profileBtn');
const resetConfirmModal = document.getElementById('resetConfirmModal');
const resetConfirmMessage = document.getElementById('resetConfirmMessage');
const resetConfirmCancel = document.getElementById('resetConfirmCancel');
const resetConfirmOk = document.getElementById('resetConfirmOk');
const profileModal = document.getElementById('profileModal');
const profileModalClose = document.getElementById('profileModalClose');
const profileCancelBtn = document.getElementById('profileCancelBtn');
const profileSaveBtn = document.getElementById('profileSaveBtn');
const profileNameKo = document.getElementById('profileNameKo');
const profileNameEn = document.getElementById('profileNameEn');
const profileJob = document.getElementById('profileJob');
const profileEducation = document.getElementById('profileEducation');
const profileResidence = document.getElementById('profileResidence');
const profileNationality = document.getElementById('profileNationality');
const profileUserTimeMode = document.getElementById('profileUserTimeMode');
const profileUserTimeZone = document.getElementById('profileUserTimeZone');
const profileWeekend = document.getElementById('profileWeekend');
const profileInterests = document.getElementById('profileInterests');
const profileGender = document.getElementById('profileGender');
const profileGenderPerChar = document.getElementById('profileGenderPerChar');
const profileNotesPerChar = document.getElementById('profileNotesPerChar');
const profileCharacterTimeZone = document.getElementById('profileCharacterTimeZone');
const profileTitle = document.getElementById('profileTitle');
const labelProfileNameKo = document.getElementById('labelProfileNameKo');
const labelProfileNameEn = document.getElementById('labelProfileNameEn');
const labelProfileJob = document.getElementById('labelProfileJob');
const labelProfileEducation = document.getElementById('labelProfileEducation');
const labelProfileResidence = document.getElementById('labelProfileResidence');
const labelProfileNationality = document.getElementById('labelProfileNationality');
const labelProfileUserTimeMode = document.getElementById('labelProfileUserTimeMode');
const labelProfileUserTimeZone = document.getElementById('labelProfileUserTimeZone');
const labelProfileWeekend = document.getElementById('labelProfileWeekend');
const labelProfileInterests = document.getElementById('labelProfileInterests');
const labelProfileGender = document.getElementById('labelProfileGender');
const labelProfileGenderPerChar = document.getElementById('labelProfileGenderPerChar');
const labelProfileNotesPerChar = document.getElementById('labelProfileNotesPerChar');
const labelProfileCharacterTimeZone = document.getElementById('labelProfileCharacterTimeZone');
const optUserTimeAuto = document.getElementById('optUserTimeAuto');
const optUserTimeManual = document.getElementById('optUserTimeManual');
const optProfileUseDefault = document.getElementById('optProfileUseDefault');

// ── Character data ──
let character = null;

// ── Build avatar element (image if available, else gradient initials) ──
function buildAvatarEl(char, size = 40, radius = '50%') {
  const wrap = document.createElement('div');
  wrap.style.cssText = `width:${size}px;height:${size}px;border-radius:${radius};overflow:hidden;flex-shrink:0;`;

  const tryImg = (src, onFail) => {
    const img = new Image();
    img.src = src;
    img.alt = char.name;
    img.style.cssText = `width:100%;height:100%;object-fit:cover;object-position:50% 18%;`;

    // 성공하면 해당 이미지로 교체, 실패하면 wrapper를 비우고 다음 대안을 시도
    img.onload = () => {
      wrap.innerHTML = '';
      wrap.appendChild(img);
    };
    img.onerror = () => {
      wrap.innerHTML = '';
      onFail();
    };
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

// ── Avatar lightbox ──
function closeAvatarModal() {
  if (!avatarModal) return;
  avatarModal.classList.remove('show');
  avatarModal.setAttribute('aria-hidden', 'true');
  if (avatarModalImg) avatarModalImg.src = '';
  document.body.style.overflow = '';
}

function openAvatarModal(char) {
  if (!avatarModal || !avatarModalImg) return;

  avatarModalImg.alt = char.name;
  avatarModal.classList.add('show');
  avatarModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  const id = char.id;
  avatarModalImg.onerror = () => {
    // jpg 실패 시 png로 다시 시도
    avatarModalImg.onerror = () => closeAvatarModal();
    avatarModalImg.src = `/${id}.png`;
  };
  avatarModalImg.src = `/${id}.jpg`;
}

if (avatarModal) {
  avatarModal.addEventListener('click', (e) => {
    // overlay 바깥(배경)을 눌렀을 때만 닫기
    if (e.target === avatarModal) closeAvatarModal();
  });
}
if (avatarModalClose) avatarModalClose.addEventListener('click', closeAvatarModal);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAvatarModal();
    closeProfileModal();
  }
});

if (profileBtn) profileBtn.addEventListener('click', openProfileModal);
if (profileModalClose) profileModalClose.addEventListener('click', closeProfileModal);
if (profileCancelBtn) profileCancelBtn.addEventListener('click', closeProfileModal);
if (profileSaveBtn) profileSaveBtn.addEventListener('click', saveUserProfile);
if (profileModal) {
  profileModal.addEventListener('click', (e) => {
    if (e.target === profileModal) closeProfileModal();
  });
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

// IME (Korean / CJK): Chromium/Electron + Windows often lose IME after native dialogs (confirm)
// or long async work. Plain focus() is not enough — blur first, then focus on the next frame(s).
function focusMessageInputForIme() {
  if (!messageInput || messageInput.disabled) return;
  const start = messageInput.selectionStart ?? messageInput.value.length;
  const end = messageInput.selectionEnd ?? messageInput.value.length;
  messageInput.blur();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      messageInput.focus({ preventScroll: true });
      try {
        messageInput.setSelectionRange(start, end);
      } catch (_) {
        /* ignore */
      }
    });
  });
}

// Refocus the textarea when the window/tab becomes active again if it still owns focus.
function refreshMessageInputImeIfFocused() {
  if (!messageInput || messageInput.disabled) return;
  if (document.activeElement !== messageInput) return;
  focusMessageInputForIme();
}

let imeRefreshQueued = false;
function queueMessageInputImeRefresh() {
  if (imeRefreshQueued) return;
  imeRefreshQueued = true;
  requestAnimationFrame(() => {
    imeRefreshQueued = false;
    refreshMessageInputImeIfFocused();
  });
}

window.addEventListener('focus', queueMessageInputImeRefresh);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) queueMessageInputImeRefresh();
});

// ── State ──
let apiHistory = [];
let uiHistory  = [];
let isWaiting  = false;
let userProfile = null;

function openProfileModal() {
  if (!profileModal) return;
  profileModal.classList.add('show');
  profileModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeProfileModal() {
  if (!profileModal) return;
  profileModal.classList.remove('show');
  profileModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/** In-page reset confirm — native `confirm()` breaks Korean IME on Windows/Electron. */
function openResetConfirmModal() {
  return new Promise((resolve) => {
    if (!resetConfirmModal || !resetConfirmMessage || !resetConfirmCancel || !resetConfirmOk) {
      resolve(false);
      return;
    }

    resetConfirmMessage.textContent = t('resetConfirm', character?.name ?? '...');
    resetConfirmCancel.textContent = t('profileCancel');
    resetConfirmOk.textContent = t('resetModalOk');

    resetConfirmModal.classList.add('show');
    resetConfirmModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resetConfirmModal.classList.remove('show');
      resetConfirmModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      resetConfirmModal.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onKey);
      resolve(result);
      if (!result) {
        requestAnimationFrame(() => focusMessageInputForIme());
      }
    };

    function onBackdrop(e) {
      if (e.target === resetConfirmModal) finish(false);
    }

    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish(false);
      }
    }

    resetConfirmCancel.onclick = () => finish(false);
    resetConfirmOk.onclick = () => finish(true);
    resetConfirmModal.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKey);

    requestAnimationFrame(() => {
      resetConfirmCancel.focus();
    });
  });
}

function applyProfileI18n() {
  if (!profileTitle) return;
  profileTitle.textContent = t('profileTitle');
  labelProfileNameKo.childNodes[0].nodeValue = `${t('profileNameKo')}\n          `;
  labelProfileNameEn.childNodes[0].nodeValue = `${t('profileNameEn')}\n          `;
  labelProfileJob.childNodes[0].nodeValue = `${t('profileJob')}\n          `;
  labelProfileEducation.childNodes[0].nodeValue = `${t('profileEducation')}\n          `;
  labelProfileResidence.childNodes[0].nodeValue = `${t('profileResidence')}\n          `;
  labelProfileNationality.childNodes[0].nodeValue = `${t('profileNationality')}\n          `;
  labelProfileUserTimeMode.childNodes[0].nodeValue = `${t('profileUserTimeMode')}\n          `;
  labelProfileUserTimeZone.childNodes[0].nodeValue = `${t('profileUserTimeZone')}\n          `;
  labelProfileWeekend.childNodes[0].nodeValue = `${t('profileWeekend')}\n          `;
  labelProfileInterests.childNodes[0].nodeValue = `${t('profileInterests')}\n          `;
  labelProfileGender.childNodes[0].nodeValue = `${t('profileGender')}\n          `;
  labelProfileGenderPerChar.childNodes[0].nodeValue = `${t('profileGenderPerChar')}\n          `;
  labelProfileNotesPerChar.childNodes[0].nodeValue = `${t('profileNotesPerChar')}\n          `;
  labelProfileCharacterTimeZone.childNodes[0].nodeValue = `${t('profileCharacterTimeZone')}\n          `;
  optUserTimeAuto.textContent = t('profileUserTimeAuto');
  optUserTimeManual.textContent = t('profileUserTimeManual');
  optProfileUseDefault.textContent = t('profileUseDefault');
  profileCancelBtn.textContent = t('profileCancel');
  profileSaveBtn.textContent = t('profileSave');
}

function fillProfileForm(payload) {
  const base = payload?.baseProfile || {};
  const per = payload?.perCharacter?.[CHARACTER_ID] || {};
  if (!profileJob) return;

  profileNameKo.value = base.nameKo || '';
  profileNameEn.value = base.nameEn || '';
  profileJob.value = base.job || '';
  profileEducation.value = base.education || '';
  profileResidence.value = base.residence || '';
  profileNationality.value = base.nationality || '';
  profileUserTimeMode.value = base.userTimeMode || 'auto';
  profileUserTimeZone.value = base.userTimeZone || 'Asia/Seoul';
  profileWeekend.value = base.weekendRoutine || '';
  profileInterests.value = Array.isArray(base.interests) ? base.interests.join(', ') : '';
  profileGender.value = base.gender || 'unspecified';
  profileGenderPerChar.value = per.gender || '';
  profileNotesPerChar.value = per.notes || '';
  profileCharacterTimeZone.value = per.characterTimeZone || base.characterTimeZone || 'Asia/Seoul';
}

function buildProfilePayload() {
  const baseProfile = {
    ...(userProfile?.baseProfile || {}),
    nameKo: profileNameKo?.value.trim() || '',
    nameEn: profileNameEn?.value.trim() || '',
    job: profileJob?.value.trim() || '',
    education: profileEducation?.value.trim() || '',
    residence: profileResidence?.value.trim() || '',
    nationality: profileNationality?.value.trim() || '',
    userTimeMode: profileUserTimeMode?.value || 'auto',
    userTimeZone: profileUserTimeZone?.value || 'Asia/Seoul',
    weekendRoutine: profileWeekend?.value.trim() || '',
    interests: (profileInterests?.value || '').split(',').map(v => v.trim()).filter(Boolean),
    gender: profileGender?.value || 'unspecified',
    characterTimeZone: userProfile?.baseProfile?.characterTimeZone || 'Asia/Seoul',
  };

  const perCharacter = { ...(userProfile?.perCharacter || {}) };
  const nextPerChar = {
    gender: profileGenderPerChar?.value.trim() || '',
    notes: profileNotesPerChar?.value.trim() || '',
    characterTimeZone: profileCharacterTimeZone?.value || 'Asia/Seoul',
  };

  if (nextPerChar.gender || nextPerChar.notes || nextPerChar.characterTimeZone) {
    perCharacter[CHARACTER_ID] = nextPerChar;
  } else {
    delete perCharacter[CHARACTER_ID];
  }

  return { baseProfile, perCharacter };
}

async function loadUserProfile() {
  try {
    const res = await fetch(`/api/user-profile?characterId=${CHARACTER_ID}`);
    if (!res.ok) return;
    userProfile = await res.json();
    fillProfileForm(userProfile);
  } catch (_) {}
}

async function saveUserProfile() {
  try {
    const body = buildProfilePayload();
    const res = await fetch('/api/user-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('save failed');
    const data = await res.json();
    userProfile = data.profile || body;
    closeProfileModal();
    addMessage('프로필 저장됨. 다음 답변부터 반영할게.', 'received');
  } catch (_) {
    addMessage('프로필 저장 실패. 다시 시도해줘.', 'received');
  }
}

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
    av.addEventListener('click', () => openAvatarModal(character));
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
  av.addEventListener('click', () => openAvatarModal(character));
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
const getClientTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch (_) {
    return null;
  }
};

function resolveUserTimeZoneForRequest() {
  const base = userProfile?.baseProfile || {};
  if (base.userTimeMode === 'manual') {
    return base.userTimeZone || 'Asia/Seoul';
  }
  return getClientTimeZone();
}

function resolveCharacterTimeZoneForRequest() {
  const base = userProfile?.baseProfile || {};
  const per = userProfile?.perCharacter?.[CHARACTER_ID] || {};
  return per.characterTimeZone || base.characterTimeZone || 'Asia/Seoul';
}

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
function normalizeSegmentText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n+/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

async function displaySegments(segments) {
  const results = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = normalizeSegmentText(segments[i]);
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
      body: JSON.stringify({
        messages: apiHistory,
        characterId: CHARACTER_ID,
        lang: getLang(),
        timeZone: resolveUserTimeZoneForRequest(),
        characterTimeZone: resolveCharacterTimeZoneForRequest(),
      }),
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
      const segments = fullApiText.split('|').map(normalizeSegmentText).filter(Boolean);
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
    focusMessageInputForIme();
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
      body: JSON.stringify({
        messages: triggerMessages,
        characterId: CHARACTER_ID,
        lang: getLang(),
        timeZone: resolveUserTimeZoneForRequest(),
        characterTimeZone: resolveCharacterTimeZoneForRequest(),
      }),
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
      const segments  = fullText.split('|').map(normalizeSegmentText).filter(Boolean);
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
    focusMessageInputForIme();
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
  const ok = await openResetConfirmModal();
  if (!ok) return;
  await clearHistory();
  chatArea.innerHTML = '';
  const divider = document.createElement('div');
  divider.className = 'date-divider';
  divider.innerHTML = `<span>${t('todayLabel')}</span>`;
  chatArea.appendChild(divider);
  triggerFirstMessage(t('triggerReset'));
});

// ── Back button ──
backBtn.addEventListener('click', () => { location.href = '/'; });

// ── Auto-resize textarea ──
messageInput.addEventListener('input', () => {
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 100) + 'px';
});

// ── Enter to send (skip while IME is composing Hangul etc.) ──
messageInput.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.shiftKey) return;
  // isComposing: active IME composition; 229: legacy IME processing (Windows/Chromium)
  if (e.isComposing || e.keyCode === 229) return;
  e.preventDefault();
  sendMessage();
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
  applyProfileI18n();
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
  applyProfileI18n();

  // Update page title and header
  document.title = `${character.name} (${character.koreanName})`;

  headerName.textContent   = `${character.name} ${character.koreanName}`;
  headerStatus.textContent = [character.group, character.role].filter(Boolean).join(' · ');

  // Header avatar
  headerAvatar.style.borderRadius = '50%';
  headerAvatar.style.overflow     = 'hidden';
  headerAvatar.appendChild(buildAvatarEl(character, 40, '50%'));
  headerAvatar.addEventListener('click', () => openAvatarModal(character));

  // Typing indicator avatar
  typingAvatar.appendChild(buildAvatarEl(character, 32, '8px'));

  // Accent color on send button
  const sendBtnEl = document.getElementById('sendBtn');
  sendBtnEl.style.background = character.color;
  sendBtnEl.style.color = '#fff';

  // Load user profile + history
  await loadUserProfile();
  const hasHistory = await loadHistory();

  if (hasHistory) {
    renderAllHistory();
    scrollBottom(false);
    focusMessageInputForIme();
    checkAndSendFirstMessage();
  } else {
    const divider = document.createElement('div');
    divider.className = 'date-divider';
    divider.innerHTML = `<span>${t('todayLabel')}</span>`;
    chatArea.appendChild(divider);
    scrollBottom(false);
    focusMessageInputForIme();
    triggerFirstMessage(t('triggerFirst'));
  }
});
