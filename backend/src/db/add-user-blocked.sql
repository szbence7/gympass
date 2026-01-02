-- Add isBlocked field to users table
-- Run this migration: sqlite3 gympass.db < src/db/add-user-blocked.sql

ALTER TABLE users ADD COLUMN is_blocked INTEGER NOT NULL DEFAULT 0;




