const { pool, table, transaction } = require("../db/pool");

const users = table("users");
const posts = table("posts");
const comments = table("comments");
const friendships = table("friendships");
const friendRequests = table("friend_requests");

function publicUser(row) {
  if (!row) return null;
  return {
    _id: String(row.id),
    email: row.email,
    name: row.name,
    comments: (row.comment_ids || []).map(String),
    friends_list: (row.friend_ids || []).map(String),
    image_url: row.image_url,
    posts: (row.post_ids || []).map(String),
    lives: row.lives || "",
    studies_at: row.studies_at || "",
    job: row.job || "",
    bio: row.bio || "",
  };
}

const userSelect = `
  SELECT u.*,
    ARRAY(SELECT c.id FROM ${comments} c WHERE c.author_id = u.id ORDER BY c.created_at) AS comment_ids,
    ARRAY(SELECT p.id FROM ${posts} p WHERE p.author_id = u.id ORDER BY p.created_at DESC) AS post_ids,
    ARRAY(
      SELECT CASE WHEN f.user_low_id = u.id THEN f.user_high_id ELSE f.user_low_id END
      FROM ${friendships} f
      WHERE f.user_low_id = u.id OR f.user_high_id = u.id
      ORDER BY f.created_at
    ) AS friend_ids
  FROM ${users} u`;

async function findById(id, client = pool) {
  const { rows } = await client.query(`${userSelect} WHERE u.id = $1`, [id]);
  return publicUser(rows[0]);
}

async function findByEmailForAuth(email, client = pool) {
  const { rows } = await client.query(`${userSelect} WHERE lower(u.email) = lower($1)`, [email]);
  if (!rows[0]) return null;
  return { ...publicUser(rows[0]), password_hash: rows[0].password_hash };
}

async function findByFacebookId(facebookId, client = pool) {
  const { rows } = await client.query(`${userSelect} WHERE u.facebook_id = $1`, [facebookId]);
  return publicUser(rows[0]);
}

async function create(data, client = pool) {
  const { rows } = await client.query(`
    INSERT INTO ${users} (email, password_hash, name, image_url, lives, studies_at, job, facebook_id, bio)
    VALUES (lower($1), $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
  `, [data.email, data.password_hash || null, data.name, data.image_url || null, data.lives || "", data.studies_at || "", data.job || "", data.facebook_id || null, data.bio || ""]);
  return findById(rows[0].id, client);
}

async function update(id, fields, client = pool) {
  const allowed = new Map([
    ["name", "name"], ["image_url", "image_url"], ["lives", "lives"],
    ["studies_at", "studies_at"], ["job", "job"], ["bio", "bio"],
  ]);
  const entries = Object.entries(fields).filter(([key]) => allowed.has(key));
  if (!entries.length) return findById(id, client);
  const values = entries.map(([, value]) => value);
  const assignments = entries.map(([key], index) => `${allowed.get(key)} = $${index + 2}`);
  const result = await client.query(`UPDATE ${users} SET ${assignments.join(", ")}, updated_at = now() WHERE id = $1`, [id, ...values]);
  return result.rowCount ? findById(id, client) : null;
}

async function existsByEmail(email, client = pool) {
  const { rowCount } = await client.query(`SELECT 1 FROM ${users} WHERE lower(email) = lower($1)`, [email]);
  return rowCount > 0;
}

async function addFriend(userId, friendId, client = pool) {
  const [low, high] = [String(userId), String(friendId)].sort();
  await client.query(`INSERT INTO ${friendships} (user_low_id, user_high_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [low, high]);
}

async function removeFriend(userId, friendId) {
  return transaction(async (client) => {
    const [low, high] = [String(userId), String(friendId)].sort();
    const result = await client.query(`DELETE FROM ${friendships} WHERE user_low_id = $1 AND user_high_id = $2`, [low, high]);
    await client.query(`DELETE FROM ${friendRequests} WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1)`, [userId, friendId]);
    return result.rowCount > 0;
  });
}

async function deleteUser(id, client = pool) {
  const result = await client.query(`DELETE FROM ${users} WHERE id = $1`, [id]);
  return result.rowCount > 0;
}

async function listByIds(ids, client = pool) {
  if (!ids.length) return [];
  const { rows } = await client.query(`${userSelect} WHERE u.id = ANY($1::uuid[])`, [ids]);
  return rows.map(publicUser);
}

module.exports = {
  addFriend,
  create,
  deleteUser,
  existsByEmail,
  findByEmailForAuth,
  findByFacebookId,
  findById,
  listByIds,
  publicUser,
  removeFriend,
  update,
};
