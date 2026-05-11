// Character selection page

const grid          = document.getElementById('characterGrid');
const loadingEl     = document.getElementById('loadingState');
const errorEl       = document.getElementById('errorState');
const catBtns       = document.querySelectorAll('[data-category]');
const genderBtns    = document.querySelectorAll('[data-gender]');
const bgModeLabelEl = document.getElementById('bgModeLabel');
const bgModeNormalBtn = document.getElementById('bgModeNormal');
const bgModeLightBtn = document.getElementById('bgModeLight');
const editModeToggleBtn = document.getElementById('editModeToggle');
const BG_MODE_KEY = 'idol_bg_mode';
const characterEditModal = document.getElementById('characterEditModal');
const characterEditTitle = document.getElementById('characterEditTitle');
const characterEditClose = document.getElementById('characterEditClose');
const characterEditCancel = document.getElementById('characterEditCancel');
const characterEditSave = document.getElementById('characterEditSave');
const characterEditDelete = document.getElementById('characterEditDelete');
const editName = document.getElementById('editName');
const editKoreanName = document.getElementById('editKoreanName');
const editTagline = document.getElementById('editTagline');
const editRole = document.getElementById('editRole');
const editGroup = document.getElementById('editGroup');
const editAge = document.getElementById('editAge');
const editCategory = document.getElementById('editCategory');
const editGender = document.getElementById('editGender');
const editColor = document.getElementById('editColor');
const editColorPicker = document.getElementById('editColorPicker');
const editSystemPrompt = document.getElementById('editSystemPrompt');
const editAvatarFile = document.getElementById('editAvatarFile');
const editAvatarFieldLabel = document.getElementById('editAvatarFieldLabel');
const editAvatarPickBtn = document.getElementById('editAvatarPickBtn');
const editAvatarFileStatus = document.getElementById('editAvatarFileStatus');
const editAvatarPreview = document.getElementById('editAvatarPreview');
const runtimeSettingsBtn = document.getElementById('runtimeSettingsBtn');
const runtimeConfigModal = document.getElementById('runtimeConfigModal');
const runtimeConfigTitle = document.getElementById('runtimeConfigTitle');
const runtimeConfigHelp = document.getElementById('runtimeConfigHelp');
const runtimeConfigNote = document.getElementById('runtimeConfigNote');
const runtimeConfigClose = document.getElementById('runtimeConfigClose');
const runtimeConfigCancel = document.getElementById('runtimeConfigCancel');
const runtimeConfigSave = document.getElementById('runtimeConfigSave');
const runtimeAdvancedToggle = document.getElementById('runtimeAdvancedToggle');
const runtimeAdvancedFields = document.getElementById('runtimeAdvancedFields');
const runtimeHostLabel = document.getElementById('runtimeHostLabel');
const runtimePortLabel = document.getElementById('runtimePortLabel');
const configAiProvider = document.getElementById('configAiProvider');
const configModelPreset = document.getElementById('configModelPreset');
const configHfWrap = document.getElementById('configHfWrap');
const configOpenAiWrap = document.getElementById('configOpenAiWrap');
const configAnthropicWrap = document.getElementById('configAnthropicWrap');
const configHfToken = document.getElementById('configHfToken');
const configOpenAiKey = document.getElementById('configOpenAiKey');
const configAnthropicKey = document.getElementById('configAnthropicKey');
const configHost = document.getElementById('configHost');
const configPort = document.getElementById('configPort');
const appToast = document.getElementById('appToast');
const deleteCharModal = document.getElementById('deleteCharModal');
const deleteCharIntro = document.getElementById('deleteCharIntro');
const deleteCharNameInput = document.getElementById('deleteCharNameInput');
const deleteCharCancel = document.getElementById('deleteCharCancel');
const deleteCharConfirm = document.getElementById('deleteCharConfirm');
let isEditMode = false;
let runtimeConfigState = null;
let isRuntimeAdvancedOpen = false;
/** Escape closes delete modal first (must run before closeEditModal). */
let pendingDeleteModalCancel = null;
let toastHideTimer = null;
/** Avatar pick state (must exist before first applyI18n → refreshEditAvatarFileStatus). */
let selectedAvatarFile = null;
let selectedAvatarPreviewUrl = '';
let avatarVersion = Date.now();
const MASKED_SECRET_VALUE = '********';

