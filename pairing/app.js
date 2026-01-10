import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  collection,
  getDocs,
  serverTimestamp,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { 
  firebaseConfig, 
  SESSION_ID, 
  SESSION_DURATION_MS, 
  DAY_MS, 
  DEVICE_ID_KEY, 
  INSTRUCTOR_KEY,
  VALID_CODE
} from './config.js';

import { pickBestPairs } from './pairing-algorithm.js';

// אתחול Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const sessionRef = doc(db, "sessions", SESSION_ID);
const responsesRef = collection(db, "responses");

// זיהוי מכשיר
const deviceId = localStorage.getItem(DEVICE_ID_KEY) || crypto.randomUUID();
localStorage.setItem(DEVICE_ID_KEY, deviceId);

let isInstructor = localStorage.getItem(INSTRUCTOR_KEY) === 'true';
let currentSession = null;
let sessionEndsAt = 0;
let pairingShown = false;

// אלמנטים DOM
const openInstructorBtn = document.getElementById('openInstructor');
const instructorBar = document.getElementById('instructorBar');
const startBtn = document.getElementById('startBtn');
const waitText = document.getElementById('waitText');
const activateBtn = document.getElementById('activateBtn');
const expectedCountInput = document.getElementById('expectedCount');
const instructorCode = document.getElementById('instructorCode');
const barStatus = document.getElementById('barStatus');
const displayName = document.getElementById('displayName');
const pairingResult = document.getElementById('pairingResult');
const managementScreen = document.getElementById('managementScreen');
const progressCount = document.getElementById('progressCount');
const managementNote = document.getElementById('managementNote');
const generatePairsBtn = document.getElementById('generatePairsBtn');

// משתנה אחסון בחירות
const selections = {};

// האזנה לבחירות
document.querySelectorAll('.choice-group').forEach(group => {
  const field = group.dataset.field;
  group.querySelectorAll('.choice').forEach(ch => {
    ch.addEventListener('click', () => {
      group.querySelectorAll('.choice').forEach(c => c.classList.remove('active'));
      ch.classList.add('active');
      selections[field] = ch.textContent.trim();
    });
  });
});

// פונקציות עזר
function showOnly(id) {
  document.querySelectorAll('.container .card').forEach(c => {
    c.classList.add('hidden');
  });
  
  const targetEl = document.getElementById(id);
  if (targetEl) targetEl.classList.remove('hidden');
}

function setStartEnabled(enabled) {
  if (enabled) {
    startBtn.style.display = 'inline-block';
    startBtn.classList.remove('hidden');
    startBtn.classList.remove('start-animate');
    requestAnimationFrame(() => startBtn.classList.add('start-animate'));
    waitText?.classList.add('hidden');
  } else {
    startBtn.style.display = 'none';
    startBtn.classList.add('hidden');
    waitText?.classList.remove('hidden');
  }
}

function resetToWaiting() {
  setStartEnabled(false);
  showOnly('introScreen');
}

function isActiveFromData(data) {
  if (!data?.started || typeof data.startTime !== 'number') return false;
  return Date.now() < (data.startTime + SESSION_DURATION_MS);
}

async function countValidResponses() {
  const snap = await getDocs(responsesRef);
  const now = Date.now();
  let c = 0;
  snap.docs.forEach(d => {
    const x = d.data();
    if (x.sessionId === SESSION_ID && typeof x.createdAt === 'number' && (now - x.createdAt) <= DAY_MS) {
      c++;
    }
  });
  return c;
}

async function updateManagementScreen() {
  const answersCount = await countValidResponses();
  const expected = Number(currentSession?.expectedCount || 0);
  
  progressCount.textContent = `${answersCount} / ${expected}`;
  
  if (expected > 0 && answersCount >= expected) {
    generatePairsBtn.classList.remove('hidden');
    managementNote.textContent = "כל המשתתפות השלימו! ניתן ליצור זוגות.";
  } else {
    generatePairsBtn.classList.add('hidden');
    managementNote.textContent = `ממתינה ל-${expected - answersCount} משתתפות נוספות...`;
  }
}

