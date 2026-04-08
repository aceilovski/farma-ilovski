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

let currentUserEmail = ""; 
let currentRole = "user"; 
let myChart; 
let selectedCowId = null;

// ==========================================
// 2. UI HELPERS & MODALS
// ==========================================
function showLoader(t = "Се вчитува...") { document.getElementById('loaderText').innerText = t; document.getElementById('globalLoader').style.display = 'flex'; }
function hideLoader() { document.getElementById('globalLoader').style.display = 'none'; }
function showToast(t) { let b = document.getElementById('toastNotification'); b.innerText = t; b.classList.remove('hidden'); b.classList.add('show'); setTimeout(() => { b.classList.remove('show'); b.classList.add('hidden'); }, 2500); }
function showAlert(t) { document.getElementById('alertText').innerText = t; document.getElementById('customAlert').classList.remove('hidden'); }
function closeAlert() { document.getElementById('customAlert').classList.add('hidden'); }
let confirmCb = null; function showConfirm(t, cb) { document.getElementById('confirmText').innerText = t; confirmCb = cb; document.getElementById('customConfirm').classList.remove('hidden'); }
function closeConfirm(y) { document.getElementById('customConfirm').classList.add('hidden'); if(y && confirmCb) confirmCb(); }

function toggleTheme() { 
  let body = document.documentElement; let icon = document.getElementById('themeIcon');
  body.classList.toggle('dark'); document.body.classList.toggle('dark-mode');
  if(body.classList.contains('dark')) { icon.className = "bi bi-sun-fill text-warning"; localStorage.setItem('theme', 'dark'); } 
  else { icon.className = "bi bi-moon-fill text-secondary"; localStorage.setItem('theme', 'light'); }
  if(!document.getElementById('viewReports').classList.contains('hidden')) drawChart();
}

window.onload = function() {
  populateCalendar();
  if(localStorage.getItem('theme') === 'dark') { document.documentElement.classList.add('dark'); document.body.classList.add('dark-mode'); document.getElementById('themeIcon').className = "bi bi-sun-fill text-warning"; }
}

function populateCalendar() {
  const months = ["Јануари", "Февруари", "Март", "Април", "Мај", "Јуни", "Јули", "Август", "Септември", "Октомври", "Ноември", "Декември"];
  let mHtml = ""; for(let i=0; i<12; i++) mHtml += `<option value="${("0"+(i+1)).slice(-2)}">${months[i]}</option>`;
  document.getElementById('mesecSelect').innerHTML = mHtml;
  let gHtml = ""; let currentYear = new Date().getFullYear(); for(let g = currentYear; g >= 2023; g--) gHtml += `<option value="${g}">${g}</option>`;
  document.getElementById('godinaSelect').innerHTML = gHtml;
  let d = new Date(); document.getElementById('mesecSelect').value = ("0"+(d.getMonth()+1)).slice(-2); document.getElementById('godinaSelect').value = d.getFullYear();
}

// ==========================================
// 3. AUTHENTICATION (ЧИСТ И СТАБИЛЕН КОД)
// ==========================================
auth.onAuthStateChanged((user) => {
  if (user) {
    currentUserEmail = user.email; 
    document.getElementById('displayUser').innerText = currentUserEmail.split('@')[0];
    let userRef = db.collection("users").doc(user.uid);

    // Логика: Прво читај, ако нема документ - креирај го. Потоа стави време.
    userRef.get().then(doc => {
        if (doc.exists) {
            currentRole = doc.data().role || "user";
            userRef.update({ lastActive: firebase.firestore.FieldValue.serverTimestamp() }).catch(e => console.log(e));
        } else {
            currentRole = "user";
            userRef.set({ email: user.email, role: "user", lastActive: firebase.firestore.FieldValue.serverTimestamp() }).catch(e => console.log(e));
        }
        applyUserRoleUI();
    }).catch(err => {
        console.log(err); currentRole = "user"; applyUserRoleUI();
    });

  } else {
    hideLoader(); 
    document.getElementById('loginSection').classList.remove('hidden'); 
    document.getElementById('mainSection').classList.add('hidden');
    document.getElementById('bottomNav').classList.add('hidden');
  }
});

