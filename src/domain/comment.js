/** GuardHai · domain/comment.js */

export const COMMENT_MAX = 300;

export function validateComment(text) {
  const value = String(text || '').trim();
  if (!value) return { ok: false, message: 'Andika maoni kwanza.' };
  if (value.length > COMMENT_MAX) return { ok: false, message: `Maoni yamezidi herufi ${COMMENT_MAX}.` };
  return { ok: true, value };
}

export const buildComment = ({ postId, author, text, id, now, parentId = null }) => ({
  id: id || `c_${Date.now().toString(36)}`,
  postId,
  parentId: parentId || null,
  authorId: author.id,
  authorName: author.name,
  text: String(text).trim(),
  createdAt: now || new Date().toISOString()
});