function showToast(message) {
  if (!appToast) return;
  appToast.textContent = message;
  appToast.classList.add('show');
  clearTimeout(toastHideTimer);
  toastHideTimer = setTimeout(() => appToast.classList.remove('show'), 4200);
}

/** Windows/Electron IME: blur → refocus helps attach IME after modal opens. */
function focusFieldForIme(field) {
  if (!field || field.disabled) return;
  const start = field.selectionStart ?? field.value.length;
  const end = field.selectionEnd ?? field.value.length;
  field.blur();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      field.focus({ preventScroll: true });
      try {
        field.setSelectionRange(start, end);
      } catch (_) {
        /* ignore */
      }
    });
  });
}

function refreshEditAvatarFileStatus() {
  if (!editAvatarFileStatus) return;
  const f = selectedAvatarFile || (editAvatarFile?.files?.[0] ?? null);
  editAvatarFileStatus.textContent = f ? f.name : t('editAvatarNoFile');
}

/** Hidden file input: visible strings come from i18n (OS file widget was always Korean on KO Windows). */
function syncAvatarUploadI18n() {
  if (editAvatarFieldLabel) editAvatarFieldLabel.textContent = t('editAvatarLabel');
  if (editAvatarPickBtn) editAvatarPickBtn.textContent = t('editAvatarChoose');
  refreshEditAvatarFileStatus();
}

// ── Apply translations to static UI elements ──
function applyI18n() {
  document.getElementById('heroSubtitle').textContent    = t('subtitle');
  document.getElementById('filterAll').textContent       = t('filterAll');
  document.getElementById('filterIdol').textContent      = t('filterIdol');
  document.getElementById('filterFriend').textContent    = t('filterFriend');
  document.getElementById('filterGenderAll').textContent = t('filterGenderAll');
  document.getElementById('filterFemale').textContent    = t('filterFemale');
  document.getElementById('filterMale').textContent      = t('filterMale');
  if (bgModeLabelEl) bgModeLabelEl.textContent = t('bgModeLabel');
  if (bgModeNormalBtn) bgModeNormalBtn.textContent = t('bgModeNormal');
  if (bgModeLightBtn) bgModeLightBtn.textContent = t('bgModeLight');
  if (editModeToggleBtn) editModeToggleBtn.textContent = isEditMode ? t('editModeOn') : t('editModeOff');
  if (runtimeSettingsBtn) runtimeSettingsBtn.textContent = t('runtimeSetupBtn');
  if (runtimeConfigTitle) runtimeConfigTitle.textContent = t('runtimeSetupTitle');
  if (runtimeConfigHelp) runtimeConfigHelp.textContent = t('runtimeSetupHelp');
  if (runtimeAdvancedToggle) {
    runtimeAdvancedToggle.textContent = isRuntimeAdvancedOpen ? t('runtimeAdvancedHide') : t('runtimeAdvancedShow');
  }
  if (runtimeHostLabel) runtimeHostLabel.textContent = t('runtimeHostLabel');
  if (runtimePortLabel) runtimePortLabel.textContent = t('runtimePortLabel');
  if (characterEditDelete) characterEditDelete.textContent = t('deleteCharacter');
  syncAvatarUploadI18n();
  loadingEl.textContent = t('loading');
  if (errorEl.dataset.key) errorEl.textContent = t(errorEl.dataset.key);
}

