/**
 * GuardHai · core/bus.js
 * Minimal synchronous pub/sub used to decouple features from services.
 * No dependencies, no magic: subscribe() returns an unsubscribe function.
 */

const listeners = new Map();

export const bus = {
  on(event, handler) {
    if (typeof handler !== 'function') throw new TypeError('handler must be a function');
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
    return () => bus.off(event, handler);
  },

  once(event, handler) {
    const off = bus.on(event, (payload) => { off(); handler(payload); });
    return off;
  },

  off(event, handler) {
    const set = listeners.get(event);
    if (set) { set.delete(handler); if (!set.size) listeners.delete(event); }
  },

  emit(event, payload) {
    const set = listeners.get(event);
    if (!set) return 0;
    let delivered = 0;
    for (const handler of [...set]) {
      try { handler(payload); delivered++; }
      catch (err) { console.error(`[bus] listener for "${event}" failed`, err); }
    }
    return delivered;
  },

  clear() { listeners.clear(); },

  /** event names currently subscribed — handy in tests */
  events() { return [...listeners.keys()]; }
};

export const EVENTS = {
  POST_CREATED: 'post:created',
  POST_REMOVED: 'post:removed',
  ENGAGEMENT_CHANGED: 'engagement:changed',
  COMMENT_ADDED: 'comment:added',
  DRAFT_SAVED: 'draft:saved',
  REPORT_FILED: 'report:filed',
  PROFILE_UPDATED: 'profile:updated',
  PROFILE_FOLLOW_CHANGED: 'profile:follow-changed',
  TOAST: 'ui:toast',

  /* Communication & Support Network — added for the network services */
  CONVERSATION_CHANGED: 'chat:conversation-changed',
  MESSAGE_SENT: 'chat:message-sent',
  GUARDIAN_CHANGED: 'guardian:changed',
  SUPPORT_CHANGED: 'support:changed',
  COMMUNITY_CHANGED: 'community:changed',
  SAFETY_CHANGED: 'safety:changed',
  ALERT_CREATED: 'ui:alert',
  TRANSPORT_CHANGED: 'transport:changed',
  OUTBOX_CHANGED: 'transport:outbox',
  OUTBOX_FLUSHED: 'transport:outbox-flushed',
  CONNECTIVITY: 'transport:connectivity'
};
