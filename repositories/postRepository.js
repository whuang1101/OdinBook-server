const { pool, table } = require("../db/pool");
const userRepository = require("./userRepository");

const posts = table("posts");
const comments = table("comments");
const likes = table("post_likes");

function buildCommentTree(commentRows, usersById) {
  const commentsById = new Map(commentRows.map((comment) => [String(comment.id), {
    _id: String(comment.id),
    date: comment.created_at,
    text: comment.text,
    image_url: comment.image_url,
    comments: [],
    author: usersById.get(String(comment.author_id)),
    post: String(comment.post_id),
    parent_comment_id: comment.parent_comment_id ? String(comment.parent_comment_id) : null,
    edited: comment.edited,
  }]));
  const roots = [];
  for (const comment of commentsById.values()) {
    const parent = comment.parent_comment_id && commentsById.get(comment.parent_comment_id);
    if (parent) parent.comments.push(comment);
    else roots.push(comment);
  }
  return roots;
}

async function hydrate(postRows, client = pool) {
  if (!postRows.length) return [];
  const postIds = postRows.map(({ id }) => id);
  const authorIds = [...new Set(postRows.map(({ author_id }) => String(author_id)))];
  const [{ rows: likeRows }, { rows: commentRows }, authors] = await Promise.all([
    client.query(`SELECT post_id, user_id FROM ${likes} WHERE post_id = ANY($1::uuid[]) ORDER BY created_at`, [postIds]),
    client.query(`SELECT * FROM ${comments} WHERE post_id = ANY($1::uuid[]) ORDER BY created_at`, [postIds]),
    userRepository.listByIds(authorIds, client),
  ]);
  const commentAuthorIds = [...new Set(commentRows.map(({ author_id }) => String(author_id)))];
  const commentAuthors = await userRepository.listByIds(commentAuthorIds, client);
  const usersById = new Map([...authors, ...commentAuthors].map((user) => [user._id, user]));

  return postRows.map((post) => ({
    _id: String(post.id),
    date: post.created_at,
    text: post.text,
    image_url: post.image_url,
    likes: likeRows.filter((like) => String(like.post_id) === String(post.id)).map((like) => String(like.user_id)),
    comments: buildCommentTree(
      commentRows.filter((comment) => String(comment.post_id) === String(post.id)),
      usersById,
    ),
    comment_count: commentRows.filter((comment) => String(comment.post_id) === String(post.id)).length,
    public: post.is_public,
    author: usersById.get(String(post.author_id)),
    edited: post.edited,
  }));
}

async function create(authorId, text, client = pool) {
  const { rows } = await client.query(`INSERT INTO ${posts} (author_id, text) VALUES ($1, $2) RETURNING *`, [authorId, text]);
  return rows[0];
}

async function findById(id, client = pool) {
  const { rows } = await client.query(`SELECT * FROM ${posts} WHERE id = $1`, [id]);
  return (await hydrate(rows, client))[0] || null;
}

async function findRawById(id, client = pool) {
  const { rows } = await client.query(`SELECT * FROM ${posts} WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function listFeed(userId, { limit, skip }, client = pool) {
  const { rows } = await client.query(`
    SELECT p.* FROM ${posts} p
    WHERE p.author_id = $1 OR p.author_id IN (
      SELECT CASE WHEN f.user_low_id = $1 THEN f.user_high_id ELSE f.user_low_id END
      FROM ${table("friendships")} f WHERE f.user_low_id = $1 OR f.user_high_id = $1
    )
    ORDER BY p.created_at DESC LIMIT $2 OFFSET $3
  `, [userId, limit, skip]);
  return hydrate(rows, client);
}

async function listByAuthor(authorId, { limit, skip }, client = pool) {
  const { rows } = await client.query(`SELECT * FROM ${posts} WHERE author_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`, [authorId, limit, skip]);
  return hydrate(rows, client);
}

async function setLike(postId, userId, liked, client = pool) {
  const result = liked
    ? await client.query(`INSERT INTO ${likes} (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [postId, userId])
    : await client.query(`DELETE FROM ${likes} WHERE post_id = $1 AND user_id = $2`, [postId, userId]);
  return liked ? result.rowCount >= 0 : result.rowCount >= 0;
}

async function update(id, text, client = pool) {
  const result = await client.query(`UPDATE ${posts} SET text = $2, edited = true, updated_at = now() WHERE id = $1`, [id, text]);
  return result.rowCount > 0;
}

async function remove(id, client = pool) {
  const result = await client.query(`DELETE FROM ${posts} WHERE id = $1`, [id]);
  return result.rowCount > 0;
}

module.exports = { buildCommentTree, create, findById, findRawById, listByAuthor, listFeed, remove, setLike, update };