// מעקב אחר session
onSnapshot(sessionRef, async (snap) => {
  pairingShown = false;

  if (!snap.exists()) {
    currentSession = null;
    barStatus.textContent = "הפעילות עדיין לא הופעלה";
    
    if (!isInstructor) {
      resetToWaiting();
      openInstructorBtn.classList.remove('hidden');
    }
    return;
  }

  const data = snap.data();
  currentSession = data;

  if (isActiveFromData(data)) {
    sessionEndsAt = data.startTime + SESSION_DURATION_MS;

    const now = Date.now();
    const answersCount = await countValidResponses();
    const minsLeft = Math.max(0, Math.ceil((sessionEndsAt - now) / 60000));
    const expected = Number(data.expectedCount || 0);
    const progress = expected ? ` · ${answersCount}/${expected} תשובות` : '';

    barStatus.textContent = `פעיל עכשיו · נשארו בערך ${minsLeft} דק'${progress}`;
    
    openInstructorBtn.classList.add('hidden');
    
    if (isInstructor) {
      showOnly('managementScreen');
      await updateManagementScreen();
    } else {
      setStartEnabled(true);
    }

    if (data.pairingReady) {
      await showPairing();
    }
    return;
  }

  barStatus.textContent = "הפעילות עדיין לא הופעלה";
  if (!isInstructor) {
    resetToWaiting();
    openInstructorBtn.classList.remove('hidden');
  }
});

// ריענון מעקב כל 5 שניות
setInterval(async () => {
  if (isInstructor && currentSession && isActiveFromData(currentSession)) {
    await updateManagementScreen();
  }
}, 5000);

// כניסת מדריכה
openInstructorBtn.addEventListener('click', () => {
  instructorBar.classList.remove('hidden');
  openInstructorBtn.classList.add('hidden');
  setTimeout(() => instructorCode?.focus(), 50);
});

// הפעלת פעילות
activateBtn.addEventListener('click', async () => {
  const code = (instructorCode.value || '').trim();
  
  if (!code) {
    barStatus.textContent = "נא להזין קוד מדריכה";
    return;
  }

  if (code !== VALID_CODE) {
    barStatus.textContent = "קוד לא תקין";
    return;
  }

  const expected = Number(expectedCountInput.value || 0);
  if (expected <= 0) {
    barStatus.textContent = "נא להזין מספר משתתפות תקין";
    return;
  }

  const startTime = Date.now();
  await setDoc(sessionRef, {
    started: true,
    startTime,
    pairingReady: false,
    instructorCode: code,
    expectedCount: expected,
    expiresAt: new Date(startTime + DAY_MS),
    updatedAt: serverTimestamp()
  }, { merge: true });

  isInstructor = true;
  localStorage.setItem(INSTRUCTOR_KEY, 'true');

  instructorBar.classList.add('hidden');
  showOnly('managementScreen');
  await updateManagementScreen();

  barStatus.textContent = "הפעילות הופעלה";
});

// יצירת זוגות
generatePairsBtn.addEventListener('click', async () => {
  await setDoc(sessionRef, { pairingReady: true, updatedAt: serverTimestamp() }, { merge: true });
  managementNote.textContent = "מייצר זוגות...";
});

// ניווט בין שלבים
window.next = (n) => {
  const requiredFields = {
    2: ['mainDomain', 'secondDomain'],
    3: ['workStyle', 'teamStyle', 'workPace'],
    4: ['teamRole', 'motivationSource'],
    5: ['pressureResponse', 'conflictStyle', 'communicationStyle', 'lifeInterest']
  };
  
  if (requiredFields[n]) {
    const missing = requiredFields[n].filter(k => !selections[k]);
    if (missing.length) {
      alert('נא לענות על כל השאלות לפני המשך');
      return;
    }
  }
  
  if (!displayName.value.trim() && n === 2) {
    alert('נא למלא שם או כינוי');
    return;
  }
  
  showOnly('step' + n);
};

// התחלת שאלון
startBtn.addEventListener('click', () => {
  if (sessionEndsAt && Date.now() > sessionEndsAt) {
    resetToWaiting();
    return;
  }
  showOnly('step1');
});

