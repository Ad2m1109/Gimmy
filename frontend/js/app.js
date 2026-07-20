// ---------------- Data ----------------
const PALETTE = ['#3B82F6','#A3FF12','#F97316','#8B5CF6','#EC4899','#22C55E','#FACC15','#06B6D4'];
function grad(seed){
  const c1 = PALETTE[seed % PALETTE.length];
  const c2 = PALETTE[(seed+3) % PALETTE.length];
  return `linear-gradient(135deg, ${c1}33, ${c2}22), linear-gradient(160deg,#1c2536,#12161f)`;
}
function thumb(seed, label){
  return `<div style="width:100%;height:100%;background:${grad(seed)};display:flex;align-items:center;justify-content:center;font-family:Sora;font-weight:700;color:rgba(255,255,255,.85);font-size:13px;text-align:center;padding:8px;">${label}</div>`;
}

let ALL_GAMES = [];
let ALL_CATEGORIES = [];
let currentCategory = '';
let currentSort = 'popular';

function renderGameCards(games, container, favSet) {
  container.innerHTML = '';
  games.forEach((g, i) => {
    const el = document.createElement('div');
    el.className = 'game-card';
    const isFav = favSet.has(g.id);
    el.innerHTML = `
      <div class="gc-thumb" onclick="window.location.href='game.html?slug=${g.slug}'" style="cursor:pointer;">
        ${thumb(i + 5, g.title)}
        <button class="gc-fav ${isFav ? 'active' : ''}" data-game-id="${g.id}" aria-label="Add to favorites">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>
        </button>
        <div class="gc-play" onclick="window.location.href='game.html?slug=${g.slug}'">
          <div class="gc-play-btn"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7Z"/></svg></div>
        </div>
      </div>
      <div class="gc-body" onclick="window.location.href='game.html?slug=${g.slug}'" style="cursor:pointer;">
        <div class="gc-title">${g.title}</div>
        <div class="gc-meta-row">
          <span class="gc-cat">${g.category ? g.category.name : 'Game'}</span>
          <span class="gc-rating">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61Z"/></svg>
            ${g.rating}
          </span>
        </div>
      </div>`;
    container.appendChild(el);
  });
}

function getFilteredGames() {
  let games = [...ALL_GAMES];
  if (currentCategory) {
    games = games.filter(g => g.category?.slug === currentCategory);
  }
  if (currentSort === 'popular') games.sort((a, b) => b.plays - a.plays);
  else if (currentSort === 'newest') games.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  else if (currentSort === 'rating') games.sort((a, b) => b.rating - a.rating);
  else if (currentSort === 'name') games.sort((a, b) => a.title.localeCompare(b.title));
  return games;
}

function refreshPopularGrid() {
  const favSet = new Set();
  const token = localStorage.getItem('access_token');
  // Reuse cached favorites if available
  const popEl = document.getElementById('popularGrid');
  if (!popEl) return;
  const filtered = getFilteredGames().slice(0, 20);
  renderGameCards(filtered, popEl, favSet);
}

