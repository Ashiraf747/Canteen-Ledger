(function(){

// ⚠️ EDIT THIS — paste your own Apps Script Web App URL here (the one
// ending in /exec, from Deploy → Manage deployments).
const APPS_SCRIPT_URL = 'https://script.google.com/https://script.google.com/macros/s/AKfycbwlgcN7G_7Idu2lsa3NIrsmSR2AobOdt2AEHfnCbxAVp65aOUUfhLB4HTrMfWFp7LBK/exec';

if('serviceWorker' in navigator){
  window.addEventListener('load', ()=> navigator.serviceWorker.register('sw.js').catch(()=>{}));
}

// ---------------------------------------------------------------- themes

const THEMES = [
  {name:'Chalkboard', board:'#1B2B22', board2:'#26392C', chalk:'#F1EDE4', amber:'#D98E2B', amberDim:'#F3DDB2', clay:'#B84B36', clayDim:'#F3D9D2', sage:'#5C8065', sageDim:'#DCE8DE', paper:'#FBFAF7', paperDim:'#F1EEE6', line:'#DFDACB'},
  {name:'Harvest', board:'#3B2416', board2:'#4E3220', chalk:'#F5ECDD', amber:'#C97B2E', amberDim:'#F0D9AE', clay:'#A6402A', clayDim:'#F0D3C9', sage:'#7A8B4A', sageDim:'#DEE6C9', paper:'#FBF7EF', paperDim:'#F3ECDD', line:'#E4D8C0'},
  {name:'Lagoon', board:'#0E2A3B', board2:'#153A50', chalk:'#EAF3F5', amber:'#2C9C8F', amberDim:'#C9EAE5', clay:'#C1543E', clayDim:'#F3D6CE', sage:'#3E6E8E', sageDim:'#D3E4EC', paper:'#F6FAFB', paperDim:'#EAF1F3', line:'#D3E1E5'},
  {name:'Berry', board:'#2E1930', board2:'#3E2140', chalk:'#F3E8EE', amber:'#C77D3A', amberDim:'#EED9BC', clay:'#A33B4E', clayDim:'#F0D3D8', sage:'#7D5C86', sageDim:'#E4DAE8', paper:'#FAF6F8', paperDim:'#F1E9EE', line:'#E3D6E0'},
  {name:'Savanna', board:'#33270F', board2:'#473419', chalk:'#F6EEDD', amber:'#CC8B2C', amberDim:'#F1DDB0', clay:'#A6432B', clayDim:'#F0D4C9', sage:'#6E7A3E', sageDim:'#DCE3C6', paper:'#FBF8F0', paperDim:'#F2ECDC', line:'#E5DAC2'},
  {name:'Slate', board:'#1E2530', board2:'#28313F', chalk:'#EDEFF3', amber:'#D9A441', amberDim:'#F1E2BE', clay:'#B8503B', clayDim:'#F0D6CD', sage:'#4E6E7E', sageDim:'#D6E4E8', paper:'#F8F9FB', paperDim:'#EEF0F4', line:'#DDE2E8'}
];
function dayOfYear(d){ const start = new Date(d.getFullYear(),0,0); return Math.floor((d - start) / 86400000); }
function applyDailyTheme(){
  const t = THEMES[dayOfYear(new Date()) % THEMES.length];
  const root = document.documentElement.style;
  root.setProperty('--board', t.board); root.setProperty('--board-2', t.board2);
  root.setProperty('--chalk', t.chalk); root.setProperty('--amber', t.amber);
  root.setProperty('--amber-dim', t.amberDim); root.setProperty('--clay', t.clay);
  root.setProperty('--clay-dim', t.clayDim); root.setProperty('--sage', t.sage);
  root.setProperty('--sage-dim', t.sageDim); root.setProperty('--paper', t.paper);
  root.setProperty('--paper-dim', t.paperDim); root.setProperty('--line', t.line);
}
applyDailyTheme();

const CATEGORY_STYLE = {
  Eats:{icon:'🍽️', color:'var(--cat-eats)'}, Drinks:{icon:'🥤', color:'var(--cat-drinks)'},
  Stationary:{icon:'✏️', color:'var(--cat-stationary)'}, Sanitory:{icon:'🧴', color:'var(--cat-sanitory)'},
  Cutlery:{icon:'🍴', color:'var(--cat-cutlery)'}, Others:{icon:'📦', color:'var(--cat-others)'}
};
function catIcon(cat){ return (CATEGORY_STYLE[cat]||{}).icon || '•'; }
function catColor(cat){ return (CATEGORY_STYLE[cat]||{}).color || 'var(--sage)'; }
function catPill(cat){ return `<span class="cat-pill" style="background:${catColor(cat)}">${catIcon(cat)} ${cat}</span>`; }

// ---------------------------------------------------------------- font size

function applyFontScale(){
  const scale = Number(localStorage.getItem('cl_fontscale')) || 1;
  document.body.style.zoom = scale;
}
function adjustFontScale(delta){
  let scale = Number(localStorage.getItem('cl_fontscale')) || 1;
  scale = Math.min(1.4, Math.max(0.85, +(scale+delta).toFixed(2)));
  localStorage.setItem('cl_fontscale', scale);
  applyFontScale();
}
applyFontScale();

function renderDateHeader(){
  const now = new Date();
  document.getElementById('dayName').textContent = now.toLocaleDateString(undefined,{weekday:'long'});
  document.getElementById('dateFull').textContent = now.toLocaleDateString(undefined,{day:'numeric', month:'short', year:'numeric'});
}
renderDateHeader();
setInterval(renderDateHeader, 60000);

// ---------------------------------------------------------------- state

const DEFAULT_SETTINGS = {overheadPct:15, wastagePct:5, packaging:100, marginPct:20, roundTo:100, expiryWindowDays:7, reorderDays:3, bufferDays:2, unusualPct:40, pin:'', currency:'UGX', backupEmail:'', checkinMorning:'06:00-10:00', checkinBreak:'11:00-12:30', checkinLunch:'13:30-15:30', checkinEvening:'20:30-22:00'};
let state = { catalog:[], entries:[], liabilities:[], bills:[], assets:[], footfall:[], settings:{...DEFAULT_SETTINGS} };
let queue = [];
let charts = {};

const $ = (id) => document.getElementById(id);
const todayStr = () => new Date().toISOString().slice(0,10);
const fmt = (n) => (n===null||n===undefined||n===''||isNaN(n)) ? '—' : Math.round(Number(n)).toLocaleString();
const daysBetween = (a,b) => Math.round((new Date(b) - new Date(a)) / 86400000);

function loadLocal(){
  try{ const d = localStorage.getItem('cl_data'); if(d) state = JSON.parse(d); }catch(e){}
  try{ const q = localStorage.getItem('cl_queue'); if(q) queue = JSON.parse(q); }catch(e){}
}
function saveLocal(){
  try{ localStorage.setItem('cl_data', JSON.stringify(state)); }catch(e){}
  try{ localStorage.setItem('cl_queue', JSON.stringify(queue)); }catch(e){}
}

function showToast(msg){
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 1800);
}

// ---------------------------------------------------------------- net status

function setNetStatus(mode, text){
  const el = $('netStatus');
  el.className = 'netstatus' + (mode==='offline'?' offline':mode==='syncing'?' syncing':'');
  $('netStatusText').textContent = text;
}

// ---------------------------------------------------------------- RPC wrapper

function gsrun(fnName, ...args){
  if(fnName === 'getAllData'){
    return fetch(APPS_SCRIPT_URL + '?fn=getAllData')
      .then(r=>r.json())
      .then(j=>{ if(!j.ok) throw new Error(j.result); return j.result; });
  }
  // everything else (syncBatch) goes via POST as text/plain, deliberately —
  // this avoids a CORS preflight that Apps Script can't answer.
  return fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ fn: fnName, args })
  })
    .then(r=>r.json())
    .then(j=>{ if(!j.ok) throw new Error(j.result); return j.result; });
}

