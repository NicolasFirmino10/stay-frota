import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc,
  getDocs, setDoc, deleteDoc, onSnapshot, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
const db = getFirestore(firebaseApp);

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

// ─── FIRESTORE HELPERS ───────────────────────────────────────────────────────
async function fbLoad(colName) {
  const snap = await getDocs(collection(db, colName));
  return snap.docs.map(d => ({ ...d.data(), _fbId: d.id }));
}

async function fbSave(colName, obj) {
  fbStatus('Salvando...', 'sync');
  try {
    const id = String(obj.id || obj._fbId || Date.now());
    const data = { ...obj };
    delete data._fbId;
    Object.keys(data).forEach(k => { if(data[k] === undefined) delete data[k]; });
    await setDoc(doc(db, colName, id), data);
    fbStatus('Salvo ✓', 'ok');
  } catch(e) {
    fbStatus('Erro ao salvar', 'error');
    console.error(e);
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

// ─── LOAD ALL DATA ────────────────────────────────────────────────────────────
async function loadAllData() {
  try {
    fbStatus('Carregando dados...', 'sync');

    const [veiculos, os, cotacoes, aprovacoes, manutencoes, pecas, oficinas, fornecedores, osCounter] = await Promise.all([
      fbLoad(COLS.veiculos),
      fbLoad(COLS.os),
      fbLoad(COLS.cotacoes),
      fbLoad(COLS.aprovacoes),
      fbLoad(COLS.manutencoes),
      fbLoad(COLS.pecas),
      fbLoad(COLS.oficinas),
      fbLoad(COLS.fornecedores),
      fbGetMeta('osCounter', 1)
    ]);

    // Normalize numeric IDs
    const norm = arr => arr.map(x => ({
      ...x,
      id: Number(x.id) || x.id,
      km: x.km !== undefined ? Number(x.km) : undefined,
      valor: x.valor !== undefined ? Number(x.valor) : undefined,
      vlrPecas: x.vlrPecas !== undefined ? Number(x.vlrPecas) : undefined,
      vlrMO: x.vlrMO !== undefined ? Number(x.vlrMO) : undefined,
      vlrUnit: x.vlrUnit !== undefined ? Number(x.vlrUnit) : undefined,
      qtde: x.qtde !== undefined ? Number(x.qtde) : undefined,
    }));

    window.state.veiculos = norm(veiculos);
    window.state.os = norm(os);
    window.state.cotacoes = norm(cotacoes);
    window.state.aprovacoes = norm(aprovacoes);
    window.state.manutencoes = norm(manutencoes);
    window.state.pecas = norm(pecas);
    window.state.oficinas = norm(oficinas);
    window.state.fornecedores = norm(fornecedores);
    window.state.osCounter = Number(osCounter);
    window.state._loaded = true;

    fbStatus('Conectado ✓', 'ok');

    // Hide loading, show app
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    render();

    // Start real-time listeners
    setupListeners();

  } catch(e) {
    console.error('Firebase load error:', e);
    fbStatus('Erro de conexão', 'error');
    document.getElementById('loading-screen').querySelector('.loading-sub').textContent = '❌ Erro: ' + e.message;
  }
}

// ─── REAL-TIME LISTENERS ──────────────────────────────────────────────────────
function setupListeners() {
  const watch = (colName, stateKey) => {
    onSnapshot(collection(db, colName), snap => {
      if(!window.state._loaded) return;
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
      render();
    });
  };

  watch(COLS.veiculos, 'veiculos');
  watch(COLS.os, 'os');
  watch(COLS.cotacoes, 'cotacoes');
  watch(COLS.aprovacoes, 'aprovacoes');
  watch(COLS.manutencoes, 'manutencoes');
  watch(COLS.pecas, 'pecas');
  watch(COLS.oficinas, 'oficinas');
  watch(COLS.fornecedores, 'fornecedores');
}

// ─── EXPOSED FIREBASE OPS (called from inline onclick handlers) ───────────────
window._fb = {
  save: fbSave,
  del: fbDelete,
  saveMeta: fbSaveMeta,
  cols: COLS
};

// Start loading
loadAllData();