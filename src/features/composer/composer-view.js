/**
 * GuardHai · features/composer/composer-view.js
 * The two-step composer (edit → preview → publish).
 *
 * Responsibilities: form state, inline validation, the preview step, publishing
 * through posts.service and drafts through drafts.service. Media handling lives
 * in composer-media.js; rendering of the finished card is reused from the feed.
 */
import {
  ingestFiles, addLinkAttachment, removeAttachment, renderTray,
  toggleRecording, awaitRecording, stopRecording
} from './composer-media.js';
import { publishPost } from '../../services/posts.service.js';
import { saveDraft, latestDraft, countDrafts } from '../../services/drafts.service.js';
import { postCard } from '../feed/post-card.js';
import { validateDraft, POST_TYPES } from '../../domain/post.js';
import { currentUser } from '../../services/session.service.js';
import { toast } from '../../ui/toast.js';
import { escapeHtml } from '../../core/dom.js';
import { uid, nowIso } from '../../core/id.js';

export const composerState = {
  step: 'edit',
  type: 'elimu',
  attachments: [],
  errors: [],
  publishing: false
};

const $ = (id) => document.getElementById(id);

/* ------------------------------------------------------------------ wiring */
export function wireComposer() {
  const bindCount = (inputId, countId) => {
    const input = $(inputId);
    const counter = $(countId);
    if (!input) return;
    input.addEventListener('input', () => { if (counter) counter.innerText = input.value.length; });
  };
  bindCount('ghcText', 'ghcCount');
  bindCount('ghcTitleInput', 'ghcTitleCount');

  document.querySelectorAll('#ghcTypes .ghc-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#ghcTypes .ghc-chip').forEach((c) => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      composerState.type = chip.dataset.type;
    });
  });

  const map = { ghcFileImage: 'image', ghcFileVideo: 'video', ghcFileAudio: 'audio' };
  for (const [id, kind] of Object.entries(map)) {
    const input = $(id);
    if (!input) continue;
    input.addEventListener('change', async (ev) => {
      const files = [...(ev.target.files || [])];
      ev.target.value = '';
      if (!files.length) return;
      const { added, errors } = await ingestFiles(files, kind, composerState.attachments);
      composerState.attachments.push(...added);
      composerState.errors = errors;
      render();
    });
  }

  // attach-tray buttons (replace / remove) — delegated, so re-rendering is free
  const tray = $('ghcAttachments');
  if (tray) {
    tray.addEventListener('click', async (ev) => {
      const remove = ev.target.closest('[data-att-remove]');
      if (remove) {
        removeAttachment(remove.dataset.attRemove, composerState.attachments);
        render();
        return;
      }
      const replace = ev.target.closest('[data-att-replace]');
      if (replace) {
        const att = composerState.attachments.find((a) => a.id === replace.dataset.attReplace);
        if (!att) return;
        const kind = att.kind;
        removeAttachment(att.id, composerState.attachments);
        render();
        pickMedia(kind);
      }
    });
  }
}

function render() {
  renderTray(composerState.attachments, composerState.errors);
  const row = $('ghcDraftRow');
  if (row && composerState.step === 'edit') renderDraftRow();
}

/* -------------------------------------------------------------- lifecycle */
export async function openComposer() {
  composerState.attachments = [];
  composerState.errors = [];
  setStep('edit');
  const modal = $('ghComposer');
  if (modal) modal.classList.add('open');
  await renderDraftRow();
  render();
  setTimeout(() => $('ghcText')?.focus(), 160);
}

export function closeComposer() {
  stopRecording();
  const modal = $('ghComposer');
  if (modal) modal.classList.remove('open');
  setStep('edit');
}

function clearForm() {
  for (const id of ['ghcText', 'ghcTitleInput', 'ghcLinkInput']) {
    const node = $(id);
    if (node) node.value = '';
  }
  for (const id of ['ghcCount', 'ghcTitleCount']) {
    const node = $(id);
    if (node) node.innerText = '0';
  }
  composerState.attachments = [];
  composerState.errors = [];
  render();
}

