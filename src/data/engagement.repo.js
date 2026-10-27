/** GuardHai · data/engagement.repo.js — likes/saves/follows, comments, reports. */
import { openDatabase } from './db.js';
import { emptyEngagement } from '../domain/engagement.js';

const keyOf = (postId, userId) => `${postId}::${userId}`;

export class LocalEngagementRepository {
  constructor(db) { this.db = db; }

  async getFlags(postId, userId) {
    const row = await this.db.get('engagement', keyOf(postId, userId));
    return row ? { ...emptyEngagement(postId, userId), ...row } : emptyEngagement(postId, userId);
  }

  async saveFlags(state) {
    const row = { ...state, key: keyOf(state.postId, state.userId) };
    await this.db.put('engagement', row);
    return row;
  }

  async listFlagsForUser(userId) {
    const rows = await this.db.all('engagement');
    return rows.filter((r) => r.userId === userId);
  }

  async comments(postId) {
    const rows = await this.db.where('comments', 'postId', postId);
    return rows.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
  }

  async addComment(comment) {
    await this.db.put('comments', comment);
    return comment;
  }

  async commentCount(postId) {
    return (await this.comments(postId)).length;
  }

  async addReport(report) {
    await this.db.put('reports', report);
    return report;
  }

  async reports() {
    return (await this.db.all('reports')).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
}

export async function createEngagementRepository() {
  return new LocalEngagementRepository(await openDatabase());
}
