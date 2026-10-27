/** GuardHai · data/follows.repo.js — who this device follows. */
import { openDatabase } from './db.js';

const keyOf = (profileId, userId) => `${profileId}::${userId}`;

export class LocalFollowRepository {
  constructor(db) { this.db = db; }

  async isFollowing(profileId, userId) {
    return !!(await this.db.get('follows', keyOf(profileId, userId)));
  }

  async setFollowing(profileId, userId, following) {
    const key = keyOf(profileId, userId);
    if (!following) { await this.db.delete('follows', key); return false; }
    await this.db.put('follows', { key, profileId, userId, createdAt: new Date().toISOString() });
    return true;
  }

  async count(profileId) {
    return (await this.db.where('follows', 'profileId', profileId)).length;
  }

  async followingIds(userId) {
    return (await this.db.all('follows')).filter((r) => r.userId === userId).map((r) => r.profileId);
  }
}

export async function createFollowRepository() {
  return new LocalFollowRepository(await openDatabase());
}
