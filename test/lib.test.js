const test = require("node:test");
const assert = require("node:assert/strict");
const { HttpError, assertSelf, optionalString, requiredString } = require("../lib/http");
const { userView } = require("../lib/userView");
const { pagination } = require("../controllers/postController");
const { buildCommentTree } = require("../repositories/postRepository");
const { publicUser } = require("../repositories/userRepository");

test("requiredString trims and validates input", () => {
  assert.equal(requiredString("  hello  ", "Text"), "hello");
  assert.throws(() => requiredString(" ", "Text"), (error) => {
    assert.ok(error instanceof HttpError);
    assert.equal(error.status, 400);
    return true;
  });
  assert.throws(() => requiredString("abcd", "Text", { max: 3 }), /3 characters or fewer/);
});

test("optionalString normalizes empty values and applies limits", () => {
  assert.equal(optionalString(undefined), "");
  assert.equal(optionalString("  New York  "), "New York");
  assert.throws(() => optionalString("abcd", { max: 3 }), /3 characters or fewer/);
});

test("assertSelf rejects requests for another account", () => {
  const req = { user: { _id: "current-user" } };
  assert.doesNotThrow(() => assertSelf(req, "current-user"));
  assert.throws(() => assertSelf(req, "other-user"), (error) => error.status === 403);
});

test("userView removes private authentication fields", () => {
  assert.deepEqual(userView({
    _id: "user-id",
    email: "person@example.com",
    password: "hash",
    facebookId: "provider-id",
  }), {
    _id: "user-id",
    email: "person@example.com",
  });
});

test("database rows serialize to the existing public user contract", () => {
  const value = publicUser({
    id: "11111111-1111-4111-8111-111111111111",
    email: "person@example.com",
    password_hash: "hash",
    facebook_id: "provider-id",
    name: "Person Example",
    comment_ids: [],
    friend_ids: [],
    post_ids: [],
  });
  assert.equal(value.password_hash, undefined);
  assert.equal(value.facebook_id, undefined);
  assert.equal(value._id, "11111111-1111-4111-8111-111111111111");
});

test("feed pagination applies defaults and safe bounds", () => {
  assert.deepEqual(pagination({ query: {} }), { limit: 25, skip: 0 });
  assert.deepEqual(pagination({ query: { limit: "10", page: "3" } }), { limit: 10, skip: 20 });
  assert.deepEqual(pagination({ query: { limit: "500", page: "-1" } }), { limit: 100, skip: 0 });
});

test("comments serialize into stable nested threads", () => {
  const users = new Map([
    ["author-1", { _id: "author-1", name: "Maya" }],
    ["author-2", { _id: "author-2", name: "Joe" }],
  ]);
  const rows = [
    { id: "root", post_id: "post", author_id: "author-1", text: "Root", created_at: "2026-07-11", edited: false },
    { id: "reply", post_id: "post", author_id: "author-2", parent_comment_id: "root", text: "Reply", created_at: "2026-07-12", edited: false },
    { id: "nested", post_id: "post", author_id: "author-1", parent_comment_id: "reply", text: "Nested", created_at: "2026-07-13", edited: true },
  ];

  const tree = buildCommentTree(rows, users);
  assert.equal(tree.length, 1);
  assert.equal(tree[0].author.name, "Maya");
  assert.equal(tree[0].comments[0]._id, "reply");
  assert.equal(tree[0].comments[0].comments[0]._id, "nested");
  assert.equal(tree[0].comments[0].comments[0].edited, true);
});
