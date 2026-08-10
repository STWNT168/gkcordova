const TOPIC_META = {
  ancient:  {name:"Ancient History"}, medieval: {name:"Medieval History"}, modern: {name:"Modern History"},
  polity:   {name:"Polity"}, geo: {name:"Geography"}, worldgeo: {name:"World Geography"},
  eco:      {name:"Economics"}, arts: {name:"Arts & Culture"}, sports: {name:"Sports"},
  books:    {name:"Books & Authors"}, scitech: {name:"Science & Technology"}, physics: {name:"Physics"},
  chem:     {name:"Chemistry"}, bio: {name:"Biology"}, env: {name:"Environment"},
  awards:   {name:"Awards & Honors"}, computer: {name:"Computer"}, staticgk: {name:"Static GK"},
  schemes:  {name:"Govt Schemes & Policies"}, current: {name:"Current Affairs"},
};
const TOPIC_ORDER = ["eco","awards","arts","medieval","polity","modern","worldgeo","sports","scitech","env","computer","physics","staticgk","chem","geo","books","bio","schemes","current","ancient"];

const SCHED_KEY = 'gk-flash-sched';
const SETTINGS_KEY = 'gk-flash-settings';

async function decodeCards(){
  const res = await fetch('data/cards.json');
  if(!res.ok) throw new Error('cards.json fetch failed: ' + res.status);
  return await res.json();
}

let DECK = {};       // topic -> [[id,q,ans], ...]
let CARD_INDEX = {}; // key "topic:id" -> {topic,id,q,ans}
let sched = {};       // key -> {itv, ef, due, reps, seen}
let settings = { newCap: 150 };

function cardKey(topic,id){ return topic+':'+id; }

