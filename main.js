// Main JavaScript entry point for The Vinyl Current
import './style.css';
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('vinyl-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  
  // Set canvas resolution
  // Assuming square aspect ratio based on typical vinyl shots or cover art
  // We'll update aspect ratio once first image loads
  let canvasWidth = 800;
  let canvasHeight = 800;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const frameCount = 80;
  const images = [];
  let imagesLoaded = 0;
  let currentFrame = 0;

  // Preload images
  for (let i = 0; i < frameCount; i++) {
    const img = new Image();
    const frameNum = i.toString().padStart(3, '0');
    img.src = `/vinyl_sequence/Tone_arm_dropping_onto_vinyl_${frameNum}.jpg`;
    img.onload = () => {
      imagesLoaded++;
      if (imagesLoaded === 1) {
        // Set actual aspect ratio based on first image
        canvasWidth = img.width;
        canvasHeight = img.height;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        renderFrame(0);
      }
      if (imagesLoaded === frameCount) {
        startAnimation();
      }
    };
    images.push(img);
  }

  function renderFrame(index) {
    if (images[index] && images[index].complete) {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.drawImage(images[index], 0, 0, canvasWidth, canvasHeight);
    }
  }

  const track = document.getElementById('hero-scroll-track');
  let targetFrame = 0;
  let currentAnimatedFrame = 0;

  function updateScrollTarget() {
    if (!track) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const trackTop = track.offsetTop;
    // maxScroll is the total scrollable distance for the track
    const maxScroll = track.offsetHeight - window.innerHeight;
    
    let scrollFraction = (scrollTop - trackTop) / maxScroll;
    if (scrollFraction < 0) scrollFraction = 0;
    if (scrollFraction > 1) scrollFraction = 1;
    
    targetFrame = scrollFraction * (frameCount - 1);
  }

  window.addEventListener('scroll', updateScrollTarget);
  window.addEventListener('resize', updateScrollTarget);

  function startAnimation() {
    updateScrollTarget();
    
    function animate() {
      // Lerp for smooth, premium feel
      // A smaller lerp factor (0.05) inherently makes the animation feel slower and heavier
      const lerpFactor = 0.05; 
      currentAnimatedFrame += (targetFrame - currentAnimatedFrame) * lerpFactor;
      
      const frameIndex = Math.max(0, Math.min(frameCount - 1, Math.round(currentAnimatedFrame)));
      renderFrame(frameIndex);
      
      requestAnimationFrame(animate);
    }
    
    requestAnimationFrame(animate);
  }

  // --- Smooth Proximity-Based "Flow" Hover Engine ---
  
  // Select all interactive items we want to react to the mouse
  const interactiveSelector = '.card, .list-card, .user-card, .primary-btn, .secondary-btn, .event-row';
  const proximityItems = Array.from(document.querySelectorAll(interactiveSelector)).map(el => ({
    el,
    targetProximity: 0,
    currentProximity: 0,
  }));

  let mouseX = -1000;
  let mouseY = -1000;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function updateProximity() {
    proximityItems.forEach(item => {
      const rect = item.el.getBoundingClientRect();
      // Calculate center of the element
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const distX = mouseX - centerX;
      const distY = mouseY - centerY;
      const distance = Math.sqrt(distX * distX + distY * distY);
      
      // Proximity threshold distance
      const maxDist = 300; 
      
      if (distance < maxDist) {
        // Curve-like flow: progress goes from 0 to 1
        const progress = 1 - (distance / maxDist);
        // Ease cubic for a buttery curve
        item.targetProximity = progress * progress * progress;
      } else {
        item.targetProximity = 0;
      }
      
      // Lerp for absolute smoothness (removes any jitter)
      const lerpFactor = 0.08;
      item.currentProximity += (item.targetProximity - item.currentProximity) * lerpFactor;
      
      // If proximity is small enough, set exactly 0 to save performance, else update CSS
      if (item.currentProximity > 0.001) {
        item.el.style.setProperty('--proximity', item.currentProximity);
      } else if (item.currentProximity <= 0.001 && item.targetProximity === 0) {
        item.currentProximity = 0;
        item.el.style.setProperty('--proximity', 0);
      }
    });
    
    requestAnimationFrame(updateProximity);
  }

  requestAnimationFrame(updateProximity);

  // --- Scroll-Based Visual Atmosphere Transitions ---
  const sections = document.querySelectorAll('section[id]');
  const layers = document.querySelectorAll('.atmosphere-layer');

  const observerOptions = {
    root: null,
    rootMargin: '-50% 0px -50% 0px',
    threshold: 0
  };

  const atmosphereObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        // Update layers
        layers.forEach(layer => {
          if (layer.dataset.section === id) {
            layer.style.opacity = '1';
          } else {
            layer.style.opacity = '0';
          }
        });
      }
    });
  }, observerOptions);

  sections.forEach(section => {
    atmosphereObserver.observe(section);
  });

  // --- Backend Data Fetching ---
  const API_BASE = 'http://localhost:3001/api';
  const CURRENT_USER_ID = 1; // Default user for demo

  // Helper for counting animation
  function animateValue(obj, start, end, duration, formatStr = '') {
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutExpo for smooth deceleration
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentVal = Math.floor(easeProgress * (end - start) + start);
      
      let displayStr = currentVal;
      if (formatStr === '+' && currentVal > 0) displayStr = currentVal + '+';
      if (formatStr === '%') displayStr = currentVal + '%';
      
      obj.innerHTML = displayStr;
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        obj.classList.add('pulse');
        setTimeout(() => obj.classList.remove('pulse'), 1000);
      }
    };
    window.requestAnimationFrame(step);
  }

  async function fetchAndRenderStats() {
    try {
      const res = await fetch(`${API_BASE}/stats`, { cache: 'no-store' });
      let stats = { total_songs: 0, total_users: 0, upcoming_events: 0, avg_match: 72 };
      
      if (res.ok) {
        const data = await res.json();
        if (data) {
          stats.total_songs = data.total_songs || 0;
          stats.total_users = data.total_users || 0;
          stats.upcoming_events = data.upcoming_events || 0;
          // Use placeholder 72% if missing, or use actual
          stats.avg_match = data.avg_match ? Number(data.avg_match) : 72;
        }
      }

      const statsSection = document.getElementById('stats-section');
      if (!statsSection) return;

      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          statsSection.classList.add('visible');
          
          animateValue(document.getElementById('stat-songs'), 0, stats.total_songs, 2000, '+');
          animateValue(document.getElementById('stat-users'), 0, stats.total_users, 2000, '+');
          animateValue(document.getElementById('stat-events'), 0, stats.upcoming_events, 2000, '');
          animateValue(document.getElementById('stat-match'), 0, Math.round(stats.avg_match), 2000, '%');
          
          observer.disconnect();
        }
      }, { threshold: 0.2 });
      
      observer.observe(statsSection);

    } catch (e) { 
      console.error('Error fetching stats:', e); 
      // Fallback
      const els = ['stat-songs', 'stat-users', 'stat-events', 'stat-match'];
      els.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0';
      });
    }
  }

  async function fetchAndRenderSongs(url = `${API_BASE}/songs`) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return;
      const songs = await res.json();
      const container = document.getElementById('explore-grid');
      if (!container) return;
      container.innerHTML = '';
      const images = ['/images/jazz_album_cover_1777789599343.png', '/images/synthwave_album_cover_1777790168302.png', '/images/user_listening_portrait_1777790064096.png'];
      
      // Reverse to show newest songs first
      songs.reverse().slice(0, 3).forEach((song, i) => {
        const img = images[i % images.length];
        const html = `
          <article class="card">
            <img src="${img}" alt="${song.title} Cover" class="card-image" />
            <div class="card-content">
              <h3 class="card-title">${song.title}</h3>
              <p class="card-meta">ID: ${song.song_id} • ${song.artist} • ${song.mood} • ${Math.floor(song.duration/60)}:${(song.duration%60).toString().padStart(2,'0')}</p>
              <button class="secondary-btn btn-like" data-id="${song.song_id}" style="margin-top: 10px; width: 100%;">Like</button>
            </div>
          </article>
        `;
        container.insertAdjacentHTML('beforeend', html);
      });

      // Attach like listeners
      document.querySelectorAll('.btn-like').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const songId = e.target.getAttribute('data-id');
          await fetch(`${API_BASE}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: CURRENT_USER_ID, song_id: songId })
          });
          fetchAndRenderActivity();
        });
      });
    } catch (e) { console.error('Error fetching songs:', e); }
  }

  // Artists (first 4 users as local artists proxy or real artists)
  async function fetchAndRenderArtists(nearby = false) {
    try {
      const url = nearby ? `${API_BASE}/artists/nearby` : `${API_BASE}/artists`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return;
      const artists = await res.json();
      const container = document.querySelector('#artists-grid');
      if (!container) return;
      container.innerHTML = '';
      
      artists.slice(0, 4).forEach((artist) => {
        const html = `
          <article class="list-card">
            <img src="${artist.image_url}" alt="${artist.name}" class="avatar-image" />
            <div class="list-card-content">
              <h3 class="list-card-title">${artist.name}</h3>
              <p class="list-card-meta">${artist.genre} • ${artist.distance_km} km away • ${artist.monthly_listeners} monthly listeners</p>
            </div>
          </article>
        `;
        container.insertAdjacentHTML('beforeend', html);
      });
    } catch (e) { console.error('Error fetching artists:', e); }
  }

  // Reviews
  async function fetchAndRenderReviews() {
    try {
      const res = await fetch(`${API_BASE}/reviews`, { cache: 'no-store' });
      if (!res.ok) return;
      const reviews = await res.json();
      const container = document.querySelector('#reviews-grid');
      if (!container) return;
      container.innerHTML = '';
      
      reviews.forEach((review) => {
        const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
        const html = `
          <article class="card">
            <div class="card-content" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 20px;">
              <p style="color: var(--primary); font-size: 1.2rem; margin-bottom: 5px;">${stars}</p>
              <h3 class="card-title" style="font-size: 1.1rem; margin-bottom: 10px;">${review.song}</h3>
              <p class="card-meta">"${review.review_text}"</p>
              <p class="card-meta" style="margin-top: 15px; color: var(--text-muted);">— ${review.reviewer}</p>
            </div>
          </article>
        `;
        container.insertAdjacentHTML('beforeend', html);
      });
    } catch (e) { console.error('Error fetching reviews:', e); }
  }

  // Genre Stats
  async function fetchAndRenderGenreStats() {
    try {
      const res = await fetch(`${API_BASE}/genres/stats`, { cache: 'no-store' });
      if (!res.ok) return;
      const stats = await res.json();
      const tbody = document.querySelector('#genre-stats-table tbody');
      if (!tbody) return;
      tbody.innerHTML = '';
      
      stats.forEach((stat) => {
        const avgRating = stat.avg_rating ? Number(stat.avg_rating).toFixed(1) : 'N/A';
        const html = `
          <tr>
            <td>${stat.name}</td>
            <td>${stat.total_songs}</td>
            <td>${avgRating}</td>
          </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', html);
      });
    } catch (e) { console.error('Error fetching genre stats:', e); }
  }

  // Community (top match users)
  async function fetchAndRenderCommunity() {
    try {
      const res = await fetch(`${API_BASE}/users`, { cache: 'no-store' });
      if (!res.ok) return;
      const users = await res.json();
      const container = document.querySelector('#community .grid-4');
      if (!container) return;
      container.innerHTML = '';
      const images = ['/images/user_listening_portrait_1777790064096.png', '/images/indie_band_portrait_1777789692032.png', '/images/synthwave_album_cover_1777790168302.png', '/images/jazz_album_cover_1777789599343.png'];
      
      // Assumes already sorted by match_score DESC from API
      users.slice(0, 4).forEach((user, index) => {
        const img = images[index % images.length];
        const isTopMatch = index === 0;
        const html = `
          <article class="user-card ${isTopMatch ? 'top-match-card' : ''}">
            <div class="avatar-wrapper">
              <img src="${img}" alt="${user.name}" class="user-avatar-image" />
              ${isTopMatch ? '<div class="top-match-badge">Top Match</div>' : ''}
            </div>
            <h3 class="user-name">${user.name}</h3>
            <p class="user-match">${user.match_score}% Match</p>
            <p class="user-taste">${user.taste_tags}</p>
          </article>
        `;
        container.insertAdjacentHTML('beforeend', html);
      });
    } catch (e) { console.error('Error fetching community:', e); }
  }

  async function fetchAndRenderPlaylists() {
    try {
      const res = await fetch(`${API_BASE}/playlists`, { cache: 'no-store' });
      if (!res.ok) return;
      const playlists = await res.json();
      const container = document.querySelector('#playlists .grid-3');
      if (!container) return;
      container.innerHTML = '';
      
      playlists.forEach((pl) => {
        const html = `
          <article class="card">
            <img src="${pl.cover_image || '/images/studio_grooves_playlist_1777790211522.png'}" alt="${pl.name}" class="card-image" />
            <div class="card-content">
              <h3 class="card-title">${pl.name}</h3>
              <p class="card-meta">${pl.collaborators} Collaborators • Last updated ${pl.last_updated}</p>
            </div>
          </article>
        `;
        container.insertAdjacentHTML('beforeend', html);
      });
    } catch (e) { console.error('Error fetching playlists:', e); }
  }

  async function fetchAndRenderEvents() {
    try {
      const res = await fetch(`${API_BASE}/events`, { cache: 'no-store' });
      if (!res.ok) return;
      const events = await res.json();
      const container = document.getElementById('events-list');
      if (!container) return;
      container.innerHTML = '';
      events.forEach(event => {
        let month = '???', day = '???';
        if (event.formatted_date) {
            const parts = event.formatted_date.split(' ');
            month = parts[0];
            day = parts[1].replace(',', '');
        }
        
        const html = `
          <article class="event-row">
            <div class="event-date">
              <span class="event-month">${month}</span>
              <span class="event-day">${day}</span>
            </div>
            <div class="event-info">
              <h3 class="event-title">${event.title}</h3>
              <p class="event-location">${event.location} • ${event.event_time || ''}</p>
            </div>
            <button class="secondary-btn">RSVP</button>
          </article>
        `;
        container.insertAdjacentHTML('beforeend', html);
      });
    } catch (e) { console.error('Error fetching events:', e); }
  }

  async function fetchAndRenderActivity() {
    try {
      const res = await fetch(`${API_BASE}/activity`, { cache: 'no-store' });
      if (!res.ok) return;
      const logs = await res.json();
      const container = document.getElementById('activity-list');
      if (!container) return;
      container.innerHTML = '';
      logs.forEach(log => {
        let timeText = log.minutes_ago === 0 ? 'Just now' : `${log.minutes_ago} minutes ago`;
        const html = `
          <div style="padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 1.1rem;"><strong style="color: var(--primary);">${log.name}</strong> ${log.action}</span>
            <span style="color: var(--text-muted); font-size: 0.9rem;">${timeText}</span>
          </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
      });
    } catch (e) { console.error('Error fetching activity:', e); }
  }

  // Setup interactions
  function setupInteractions() {
    const searchInput = document.getElementById('song-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        if (e.target.value.trim() !== '') {
          fetchAndRenderSongs(`${API_BASE}/songs/search?q=${encodeURIComponent(e.target.value)}`);
        } else {
          fetchAndRenderSongs();
        }
      });
    }

    const moodFilters = document.querySelectorAll('.filter-btn');
    moodFilters.forEach(btn => {
      btn.addEventListener('click', (e) => {
        moodFilters.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const mood = e.target.getAttribute('data-mood');
        if (mood === 'All') {
          fetchAndRenderSongs();
        } else {
          fetchAndRenderSongs(`${API_BASE}/songs/mood/${mood}`);
        }
      });
    });

    // Artists Toggle
    const nearbyToggle = document.getElementById('nearby-toggle');
    if (nearbyToggle) {
      nearbyToggle.addEventListener('change', (e) => {
        fetchAndRenderArtists(e.target.checked);
      });
    }

    // SQL Showcase buttons
    document.querySelectorAll('.sql-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const endpoint = e.target.getAttribute('data-endpoint');
        try {
          const res = await fetch(`${API_BASE}/sql/${endpoint}`);
          const data = await res.json();
          const resultsDiv = document.getElementById('sql-results');
          
          if (!data || data.length === 0) {
            resultsDiv.innerHTML = '<p style="color: var(--text-muted);">No results found.</p>';
            return;
          }

          // Create a dynamic table from JSON data
          let html = '<table class="data-table" style="width: 100%; border-collapse: collapse;"><thead><tr>';
          const keys = Object.keys(data[0]);
          keys.forEach(k => { html += `<th style="text-align: left; padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.1);">${k}</th>`; });
          html += '</tr></thead><tbody>';
          
          data.forEach(row => {
            html += '<tr>';
            keys.forEach(k => { html += `<td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">${row[k] !== null ? row[k] : 'NULL'}</td>`; });
            html += '</tr>';
          });
          html += '</tbody></table>';
          
          resultsDiv.innerHTML = html;
        } catch (err) {
          console.error(err);
        }
      });
    });

    // --- Feedback helper ---
    function showFeedback(elId, message, isError = false) {
      const el = document.getElementById(elId);
      if (!el) return;
      el.textContent = message;
      el.style.color = isError ? '#f87171' : '#86efac';
      el.style.marginTop = '10px';
      el.style.fontSize = '0.875rem';
      el.style.fontWeight = '500';
      // Auto-clear after 4 seconds
      clearTimeout(el._timer);
      el._timer = setTimeout(() => { el.textContent = ''; }, 4000);
    }

    // Admin forms
    document.getElementById('form-insert-song')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      const body = {
        title: document.getElementById('insert-title').value.trim(),
        artist: document.getElementById('insert-artist').value.trim(),
        genre: document.getElementById('insert-genre').value.trim(),
        mood: document.getElementById('insert-mood').value.trim(),
        duration: document.getElementById('insert-duration').value
      };
      btn.textContent = 'Adding...';
      btn.disabled = true;
      try {
        const res = await fetch(`${API_BASE}/songs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to add song.');
        showFeedback('msg-insert-song', `✓ ${data.message}`);
        e.target.reset();
        fetchAndRenderStats();
        fetchAndRenderSongs();
        fetchAndRenderGenreStats();
      } catch (err) {
        showFeedback('msg-insert-song', `✗ ${err.message}`, true);
      } finally {
        btn.textContent = 'Add Song';
        btn.disabled = false;
      }
    });

    document.getElementById('form-update-user')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      const name = document.getElementById('update-user-name').value.trim();
      const taste_tags = document.getElementById('update-taste-tags').value.trim();
      btn.textContent = 'Updating...';
      btn.disabled = true;
      try {
        const res = await fetch(`${API_BASE}/users/by-name/${encodeURIComponent(name)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taste_tags })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update user.');
        showFeedback('msg-update-user', `✓ ${data.message}`);
        e.target.reset();
        fetchAndRenderCommunity();
      } catch (err) {
        showFeedback('msg-update-user', `✗ ${err.message}`, true);
      } finally {
        btn.textContent = 'Update';
        btn.disabled = false;
      }
    });

    document.getElementById('form-delete-song')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      const title = document.getElementById('delete-song-title').value.trim();
      btn.textContent = 'Deleting...';
      btn.disabled = true;
      try {
        const res = await fetch(`${API_BASE}/songs/${encodeURIComponent(title)}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete song.');
        showFeedback('msg-delete-song', `✓ ${data.message}`);
        e.target.reset();
        fetchAndRenderStats();
        fetchAndRenderSongs();
        fetchAndRenderGenreStats();
      } catch (err) {
        showFeedback('msg-delete-song', `✗ ${err.message}`, true);
      } finally {
        btn.textContent = 'Delete Song';
        btn.disabled = false;
      }
    });
  }

  // Initialization
  fetchAndRenderStats();
  fetchAndRenderSongs();
  fetchAndRenderArtists();
  fetchAndRenderCommunity();
  fetchAndRenderPlaylists();
  fetchAndRenderEvents();
  fetchAndRenderActivity();
  fetchAndRenderReviews();
  fetchAndRenderGenreStats();
  setupInteractions();

  // Auto refresh activity log every 30 seconds
  setInterval(fetchAndRenderActivity, 30000);
});
