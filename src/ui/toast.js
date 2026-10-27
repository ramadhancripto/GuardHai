/** GuardHai · ui/toast.js — single transient message element (#ghToast). */
let hideTimer = null;

export function toast(message, { ms = 2600 } = {}) {
  const el = document.getElementById('ghToast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => el.classList.remove('show'), ms);
}