// ---------------------------------------------------------------- queue / sync

function queueOp(type, payload){
  const clientId = 'c'+Date.now()+Math.floor(Math.random()*10000);
  queue.push({type, payload, clientId});
  saveLocal();
  flushQueue(); // fire and forget
  return clientId;
}

let flushing = false;
async function flushQueue(){
  if(flushing) return;
  if(!queue.length){
    // still try a light refresh if online and idle
    return;
  }
  flushing = true;
  setNetStatus('syncing', 'Syncing…');
  try{
    const batch = queue.slice();
    const res = await gsrun('syncBatch', batch);
    // success: server has processed the batch, adopt fresh dataset
    queue = queue.filter(q => !batch.find(b => b.clientId === q.clientId));
    state = res.data;
    saveLocal();
    setNetStatus('online', 'Online · synced');
    renderAll();
  }catch(err){
    setNetStatus('offline', 'Offline — changes saved on this device');
  }finally{
    flushing = false;
  }
}

async function refreshFromServer(silent){
  try{
    if(!silent) setNetStatus('syncing', 'Connecting…');
    const fresh = await gsrun('getAllData');
    if(queue.length){
      // push queued changes first, which also returns a fresh snapshot
      await flushQueue();
    } else {
      state = fresh;
      saveLocal();
    }
    setNetStatus('online', 'Online · up to date');
    renderAll();
  }catch(err){
    setNetStatus('offline', 'Offline — showing data saved on this device');
  }
}

window.addEventListener('online', ()=> refreshFromServer(false));
window.addEventListener('offline', ()=> setNetStatus('offline','Offline — changes saved on this device'));
setInterval(()=>{ if(navigator.onLine) refreshFromServer(true); }, 45000);

// ---------------------------------------------------------------- pricing

function sellingPrice(cost){
  if(cost===null||cost===undefined||cost===''||isNaN(cost)) return null;
  const s = state.settings;
  const landed = (Number(cost) * (1 + Number(s.overheadPct)/100 + Number(s.wastagePct)/100)) + Number(s.packaging);
  const price = landed / (1 - Number(s.marginPct)/100);
  const roundTo = Number(s.roundTo) || 1;
  return Math.ceil(price / roundTo) * roundTo;
}

// ---------------------------------------------------------------- derived helpers

function itemById(id){ return state.catalog.find(i=>i.ID===id); }
function activeCatalog(){ return state.catalog.filter(i => i.Active !== 'No'); }
function entriesForItem(id){ return state.entries.filter(e=>e.ItemID===id).sort((a,b)=> a.Date.localeCompare(b.Date)); }
function lastEntryFor(id){ const l = entriesForItem(id); return l.length ? l[l.length-1] : null; }
function closingStock(e){ return (Number(e.Opening)||0) + (Number(e.Purchased)||0) - (Number(e.Sold)||0); }

function avgDailySold(id, excludeDate){
  const list = entriesForItem(id).filter(e => e.Date !== excludeDate);
  if(!list.length) return null;
  const withSales = list.filter(e => Number(e.Sold) > 0);
  if(!withSales.length) return 0;
  return withSales.reduce((s,e)=> s+Number(e.Sold),0) / withSales.length;
}

