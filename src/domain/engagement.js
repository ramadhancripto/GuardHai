/**
 * GuardHai · domain/engagement.js
 * Engagement is a small value object per (post, user) pair.
 */

export const FLAGS = Object.freeze(['helpful', 'saved', 'following']);

export const emptyEngagement = (postId, userId) => ({
  postId, userId, helpful: false, saved: false, following: false, updatedAt: null
});

export function toggle(engagement, flag) {
  if (!FLAGS.includes(flag)) throw new Error(`unknown engagement flag: ${flag}`);
  return { ...engagement, [flag]: !engagement[flag], updatedAt: new Date().toISOString() };
}

/**
 * Counts are only ever derived from real, stored rows — there is no synthetic
 * "likes" number anywhere in the product. A count of 0 is rendered as "no
 * count", never as "0".
 */
export function visibleCount(n) {
  return Number.isFinite(n) && n > 0 ? n : null;
}
