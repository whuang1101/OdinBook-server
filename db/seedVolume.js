require("dotenv").config();

const { getPublicApiUrl } = require("../config/env");
const { pool, table, transaction } = require("./pool");
const { migrate } = require("./migrate");
const { ids } = require("./seed");

const usersTable = table("users");
const postsTable = table("posts");
const commentsTable = table("comments");
const likesTable = table("post_likes");
const friendshipsTable = table("friendships");
const requestsTable = table("friend_requests");

const firstNames = ["Avery", "Jordan", "Riley", "Morgan", "Cameron", "Quinn", "Sage", "Rowan", "Emery", "Drew"];
const lastNames = ["Rivera", "Kim", "Bennett", "Okafor", "Singh", "Martinez", "Nguyen", "Brooks", "Foster", "Shah"];
const cities = ["New York, NY", "Austin, TX", "Seattle, WA", "Atlanta, GA", "Chicago, IL"];
const roles = ["Product Designer", "Frontend Engineer", "Photographer", "Researcher", "Creative Developer"];
const postCopy = [
  "Sharing a small win from today: the team made a complicated workflow feel genuinely simple.",
  "What is one creative habit that has made your week better?",
  "Built a tiny prototype this morning and learned more in an hour than I did from a week of planning.",
  "Accessible defaults help everyone, not just the people we initially design for.",
  "Sometimes a change of scenery is the whole reset you need.",
];

function deterministicUuid(namespace, index) {
  const number = index.toString(16);
  return `${namespace}${number.padStart(6, "0")}-0000-4000-8000-${number.padStart(12, "0")}`;
}

function orderedPair(left, right) {
  return [String(left), String(right)].sort();
}

async function seedVolume() {
  await migrate();
  const apiUrl = getPublicApiUrl();
  const avatars = [
    "williamstown-1057646.jpg",
    "1694639484961pexels-pixabay-220453.jpg",
    "1694639507987charlesdeluvio-Mv9hjnEUHR4-unsplash.jpg",
    "facebookanon.jpg",
    "anonymous.jpeg",
  ];
  const testUsers = Array.from({ length: 10 }, (_, index) => {
    const ordinal = index + 1;
    return {
      id: deterministicUuid("90", ordinal),
      email: `loadtest+${String(ordinal).padStart(2, "0")}@odinbook.local`,
      name: `${firstNames[index]} ${lastNames[index]}`,
      city: cities[index % cities.length],
      role: roles[index % roles.length],
      avatar: `${apiUrl}/uploads/${encodeURIComponent(avatars[index % avatars.length])}`,
    };
  });

  await transaction(async (client) => {
    // This utility owns only loadtest-tagged users. Cascades remove its previous
    // posts, comments, likes, friendships, and requests before rebuilding 50 rows.
    await client.query(`DELETE FROM ${usersTable} WHERE email LIKE 'loadtest+%@odinbook.local'`);

    for (const [index, user] of testUsers.entries()) {
      await client.query(`
        INSERT INTO ${usersTable} (id, email, name, image_url, lives, studies_at, job, bio)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        user.id,
        user.email,
        user.name,
        user.avatar,
        user.city,
        index % 2 ? "Odin Institute of Design" : "Northstar University",
        user.role,
        `Load-test profile ${index + 1}. Curious about craft, community, and learning in public.`,
      ]);
    }

    for (const [index, user] of testUsers.entries()) {
      const postId = deterministicUuid("a0", index + 1);
      await client.query(`
        INSERT INTO ${postsTable} (id, author_id, text, created_at)
        VALUES ($1, $2, $3, now() - ($4::int * interval '11 minutes'))
      `, [postId, user.id, `${postCopy[index % postCopy.length]} — ${user.name}`, index + 1]);

      const rootId = deterministicUuid("b0", (index * 2) + 1);
      const replyId = deterministicUuid("b0", (index * 2) + 2);
      const commenter = testUsers[(index + 1) % testUsers.length];
      await client.query(`
        INSERT INTO ${commentsTable} (id, post_id, author_id, text, created_at)
        VALUES ($1, $2, $3, $4, now() - ($5::int * interval '11 minutes') + interval '1 minute')
      `, [rootId, postId, commenter.id, "This really resonates. Thanks for sharing it with the circle.", index + 1]);
      await client.query(`
        INSERT INTO ${commentsTable} (id, post_id, author_id, text, parent_comment_id, created_at)
        VALUES ($1, $2, $3, $4, $5, now() - ($6::int * interval '11 minutes') + interval '2 minutes')
      `, [replyId, postId, user.id, `Appreciate that, ${commenter.name.split(" ")[0]}.`, rootId, index + 1]);

      if (index < 5) {
        const liker = testUsers[(index + 2) % testUsers.length];
        await client.query(`INSERT INTO ${likesTable} (post_id, user_id) VALUES ($1, $2)`, [postId, liker.id]);
      }
    }

    for (const user of testUsers.slice(0, 3)) {
      const [low, high] = orderedPair(ids.joe, user.id);
      await client.query(`INSERT INTO ${friendshipsTable} (user_low_id, user_high_id) VALUES ($1, $2)`, [low, high]);
    }
    for (const [index, user] of testUsers.slice(8).entries()) {
      await client.query(`
        INSERT INTO ${requestsTable} (id, sender_id, recipient_id, status)
        VALUES ($1, $2, $3, 2)
      `, [deterministicUuid("c0", index + 1), user.id, ids.joe]);
    }
  });

  const { rows: [summary] } = await pool.query(`
    WITH test_users AS (SELECT id FROM ${usersTable} WHERE email LIKE 'loadtest+%@odinbook.local'),
    test_posts AS (SELECT id FROM ${postsTable} WHERE author_id IN (SELECT id FROM test_users))
    SELECT
      (SELECT count(*)::int FROM test_users) AS users,
      (SELECT count(*)::int FROM test_posts) AS posts,
      (SELECT count(*)::int FROM ${commentsTable} WHERE post_id IN (SELECT id FROM test_posts)) AS comments,
      (SELECT count(*)::int FROM ${likesTable} WHERE post_id IN (SELECT id FROM test_posts)) AS likes,
      (SELECT count(*)::int FROM ${friendshipsTable} WHERE user_low_id IN (SELECT id FROM test_users) OR user_high_id IN (SELECT id FROM test_users)) AS friendships,
      (SELECT count(*)::int FROM ${requestsTable} WHERE sender_id IN (SELECT id FROM test_users) OR recipient_id IN (SELECT id FROM test_users)) AS requests
  `);
  const total = Object.values(summary).reduce((sum, value) => sum + value, 0);
  console.log(`Seeded exactly ${total} volume-test rows: ${JSON.stringify(summary)}`);
  return { ...summary, total };
}

if (require.main === module) {
  seedVolume().then(() => pool.end()).catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
}

module.exports = { deterministicUuid, seedVolume };