async function loadData() {
  try {
    // 1. Fetch Categories
    const catRes = await fetch('http://127.0.0.1:8000/api/v1/categories');
    const categories = await catRes.json();
    ALL_CATEGORIES = categories;
    
    // Render Categories
    const catEl = document.getElementById('catGrid');
    if (catEl) {
      categories.forEach(c => {
        const el = document.createElement('div');
        el.className = 'cat-card';
        el.innerHTML = `
          <div class="cat-icon" style="background:var(--primary-dim); color:#22C55E;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${c.icon || ''}</svg>
          </div>
          <div>
            <div class="cat-name">${c.name}</div>
            <div class="cat-count">Games</div>
          </div>`;
        catEl.appendChild(el);
      });
    }

    // Populate filter tabs
    const filterTabs = document.getElementById('filterTabs');
    if (filterTabs && categories.length > 0) {
      categories.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'filter-tab';
        btn.dataset.category = c.slug;
        btn.textContent = c.name;
        filterTabs.appendChild(btn);
      });

      // Filter tab click handlers
      filterTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.filter-tab');
        if (!tab) return;
        filterTabs.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentCategory = tab.dataset.category;
        refreshPopularGrid();
      });
    }

    // Sort select handler
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        refreshPopularGrid();
      });
    }

    // 2. Fetch Games
    const gameRes = await fetch('http://127.0.0.1:8000/api/v1/games?limit=50');
    const gameData = await gameRes.json();
    const games = gameData.items || [];
    ALL_GAMES = games;

    // 3. Fetch User Favorites (if logged in)
    const token = localStorage.getItem('access_token');
    const favSet = new Set();
    if (token) {
      try {
        const favRes = await fetch('http://127.0.0.1:8000/api/v1/users/me/favorites', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (favRes.ok) {
          const userFavs = await favRes.json();
          userFavs.forEach(f => favSet.add(f.id));
        }
      } catch (e) {
        console.error('Could not fetch favorites on load', e);
      }
    }

    // Filter games into Featured, Trending, Popular
    const featuredGames = games.filter(g => g.is_featured);
    const trendingGames = games.filter(g => g.is_trending);
    const popularGames = [...games].sort((a,b) => b.plays - a.plays).slice(0, 10);

    // Render Featured
    const featuredEl = document.getElementById('featuredCarousel');
    if (featuredEl) {
      featuredGames.forEach((g,i)=>{
        const el = document.createElement('div');
        el.className = 'feat-card';
        el.onclick = () => window.location.href = `game.html?slug=${g.slug}`;
        el.style.cursor = 'pointer';
        el.innerHTML = `
          <span class="feat-badge">Featured</span>
          ${thumb(i, g.title)}
          <div class="feat-overlay">
            <div class="feat-title">${g.title}</div>
            <div class="feat-meta">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              ${g.category ? g.category.name : 'Game'} · ${g.plays} playing
            </div>
          </div>`;
        featuredEl.appendChild(el);
      });
    }

    // Render Trending
    const trendEl = document.getElementById('trendCarousel');
    if (trendEl) {
      trendingGames.forEach((g,i)=>{
        const el = document.createElement('div');
        el.className = 'trend-card';
        el.onclick = () => window.location.href = `game.html?slug=${g.slug}`;
        el.style.cursor = 'pointer';
        el.innerHTML = `
          <div class="trend-thumb">
            <span class="trend-rank">${i+1}</span>
            ${thumb(i+2, g.title)}
          </div>
          <div class="trend-title">${g.title}</div>
          <div class="trend-cat">${g.category ? g.category.name : 'Game'}</div>`;
        trendEl.appendChild(el);
      });
    }

    // Render Popular (with filter support)
    const popEl = document.getElementById('popularGrid');
    if (popEl) {
      const filtered = getFilteredGames().slice(0, 20);
      renderGameCards(filtered, popEl, favSet);
    }
  } catch(e) {
    console.error("Error loading data from API:", e);
  }
}

if (document.getElementById('catGrid')) {
  loadData();
  loadLeaderboard();
  loadRecentlyPlayed();
}

async function loadLeaderboard() {
  const podiumEl = document.getElementById('leaderboardPodium');
  const listEl = document.getElementById('leaderboardList');
  if (!podiumEl || !listEl) return;
  
  try {
    const res = await fetch('http://127.0.0.1:8000/api/v1/leaderboard');
    if (!res.ok) return;
    const players = await res.json();
    
    podiumEl.innerHTML = '';
    listEl.innerHTML = '';
    
    // Top 3 Podium
    const top3 = players.slice(0, 3);
    const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean); // Silver, Gold, Bronze
    podiumOrder.forEach(p => {
      const isGold = p.rank === 1;
      const rankIcon = p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : '🥉';
      const height = isGold ? '140px' : '110px';
      const bg = isGold ? 'linear-gradient(135deg, #F59E0B, #FBBF24)' : 'var(--surface-2)';
      const color = isGold ? '#000' : 'var(--text)';
      
      const el = document.createElement('div');
      el.style.cssText = `width: 100px; display: flex; flex-direction: column; align-items: center; gap: 8px;`;
      el.innerHTML = `
        <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--surface-3); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px;">${p.username.charAt(0).toUpperCase()}</div>
        <div style="font-size: 13px; font-weight: 600; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">${p.username}</div>
        <div style="width: 100%; height: ${height}; background: ${bg}; color: ${color}; border-radius: 12px 12px 0 0; display: flex; flex-direction: column; align-items: center; padding-top: 12px; font-weight: bold;">
          <span style="font-size: 24px;">${rankIcon}</span>
          <span style="font-size: 14px; margin-top: 4px;">${p.total_xp} XP</span>
        </div>
      `;
      podiumEl.appendChild(el);
    });
    
    // Rest of the list
    const rest = players.slice(3, 10);
    rest.forEach(p => {
      const el = document.createElement('div');
      el.style.cssText = `display: flex; align-items: center; gap: 16px; padding: 12px 16px; background: var(--surface); border-radius: 12px; border: 1px solid var(--border);`;
      el.innerHTML = `
        <div style="font-weight: 700; color: var(--text-sec); width: 24px;">#${p.rank}</div>
        <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--surface-3); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">${p.username.charAt(0).toUpperCase()}</div>
        <div style="flex: 1; font-weight: 600;">${p.username}</div>
        <div style="font-weight: 700; color: var(--primary);">${p.total_xp} XP</div>
      `;
      listEl.appendChild(el);
    });
  } catch (err) {
    console.error("Error loading leaderboard:", err);
  }
}