function setRuntimeAdvancedOpen(open) {
  isRuntimeAdvancedOpen = !!open;
  if (runtimeAdvancedFields) {
    runtimeAdvancedFields.classList.toggle('show', isRuntimeAdvancedOpen);
    runtimeAdvancedFields.setAttribute('aria-hidden', isRuntimeAdvancedOpen ? 'false' : 'true');
  }
  if (runtimeAdvancedToggle) {
    runtimeAdvancedToggle.classList.toggle('active', isRuntimeAdvancedOpen);
    runtimeAdvancedToggle.textContent = isRuntimeAdvancedOpen ? t('runtimeAdvancedHide') : t('runtimeAdvancedShow');
  }
}

function openRuntimeConfigModal() {
  if (!runtimeConfigModal) return;
  setRuntimeAdvancedOpen(false);
  runtimeConfigModal.classList.add('show');
  runtimeConfigModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeRuntimeConfigModal() {
  if (!runtimeConfigModal) return;
  runtimeConfigModal.classList.remove('show');
  runtimeConfigModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function ensureRuntimeReadyOrPrompt() {
  if (!runtimeConfigState) return true;
  if (!runtimeConfigState.needsSetup) return true;
  showToast(t('runtimeSetupRequired'));
  openRuntimeConfigModal();
  return false;
}

function refreshProviderFieldVisibility() {
  const provider = configAiProvider?.value || 'hf';
  if (configHfWrap) configHfWrap.style.display = provider === 'hf' ? 'grid' : 'none';
  if (configOpenAiWrap) configOpenAiWrap.style.display = provider === 'openai' ? 'grid' : 'none';
  if (configAnthropicWrap) configAnthropicWrap.style.display = provider === 'anthropic' ? 'grid' : 'none';
}

function fillRuntimeConfigForm(data) {
  const enteredSecrets = {
    hfToken: configHfToken?.value || '',
    openaiApiKey: configOpenAiKey?.value || '',
    anthropicApiKey: configAnthropicKey?.value || '',
  };
  const resolveSecretFieldValue = (typedValue, hasSavedSecret) => {
    const typed = String(typedValue || '').trim();
    if (typed && typed !== MASKED_SECRET_VALUE) return typed;
    return hasSavedSecret ? MASKED_SECRET_VALUE : '';
  };
  runtimeConfigState = data;
  if (configAiProvider) configAiProvider.value = data.aiProvider || 'hf';
  if (configModelPreset) configModelPreset.value = data.modelPreset || 'high';
  if (configHost) configHost.value = data.host || 'localhost';
  if (configPort) configPort.value = Number(data.port || 3000);
  // Keep typed values; if none typed, show a masked marker when a secret is already saved.
  if (configHfToken) configHfToken.value = resolveSecretFieldValue(enteredSecrets.hfToken, Boolean(data.hasHfToken));
  if (configOpenAiKey) configOpenAiKey.value = resolveSecretFieldValue(enteredSecrets.openaiApiKey, Boolean(data.hasOpenAiKey));
  if (configAnthropicKey) configAnthropicKey.value = resolveSecretFieldValue(enteredSecrets.anthropicApiKey, Boolean(data.hasAnthropicKey));
  refreshProviderFieldVisibility();
  if (runtimeConfigNote) runtimeConfigNote.textContent = '';
}

async function loadRuntimeConfig() {
  const res = await fetch('/api/runtime-config', { cache: 'no-store' });
  if (!res.ok) throw new Error('runtime config load failed');
  const data = await res.json();
  fillRuntimeConfigForm(data);
  return data;
}

async function saveRuntimeConfig() {
  if (!runtimeConfigSave) return;
  runtimeConfigSave.disabled = true;
  try {
    const prevHost = String(runtimeConfigState?.host || '');
    const prevPort = String(runtimeConfigState?.port || '');
    const normalizeSecretForSave = (value, hasSavedSecret) => {
      const trimmed = String(value || '').trim();
      if (!trimmed) return '';
      if (trimmed === MASKED_SECRET_VALUE && hasSavedSecret) return '';
      return trimmed;
    };
    const payload = {
      aiProvider: configAiProvider?.value || 'hf',
      modelPreset: configModelPreset?.value || 'high',
      hfToken: normalizeSecretForSave(configHfToken?.value || '', Boolean(runtimeConfigState?.hasHfToken)),
      openaiApiKey: normalizeSecretForSave(configOpenAiKey?.value || '', Boolean(runtimeConfigState?.hasOpenAiKey)),
      anthropicApiKey: normalizeSecretForSave(configAnthropicKey?.value || '', Boolean(runtimeConfigState?.hasAnthropicKey)),
      host: configHost?.value || 'localhost',
      port: configPort?.value || 3000,
    };
    const res = await fetch('/api/runtime-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.status === 404) {
      throw new Error('endpoint_missing');
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'save failed');
    }
    const fresh = await loadRuntimeConfig();
    const portChanged = prevPort !== String(payload.port || '');
    const hostChanged = prevHost !== String(payload.host || '');
    if (runtimeConfigNote) {
      runtimeConfigNote.textContent = (portChanged || hostChanged)
        ? t('runtimeSetupNoteRestart')
        : t('runtimeSetupSaved');
    }
    if (!fresh.needsSetup) {
      setTimeout(() => closeRuntimeConfigModal(), 500);
    }
  } catch (err) {
    if (runtimeConfigNote) {
      runtimeConfigNote.textContent = err.message === 'endpoint_missing'
        ? t('runtimeSetupEndpointMissing')
        : `${t('runtimeSetupSaveError')}: ${err.message}`;
    }
  } finally {
    runtimeConfigSave.disabled = false;
  }
}

function setBackgroundMode(mode) {
  const next = mode === 'light' ? 'light' : 'normal';
  document.body.classList.remove('bg-mode-light', 'bg-mode-normal');
  document.body.classList.add(next === 'light' ? 'bg-mode-light' : 'bg-mode-normal');
  localStorage.setItem(BG_MODE_KEY, next);
  if (bgModeNormalBtn) bgModeNormalBtn.classList.toggle('active', next === 'normal');
  if (bgModeLightBtn) bgModeLightBtn.classList.toggle('active', next === 'light');
}

function initBackgroundMode() {
  const saved = localStorage.getItem(BG_MODE_KEY) || 'normal';
  setBackgroundMode(saved);
  if (bgModeNormalBtn) bgModeNormalBtn.addEventListener('click', () => setBackgroundMode('normal'));
  if (bgModeLightBtn) bgModeLightBtn.addEventListener('click', () => setBackgroundMode('light'));
}

// Mount language selector; re-render UI + cards on change
const langMount = document.getElementById('langSelectorMount');
langMount.appendChild(buildLangSelect(async (_) => {
  applyI18n();
  await fetchCharacters();
  renderCards();
}));

applyI18n();
initBackgroundMode();

let allCharacters  = [];
let activeCategory = 'all';
let activeGender   = 'all';
let editingCharacterId = '';
let createCategory = 'idol';
let isCreatingCharacter = false;

// ── Gradient avatar ──
function gradientAvatar(char, size = 72) {
  const initials = char.name.split(/[\s-]/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const div = document.createElement('div');
  div.className = 'card-avatar-gradient';
  div.style.cssText = `
    width:${size}px; height:${size}px; border-radius:50%;
    background: linear-gradient(135deg, ${char.color}, ${char.color2});
    display:flex; align-items:center; justify-content:center;
    font-size:${Math.round(size * 0.35)}px; font-weight:700;
    color:#fff; letter-spacing:1px; flex-shrink:0;
  `;
  div.textContent = initials;
  return div;
}

function closeEditModal() {
  if (!characterEditModal) return;
  characterEditModal.classList.remove('show');
  characterEditModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  selectedAvatarFile = null;
  if (selectedAvatarPreviewUrl) {
    URL.revokeObjectURL(selectedAvatarPreviewUrl);
    selectedAvatarPreviewUrl = '';
  }
  if (editAvatarFile) editAvatarFile.value = '';
  if (editCategory) editCategory.disabled = true;
  if (characterEditDelete) characterEditDelete.style.display = 'none';
  isCreatingCharacter = false;
  refreshEditAvatarFileStatus();
}

function openEditModal() {
  if (!characterEditModal) return;
  characterEditModal.classList.add('show');
  characterEditModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (editName) focusFieldForIme(editName);
    });
  });
}