function applyUserRoleUI() {
    let rb = document.getElementById('displayRole');
    if (currentRole === 'superadmin') { 
        rb.innerHTML = '<i class="bi bi-star-fill me-1"></i>Супер Админ'; rb.className = 'badge bg-danger text-white mt-1'; 
        document.getElementById('btnAdmin').classList.remove('hidden'); document.getElementById('thEdit').classList.remove('hidden'); 
    } else if (currentRole === 'admin') {
        rb.innerHTML = '<i class="bi bi-shield-lock-fill me-1"></i>Админ'; rb.className = 'badge bg-warning text-dark mt-1'; 
        document.getElementById('btnAdmin').classList.add('hidden'); document.getElementById('thEdit').classList.remove('hidden');
    } else { 
        rb.innerHTML = '<i class="bi bi-person-fill me-1"></i>Корисник'; rb.className = 'badge bg-info text-dark mt-1'; 
        document.getElementById('btnAdmin').classList.add('hidden'); document.getElementById('thEdit').classList.add('hidden'); 
    }
    
    document.getElementById('loginSection').classList.add('hidden'); 
    document.getElementById('mainSection').classList.remove('hidden'); 
    document.getElementById('bottomNav').classList.remove('hidden');
    hideLoader(); 
    switchView('home');
}

function login() {
  let u = document.getElementById('user').value.trim(); let p = document.getElementById('pass').value; let msg = document.getElementById('msg'); 
  if(!u || !p) return msg.innerText = "Внесете податоци!"; 
  showLoader("Се најавувам..."); document.getElementById('lBtn').disabled = true;
  auth.signInWithEmailAndPassword(u, p).then(() => { document.getElementById('lBtn').disabled = false; document.getElementById('user').value = ""; document.getElementById('pass').value = ""; msg.innerText = ""; }).catch(err => { document.getElementById('lBtn').disabled = false; hideLoader(); msg.innerText = "Погрешен е-маил или лозинка!"; });
}
function odjaviSe() { auth.signOut().then(() => showToast("Одјавени сте!")); }

// ==========================================
// 4. NAVIGATION
// ==========================================
function switchView(v) {
  ['viewHome', 'viewReports', 'viewAdmin', 'viewKravi'].forEach(e => document.getElementById(e).classList.add('hidden'));
  ['btnHome', 'btnReports', 'btnAdmin', 'btnKravi'].forEach(k => document.getElementById(k).classList.remove('active-nav'));
  if(v === 'home') { document.getElementById('viewHome').classList.remove('hidden'); document.getElementById('btnHome').classList.add('active-nav'); loadMilkLogs(); }
  else if(v === 'kravi') { document.getElementById('viewKravi').classList.remove('hidden'); document.getElementById('btnKravi').classList.add('active-nav'); loadCows(); }
  else if(v === 'reports') { document.getElementById('viewReports').classList.remove('hidden'); document.getElementById('btnReports').classList.add('active-nav'); drawChart(); }
  else if(v === 'admin') { document.getElementById('viewAdmin').classList.remove('hidden'); document.getElementById('btnAdmin').classList.add('active-nav'); loadUsers(); }
}

// ==========================================
// 5. MILK LOGIC 
// ==========================================
function presmetajOdMm() { let mm = parseFloat(document.getElementById('meracMm').value); document.getElementById('litri').value = (!mm || isNaN(mm)) ? "" : (Math.PI * Math.pow(44.75, 2) * (mm / 10) / 1000).toFixed(2); }

function zacuvajMleko() {
  let l = parseFloat(document.getElementById('litri').value); if(!l || isNaN(l) || l <= 0) return showAlert("Внесете валидна количина!");
  showLoader("Зачувувам...");
  let godMes = document.getElementById('godinaSelect').value + "-" + ("0"+(new Date().getMonth()+1)).slice(-2);
  db.collection("milk").add({ liters: l, userEmail: currentUserEmail, timestamp: firebase.firestore.FieldValue.serverTimestamp(), period: godMes }).then(() => { hideLoader(); document.getElementById('litri').value = ""; document.getElementById('meracMm').value = ""; showToast("Зачувано!"); }).catch(err => { hideLoader(); showAlert("Грешка: " + err.message); });
}