async function loadRecentlyPlayed() {
  const recentEl = document.getElementById('recentCarousel');
  if (!recentEl) return;
  
  const token = localStorage.getItem('access_token');
  if (!token) {
    recentEl.innerHTML = `
      <div style="padding:48px 32px; text-align:center; background:var(--surface); border-radius:24px; border:1px dashed var(--border-strong); width: 100%;">
        <p style="font-family:'Sora'; font-size:15px; font-weight:600; color:var(--text-sec); margin:0 0 6px 0;">Log in to see your history</p>
      </div>`;
    return;
  }
  
  try {
    const res = await fetch('http://127.0.0.1:8000/api/v1/users/me/sessions', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const games = await res.json();
    
    if (games.length === 0) {
      recentEl.innerHTML = `
        <div style="padding:48px 32px; text-align:center; background:var(--surface); border-radius:24px; border:1px dashed var(--border-strong); width: 100%;">
          <p style="font-family:'Sora'; font-size:15px; font-weight:600; color:var(--text-sec); margin:0 0 6px 0;">No recent games yet</p>
          <p style="color:var(--text-tert); font-size:13px; margin:0;">Start playing and your history will appear here.</p>
        </div>`;
      return;
    }
    
    recentEl.innerHTML = '';
    games.forEach(g => {
      // Just re-use the standard card format but we can skip the favorite logic for simplicity here or add it
      const el = document.createElement('div');
      el.className = 'game-card';
      el.innerHTML = `
        <div class="gc-thumb">
          <div style="width:100%; height:100%; background:linear-gradient(135deg, ${g.category?.color || '#3B82F6'}, #1E3A8A);"></div>
          <button class="gc-fav" data-game-id="${g.id}" aria-label="Add to favorites"><svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg></button>
          <div class="gc-play">
            <div class="gc-play-btn"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7Z"/></svg></div>
          </div>
        </div>
        <div class="gc-body">
          <div class="gc-title">${g.title}</div>
          <div class="gc-meta-row">
            <span class="gc-cat">${g.category?.name || 'Game'}</span>
            <span class="gc-rating"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61Z"/></svg>${g.rating}</span>
          </div>
        </div>`;
      recentEl.appendChild(el);
    });
  } catch (err) {
    console.error("Error loading recently played:", err);
  }
}

async function loadProfile() {
  const token = localStorage.getItem('access_token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }
  
  try {
    const res = await fetch('http://127.0.0.1:8000/api/v1/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const user = await res.json();
      renderProfile(user);
      loadProfileFavorites(token);
      loadProfileRecentlyPlayed(token);
    } else {
      window.location.href = 'index.html';
    }
  } catch (err) {
    console.error(err);
  }
}

function renderProfile(user) {
  // Avatar
  const avatarEl = document.getElementById('profAvatar');
  const avatarText = document.getElementById('profAvatarText');
  if (user.avatar) {
    avatarEl.innerHTML = `<img src="${user.avatar}" alt="${user.username}">`;
  } else {
    avatarText.textContent = user.username.charAt(0).toUpperCase();
  }

  // Name & email
  document.getElementById('profName').textContent = user.username;
  document.getElementById('profEmail').textContent = user.email || 'No email provided';

  // Bio
  const bioEl = document.getElementById('profBio');
  if (user.bio) {
    bioEl.textContent = user.bio;
    bioEl.style.display = 'block';
  } else {
    bioEl.style.display = 'none';
  }

  // Country
  const countryEl = document.getElementById('profCountry');
  const countryText = document.getElementById('profCountryText');
  if (user.country) {
    countryText.textContent = user.country;
    countryEl.style.display = 'flex';
  }

  // Member since
  if (user.created_at) {
    const d = new Date(user.created_at);
    document.getElementById('profJoinedText').textContent = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  // Verified badge
  if (user.is_verified) {
    document.getElementById('verifiedBadge').style.display = 'flex';
  }

  // Auth provider badge
  const providerBadge = document.getElementById('providerBadge');
  if (user.auth_provider === 'google') {
    providerBadge.classList.add('google');
    providerBadge.title = 'Google account';
    providerBadge.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>';
  }

  // Level & XP badges
  document.getElementById('profLevel').textContent = user.level || 1;
  document.getElementById('profXp').textContent = user.total_xp || 0;
  document.getElementById('xpCurrentLevel').textContent = user.level || 1;
  document.getElementById('xpNextLevel').textContent = (user.level || 1) + 1;
  document.getElementById('xpCurrent').textContent = user.total_xp || 0;

  // XP progress calculation (100 XP per level)
  const currentLevel = user.level || 1;
  const totalXp = user.total_xp || 0;
  const xpForCurrentLevel = (currentLevel - 1) * 100;
  const xpInLevel = totalXp - xpForCurrentLevel;
  const xpNeeded = 100 - xpInLevel;
  const progressPct = Math.min((xpInLevel / 100) * 100, 100);

  document.getElementById('xpNeeded').textContent = xpNeeded > 0 ? xpNeeded : 0;
  setTimeout(() => {
    document.getElementById('xpProgressFill').style.width = progressPct + '%';
  }, 100);

  // Stats
  document.getElementById('statLevel').textContent = currentLevel;
  document.getElementById('statXp').textContent = totalXp;
}

async function loadProfileFavorites(token) {
  try {
    const res = await fetch('http://127.0.0.1:8000/api/v1/users/me/favorites', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const favorites = await res.json();

    document.getElementById('statFavorites').textContent = favorites.length;

    const favEmpty = document.getElementById('favEmpty');
    const favList = document.getElementById('favList');

    if (favorites.length === 0) {
      favEmpty.style.display = 'block';
      return;
    }

    favEmpty.style.display = 'none';
    favList.innerHTML = '';

    favorites.forEach((g, i) => {
      const card = document.createElement('div');
      card.className = 'profile-game-card';
      card.innerHTML = `
        <div class="profile-game-thumb" style="background:linear-gradient(135deg, ${g.category?.color || '#3B82F6'}, #1E3A8A);">
          ${g.title.substring(0, 2)}
        </div>
        <div class="profile-game-info">
          <div class="profile-game-title">${g.title}</div>
          <div class="profile-game-cat">${g.category?.name || 'Game'} · ${g.plays || 0} plays</div>
        </div>
        <div class="profile-game-rating">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61Z"/></svg>
          ${g.rating || 0}
        </div>
        <div class="profile-game-actions">
          <button class="fav-active" data-game-id="${g.id}" title="Remove from favorites">
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>
          </button>
        </div>
      `;
      favList.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading profile favorites:", err);
  }
}

async function loadProfileRecentlyPlayed(token) {
  try {
    const res = await fetch('http://127.0.0.1:8000/api/v1/users/me/sessions', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const games = await res.json();

    document.getElementById('statGamesPlayed').textContent = games.length;
    const gamesPlayedBadge = document.getElementById('gamesPlayedBadge');
    gamesPlayedBadge.style.display = 'inline-flex';
    document.getElementById('profGamesPlayed').textContent = games.length;

    const recentEmpty = document.getElementById('recentEmpty');
    const recentList = document.getElementById('recentList');

    if (games.length === 0) {
      recentEmpty.style.display = 'block';
      return;
    }

    recentEmpty.style.display = 'none';
    recentList.innerHTML = '';

    games.forEach((g, i) => {
      const card = document.createElement('div');
      card.className = 'profile-game-card';
      card.innerHTML = `
        <div class="profile-game-thumb" style="background:linear-gradient(135deg, ${g.category?.color || '#3B82F6'}, #1E3A8A);">
          ${g.title.substring(0, 2)}
        </div>
        <div class="profile-game-info">
          <div class="profile-game-title">${g.title}</div>
          <div class="profile-game-cat">${g.category?.name || 'Game'} · ${g.plays || 0} plays</div>
        </div>
        <div class="profile-game-rating">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61Z"/></svg>
          ${g.rating || 0}
        </div>
        <div class="profile-game-actions">
          <button data-game-id="${g.id}" title="Play again" onclick="showToast('Launching ${g.title}...', 'success')">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7Z"/></svg>
          </button>
        </div>
      `;
      recentList.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading profile recently played:", err);
  }
}

// Edit profile modal
const editModal = document.getElementById('editModal');
const editProfileBtn = document.getElementById('editProfileBtn');
const editForm = document.getElementById('editForm');
const editCancelBtn = document.getElementById('editCancelBtn');

if (editProfileBtn) {
  editProfileBtn.addEventListener('click', async () => {
    // Populate fields with current data
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const user = await res.json();
        document.getElementById('editUsername').value = user.username || '';
        document.getElementById('editBio').value = user.bio || '';
        document.getElementById('editCountry').value = user.country || '';
        document.getElementById('editAvatar').value = user.avatar || '';
        document.getElementById('editPublic').checked = user.is_public !== false;
      }
    } catch (e) {}
    editModal.style.display = 'flex';
    requestAnimationFrame(() => editModal.classList.add('show'));
  });
}

if (editCancelBtn) {
  editCancelBtn.addEventListener('click', () => {
    editModal.classList.remove('show');
    setTimeout(() => { editModal.style.display = 'none'; }, 250);
  });
}

if (editForm) {
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    const payload = {
      username: document.getElementById('editUsername').value,
      bio: document.getElementById('editBio').value,
      country: document.getElementById('editCountry').value,
      avatar: document.getElementById('editAvatar').value,
      is_public: document.getElementById('editPublic').checked,
    };
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Profile updated!', 'success');
        editModal.classList.remove('show');
        setTimeout(() => { editModal.style.display = 'none'; }, 250);
        loadProfile();
      } else {
        const data = await res.json();
        showToast(data.detail || 'Update failed', 'warning');
      }
    } catch (err) {
      showToast('Connection error', 'warning');
    }
  });
}

// Change password
const changePasswordBtn = document.getElementById('changePasswordBtn');
if (changePasswordBtn) {
  changePasswordBtn.addEventListener('click', async () => {
    const token = localStorage.getItem('access_token');
    const current = document.getElementById('editCurrentPassword').value;
    const newPass = document.getElementById('editNewPassword').value;
    if (!current || !newPass) {
      showToast('Fill in both password fields', 'warning');
      return;
    }
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/users/me/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ current_password: current, new_password: newPass })
      });
      if (res.ok) {
        showToast('Password updated!', 'success');
        document.getElementById('editCurrentPassword').value = '';
        document.getElementById('editNewPassword').value = '';
      } else {
        const data = await res.json();
        showToast(data.detail || 'Password update failed', 'warning');
      }
    } catch (err) {
      showToast('Connection error', 'warning');
    }
  });
}

