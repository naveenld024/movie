/* ============================================================
   JOYFLIX — app.js
   TMDB API + tmdbplayer.nunesnetwork.com integration
   ============================================================ */

'use strict';

// ── CONFIG ──────────────────────────────────────────────────
const TMDB_KEY = '2dca580c2a14b55200e784d157207b4d'; // public demo key
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/';
const PLAYER_URL = 'https://tmdbplayer.nunesnetwork.com/';

// ── STATE ────────────────────────────────────────────────────
let currentTab = 'home';   // home | movies | tv | trending
let currentGenreId = null;
let searchOpen = false;
let searchTimer = null;
let heroItem = null;
let modalItem = null;
let selectedSeason = 1;
let selectedEpisode = 1;
let totalSeasons = 1;
let totalEpisodes = 1;

// ── DOM REFS ────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const navbar = $('navbar');
const heroBg = $('heroBg');
const heroTitle = $('heroTitle');
const heroMeta = $('heroMeta');
const heroOverview = $('heroOverview');
const heroTypeBadge = $('heroTypeBadge');
const heroPlayBtn = $('heroPlayBtn');
const heroInfoBtn = $('heroInfoBtn');
const mainContent = $('main-content');
const genreBar = $('genre-bar');
const modalOverlay = $('modal-overlay');
const modal = $('modal');
const modalClose = $('modalClose');
const modalBackdrop = $('modalBackdrop');
const modalTitle = $('modalTitle');
const modalMeta = $('modalMeta');
const modalOverview = $('modalOverview');
const modalActions = $('modalActions');
const modalGenres = $('modalGenres');
const tvControls = $('tvControls');
const seasonBtns = $('seasonBtns');
const episodeBtns = $('episodeBtns');
const playerOverlay = $('player-overlay');
const playerIframe = $('player-iframe');
const playerBack = $('playerBack');
const playerTitle = $('playerTitle');
const searchInput = $('searchInput');
const searchToggle = $('searchToggle');
const searchPage = $('search-results-page');
const searchGrid = $('searchGrid');
const searchLabel = $('searchQueryLabel');
const toast = $('toast');
const navHome = $('navHome');
const navMovies = $('navMovies');
const navTV = $('navTV');
const navTrending = $('navTrending');
const homeBtn = $('homeBtn');
const hero = $('hero');

// ── UTILS ────────────────────────────────────────────────────
const img = (path, size = 'w500') =>
  path ? `${IMG_BASE}${size}${path}` : null;

const imgFallback = (path, size) =>
  img(path, size) || `https://via.placeholder.com/300x450/1a1a1a/666?text=No+Image`;

