const { pool, table, transaction } = require("../db/pool");
const userRepository = require("./userRepository");

const users = table("users");
const friendships = table("friendships");
const requests = table("friend_requests");

function requestView(row, people) {
  return {
    _id: String(row.id),
    sender: people.get(String(row.sender_id)) || String(row.sender_id),
    recipient: people.get(String(row.recipient_id)) || String(row.recipient_id),
    status: row.status,
    date: row.created_at,
  };
}

async function listSuggestions(userId, client = pool) {
  const { rows } = await client.query(`
    SELECT u.id FROM ${users} u
    WHERE u.id <> $1
      AND NOT EXISTS (
        SELECT 1 FROM ${friendships} f
        WHERE (f.user_low_id = LEAST(u.id, $1::uuid) AND f.user_high_id = GREATEST(u.id, $1::uuid))
      )
      AND NOT EXISTS (
        SELECT 1 FROM ${requests} r
        WHERE (r.sender_id = u.id AND r.recipient_id = $1) OR (r.sender_id = $1 AND r.recipient_id = u.id)
      )
    ORDER BY u.created_at DESC LIMIT 50
  `, [userId]);
  return userRepository.listByIds(rows.map(({ id }) => id), client);
}

async function findBetween(senderId, recipientId, client = pool) {
  const { rows } = await client.query(`SELECT * FROM ${requests} WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1)`, [senderId, recipientId]);
  return rows[0] || null;
}

async function create(senderId, recipientId, client = pool) {
  const { rows } = await client.query(`INSERT INTO ${requests} (sender_id, recipient_id) VALUES ($1, $2) RETURNING *`, [senderId, recipientId]);
  return rows[0];
}

async function removeBetween(senderId, recipientId, client = pool) {
  const result = await client.query(`DELETE FROM ${requests} WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1)`, [senderId, recipientId]);
  return result.rowCount > 0;
}

async function findById(id, client = pool) {
  const { rows } = await client.query(`SELECT * FROM ${requests} WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function remove(id, client = pool) {
  const result = await client.query(`DELETE FROM ${requests} WHERE id = $1`, [id]);
  return result.rowCount > 0;
}

async function listForUser(userId, direction, client = pool) {
  const column = direction === "incoming" ? "recipient_id" : "sender_id";
  const { rows } = await client.query(`SELECT * FROM ${requests} WHERE ${column} = $1 AND status = 2 ORDER BY created_at DESC`, [userId]);
  const people = await userRepository.listByIds([...new Set(rows.flatMap((row) => [String(row.sender_id), String(row.recipient_id)]))], client);
  const peopleById = new Map(people.map((person) => [person._id, person]));
  return rows.map((row) => requestView(row, peopleById));
}

async function accept(id) {
  return transaction(async (client) => {
    const request = await findById(id, client);
    if (!request) return null;
    const [low, high] = [String(request.sender_id), String(request.recipient_id)].sort();
    await client.query(`INSERT INTO ${friendships} (user_low_id, user_high_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [low, high]);
    await client.query(`UPDATE ${requests} SET status = 1, updated_at = now() WHERE id = $1`, [id]);
    return request;
  });
}

async function listFriends(userId, client = pool) {
  const { rows } = await client.query(`
    SELECT CASE WHEN user_low_id = $1 THEN user_high_id ELSE user_low_id END AS id
    FROM ${friendships} WHERE user_low_id = $1 OR user_high_id = $1 ORDER BY created_at
  `, [userId]);
  return userRepository.listByIds(rows.map(({ id }) => id), client);
}

module.exports = { accept, create, findBetween, findById, listForUser, listFriends, listSuggestions, remove, removeBetween };
