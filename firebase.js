import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, setDoc, deleteDoc, onSnapshot, getDoc, runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ─── FIREBASE CONFIG ─────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyBeV3TJh9soujuBrWv9V53AnZJlqbD8CNM",
  authDomain: "stay-frota.firebaseapp.com",
  projectId: "stay-frota",
  storageBucket: "stay-frota.firebasestorage.app",
  messagingSenderId: "534741603014",
  appId: "1:534741603014:web:157e85446a4552e10a3dc7",
  measurementId: "G-NESZ8G62WD"
};

const firebaseApp = initializeApp(firebaseConfig);

// Cache local persistente: enquanto offline, leituras servem do cache e escritas
// ficam numa fila local, sendo enviadas automaticamente quando a conexão volta.
let db;
try {
  db = initializeFirestore(firebaseApp, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch (e) {
  console.warn('Cache offline do Firestore indisponível (navegador/aba sem suporte), seguindo sem fila offline:', e);
  db = getFirestore(firebaseApp);
}

const auth = getAuth(firebaseApp);

// ─── COLLECTIONS ─────────────────────────────────────────────────────────────
const COLS = {
  veiculos: 'veiculos',
  os: 'ordens_servico',
  cotacoes: 'cotacoes',
  aprovacoes: 'aprovacoes',
  manutencoes: 'manutencoes',
  pecas: 'pecas',
  oficinas: 'oficinas',
  fornecedores: 'fornecedores',
  meta: 'meta'
};

// ─── STATE ───────────────────────────────────────────────────────────────────
window.state = {
  page: 'home',
  veiculos: [],
  os: [],
  cotacoes: [],
  aprovacoes: [],
  manutencoes: [],
  pecas: [],
  oficinas: [],
  fornecedores: [],
  anselmoUnlocked: false,
  osCounter: 1,
  _loaded: false
};

// ─── STATUS UI ───────────────────────────────────────────────────────────────
function fbStatus(msg, type='sync') {
  const el = document.getElementById('fb-status');
  const dot = document.getElementById('fb-dot');
  const msgEl = document.getElementById('fb-msg');
  msgEl.textContent = msg;
  dot.className = 'fb-dot' + (type==='sync'?' syncing':type==='error'?' error':'');
  el.classList.add('show');
  if(type==='ok') setTimeout(()=>el.classList.remove('show'), 2500);
}

// ─── ATRIBUIÇÃO DE USUÁRIO (para os registros de quem criou/editou o quê) ─────
function getUserName() {
  return (auth.currentUser && auth.currentUser.email) || 'Desconhecido';
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────
function showLoginScreen(errorMsg) {
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-root').innerHTML = `
    <div class="lock-overlay">
      <div class="lock-box">
        <div class="lock-icon">🚗</div>
        <div class="lock-title">STAYNET</div>
        <div class="lock-sub">Entre com seu e-mail e senha para acessar o sistema.</div>
        <div class="form-group"><input type="email" id="login-email" placeholder="E-mail" autofocus/></div>
        <div class="form-group"><input type="password" id="login-pass" placeholder="Senha" onkeydown="if(event.key==='Enter'){event.preventDefault();doLogin()}"/></div>
        <div id="login-err" style="color:#DC2626;font-size:12px;margin-bottom:8px;${errorMsg ? '' : 'display:none'}">${errorMsg || ''}</div>
        <div style="display:flex;gap:8px;justify-content:center">
          <button class="btn btn-primary" onclick="doLogin()">Entrar</button>
        </div>
      </div>
    </div>`;
  setTimeout(() => { const i = document.getElementById('login-email'); if(i) i.focus(); }, 100);
}

function hideLoginScreen() {
  document.getElementById('login-root').innerHTML = '';
}

window.doLogin = async function() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  const btn = document.querySelector('#login-root .btn-primary');
  if(btn) btn.disabled = true;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch(e) {
    console.error('Login error:', e);
    showLoginScreen('E-mail ou senha inválidos.');
  }
};

onAuthStateChanged(auth, user => {
  if(user) {
    hideLoginScreen();
    document.getElementById('loading-screen').style.display = 'flex';
    loadAllData();
  } else {
    teardownListeners();
    window.state._loaded = false;
    window.state.veiculos = []; window.state.os = []; window.state.cotacoes = [];
    window.state.aprovacoes = []; window.state.manutencoes = []; window.state.pecas = [];
    window.state.oficinas = []; window.state.fornecedores = [];
    showLoginScreen();
  }
});

// ─── FIRESTORE HELPERS ───────────────────────────────────────────────────────
async function fbSave(colName, obj) {
  fbStatus('Salvando...', 'sync');
  try {
    const id = String(obj.id || obj._fbId || Date.now());
    const ref = doc(db, colName, id);
    const expectedUpdatedAt = obj._updatedAt;
    const data = { ...obj };
    delete data._fbId;
    delete data._updatedAt;
    Object.keys(data).forEach(k => { if(data[k] === undefined) delete data[k]; });

    const user = getUserName();
    const now = Date.now();

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if(snap.exists()) {
        const current = snap.data();
        // Se o registro mudou no servidor desde que este usuário o carregou,
        // não sobrescreve silenciosamente — avisa em vez de perder a mudança alheia.
        if(expectedUpdatedAt && current._updatedAt && current._updatedAt !== expectedUpdatedAt) {
          const err = new Error('CONFLICT');
          err.code = 'CONFLICT';
          err.who = current._updatedBy;
          throw err;
        }
        data._createdBy = current._createdBy || user;
        data._createdAt = current._createdAt || now;
      } else {
        data._createdBy = user;
        data._createdAt = now;
      }
      data._updatedBy = user;
      data._updatedAt = now;
      tx.set(ref, data);
    });

    fbStatus('Salvo ✓', 'ok');
    return true;
  } catch(e) {
    if(e.code === 'CONFLICT') {
      fbStatus('Conflito de edição', 'error');
      alert(`Este registro foi alterado por ${e.who || 'outra pessoa'} enquanto você editava.\n\nRecarregue a página para ver a versão mais recente antes de salvar de novo — senão a mudança dela será perdida.`);
    } else {
      fbStatus('Erro ao salvar', 'error');
      console.error(e);
    }
    return false;
  }
}

async function fbDelete(colName, id) {
  fbStatus('Removendo...', 'sync');
  try {
    await deleteDoc(doc(db, colName, String(id)));
    fbStatus('Removido ✓', 'ok');
  } catch(e) {
    fbStatus('Erro ao remover', 'error');
    console.error(e);
  }
}

async function fbSaveMeta(key, value) {
  await setDoc(doc(db, COLS.meta, key), { value });
}

async function fbGetMeta(key, defaultVal) {
  const snap = await getDoc(doc(db, COLS.meta, key));
  if(snap.exists()) return snap.data().value;
  return defaultVal;
}

// Lê e incrementa o contador de OS numa transação atômica, evitando que duas
// pessoas criando uma OS ao mesmo tempo recebam o mesmo número.
async function fbNextOsNumber() {
  const ref = doc(db, COLS.meta, 'osCounter');
  const next = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? (Number(snap.data().value) || 1) : 1;
    tx.set(ref, { value: current + 1 });
    return current;
  });
  window.state.osCounter = next + 1;
  return next;
}

// ─── LOAD ALL DATA ────────────────────────────────────────────────────────────
// Os dados iniciais vêm do primeiro disparo de cada onSnapshot (setupListeners),
// em vez de um getDocs seguido de um onSnapshot — isso evita ler cada coleção
// duas vezes do Firestore a cada carregamento de página.
async function loadAllData() {
  try {
    fbStatus('Carregando dados...', 'sync');

    const osCounter = await fbGetMeta('osCounter', 1);
    window.state.osCounter = Number(osCounter);

    setupListeners();

  } catch(e) {
    console.error('Firebase load error:', e);
    fbStatus('Erro de conexão', 'error');
    document.getElementById('loading-screen').querySelector('.loading-sub').textContent = '❌ Erro: ' + e.message;
  }
}

// ─── REAL-TIME LISTENERS (também fazem a carga inicial) ──────────────────────
let unsubscribers = [];

function teardownListeners() {
  unsubscribers.forEach(unsub => unsub());
  unsubscribers = [];
}

function setupListeners() {
  const watched = {
    veiculos: COLS.veiculos,
    os: COLS.os,
    cotacoes: COLS.cotacoes,
    aprovacoes: COLS.aprovacoes,
    manutencoes: COLS.manutencoes,
    pecas: COLS.pecas,
    oficinas: COLS.oficinas,
    fornecedores: COLS.fornecedores
  };
  const pending = new Set(Object.keys(watched));

  const finishInitialLoad = () => {
    if(window.state._loaded) return;
    window.state._loaded = true;
    fbStatus('Conectado ✓', 'ok');
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    render();
  };

  Object.entries(watched).forEach(([stateKey, colName]) => {
    const unsub = onSnapshot(collection(db, colName), snap => {
      const items = snap.docs.map(d => {
        const data = d.data();
        return {
          ...data,
          id: Number(data.id) || data.id,
          km: data.km !== undefined ? Number(data.km) : undefined,
          valor: data.valor !== undefined ? Number(data.valor) : undefined,
          vlrPecas: data.vlrPecas !== undefined ? Number(data.vlrPecas) : undefined,
          vlrMO: data.vlrMO !== undefined ? Number(data.vlrMO) : undefined,
          vlrUnit: data.vlrUnit !== undefined ? Number(data.vlrUnit) : undefined,
          qtde: data.qtde !== undefined ? Number(data.qtde) : undefined,
        };
      });
      window.state[stateKey] = items;

      if(pending.has(stateKey)) {
        pending.delete(stateKey);
        if(pending.size === 0) finishInitialLoad();
      } else if(window.state._loaded) {
        render();
      }
    }, err => {
      console.error('Firestore listener error:', colName, err);
      fbStatus('Erro de conexão', 'error');
    });
    unsubscribers.push(unsub);
  });
}

// ─── EXPOSED FIREBASE OPS (called from inline onclick handlers) ───────────────
window._fb = {
  save: fbSave,
  del: fbDelete,
  saveMeta: fbSaveMeta,
  nextOsNumber: fbNextOsNumber,
  logout: () => signOut(auth),
  cols: COLS
};