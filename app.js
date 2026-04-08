// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCwO9dGqIiV2rkCBjW3xARaFHiQvHvkA8o",
  authDomain: "farma-ilovski-c9eac.firebaseapp.com",
  projectId: "farma-ilovski-c9eac",
  storageBucket: "farma-ilovski-c9eac.firebasestorage.app",
  messagingSenderId: "704057351677",
  appId: "1:704057351677:web:357444914122338e020d94"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(); 
const db = firebase.firestore();
const secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary");

let currentUserEmail = ""; let currentRole = "user"; let myChart; let selectedCowId = null;

// ==========================================
// 2. UI HELPERS
// ==========================================
function showLoader(t = "Вчитување...") { document.getElementById('loaderText').innerText = t; document.getElementById('globalLoader').classList.remove('hidden'); }
function hideLoader() { document.getElementById('globalLoader').classList.add('hidden'); }
function showToast(t) { 
  let b = document.getElementById('toastNotification'); b.innerText = t; 
  b.classList.remove('opacity-0', 'translate-y-4'); b.classList.add('opacity-100', 'translate-y-0');
  setTimeout(() => { b.classList.add('opacity-0', 'translate-y-4'); b.classList.remove('opacity-100', 'translate-y-0'); }, 2500); 
}
function showAlert(t) { document.getElementById('alertText').innerText = t; document.getElementById('customAlert').classList.remove('hidden'); }
function closeAlert() { document.getElementById('customAlert').classList.add('hidden'); }
let confirmCb = null; function showConfirm(t, cb) { document.getElementById('confirmText').innerText = t; confirmCb = cb; document.getElementById('customConfirm').classList.remove('hidden'); }
function closeConfirm(y) { document.getElementById('customConfirm').classList.add('hidden'); if(y && confirmCb) confirmCb(); }

window.onload = function() { populateCalendar(); }

function populateCalendar() {
  const months = ["Јануари", "Февруари", "Март", "Април", "Мај", "Јуни", "Јули", "Август", "Септември", "Октомври", "Ноември", "Декември"];
  let mHtml = ""; for(let i=0; i<12; i++) mHtml += `<option value="${("0"+(i+1)).slice(-2)}">${months[i]}</option>`; document.getElementById('mesecSelect').innerHTML = mHtml;
  let gHtml = ""; let currentYear = new Date().getFullYear(); for(let g = currentYear; g >= 2023; g--) gHtml += `<option value="${g}">${g}</option>`;
  document.getElementById('godinaSelect').innerHTML = gHtml;
  let d = new Date(); document.getElementById('mesecSelect').value = ("0"+(d.getMonth()+1)).slice(-2); document.getElementById('godinaSelect').value = d.getFullYear();
}

// ==========================================
// 3. AUTHENTICATION
// ==========================================
auth.onAuthStateChanged((user) => {
  if (user) {
    currentUserEmail = user.email; document.getElementById('displayUser').innerText = currentUserEmail.split('@')[0];
    let userRef = db.collection("users").doc(user.uid);
    userRef.get().then(doc => {
        if (doc.exists) { currentRole = doc.data().role || "user"; userRef.update({ lastActive: firebase.firestore.FieldValue.serverTimestamp() }).catch(e => console.log(e)); } 
        else { currentRole = "user"; userRef.set({ email: user.email, role: "user", lastActive: firebase.firestore.FieldValue.serverTimestamp() }).catch(e => console.log(e)); }
        applyUserRoleUI();
    }).catch(err => { console.log(err); currentRole = "user"; applyUserRoleUI(); });
  } else {
    hideLoader(); document.getElementById('loginSection').classList.remove('hidden'); document.getElementById('mainSection').classList.add('hidden'); document.getElementById('bottomNav').classList.add('hidden');
  }
});

