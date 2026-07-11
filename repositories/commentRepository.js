const { pool, table } = require("../db/pool");

const comments = table("comments");

function view(row) {
  return row ? {
    _id: String(row.id),
    date: row.created_at,
    text: row.text,
    image_url: row.image_url,
    comments: [],
    author: String(row.author_id),
    post: String(row.post_id),
    parent_comment_id: row.parent_comment_id ? String(row.parent_comment_id) : null,
    edited: row.edited,
  } : null;
}

async function create({ postId, authorId, text, parentCommentId = null }, client = pool) {
  const { rows } = await client.query(`
    INSERT INTO ${comments} (post_id, author_id, text, parent_comment_id)
    VALUES ($1, $2, $3, $4) RETURNING *
  `, [postId, authorId, text, parentCommentId]);
  return view(rows[0]);
}

async function findById(id, client = pool) {
  const { rows } = await client.query(`SELECT * FROM ${comments} WHERE id = $1`, [id]);
  return view(rows[0]);
}

async function update(id, text, client = pool) {
  const result = await client.query(`UPDATE ${comments} SET text = $2, edited = true, updated_at = now() WHERE id = $1`, [id, text]);
  return result.rowCount > 0;
}

async function remove(id, client = pool) {
  const result = await client.query(`DELETE FROM ${comments} WHERE id = $1`, [id]);
  return result.rowCount > 0;
}

module.exports = { create, findById, remove, update };