async function tmdb(endpoint, params = {}) {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set('api_key', TMDB_KEY);
  url.searchParams.set('language', 'en-US');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB error ${res.status}`);
  return res.json();
}

function showToast(msg, duration = 2500) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), duration);
}

function scoreColor(score) {
  if (score >= 7.5) return '#46d369';
  if (score >= 6) return '#f5c518';
  return '#e74c3c';
}

function formatDate(str) {
  if (!str) return '';
  return new Date(str).getFullYear();
}

// ── SCROLLBAR / NAVBAR ───────────────────────────────────────
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });

// ── HERO ─────────────────────────────────────────────────────
function setHero(item) {
  heroItem = item;
  const isTV = item.media_type === 'tv' || !item.title;
  const title = item.title || item.name || 'Unknown';
  const overview = item.overview || '';
  const score = (item.vote_average || 0).toFixed(1);
  const year = formatDate(item.release_date || item.first_air_date);
  const bgPath = img(item.backdrop_path, 'original');

  if (bgPath) {
    heroBg.style.backgroundImage = `url(${bgPath})`;
    heroBg.style.opacity = '1';
  }
  heroTitle.textContent = title;
  heroOverview.textContent = overview;
  heroTypeBadge.innerHTML = isTV
    ? `<i class="ph-fill ph-television-simple"></i> TV SHOW`
    : `<i class="ph-fill ph-film-slate"></i> MOVIE`;

  heroMeta.innerHTML = `
    <span class="hero-score" style="color:${scoreColor(parseFloat(score))}">★ ${score}</span>
    ${year ? `<span>${year}</span>` : ''}
    ${item.adult ? `<span class="modal-badge">18+</span>` : `<span class="modal-badge">${isTV ? 'TV' : 'PG'}</span>`}
  `;

  heroPlayBtn.onclick = () => playItem(item);
  heroInfoBtn.onclick = () => openModal(item);
}

// ── ROWS ─────────────────────────────────────────────────────
function createRow(title, items) {
  if (!items || !items.length) return;
  const section = document.createElement('section');
  section.className = 'row-section';

  section.innerHTML = `
    <div class="row-header">
      <h2 class="row-title">${title}</h2>
      <a href="#" class="row-see-all">See all ›</a>
    </div>
    <div class="slider-track-outer">
      <div class="slider-track"></div>
    </div>
  `;

  const track = section.querySelector('.slider-track');
  items.forEach(item => {
    const card = createCard(item);
    track.appendChild(card);
  });

  mainContent.appendChild(section);
}

function createSkeletonRow(title, count = 8) {
  const section = document.createElement('section');
  section.className = 'row-section';
  section.innerHTML = `
    <div class="row-header">
      <h2 class="row-title">${title}</h2>
    </div>
    <div class="slider-track-outer">
      <div class="slider-track">
        ${Array.from({ length: count }, () =>
    `<div class="card-skeleton"><div class="skeleton-box"></div></div>`
  ).join('')}
      </div>
    </div>
  `;
  return section;
}

function createCard(item, inGrid = false) {
  const isTV = item.media_type === 'tv' || item.first_air_date !== undefined;
  const title = item.title || item.name || '—';
  const score = (item.vote_average || 0).toFixed(1);
  const year = formatDate(item.release_date || item.first_air_date);
  const poster = imgFallback(item.poster_path, 'w342');
  const scoreC = scoreColor(parseFloat(score));

  const wrapper = document.createElement(inGrid ? 'div' : 'div');
  wrapper.className = inGrid ? 'card' : 'card';

  wrapper.innerHTML = `
    <div class="card-img-wrap">
      <img src="${poster}" alt="${title}" loading="lazy" />
      <div class="card-overlay">
        <button class="card-play-btn" aria-label="Play ${title}">
          <i class="ph-fill ph-play" style="margin-left:2px"></i>
        </button>
        <div class="card-title">${title}</div>
        ${year ? `<div class="card-year">${year}</div>` : ''}
      </div>
      <div class="card-rating" style="color:${scoreC}">★ ${score}</div>
    </div>
  `;

  // play button
  const playBtn = wrapper.querySelector('.card-play-btn');
  playBtn.addEventListener('click', e => {
    e.stopPropagation();
    playItem({ ...item, media_type: isTV ? 'tv' : 'movie' });
  });

  // whole card → open modal
  wrapper.addEventListener('click', () => {
    openModal({ ...item, media_type: isTV ? 'tv' : 'movie' });
  });

  return wrapper;
}

// ── MODAL ────────────────────────────────────────────────────
async function openModal(item) {
  modalItem = item;
  const isTV = item.media_type === 'tv' || item.first_air_date !== undefined;
  const type = isTV ? 'tv' : 'movie';
  const title = item.title || item.name || '—';
  const score = (item.vote_average || 0).toFixed(1);
  const year = formatDate(item.release_date || item.first_air_date);
  const scoreC = scoreColor(parseFloat(score));

  modalTitle.textContent = title;
  modalOverview.textContent = item.overview || 'No description available.';

  const backdrop = img(item.backdrop_path, 'w1280') || imgFallback(item.poster_path);
  modalBackdrop.src = backdrop;

  modalMeta.innerHTML = `
    <span class="modal-score-badge" style="color:${scoreC}">★ ${score}</span>
    ${year ? `<span>${year}</span>` : ''}
    <span class="modal-badge">${isTV ? 'TV Show' : 'Movie'}</span>
    ${item.adult ? `<span class="modal-badge">18+</span>` : ''}
  `;

  // Genre chips
  modalGenres.innerHTML = '';
  if (item.genre_ids && item.genre_ids.length) {
    const genreMap = await getGenreMap();
    item.genre_ids.slice(0, 6).forEach(id => {
      if (genreMap[id]) {
        const chip = document.createElement('span');
        chip.className = 'genre-chip';
        chip.textContent = genreMap[id];
        modalGenres.appendChild(chip);
      }
    });
  }

  // TV controls
  selectedSeason = 1;
  selectedEpisode = 1;
  if (isTV) {
    tvControls.style.display = 'block';
    totalSeasons = item.number_of_seasons || 1;
    totalEpisodes = 1;

    // Fetch details to know episode counts
    try {
      const details = await tmdb(`/tv/${item.id}`);
      totalSeasons = details.number_of_seasons || 1;
      renderSeasonBtns(totalSeasons);
      await updateEpisodeBtns(item.id, 1);
    } catch {
      renderSeasonBtns(totalSeasons);
      renderEpisodeBtns(12);
    }
  } else {
    tvControls.style.display = 'none';
  }

  // Actions
  modalActions.innerHTML = `
    <button class="btn-play" id="modalPlayBtn">
      <i class="ph-fill ph-play"></i> Play
    </button>
    <button class="btn-info" id="modalTrailerBtn">
      <i class="ph ph-youtube-logo"></i> Trailer
    </button>
  `;
  $('modalPlayBtn').onclick = () => {
    closeModal();
    playItem({ ...item, media_type: type });
  };
  $('modalTrailerBtn').onclick = () => openTrailer(item.id, type);

  // Show
  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function renderSeasonBtns(count) {
  seasonBtns.innerHTML = '';
  for (let i = 1; i <= count; i++) {
    const b = document.createElement('button');
    b.className = `num-btn${i === selectedSeason ? ' active' : ''}`;
    b.textContent = i;
    b.onclick = async () => {
      selectedSeason = i;
      selectedEpisode = 1;
      document.querySelectorAll('#seasonBtns .num-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      if (modalItem) await updateEpisodeBtns(modalItem.id, i);
    };
    seasonBtns.appendChild(b);
  }
}

async function updateEpisodeBtns(tvId, season) {
  episodeBtns.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;margin:0"></div>';
  try {
    const data = await tmdb(`/tv/${tvId}/season/${season}`);
    totalEpisodes = (data.episodes || []).length || 12;
  } catch {
    totalEpisodes = 12;
  }
  renderEpisodeBtns(totalEpisodes);
}

function renderEpisodeBtns(count) {
  episodeBtns.innerHTML = '';
  const max = Math.min(count, 30);
  for (let i = 1; i <= max; i++) {
    const b = document.createElement('button');
    b.className = `num-btn${i === selectedEpisode ? ' active' : ''}`;
    b.textContent = i;
    b.onclick = () => {
      selectedEpisode = i;
      document.querySelectorAll('#episodeBtns .num-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    };
    episodeBtns.appendChild(b);
  }
}

function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => { modalBackdrop.src = ''; }, 400);
}

modalClose.onclick = closeModal;
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closePlayer(); } });

// ── TRAILER ───────────────────────────────────────────────────
async function openTrailer(id, type) {
  try {
    const data = await tmdb(`/${type}/${id}/videos`);
    const trailer = (data.results || []).find(v =>
      v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
    );
    if (trailer) {
      window.open(`https://www.youtube.com/watch?v=${trailer.key}`, '_blank');
    } else {
      showToast('No trailer available');
    }
  } catch {
    showToast('Could not load trailer');
  }
}