function buildAnalytics(){
  const expiring=[], low=[], restock=[], unusual=[], velocity=[];
  const today = todayStr();
  const s = state.settings;

  activeCatalog().forEach(item=>{
    const last = lastEntryFor(item.ID);
    const stock = last ? closingStock(last) : 0;
    const avg = avgDailySold(item.ID, null);

    entriesForItem(item.ID).forEach(e=>{
      if(e.Expiry){
        const d = daysBetween(today, e.Expiry);
        const remaining = closingStock(e);
        if(remaining > 0 && d <= Number(s.expiryWindowDays)) expiring.push({item, days:d, qty:remaining, expiry:e.Expiry});
      }
    });

    if(last){
      if(stock <= 0) low.push({item, stock, status:'out'});
      else if(avg && avg>0 && (stock/avg) < Number(s.reorderDays)) low.push({item, stock, status:'low', cover: stock/avg});

      if(avg && avg>0){
        const cover = stock/avg;
        if(cover < Number(s.reorderDays)){
          const targetQty = Math.ceil(avg * (Number(s.reorderDays)+Number(s.bufferDays)) - stock);
          if(targetQty > 0) restock.push({item, avg, cover, suggestQty: targetQty});
        }
      }
    }

    entriesForItem(item.ID).filter(e => daysBetween(e.Date,today)<=14 && daysBetween(e.Date,today)>=0).forEach(e=>{
      const base = avgDailySold(item.ID, e.Date);
      if(base && base>0 && Number(e.Sold)>0){
        const dev = ((Number(e.Sold)-base)/base)*100;
        if(Math.abs(dev) >= Number(s.unusualPct)) unusual.push({item, date:e.Date, sold:Number(e.Sold), avg:base, dev});
      }
    });

    if(avg !== null) velocity.push({item, avg, stock, cover: avg>0 ? stock/avg : null});
  });

  expiring.sort((a,b)=>a.days-b.days);
  restock.sort((a,b)=>a.cover-b.cover);
  unusual.sort((a,b)=>b.date.localeCompare(a.date));
  const withSales = velocity.filter(v=>v.avg>0);
  const fast = [...withSales].sort((a,b)=>b.avg-a.avg).slice(0,5);
  const slow = [...withSales].sort((a,b)=>a.avg-b.avg).slice(0,5);

  return {expiring, low, restock, unusual, fast, slow, velocity};
}

function financeSummary(){
  let stockValue = 0;
  activeCatalog().forEach(item=>{
    const last = lastEntryFor(item.ID);
    if(last) stockValue += closingStock(last) * (Number(last.Cost)||0);
  });
  const assetsValue = state.assets.reduce((s,a)=> s+(Number(a.Value)||0), 0);
  const owed = state.liabilities.reduce((s,l)=>{
    const amt = Number(l.Amount)||0;
    return s + (l.Type === 'Repayment' ? -Math.abs(amt) : Math.abs(amt));
  }, 0);
  const unpaidBills = state.bills.filter(b=>b.Paid!=='Yes').reduce((s,b)=> s+(Number(b.Amount)||0), 0);
  const net = stockValue + assetsValue - owed - unpaidBills;
  return {stockValue, assetsValue, owed, unpaidBills, net};
}

// ---------------------------------------------------------------- check-in windows

function parseWindow(str){
  const [a,b] = (str||'').split('-');
  const toH = (t) => { const [h,m] = (t||'0:0').split(':').map(Number); return h + (m||0)/60; };
  return { start: toH(a), end: toH(b) };
}
function nowHour(){ const n = new Date(); return n.getHours() + n.getMinutes()/60; }

function checkinStatus(){
  const s = state.settings;
  const windows = [
    {key:'morning', label:'Morning stock-in', icon:'🌅', range: parseWindow(s.checkinMorning)},
    {key:'break', label:'Break-time sales', icon:'🥪', range: parseWindow(s.checkinBreak)},
    {key:'lunch', label:'Lunch-time sales', icon:'🍛', range: parseWindow(s.checkinLunch)},
    {key:'evening', label:'Evening wrap-up', icon:'🌙', range: parseWindow(s.checkinEvening)}
  ];
  const today = todayStr();
  const now = nowHour();
  const todaysEntries = state.entries.filter(e=>e.Date===today);

  return windows.map(w=>{
    const hasEntry = todaysEntries.some(e=>{
      if(!e.Timestamp) return false;
      const t = new Date(e.Timestamp);
      if(isNaN(t)) return false;
      const h = t.getHours() + t.getMinutes()/60;
      return h >= w.range.start && h < w.range.end;
    });
    let status;
    if(hasEntry) status = 'done';
    else if(now < w.range.start) status = 'upcoming';
    else if(now < w.range.end) status = 'due';
    else status = 'missed';
    return {...w, status};
  });
}

function renderCheckins(){
  const rows = checkinStatus();
  const cls = {done:'info', due:'warn', missed:'danger', upcoming:'neutral'};
  const tag = {done:'Logged ✓', due:'Due now', missed:'Missed', upcoming:'Later'};
  $('listCheckin').innerHTML = rows.map(r=>{
    const range = `${String(Math.floor(r.range.start)).padStart(2,'0')}:${String(Math.round((r.range.start%1)*60)).padStart(2,'0')}–${String(Math.floor(r.range.end)).padStart(2,'0')}:${String(Math.round((r.range.end%1)*60)).padStart(2,'0')}`;
    return `<div class="ticket ${cls[r.status]}"><div class="row1"><span class="name">${r.icon} ${r.label}</span><span class="tag">${tag[r.status]}</span></div>
      <div class="detail">${range}</div></div>`;
  }).join('');
  maybeNotify(rows);
}

let notifiedToday = {};
function maybeNotify(rows){
  if(localStorage.getItem('cl_notify') !== '1') return;
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  const today = todayStr();
  rows.forEach(r=>{
    if(r.status !== 'due') return;
    const flagKey = 'cl_notified_'+today+'_'+r.key;
    if(localStorage.getItem(flagKey)) return;
    new Notification('Canteen Ledger', { body: `${r.label} is due — log today's entries.` });
    localStorage.setItem(flagKey, '1');
  });
}