// Close edit modal on backdrop click
if (editModal) {
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
      editModal.classList.remove('show');
      setTimeout(() => { editModal.style.display = 'none'; }, 250);
    }
  });
}

if (document.getElementById('profName')) {
  loadProfile();
}

// ---------------- Daily challenge countdown ring ----------------
const RING_CIRC = 364; // 2*pi*58 ≈ 364.4
function updateRing(){
  const now = new Date();
  const end = new Date(now);
  end.setHours(24,0,0,0);
  const msLeft = end - now;
  const totalMs = 24*60*60*1000;
  const frac = msLeft / totalMs;
  const offset = RING_CIRC * (1 - frac);
  const ringProgress = document.getElementById('ringProgress');
  if (!ringProgress) return;
  ringProgress.style.strokeDashoffset = offset.toFixed(1);

  const h = String(Math.floor(msLeft/3600000)).padStart(2,'0');
  const m = String(Math.floor((msLeft%3600000)/60000)).padStart(2,'0');
  const s = String(Math.floor((msLeft%60000)/1000)).padStart(2,'0');
  document.getElementById('ringTime').textContent = `${h}:${m}:${s}`;
}
if (document.getElementById('ringTime')) {
  updateRing();
  setInterval(updateRing, 1000);
}

// ---------------- Sidebar toggle (desktop + mobile) ----------------
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const menuBtn = document.getElementById('menuBtn');
const isMobile = () => window.innerWidth <= 860;