// סיום שאלון
window.finish = async () => {
  if (!displayName.value.trim()) {
    alert('כתבי שם פרטי/כינוי כדי שתוכלי לזהות את עצמך במסך החיבורים.');
    return;
  }

  const required = [
    'mainDomain', 'secondDomain', 'workStyle', 'teamStyle', 'workPace',
    'teamRole', 'motivationSource', 'pressureResponse', 'conflictStyle',
    'communicationStyle', 'lifeInterest', 'importanceLevel'
  ];
  
  const missing = required.filter(k => !selections[k]);
  if (missing.length) {
    alert('נא לענות על כל השאלות לפני סיום.');
    return;
  }

  if (sessionEndsAt && Date.now() > sessionEndsAt) {
    resetToWaiting();
    return;
  }

  const payload = {
    sessionId: SESSION_ID,
    deviceId,
    displayName: displayName.value.trim(),
    mainDomain: selections.mainDomain,
    secondDomain: selections.secondDomain,
    workStyle: selections.workStyle,
    teamStyle: selections.teamStyle,
    workPace: selections.workPace,
    teamRole: selections.teamRole,
    motivationSource: selections.motivationSource,
    pressureResponse: selections.pressureResponse,
    conflictStyle: selections.conflictStyle,
    communicationStyle: selections.communicationStyle,
    lifeInterest: selections.lifeInterest,
    importanceLevel: selections.importanceLevel,
    createdAt: Date.now(),
    expiresAt: new Date(Date.now() + DAY_MS)
  };

  await setDoc(doc(responsesRef, crypto.randomUUID()), payload);
  showOnly('waiting');
};

// הצגת זיווג
async function showPairing() {
  if (pairingShown) return;
  pairingShown = true;

  showOnly('thinking');
  await new Promise(r => setTimeout(r, 5000));

  const snap = await getDocs(responsesRef);
  const now = Date.now();
  const all = snap.docs.map(d => d.data());

  const students = all
    .filter(x => x.sessionId === SESSION_ID)
    .filter(x => typeof x.createdAt === 'number' && (now - x.createdAt) <= DAY_MS);

  if (students.length < 2) {
    resetToWaiting();
    return;
  }

  const { pairs, trio } = pickBestPairs(students);

  pairingResult.innerHTML = "";

  pairs.forEach((p) => {
    const div = document.createElement('div');
    div.className = 'quote';
    
    const reasonsText = p.scoreData.reasons.length > 0 
      ? `<br><span style="opacity:.75;font-size:13px">${p.scoreData.reasons.slice(0, 2).join(' • ')}</span>`
      : '';
    
    div.innerHTML = `
      <strong>${p.a.displayName}</strong> ↔ <strong>${p.b.displayName}</strong><br>
      <span style="opacity:.9">תחום: ${p.a.mainDomain} · ${p.b.mainDomain}</span>${reasonsText}
    `;
    pairingResult.appendChild(div);
  });

  if (trio && pairs[trio.withPairIndex]) {
    const tDiv = document.createElement('div');
    tDiv.className = 'quote';
    const base = pairs[trio.withPairIndex];
    tDiv.innerHTML = `
      <strong>שלשה</strong><br>
      ${base.a.displayName} · ${base.b.displayName} · ${trio.lone.displayName}<br>
      <span style="opacity:.85">בכיתה עם מספר אי-זוגי - נוצרת שלשה אחת כדי לשמור על שותפות לכל משתתפת.</span>
    `;
    pairingResult.appendChild(tDiv);
  }

  showOnly('pairing');
}

// איפוס מערכת
window.resetApp = async () => {
  if (!confirm('האם את בטוחה? פעולה זו תמחק את כל התשובות ותאפס את המערכת.')) {
    return;
  }
  
  const snap = await getDocs(responsesRef);
  const deletePromises = snap.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
  
  await deleteDoc(sessionRef);
  
  localStorage.removeItem(INSTRUCTOR_KEY);
  isInstructor = false;
  
  resetToWaiting();
  openInstructorBtn.classList.remove('hidden');
  
  alert('המערכת אופסה בהצלחה!');
};

// אתחול
resetToWaiting();