// ---------------------------------------------------------------- footfall (customer tally)

function todayFootfallCount(){
  const row = state.footfall.find(f=>f.Date===todayStr());
  return row ? Number(row.Count)||0 : 0;
}
function renderTally(){
  $('tallyValue').textContent = todayFootfallCount();
}

// ---------------------------------------------------------------- render: dashboard

function renderHeaderSub(){
  const n = activeCatalog().length;
  const logged = new Set(state.entries.map(e=>e.Date)).size;
  $('headerSub').textContent = `${n} items · ${logged} day${logged===1?'':'s'} logged`;
}

function renderDashboard(){
  renderTally();
  renderCheckins();
  const a = buildAnalytics();
  const fin = financeSummary();

  $('statStockValue').textContent = fmt(fin.stockValue);
  let todayRevenue = 0;
  state.entries.filter(e=>e.Date===todayStr()).forEach(e=>{
    const price = sellingPrice(e.Cost); if(price) todayRevenue += price*(Number(e.Sold)||0);
  });
  $('statRevenue').textContent = fmt(todayRevenue);
  $('statNet').textContent = fmt(fin.net);
  $('statNet').className = 'value num ' + (fin.net<0?'neg':'pos');
  $('statOwed').textContent = fmt(fin.owed);

  $('cntExpiring').textContent = a.expiring.length;
  $('listExpiring').innerHTML = a.expiring.length ? a.expiring.slice(0,20).map(x=>{
    const cls = x.days<=2?'danger':'warn';
    const label = x.days<0 ? `Expired ${Math.abs(x.days)}d ago` : (x.days===0?'Expires today':`${x.days}d left`);
    return `<div class="ticket ${cls}"><div class="row1"><span class="name">${x.item.Name}</span><span class="tag">${label}</span></div>
      <div class="detail"><b>${fmt(x.qty)}</b> ${x.item.Unit} on hand · expires ${x.expiry}</div></div>`;
  }).join('') : `<div class="empty">Nothing expiring soon.</div>`;

  $('cntLow').textContent = a.low.length;
  $('listLow').innerHTML = a.low.length ? a.low.map(x=>{
    if(x.status==='out') return `<div class="ticket danger"><div class="row1"><span class="name">${x.item.Name}</span><span class="tag">Out of stock</span></div><div class="detail">Closing stock is <b>0</b> or less.</div></div>`;
    return `<div class="ticket warn"><div class="row1"><span class="name">${x.item.Name}</span><span class="tag">${x.cover.toFixed(1)}d cover</span></div><div class="detail"><b>${fmt(x.stock)}</b> ${x.item.Unit} left, selling fast.</div></div>`;
  }).join('') : `<div class="empty">Stock levels look healthy.</div>`;

  $('cntRestock').textContent = a.restock.length;
  $('listRestock').innerHTML = a.restock.length ? a.restock.map(x=>
    `<div class="ticket info"><div class="row1"><span class="name">${x.item.Name}</span><span class="tag">order ~${fmt(x.suggestQty)} ${x.item.Unit}</span></div><div class="detail">Selling <b>${x.avg.toFixed(1)}</b>/day · <b>${x.cover.toFixed(1)}d</b> of stock left.</div></div>`
  ).join('') : `<div class="empty">Nothing needs reordering right now.</div>`;

  $('cntUnusual').textContent = a.unusual.length;
  $('listUnusual').innerHTML = a.unusual.length ? a.unusual.slice(0,15).map(x=>{
    const up = x.dev>0;
    return `<div class="ticket ${up?'info':'warn'}"><div class="row1"><span class="name">${x.item.Name}</span><span class="tag">${up?'+':''}${x.dev.toFixed(0)}%</span></div><div class="detail">${x.date}: sold <b>${fmt(x.sold)}</b> vs usual <b>${x.avg.toFixed(1)}</b>/day.</div></div>`;
  }).join('') : `<div class="empty">Sales have been steady.</div>`;

  $('listFast').innerHTML = a.fast.length ? a.fast.map(x=>
    `<div class="ticket info"><div class="row1"><span class="name">${x.item.Name}</span><span class="tag num">${x.avg.toFixed(1)}/day</span></div><div class="detail">${x.cover!==null?x.cover.toFixed(1)+'d of stock left':''}</div></div>`
  ).join('') : `<div class="empty">Log a few days to see your fastest sellers.</div>`;

  $('listSlow').innerHTML = a.slow.length ? a.slow.map(x=>
    `<div class="ticket warn"><div class="row1"><span class="name">${x.item.Name}</span><span class="tag num">${x.avg.toFixed(1)}/day</span></div><div class="detail">Slow to move — consider a smaller restock.</div></div>`
  ).join('') : `<div class="empty">Not enough sales data yet.</div>`;
}

// ---------------------------------------------------------------- render: entry

function populateItemSelect(){
  const sel = $('fItem');
  const cats = [...new Set(activeCatalog().map(i=>i.Category))];
  sel.innerHTML = cats.map(cat=>{
    const opts = activeCatalog().filter(i=>i.Category===cat).map(i=>`<option value="${i.ID}">${i.Name}</option>`).join('');
    return `<optgroup label="${catIcon(cat)} ${cat}">${opts}</optgroup>`;
  }).join('');
}

let selectedPayMethod = 'Cash';
function updateEntryPreview(){
  const itemId = $('fItem').value;
  const item = itemById(itemId);
  const opening = Number($('fOpening').value)||0;
  const purchased = Number($('fPurchased').value)||0;
  const cost = $('fCost').value===''? null : Number($('fCost').value);
  const sold = Number($('fSold').value)||0;
  const totalAvail = opening+purchased;
  const left = totalAvail-sold;
  const price = sellingPrice(cost!==null?cost:(item?item.CostPrice:null));
  const revenue = price ? price*sold : null;

  $('entryPreview').innerHTML = `
    <div class="row"><span>Total available</span><b class="num">${fmt(totalAvail)} ${item?item.Unit:''}</b></div>
    <div class="row"><span>Selling price / unit</span><b class="num">${price!==null?fmt(price):'set cost price'}</b></div>
    <div class="row"><span>Revenue today</span><b class="num">${revenue!==null?fmt(revenue):'—'}</b></div>
    <div class="row total"><span>Qty left in stock</span><b class="num">${fmt(left)} ${item?item.Unit:''}</b></div>
  `;
}

