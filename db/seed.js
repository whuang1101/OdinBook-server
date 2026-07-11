require("dotenv").config();

const bcrypt = require("bcryptjs");
const { getPublicApiUrl } = require("../config/env");
const { pool, table, transaction } = require("./pool");
const { migrate } = require("./migrate");

const usersTable = table("users");
const postsTable = table("posts");
const commentsTable = table("comments");
const likesTable = table("post_likes");
const friendshipsTable = table("friendships");
const requestsTable = table("friend_requests");

const ids = {
  joe: "11111111-1111-4111-8111-111111111111",
  wilson: "22222222-2222-4222-8222-222222222222",
  maya: "33333333-3333-4333-8333-333333333333",
  theo: "44444444-4444-4444-8444-444444444444",
  lina: "55555555-5555-4555-8555-555555555555",
  noah: "66666666-6666-4666-8666-666666666666",
  elaine: "77777777-7777-4777-8777-777777777777",
  earl: "88888888-8888-4888-8888-888888888888",
};

const postIds = [
  "a1111111-1111-4111-8111-111111111111",
  "a2222222-2222-4222-8222-222222222222",
  "a3333333-3333-4333-8333-333333333333",
  "a4444444-4444-4444-8444-444444444444",
  "a5555555-5555-4555-8555-555555555555",
];

async function seed() {
  await migrate();
  const passwordHash = await bcrypt.hash("Abcd1234", 10);
  const apiUrl = getPublicApiUrl();
  const avatars = [
    "williamstown-1057646.jpg", "1694639484961pexels-pixabay-220453.jpg",
    "1694639507987charlesdeluvio-Mv9hjnEUHR4-unsplash.jpg", "facebookanon.jpg",
    "anonymous.jpeg", "1694639456049download (4).jpeg", "facebookanon.jpg", "anonymous.jpeg",
  ];
  const people = [
    [ids.joe, "joebob1@gmail.com", "Joe Bob", "Fort Kaceyfurt", "Harvard University", "Dynamic Accounts Associate", "Hey what's up gang!"],
    [ids.wilson, "wilson@example.com", "Wilson Huang", "Sunnyvale, CA", "University of Florida", "Software Engineer", "Building thoughtful software and climbing whenever I can."],
    [ids.maya, "maya.chen@example.com", "Maya Chen", "Brooklyn, NY", "RISD", "Product Designer", "Designing thoughtful systems."],
    [ids.theo, "theo.james@example.com", "Theo James", "Austin, TX", "Georgia Tech", "Frontend Engineer", "Building accessible interfaces in public."],
    [ids.lina, "lina.patel@example.com", "Lina Patel", "Chicago, IL", "SAIC", "Creative Developer", "Code, color, and tiny delightful details."],
    [ids.noah, "noah.williams@example.com", "Noah Williams", "Portland, OR", "UO", "Photographer", "Collecting light and good stories."],
    [ids.elaine, "elaine.cole@example.com", "Elaine Cole", "Boston, MA", "Boston University", "Researcher", "Curious about people and systems."],
    [ids.earl, "earl.pfannerstill@example.com", "Earl Pfannerstill", "Denver, CO", "CU Boulder", "Engineer", "Making useful things with good people."],
  ];

  await transaction(async (client) => {
    for (let index = 0; index < people.length; index += 1) {
      const [id, email, name, lives, studiesAt, job, bio] = people[index];
      await client.query(`
        INSERT INTO ${usersTable} (id, email, password_hash, name, image_url, lives, studies_at, job, bio)
        VALUES ($1, lower($2), $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash,
          name = EXCLUDED.name, image_url = EXCLUDED.image_url, lives = EXCLUDED.lives,
          studies_at = EXCLUDED.studies_at, job = EXCLUDED.job, bio = EXCLUDED.bio, updated_at = now()
      `, [id, email, passwordHash, name, `${apiUrl}/uploads/${encodeURIComponent(avatars[index])}`, lives, studiesAt, job, bio]);
    }

    const friendshipPairs = [[ids.joe, ids.wilson], [ids.joe, ids.maya], [ids.joe, ids.theo], [ids.maya, ids.lina]];
    for (const pair of friendshipPairs) {
      const [low, high] = pair.sort();
      await client.query(`INSERT INTO ${friendshipsTable} (user_low_id, user_high_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [low, high]);
    }

    const posts = [
      [postIds[0], ids.wilson, "Welcome to OdinBook — a quieter place to connect, share progress, and keep up with people you care about.", 90],
      [postIds[1], ids.joe, "Yo what's up — trying the new PostgreSQL-powered feed!", 70],
      [postIds[2], ids.maya, "The best products don't just solve a problem — they make the solution feel inevitable.", 50],
      [postIds[3], ids.theo, "Today's win: shipped the accessibility improvements we've been testing all month.", 30],
      [postIds[4], ids.joe, "Small steps, meaningful progress. Hope everyone is having a good week.", 10],
    ];
    for (const [id, authorId, text, minutesAgo] of posts) {
      await client.query(`
        INSERT INTO ${postsTable} (id, author_id, text, created_at)
        VALUES ($1, $2, $3, now() - ($4 * interval '1 minute'))
        ON CONFLICT (id) DO UPDATE SET author_id = EXCLUDED.author_id, text = EXCLUDED.text
      `, [id, authorId, text, minutesAgo]);
    }

    const comments = [
      ["b1111111-1111-4111-8111-111111111111", postIds[0], ids.joe, "This looks great — excited to try it!"],
      ["b2222222-2222-4222-8222-222222222222", postIds[0], ids.maya, "The new direction feels much calmer."],
      ["b3333333-3333-4333-8333-333333333333", postIds[2], ids.theo, "Love this framing."],
      ["b4444444-4444-4444-8444-444444444444", postIds[3], ids.joe, "Huge win. Accessibility work matters."],
    ];
    for (const [id, postId, authorId, text] of comments) {
      await client.query(`INSERT INTO ${commentsTable} (id, post_id, author_id, text) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET text = EXCLUDED.text`, [id, postId, authorId, text]);
    }

    for (const [postId, userId] of [[postIds[0], ids.joe], [postIds[0], ids.maya], [postIds[2], ids.joe], [postIds[3], ids.joe], [postIds[4], ids.wilson]]) {
      await client.query(`INSERT INTO ${likesTable} (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [postId, userId]);
    }

    for (const [id, recipientId] of [["c1111111-1111-4111-8111-111111111111", ids.lina], ["c2222222-2222-4222-8222-222222222222", ids.noah], ["c3333333-3333-4333-8333-333333333333", ids.elaine], ["c4444444-4444-4444-8444-444444444444", ids.earl]]) {
      await client.query(`
        INSERT INTO ${requestsTable} (id, sender_id, recipient_id, status)
        VALUES ($1, $2, $3, 2) ON CONFLICT (id) DO UPDATE SET status = 2
      `, [id, ids.joe, recipientId]);
    }
  });
  console.log("Seeded OdinBook faux data");
}

if (require.main === module) {
  seed().then(() => pool.end()).catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
}

module.exports = { ids, seed };