// ── PLAYER ───────────────────────────────────────────────────
function playItem(item) {
  const isTV = item.media_type === 'tv' || item.first_air_date !== undefined;
  const type = isTV ? 'tv' : 'movie';
  const title = item.title || item.name || '';

  const params = new URLSearchParams({ type, id: item.id, server: 1 });
  if (isTV) {
    params.set('s', selectedSeason);
    params.set('e', selectedEpisode);
  }

  const url = `${PLAYER_URL}?${params.toString()}`;
  playerIframe.src = url;
  playerTitle.textContent = isTV
    ? `${title} — S${selectedSeason} E${selectedEpisode}`
    : title;

  playerOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Close modal if open
  closeModal();
}

function closePlayer() {
  playerOverlay.classList.remove('open');
  document.body.style.overflow = '';
  // Small delay to avoid audio continuing
  setTimeout(() => { playerIframe.src = ''; }, 400);
}

playerBack.onclick = closePlayer;

// ── SEARCH ───────────────────────────────────────────────────
searchToggle.addEventListener('click', () => {
  searchOpen = !searchOpen;
  searchInput.classList.toggle('open', searchOpen);
  if (searchOpen) searchInput.focus();
  else {
    searchInput.value = '';
    hideSearchPage();
  }
});

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  const q = searchInput.value.trim();
  if (q.length < 2) { hideSearchPage(); return; }
  searchTimer = setTimeout(() => doSearch(q), 420);
});

