-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

-- 2. Chats table (supports both 1:1 and Group chats)
CREATE TABLE IF NOT EXISTS chats (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  is_group BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Join table linking users to chats
CREATE TABLE IF NOT EXISTS chat_members (
  chat_id INT REFERENCES chats(id) ON DELETE CASCADE,
  user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (chat_id, user_id)
);

-- 4. Insert 3 dummy users so we can immediately test 1:1 and Group chats
INSERT INTO users (id, name) VALUES 
  ('user_1', 'Alice'), 
  ('user_2', 'Bob'), 
  ('user_3', 'Charlie')
ON CONFLICT (id) DO NOTHING;
