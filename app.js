const state = {
  characters: [], relationships: [], houses: [], factions: [], regions: [],
  activeTab: 'characters', query: '', filters: { region: '', house: '', faction: '' },
  deferredPrompt: null
};

const $ = (id) => document.getElementById(id);
const norm = (v) => String(v || '').toLowerCase().trim();
const title = (v) => String(v || '').replace(/_/g, ' ');
const byId = () => Object.fromEntries(state.characters.map(c => [c.character_id, c]));

async function loadJson(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Could not load ${path}`);
  return res.json();
}

async function boot() {
  try {
    [state.characters, state.relationships, state.houses, state.factions, state.regions] = await Promise.all([
      loadJson('characters_player.json'), loadJson('relationships_player.json'), loadJson('houses.json'), loadJson('factions.json'), loadJson('regions.json')
    ]);
    populateFilters();
    bindEvents();
    render();
    registerServiceWorker();
  } catch (err) {
    $('results').innerHTML = `<div class="card"><h2>Could not load data</h2><p>${err.message}</p><p class="muted">Run this through a local server instead of opening the file directly.</p></div>`;
  }
}

function populateFilters() {
  fillSelect($('regionFilter'), unique(state.characters.map(c => c.region)).concat(state.regions.map(r => r.name || r.region_name)));
  fillSelect($('houseFilter'), unique(state.characters.map(c => c.house)).concat(state.houses.map(h => h.name || h.house_name)));
  fillSelect($('factionFilter'), unique(state.characters.flatMap(c => c.factions || [])).concat(state.factions.map(f => f.name || f.faction_name)));
}
function unique(arr) { return [...new Set(arr.filter(Boolean))].sort((a,b) => a.localeCompare(b)); }
function fillSelect(sel, values) { unique(values).forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; sel.appendChild(o); }); }

function bindEvents() {
  $('searchInput').addEventListener('input', e => { state.query = e.target.value; render(); });
  $('clearBtn').addEventListener('click', () => { $('searchInput').value=''; state.query=''; render(); });
  $('regionFilter').addEventListener('change', e => { state.filters.region = e.target.value; render(); });
  $('houseFilter').addEventListener('change', e => { state.filters.house = e.target.value; render(); });
  $('factionFilter').addEventListener('change', e => { state.filters.faction = e.target.value; render(); });
  document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); state.activeTab = btn.dataset.tab; render();
  }));
  $('closeDialog').addEventListener('click', () => $('detailDialog').close());
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); state.deferredPrompt = e; $('installBtn').classList.remove('hidden'); });
  $('installBtn').addEventListener('click', async () => { if (state.deferredPrompt) { state.deferredPrompt.prompt(); state.deferredPrompt = null; $('installBtn').classList.add('hidden'); } });
}

function haystack(c) {
  return [c.display_name, c.full_name, ...(c.aliases||[]), ...(c.titles||[]), c.house, c.family, c.dynasty, c.region, c.rank_or_role, c.year_born, c.year_died, c.age_831C, c.age_at_death, c.date_confidence, c.lineage_summary, ...(c.factions||[]), c.public_reputation, c.player_facing_summary].map(norm).join(' | ');
}
function characterMatches(c) {
  const q = norm(state.query);
  if (q && !haystack(c).includes(q)) return false;
  if (state.filters.region && c.region !== state.filters.region) return false;
  if (state.filters.house && c.house !== state.filters.house) return false;
  if (state.filters.faction && !(c.factions||[]).includes(state.filters.faction)) return false;
  return true;
}

function render() {
  const res = $('results');
  if (state.activeTab === 'characters') return renderCharacters(res);
  if (state.activeTab === 'houses') return renderEntities(res, state.houses, 'house');
  if (state.activeTab === 'regions') return renderEntities(res, state.regions, 'region');
  return renderEntities(res, state.factions, 'faction');
}

function renderCharacters(res) {
  const matches = state.characters.filter(characterMatches).sort((a,b) => (a.display_name||'').localeCompare(b.display_name||''));
  $('summary').textContent = `${matches.length} character${matches.length===1?'':'s'} found. ${state.characters.length} player-facing records loaded.`;
  res.innerHTML = matches.slice(0, 120).map(c => card(c)).join('') || `<div class="card"><h2>No matches</h2><p>Try another name, house, title, region, or faction.</p></div>`;
  res.querySelectorAll('[data-open]').forEach(btn => btn.addEventListener('click', () => openCharacter(btn.dataset.open)));
}

function card(c) {
  return `<article class="card">
    <h2>${escapeHtml(c.display_name || c.full_name)}</h2>
    <div class="meta">${pill(c.house)}${pill(c.region)}${pill(lifespan(c))}${pill(c.status_831C)}${pill(c.rank_or_role)}</div>
    <p>${escapeHtml(c.player_facing_summary || c.public_reputation || 'No public summary recorded yet.')}</p>
    ${c.canon_notes ? `<p class="muted">Canon note: ${escapeHtml(c.canon_notes)}</p>` : ''}
    <div class="card-actions"><button class="small-btn" data-open="${c.character_id}">View family</button></div>
  </article>`;
}
function pill(v) { return v ? `<span class="pill">${escapeHtml(v)}</span>` : ''; }
function lifespan(c) {
  const born = c.year_born && c.year_born !== 'Unknown' ? c.year_born : '';
  const died = c.year_died && c.year_died !== 'Unknown' ? c.year_died : '';
  if (born && died) return `${born}–${died}`;
  if (born && !died) return `b. ${born}`;
  if (!born && died) return `d. ${died}`;
  return '';
}

function renderEntities(res, list, type) {
  const q = norm(state.query);
  const rows = list.filter(x => norm(JSON.stringify(x)).includes(q));
  $('summary').textContent = `${rows.length} ${type}${rows.length===1?'':'s'} found.`;
  res.innerHTML = rows.map(x => {
    const name = x.name || x.house_name || x.region_name || x.faction_name || x.id || 'Unnamed';
    const desc = x.description || x.summary || x.player_facing_summary || x.notes || '';
    const related = state.characters.filter(c => {
      if (type === 'house') return c.house === name || c.family === name || c.dynasty === name;
      if (type === 'region') return c.region === name;
      return (c.factions||[]).includes(name);
    }).slice(0, 12);
    return `<article class="entity-card"><h2>${escapeHtml(name)}</h2><p>${escapeHtml(desc)}</p><div class="meta">${related.map(c => `<span class="pill">${escapeHtml(c.display_name)}</span>`).join('')}</div></article>`;
  }).join('') || `<div class="card"><h2>No matches</h2></div>`;
}

function openCharacter(id) {
  const map = byId(); const c = map[id]; if (!c) return;
  const rels = state.relationships.filter(r => r.source_character_id === id || r.target_character_id === id);
  const section = (label, ids) => `<h3 class="section-title">${label}</h3><div class="tree-grid">${ids.length ? ids.map(rid => relationRow(rid, map)).join('') : '<p class="muted">None recorded.</p>'}</div>`;
  $('detailContent').innerHTML = `<h2>${escapeHtml(c.display_name || c.full_name)}</h2>
    <div class="meta">${pill(c.house)}${pill(c.region)}${pill(lifespan(c))}${pill(c.status_831C)}${pill(c.rank_or_role)}</div>
    <p>${escapeHtml(c.player_facing_summary || 'No public summary recorded yet.')}</p>
    ${lifespan(c) ? `<p><strong>Recorded dates:</strong> ${escapeHtml(lifespan(c))}${c.age_at_death ? ` · age at death ${escapeHtml(c.age_at_death)}` : ''}${c.age_831C ? ` · age in 831 C ${escapeHtml(c.age_831C)}` : ''}${c.date_confidence ? ` <span class="muted">(${escapeHtml(c.date_confidence)})</span>` : ''}</p>` : ''}
    ${c.lineage_summary ? `<p><strong>Lineage:</strong> ${escapeHtml(c.lineage_summary)}</p>` : ''}
    ${c.public_reputation ? `<p><strong>Public reputation:</strong> ${escapeHtml(c.public_reputation)}</p>` : ''}
    ${section('Parents', c.parents || [])}
    ${section('Spouse / Partner', c.spouses_or_partners || [])}
    ${section('Betrothed', c.betrothed || [])}
    ${section('Children', c.children || [])}
    ${section('Siblings', c.siblings || [])}
    ${section('Ancestors', c.ancestors || [])}
    ${section('Descendants', c.descendants || [])}
    <h3 class="section-title">Relationship records</h3><div class="tree-grid">${rels.slice(0,30).map(r => relRecord(r, map, id)).join('') || '<p class="muted">None recorded.</p>'}</div>`;
  $('detailDialog').showModal();
}
function relationRow(id, map) { const c = map[id]; return `<div class="relation-row"><strong>${escapeHtml(c ? c.display_name : title(id))}</strong>${c ? `<span class="muted">${escapeHtml([c.house,c.rank_or_role,c.status_831C].filter(Boolean).join(' · '))}</span>` : '<span class="muted">Record not yet linked.</span>'}</div>`; }
function relRecord(r, map, currentId) { const otherId = r.source_character_id === currentId ? r.target_character_id : r.source_character_id; if (otherId === currentId) return ''; const c = map[otherId]; return `<div class="relation-row"><strong>${escapeHtml(title(r.relationship_type))}: ${escapeHtml(c ? c.display_name : title(otherId))}</strong><span class="muted">${escapeHtml(r.certainty || 'confirmed')}</span></div>`; }
function escapeHtml(s) { return String(s || '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }

function registerServiceWorker() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

boot();
