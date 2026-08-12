export const COMMENT_CATEGORIES = ["Delayed", "Waiting on client", "Issues", "Other"] as const;

export type CommentCategory = (typeof COMMENT_CATEGORIES)[number];

export function normalizeCommentCategory(value: unknown): CommentCategory {
  return COMMENT_CATEGORIES.includes(value as CommentCategory)
    ? value as CommentCategory
    : "Other";
}
