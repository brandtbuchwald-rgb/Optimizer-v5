// Tiny helper: fetch JSON with cache-bust
async function loadRules(){
  const res = await fetch(`rules.json?ts=${Date.now()}`);
  return res.json();
}

const state = {
  rules: null,
  focus: 'DPS',
  caps: { AS: 0, CR: 0, EV: 0, DR: 0 },
  slots: {}
};

const SLOT_FIELDS = (slot)=>([
  {key:'tier', type:'select', label:'Tier', options: state.rules?.tiers || []},
  {key:'wb', type:'select', label:'WB/PvP', options:['None','World Boss','PvP']},
  {key:'fifth', type:'text', label:'5th Stat'},
  {key:'lines', type:'text', label:'Lines (comma)'},
  {key:'image', type:'url', label:'Image URL'}
]);

function el(tag, cls, html){
  const e = document.createElement(tag);
  if(cls) e.className = cls;
  if(html!=null) e.innerHTML = html;
  return e;
}

function readFocus(){
  const v = [...document.querySelectorAll('input[name="focus"]')].find(r=>r.checked)?.value || 'DPS';
  state.focus = v;
  document.getElementById('badgeFocus').textContent = v;
  renderCapsHints();
  renderShareCard();
}

function renderCapsHints(){
  const dps = state.focus === 'DPS';
  document.querySelector('.caps .cap-item .hint').textContent = dps ? 'Target 0.25 for DPS cap' : 'Tank may ignore this';
}

function initCaps(){
  const bind = (id, key, fmt=(x)=>x)=>{
    const inp = document.getElementById(id);
    const upd = ()=>{
      let v = parseFloat(inp.value||0);
      if(Number.isNaN(v)) v=0;
      state.caps[key] = v;
      renderShareCard();
      policeCaps();
      saveAuto();
    };
    inp.addEventListener('input', upd);
  };
  bind('inpAS','AS'); bind('inpCR','CR'); bind('inpEV','EV'); bind('inpDR','DR');
}

function policeCaps(){
  const {caps, rules, focus} = state;
  const alerts = [];
  if (focus==='DPS' && caps.AS>0 && caps.AS>rules.caps.dpsTargetAS){ alerts.push(`AS slower than target (${caps.AS.toFixed(3)}s > ${rules.caps.dpsTargetAS.toFixed(2)}s)`); }
  if (caps.CR>rules.caps.critFromGearRune) alerts.push(`Crit over gear+rune cap (${caps.CR} > ${rules.caps.critFromGearRune})`);
  if (caps.EV>rules.caps.evaFromGearRune) alerts.push(`Evasion over gear+rune cap (${caps.EV} > ${rules.caps.evaFromGearRune})`);
  if (focus==='TANK' && caps.DR<rules.caps.tankDRTarget) alerts.push(`DR below 100% target (${caps.DR} < ${rules.caps.tankDRTarget})`);
  // show inline on topbar as needed
  // Could be extended to per-slot policing later
}

function slotTemplate(slot){
  const card = el('div','card');
  card.dataset.slot = slot;

  const title = el('h3', null, slot);
  card.appendChild(title);

  const body = el('div');

  const fields = SLOT_FIELDS(slot);
  fields.forEach(f=>{
    const row = el('div','row');
    row.appendChild(el('label',null,f.label));
    let input;
    if(f.type==='select'){
      input = el('select');
      f.options.forEach(opt=>{
        const o = el('option'); o.value = opt; o.textContent = opt; input.appendChild(o);
      });
    } else {
      input = el('input'); input.type = f.type;
      if(f.key==='lines') input.placeholder = 'e.g. Crit Chance, Evasion, HP%';
      if(f.key==='fifth') input.placeholder = '(auto for some slots; you can override)';
      if(f.key==='image') input.placeholder = 'https://...';
    }
    input.name = `${slot}:${f.key}`;
    input.addEventListener('input', onSlotChange);
    row.appendChild(input);
    body.appendChild(row);
  });

  // Inline notes and 5th stat hints
  const rules = state.rules.slotRules[slot] || {};
  const tags = el('div','stat-lines');
  if(rules.fifthStat){
    tags.appendChild(el('span','tag purple',`5th: ${rules.fifthStat.name} ${rules.fifthStat.value||''}`));
  }
  if(rules.inlineChoices){
    rules.inlineChoices.forEach(x=> tags.appendChild(el('span','tag',`Inline: ${x}`)));
  }
  if(rules.notes){
    rules.notes.forEach(x=> tags.appendChild(el('span','tag',x)));
  }
  card.appendChild(tags);

  return card;
}

function onSlotChange(e){
  const [slot,key] = e.target.name.split(':');
  state.slots[slot] = state.slots[slot] || {};
  state.slots[slot][key] = e.target.value;
  // Auto-fill 5th stat if empty and slot has default
  if(key==='tier' && (!state.slots[slot].fifth || state.slots[slot].fifth.trim()==='')){
    const r = state.rules.slotRules[slot];
    if(r && r.fifthStat){
      if(!r.fifthStat.tiers || r.fifthStat.tiers.includes(e.target.value)){
        state.slots[slot].fifth = `${r.fifthStat.name} ${r.fifthStat.value||''}`;
        const input = document.querySelector(`input[name="${slot}:fifth"]`);
        if(input) input.value = state.slots[slot].fifth;
      }
    }
  }
  renderShareCard();
  saveAuto();
}