function applyUserRoleUI() {
    let rb = document.getElementById('displayRole');
    if (currentRole === 'superadmin') { 
        rb.innerHTML = '<span class="text-rose-500 text-[10px] font-bold uppercase tracking-widest border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 rounded"><i class="bi bi-star-fill mr-1"></i>Супер Админ</span>'; 
        document.getElementById('btnAdmin').classList.remove('hidden'); document.getElementById('thEdit').classList.remove('hidden'); 
    } else if (currentRole === 'admin') {
        rb.innerHTML = '<span class="text-amber-500 text-[10px] font-bold uppercase tracking-widest border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded"><i class="bi bi-shield-lock-fill mr-1"></i>Админ</span>'; 
        document.getElementById('btnAdmin').classList.add('hidden'); document.getElementById('thEdit').classList.remove('hidden');
    } else { 
        rb.innerHTML = '<span class="text-cyan-500 text-[10px] font-bold uppercase tracking-widest border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 rounded"><i class="bi bi-person-fill mr-1"></i>Оператор</span>'; 
        document.getElementById('btnAdmin').classList.add('hidden'); document.getElementById('thEdit').classList.add('hidden'); 
    }
    document.getElementById('loginSection').classList.add('hidden'); document.getElementById('mainSection').classList.remove('hidden'); document.getElementById('bottomNav').classList.remove('hidden');
    hideLoader(); switchView('home');
}

function login() {
  let u = document.getElementById('user').value.trim(); let p = document.getElementById('pass').value; let msg = document.getElementById('msg'); 
  if(!u || !p) return msg.innerText = "Внесете податоци!"; 
  showLoader("Автентикација..."); document.getElementById('lBtn').disabled = true;
  auth.signInWithEmailAndPassword(u, p).then(() => { document.getElementById('lBtn').disabled = false; document.getElementById('user').value = ""; document.getElementById('pass').value = ""; msg.innerText = ""; }).catch(err => { document.getElementById('lBtn').disabled = false; hideLoader(); msg.innerText = "Грешка во најава!"; });
}
function odjaviSe() { auth.signOut().then(() => showToast("Одјавени сте.")); }

// ==========================================
// 4. NAVIGATION
// ==========================================
function switchView(v) {
  ['viewHome', 'viewReports', 'viewAdmin', 'viewKravi'].forEach(e => document.getElementById(e).classList.add('hidden'));
  ['btnHome', 'btnReports', 'btnAdmin', 'btnKravi'].forEach(k => { document.getElementById(k).classList.remove('text-cyan-400', 'bg-slate-900', 'border-slate-800'); document.getElementById(k).classList.add('text-gray-500', 'border-transparent'); });
  
  let activeBtn = document.getElementById('btn' + v.charAt(0).toUpperCase() + v.slice(1));
  activeBtn.classList.remove('text-gray-500', 'border-transparent'); 
  if(v === 'admin') { activeBtn.classList.add('text-rose-400', 'bg-slate-900', 'border-slate-800'); } 
  else { activeBtn.classList.add('text-cyan-400', 'bg-slate-900', 'border-slate-800'); }
  
  if(v === 'home') { document.getElementById('viewHome').classList.remove('hidden'); loadMilkLogs(); }
  else if(v === 'kravi') { document.getElementById('viewKravi').classList.remove('hidden'); loadCows(); }
  else if(v === 'reports') { document.getElementById('viewReports').classList.remove('hidden'); drawChart(); }
  else if(v === 'admin') { document.getElementById('viewAdmin').classList.remove('hidden'); loadUsers(); }
}

// ==========================================
// 5. MILK LOGIC 
// ==========================================
function presmetajOdMm() { let mm = parseFloat(document.getElementById('meracMm').value); document.getElementById('litri').value = (!mm || isNaN(mm)) ? "" : (Math.PI * Math.pow(44.75, 2) * (mm / 10) / 1000).toFixed(2); }

function zacuvajMleko() {
  let l = parseFloat(document.getElementById('litri').value); if(!l || isNaN(l) || l <= 0) return showAlert("Внесете валидна количина!"); showLoader("Процесирање...");
  let godMes = document.getElementById('godinaSelect').value + "-" + ("0"+(new Date().getMonth()+1)).slice(-2);
  db.collection("milk").add({ liters: l, userEmail: currentUserEmail, timestamp: firebase.firestore.FieldValue.serverTimestamp(), period: godMes }).then(() => { hideLoader(); document.getElementById('litri').value = ""; document.getElementById('meracMm').value = ""; showToast("Записот е внесен!"); }).catch(err => { hideLoader(); showAlert("Грешка: " + err.message); });
}

