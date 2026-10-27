/**
 * GuardHai · features/feed/post-blocks.js
 * P2 — the structured body of a post, one block per content need.
 *
 * The card shell (author, badges, media, engagement) lives in post-card.js.
 * This module only answers one question: "given what this post actually
 * contains, which extra block should be shown, and with what heading?"
 *
 * Rules that keep it honest:
 *   • a block renders only when the post carries the data for it;
 *   • `verified` shows only for a real, non-sample post (samples can never be
 *     verified) and always next to its evidence label;
 *   • contacts are re-validated here (tel:/mailto:/https: only);
 *   • the security CTA files a report on the device — it never claims to have
 *     reached the police.
 */
import { escapeHtml } from '../../core/dom.js';
import { normalizeTopic, cleanContacts } from '../../domain/post.js';

/* Headings are chosen by topic, not by type: the same "guidance" list reads as
   "Jilinde" on a safety post and "Maelekezo ya usalama" on a disaster post. */
const GUIDANCE_TITLE = {
  majanga: 'Maelekezo ya usalama',
  afya: 'Muhimu kujua',
  usalama: 'Jilinde',
  taasisi: 'Mambo muhimu',
  kusaidiana: 'Mambo ya kuzingatia'
};

const ICON = {
  location: 'i-map-pin',
  time: 'i-clock',
  source: 'i-link',
  verified: 'i-check-circle',
  pending: 'i-shield',
  phone: 'i-smartphone',
  website: 'i-globe',
  email: 'i-mail'
};

const row = (icon, label, value, extra = '') => `
  <div class="gh-pmeta-row">
    <svg class="ic" aria-hidden="true"><use href="#${icon}"/></svg>
    <span class="gh-pmeta-label">${escapeHtml(label)}</span>
    <span class="gh-pmeta-value">${value}</span>${extra}
  </div>`;

/**
 * Bullet block. Used for safety guidance, "muhimu kujua" and requirements.
 * @param {string} title heading text
 * @param {string[]} items already-clean strings
 * @param {'check'|'dot'} mark
 */
export function bulletBlock(title, items, mark = 'dot') {
  if (!Array.isArray(items) || !items.length) return '';
  return `
    <section class="gh-pblock gh-pblock-list">
      <h4 class="gh-pblock-title">
        <svg class="ic" aria-hidden="true"><use href="#i-${mark === 'check' ? 'check-circle' : 'shield-check'}"/></svg>
        ${escapeHtml(title)}
      </h4>
      <ul class="gh-pblock-items">
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
    </section>`;
}

export function contactBlock(contacts) {
  const safe = cleanContacts(contacts);
  if (!safe.length) return '';
  const href = (c) => c.kind === 'phone'
    ? `tel:${c.value.replace(/[^\d+]/g, '')}`
    : c.kind === 'email' ? `mailto:${c.value}` : c.value;
  const icon = (c) => ICON[c.kind] || ICON.website;
  return `
    <section class="gh-pblock gh-pblock-contact">
      <h4 class="gh-pblock-title">
        <svg class="ic" aria-hidden="true"><use href="#i-building"/></svg> Mawasiliano
      </h4>
      <div class="gh-pcontact-rows">
        ${safe.map((c) => `
          <a class="gh-pcontact" href="${escapeHtml(href(c))}" ${c.kind === 'website' ? 'target="_blank" rel="noopener noreferrer nofollow"' : ''}>
            <svg class="ic" aria-hidden="true"><use href="#${icon(c)}"/></svg>
            <span class="gh-pcontact-label">${escapeHtml(c.label)}</span>
            <span class="gh-pcontact-value">${escapeHtml(c.value)}</span>
          </a>`).join('')}
      </div>
    </section>`;
}

export function sourceRow(post) {
  const source = post.source && post.source.label ? post.source : null;
  if (!source && !post.eventAt) return '';
  const sourceHtml = source
    ? (source.url
        ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer nofollow">${escapeHtml(source.label)}</a>`
        : escapeHtml(source.label))
    : '';
  return `
    <div class="gh-pmeta">
      ${sourceHtml ? row(ICON.source, 'Chanzo:', sourceHtml) : ''}
      ${post.eventAt ? row(ICON.time, 'Muda:', escapeHtml(post.eventAt)) : ''}
    </div>`;
}

/**
 * Verification line for the post. `sample` wins over `verified` on purpose:
 * a sample row can never look official.
 */
export function verificationRow(post) {
  if (post.sample) {
    return `
      <div class="gh-pverify is-sample">
        <svg class="ic" aria-hidden="true"><use href="#i-shield"/></svg>
        <span>Sampuli — hakuna uthibitisho wa chanzo</span>
      </div>`;
  }
  if (post.verified === true) {
    return `
      <div class="gh-pverify is-ok">
        <svg class="ic" aria-hidden="true"><use href="#i-check-circle"/></svg>
        <span>Imethibitishwa na chanzo kilichoorodheshwa</span>
      </div>`;
  }
  return `
    <div class="gh-pverify">
      <svg class="ic" aria-hidden="true"><use href="#i-shield"/></svg>
      <span>Haijathibitishwa</span>
    </div>`;
}

/** The whole extra body for a post (never includes media or actions). */
export function postBlocks(post) {
  const topic = normalizeTopic(post.topic);
  const parts = [];

  const guidance = bulletBlock(GUIDANCE_TITLE[topic] || 'Mambo muhimu', post.safetySteps, topic === 'afya' ? 'check' : 'dot');
  if (guidance) parts.push(guidance);

  const reqs = bulletBlock('Mahitaji', post.requirements, 'check');
  if (reqs) parts.push(reqs);

  const contacts = contactBlock(post.contacts);
  if (contacts) parts.push(contacts);

  const meta = sourceRow(post);
  if (meta) parts.push(meta);

  if (topic === 'usalama') {
    parts.push(`
      <div class="gh-preport">
        <button type="button" class="gh-post-cta" data-post-cta="report" data-post="${escapeHtml(post.id)}">
          <svg class="ic" aria-hidden="true"><use href="#i-flag"/></svg> Ripoti tukio
        </button>
        <p class="gh-preport-note">Taarifa inaandikwa kwenye kifaa hiki — haitumwi polisi.</p>
      </div>`);
  }

  return parts.length ? `<div class="gh-pblocks">${parts.join('')}${verificationRow(post)}</div>` : '';
}

export { GUIDANCE_TITLE };