function renderSlots(){
  const grid = document.getElementById('slotsGrid');
  grid.innerHTML = '';
  state.rules.slots.forEach(slot=>{
    grid.appendChild(slotTemplate(slot));
  });
}

function renderShareCard(){
  // header badges
  document.getElementById('badgeFocus').textContent = state.focus;
  document.getElementById('badgeStamp').textContent = 'v'+(state.rules.version||'4');

  // stats
  document.getElementById('scAS').textContent = (state.caps.AS||0).toFixed(3);
  document.getElementById('scCR').textContent = (state.caps.CR||0);
  document.getElementById('scEV').textContent = (state.caps.EV||0);
  document.getElementById('scDR').textContent = (state.caps.DR||0);

  // slots summary
  const wrap = document.getElementById('scSlots');
  wrap.innerHTML = '';
  state.rules.slots.forEach(slot=>{
    const data = state.slots[slot]||{};
    const box = el('div','sc-slot');
    const img = el('img'); img.src = data.image || '';
    img.alt = slot;
    box.appendChild(img);
    const meta = el('div','sl-meta');
    meta.innerHTML = `<div><strong>${slot}</strong> <span class="o">${data.tier||''}${data.wb && data.wb!=='None' ? ' • '+data.wb:''}</span></div>
      <div class="o">${(data.fifth||'').trim()}</div>
      <div>${(data.lines||'').trim()}</div>`;
    box.appendChild(meta);
    wrap.appendChild(box);
  });

  // style caps color hints
  const as = state.caps.AS||0, cr=state.caps.CR||0, ev=state.caps.EV||0, dr=state.caps.DR||0;
  const r = state.rules.caps;
  document.getElementById('scAS').className = (state.focus==='DPS' && as>0 && as<=r.dpsTargetAS) ? 'good':'';
  document.getElementById('scCR').className = (cr<=r.critFromGearRune)?'good':'bad';
  document.getElementById('scEV').className = (ev<=r.evaFromGearRune)?'good':'bad';
  document.getElementById('scDR').className = (state.focus==='TANK' && dr>=r.tankDRTarget)?'good':'';
}

async function exportPNG(){
  const node = document.getElementById('shareCard');
  const canvas = await html2canvas(node, {backgroundColor: null, scale: 2, useCORS: true});
  const url = canvas.toDataURL('image/png');
  // iOS friendly download: open in new tab; user can long-press to save
  const a = document.createElement('a');
  a.href = url;
  a.download = 'rediscover-build.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function saveAuto(){
  const payload = {
    focus: state.focus, caps: state.caps, slots: state.slots, ver: state.rules.version
  };
  localStorage.setItem('redi-gearbuild', JSON.stringify(payload));
}

function loadSaved(){
  const raw = localStorage.getItem('redi-gearbuild');
  if(!raw) return;
  const data = JSON.parse(raw);
  // restore focus
  const r = document.querySelector(`input[name="focus"][value="${data.focus||'DPS'}"]`);
  if(r){ r.checked = true; state.focus = data.focus; }
  // restore caps
  state.caps = data.caps || state.caps;
  document.getElementById('inpAS').value = state.caps.AS||'';
  document.getElementById('inpCR').value = state.caps.CR||'';
  document.getElementById('inpEV').value = state.caps.EV||'';
  document.getElementById('inpDR').value = state.caps.DR||'';
  // restore slots
  state.slots = data.slots || {};
  // push values into inputs
  state.rules.slots.forEach(slot=>{
    const s = state.slots[slot]||{};
    const set = (key,val)=>{
      const q = document.querySelector(`[name="${slot}:${key}"]`);
      if(q && val!=null){ q.value = val; }
    };
    set('tier', s.tier||'');
    set('wb', s.wb||'None');
    set('fifth', s.fifth||'');
    set('lines', s.lines||'');
    set('image', s.image||'');
  });
  renderShareCard();
}

function resetAll(){
  localStorage.removeItem('redi-gearbuild');
  state.caps = {AS:0,CR:0,EV:0,DR:0};
  state.slots = {};
  document.querySelectorAll('input[type="number"]').forEach(i=>i.value='');
  document.querySelectorAll('#slotsGrid select').forEach(s=>s.value=s.querySelector('option')?.value || '');
  document.querySelectorAll('#slotsGrid input[type="text"], #slotsGrid input[type="url"]').forEach(i=>i.value='');
  renderShareCard();
}

async function boot(){
  state.rules = await loadRules();
  renderSlots();
  initCaps();
  readFocus();
  renderShareCard();

  document.querySelectorAll('input[name="focus"]').forEach(r=>r.addEventListener('change', readFocus));
  document.getElementById('btnExport').addEventListener('click', exportPNG);
  document.getElementById('btnSave').addEventListener('click', ()=>{ saveAuto(); alert('Saved. If this vanishes, blame Safari.'); });
  document.getElementById('btnLoad').addEventListener('click', ()=>{ loadSaved(); });
  document.getElementById('btnReset').addEventListener('click', resetAll);

  // try load
  loadSaved();
}

document.addEventListener('DOMContentLoaded', boot);
