CREATE TABLE IF NOT EXISTS {{schema}}.schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS {{schema}}.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(254) NOT NULL,
  password_hash text,
  name varchar(160) NOT NULL,
  image_url text,
  lives varchar(120) NOT NULL DEFAULT '',
  studies_at varchar(160) NOT NULL DEFAULT '',
  job varchar(160) NOT NULL DEFAULT '',
  facebook_id text,
  bio varchar(500) NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_lowercase CHECK (email = lower(email))
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON {{schema}}.users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS users_facebook_id_unique ON {{schema}}.users (facebook_id) WHERE facebook_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS {{schema}}.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES {{schema}}.users(id) ON DELETE CASCADE,
  text varchar(5000) NOT NULL,
  image_url text,
  is_public boolean NOT NULL DEFAULT false,
  edited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS posts_author_created_idx ON {{schema}}.posts (author_id, created_at DESC);

CREATE TABLE IF NOT EXISTS {{schema}}.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES {{schema}}.posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES {{schema}}.users(id) ON DELETE CASCADE,
  text varchar(2000) NOT NULL,
  image_url text,
  edited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comments_post_created_idx ON {{schema}}.comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS comments_author_idx ON {{schema}}.comments (author_id);

CREATE TABLE IF NOT EXISTS {{schema}}.post_likes (
  post_id uuid NOT NULL REFERENCES {{schema}}.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES {{schema}}.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS {{schema}}.friendships (
  user_low_id uuid NOT NULL REFERENCES {{schema}}.users(id) ON DELETE CASCADE,
  user_high_id uuid NOT NULL REFERENCES {{schema}}.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_low_id, user_high_id),
  CONSTRAINT friendships_ordered CHECK (user_low_id::text < user_high_id::text)
);

CREATE TABLE IF NOT EXISTS {{schema}}.friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES {{schema}}.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES {{schema}}.users(id) ON DELETE CASCADE,
  status smallint NOT NULL DEFAULT 2 CHECK (status IN (1, 2)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friend_requests_not_self CHECK (sender_id <> recipient_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS friend_requests_pair_unique
  ON {{schema}}.friend_requests (LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id));
CREATE INDEX IF NOT EXISTS friend_requests_recipient_status_idx
  ON {{schema}}.friend_requests (recipient_id, status);
CREATE INDEX IF NOT EXISTS friend_requests_sender_status_idx
  ON {{schema}}.friend_requests (sender_id, status);

CREATE TABLE IF NOT EXISTS {{schema}}.user_sessions (
  sid varchar NOT NULL PRIMARY KEY,
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS user_sessions_expire_idx ON {{schema}}.user_sessions (expire);