// ---------------------------------------------------------------- render: catalog

function renderCatalog(){
  const q = ($('catSearch').value||'').toLowerCase();
  const rows = activeCatalog().filter(i=>i.Name.toLowerCase().includes(q)).sort((a,b)=>a.Category.localeCompare(b.Category)||a.Name.localeCompare(b.Name));
  $('catalogBody').innerHTML = rows.map(i=>{
    const price = sellingPrice(i.CostPrice);
    return `<tr>
      <td>${i.Name}</td>
      <td>${catPill(i.Category)}</td>
      <td class="muted">${i.Unit}</td>
      <td><input type="number" class="num-in cost-input" data-id="${i.ID}" value="${i.CostPrice===null||i.CostPrice===undefined||i.CostPrice===''?'':i.CostPrice}" placeholder="—" style="width:75px;"></td>
      <td class="num">${price!==null?fmt(price):'—'}</td>
      <td><button class="btn link small" data-remove="${i.ID}">✕</button></td>
    </tr>`;
  }).join('');

  document.querySelectorAll('.cost-input').forEach(inp=>{
    inp.addEventListener('change', (ev)=>{
      const id = ev.target.dataset.id;
      const val = ev.target.value===''?null:Number(ev.target.value);
      const it = itemById(id); it.CostPrice = val;
      queueOp('updateItem', {id, fields:{CostPrice: val===null?'':val}});
      renderCatalog(); renderDashboard();
      showToast('Cost price saved');
    });
  });
  document.querySelectorAll('[data-remove]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(!confirm('Remove this item from the active catalogue?')) return;
      const id = btn.dataset.remove;
      const it = itemById(id); if(it) it.Active='No';
      queueOp('removeItem', {id});
      populateItemSelect(); renderCatalog(); renderDashboard();
      showToast('Item removed');
    });
  });
}

// ---------------------------------------------------------------- render: finance

function renderFinance(){
  const fin = financeSummary();
  $('finStock').textContent = fmt(fin.stockValue);
  $('finAssets').textContent = fmt(fin.assetsValue);
  $('finOwed').textContent = fmt(fin.owed);
  $('finBills').textContent = fmt(fin.unpaidBills);
  $('finNet').textContent = fmt(fin.net);
  $('finNet').style.color = fin.net<0 ? 'var(--clay)' : 'var(--sage)';

  const liabs = [...state.liabilities].sort((a,b)=>b.Date.localeCompare(a.Date));
  $('liabList').innerHTML = liabs.length ? liabs.map(l=>{
    const isRepay = l.Type==='Repayment';
    return `<div class="ticket ${isRepay?'info':'warn'}"><div class="row1"><span class="name">${l.Type}${l.Counterparty?' · '+l.Counterparty:''}</span><span class="tag num">${isRepay?'-':'+'}${fmt(l.Amount)}</span></div>
      <div class="detail">${l.Date}${l.Note?' · '+l.Note:''}</div></div>`;
  }).join('') : `<div class="empty">No loans or credit recorded yet.</div>`;

  const bills = [...state.bills].sort((a,b)=> (a.Paid==='Yes')-(b.Paid==='Yes') || (a.DueDate||'').localeCompare(b.DueDate||''));
  $('billList').innerHTML = bills.length ? bills.map(b=>{
    const paid = b.Paid==='Yes';
    return `<div class="ticket ${paid?'info':'danger'}"><div class="row1"><span class="name">${b.Description}</span><span class="tag">${paid?'Paid':fmt(b.Amount)}</span></div>
      <div class="detail">${paid ? 'Paid '+b.DatePaid : 'Due '+(b.DueDate||'—')+' · '+fmt(b.Amount)}</div>
      ${!paid?`<button class="btn link small" data-paid="${b.ID}" style="margin-top:2px;">Mark paid</button>`:''}
      </div>`;
  }).join('') : `<div class="empty">No pending bills.</div>`;
  document.querySelectorAll('[data-paid]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const b = state.bills.find(x=>x.ID===btn.dataset.paid);
      if(b){ b.Paid='Yes'; b.DatePaid=todayStr(); }
      queueOp('markBillPaid', {id: btn.dataset.paid, datePaid: todayStr()});
      renderFinance(); showToast('Bill marked paid');
    });
  });

  const assets = [...state.assets].sort((a,b)=>(b.DateAcquired||'').localeCompare(a.DateAcquired||''));
  $('assetList').innerHTML = assets.length ? assets.map(a=>
    `<div class="ticket info"><div class="row1"><span class="name">${a.Name}</span><span class="tag num">${fmt(a.Value)}</span></div>
     <div class="detail">${a.Category||''}${a.DateAcquired?' · acquired '+a.DateAcquired:''}${a.Notes?' · '+a.Notes:''}</div>
     <button class="btn link small" data-delasset="${a.ID}" style="margin-top:2px;">Remove</button></div>`
  ).join('') : `<div class="empty">No assets logged yet.</div>`;
  document.querySelectorAll('[data-delasset]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      state.assets = state.assets.filter(a=>a.ID!==btn.dataset.delasset);
      queueOp('deleteAsset', {id: btn.dataset.delasset});
      renderFinance(); showToast('Asset removed');
    });
  });
}

// ---------------------------------------------------------------- render: charts