function openMenu(){
  if (isMobile()) {
    sidebar.classList.add('open');
    overlay.classList.add('show');
  } else {
    sidebar.classList.remove('collapsed');
  }
}
function closeMenu(){
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
}
function toggleMenu(){
  if (isMobile()) {
    if (sidebar.classList.contains('open')) closeMenu();
    else openMenu();
  } else {
    sidebar.classList.toggle('collapsed');
  }
}
if (menuBtn) menuBtn.addEventListener('click', toggleMenu);
if (overlay) overlay.addEventListener('click', closeMenu);

// ---------------- Search Functionality ----------------
const searchInput = document.getElementById('desktopSearch');
const searchResults = document.getElementById('searchResults');

if (searchInput && searchResults) {
  searchInput.addEventListener('input', function(e) {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      searchResults.style.display = 'none';
      return;
    }
    
    const matches = ALL_GAMES.filter(g => g.title.toLowerCase().includes(query));
    
    searchResults.innerHTML = '';
    if (matches.length === 0) {
      searchResults.innerHTML = '<div class="search-no-results">No games found</div>';
    } else {
      matches.forEach((g, i) => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `
          <div class="sr-thumb">${thumb(i+10, g.title.substring(0,2))}</div>
          <div class="sr-info">
            <span class="sr-title">${g.title}</span>
            <span class="sr-cat">${g.cat || g.meta || 'Game'}</span>
          </div>
        `;
        searchResults.appendChild(item);
      });
    }
    searchResults.style.display = 'block';
  });

  document.addEventListener('click', function(e) {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.style.display = 'none';
    }
  });
  
  searchInput.addEventListener('focus', function() {
    if (this.value.trim() !== '') {
      searchResults.style.display = 'block';
    }
  });
}

