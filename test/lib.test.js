const test = require("node:test");
const assert = require("node:assert/strict");
const { HttpError, assertSelf, optionalString, requiredString } = require("../lib/http");
const { userView } = require("../lib/userView");
const { pagination } = require("../controllers/postController");
const User = require("../models/user");

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

test("the user schema excludes passwords from queries and JSON", () => {
  assert.equal(User.schema.path("password").options.select, false);
  const value = new User({
    email: "person@example.com",
    name: "Person Example",
    password: "hash",
  }).toJSON();
  assert.equal(value.password, undefined);
});

test("feed pagination applies defaults and safe bounds", () => {
  assert.deepEqual(pagination({ query: {} }), { limit: 25, skip: 0 });
  assert.deepEqual(pagination({ query: { limit: "10", page: "3" } }), { limit: 10, skip: 20 });
  assert.deepEqual(pagination({ query: { limit: "500", page: "-1" } }), { limit: 100, skip: 0 });
});
