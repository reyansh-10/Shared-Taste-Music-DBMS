import db from './db.js';

async function seed() {
  try {
    console.log('🚀 Starting Database Setup...');

    // 1. Create Tables
    console.log('--- Creating Tables ---');
    
    await db.query(`CREATE TABLE IF NOT EXISTS Users (
      user_id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      taste_tags VARCHAR(255),
      match_score INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await db.query(`CREATE TABLE IF NOT EXISTS Songs (
      song_id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(150) NOT NULL,
      artist VARCHAR(100) NOT NULL,
      genre VARCHAR(50),
      mood VARCHAR(50),
      duration INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await db.query(`CREATE TABLE IF NOT EXISTS Artists (
      artist_id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      genre VARCHAR(50),
      bio VARCHAR(255),
      location VARCHAR(100),
      distance_km DECIMAL(4,1),
      monthly_listeners INT DEFAULT 0,
      image_url VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await db.query(`CREATE TABLE IF NOT EXISTS Genres (
      genre_id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      description VARCHAR(255),
      mood_tag VARCHAR(50)
    )`);

    await db.query(`CREATE TABLE IF NOT EXISTS Playlists (
      playlist_id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      collaborators INT DEFAULT 1,
      last_updated VARCHAR(50) DEFAULT '2 hours ago',
      cover_image VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await db.query(`CREATE TABLE IF NOT EXISTS Reviews (
      review_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      song_id INT,
      rating INT CHECK (rating BETWEEN 1 AND 5),
      review_text VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (song_id) REFERENCES Songs(song_id) ON DELETE CASCADE
    )`);

    await db.query(`CREATE TABLE IF NOT EXISTS Events (
      event_id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(150) NOT NULL,
      location VARCHAR(150) NOT NULL,
      event_date DATE NOT NULL,
      event_time TIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await db.query(`CREATE TABLE IF NOT EXISTS Liked_Songs (
      like_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      song_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (song_id) REFERENCES Songs(song_id) ON DELETE CASCADE
    )`);

    await db.query(`CREATE TABLE IF NOT EXISTS Activity_Log (
      log_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      action VARCHAR(255) NOT NULL,
      logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
    )`);

    // 2. Create View
    console.log('--- Creating Views ---');
    await db.query(`CREATE OR REPLACE VIEW User_Music_Taste AS
      SELECT u.user_id, u.name, u.taste_tags, u.match_score, COUNT(ls.song_id) as total_likes
      FROM Users u
      LEFT JOIN Liked_Songs ls ON u.user_id = ls.user_id
      GROUP BY u.user_id`);

    // 3. Insert Seed Data
    console.log('--- Inserting Dummy Data ---');

    await db.query(`INSERT IGNORE INTO Users (name, email, taste_tags, match_score) VALUES
      ('Aarav Patel', 'aarav@example.com', 'Hip Hop, R&B', 88),
      ('Priya Sharma', 'priya@example.com', 'Classical, Pop', 95),
      ('Rahul Verma', 'rahul@example.com', 'Metal, Punk', 62),
      ('Sneha Rao', 'sneha@example.com', 'K-Pop, Pop', 75),
      ('Vikram Singh', 'vikram@example.com', 'Reggae, Blues', 81)`);

    await db.query(`INSERT IGNORE INTO Songs (title, artist, genre, mood, duration) VALUES
      ('Tum Hi Ho', 'Arijit Singh', 'Bollywood', 'Melancholic', 262),
      ('Blinding Lights', 'The Weeknd', 'Synthwave', 'Upbeat', 200),
      ('Gods Plan', 'Drake', 'Hip Hop', 'Relaxing', 198),
      ('Levitating', 'Dua Lipa', 'Pop', 'Upbeat', 203),
      ('So What', 'Miles Davis', 'Jazz', 'Relaxing', 562)`);

    await db.query(`INSERT IGNORE INTO Genres (name, description, mood_tag) VALUES
      ('Jazz', 'Complex harmonies and improvisation.', 'Relaxing'),
      ('Synthwave', 'Nostalgic 80s electronic beats.', 'Upbeat'),
      ('Hip Hop', 'Rhythmic vocal style with heavy beats.', 'Energetic'),
      ('Pop', 'Modern popular music with catchy melodies.', 'Upbeat'),
      ('Bollywood', 'Soulful and energetic film music.', 'Energetic')`);

    await db.query(`INSERT IGNORE INTO Artists (name, genre, bio, location, distance_km, monthly_listeners, image_url) VALUES
      ('The Velvet Chords', 'Jazz', 'Mumbai-based jazz trio.', 'Mumbai', 2.5, 4500, 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400'),
      ('Echo & Rust', 'Indie Folk', 'Acoustic duo with rustic vibes.', 'Delhi', 8.1, 12000, 'https://images.unsplash.com/photo-1459749411177-042180ce673f?w=400'),
      ('Neon Pulse', 'Electronic', 'Synthwave producer.', 'Bangalore', 1.2, 89000, 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400'),
      ('Sarah Lin', 'Acoustic', 'Singer-songwriter.', 'Pune', 3.0, 5000, 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=400')`);

    await db.query(`INSERT IGNORE INTO Playlists (name, collaborators, cover_image) VALUES
      ('Midnight Drive', 4, 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=400'),
      ('Workout Beats', 2, 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400'),
      ('Late Night Lo-fi', 5, 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400')`);

    await db.query(`INSERT IGNORE INTO Events (title, location, event_date, event_time) VALUES
      ('Vinyl Night', 'Blue Frog Cafe', DATE_ADD(CURDATE(), INTERVAL 10 DAY), '20:00:00'),
      ('Open Mic', 'The Local Pub', DATE_ADD(CURDATE(), INTERVAL 3 DAY), '19:30:00')`);

    console.log('✅ Database setup and seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Setup failed:', err);
    process.exit(1);
  }
}

seed();