function fillEditForm(char) {
  editName.value = char.name || '';
  editKoreanName.value = char.koreanName || '';
  editTagline.value = char.tagline || '';
  editRole.value = char.role || '';
  editGroup.value = char.group || '';
  editAge.value = Number(char.age) || '';
  editCategory.value = char.category || 'idol';
  editCategory.disabled = true;
  editGender.value = char.gender || 'female';
  editColor.value = char.color || '#6366f1';
  if (editColorPicker) editColorPicker.value = editColor.value;
  editSystemPrompt.value = char.systemPrompt || '';
}

async function loadCharacterForEdit(charId) {
  const lang = getLang();
  const res = await fetch(`/api/characters/${encodeURIComponent(charId)}/edit?lang=${encodeURIComponent(lang)}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to load character');
  return res.json();
}

async function openCharacterEditor(charId) {
  try {
    const char = await loadCharacterForEdit(charId);
    isCreatingCharacter = false;
    editingCharacterId = char.id;
    fillEditForm(char);
    if (characterEditTitle) {
      characterEditTitle.textContent = `${t('editCharacterTitle')} - ${char.name}`;
    }
    if (characterEditDelete) characterEditDelete.style.display = 'inline-block';
    const ts = Date.now();
    editAvatarPreview.src = `/${char.id}.jpg?ts=${ts}`;
    editAvatarPreview.onerror = () => {
      if (editAvatarPreview.src.includes('.jpg')) {
        editAvatarPreview.src = `/${char.id}.png?ts=${ts}`;
      } else {
        editAvatarPreview.src = '';
        editAvatarPreview.style.display = 'none';
      }
    };
    editAvatarPreview.style.display = 'block';
    openEditModal();
    refreshEditAvatarFileStatus();
  } catch (_) {
    showToast(t('editLoadError'));
  }
}

function openCreateCharacter(category = 'idol') {
  isCreatingCharacter = true;
  editingCharacterId = '';
  createCategory = category;
  fillEditForm({
    id: '',
    name: '',
    koreanName: '',
    tagline: '',
    role: '',
    group: '',
    age: 20,
    category,
    gender: category === 'idol' ? 'female' : 'male',
    color: '#6366f1',
    color2: '#5252c6',
    systemPrompt: '',
  });
  if (characterEditTitle) {
    characterEditTitle.textContent = `${t('addCharacterTitle')} - ${category}`;
  }
  if (editCategory) editCategory.disabled = true;
  if (characterEditDelete) characterEditDelete.style.display = 'none';
  editAvatarPreview.src = '';
  editAvatarPreview.style.display = 'none';
  openEditModal();
  refreshEditAvatarFileStatus();
}

function buildEditPayload() {
  const baseColor = editColor.value.trim();
  const category = isCreatingCharacter ? createCategory : editCategory.value;
  return {
    name: editName.value.trim(),
    koreanName: editKoreanName.value.trim(),
    tagline: editTagline.value.trim(),
    role: editRole.value.trim(),
    group: editGroup.value.trim(),
    age: Number(editAge.value || 0),
    category,
    gender: editGender.value,
    color: baseColor,
    color2: deriveColor2(baseColor),
    systemPrompt: editSystemPrompt.value.trim(),
    lang: getLang(),
  };
}

function deriveColor2(hex) {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex || '');
  if (!match) return '#a855f7';
  const value = match[1];
  const toPart = (idx) => parseInt(value.slice(idx, idx + 2), 16);
  const shift = (n) => Math.max(0, Math.min(255, Math.round(n * 0.82)));
  const toHex = (n) => shift(n).toString(16).padStart(2, '0');
  return `#${toHex(toPart(0))}${toHex(toPart(2))}${toHex(toPart(4))}`;
}

async function saveCharacterEdit() {
  if (!characterEditSave) return;
  characterEditSave.disabled = true;
  const formData = new FormData();
  formData.append('payload', JSON.stringify(buildEditPayload()));
  if (selectedAvatarFile) {
    formData.append('avatar', selectedAvatarFile);
  }
  try {
    const endpoint = isCreatingCharacter
      ? '/api/characters'
      : `/api/characters/${encodeURIComponent(editingCharacterId)}/edit`;
    const res = await fetch(endpoint, {
      method: 'POST',
      cache: 'no-store',
      body: formData,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'save failed');
    }
    avatarVersion = Date.now();
    await fetchCharacters();
    renderCards();
    closeEditModal();
  } catch (err) {
    showToast(`${t('editSaveError')}: ${err.message}`);
  } finally {
    characterEditSave.disabled = false;
  }
}

function openDeleteCharacterModal(expectedName) {
  return new Promise((resolve) => {
    if (!deleteCharModal || !deleteCharIntro || !deleteCharNameInput || !deleteCharCancel || !deleteCharConfirm) {
      resolve(false);
      return;
    }

    deleteCharIntro.textContent = `${t('deleteConfirm')}\n\n${t('deleteTypeNamePrompt', expectedName)}`;
    deleteCharNameInput.value = '';
    deleteCharCancel.textContent = t('profileCancel');
    deleteCharConfirm.textContent = t('deleteCharacter');

    deleteCharModal.classList.add('show');
    deleteCharModal.setAttribute('aria-hidden', 'false');

    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      pendingDeleteModalCancel = null;
      deleteCharModal.removeEventListener('click', onBackdrop);
      deleteCharModal.classList.remove('show');
      deleteCharModal.setAttribute('aria-hidden', 'true');
      deleteCharCancel.onclick = null;
      deleteCharConfirm.onclick = null;
      resolve(result);
    };

    function onBackdrop(e) {
      if (e.target === deleteCharModal) finish(false);
    }

    pendingDeleteModalCancel = () => finish(false);

    deleteCharCancel.onclick = () => finish(false);
    deleteCharConfirm.onclick = () => {
      if (deleteCharNameInput.value.trim() !== expectedName) {
        showToast(t('deleteNameMismatch'));
        return;
      }
      finish(true);
    };
    deleteCharModal.addEventListener('click', onBackdrop);

    requestAnimationFrame(() => {
      focusFieldForIme(deleteCharNameInput);
    });
  });
}

