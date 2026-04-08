// ==========================================
// 3. AUTHENTICATION (ДЕТЕКТИВСКА ВЕРЗИЈА)
// ==========================================
auth.onAuthStateChanged((user) => {
  if (user) {
    currentUserEmail = user.email; 
    document.getElementById('displayUser').innerText = currentUserEmail.split('@')[0];
    
    // Прво го запишуваме времето
    db.collection("users").doc(user.uid).set({
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(err => alert("Грешка при запис на време: " + err.message));

    // Потоа ја читаме улогата
    db.collection("users").doc(user.uid).get()
      .then(doc => {
        if (!doc.exists) {
            alert("ГРЕШКА: Документот со UID " + user.uid + " не е пронајден во базата!");
            currentRole = "user";
        } else if (!doc.data().role) {
            alert("ГРЕШКА: Документот е најден, но нема поле 'role'!");
            currentRole = "user";
        } else {
            currentRole = doc.data().role;
            // alert("СУПЕР! Улогата е успешно прочитана: " + currentRole); // Ова ќе го тргнеме кога ќе проработи
        }
        applyUserRoleUI();
      })
      .catch(err => { 
          alert("БЛОКАДА ОД FIREBASE: " + err.message);
          currentRole = "user"; 
          applyUserRoleUI(); 
      });
  } else {
    hideLoader(); 
    document.getElementById('loginSection').classList.remove('hidden'); 
    document.getElementById('mainSection').classList.add('hidden');
  }
});