/**
 * GuardHai · core/dom.js
 * The few DOM helpers the feature modules share. No framework, no vdom:
 * views build HTML strings and attach listeneers with delegate().
 */

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(tag, attrs = {}, html = '') {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  if (html) node.innerHTML = html;
  return node;
}

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

/** event delegation: handle clicks on a descendant matching `selector` */
export function delegate(root, eventName, selector, handler) {
  if (!root) return () => {};
  const listener = (ev) => {
    const target = ev.target.closest(selector);
    if (target && root.contains(target)) handler(ev, target);
  };
  root.addEventListener(eventName, listener);
  return () => root.removeEventListener(eventName, listener);
}

export function setText(node, text) { if (node) node.textContent = text; }
export const show = (node) => { if (node) node.style.display = ''; };
export const hide = (node) => { if (node) node.style.display = 'none'; };
