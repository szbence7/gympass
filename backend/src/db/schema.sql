CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    , is_blocked INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS staff_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'STAFF',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
CREATE TABLE IF NOT EXISTS pass_types (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      duration_days INTEGER,
      total_entries INTEGER,
      price REAL NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
CREATE TABLE IF NOT EXISTS user_passes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      pass_type_id TEXT NOT NULL REFERENCES pass_types(id),
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      purchased_at INTEGER NOT NULL,
      valid_from INTEGER NOT NULL,
      valid_until INTEGER,
      total_entries INTEGER,
      remaining_entries INTEGER,
      wallet_serial_number TEXT NOT NULL UNIQUE,
      qr_token_id TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
CREATE INDEX idx_user_passes_user_id ON user_passes(user_id);
CREATE TABLE IF NOT EXISTS pass_tokens (
      id TEXT PRIMARY KEY,
      user_pass_id TEXT NOT NULL REFERENCES user_passes(id),
      token TEXT NOT NULL UNIQUE,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
CREATE INDEX idx_pass_tokens_token ON pass_tokens(token);
CREATE TABLE IF NOT EXISTS pass_usage_logs (
      id TEXT PRIMARY KEY,
      user_pass_id TEXT NOT NULL REFERENCES user_passes(id),
      staff_user_id TEXT REFERENCES staff_users(id),
      action TEXT NOT NULL,
      consumed_entries INTEGER NOT NULL DEFAULT 0,
      metadata TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
CREATE INDEX idx_pass_usage_logs_user_pass_id ON pass_usage_logs(user_pass_id);