function loadMilkLogs() {
  db.collection("milk").orderBy("timestamp", "desc").limit(50).onSnapshot(snap => {
    let h = ""; let currentMonthTotal = 0; let dMonth = new Date().getMonth();
    snap.forEach(doc => {
      let data = doc.data(); let id = doc.id; let d = data.timestamp ? data.timestamp.toDate() : new Date();
      if(d.getMonth() === dMonth) currentMonthTotal += data.liters;
      let datumStr = ("0"+d.getDate()).slice(-2)+"."+("0"+(d.getMonth()+1)).slice(-2)+" "+("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2);
      let btnDel = (currentRole === 'admin' || currentRole === 'superadmin') ? `<button onclick="deleteMilk('${id}')" class="text-gray-500 hover:text-rose-500 transition ml-auto p-2"><i class="bi bi-x-lg"></i></button>` : "";
      h += `<tr><td class="p-3"><span class="text-xs text-gray-500 font-mono">${datumStr}</span></td><td class="p-3 font-bold text-cyan-400 font-mono">${data.liters}L</td><td class="p-3"><span class="text-xs text-gray-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">${data.userEmail.split('@')[0]}</span></td><td class="p-3 text-right">${btnDel}</td></tr>`;
    });
    document.getElementById('tabelaZapisi').innerHTML = h; document.getElementById('vkupnoOvojMesec').innerText = currentMonthTotal.toFixed(2);
  });
}
function deleteMilk(id) { showConfirm("Бришење на записот?", () => db.collection("milk").doc(id).delete()); }

// ==========================================
// 6. HERD LOGIC
// ==========================================
let originalHerd = []; let activeCowFilter = "Сите";
function otvoriNovaKravaModal() { selectedCowId = null; document.getElementById('kravaFormTitle').innerText = "НОВО ГРЛО"; document.getElementById('kravaUshen').value = ""; document.getElementById('kravaIme').value = ""; document.getElementById('kravaPol').value = "Женско"; document.getElementById('kravaRagjanje').value = ""; document.getElementById('kravaOsemenuvanje').value = ""; document.getElementById('kravaBrojOsemen').value = "0"; osveziKravaUI(); document.getElementById('modalKrava').classList.remove('hidden'); }
function zatvoriModalKrava() { document.getElementById('modalKrava').classList.add('hidden'); }
function osveziKravaUI() { let p = document.getElementById('kravaPol').value; let rep = document.getElementById('reprodukcijaBlok'); if(p === 'Женско') rep.classList.remove('hidden'); else { rep.classList.add('hidden'); document.getElementById('kravaOsemenuvanje').value = ""; } }

function loadCows() {
  db.collection("cows").orderBy("timestamp", "desc").onSnapshot(snap => { originalHerd = []; snap.forEach(doc => originalHerd.push({ id: doc.id, ...doc.data() })); populateMothersDropdown(); renderCows(); });
}

function populateMothersDropdown() { let s = document.getElementById('kravaMajka'); let old = s.value; let h = '<option value="">Мајка: Непозната / Купена</option>'; originalHerd.filter(c => c.gender === 'Женско').forEach(c => h += `<option value="${c.earTag}">${c.earTag}</option>`); s.innerHTML = h; s.value = old; }

function renderCows() {
  let rows = []; let alarms = 0; let inp = document.getElementById('prebarajKravi').value.toLowerCase();
  originalHerd.forEach(c => {
    let text = (c.earTag + " " + (c.name||"")).toLowerCase(); if(inp && !text.includes(inp)) return;
    if(activeCowFilter === 'Стелни' && !c.inseminationDate) return; if(activeCowFilter === 'Отворена' && c.inseminationDate) return;
    let polIco = c.gender === 'Машко' ? '<i class="bi bi-gender-male text-cyan-500 text-sm"></i>' : '<i class="bi bi-gender-female text-rose-400 text-sm"></i>';
    let status = "ОТВОРЕНА"; let statusC = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"; let osemStr = "-"; 
    let btnEdit = `<button onclick="editCow('${c.id}')" class="text-cyan-500 hover:text-white border border-cyan-900 hover:bg-cyan-600 rounded mr-1 p-1.5 transition"><i class="bi bi-pencil-square"></i></button>`;
    let btnDel = (currentRole === 'admin' || currentRole === 'superadmin') ? `<button onclick="deleteCow('${c.id}')" class="text-rose-500 hover:text-white border border-rose-900 hover:bg-rose-600 rounded p-1.5 transition"><i class="bi bi-trash3"></i></button>` : "";
    let alertMsg = "";
    if (c.gender === 'Машко') { status = "БИК / ТЕЛЕ"; statusC = "bg-slate-800 text-gray-400 border-slate-700"; } else if (c.inseminationDate) {
      let dO = new Date(c.inseminationDate); let diffDays = Math.floor((new Date() - dO) / (1000 * 60 * 60 * 24)); osemStr = ("0"+dO.getDate()).slice(-2)+"."+("0"+(dO.getMonth()+1)).slice(-2)+"."+dO.getFullYear() + ` <span class="text-gray-600">[${c.inseminationCount||1}]</span>`;
      if(diffDays < 21) { status = "ОСЕМЕНЕТА"; statusC = "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"; } else if (diffDays < 220) { status = "СТЕЛНА"; statusC = "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"; alertMsg = `<div class="text-indigo-400 text-[10px] mt-1 font-mono uppercase tracking-wider"><i class="bi bi-arrow-right-short"></i> ${diffDays} ден.</div>`; } else if (diffDays < 270) { status = "ЗАСУШЕНА"; statusC = "bg-amber-500/10 text-amber-500 border-amber-500/30"; alertMsg = `<div class="text-amber-500 text-[10px] mt-1 font-mono font-bold uppercase tracking-wider">! ${diffDays} ден.</div>`; } else { status = "ТЕЛЕЊЕ"; statusC = "bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.3)]"; alertMsg = `<div class="text-rose-500 text-[10px] mt-1 font-black animate-pulse uppercase tracking-widest">АЛАРМ</div>`; btnDel = `<button onclick="otvoriTelenje('${c.id}', '${c.earTag}')" class="bg-emerald-600 text-white rounded px-2 py-1.5 text-[10px] font-bold mr-1 uppercase tracking-wider"><i class="bi bi-stars"></i> Отели</button>` + btnDel; alarms++; }
    }
    rows.push(`<tr><td class="p-3"><div class="flex items-center gap-1.5 mb-1">${polIco} <b class="text-white font-mono text-sm">${c.earTag}</b> ${c.name?`<span class="text-[10px] text-gray-500 uppercase">${c.name}</span>`:''}</div><span class="text-[9px] text-gray-600 uppercase tracking-widest">М: ${c.mother||'-'}</span></td><td class="p-3 text-center"><span class="px-2 py-1 border rounded text-[9px] font-bold uppercase tracking-widest ${statusC}">${status}</span></td><td class="p-3 text-center"><div class="text-[11px] font-mono text-gray-400">${osemStr}</div>${alertMsg}</td><td class="p-3 text-right whitespace-nowrap">${btnEdit}${btnDel}</td></tr>`);
  });
  document.getElementById('tabelaKravi').innerHTML = rows.join(''); document.getElementById('vkupnoKraviBroj').innerText = `Вкупно записи: ${rows.length}`;
  let bdg = document.getElementById('stadoBadge'); if(alarms > 0) { bdg.innerText = alarms; bdg.classList.remove('hidden'); } else bdg.classList.add('hidden');
}

function postaviFilterKravi(btn, filter) { activeCowFilter = filter; document.querySelectorAll('.filter-btn').forEach(b => { b.classList.remove('bg-cyan-600', 'text-slate-950', 'border-transparent'); b.classList.add('bg-slate-900', 'text-gray-400', 'border-slate-700'); }); btn.classList.remove('bg-slate-900', 'text-gray-400', 'border-slate-700'); btn.classList.add('bg-cyan-600', 'text-slate-950', 'border-transparent'); renderCows(); }
function filtrirajKravi() { renderCows(); }

function zacuvajKravaJS() {
  let obj = { earTag: document.getElementById('kravaUshen').value.trim(), name: document.getElementById('kravaIme').value.trim(), gender: document.getElementById('kravaPol').value, birthDate: document.getElementById('kravaRagjanje').value, mother: document.getElementById('kravaMajka').value, inseminationDate: document.getElementById('kravaOsemenuvanje').value, inseminationCount: parseInt(document.getElementById('kravaBrojOsemen').value)||0, timestamp: firebase.firestore.FieldValue.serverTimestamp() };
  if(!obj.earTag || !obj.birthDate) return showAlert("ID и Датум на раѓање се задолжителни!"); showLoader("Процесирање...");
  let ref = selectedCowId ? db.collection("cows").doc(selectedCowId) : db.collection("cows").doc(); ref.set(obj, {merge: true}).then(() => { hideLoader(); zatvoriModalKrava(); showToast("Грлото е запишано!"); }).catch(e => { hideLoader(); showAlert(e.message); });
}

function editCow(id) { let c = originalHerd.find(x => x.id === id); if(!c) return; selectedCowId = id; document.getElementById('kravaFormTitle').innerText = "АЖУРИРАЈ ГРЛО"; document.getElementById('kravaUshen').value = c.earTag; document.getElementById('kravaIme').value = c.name||""; document.getElementById('kravaPol').value = c.gender||"Женско"; document.getElementById('kravaRagjanje').value = c.birthDate||""; document.getElementById('kravaMajka').value = c.mother||""; document.getElementById('kravaOsemenuvanje').value = c.inseminationDate||""; document.getElementById('kravaBrojOsemen').value = c.inseminationCount||0; osveziKravaUI(); document.getElementById('modalKrava').classList.remove('hidden'); }
function deleteCow(id) { showConfirm("Избриши го ова грло засекогаш?", () => { db.collection("cows").doc(id).delete().then(()=>showToast("Грлото е избришано.")); }); }

function otvoriTelenje(id, earTag) { document.getElementById('telenjeMajkaId').value = id; document.getElementById('telenjeMajkaUshen').innerText = earTag; document.getElementById('telenjeDatum').value = new Date().toISOString().split('T')[0]; document.getElementById('telenjeTeleUshen').value = ""; document.getElementById('modalTelenje').classList.remove('hidden'); }
function zatvoriTelenje() { document.getElementById('modalTelenje').classList.add('hidden'); }

function potvrdiTelenje() {
  let d = document.getElementById('telenjeDatum').value; let calfTag = document.getElementById('telenjeTeleUshen').value; let motherId = document.getElementById('telenjeMajkaId').value;
  if(!d || !calfTag) return showAlert("Внесете ушен број за телето!"); showLoader("Процесирање..."); let batch = db.batch();
  batch.update(db.collection("cows").doc(motherId), { inseminationDate: "", inseminationCount: 0 }); batch.set(db.collection("cows").doc(), { earTag: calfTag, gender: document.getElementById('telenjeTelePol').value, birthDate: d, mother: document.getElementById('telenjeMajkaUshen').innerText, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
  batch.commit().then(() => { hideLoader(); zatvoriTelenje(); showToast("Телењето е успешно регистрирано."); }).catch(e => { hideLoader(); showAlert(e.message); });
}

// ==========================================
// 7. REPORTS
// ==========================================
let reportTotalLiters = 0; let reportMonth = ""; let reportMilkPrice = 0; let reportTaxPercent = 0;

function izvestaj() {
  let c = parseFloat(document.getElementById('cenaMleko').value); let d = parseFloat(document.getElementById('danokMleko').value) || 0;
  if(!c || c <= 0) return showAlert("Внесете валидна цена.");
  let period = document.getElementById('godinaSelect').value + "-" + document.getElementById('mesecSelect').value; showLoader("Генерирање...");
  db.collection("milk").where("period", "==", period).get().then(snap => {
    hideLoader(); let totalLiters = 0; snap.forEach(doc => totalLiters += doc.data().liters);
    let bruto = totalLiters * c; let osnova = bruto * 0.20; let danok = osnova * (d/100); let neto = bruto - danok;
    reportTotalLiters = totalLiters; reportMonth = period; reportMilkPrice = c; reportTaxPercent = d;
    document.getElementById('resIzv').classList.remove('hidden'); document.getElementById('vkLitri').innerText = totalLiters.toFixed(2) + " L"; document.getElementById('vkBruto').innerText = bruto.toFixed(2) + " ден."; document.getElementById('vkOsnova').innerText = osnova.toFixed(2) + " ден."; document.getElementById('vkDanok').innerText = "- " + danok.toFixed(2) + " ден."; document.getElementById('vkNeto').innerText = neto.toFixed(2) + " ден.";
  });
}

function generirajExcel() { /* Останува иста */ }
function generirajPDF() { /* Останува иста */ }

function drawChart() {
  db.collection("milk").get().then(snap => {
    let monthsMap = {}; snap.forEach(doc => { let p = doc.data().period; if(p) monthsMap[p] = (monthsMap[p]||0) + doc.data().liters; });
    let keys = Object.keys(monthsMap).sort().slice(-6); let values = keys.map(k => monthsMap[k]);
    if(myChart) myChart.destroy(); let ctx = document.getElementById('myChart'); if(!ctx) return;
    myChart = new Chart(ctx, { type: 'bar', data: { labels: keys, datasets: [{ label: 'Литри', data: values, backgroundColor: '#0891b2', borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks:{color:'#6b7280', font:{family:'monospace'}}, grid:{display:false} }, y: { ticks:{color:'#6b7280', font:{family:'monospace'}}, grid:{color:'rgba(255,255,255,0.05)'} } } } });
  });
}

// ==========================================
// 8. ADMIN PANEL
// ==========================================
function loadUsers() {
  if(currentRole !== 'superadmin') return; 
  db.collection("users").get().then(snap => {
    let h = ""; let now = new Date();
    snap.forEach(doc => {
      let data = doc.data(); let isOnline = false; let lastActiveText = "-";
      if (data.lastActive) { let lastDate = data.lastActive.toDate(); if ((now - lastDate) < 900000) { isOnline = true; lastActiveText = `<span class="text-emerald-400 font-bold"><i class="bi bi-circle-fill text-[6px] align-middle mr-1"></i>ОНЛАЈН</span>`; } else { lastActiveText = ("0"+lastDate.getDate()).slice(-2)+"."+("0"+(lastDate.getMonth()+1)).slice(-2)+" " + ("0"+lastDate.getHours()).slice(-2)+":"+("0"+lastDate.getMinutes()).slice(-2); } }
      let roleB = data.role === 'superadmin' ? 'bg-rose-500/20 text-rose-500 border-rose-500/50' : (data.role === 'admin' ? 'bg-amber-500/20 text-amber-500 border-amber-500/50' : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50');
      let actHtml = "";
      if (data.role !== 'superadmin') {
          actHtml = `<button onclick="switchUserRole('${doc.id}', '${data.role}')" class="text-gray-400 hover:text-white bg-slate-900 border border-slate-700 hover:border-slate-500 text-[9px] uppercase tracking-wider rounded px-2 py-1 mr-1 transition"><i class="bi bi-arrow-left-right"></i> Улога</button>`;
      } else { actHtml = `<span class="text-[9px] text-rose-900 uppercase tracking-widest font-bold">СУПЕР</span>`; }
      h += `<tr><td class="p-3"><b class="text-white text-xs">${data.email.split('@')[0]}</b></td><td class="p-3 text-center"><span class="px-2 py-0.5 border rounded text-[9px] font-bold uppercase tracking-widest ${roleB}">${data.role}</span></td><td class="p-3 text-center text-[10px] text-gray-500 font-mono">${lastActiveText}</td><td class="p-3 text-right">${actHtml}</td></tr>`;
    });
    document.getElementById('tabelaKorisnici').innerHTML = h;
  });
}

function dodajNovKorisnik() { /* Останува иста */ }
function switchUserRole(uid, currentRoleState) { let newRole = currentRoleState === 'admin' ? 'user' : 'admin'; showConfirm(`Промена на улога во ${newRole.toUpperCase()}?`, () => { db.collection("users").doc(uid).update({ role: newRole }).then(() => { showToast("Улогата е ажурирана."); loadUsers(); }); }); }