async function deleteCharacter() {
  if (!editingCharacterId) return;
  const expectedName = editName?.value?.trim() || editingCharacterId;
  const confirmed = await openDeleteCharacterModal(expectedName);
  if (!confirmed) return;
  try {
    const res = await fetch(`/api/characters/${encodeURIComponent(editingCharacterId)}`, {
      method: 'DELETE',
      cache: 'no-store',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'delete failed');
    }
    avatarVersion = Date.now();
    await fetchCharacters();
    renderCards();
    closeEditModal();
  } catch (err) {
    showToast(`${t('deleteError')}: ${err.message}`);
  }
}

// ── Build a character card ──
function buildCard(char) {
  const card = document.createElement('div');
  card.className = 'character-card';
  card.dataset.gender   = char.gender;
  card.dataset.category = char.category;

  // Avatar
  const avatarWrap = document.createElement('div');
  avatarWrap.className = 'card-avatar-wrap';

  const img = new Image();
  img.src = `/${char.id}.jpg?v=${avatarVersion}`;
  img.onload = () => {
    img.className = 'card-avatar-img';
    avatarWrap.innerHTML = '';
    avatarWrap.appendChild(img);
  };
  img.onerror = () => {
    const png = new Image();
    png.src = `/${char.id}.png?v=${avatarVersion}`;
    png.onload = () => {
      png.className = 'card-avatar-img';
      avatarWrap.innerHTML = '';
      avatarWrap.appendChild(png);
    };
    png.onerror = () => {
      avatarWrap.innerHTML = '';
      avatarWrap.appendChild(gradientAvatar(char));
    };
  };
  avatarWrap.appendChild(gradientAvatar(char));

  // Info
  const info = document.createElement('div');
  info.className = 'card-info';

  const nameRow = document.createElement('div');
  nameRow.className = 'card-name-row';

  const name = document.createElement('span');
  name.className = 'card-name';
  name.textContent = char.name;

  const korean = document.createElement('span');
  korean.className = 'card-korean';
  korean.textContent = char.koreanName;

  nameRow.appendChild(name);
  nameRow.appendChild(korean);

  const meta = document.createElement('div');
  meta.className = 'card-meta';
  meta.textContent = [char.group, char.role].filter(Boolean).join(' · ');

  const tagline = document.createElement('div');
  tagline.className = 'card-tagline';
  tagline.textContent = char.tagline;

  info.appendChild(nameRow);
  info.appendChild(meta);
  info.appendChild(tagline);

  // Gender badge
  const badge = document.createElement('div');
  badge.className = `card-badge card-badge--${char.gender}`;
  badge.textContent = char.gender === 'female' ? '♀' : '♂';

  // Category chip (only shown in "All" view)
  const chip = document.createElement('div');
  chip.className = `card-category-chip card-category-chip--${char.category}`;
  chip.textContent = char.category === 'idol' ? t('filterIdol') : t('filterFriend');

  // Accent bar
  const accent = document.createElement('div');
  accent.className = 'card-accent';
  accent.style.background = `linear-gradient(90deg, ${char.color}, ${char.color2})`;

  card.appendChild(badge);
  card.appendChild(chip);
  card.appendChild(avatarWrap);
  card.appendChild(info);
  card.appendChild(accent);

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'card-edit-btn';
  editBtn.textContent = t('editCharacterButton');
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openCharacterEditor(char.id);
  });
  card.appendChild(editBtn);

  card.addEventListener('click', () => {
    if (isEditMode) {
      showToast(t('editModeBlockedOpen'));
      return;
    }
    if (!ensureRuntimeReadyOrPrompt()) return;
    window.location.href = `/chat.html?id=${char.id}`;
  });

  return card;
}

