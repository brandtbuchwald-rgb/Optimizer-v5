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
  const card=el("div","card");
  card.dataset.slot=slot;
  card.appendChild(el("h3",null,slot));

  // Tier select
  const tierRow=el("div","row");
  tierRow.appendChild(el("label",null,"Tier"));
  const sel=el("select");
  state.rules.tiers.forEach(t=>{
    const o=el("option",null,t); sel.appendChild(o);
  });
  sel.name=`${slot}:tier`;
  sel.addEventListener("input",onSlotChange);
  tierRow.appendChild(sel);
  card.appendChild(tierRow);

  // Lines
  const lineRow=el("div","row");
  lineRow.appendChild(el("label",null,"Lines"));
  const inp=el("input"); inp.type="text"; inp.name=`${slot}:lines`; inp.placeholder="e.g. Crit, Eva, HP%";
  inp.addEventListener("input",onSlotChange);
  lineRow.appendChild(inp);
  card.appendChild(lineRow);

  // Image
  const imgRow=el("div","row");
  imgRow.appendChild(el("label",null,"Image URL"));
  const url=el("input"); url.type="url"; url.name=`${slot}:image`; url.placeholder="https://...";
  url.addEventListener("input",onSlotChange);
  imgRow.appendChild(url);
  card.appendChild(imgRow);

  // Show default 5th stat if any
  const rules=state.rules.slotRules[slot];
  if(rules && rules.fifthStat){
    card.appendChild(el("div","tag purple",`5th: ${rules.fifthStat.name} ${rules.fifthStat.value||""}`));
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