// ---------------- Theme toggle ----------------
const themeToggleBtn = document.getElementById('themeToggle');
const toggleTrack = themeToggleBtn.querySelector('.toggle-track');
const themeText = document.getElementById('themeText');

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
  document.body.classList.add('light-theme');
  toggleTrack.classList.remove('on');
  themeToggleBtn.setAttribute('aria-pressed', 'false');
  if(themeText) themeText.textContent = 'Light theme';
}

themeToggleBtn.addEventListener('click', function(){
  const isLight = document.body.classList.toggle('light-theme');
  
  if (isLight) {
    toggleTrack.classList.remove('on');
    this.setAttribute('aria-pressed', 'false');
    if(themeText) themeText.textContent = 'Light theme';
    localStorage.setItem('theme', 'light');
  } else {
    toggleTrack.classList.add('on');
    this.setAttribute('aria-pressed', 'true');
    if(themeText) themeText.textContent = 'Dark theme';
    localStorage.setItem('theme', 'dark');
  }
});

// ============================================================
//  PHASE 1 — Toast Notification System
// ============================================================
const toastContainer = document.getElementById('toastContainer');
const TOAST_ICONS = {
  info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>',
  warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
};

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span class="toast-icon ${type}">${TOAST_ICONS[type] || TOAST_ICONS.info}</span><span class="toast-msg">${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3000);
}

// Global interceptor for dead links (href="#")
document.addEventListener('click', function(e) {
  const link = e.target.closest('a[href="#"]');
  if (link) {
    e.preventDefault();
    const text = link.textContent.trim();
    showToast(`${text} — Coming soon!`, 'info');
  }
});

// ============================================================
//  PHASE 2 — Smooth Scroll Navigation
// ============================================================
document.documentElement.style.scrollBehavior = 'smooth';

// Map sidebar links to sections & scroll
const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
const sectionMap = {
  '#home': document.getElementById('home'),
  '#discover': document.getElementById('discover'),
  '#categories': document.getElementById('categories'),
  '#trending': document.getElementById('trending'),
  '#new': document.getElementById('new'),
  '#challenge': document.getElementById('challenge'),
  '#leaderboards': document.getElementById('leaderboards'),
  '#recent': document.getElementById('recent'),
};

navLinks.forEach(link => {
  const href = link.getAttribute('href');
  const target = sectionMap[href];
  if (target) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Update active state
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      this.classList.add('active');
      // Close mobile sidebar if open
      closeMenu();
    });
  }
});

// Intersection Observer for active nav state
const sections = document.querySelectorAll('section[id]');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      // Find which sidebar link maps to this section
      let matchHref = '#' + id;
      // Reverse map
      for (const [href, el] of Object.entries(sectionMap)) {
        if (el && el.id === id) { matchHref = href; break; }
      }
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      const activeLink = document.querySelector(`.nav-link[href="${matchHref}"]`);
      if (activeLink) activeLink.classList.add('active');
    }
  });
}, { rootMargin: '-20% 0px -60% 0px' });
sections.forEach(s => observer.observe(s));