export async function cancelComposer() {
  const form = readForm();
  const hadContent = !!(form.text || form.title);
  const hadMedia = form.media.length;
  stopRecording();

  let saved = false;
  if (hadContent) {
    await saveDraft({ ...form, media: form.media });
    saved = true;
  }
  clearForm();
  closeComposer();

  if (hadContent && saved) toast('Umeghairi. Maandishi yamehifadhiwa kama rasimu kwenye kifaa hiki.');
  else if (hadMedia) toast('Umeghairi. Viambatisho vimeondolewa.');
  else toast('Umeghairi chapisho.');
}

/* ------------------------------------------------------------------- steps */
export function setStep(step) {
  composerState.step = step;
  const preview = step === 'preview';
  const show = (id, visible) => { const n = $(id); if (n) n.style.display = visible ? '' : 'none'; };

  show('ghcStepEdit', !preview);
  show('ghcStepPreview', preview);
  show('ghcBackBtn', preview);
  show('ghcDraftBtn', !preview);
  show('ghcPreviewBtn', !preview);
  show('ghcStepLabel', true);
  show('ghcFoot', true);

  const label = $('ghcStepLabel');
  if (label) label.textContent = preview ? '2/2' : '1/2';
  const title = $('ghcTitle');
  if (title) title.textContent = preview ? 'Hakiki chapisho' : 'Shiriki Elimu';
  const publish = $('ghcPublish');
  if (publish) {
    const span = publish.querySelector('span');
    if (span) span.textContent = preview ? 'Chapisha sasa' : 'Chapisha';
  }
  const modal = $('ghComposer');
  if (modal) modal.scrollTop = 0;
}

export const composerBack = () => setStep('edit');

/* ------------------------------------------------------------------- media */
export function pickMedia(kind) {
  const input = $({ image: 'ghcFileImage', video: 'ghcFileVideo', audio: 'ghcFileAudio' }[kind]);
  if (input) { input.value = ''; input.click(); }
}

export function focusLink() {
  const row = $('ghcLinkRow');
  if (row) row.classList.add('is-focus');
  const input = $('ghcLinkInput');
  if (input) { input.focus(); input.select(); }
}

export function addLink() {
  const input = $('ghcLinkInput');
  const result = addLinkAttachment(input ? input.value : '', composerState.attachments);
  if (!result.ok) {
    composerState.errors = [result.message];
    render();
    flashErrors();
    return;
  }
  composerState.attachments.push(result.attachment);
  composerState.errors = [];
  if (input) input.value = '';
  render();
}

export async function recordAudio() {
  const started = await toggleRecording();
  if (started?.error) {
    composerState.errors = [started.error];
    render();
    flashErrors();
    return;
  }
  if (!started?.recording) {
    const file = await awaitRecording();
    if (file) {
      const { added, errors } = await ingestFiles([file], 'audio', composerState.attachments);
      composerState.attachments.push(...added);
      composerState.errors = errors;
      render();
    }
  }
}

function flashErrors() {
  const box = $('ghcErrors');
  if (!box) return;
  box.classList.remove('flash');
  void box.offsetWidth;
  box.classList.add('flash');
}

/* -------------------------------------------------------------------- form */
export function readForm() {
  const topicSel = $('ghcTopic');
  const audSel = $('ghcAudience');
  return {
    title: $('ghcTitleInput')?.value.trim() || '',
    text: $('ghcText')?.value.trim() || '',
    type: composerState.type,
    topic: topicSel ? topicSel.value : 'people',
    topicLabel: topicSel ? topicSel.options[topicSel.selectedIndex].textContent.trim() : 'Usalama wa Watu',
    audience: audSel ? audSel.value : 'public',
    media: composerState.attachments.filter((a) => a.status !== 'error')
  };
}