function loadMilkLogs() {
  db.collection("milk").orderBy("timestamp", "desc").limit(50).onSnapshot(snap => {
    let h = ""; let currentMonthTotal = 0; let dMonth = new Date().getMonth();
    snap.forEach(doc => {
      let data = doc.data(); let id = doc.id; let d = data.timestamp ? data.timestamp.toDate() : new Date();
      if(d.getMonth() === dMonth) currentMonthTotal += data.liters;
      let datumStr = ("0"+d.getDate()).slice(-2)+"."+("0"+(d.getMonth()+1)).slice(-2)+" "+("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2);
      let btnDel = (currentRole === 'admin' || currentRole === 'superadmin') ? `<button onclick="deleteMilk('${id}')" class="btn btn-outline-danger px-2 py-1 border-0 rounded-circle"><i class="bi bi-trash"></i></button>` : "";
      h += `<tr><td><small class="text-muted">${datumStr}</small></td><td><b>${data.liters}L</b></td><td><small class="text-muted">${data.userEmail.split('@')[0]}</small></td><td class="text-end">${btnDel}</td></tr>`;
    });
    document.getElementById('tabelaZapisi').innerHTML = h; document.getElementById('vkupnoOvojMesec').innerText = currentMonthTotal.toFixed(2);
  });
}
function deleteMilk(id) { showConfirm("Избриши запис?", () => db.collection("milk").doc(id).delete()); }

// ==========================================
// 6. HERD LOGIC
// ==========================================
let originalHerd = []; let activeCowFilter = "Сите";
function otvoriNovaKravaModal() { selectedCowId = null; document.getElementById('kravaFormTitle').innerText = "Ново Грло"; document.getElementById('kravaUshen').value = ""; document.getElementById('kravaIme').value = ""; document.getElementById('kravaPol').value = "Женско"; document.getElementById('kravaRagjanje').value = ""; document.getElementById('kravaOsemenuvanje').value = ""; document.getElementById('kravaBrojOsemen').value = "0"; osveziKravaUI(); document.getElementById('modalKrava').classList.remove('hidden'); }
function zatvoriModalKrava() { document.getElementById('modalKrava').classList.add('hidden'); }
function osveziKravaUI() { let p = document.getElementById('kravaPol').value; let rep = document.getElementById('reprodukcijaBlok'); if(p === 'Женско') rep.classList.remove('hidden'); else { rep.classList.add('hidden'); document.getElementById('kravaOsemenuvanje').value = ""; } }

function loadCows() {
  db.collection("cows").orderBy("timestamp", "desc").onSnapshot(snap => {
    originalHerd = []; snap.forEach(doc => originalHerd.push({ id: doc.id, ...doc.data() })); populateMothersDropdown(); renderCows();
  });
}

function populateMothersDropdown() { let s = document.getElementById('kravaMajka'); let old = s.value; let h = '<option value="">Непозната / Купена</option>'; originalHerd.filter(c => c.gender === 'Женско').forEach(c => h += `<option value="${c.earTag}">${c.earTag}</option>`); s.innerHTML = h; s.value = old; }

function renderCows() {
  let rows = []; let alarms = 0; let inp = document.getElementById('prebarajKravi').value.toLowerCase();
  originalHerd.forEach(c => {
    let text = (c.earTag + " " + (c.name||"")).toLowerCase(); if(inp && !text.includes(inp)) return;
    if(activeCowFilter === 'Стелни' && !c.inseminationDate) return; if(activeCowFilter === 'Отворена' && c.inseminationDate) return;
    let polIco = c.gender === 'Машко' ? '<i class="bi bi-gender-male text-primary fs-5"></i>' : '<i class="bi bi-gender-female text-danger fs-5"></i>';
    let status = "Отворена"; let statusC = "bg-success text-white"; let osemStr = "-"; let btnEdit = `<button onclick="editCow('${c.id}')" class="btn btn-outline-primary px-2 py-1 border-0 rounded-circle me-1"><i class="bi bi-pencil"></i></button>`;
    let btnDel = (currentRole === 'admin' || currentRole === 'superadmin') ? `<button onclick="deleteCow('${c.id}')" class="btn btn-outline-danger px-2 py-1 border-0 rounded-circle"><i class="bi bi-trash"></i></button>` : "";
    let alertMsg = "";
    if (c.gender === 'Машко') { status = "Бик/Теле"; statusC = "bg-dark text-white"; } else if (c.inseminationDate) {
      let dO = new Date(c.inseminationDate); let diffDays = Math.floor((new Date() - dO) / (1000 * 60 * 60 * 24));
      osemStr = ("0"+dO.getDate()).slice(-2)+"."+("0"+(dO.getMonth()+1)).slice(-2)+"."+dO.getFullYear() + ` <small>(${c.inseminationCount||1})</small>`;
      if(diffDays < 21) { status = "Осеменета"; statusC = "bg-primary text-white"; } else if (diffDays < 220) { status = "Стелна"; statusC = "bg-info text-dark"; alertMsg = `<div class="text-success small"><i class="bi bi-check-circle"></i> ${diffDays} ден.</div>`; } else if (diffDays < 270) { status = "Засушена"; statusC = "bg-warning text-dark"; alertMsg = `<div class="text-warning text-dark small fw-bold">Засуши! (${diffDays}д.)</div>`; } else { status = "Пред телење"; statusC = "bg-danger text-white"; alertMsg = `<div class="text-danger small fw-bold">Време за телење!</div>`; btnDel = `<button onclick="otvoriTelenje('${c.id}', '${c.earTag}')" class="btn btn-sm btn-success rounded-pill px-2 py-1"><i class="bi bi-stars"></i> Отели</button>` + btnDel; alarms++; }
    }
    rows.push(`<tr><td><div class="mb-1">${polIco} <b class="text-dark dark:text-white">${c.earTag}</b> ${c.name?`(${c.name})`:''}</div><small class="text-muted">Мајка: ${c.mother||'-'}</small></td><td class="text-center"><span class="badge ${statusC} px-2 py-1">${status}</span></td><td class="text-center"><div style="font-size:0.9rem;">${osemStr}</div>${alertMsg}</td><td class="text-end" style="white-space: nowrap;">${btnEdit}${btnDel}</td></tr>`);
  });
  document.getElementById('tabelaKravi').innerHTML = rows.join(''); document.getElementById('vkupnoKraviBroj').innerText = `Прикажани: ${rows.length}`;
  let bdg = document.getElementById('stadoBadge'); if(alarms > 0) { bdg.innerText = alarms; bdg.classList.remove('hidden'); } else bdg.classList.add('hidden');
}

function postaviFilterKravi(btn, filter) { activeCowFilter = filter; document.querySelectorAll('.filter-btn').forEach(b => { b.classList.remove('btn-primary', 'btn-info', 'btn-success', 'text-dark', 'text-white'); b.classList.add('btn-outline-secondary'); }); if(filter === 'Стелни') btn.classList.add('btn-info', 'text-dark'); else if(filter === 'Отворена') btn.classList.add('btn-success', 'text-white'); else btn.classList.add('btn-primary', 'text-white'); btn.classList.remove('btn-outline-secondary'); renderCows(); }
function filtrirajKravi() { renderCows(); }

function zacuvajKravaJS() {
  let obj = { earTag: document.getElementById('kravaUshen').value.trim(), name: document.getElementById('kravaIme').value.trim(), gender: document.getElementById('kravaPol').value, birthDate: document.getElementById('kravaRagjanje').value, mother: document.getElementById('kravaMajka').value, inseminationDate: document.getElementById('kravaOsemenuvanje').value, inseminationCount: parseInt(document.getElementById('kravaBrojOsemen').value)||0, timestamp: firebase.firestore.FieldValue.serverTimestamp() };
  if(!obj.earTag || !obj.birthDate) return showAlert("Ушниот број и датумот на раѓање се задолжителни!");
  showLoader("Зачувувам...");
  let ref = selectedCowId ? db.collection("cows").doc(selectedCowId) : db.collection("cows").doc();
  ref.set(obj, {merge: true}).then(() => { hideLoader(); zatvoriModalKrava(); showToast("Успешно зачувано!"); }).catch(e => { hideLoader(); showAlert(e.message); });
}

function editCow(id) { let c = originalHerd.find(x => x.id === id); if(!c) return; selectedCowId = id; document.getElementById('kravaFormTitle').innerText = "Ажурирај Грло"; document.getElementById('kravaUshen').value = c.earTag; document.getElementById('kravaIme').value = c.name||""; document.getElementById('kravaPol').value = c.gender||"Женско"; document.getElementById('kravaRagjanje').value = c.birthDate||""; document.getElementById('kravaMajka').value = c.mother||""; document.getElementById('kravaOsemenuvanje').value = c.inseminationDate||""; document.getElementById('kravaBrojOsemen').value = c.inseminationCount||0; osveziKravaUI(); document.getElementById('modalKrava').classList.remove('hidden'); }
function deleteCow(id) { showConfirm("Дали си сигурен?", () => { db.collection("cows").doc(id).delete().then(()=>showToast("Избришано!")); }); }

function otvoriTelenje(id, earTag) { document.getElementById('telenjeMajkaId').value = id; document.getElementById('telenjeMajkaUshen').innerText = earTag; document.getElementById('telenjeDatum').value = new Date().toISOString().split('T')[0]; document.getElementById('telenjeTeleUshen').value = ""; document.getElementById('modalTelenje').classList.remove('hidden'); }
function zatvoriTelenje() { document.getElementById('modalTelenje').classList.add('hidden'); }

function potvrdiTelenje() {
  let d = document.getElementById('telenjeDatum').value; let calfTag = document.getElementById('telenjeTeleUshen').value; let motherId = document.getElementById('telenjeMajkaId').value;
  if(!d || !calfTag) return showAlert("Внесете датум и ушен број на телето!"); 
  showLoader("Регистрирам..."); let batch = db.batch();
  batch.update(db.collection("cows").doc(motherId), { inseminationDate: "", inseminationCount: 0 }); 
  batch.set(db.collection("cows").doc(), { earTag: calfTag, gender: document.getElementById('telenjeTelePol').value, birthDate: d, mother: document.getElementById('telenjeMajkaUshen').innerText, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
  batch.commit().then(() => { hideLoader(); zatvoriTelenje(); showToast("Телењето е успешно!"); }).catch(e => { hideLoader(); showAlert(e.message); });
}

// ==========================================
// 7. REPORTS
// ==========================================
let reportTotalLiters = 0; let reportMonth = ""; let reportMilkPrice = 0; let reportTaxPercent = 0;

function izvestaj() {
  let c = parseFloat(document.getElementById('cenaMleko').value); let d = parseFloat(document.getElementById('danokMleko').value) || 0;
  if(!c || c <= 0) return showAlert("Внесете цена!");
  let period = document.getElementById('godinaSelect').value + "-" + document.getElementById('mesecSelect').value;
  showLoader("Пресметувам...");
  db.collection("milk").where("period", "==", period).get().then(snap => {
    hideLoader(); let totalLiters = 0; snap.forEach(doc => totalLiters += doc.data().liters);
    let bruto = totalLiters * c; let osnova = bruto * 0.20; let danok = osnova * (d/100); let neto = bruto - danok;
    reportTotalLiters = totalLiters; reportMonth = period; reportMilkPrice = c; reportTaxPercent = d;
    document.getElementById('resIzv').classList.remove('hidden'); document.getElementById('vkLitri').innerText = totalLiters.toFixed(2) + " L"; document.getElementById('vkBruto').innerText = bruto.toFixed(2) + " ден."; document.getElementById('vkOsnova').innerText = osnova.toFixed(2) + " ден."; document.getElementById('vkDanok').innerText = "- " + danok.toFixed(2) + " ден."; document.getElementById('vkNeto').innerText = neto.toFixed(2) + " ден.";
  });
}

function generirajExcel() {
  if(reportTotalLiters === 0) return showAlert("Прво кликнете 'ПРЕСМЕТАЈ'.");
  showLoader("Генерирам CSV...");
  db.collection("milk").where("period", "==", reportMonth).orderBy("timestamp").get().then(snap => {
    hideLoader(); let csv = "ДАТУМ;ВРЕМЕ;ПРЕДАДЕНИ ЛИТРИ\n";
    snap.forEach(doc => { let d = doc.data().timestamp.toDate(); csv += `${("0"+d.getDate()).slice(-2)}.${("0"+(d.getMonth()+1)).slice(-2)}.${d.getFullYear()};${("0"+d.getHours()).slice(-2)}:${("0"+d.getMinutes()).slice(-2)};${doc.data().liters.toFixed(2)}\n`; });
    let bruto = reportTotalLiters * reportMilkPrice; let danok = (bruto * 0.20) * (reportTaxPercent/100);
    csv += `\nВКУПНО ЛИТРИ:;${reportTotalLiters.toFixed(2)}\nБРУТО (ден):;${bruto.toFixed(2)}\nДАНОК (ден):;-${danok.toFixed(2)}\nЗА ИСПЛАТА (ден):;${(bruto-danok).toFixed(2)}\n`;
    let blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' }); let a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `Izvestaj_${reportMonth}.csv`; a.click();
  });
}

function generirajPDF() {
  if(reportTotalLiters === 0) return showAlert("Прво кликнете 'ПРЕСМЕТАЈ'.");
  showLoader("Генерирам PDF...");
  const { jsPDF } = window.jspdf; const doc = new jsPDF();
  doc.setFontSize(22); doc.setTextColor(41, 128, 185); doc.text("FAKTURA ZA OTKUP NA MLEKO", 14, 20);
  doc.setFontSize(11); doc.setTextColor(100, 100, 100); doc.text("Farma Ilovski - s. Zilce, Tetovo", 14, 28); doc.text("Period: " + reportMonth, 14, 34); doc.text("Datum na izdavanje: " + new Date().toLocaleDateString('mk-MK'), 14, 40);
  let bruto = reportTotalLiters * reportMilkPrice; let danok = (bruto * 0.20) * (reportTaxPercent/100); let neto = bruto - danok;
  doc.autoTable({ startY: 50, theme: 'grid', headStyles: { fillColor: [41, 128, 185] }, head: [['Opis', 'Kolicina (Litri)', 'Cena (den)', 'Danocna stapka', 'Vkupno (den)']], body: [['Surovo kravjo mleko', reportTotalLiters.toFixed(2), reportMilkPrice.toFixed(2), reportTaxPercent + "%", bruto.toFixed(2)]], });
  let finalY = doc.lastAutoTable.finalY + 15; doc.setFontSize(12); doc.setTextColor(0, 0, 0); doc.text("Bruto iznos: " + bruto.toFixed(2) + " den.", 120, finalY); doc.text("Personalen danok: - " + danok.toFixed(2) + " den.", 120, finalY + 8); doc.setFontSize(14); doc.setTextColor(39, 174, 96); doc.text("ZA ISPLATA: " + neto.toFixed(2) + " den.", 120, finalY + 18);
  hideLoader(); doc.save(`Faktura_${reportMonth}.pdf`);
}

function drawChart() {
  db.collection("milk").get().then(snap => {
    let monthsMap = {}; snap.forEach(doc => { let p = doc.data().period; if(p) monthsMap[p] = (monthsMap[p]||0) + doc.data().liters; });
    let keys = Object.keys(monthsMap).sort().slice(-6); let values = keys.map(k => monthsMap[k]);
    if(myChart) myChart.destroy(); let ctx = document.getElementById('myChart'); if(!ctx) return;
    let isDark = document.body.classList.contains('dark-mode'); let cT = isDark ? '#94a3b8' : '#6c757d'; let cG = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    myChart = new Chart(ctx, { type: 'bar', data: { labels: keys, datasets: [{ label: 'Литри', data: values, backgroundColor: 'rgba(13, 110, 253, 0.7)', borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks:{color:cT}, grid:{display:false} }, y: { ticks:{color:cT}, grid:{color:cG} } } } });
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
      let data = doc.data(); 
      let roleBadge = data.role === 'superadmin' ? 'bg-danger text-white' : (data.role === 'admin' ? 'bg-warning text-dark' : 'bg-info text-dark');
      let isOnline = false; let lastActiveText = "Никогаш";
      if (data.lastActive) {
        let lastDate = data.lastActive.toDate();
        if ((now - lastDate) < 900000) { isOnline = true; lastActiveText = `<span class="text-success"><i class="bi bi-circle-fill" style="font-size: 0.6rem;"></i> Онлајн</span>`; } else { lastActiveText = ("0"+lastDate.getDate()).slice(-2)+"."+("0"+(lastDate.getMonth()+1)).slice(-2)+" " + ("0"+lastDate.getHours()).slice(-2)+":"+("0"+lastDate.getMinutes()).slice(-2); }
      }
      let btnRole = ""; let btnPass = "";
      if (data.role !== 'superadmin') { btnRole = `<li><a class="dropdown-item text-dark" href="#" onclick="switchUserRole('${doc.id}', '${data.role}')"><i class="bi bi-arrow-left-right me-2"></i>Смени во ${data.role === 'admin' ? 'Корисник' : 'Админ'}</a></li>`; btnPass = `<li><a class="dropdown-item text-danger" href="#" onclick="sendPasswordReset('${data.email}')"><i class="bi bi-key me-2"></i>Ресет лозинка</a></li>`; } else { btnRole = `<li><span class="dropdown-item text-muted"><i class="bi bi-shield-lock me-2"></i>Главен Админ</span></li>`; }
      let actionsHtml = `<div class="dropdown"><button class="btn btn-sm btn-outline-secondary rounded-pill px-3 bg-white/50 dark:bg-black/50 border-0 shadow-sm text-dark dark:text-white" type="button" data-bs-toggle="dropdown">Акции <i class="bi bi-chevron-down ms-1"></i></button><ul class="dropdown-menu dropdown-menu-end shadow border-0 mt-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-xl p-2">${btnRole}${btnPass}</ul></div>`;
      h += `<tr><td><b class="text-dark dark:text-white">${data.email.split('@')[0]}</b><br><small class="text-muted" style="font-size: 0.7rem;">${data.email}</small></td><td class="text-center"><span class="badge ${roleBadge} rounded-pill">${data.role}</span></td><td class="text-center"><small class="text-muted fw-bold">${lastActiveText}</small></td><td class="text-end">${actionsHtml}</td></tr>`;
    });
    document.getElementById('tabelaKorisnici').innerHTML = h;
  });
}

function dodajNovKorisnik() {
    let email = document.getElementById('novKorisnikEmail').value.trim(); let pass = document.getElementById('novKorisnikPass').value; let role = document.getElementById('novKorisnikUloga').value;
    if(!email || pass.length < 6) return showAlert("Внесете валиден е-маил и лозинка од минимум 6 карактери!"); showLoader("Креирање на корисник...");
    secondaryApp.auth().createUserWithEmailAndPassword(email, pass).then((userCredential) => { let noviUid = userCredential.user.uid; return db.collection("users").doc(noviUid).set({ email: email, role: role, lastActive: null }); }).then(() => { secondaryApp.auth().signOut(); hideLoader(); showToast("Корисникот е успешно креиран!"); document.getElementById('novKorisnikEmail').value = ""; document.getElementById('novKorisnikPass').value = ""; loadUsers(); }).catch((error) => { hideLoader(); showAlert("Грешка при креирање: " + error.message); });
}

function switchUserRole(uid, currentRoleState) { let newRole = currentRoleState === 'admin' ? 'user' : 'admin'; showConfirm(`Сигурно менуваш улога во ${newRole}?`, () => { db.collection("users").doc(uid).update({ role: newRole }).then(() => { showToast("Улогата е сменета!"); loadUsers(); }); }); }
function sendPasswordReset(email) { showConfirm(`Испрати линк за ресет на лозинка на ${email}?`, () => { auth.sendPasswordResetEmail(email).then(() => { showToast("Мејлот за ресет е успешно испратен!"); }).catch((error) => { showAlert("Грешка: " + error.message); }); }); }