// ── Filter + render ──
function renderCards() {
  grid.innerHTML = '';

  const filtered = allCharacters.filter(c => {
    const catMatch    = activeCategory === 'all' || c.category === activeCategory;
    const genderMatch = activeGender   === 'all' || c.gender   === activeGender;
    return catMatch && genderMatch;
  });

  if (!filtered.length) {
    grid.innerHTML = '<p class="select-empty">No characters found.</p>';
    return;
  }

  // If showing all categories, group by category with section headers
  if (activeCategory === 'all') {
    const groups = [
      { key: 'idol',   label: t('filterIdol') },
      { key: 'friend', label: t('filterFriend') },
    ];
    for (const { key, label } of groups) {
      const group = filtered.filter(c => c.category === key);
      if (!group.length) continue;

      const header = document.createElement('div');
      header.className = 'section-header';
      header.textContent = label;
      if (isEditMode) {
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'section-header-add';
        addBtn.textContent = `+ ${t('addCharacter')}`;
        addBtn.addEventListener('click', () => openCreateCharacter(key));
        header.appendChild(addBtn);
      }
      grid.appendChild(header);

      const section = document.createElement('div');
      section.className = 'section-grid';
      group.forEach(c => section.appendChild(buildCard(c)));
      grid.appendChild(section);
    }
  } else {
    if (isEditMode) {
      const header = document.createElement('div');
      header.className = 'section-header';
      const label = activeCategory === 'idol' ? t('filterIdol') : t('filterFriend');
      header.textContent = label;
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'section-header-add';
      addBtn.textContent = `+ ${t('addCharacter')}`;
      addBtn.addEventListener('click', () => openCreateCharacter(activeCategory));
      header.appendChild(addBtn);
      grid.appendChild(header);
    }
    filtered.forEach(c => grid.appendChild(buildCard(c)));
  }
}

