/**
 * GuardHai · data/profiles.repo.js
 * Stores the device owner's profile and any profile edited on this device.
 * Community sample profiles come from ./profiles.js and are never written here.
 */
import { openDatabase } from './db.js';
import { normalizeProfile } from '../domain/profile.js';

export class LocalProfileRepository {
  constructor(db) { this.db = db; }
  get kind() { return 'local'; }

  async get(id) {
    return normalizeProfile(await this.db.get('profiles', id));
  }

  async all() {
    return (await this.db.all('profiles')).map(normalizeProfile).filter(Boolean);
  }

  async save(profile) {
    const row = normalizeProfile(profile);
    await this.db.put('profiles', row);
    return row;
  }

  async remove(id) { return this.db.delete('profiles', id); }
}

export async function createProfileRepository() {
  return new LocalProfileRepository(await openDatabase());
}
