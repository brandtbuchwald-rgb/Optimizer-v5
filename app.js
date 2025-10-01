async function loadRules(){
  const res = await fetch("rules.json?ts="+Date.now());
  return res.json();
}

const state = { rules:null, slots:{}, focus:"DPS", caps:{AS:0,CR:0,EV:0,DR:0} };

function el(tag, cls, html){
  const e=document.createElement(tag);
  if(cls) e.className=cls;
  if(html!=null) e.innerHTML=html;
  return e;
}

function slotTemplate(slot){
  const card = el("div","card");
  card.appendChild(el("h3",null,slot));

  // Tier
  const tierRow = el("div","row");
  tierRow.innerHTML = `<label>Tier</label>`;
  const tierSel = el("select");
  state.rules.tiers.forEach(t => tierSel.appendChild(new Option(t,t)));
  tierSel.name = `${slot}:tier`;
  tierSel.addEventListener("input", onSlotChange);
  tierRow.appendChild(tierSel);
  card.appendChild(tierRow);

  // Rune
  const runeRow = el("div","row");
  runeRow.innerHTML = `<label>Rune</label>`;
  const runeSel = el("select");
  ["","ATK SPD","Crit Chance","Evasion","DR"].forEach(r=>runeSel.appendChild(new Option(r,r)));
  runeSel.name = `${slot}:rune`;
  runeSel.addEventListener("input", onSlotChange);
  runeRow.appendChild(runeSel);
  card.appendChild(runeRow);

  // Special line (Chaos/Abyss only)
  const specialRow = el("div","row");
  specialRow.innerHTML = `<label>Special Line</label>`;
  const spSel = el("select");
  ["","Crit DMG +80%","HP% +52%","Boss DMG","Racial DMG"].forEach(opt=>spSel.appendChild(new Option(opt,opt)));
  spSel.name = `${slot}:special`;
  spSel.addEventListener("input", onSlotChange);
  specialRow.appendChild(spSel);
  card.appendChild(specialRow);

  // Lines (3–4 normal lines)
  const lineStats = ["","ATK SPD","Crit Chance","Evasion","ATK%","Crit DMG%","HP%","DEF%","DR%"];
  const maxLines = (slot==="Weapon" ? 3 : 4);
  for(let i=1;i<=maxLines;i++){
    const row = el("div","row");
    const sel = el("select");
    lineStats.forEach(opt=>sel.appendChild(new Option(opt,opt)));
    sel.name = `${slot}:line${i}:stat`;
    sel.addEventListener("input", onSlotChange);

    const val = el("input");
    val.type = "number"; val.step="1"; val.min="0";
    val.name = `${slot}:line${i}:value`;
    val.addEventListener("input", onSlotChange);

    row.appendChild(sel); row.appendChild(val);
    card.appendChild(row);
  }

  return card;
}

function onSlotChange(e){
  const [slot,key]=e.target.name.split(":");
  state.slots[slot]=state.slots[slot]||{};
  state.slots[slot][key]=e.target.value;
  renderPreview();
  saveAuto();
}

function renderSlots(){
  const grid=document.getElementById("slotsGrid");
  grid.innerHTML="";
  state.rules.slots.forEach(slot=>{
    grid.appendChild(slotTemplate(slot));
  });
}

function renderPreview(){
  const wrap=document.getElementById("scSlots");
  wrap.innerHTML="";
  state.rules.slots.forEach(slot=>{
    const s=state.slots[slot]||{};
    const box=el("div","sc-slot");
    const img=el("img"); img.src=s.image||""; img.alt=slot;
    box.appendChild(img);
    const meta=el("div","sl-meta");
    meta.innerHTML=`<div><strong>${slot}</strong> ${s.tier||""}</div>
    <div>${s.lines||""}</div>`;
    box.appendChild(meta);
    wrap.appendChild(box);
  });
}

function saveAuto(){
  localStorage.setItem("redi-gearbuild",JSON.stringify(state.slots));
}
function loadSaved(){
  const raw=localStorage.getItem("redi-gearbuild");
  if(!raw) return;
  state.slots=JSON.parse(raw)||{};
  renderPreview();
}
function resetAll(){
  localStorage.removeItem("redi-gearbuild");
  state.slots={};
  renderSlots(); renderPreview();
}

async function exportPNG(){
  const node=document.getElementById("shareCard");
  const canvas=await html2canvas(node,{backgroundColor:null,scale:2,useCORS:true});
  const url=canvas.toDataURL("image/png");
  const a=document.createElement("a");
  a.href=url; a.download="build.png";
  a.click();
}

async function boot(){
  state.rules=await loadRules();
  renderSlots();
  renderPreview();
  document.getElementById("btnExport").addEventListener("click",exportPNG);
  document.getElementById("btnSave").addEventListener("click",()=>saveAuto());
  document.getElementById("btnLoad").addEventListener("click",()=>loadSaved());
  document.getElementById("btnReset").addEventListener("click",()=>resetAll());
}

document.addEventListener("DOMContentLoaded",boot);