// ── Category filter buttons ──
catBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    catBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCategory = btn.dataset.category;
    renderCards();
  });
});

// ── Gender filter buttons ──
genderBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    genderBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeGender = btn.dataset.gender;
    renderCards();
  });
});

// ── Load characters from API ──
async function fetchCharacters() {
  try {
    const res = await fetch('/api/characters?lang=' + getLang() + '&t=' + Date.now(), {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('API error');
    allCharacters = await res.json();
    loadingEl.style.display = 'none';
    errorEl.style.display   = 'none';
    if (!allCharacters.length) {
      errorEl.textContent  = t('noCharError');
      errorEl.dataset.key  = 'noCharError';
      errorEl.style.display = 'block';
    }
  } catch (e) {
    loadingEl.style.display = 'none';
    errorEl.textContent     = t('serverError');
    errorEl.dataset.key     = 'serverError';
    errorEl.style.display   = 'block';
  }
}

(async () => {
  if (editModeToggleBtn) {
    editModeToggleBtn.addEventListener('click', () => {
      isEditMode = !isEditMode;
      document.body.classList.toggle('edit-mode', isEditMode);
      editModeToggleBtn.classList.toggle('active', isEditMode);
      applyI18n();
      renderCards();
    });
  }
  if (characterEditClose) characterEditClose.addEventListener('click', closeEditModal);
  if (characterEditCancel) characterEditCancel.addEventListener('click', closeEditModal);
  if (characterEditModal) {
    characterEditModal.addEventListener('click', (e) => {
      if (e.target === characterEditModal) closeEditModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (pendingDeleteModalCancel) {
      e.preventDefault();
      pendingDeleteModalCancel();
      return;
    }
    closeEditModal();
  });
  if (characterEditSave) characterEditSave.addEventListener('click', saveCharacterEdit);
  if (characterEditDelete) characterEditDelete.addEventListener('click', deleteCharacter);
  if (runtimeSettingsBtn) runtimeSettingsBtn.addEventListener('click', async () => {
    try {
      await loadRuntimeConfig();
      openRuntimeConfigModal();
    } catch (err) {
      showToast(t('runtimeSetupEndpointMissing'));
    }
  });
  if (runtimeConfigClose) runtimeConfigClose.addEventListener('click', closeRuntimeConfigModal);
  if (runtimeConfigCancel) runtimeConfigCancel.addEventListener('click', closeRuntimeConfigModal);
  if (runtimeConfigSave) runtimeConfigSave.addEventListener('click', saveRuntimeConfig);
  if (configAiProvider) configAiProvider.addEventListener('change', refreshProviderFieldVisibility);
  if (runtimeAdvancedToggle) {
    runtimeAdvancedToggle.addEventListener('click', () => setRuntimeAdvancedOpen(!isRuntimeAdvancedOpen));
  }
  if (runtimeConfigModal) {
    runtimeConfigModal.addEventListener('click', (e) => {
      if (e.target === runtimeConfigModal) closeRuntimeConfigModal();
    });
  }
  if (editAvatarFile) {
    editAvatarFile.addEventListener('change', () => {
      selectedAvatarFile = editAvatarFile.files?.[0] || null;
      if (selectedAvatarPreviewUrl) URL.revokeObjectURL(selectedAvatarPreviewUrl);
      selectedAvatarPreviewUrl = '';
      if (selectedAvatarFile) {
        selectedAvatarPreviewUrl = URL.createObjectURL(selectedAvatarFile);
        editAvatarPreview.src = selectedAvatarPreviewUrl;
        editAvatarPreview.style.display = 'block';
      }
      refreshEditAvatarFileStatus();
    });
  }
  if (editColor && editColorPicker) {
    editColor.addEventListener('input', () => {
      const value = editColor.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(value)) editColorPicker.value = value;
    });
    editColorPicker.addEventListener('input', () => {
      editColor.value = editColorPicker.value;
    });
  }
  await fetchCharacters();
  renderCards();
  try {
    const cfg = await loadRuntimeConfig();
    if (cfg.needsSetup) openRuntimeConfigModal();
  } catch (_) {}
})();
