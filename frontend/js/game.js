// ============================================================
//  GAME PAGE — Load and play a game
// ============================================================

const API_BASE = 'http://127.0.0.1:8000';
let currentGame = null;
let isFavorited = false;

// Get slug from URL
function getSlug() {
  const params = new URLSearchParams(window.location.search);
  return params.get('slug');
}

// Load game data
async function loadGame() {
  const slug = getSlug();
  if (!slug) {
    window.location.href = 'index.html';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/games/${slug}`);
    if (!res.ok) {
      showToast('Game not found', 'warning');
      setTimeout(() => window.location.href = 'index.html', 1500);
      return;
    }

    currentGame = await res.json();
    renderGame(currentGame);
    recordPlay(currentGame.id);
    checkFavorite();
  } catch (err) {
    console.error('Error loading game:', err);
    showToast('Failed to load game', 'warning');
  }
}

// Render game info
function renderGame(game) {
  document.title = `${game.title} — GIMMY`;
  document.getElementById('gameTitle').textContent = game.title;
  document.getElementById('gameCategory').textContent = game.category?.name || 'Game';
  document.getElementById('gameRating').textContent = game.rating || '0';
  document.getElementById('gamePlays').textContent = (game.plays || 0).toLocaleString();
  document.getElementById('gameDescription').textContent = game.description || '';

  // Difficulty badge
  const diffEl = document.getElementById('gameDifficulty');
  diffEl.textContent = game.difficulty?.charAt(0).toUpperCase() + (game.difficulty?.slice(1) || 'Medium');
  diffEl.className = `difficulty-badge difficulty-${game.difficulty || 'medium'}`;

  // Load iframe
  const iframe = document.getElementById('gameIframe');
  const loading = document.getElementById('gameLoading');

  const url = game.iframe_url.startsWith('http')
    ? game.iframe_url
    : `${API_BASE}${game.iframe_url.startsWith('/') ? '' : '/'}${game.iframe_url}`;
  iframe.src = url;
  iframe.onload = () => {
    loading.style.display = 'none';
  };

  // Hide loading after timeout as fallback
  setTimeout(() => {
    loading.style.display = 'none';
  }, 5000);
}

// Record play
async function recordPlay(gameId) {
  try {
    await fetch(`${API_BASE}/api/v1/games/${gameId}/play`, { method: 'POST' });
  } catch (err) {
    // Silent fail
  }
}

// Check if favorited
async function checkFavorite() {
  const token = localStorage.getItem('access_token');
  const favBtn = document.getElementById('favBtn');

  if (!token || !currentGame) {
    favBtn.style.display = 'none';
    return;
  }

  favBtn.style.display = 'flex';

  try {
    const res = await fetch(`${API_BASE}/api/v1/users/me/favorites`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const favorites = await res.json();
      isFavorited = favorites.some(f => f.id === currentGame.id);
      updateFavButton();
    }
  } catch (err) {
    // Silent fail
  }
}

// Update favorite button
function updateFavButton() {
  const favBtn = document.getElementById('favBtn');
  const favText = document.getElementById('favText');

  if (isFavorited) {
    favBtn.classList.add('active');
    favBtn.querySelector('svg').setAttribute('fill', '#EC4899');
    favText.textContent = 'Favorited';
  } else {
    favBtn.classList.remove('active');
    favBtn.querySelector('svg').setAttribute('fill', 'none');
    favText.textContent = 'Favorite';
  }
}

// Toggle favorite
document.getElementById('favBtn').addEventListener('click', async () => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    showToast('Log in to save favorites!', 'warning');
    return;
  }

  if (!currentGame) return;

  try {
    const res = await fetch(`${API_BASE}/api/v1/users/me/favorites/${currentGame.id}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      isFavorited = data.favorited;
      updateFavButton();
      showToast(isFavorited ? 'Added to Favorites' : 'Removed from Favorites', isFavorited ? 'success' : 'info');
    }
  } catch (err) {
    showToast('Could not update favorites', 'warning');
  }
});

// Share
document.getElementById('shareBtn').addEventListener('click', async () => {
  const url = window.location.href;
  if (navigator.share) {
    try {
      await navigator.share({ title: currentGame?.title || 'Game', url: url });
    } catch (err) {
      // User cancelled
    }
  } else {
    await navigator.clipboard.writeText(url);
    showToast('Link copied to clipboard!', 'success');
  }
});

// Fullscreen
document.getElementById('fullscreenBtn').addEventListener('click', () => {
  const frame = document.getElementById('gameFrame');
  if (frame.requestFullscreen) {
    frame.requestFullscreen();
  } else if (frame.webkitRequestFullscreen) {
    frame.webkitRequestFullscreen();
  }
});

// Initialize
loadGame();
