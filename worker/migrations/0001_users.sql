-- One row per GitHub account that signed up on octave.run.
--
-- github_id is GitHub's numeric id, which never changes; login (the username)
-- can be renamed, so it is stored but not used as the key. email is the
-- account's primary address if GitHub has verified it, otherwise the first
-- verified one, otherwise null. No GitHub token is stored.

CREATE TABLE users (
  github_id INTEGER PRIMARY KEY,
  login TEXT NOT NULL,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  bio TEXT,
  company TEXT,
  location TEXT,
  blog TEXT,
  followers INTEGER,
  public_repos INTEGER,
  github_created_at TEXT,
  -- Consent to be emailed about Octave, given on the sign-up page. Once given it
  -- stays given until withdrawn by request; signing in again does not clear it.
  updates_opt_in INTEGER NOT NULL DEFAULT 0,
  updates_opt_in_at TEXT,
  created_at TEXT NOT NULL,
  last_signed_in_at TEXT NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