async function doSearch(q) {
  showSearchPage(q);
  searchGrid.innerHTML = '<div class="spinner"></div>';
  try {
    const data = await tmdb('/search/multi', { query: q });
    const items = (data.results || []).filter(i =>
      (i.media_type === 'movie' || i.media_type === 'tv') && i.poster_path
    );
    searchGrid.innerHTML = '';
    if (!items.length) {
      searchGrid.innerHTML = '<p style="color:var(--text-mute);grid-column:1/-1">No results found.</p>';
      return;
    }
    items.forEach(item => {
      searchGrid.appendChild(createCard(item, true));
    });
  } catch {
    searchGrid.innerHTML = '<p style="color:var(--text-mute);grid-column:1/-1">Search failed. Check your connection.</p>';
  }
}

function showSearchPage(q) {
  searchLabel.textContent = `"${q}"`;
  hero.style.display = 'none';
  mainContent.style.display = 'none';
  genreBar.style.display = 'none';
  searchPage.classList.add('active');
}

function hideSearchPage() {
  searchPage.classList.remove('active');
  hero.style.display = '';
  mainContent.style.display = '';
  genreBar.style.display = '';
}

// ── GENRE CACHE ──────────────────────────────────────────────
let _genreMap = null;
async function getGenreMap() {
  if (_genreMap) return _genreMap;
  try {
    const [m, t] = await Promise.all([
      tmdb('/genre/movie/list'),
      tmdb('/genre/tv/list'),
    ]);
    _genreMap = {};
    [...(m.genres || []), ...(t.genres || [])].forEach(g => { _genreMap[g.id] = g.name; });
  } catch { _genreMap = {}; }
  return _genreMap;
}

// ── GENRE FILTER BAR ─────────────────────────────────────────
const HOME_GENRES = [
  { id: null, name: 'All' },
  { id: 28, name: 'Action' },
  { id: 35, name: 'Comedy' },
  { id: 18, name: 'Drama' },
  { id: 27, name: 'Horror' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 16, name: 'Animation' },
  { id: 53, name: 'Thriller' },
  { id: 12, name: 'Adventure' },
];

function buildGenreBar(genres) {
  genreBar.innerHTML = '';
  genres.forEach(g => {
    const pill = document.createElement('button');
    pill.className = `genre-pill${g.id === currentGenreId ? ' active' : ''}`;
    pill.textContent = g.name;
    pill.onclick = () => {
      currentGenreId = g.id;
      document.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      loadRows(currentTab, g.id);
    };
    genreBar.appendChild(pill);
  });
}

// ── TABS ─────────────────────────────────────────────────────
function setActiveNavLink(el) {
  [navHome, navMovies, navTV, navTrending].forEach(x => x.classList.remove('active'));
  el.classList.add('active');
}

navHome.onclick = e => { e.preventDefault(); currentTab = 'home'; currentGenreId = null; switchView('home'); };
navMovies.onclick = e => { e.preventDefault(); currentTab = 'movies'; currentGenreId = null; switchView('movies'); };
navTV.onclick = e => { e.preventDefault(); currentTab = 'tv'; currentGenreId = null; switchView('tv'); };
navTrending.onclick = e => { e.preventDefault(); currentTab = 'trending'; currentGenreId = null; switchView('trending'); };
homeBtn.onclick = e => { e.preventDefault(); currentTab = 'home'; currentGenreId = null; switchView('home'); };

