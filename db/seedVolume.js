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
const cities = ["New York, NY", "Austin, TX", "Seattle, WA", "Atlanta, GA", "Chicago, IL", "Portland, OR"];
const roles = ["Product Designer", "Frontend Engineer", "Photographer", "Researcher", "Creative Developer", "Community Lead"];
const postCopy = [
  "Sharing a small win from today: the team made a complicated workflow feel genuinely simple.",
  "What is one creative habit that has made your week better? I am collecting ideas for a new routine.",
  "Built a tiny prototype this morning and learned more in an hour than I did from a week of planning.",
  "A good reminder that accessible defaults help everyone, not just the people we initially design for.",
  "Taking the long way home today. Sometimes a change of scenery is the whole reset you need.",
  "Notes from a thoughtful conversation about community, trust, and designing spaces people want to return to.",
];
const rootReplies = [
  "This really resonates. Thanks for sharing it with the circle.",
  "I have been thinking about the same thing this week.",
  "Would love to hear what you try next.",
  "This is the kind of update I come here for.",
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
    "1694639456049download (4).jpeg",
  ];
  const testUsers = Array.from({ length: 20 }, (_, index) => {
    const ordinal = index + 1;
    return {
      id: deterministicUuid("90", ordinal),
      email: `loadtest+${String(ordinal).padStart(2, "0")}@odinbook.local`,
      name: `${firstNames[index % firstNames.length]} ${lastNames[(index * 3) % lastNames.length]}`,
      city: cities[index % cities.length],
      role: roles[index % roles.length],
      avatar: `${apiUrl}/uploads/${encodeURIComponent(avatars[index % avatars.length])}`,
    };
  });

  await transaction(async (client) => {
    for (const [index, user] of testUsers.entries()) {
      await client.query(`
        INSERT INTO ${usersTable} (id, email, name, image_url, lives, studies_at, job, bio)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name,
          image_url = EXCLUDED.image_url, lives = EXCLUDED.lives, studies_at = EXCLUDED.studies_at,
          job = EXCLUDED.job, bio = EXCLUDED.bio, updated_at = now()
      `, [
        user.id,
        user.email,
        user.name,
        user.avatar,
        user.city,
        index % 2 ? "Odin Institute of Design" : "Northstar University",
        user.role,
        `Volume-test profile ${index + 1}. Curious about craft, community, and learning in public.`,
      ]);
    }

    for (const [index, user] of testUsers.entries()) {
      if (index < 12) {
        const [low, high] = orderedPair(ids.joe, user.id);
        await client.query(`INSERT INTO ${friendshipsTable} (user_low_id, user_high_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [low, high]);
      } else {
        const requestId = deterministicUuid("c0", index + 1);
        await client.query(`
          INSERT INTO ${requestsTable} (id, sender_id, recipient_id, status)
          VALUES ($1, $2, $3, 2)
          ON CONFLICT (id) DO UPDATE SET status = 2, updated_at = now()
        `, [requestId, user.id, ids.joe]);
      }

      const nextUser = testUsers[(index + 1) % testUsers.length];
      const [low, high] = orderedPair(user.id, nextUser.id);
      await client.query(`INSERT INTO ${friendshipsTable} (user_low_id, user_high_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [low, high]);
    }

    let postOrdinal = 0;
    let commentOrdinal = 0;
    for (const [userIndex, user] of testUsers.entries()) {
      for (let postIndex = 0; postIndex < 2; postIndex += 1) {
        postOrdinal += 1;
        const postId = deterministicUuid("a0", postOrdinal);
        const text = `${postCopy[(userIndex + postIndex) % postCopy.length]} — ${user.name}`;
        await client.query(`
          INSERT INTO ${postsTable} (id, author_id, text, created_at)
          VALUES ($1, $2, $3, now() - ($4::int * interval '7 minutes'))
          ON CONFLICT (id) DO UPDATE SET author_id = EXCLUDED.author_id, text = EXCLUDED.text
        `, [postId, user.id, text, postOrdinal + 5]);

        const rootOne = deterministicUuid("b0", ++commentOrdinal);
        const rootTwo = deterministicUuid("b0", ++commentOrdinal);
        const reply = deterministicUuid("b0", ++commentOrdinal);
        const nestedReply = deterministicUuid("b0", ++commentOrdinal);
        const firstCommenter = testUsers[(userIndex + 1) % testUsers.length];
        const secondCommenter = testUsers[(userIndex + 2) % testUsers.length];
        const nestedCommenter = testUsers[(userIndex + 3) % testUsers.length];
        const thread = [
          [rootOne, firstCommenter.id, rootReplies[postOrdinal % rootReplies.length], null, 1],
          [rootTwo, secondCommenter.id, "Adding this to my list of things to revisit later.", null, 2],
          [reply, user.id, `Appreciate that, ${firstCommenter.name.split(" ")[0]} — I will share an update soon.`, rootOne, 3],
          [nestedReply, nestedCommenter.id, "Following this thread. The back-and-forth is useful.", reply, 4],
        ];
        for (const [commentId, authorId, commentText, parentId, minutesAfter] of thread) {
          await client.query(`
            INSERT INTO ${commentsTable} (id, post_id, author_id, text, parent_comment_id, created_at)
            VALUES ($1, $2, $3, $4, $5, now() - ($6::int * interval '7 minutes') + ($7::int * interval '1 minute'))
            ON CONFLICT (id) DO UPDATE SET text = EXCLUDED.text, parent_comment_id = EXCLUDED.parent_comment_id
          `, [commentId, postId, authorId, commentText, parentId, postOrdinal + 5, minutesAfter]);
        }

        for (let likeIndex = 1; likeIndex <= 5; likeIndex += 1) {
          const liker = testUsers[(userIndex + likeIndex) % testUsers.length];
          await client.query(`INSERT INTO ${likesTable} (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [postId, liker.id]);
        }
      }
    }
  });

  const { rows: [summary] } = await pool.query(`
    SELECT
      (SELECT count(*)::int FROM ${usersTable} WHERE email LIKE 'loadtest+%@odinbook.local') AS users,
      (SELECT count(*)::int FROM ${postsTable} p JOIN ${usersTable} u ON u.id = p.author_id WHERE u.email LIKE 'loadtest+%@odinbook.local') AS posts,
      (SELECT count(*)::int FROM ${commentsTable} c JOIN ${postsTable} p ON p.id = c.post_id JOIN ${usersTable} u ON u.id = p.author_id WHERE u.email LIKE 'loadtest+%@odinbook.local') AS comments,
      (SELECT count(*)::int FROM ${likesTable} l JOIN ${postsTable} p ON p.id = l.post_id JOIN ${usersTable} u ON u.id = p.author_id WHERE u.email LIKE 'loadtest+%@odinbook.local') AS likes,
      (SELECT count(*)::int FROM ${requestsTable} r JOIN ${usersTable} u ON u.id = r.sender_id WHERE u.email LIKE 'loadtest+%@odinbook.local') AS requests
  `);
  console.log(`Seeded volume data: ${JSON.stringify(summary)}`);
  return summary;
}

if (require.main === module) {
  seedVolume().then(() => pool.end()).catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
}

module.exports = { deterministicUuid, seedVolume };
