/**
 * GuardHai · features/composer/composer-media.js
 * Attachment handling for the composer: pick → validate → preview → persist,
 * plus the recording controller (MediaRecorder) and the attachment tray UI.
 *
 * Local-first: the File is validated by the domain rules, previewed through an
 * object URL and stored as a Blob in IndexedDB. Nothing is uploaded.
 */
import { prepareAttachment, releaseAttachment } from '../../services/media.service.js';
import { validateLink, MEDIA_RULES, MAX_ATTACHMENTS } from '../../domain/media.js';
import { fmtSize } from '../../core/format.js';
import { escapeHtml } from '../../core/dom.js';
import { uid } from '../../core/id.js';
import { toast } from '../../ui/toast.js';

const ICON = { image: 'i-image-plus', video: 'i-video', audio: 'i-mic', link: 'i-link' };

export function renderTray(attachments, errors) {
  const host = document.getElementById('ghcAttachments');
  const errorBox = document.getElementById('ghcErrors');

  if (errorBox) {
    errorBox.innerHTML = (errors || []).map((message) => `
      <div class="ghc-error">
        <svg class="ic" aria-hidden="true"><use href="#i-alert-circle"/></svg>
        <span>${escapeHtml(message)}</span>
      </div>`).join('');
  }
  if (!host) return;

  const addTile = `<li class="ghc-tile-add-wrap"><button type="button" class="ghc-tile-add" data-add-media
      aria-label="Ongeza picha zaidi">
      <svg class="ic" aria-hidden="true"><use href="#i-plus"/></svg>
      <span>Ongeza zaidi</span>
    </button></li>`;

  if (!attachments.length) {
    host.innerHTML = '<li class="ghc-tray-empty">Hakuna kiambatisho bado.</li>';
    return;
  }

  host.innerHTML = addTile + attachments.map((a) => {
    const busy = a.status === 'preparing';
    let preview;
    if (a.kind === 'image' && a.url) {
      preview = `<img src="${escapeHtml(a.url)}" alt="${escapeHtml(a.name)}" class="ghc-thumb">`;
    } else if (a.kind === 'video' && a.url) {
      preview = `<video src="${escapeHtml(a.url)}" class="ghc-thumb" muted playsinline preload="metadata"></video>`;
    } else if (a.kind === 'audio' && a.url) {
      preview = `<audio src="${escapeHtml(a.url)}" controls class="ghc-thumb-audio"></audio>`;
    } else {
      preview = `<span class="ghc-thumb-ico"><svg class="ic"><use href="#${ICON[a.kind] || 'i-link'}"/></svg></span>`;
    }

    const meta = a.kind === 'link'
      ? `<b>${escapeHtml(a.name)}</b><span>kiungo cha chanzo</span>`
      : `<b>${escapeHtml(a.name)}</b><span>${fmtSize(a.size)} · ${escapeHtml(a.type || '')}</span>`;

    return `<li class="ghc-att ${busy ? 'is-busy' : ''}" data-att="${escapeHtml(a.id)}">
      ${preview}
      <div class="ghc-att-meta">
        ${meta}
        <span class="ghc-att-tag">${busy ? 'Inatayarisha…' : 'Kifaa hiki pekee'}</span>
      </div>
      <div class="ghc-att-actions">
        ${a.kind === 'link' ? '' : `<button type="button" class="ghc-att-btn" title="Badilisha"
            aria-label="Badilisha ${escapeHtml(a.name)}" data-att-replace="${escapeHtml(a.id)}">
            <svg class="ic"><use href="#i-refresh"/></svg></button>`}
        <button type="button" class="ghc-att-btn ghc-att-del" title="Ondoa"
            aria-label="Ondoa ${escapeHtml(a.name)}" data-att-remove="${escapeHtml(a.id)}">
            <svg class="ic"><use href="#i-x"/></svg></button>
      </div>
    </li>`;
  }).join('');
}

/**
 * Validate + ingest files into the composer's attachment list.
 * @returns {Promise<{added: number, errors: string[]}>}
 */
export async function ingestFiles(files, kind, attachments) {
  const added = [];
  const errors = [];
  for (const file of files) {
    const result = await prepareAttachment(file, kind, [...attachments, ...added]);
    if (result.ok) added.push(result.attachment);
    else errors.push(result.message);
  }
  return { added, errors };
}

export function addLinkAttachment(raw, attachments) {
  const check = validateLink(raw);
  if (!check.ok) return { ok: false, message: check.message };

  const links = attachments.filter((a) => a.kind === 'link');
  if (links.length >= MEDIA_RULES.link.maxCount) {
    return { ok: false, message: `Kiungo: kiwango cha juu ni ${MEDIA_RULES.link.maxCount}.` };
  }
  if (attachments.length >= MAX_ATTACHMENTS) {
    return { ok: false, message: `Kiwango cha juu cha viambatisho ni ${MAX_ATTACHMENTS}.` };
  }
  const url = new URL(check.url);
  return {
    ok: true,
    attachment: {
      id: uid('lnk'),
      kind: 'link',
      status: 'ready',
      url: check.url,
      name: url.hostname.replace(/^www\./, '') + (url.pathname !== '/' ? url.pathname : ''),
      title: url.hostname.replace(/^www\./, '')
    }
  };
}

export function removeAttachment(id, attachments) {
  const index = attachments.findIndex((a) => a.id === id);
  if (index < 0) return attachments;
  const [removed] = attachments.splice(index, 1);
  releaseAttachment(removed.id, { dropBlob: true });
  return attachments;
}

/* ------------------------------------------------------------- recording */
let recorder = null;
let stream = null;

const supported = () =>
  typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

export function setRecordingUi(on) {
  const btn = document.getElementById('ghcRecBtn');
  if (btn) btn.classList.toggle('is-recording', !!on);
  const label = btn && btn.querySelector('span');
  if (label) label.textContent = on ? 'Simamisha' : 'Rekodi';
}

/**
 * Toggle the microphone recording. Resolves with the recorded File when the
 * user stops, or null while starting / when unsupported.
 */
export async function toggleRecording() {
  if (recorder && recorder.state === 'recording') {
    recorder.stop();
    return null;
  }
  if (!supported()) {
    return { error: 'Kurekodi sauti hakupatikani kwenye kifaa hiki. Tumia "Sauti" kuambatisha faili.' };
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    return { error: 'Ruhusa ya maikrofoni ilikataliwa. Ruhusu kwenye browser au ambatisha faili la sauti.' };
  }

  const chunks = [];
  recorder = new MediaRecorder(stream);
  recorder.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };

  const finished = new Promise((resolve) => {
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const mime = String(recorder.mimeType || 'audio/webm').split(';')[0];
      const blob = new Blob(chunks, { type: mime });
      recorder = null; stream = null;
      setRecordingUi(false);
      resolve(blob.size
        ? new File([blob], `rekodi-${Date.now()}.webm`, { type: mime })
        : null);
    };
  });

  recorder.start();
  setRecordingUi(true);
  pendingRecording = finished;
  return { recording: true };
}

let pendingRecording = null;

/** resolves to the recorded File once the user presses stop */
export async function awaitRecording() {
  if (!pendingRecording) return null;
  const file = await pendingRecording;
  pendingRecording = null;
  return file;
}

export function stopRecording() {
  if (recorder && recorder.state === 'recording') recorder.stop();
  if (stream) stream.getTracks().forEach((t) => t.stop());
  recorder = null; stream = null;
  pendingRecording = null;
  setRecordingUi(false);
}

export { supported as recordingSupported };