function switchView(tab) {
  currentTab = tab;
  setActiveNavLink($({ home: 'navHome', movies: 'navMovies', tv: 'navTV', trending: 'navTrending' }[tab]));
  hideSearchPage();
  searchInput.value = '';
  searchInput.classList.remove('open');
  searchOpen = false;
  loadRows(tab, null);
  buildGenreBar(HOME_GENRES);
  document.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('active'));
  genreBar.querySelector('.genre-pill').classList.add('active');
}

// ── ROW DEFINITIONS ──────────────────────────────────────────
const ROW_CONFIG = {
  home: [
    { title: '🔥 Trending This Week', endpoint: '/trending/all/week' },
    { title: '🎬 Popular Movies', endpoint: '/movie/popular' },
    { title: '📺 Popular TV Shows', endpoint: '/tv/popular' },
    { title: '⭐ Top Rated Movies', endpoint: '/movie/top_rated' },
    { title: '🆕 Now Playing', endpoint: '/movie/now_playing' },
    { title: '📡 Airing Today', endpoint: '/tv/airing_today' },
    { title: '🏆 Top Rated TV', endpoint: '/tv/top_rated' },
    { title: '🗓 Upcoming Movies', endpoint: '/movie/upcoming' },
  ],
  movies: [
    { title: '🎬 Popular Movies', endpoint: '/movie/popular' },
    { title: '⭐ Top Rated', endpoint: '/movie/top_rated' },
    { title: '🆕 Now Playing', endpoint: '/movie/now_playing' },
    { title: '🗓 Upcoming', endpoint: '/movie/upcoming' },
  ],
  tv: [
    { title: '📺 Popular Shows', endpoint: '/tv/popular' },
    { title: '⭐ Top Rated', endpoint: '/tv/top_rated' },
    { title: '📡 Airing Today', endpoint: '/tv/airing_today' },
    { title: '📻 On The Air', endpoint: '/tv/on_the_air' },
  ],
  trending: [
    { title: '📈 Trending Today', endpoint: '/trending/all/day' },
    { title: '📅 Trending This Week', endpoint: '/trending/all/week' },
    { title: '🎥 Trending Movies', endpoint: '/trending/movie/week' },
    { title: '📺 Trending TV', endpoint: '/trending/tv/week' },
  ],
};

async function loadRows(tab, genreId) {
  mainContent.innerHTML = '';
  hero.style.display = '';

  const rows = ROW_CONFIG[tab] || ROW_CONFIG.home;

  // Skeleton placeholders
  rows.forEach(r => {
    const s = createSkeletonRow(r.title);
    s.dataset.endpoint = r.endpoint;
    mainContent.appendChild(s);
  });

  // Fetch first row for hero
  const firstEndpoint = rows[0].endpoint;
  const firstParams = genreId ? { with_genres: genreId } : {};
  let heroSet = false;

  // Fetch all rows in parallel
  const fetches = rows.map(async (r) => {
    const params = genreId ? { with_genres: genreId, page: 1 } : { page: 1 };
    try {
      const data = await tmdb(r.endpoint, params);
      let items = (data.results || []).filter(i => i.poster_path);
      // Ensure media_type tag for mixed endpoints
      items = items.map(i => ({ ...i, media_type: i.media_type || (i.first_air_date ? 'tv' : 'movie') }));
      return { title: r.title, items };
    } catch {
      return { title: r.title, items: [] };
    }
  });

  const results = await Promise.all(fetches);

  // Set hero from first row
  if (results[0] && results[0].items.length) {
    // Pick a random from top 5
    const pick = results[0].items[Math.floor(Math.random() * Math.min(5, results[0].items.length))];
    setHero(pick);
  }

  // Replace skeletons with real rows
  mainContent.innerHTML = '';
  results.forEach(r => {
    if (r.items.length) createRow(r.title, r.items);
  });
}

// ── INIT ─────────────────────────────────────────────────────
async function init() {
  buildGenreBar(HOME_GENRES);
  await loadRows('home', null);
}

init().catch(err => {
  console.error('StreamFlix init error:', err);
  showToast('JoyFlix: Failed to load content. Check your TMDB API key.', 5000);
});
