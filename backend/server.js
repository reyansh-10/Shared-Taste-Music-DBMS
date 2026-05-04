import express from 'express';
import cors from 'cors';
import db from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

// Prevent Node.js 22 from exiting on unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
});

// GET all songs
app.get('/api/songs', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM Songs');
  res.json(rows);
});

// GET songs by mood
app.get('/api/songs/mood/:mood', async (req, res) => {
  const [rows] = await db.query(
    'SELECT * FROM Songs WHERE mood = ?', [req.params.mood]
  );
  res.json(rows);
});

// GET songs search
app.get('/api/songs/search', async (req, res) => {
  const keyword = `%${req.query.q}%`;
  const [rows] = await db.query(
    'SELECT * FROM Songs WHERE title LIKE ? OR artist LIKE ?', [keyword, keyword]
  );
  res.json(rows);
});

// GET all users sorted by match score
app.get('/api/users', async (req, res) => {
  const [rows] = await db.query(
    'SELECT * FROM Users ORDER BY match_score DESC'
  );
  res.json(rows);
});

// GET playlists
app.get('/api/playlists', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM Playlists');
  res.json(rows);
});

// GET events
app.get('/api/events', async (req, res) => {
  const [rows] = await db.query(`
    SELECT *, DATE_FORMAT(event_date, '%b %d, %Y') as formatted_date
    FROM Events
    WHERE event_date > CURDATE()
    ORDER BY event_date ASC
  `);
  res.json(rows);
});

// POST like a song (fires the Trigger!)
app.post('/api/like', async (req, res) => {
  const { user_id, song_id } = req.body;
  await db.query(
    'INSERT INTO Liked_Songs (user_id, song_id) VALUES (?, ?)',
    [user_id, song_id]
  );
  res.json({ message: 'Song liked!' });
});

// GET the VIEW
app.get('/api/taste-view', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM User_Music_Taste');
  res.json(rows);
});

// GET activity log
app.get('/api/activity', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.name, al.action, 
      TIMESTAMPDIFF(MINUTE, al.logged_at, NOW()) as minutes_ago
      FROM Activity_Log al
      JOIN Users u ON al.user_id = u.user_id
      ORDER BY al.logged_at DESC LIMIT 10`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET stats
app.get('/api/stats', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
      (SELECT COUNT(*) FROM Songs) as total_songs,
      (SELECT COUNT(*) FROM Users) as total_users,
      (SELECT COUNT(*) FROM Events WHERE event_date > CURDATE()) as upcoming_events,
      (SELECT AVG(match_score) FROM Users) as avg_match
    `);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN DML OPERATIONS
// POST a new song
app.post('/api/songs', async (req, res) => {
  try {
    const { title, artist, genre, mood, duration } = req.body;
    if (!title || !artist || !genre || !mood || !duration) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    const [result] = await db.query(
      'INSERT INTO Songs (title, artist, genre, mood, duration) VALUES (?, ?, ?, ?, ?)',
      [title, artist, genre, mood, duration]
    );
    res.json({ message: `Song "${title}" added successfully!`, song_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update user taste tags by ID
app.put('/api/users/:id', async (req, res) => {
  try {
    const { taste_tags } = req.body;
    const [result] = await db.query(
      'UPDATE Users SET taste_tags = ? WHERE user_id = ?',
      [taste_tags, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User ID not found.' });
    }
    res.json({ message: 'User updated!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update user taste tags by name
app.put('/api/users/by-name/:name', async (req, res) => {
  try {
    const { taste_tags } = req.body;
    const [result] = await db.query(
      'UPDATE Users SET taste_tags = ? WHERE name = ?',
      [taste_tags, req.params.name]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: `No user found with name "${req.params.name}".` });
    }
    res.json({ message: `User "${req.params.name}" updated successfully!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a song by title
app.delete('/api/songs/:title', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM Songs WHERE title = ?', [req.params.title]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: `No song found with title "${req.params.title}".` });
    }
    res.json({ message: `Song "${req.params.title}" deleted successfully!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET artists
app.get('/api/artists', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Artists ORDER BY distance_km ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET nearby artists
app.get('/api/artists/nearby', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Artists WHERE distance_km < 5 ORDER BY distance_km ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET reviews
app.get('/api/reviews', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT r.review_text, r.rating, u.name as reviewer, s.title as song
      FROM Reviews r
      JOIN Users u ON r.user_id = u.user_id
      JOIN Songs s ON r.song_id = s.song_id
      ORDER BY r.created_at DESC
      LIMIT 5
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET genre stats
app.get('/api/genres/stats', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT g.name, COUNT(s.song_id) as total_songs, 
      AVG(r.rating) as avg_rating
      FROM Genres g
      LEFT JOIN Songs s ON g.name = s.genre
      LEFT JOIN Reviews r ON s.song_id = r.song_id
      GROUP BY g.name
      ORDER BY total_songs DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ADVANCED SQL DEMO ENDPOINTS ---
app.get('/api/sql/having', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT genre, COUNT(*) as total FROM Songs GROUP BY genre HAVING COUNT(*) > 1');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sql/orderby', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Songs ORDER BY genre ASC, duration DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sql/between', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Songs WHERE duration BETWEEN 200 AND 300');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sql/in', async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM Songs WHERE mood IN ('Relaxing', 'Calm')");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sql/isnull', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Users WHERE taste_tags IS NULL');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sql/case', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT name, match_score,
      CASE 
        WHEN match_score >= 90 THEN 'Perfect Match'
        WHEN match_score >= 80 THEN 'Great Match'
        WHEN match_score >= 70 THEN 'Good Match'
        ELSE 'Decent Match'
      END as match_label
      FROM Users
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server — test DB connection first
async function init() {
  try {
    await db.query('SELECT 1');
    console.log('✅ Database connection verified.');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('   Check your .env credentials and make sure MySQL is running.');
    // Keep server running even if DB is down, so routes return proper 500 errors
  }
  app.listen(3001, () => console.log('✅ Backend running on http://localhost:3001'));
}

init();