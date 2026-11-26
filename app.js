const icons = {
  moon: '<path d="M20.9 13.35A9 9 0 0 1 10.65 3.1 9 9 0 1 0 20.9 13.35Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  book: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v18m3-13h4m-4 4h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  back: '<path d="m14 6-6 6 6 6"/>',
  pin: '<path d="m15 3 6 6-3 1-2 4v3l-2 2-9-9 2-2h3l4-2zM9 15l-6 6"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/>'
};
document.querySelectorAll('[data-icon]').forEach((element) => {
  element.innerHTML = [
    '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"',
    ' stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">',
    icons[element.dataset.icon],
    '</svg>',
  ].join('');
});

const $ = (id) => document.getElementById(id);

const themeKey = 'caderno.theme';
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
let preferredTheme;
try {
  preferredTheme = localStorage.getItem(themeKey);
} catch {
  // The system theme remains available when storage is blocked.
}

function applyTheme() {
  const dark = preferredTheme === 'dark' || (preferredTheme !== 'light' && systemTheme.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const action = dark ? 'Ativar modo claro' : 'Ativar modo escuro';
  $('theme').setAttribute('aria-label', action);
  $('theme').title = action;
}

$('theme').onclick = () => {
  preferredTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  try {
    localStorage.setItem(themeKey, preferredTheme);
  } catch {
    // The chosen theme remains active for this session.
  }
};
systemTheme.addEventListener('change', applyTheme);
applyTheme();

const viewport = window.visualViewport;
if (viewport) {
  function updateVisibleHeight() {
    if (viewport.scale === 1) {
      document.body.style.setProperty('--visible-height', viewport.height + 'px');
    } else {
      document.body.style.removeProperty('--visible-height');
    }
  }
  viewport.addEventListener('resize', updateVisibleHeight);
  updateVisibleHeight();
}

const key = 'caderno.notes.v1';
const now = Date.now();
const seed = [
  {
    id: 'welcome',
    title: 'Boas-vindas ao Caderno',
    body: 'Este é seu espaço para guardar ideias, listas e lembretes.\n\nUse Nova nota para começar a escrever. Você também pode editar esta nota ou fixar o que quiser manter no topo.\n\nSuas notas são salvas automaticamente neste navegador.',
    pinned: true,
    updated: now,
  },
  {
    id: 'ideas',
    title: 'Ideias para guardar',
    body: 'Livros para ler\nLugares para conhecer\nProjetos para começar',
    pinned: false,
    updated: now - 1,
  },
  {
    id: 'week',
    title: 'Planejamento da semana',
    body: 'Anote aqui suas prioridades e lembretes.',
    pinned: false,
    updated: now - 2,
  },
];

let notes = seed;
try {
  const saved = localStorage.getItem(key);
  if (saved) notes = JSON.parse(saved);
} catch {
  $('save').textContent = 'Não foi possível ler as notas salvas';
}

let selected;
const current = () => notes.find(note => note.id === selected);
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
const longDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' });

function save() {
  try {
    localStorage.setItem(key, JSON.stringify(notes));
    $('save').textContent = 'Salvo neste navegador';
  } catch {
    $('save').textContent = 'Falha ao salvar neste navegador';
  }
}

function renderList() {
  const ordered = [...notes].sort((a, b) => b.updated - a.updated);
  const list = $('list');
  list.replaceChildren();

  for (const pinned of [true, false]) {
    const group = ordered.filter(note => note.pinned === pinned);
    if (!group.length) continue;
    const heading = document.createElement('h2');
    heading.textContent = pinned ? 'Fixadas' : 'Recentes';
    list.append(heading);

    for (const note of group) {
      const button = document.createElement('button');
      button.className = 'note';
      button.setAttribute('aria-current', note.id === selected);
      const title = document.createElement('strong');
      title.textContent = note.title.trim() || 'Sem título';
      const excerpt = document.createElement('span');
      const preview = note.body.trim().replace(/\s+/g, ' ') || 'Nota vazia';
      excerpt.textContent = shortDate.format(note.updated) + ' · ' + preview;
      button.append(title, excerpt);
      button.onclick = () => openNote(note.id);
      list.append(button);
    }
  }

  if (!ordered.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-list';
    empty.textContent = 'Crie sua primeira nota.';
    list.append(empty);
  }
}

function metadata(note) {
  const words = note.body.trim().split(/\s+/).filter(Boolean).length;
  $('date').textContent = longDate.format(note.updated);
  $('footer').textContent = words + (words === 1 ? ' palavra' : ' palavras');
  const label = note.pinned ? 'Desafixar nota' : 'Fixar nota';
  $('pin').title = label;
  $('pin').setAttribute('aria-label', label);
  $('pin').setAttribute('aria-pressed', note.pinned);
}

function renderEditor() {
  const note = current();
  for (const id of ['toolbar', 'editor', 'footer']) {
    $(id).hidden = !note;
  }
  $('blank').hidden = !!note;
  if (!note) return;
  $('title').value = note.title;
  $('body').value = note.body;
  metadata(note);
}

function openNote(id) {
  selected = id;
  $('app').dataset.navigated = '';
  $('app').classList.add('open');
  renderEditor();
  renderList();
  $('back').focus();
}

$('new').onclick = () => {
  const id = globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + Math.random();
  notes.push({ id, title: '', body: '', pinned: false, updated: Date.now() });
  save();
  openNote(id);
  $('title').focus();
};

$('back').onclick = () => {
  $('app').classList.remove('open');
  ($('list').querySelector('[aria-current=true]') ?? $('new')).focus();
};

for (const field of ['title', 'body']) {
  $(field).oninput = () => {
    const note = current();
    if (!note) return;
    note[field] = $(field).value;
    note.updated = Date.now();
    save();
    metadata(note);
    renderList();
  };
}

$('pin').onclick = () => {
  const note = current();
  note.pinned = !note.pinned;
  save();
  metadata(note);
  renderList();
};

$('remove').onclick = () => {
  $('confirm').returnValue = '';
  $('confirm').showModal();
};

$('confirm').onclose = () => {
  if ($('confirm').returnValue !== 'delete') return;
  notes = notes.filter(note => note.id !== selected);
  selected = [...notes].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.updated - a.updated,
  )[0]?.id;
  save();
  $('app').classList.remove('open');
  renderList();
  renderEditor();
  ($('list').querySelector('[aria-current=true]') ?? $('new')).focus();
};

renderList();
renderEditor();
