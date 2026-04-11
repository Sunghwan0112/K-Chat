// Character selection page

const grid        = document.getElementById('characterGrid');
const loadingEl   = document.getElementById('loadingState');
const errorEl     = document.getElementById('errorState');
const filterBtns  = document.querySelectorAll('.filter-btn');

// ── Apply translations to static UI elements ──
function applyI18n() {
  document.getElementById('heroSubtitle').textContent = t('subtitle');
  document.getElementById('filterAll').textContent    = t('filterAll');
  document.getElementById('filterFemale').textContent = t('filterFemale');
  document.getElementById('filterMale').textContent   = t('filterMale');
  loadingEl.textContent                               = t('loading');
  if (errorEl.dataset.key) {
    errorEl.textContent = t(errorEl.dataset.key);
  }
}

// Mount language selector; re-render UI + cards on change
const langMount = document.getElementById('langSelectorMount');
langMount.appendChild(buildLangSelect(async (_) => {
  applyI18n();
  await fetchCharacters();
  renderCards(activeGender);
}));

applyI18n();

let allCharacters = [];
let activeGender  = 'all';

// ── Gradient avatar (used when no image file exists) ──
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

// ── Build a character card ──
function buildCard(char) {
  const card = document.createElement('div');
  card.className = 'character-card';
  card.dataset.gender = char.gender;

  // Avatar area
  const avatarWrap = document.createElement('div');
  avatarWrap.className = 'card-avatar-wrap';

  const img = new Image();
  img.src = `/${char.id}.jpg`;
  img.onload = () => {
    img.className = 'card-avatar-img';
    avatarWrap.innerHTML = '';
    avatarWrap.appendChild(img);
  };
  img.onerror = () => {
    // Try .png fallback, then gradient
    const png = new Image();
    png.src = `/${char.id}.png`;
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
  // Show gradient immediately as placeholder
  avatarWrap.appendChild(gradientAvatar(char));

  // Info area
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
  meta.textContent = `${char.group} · ${char.role}`;

  const tagline = document.createElement('div');
  tagline.className = 'card-tagline';
  tagline.textContent = char.tagline;

  const badge = document.createElement('div');
  badge.className = `card-badge card-badge--${char.gender}`;
  badge.textContent = char.gender === 'female' ? '♀' : '♂';

  info.appendChild(nameRow);
  info.appendChild(meta);
  info.appendChild(tagline);

  // Accent bar
  const accent = document.createElement('div');
  accent.className = 'card-accent';
  accent.style.background = `linear-gradient(90deg, ${char.color}, ${char.color2})`;

  card.appendChild(badge);
  card.appendChild(avatarWrap);
  card.appendChild(info);
  card.appendChild(accent);

  card.addEventListener('click', () => {
    window.location.href = `/chat.html?id=${char.id}`;
  });

  return card;
}

// ── Filter rendering ──
function renderCards(gender) {
  grid.innerHTML = '';
  const filtered = gender === 'all' ? allCharacters : allCharacters.filter(c => c.gender === gender);
  if (!filtered.length) {
    grid.innerHTML = '<p class="select-empty">No characters found.</p>';
    return;
  }
  filtered.forEach(c => grid.appendChild(buildCard(c)));
}

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeGender = btn.dataset.gender;
    renderCards(activeGender);
  });
});

// ── Load characters from API ──
async function fetchCharacters() {
  try {
    const res = await fetch('/api/characters?lang=' + getLang());
    if (!res.ok) throw new Error('API error');
    allCharacters = await res.json();
    loadingEl.style.display = 'none';
    errorEl.style.display = 'none';
    if (!allCharacters.length) {
      errorEl.textContent = t('noCharError');
      errorEl.dataset.key = 'noCharError';
      errorEl.style.display = 'block';
      return;
    }
  } catch (e) {
    loadingEl.style.display = 'none';
    errorEl.textContent = t('serverError');
    errorEl.dataset.key = 'serverError';
    errorEl.style.display = 'block';
  }
}

(async () => {
  await fetchCharacters();
  renderCards(activeGender);
})();