function renderCharts(){
  const today = new Date();
  const days = [];
  for(let i=13;i>=0;i--){ const d=new Date(today); d.setDate(d.getDate()-i); days.push(d.toISOString().slice(0,10)); }
  const revByDay = days.map(d=>{
    return state.entries.filter(e=>e.Date===d).reduce((s,e)=>{ const p=sellingPrice(e.Cost); return s+(p?p*Number(e.Sold||0):0); },0);
  });

  const catValues = {};
  activeCatalog().forEach(item=>{
    const last = lastEntryFor(item.ID);
    if(last){ const v = closingStock(last)*(Number(last.Cost)||0); catValues[item.Category] = (catValues[item.Category]||0)+v; }
  });

  const a = buildAnalytics();
  const top = [...a.velocity].filter(v=>v.avg>0).sort((x,y)=>y.avg-x.avg).slice(0,8);

  const board = getComputedStyle(document.documentElement).getPropertyValue('--board').trim();
  const amber = getComputedStyle(document.documentElement).getPropertyValue('--amber').trim();
  const sage = getComputedStyle(document.documentElement).getPropertyValue('--sage').trim();
  const clay = getComputedStyle(document.documentElement).getPropertyValue('--clay').trim();

  Object.values(charts).forEach(c=>c && c.destroy());

  charts.revenue = new Chart($('chartRevenue'), {
    type:'line',
    data:{ labels: days.map(d=>d.slice(5)), datasets:[{ label:'Revenue', data: revByDay, borderColor: amber, backgroundColor: amber+'33', fill:true, tension:.3 }]},
    options:{ plugins:{legend:{display:false}}, scales:{ y:{ beginAtZero:true } } }
  });

  const catLabels = Object.keys(catValues);
  charts.category = new Chart($('chartCategory'), {
    type:'doughnut',
    data:{ labels: catLabels, datasets:[{ data: catLabels.map(k=>catValues[k]), backgroundColor:[amber,sage,clay,board,'#8a8a8a','#c9c9c9'] }]},
    options:{ plugins:{legend:{position:'bottom', labels:{boxWidth:12,font:{size:10}}}} }
  });

  charts.top = new Chart($('chartTop'), {
    type:'bar',
    data:{ labels: top.map(t=>t.item.Name), datasets:[{ label:'Avg/day', data: top.map(t=>t.avg), backgroundColor: sage }]},
    options:{ indexAxis:'y', plugins:{legend:{display:false}}, scales:{ x:{ beginAtZero:true } } }
  });
}

// ---------------------------------------------------------------- render: rules / history

function renderRulesForm(){
  const s = state.settings;
  $('rOverhead').value=s.overheadPct; $('rWastage').value=s.wastagePct; $('rPackaging').value=s.packaging;
  $('rMargin').value=s.marginPct; $('rRound').value=s.roundTo; $('rExpiryWindow').value=s.expiryWindowDays;
  $('rReorderDays').value=s.reorderDays; $('rBufferDays').value=s.bufferDays; $('rUnusualPct').value=s.unusualPct;
  $('rPin').value=s.pin||'';
  $('rBackupEmail').value=s.backupEmail||'';
  $('rCkMorning').value = s.checkinMorning||'';
  $('rCkBreak').value = s.checkinBreak||'';
  $('rCkLunch').value = s.checkinLunch||'';
  $('rCkEvening').value = s.checkinEvening||'';
  $('rNotifyToggle').checked = localStorage.getItem('cl_notify') === '1';
}

function renderHistory(){
  const q = ($('histSearch').value||'').toLowerCase();
  const rows = state.entries.filter(e=>{ const it=itemById(e.ItemID); return it && it.Name.toLowerCase().includes(q); }).sort((a,b)=>b.Date.localeCompare(a.Date));
  if(!rows.length){ $('historyList').innerHTML = `<div class="empty">No entries logged yet.</div>`; return; }
  $('historyList').innerHTML = rows.map(e=>{
    const it = itemById(e.ItemID);
    const price = sellingPrice(e.Cost);
    const revenue = price ? price*Number(e.Sold) : null;
    return `<div class="card" style="padding:11px 13px; margin-bottom:9px;">
      <div style="display:flex; justify-content:space-between;"><b>${it?it.Name:'(removed item)'}</b><span class="muted num" style="font-size:12px;">${e.Date}</span></div>
      <div class="detail" style="font-size:12.5px; color:#5B5848; margin-top:4px;">
        Opened <b>${fmt(e.Opening)}</b> · +<b>${fmt(e.Purchased)}</b> in (${e.PaymentMethod||'Cash'}) · sold <b>${fmt(e.Sold)}</b> · left <b class="num">${fmt(closingStock(e))}</b>
        ${e.Expiry?` · exp ${e.Expiry}`:''}${revenue!==null?` · revenue <b class="num">${fmt(revenue)}</b>`:''}
      </div>
      <button class="btn link small" data-eid="${e.ID}" style="margin-top:2px;">Delete entry</button>
    </div>`;
  }).join('');
  document.querySelectorAll('[data-eid]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      state.entries = state.entries.filter(e=>e.ID!==btn.dataset.eid);
      queueOp('deleteEntry', {id: btn.dataset.eid});
      renderHistory(); renderDashboard();
      showToast('Entry deleted');
    });
  });
}

// ---------------------------------------------------------------- render all

function renderAll(){
  renderHeaderSub();
  renderDashboard();
  populateItemSelect();
  renderCatalog();
  renderFinance();
  renderRulesForm();
  renderHistory();
  if(document.getElementById('view-charts').classList.contains('active')) renderCharts();
}
setInterval(()=>{ renderCheckins(); }, 60000);

// ---------------------------------------------------------------- events