// Hero buttons
const heroButtons = document.querySelectorAll('.hero-actions .btn');
if (heroButtons[0]) {
  heroButtons[0].addEventListener('click', () => {
    document.getElementById('featured').scrollIntoView({ behavior: 'smooth' });
  });
}
if (heroButtons[1]) {
  heroButtons[1].addEventListener('click', () => {
    document.getElementById('categories').scrollIntoView({ behavior: 'smooth' });
  });
}

// Play Challenge button
const challengeBtn = document.querySelector('#challenge .btn-primary');
if (challengeBtn) {
  challengeBtn.addEventListener('click', () => {
    showToast('Launching Daily Challenge...', 'success');
  });
}

// ============================================================
//  PHASE 3 — Login Modal
// ============================================================
const loginModal = document.getElementById('loginModal');
const loginBtn = document.getElementById('loginBtn');
const authForm = document.getElementById('authForm');
const GOOGLE_CLIENT_ID = '261006764457-ototpkga99f1aqvup7jme0dvrtmp4ue1.apps.googleusercontent.com';

// Initialize Google Identity Services
function initializeGoogleSignIn() {
  if (typeof google === 'undefined' || !google.accounts) {
    // Google library not loaded yet, retry
    setTimeout(initializeGoogleSignIn, 100);
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleCredentialResponse,
  });

  // Render the Google button in the container
  google.accounts.id.renderButton(
    document.getElementById('googleSignInDiv'),
    {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      width: '100%',
      text: 'continue_with',
      shape: 'rectangular',
    }
  );
}

// Handle Google credential response
async function handleGoogleCredentialResponse(response) {
  try {
    const res = await fetch('http://127.0.0.1:8000/api/v1/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('access_token', data.access_token);
      showToast('Logged in with Google!', 'success');
      closeLoginModal();
      checkAuth();
    } else {
      showToast(data.detail || 'Google login failed', 'warning');
    }
  } catch (err) {
    showToast('Connection error — is the backend running?', 'warning');
  }
}

// Initialize Google Sign-In when modal opens
if (document.getElementById('loginModal')) {
  initializeGoogleSignIn();
}

const authToggleLink = document.getElementById('authToggleLink');
const modalTitle = document.getElementById('modalTitle');
const modalSub = document.getElementById('modalSub');
const emailField = document.getElementById('emailField');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authToggle = document.getElementById('authToggle');
let isLoginMode = true;

function openLoginModal() {
  loginModal.style.display = 'flex';
  requestAnimationFrame(() => loginModal.classList.add('show'));
}
function closeLoginModal() {
  loginModal.classList.remove('show');
  setTimeout(() => { loginModal.style.display = 'none'; }, 250);
}

if (loginBtn) loginBtn.addEventListener('click', openLoginModal);

loginModal.addEventListener('click', function(e) {
  if (e.target === loginModal) closeLoginModal();
});

authToggleLink.addEventListener('click', function() {
  isLoginMode = !isLoginMode;
  if (isLoginMode) {
    modalTitle.textContent = 'Welcome back';
    modalSub.textContent = 'Log in to your GIMMY account';
    emailField.style.display = 'none';
    authSubmitBtn.textContent = 'Log in';
    authToggle.innerHTML = 'Don\'t have an account? <span id="authToggleLink">Sign up</span>';
  } else {
    modalTitle.textContent = 'Create account';
    modalSub.textContent = 'Sign up to start playing on GIMMY';
    emailField.style.display = 'flex';
    authSubmitBtn.textContent = 'Sign up';
    authToggle.innerHTML = 'Already have an account? <span id="authToggleLink">Log in</span>';
  }
  // Re-bind click on the new span
  document.getElementById('authToggleLink').addEventListener('click', arguments.callee);
});

authForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  const username = document.getElementById('authUsername').value;
  const password = document.getElementById('authPassword').value;
  const email = document.getElementById('authEmail').value;

  try {
    if (isLoginMode) {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      const res = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('access_token', data.access_token);
        showToast('Logged in successfully!', 'success');
        closeLoginModal();
checkAuth();

// ─── Restore saved accent color ───
const savedAccent = localStorage.getItem('accent_color');
if (savedAccent) {
  document.documentElement.style.setProperty('--primary', savedAccent);
  document.documentElement.style.setProperty('--primary-dim', savedAccent + '22');
  document.documentElement.style.setProperty('--primary-glow', savedAccent + '59');
}
      } else {
        showToast(data.detail || 'Login failed', 'warning');
      }
    } else {
      const res = await fetch('http://127.0.0.1:8000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Account created! You can now log in.', 'success');
        // Switch to login mode
        authToggleLink.click();
      } else {
        showToast(data.detail || 'Registration failed', 'warning');
      }
    }
  } catch(err) {
    showToast('Connection error — is the backend running?', 'warning');
  }
});

