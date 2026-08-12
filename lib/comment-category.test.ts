import { COMMENT_CATEGORIES, normalizeCommentCategory } from "./comment-category";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(JSON.stringify(COMMENT_CATEGORIES) === JSON.stringify(["Delayed", "Waiting on client", "Issues", "Other"]), "category list is stable");
assert(normalizeCommentCategory("Issues") === "Issues", "known category is retained");
assert(normalizeCommentCategory("unknown") === "Other", "unknown category falls back to Other");
assert(normalizeCommentCategory(undefined) === "Other", "legacy comments default to Other");
console.log("comment-category-regression=PASS");