// ---------- on-device persistence (localStorage; survives app restarts) ----------
function loadSchedState(){
  try{
    const raw = localStorage.getItem(SCHED_KEY);
    if(raw) sched = JSON.parse(raw);
  }catch(e){ console.warn('sched load failed', e); }
  try{
    const raw2 = localStorage.getItem(SETTINGS_KEY);
    if(raw2) settings = JSON.parse(raw2);
  }catch(e){ console.warn('settings load failed', e); }
}
function saveSched(){
  try{ localStorage.setItem(SCHED_KEY, JSON.stringify(sched)); }
  catch(e){ console.warn('sched save failed', e); }
}
function saveSettings(){
  try{ localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
  catch(e){ console.warn('settings save failed', e); }
}

function today(){ return Math.floor(Date.now()/86400000); }

function getCardState(key){
  return sched[key] || {itv:0, ef:2.5, due:-1, reps:0, seen:false};
}

function isDue(st){ return st.seen && st.due <= today(); }
function isNew(st){ return !st.seen; }

function allKeysInOrder(){
  const keys = [];
  TOPIC_ORDER.forEach(t=>{
    (DECK[t]||[]).forEach(c=>{ keys.push(cardKey(t,c[0])); });
  });
  return keys;
}

function buildQueue(){
  const keys = allKeysInOrder();
  const due = [];
  const news = [];
  keys.forEach(k=>{
    const st = getCardState(k);
    if(isDue(st)) due.push(k);
    else if(isNew(st)) news.push(k);
  });
  const newToday = news.slice(0, settings.newCap);
  return due.concat(newToday);
}

function computeStats(){
  const keys = allKeysInOrder();
  let due=0, news=0, mastered=0;
  keys.forEach(k=>{
    const st = getCardState(k);
    if(isDue(st)) due++;
    else if(isNew(st)) news++;
    if(st.seen && st.itv >= 21) mastered++;
  });
  const newQueued = Math.min(news, settings.newCap);
  return {due, newToday: newQueued, mastered, total: keys.length};
}

function renderHome(){
  const stats = computeStats();
  document.getElementById('totalCount').textContent = stats.total.toLocaleString();
  document.getElementById('statDue').textContent = stats.due.toLocaleString();
  document.getElementById('statNew').textContent = stats.newToday.toLocaleString();
  document.getElementById('statMastered').textContent = stats.total ? Math.round(stats.mastered/stats.total*100)+'%' : '0%';
  document.getElementById('statTotal').textContent = stats.total.toLocaleString();
  const sessionLen = stats.due + stats.newToday;
  const btn = document.getElementById('studyBtn');
  btn.disabled = sessionLen === 0;
  document.getElementById('studyBtnSub').textContent = sessionLen ? `${stats.due} due · ${stats.newToday} new` : 'All caught up — come back tomorrow';

  document.getElementById('newCapInput').value = settings.newCap;

  const topicList = document.getElementById('topicList');
  topicList.innerHTML = '';
  TOPIC_ORDER.forEach(t=>{
    const cards = DECK[t]||[];
    if(!cards.length) return;
    let masteredCount = 0;
    cards.forEach(c=>{
      const st = getCardState(cardKey(t,c[0]));
      if(st.seen && st.itv >= 21) masteredCount++;
    });
    const pct = cards.length ? Math.round(masteredCount/cards.length*100) : 0;
    const row = document.createElement('div');
    row.className = 'topic-row';
    row.innerHTML = `<div class="t-name">${TOPIC_META[t].name}</div>
      <div class="t-bar"><div class="t-bar-fill" style="width:${pct}%"></div></div>
      <div class="t-count">${masteredCount}/${cards.length}</div>`;
    topicList.appendChild(row);
  });
}

// ---------- study session ----------
let queue = [];
let qIdx = 0;
let sessionTotal = 0;

function startSession(){
  queue = buildQueue();
  sessionTotal = queue.length;
  qIdx = 0;
  document.getElementById('studyScreen').classList.add('show');
  showCard();
}

function endSession(){
  document.getElementById('studyScreen').classList.remove('show');
  renderHome();
}

function showCard(){
  document.getElementById('progFill').style.width = sessionTotal ? Math.round(qIdx/sessionTotal*100)+'%' : '0%';
  document.getElementById('studyCount').textContent = `${qIdx}/${sessionTotal}`;
  if(qIdx >= queue.length){
    document.getElementById('cardArea').innerHTML = `<div class="done-panel">
      <div class="seal">完了</div>
      <h2>Session complete</h2>
      <p>${sessionTotal} card${sessionTotal===1?'':'s'} reviewed. New reviews will be due as their intervals come up.</p>
      <button id="doneBtn">Back to overview</button>
    </div>`;
    document.getElementById('revealBtn').style.display = 'none';
    document.getElementById('gradeRow').style.display = 'none';
    document.getElementById('doneBtn').addEventListener('click', endSession);
    return;
  }
  const key = queue[qIdx];
  const topic = key.split(':')[0];
  const c = CARD_INDEX[key];
  document.getElementById('cardArea').innerHTML = `
    <div class="card-topic" id="cardTopic"></div>
    <div class="card-q" id="cardQ"></div>
    <div class="card-answer" id="cardAnswer">
      <div class="ans-label">Correct answer</div>
      <div class="ans-letter" id="ansLetter"></div>
    </div>`;
  document.getElementById('cardTopic').textContent = TOPIC_META[topic].name;
  document.getElementById('cardQ').textContent = c.q;
  document.getElementById('ansLetter').textContent = '(' + c.ans + ')';
  document.getElementById('revealBtn').style.display = 'block';
  document.getElementById('gradeRow').style.display = 'none';
  document.getElementById('cardAnswer').classList.remove('show');

  const st = getCardState(key);
  const easeGood = st.ef || 2.5;
  const nextGood = st.reps===0?1:(st.reps===1?6:Math.round((st.itv||1)*easeGood));
  const nextHard = Math.max(1, Math.round((st.itv||1)*1.2));
  const nextEasy = Math.round(((st.reps===0?1:(st.reps===1?6:Math.round((st.itv||1)*easeGood)))) * 1.3);
  document.getElementById('hardLbl').textContent = nextHard+'d';
  document.getElementById('goodLbl').textContent = nextGood+'d';
  document.getElementById('easyLbl').textContent = nextEasy+'d';
}

function grade(g){
  const key = queue[qIdx];
  let st = getCardState(key);
  st.seen = true;
  if(g === 1){
    st.itv = 0;
    st.ef = Math.max(1.3, (st.ef||2.5) - 0.2);
    st.reps = 0;
    st.due = today();
  } else {
    let newItv;
    if(st.reps === 0) newItv = 1;
    else if(st.reps === 1) newItv = 6;
    else newItv = Math.round((st.itv||1) * (st.ef||2.5));
    if(g === 2){ st.ef = Math.max(1.3,(st.ef||2.5)-0.15); newItv = Math.max(1, Math.round((st.itv||1)*1.2)); }
    if(g === 4){ st.ef = (st.ef||2.5)+0.15; newItv = Math.round(newItv*1.3); }
    st.itv = Math.max(1,newItv);
    st.reps = (st.reps||0)+1;
    st.due = today() + st.itv;
  }
  sched[key] = st;
  saveSched();
  qIdx++;
  showCard();
}

function wireUI(){
  document.getElementById('revealBtn').addEventListener('click', ()=>{
    document.getElementById('cardAnswer').classList.add('show');
    document.getElementById('revealBtn').style.display = 'none';
    document.getElementById('gradeRow').style.display = 'grid';
  });

  document.getElementById('gradeRow').addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-g]');
    if(!btn) return;
    grade(parseInt(btn.dataset.g));
  });

  document.getElementById('closeStudy').addEventListener('click', endSession);
  document.getElementById('studyBtn').addEventListener('click', startSession);

  document.getElementById('newCapInput').addEventListener('change', (e)=>{
    let v = parseInt(e.target.value)||150;
    v = Math.max(10, Math.min(500,v));
    settings.newCap = v;
    saveSettings();
    renderHome();
  });

  document.getElementById('resetLink').addEventListener('click', ()=>{
    if(!confirm("Reset all scheduling progress? This clears every card's review history.")) return;
    sched = {};
    saveSched();
    renderHome();
  });
}

async function boot(){
  try{
    wireUI();
    loadSchedState();
    DECK = await decodeCards();
    Object.keys(DECK).forEach(t=>{
      DECK[t].forEach(c=>{
        CARD_INDEX[cardKey(t,c[0])] = {topic:t, id:c[0], q:c[1], ans:c[2]};
      });
    });
    document.getElementById('loadingBox').style.display = 'none';
    document.getElementById('mainBox').style.display = 'block';
    renderHome();
  }catch(e){
    document.getElementById('loadingBox').style.display = 'none';
    const eb = document.getElementById('errorBox');
    eb.style.display = 'block';
    eb.textContent = 'Could not load the question data (' + (e && e.message ? e.message : e) + ').';
    console.error(e);
  }
}

// Cordova apps should wait for deviceready before touching device state.
// Fall back to DOMContentLoaded so this also works when previewed in a plain browser.
if (window.cordova) {
  document.addEventListener('deviceready', boot, false);
} else {
  document.addEventListener('DOMContentLoaded', boot, false);
}