function switchView(name){
  document.querySelectorAll('nav.tabs button').forEach(b=>b.classList.toggle('active', b.dataset.view===name));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active', v.id==='view-'+name));
  if(name==='dashboard') renderDashboard();
  if(name==='catalog') renderCatalog();
  if(name==='finance') renderFinance();
  if(name==='charts') renderCharts();
  if(name==='rules') renderRulesForm();
  if(name==='history') renderHistory();
  if(name==='entry') updateEntryPreview();
}

function wireEvents(){
  document.querySelectorAll('nav.tabs button').forEach(b=> b.addEventListener('click', ()=>switchView(b.dataset.view)));

  $('fontMinus').addEventListener('click', ()=> adjustFontScale(-0.1));
  $('fontPlus').addEventListener('click', ()=> adjustFontScale(0.1));

  $('tallyPlus').addEventListener('click', ()=>{
    const today = todayStr();
    let row = state.footfall.find(f=>f.Date===today);
    if(row) row.Count = Number(row.Count||0)+1; else state.footfall.push({Date:today, Count:1, LoggedBy:$('staffName').value||''});
    queueOp('incrementFootfall', {date:today, delta:1, loggedBy:$('staffName').value||''});
    renderTally();
  });
  $('tallyMinus').addEventListener('click', ()=>{
    const today = todayStr();
    let row = state.footfall.find(f=>f.Date===today);
    if(row) row.Count = Math.max(0, Number(row.Count||0)-1);
    queueOp('incrementFootfall', {date:today, delta:-1, loggedBy:$('staffName').value||''});
    renderTally();
  });

  document.querySelectorAll('#view-finance .subtabs button').forEach(b=>{
    b.addEventListener('click', ()=>{
      document.querySelectorAll('#view-finance .subtabs button').forEach(x=>x.classList.toggle('active', x===b));
      document.querySelectorAll('.fin-sub').forEach(s=> s.style.display = (s.id==='fin-'+b.dataset.sub) ? 'block':'none');
    });
  });

  $('fDate').value = todayStr();
  $('staffName').value = localStorage.getItem('cl_staffName') || '';
  $('staffName').addEventListener('change', ()=> localStorage.setItem('cl_staffName', $('staffName').value));

  ['fOpening','fPurchased','fCost','fSold','fItem'].forEach(id=>{
    $(id).addEventListener('input', updateEntryPreview);
    $(id).addEventListener('change', updateEntryPreview);
  });

  document.querySelectorAll('#payMethod button').forEach(b=>{
    b.addEventListener('click', ()=>{
      document.querySelectorAll('#payMethod button').forEach(x=>x.classList.toggle('active', x===b));
      selectedPayMethod = b.dataset.val;
    });
  });

  $('btnAutoOpen').addEventListener('click', ()=>{
    const last = lastEntryFor($('fItem').value);
    $('fOpening').value = last ? closingStock(last) : 0;
    updateEntryPreview();
  });

  $('btnSaveEntry').addEventListener('click', ()=>{
    const itemId = $('fItem').value;
    if(!itemId){ showToast('Pick an item first'); return; }
    const cost = $('fCost').value===''?null:Number($('fCost').value);
    const entry = {
      ID: 'tmp_'+Date.now(), Date: $('fDate').value||todayStr(), ItemID:itemId,
      Opening:Number($('fOpening').value)||0, Purchased:Number($('fPurchased').value)||0,
      Cost:cost, PaymentMethod:selectedPayMethod, Counterparty:$('fCounterparty').value||'',
      Expiry:$('fExpiry').value||'', Sold:Number($('fSold').value)||0,
      LoggedBy: $('staffName').value||'', Timestamp:new Date().toISOString()
    };
    state.entries.push(entry);
    const it = itemById(itemId);
    if(it && (it.CostPrice===null||it.CostPrice===undefined||it.CostPrice==='') && cost!==null) it.CostPrice = cost;

    queueOp('addEntry', {
      date:entry.Date, itemId, opening:entry.Opening, purchased:entry.Purchased, cost:entry.Cost,
      paymentMethod:entry.PaymentMethod, counterparty:entry.Counterparty, expiry:entry.Expiry,
      sold:entry.Sold, loggedBy:entry.LoggedBy
    });

    $('entryHint').textContent = 'Saved. Check Today for updated alerts.';
    $('fOpening').value=0; $('fPurchased').value=0; $('fSold').value=0; $('fExpiry').value=''; $('fCounterparty').value='';
    updateEntryPreview();
    renderHeaderSub(); renderDashboard();
    showToast('Entry saved');
  });

  $('catSearch').addEventListener('input', renderCatalog);
  $('histSearch').addEventListener('input', renderHistory);

  $('btnAddItem').addEventListener('click', ()=>{
    const name = $('newName').value.trim();
    if(!name){ showToast('Enter an item name'); return; }
    const tmpId = 'tmp_it_'+Date.now();
    const newItem = {ID:tmpId, Category:$('newCat').value, Name:name, Unit:$('newUnit').value.trim()||'pcs', CostPrice:null, Active:'Yes'};
    state.catalog.push(newItem);
    queueOp('addItem', {category:newItem.Category, name:newItem.Name, unit:newItem.Unit});
    $('newName').value=''; $('newUnit').value='';
    populateItemSelect(); renderCatalog(); renderHeaderSub();
    showToast('Item added');
  });

  document.querySelectorAll('#liabType button').forEach(b=>{
    b.addEventListener('click', ()=>{
      document.querySelectorAll('#liabType button').forEach(x=>x.classList.toggle('active', x===b));
    });
  });
  $('liabDate').value = todayStr();
  $('btnAddLiability').addEventListener('click', ()=>{
    const type = document.querySelector('#liabType button.active').dataset.val === 'Loan' ? 'Loan' : 'Repayment';
    const amount = Number($('liabAmount').value)||0;
    if(amount<=0){ showToast('Enter an amount'); return; }
    const rec = {ID:'tmp_l_'+Date.now(), Date:$('liabDate').value||todayStr(), Type:type, Counterparty:$('liabParty').value||'', Amount:amount, Note:$('liabNote').value||'', LoggedBy:$('staffName').value||''};
    state.liabilities.push(rec);
    queueOp('addLiability', {date:rec.Date, type:rec.Type, counterparty:rec.Counterparty, amount:rec.Amount, note:rec.Note, loggedBy:rec.LoggedBy});
    $('liabParty').value=''; $('liabAmount').value=''; $('liabNote').value='';
    renderFinance(); renderDashboard();
    showToast('Saved');
  });

  $('billDue').value = todayStr();
  $('btnAddBill').addEventListener('click', ()=>{
    const desc = $('billDesc').value.trim();
    const amount = Number($('billAmount').value)||0;
    if(!desc||amount<=0){ showToast('Fill description and amount'); return; }
    const rec = {ID:'tmp_b_'+Date.now(), Description:desc, Amount:amount, DueDate:$('billDue').value||'', Paid:'No', DatePaid:'', LoggedBy:$('staffName').value||''};
    state.bills.push(rec);
    queueOp('addBill', {description:desc, amount, dueDate:rec.DueDate, loggedBy:rec.LoggedBy});
    $('billDesc').value=''; $('billAmount').value='';
    renderFinance(); renderDashboard();
    showToast('Bill added');
  });

  $('assetDate').value = todayStr();
  $('btnAddAsset').addEventListener('click', ()=>{
    const name = $('assetName').value.trim();
    const value = Number($('assetValue').value)||0;
    if(!name){ showToast('Enter asset name'); return; }
    const rec = {ID:'tmp_a_'+Date.now(), Name:name, Category:$('assetCat').value||'', Value:value, DateAcquired:$('assetDate').value||'', Notes:''};
    state.assets.push(rec);
    queueOp('addAsset', {name, category:rec.Category, value, dateAcquired:rec.DateAcquired});
    $('assetName').value=''; $('assetCat').value=''; $('assetValue').value='';
    renderFinance(); renderDashboard();
    showToast('Asset added');
  });

  $('btnSaveRules').addEventListener('click', ()=>{
    state.settings = {
      overheadPct:Number($('rOverhead').value)||0, wastagePct:Number($('rWastage').value)||0,
      packaging:Number($('rPackaging').value)||0, marginPct:Number($('rMargin').value)||0,
      roundTo:Number($('rRound').value)||1, expiryWindowDays:Number($('rExpiryWindow').value)||7,
      reorderDays:Number($('rReorderDays').value)||3, bufferDays:Number($('rBufferDays').value)||2,
      unusualPct:Number($('rUnusualPct').value)||40, pin:$('rPin').value||'', currency: state.settings.currency||'UGX',
      backupEmail: $('rBackupEmail').value||'',
      checkinMorning:$('rCkMorning').value||DEFAULT_SETTINGS.checkinMorning,
      checkinBreak:$('rCkBreak').value||DEFAULT_SETTINGS.checkinBreak,
      checkinLunch:$('rCkLunch').value||DEFAULT_SETTINGS.checkinLunch,
      checkinEvening:$('rCkEvening').value||DEFAULT_SETTINGS.checkinEvening
    };
    queueOp('saveSettings', state.settings);
    renderCatalog(); renderDashboard();
    showToast('Settings saved');
  });

  $('rNotifyToggle').addEventListener('change', (ev)=>{
    if(ev.target.checked){
      if(!('Notification' in window)){ showToast('This browser doesn\'t support notifications'); ev.target.checked=false; return; }
      Notification.requestPermission().then(perm=>{
        if(perm === 'granted'){ localStorage.setItem('cl_notify','1'); showToast('Check-in alerts on'); }
        else { ev.target.checked=false; showToast('Permission not granted'); }
      });
    } else {
      localStorage.removeItem('cl_notify');
      showToast('Check-in alerts off');
    }
  });
}