// ============================================================
//  PHASE 4 — Notification Bell Dropdown
// ============================================================
const notifBtn = document.getElementById('notifBtn');
const notifDropdown = document.getElementById('notifDropdown');
if (notifBtn && notifDropdown) {
  notifBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    profileDropdown.classList.remove('show');
    notifDropdown.classList.toggle('show');
  });
}

// ============================================================
//  PHASE 5 — Profile Avatar Dropdown
// ============================================================
const avatarBtn = document.getElementById('avatarBtn');
const profileDropdown = document.getElementById('profileDropdown');
if (avatarBtn && profileDropdown) {
  avatarBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    notifDropdown.classList.remove('show');
    profileDropdown.classList.toggle('show');
  });
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(e) {
  if (notifDropdown && !notifBtn.contains(e.target)) notifDropdown.classList.remove('show');
  if (profileDropdown && !avatarBtn.contains(e.target)) profileDropdown.classList.remove('show');
});

// Profile dropdown items
document.querySelectorAll('#profileDropdown .dropdown-item').forEach(item => {
  item.addEventListener('click', function() {
    const text = this.textContent.trim();
    if (text === 'Log out') {
      localStorage.removeItem('access_token');
      showToast('Logged out successfully', 'info');
      checkAuth();
    } else if (text !== 'Profile') {
      showToast(`${text} — Coming soon!`, 'info');
    }
    profileDropdown.classList.remove('show');
  });
});

// ============================================================
//  PHASE 6 — Game Card Interactions (delegated)
// ============================================================
document.addEventListener('click', async function(e) {
  // Heart / Favorite button
  const favBtn = e.target.closest('.gc-fav');
  if (favBtn) {
    e.stopPropagation();
    const token = localStorage.getItem('access_token');
    const gameId = favBtn.dataset.gameId;
    if (!token) {
      showToast('Log in to save favorites!', 'warning');
      return;
    }
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/users/me/favorites/${gameId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        favBtn.classList.toggle('active', data.favorited);
        // trigger pop animation
        favBtn.classList.remove('pop');
        void favBtn.offsetWidth; // reflow to restart animation
        favBtn.classList.add('pop');
        const card = favBtn.closest('.game-card');
        const title = card ? card.querySelector('.gc-title')?.textContent : 'Game';
        showToast(data.favorited ? `Added "${title}" to Favorites ❤️` : `Removed "${title}" from Favorites`, data.favorited ? 'success' : 'info');
      } else {
        showToast('Could not update favorites', 'warning');
      }
    } catch(err) {
      showToast('Connection error', 'warning');
    }
    return;
  }

  // Play button on game cards
  const playBtn = e.target.closest('.gc-play');
  if (playBtn) {
    e.stopPropagation();
    const card = playBtn.closest('.game-card');
    const title = card ? card.querySelector('.gc-title')?.textContent : 'Game';
    const favBtn = card ? card.querySelector('.gc-fav') : null;
    const gameId = favBtn ? favBtn.dataset.gameId : null;
    
    showToast(`Launching ${title}...`, 'success');
    
    // Record session
    if (gameId) {
      const token = localStorage.getItem('access_token');
      if (token) {
        fetch(`http://127.0.0.1:8000/api/v1/users/me/sessions/${gameId}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(err => console.error('Failed to record session:', err));
      }
    }
    return;
  }
});
// ============================================================
//  PHASE 7 — Authentication State Check
// ============================================================
async function checkAuth() {
  const token = localStorage.getItem('access_token');
  const avatarBtn = document.getElementById('avatarBtn');
  const loginBtn = document.getElementById('loginBtn');
  const avatarInitials = document.getElementById('avatarInitials');

  if (!token) {
    avatarBtn.style.display = 'none';
    loginBtn.style.display = 'inline-flex';
    return;
  }
  
  try {
    const res = await fetch('http://127.0.0.1:8000/api/v1/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const user = await res.json();
      loginBtn.style.display = 'none';
      avatarBtn.style.display = 'flex';
      avatarInitials.textContent = user.username.charAt(0).toUpperCase();
    } else {
      localStorage.removeItem('access_token');
      avatarBtn.style.display = 'none';
      loginBtn.style.display = 'inline-flex';
    }
  } catch (err) {
    console.error("Auth check failed:", err);
  }
}

checkAuth();