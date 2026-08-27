CREATE TABLE IF NOT EXISTS objects (
  id SERIAL PRIMARY KEY,
  kind VARCHAR(32) NOT NULL,
  name VARCHAR(160) NOT NULL,
  capacity INT DEFAULT 0,
  price INT DEFAULT 0,
  note TEXT,
  status VARCHAR(24) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guests (
  id SERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  phone VARCHAR(40),
  city VARCHAR(120),
  club_member BOOLEAN DEFAULT FALSE,
  club_until DATE,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  guest_id INT,
  guest_name VARCHAR(160),
  guest_phone VARCHAR(40),
  object_id INT,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  people INT DEFAULT 1,
  status VARCHAR(24) DEFAULT 'new',
  source VARCHAR(24) DEFAULT 'admin',
  total INT DEFAULT 0,
  paid INT DEFAULT 0,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  category VARCHAR(60),
  price INT DEFAULT 0,
  unit VARCHAR(40),
  note TEXT,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS trophies (
  id SERIAL PRIMARY KEY,
  species VARCHAR(120) NOT NULL,
  taken_on DATE,
  hunter VARCHAR(160),
  location VARCHAR(160),
  weight VARCHAR(60),
  note TEXT,
  photo_url TEXT
);

CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  distance_km INT,
  area_ha INT,
  species TEXT,
  note TEXT
);

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  author VARCHAR(160),
  city VARCHAR(120),
  rating INT DEFAULT 5,
  text TEXT,
  published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(date_from, date_to);