/* ----------------------------------------------------------------- preview */
export function showPreview() {
  const form = readForm();
  const errors = validateDraft({ ...form, media: form.media });
  composerState.errors = errors;
  render();
  if (errors.length) { flashErrors(); toast(errors[0]); return false; }

  const user = currentUser();
  const draft = {
    id: 'preview',
    authorName: user.name,
    initials: user.initials,
    accountType: `${POST_TYPES[form.type]?.label || 'Elimu'} · wewe`,
    topicLabel: form.topicLabel,
    title: form.title,
    text: form.text,
    media: form.media,
    sample: false,
    verified: false,
    timeLabel: 'Sasa hivi'
  };
  const host = $('ghcPreviewHost');
  if (host) host.innerHTML = postCard(draft, { preview: true, flags: {} });
  setStep('preview');
  return true;
}

/* ----------------------------------------------------------------- publish */
export async function publish() {
  if (composerState.publishing) return { ok: false, errors: ['Inaendelea…'] };
  const form = readForm();
  const errors = validateDraft({ ...form, media: form.media });
  composerState.errors = errors;
  render();
  if (errors.length) {
    flashErrors();
    setStep('edit');
    toast(errors[0]);
    return { ok: false, errors };
  }

  composerState.publishing = true;
  const button = $('ghcPublish');
  if (button) {
    button.disabled = true;
    button.classList.add('is-loading');
    const span = button.querySelector('span');
    if (span) span.textContent = 'Inaandaa…';
  }

  const result = await publishPost(form);

  composerState.publishing = false;
  if (button) {
    button.disabled = false;
    button.classList.remove('is-loading');
    const span = button.querySelector('span');
    if (span) span.textContent = 'Chapisha';
  }

  if (!result.ok) {
    composerState.errors = result.errors;
    render();
    flashErrors();
    toast(result.errors[0]);
    return result;
  }

  clearForm();
  closeComposer();
  toast('Imehifadhiwa kwenye kifaa hiki — haijatumwa mtandaoni.');
  return result;
}

/* ------------------------------------------------------------------ drafts */
export async function renderDraftRow() {
  const row = $('ghcDraftRow');
  if (!row) return;
  const total = await countDrafts();
  if (!total) { row.style.display = 'none'; row.innerHTML = ''; return; }
  row.style.display = 'flex';
  row.innerHTML = `<span>Rasimu zilizohifadhiwa: <b>${total}</b></span>
    <button type="button" class="ghc-linkbtn" data-draft-load>Pakia ya mwisho</button>`;
}

export async function saveCurrentDraft() {
  const form = readForm();
  if (!form.text && !form.title) { toast('Hakuna cha kuhifadhi bado.'); return null; }
  const { draft } = await saveDraft(form);
  clearForm();
  setStep('edit');
  closeComposer();
  await renderDraftRow();
  toast(draft.mediaDropped
    ? `Rasimu imehifadhiwa (maandishi + viungo). Viambatisho ${draft.mediaDropped} havijahifadhiwa.`
    : 'Rasimu imehifadhiwa kwenye kifaa hiki (IndexedDB).');
  return draft;
}

export async function loadLatestDraft() {
  const draft = await latestDraft();
  if (!draft) { toast('Hakuna rasimu iliyohifadhiwa.'); return; }

  const text = $('ghcText');
  const title = $('ghcTitleInput');
  if (text) { text.value = draft.text || ''; text.dispatchEvent(new Event('input')); }
  if (title) { title.value = draft.title || ''; title.dispatchEvent(new Event('input')); }

  const topic = $('ghcTopic'); if (topic && draft.topic) topic.value = draft.topic;
  const audience = $('ghcAudience'); if (audience && draft.audience) audience.value = draft.audience;
  document.querySelectorAll('#ghcTypes .ghc-chip').forEach((chip) => {
    chip.classList.toggle('is-active', chip.dataset.type === draft.type);
  });
  if (draft.type) composerState.type = draft.type;

  for (const url of draft.links || []) {
    const result = addLinkAttachment(url, composerState.attachments);
    if (result.ok) composerState.attachments.push(result.attachment);
  }
  render();
  toast(draft.mediaDropped
    ? `Rasimu imepakiwa. Viambatisho ${draft.mediaDropped} havikuwa vimehifadhiwa.`
    : 'Rasimu imepakiwa kwenye kihariri.');
}

export { uid, nowIso, escapeHtml };