// ---------------------------------------------------------------- PIN gate

function checkPin(){
  const pin = state.settings.pin;
  if(!pin){ return true; }
  const unlocked = sessionStorage.getItem('cl_pin_ok') === String(pin);
  if(unlocked) return true;
  $('pinGate').style.display = 'flex';
  $('pinSubmit').addEventListener('click', ()=>{
    if($('pinInput').value === String(pin)){
      sessionStorage.setItem('cl_pin_ok', String(pin));
      $('pinGate').style.display = 'none';
    } else {
      $('pinError').textContent = 'Incorrect PIN.';
    }
  });
  return false;
}

// ---------------------------------------------------------------- init

async function init(){
  loadLocal();
  wireEvents();

  if(state.catalog.length){
    // instant render from cache while we check the network
    if(checkPin()){
      renderAll();
      $('mainLoading').style.display='none';
      $('mainApp').style.display='block';
    }
  } else {
    setNetStatus('syncing','Connecting…');
  }

  try{
    const fresh = await gsrun('getAllData');
    if(!state.catalog.length){
      state = fresh; saveLocal();
      if(checkPin()){ renderAll(); $('mainLoading').style.display='none'; $('mainApp').style.display='block'; }
    } else if(!queue.length){
      state = fresh; saveLocal(); renderAll();
    } else {
      flushQueue();
    }
    setNetStatus('online','Online · up to date');
  }catch(err){
    if(state.catalog.length){
      setNetStatus('offline','Offline — showing data saved on this device');
    } else {
      setNetStatus('offline','No connection yet — open once with internet to set up this device');
      $('mainLoading').textContent = 'No internet connection yet. Open this page once with Wi-Fi or data to set up this device, then it will work offline.';
    }
  }

  if(queue.length) flushQueue();
}
init();

})();
