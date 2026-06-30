import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc,
  getDocs, setDoc, deleteDoc, onSnapshot,
  writeBatch, query, orderBy, getDoc
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
  osCounter: 6,
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

// ─── SEED DATA (only if empty) ────────────────────────────────────────────────
const SEED_VEICULOS = [
  {id:1,placa:'ABC-1234',modelo:'Fiat Strada 1.3',motorista:'Carlos Silva',ano:2022,cor:'Branco',obs:''},
  {id:2,placa:'DEF-5678',modelo:'VW Gol 1.0',motorista:'Maria Oliveira',ano:2021,cor:'Prata',obs:''},
  {id:3,placa:'GHI-9012',modelo:'Hyundai HB20 1.0',motorista:'João Santos',ano:2023,cor:'Preto',obs:''},
  {id:4,placa:'JKL-3456',modelo:'Renault Kwid 1.0',motorista:'Ana Lima',ano:2022,cor:'Vermelho',obs:''},
  {id:5,placa:'MNO-7890',modelo:'Chevrolet S10 2.8',motorista:'Pedro Rocha',ano:2020,cor:'Cinza',obs:''},
];
const SEED_OS = [
  {id:1,num:'OS-001',data:'2025-06-01',placa:'ABC-1234',modelo:'Fiat Strada 1.3',motorista:'Carlos Silva',km:45200,problema:'Freio traseiro com ruído intenso',status:'Concluída',prioridade:'Alta'},
  {id:2,num:'OS-002',data:'2025-06-05',placa:'DEF-5678',modelo:'VW Gol 1.0',motorista:'Maria Oliveira',km:32100,problema:'Troca de óleo e filtro',status:'Execução',prioridade:'Normal'},
  {id:3,num:'OS-003',data:'2025-06-10',placa:'GHI-9012',modelo:'Hyundai HB20 1.0',motorista:'João Santos',km:78500,problema:'Ar condicionado não funciona',status:'Aguardando Aprovação',prioridade:'Alta'},
  {id:4,num:'OS-004',data:'2025-06-15',placa:'JKL-3456',modelo:'Renault Kwid 1.0',motorista:'Ana Lima',km:15300,problema:'Revisão preventiva 15.000 km',status:'Cotação',prioridade:'Normal'},
  {id:5,num:'OS-005',data:'2025-06-18',placa:'MNO-7890',modelo:'Chevrolet S10 2.8',motorista:'Pedro Rocha',km:52000,problema:'Pneu traseiro direito furado',status:'Diagnóstico/Oficina',prioridade:'Urgente'},
];
const SEED_COTACOES = [
  {id:1,os:'OS-003',peca:'Compressor Ar Cond.',fornecedor:'Oficina Central Fortaleza',valor:850,prazo:5,pgto:'Boleto 30d',obs:'',escolhido:true},
  {id:2,os:'OS-003',peca:'Compressor Ar Cond.',fornecedor:'Auto Peças Norte',valor:780,prazo:7,pgto:'À vista',obs:'Sem garantia',escolhido:false},
];
const SEED_APROVACOES = [
  {id:1,os:'OS-001',valor:45,aprovador:'Júlio',status:'Aprovada',data:'2025-06-02',autorizado:'Júlio',obs:''},
  {id:2,os:'OS-002',valor:180,aprovador:'Anselmo',status:'Aprovada',data:'2025-06-06',autorizado:'Anselmo',obs:''},
  {id:3,os:'OS-003',valor:850,aprovador:'Anselmo',status:'Aguardando Aprovação',data:'',autorizado:'',obs:'Aguardando retorno'},
  {id:4,os:'OS-004',valor:320,aprovador:'Anselmo',status:'Aguardando Aprovação',data:'',autorizado:'',obs:''},
];
const SEED_MANUTENCOES = [
  {id:1,os:'OS-001',data:'2025-06-03',oficina:'Oficina Central Fortaleza',tipo:'Corretiva',desc:'Troca pastilha freio traseiro',vlrPecas:38,vlrMO:25,nf:'NF 00123',garantia:'2025-12-03'},
  {id:2,os:'OS-002',data:'2025-06-07',oficina:'Mecânica Express',tipo:'Preventiva',desc:'Troca óleo 10W40 e filtro',vlrPecas:85,vlrMO:95,nf:'NF 00456',garantia:''},
];
const SEED_PECAS = [
  {id:1,os:'OS-001',peca:'Pastilha de Freio Traseira',marca:'Bosch',qtde:1,fornecedor:'Oficina Central Fortaleza',vlrUnit:38,obs:'Par'},
  {id:2,os:'OS-002',peca:'Óleo Motor 10W40 (1L)',marca:'Castrol',qtde:4,fornecedor:'Mecânica Express',vlrUnit:25,obs:''},
  {id:3,os:'OS-002',peca:'Filtro de Óleo',marca:'Mann',qtde:1,fornecedor:'Mecânica Express',vlrUnit:35,obs:''},
];
const SEED_OFICINAS = [
  {id:1,razao:'Oficina Central Fortaleza Ltda.',fantasia:'Oficina Central Fortaleza',cnpj:'12.345.678/0001-99',tel:'(85) 3123-4567',endereco:'Rua das Flores, 100',cidade:'Fortaleza - CE',contato:'José Mecânico'},
  {id:2,razao:'Mecânica Express Eireli',fantasia:'Mecânica Express',cnpj:'98.765.432/0001-11',tel:'(85) 99876-5432',endereco:'Av. Principal, 500',cidade:'Fortaleza - CE',contato:'Carlos'},
];

async function seedIfEmpty(colName, seedData) {
  const existing = await getDocs(collection(db, colName));
  if(existing.empty) {
    const batch = writeBatch(db);
    seedData.forEach(item => {
      const d = { ...item };
      batch.set(doc(db, colName, String(item.id)), d);
    });
    await batch.commit();
    return seedData;
  }
  return existing.docs.map(d => ({ ...d.data() }));
}

// ─── LOAD ALL DATA ────────────────────────────────────────────────────────────
async function loadAllData() {
  try {
    fbStatus('Carregando dados...', 'sync');

    const [veiculos, os, cotacoes, aprovacoes, manutencoes, pecas, oficinas, fornecedores, osCounter] = await Promise.all([
      seedIfEmpty(COLS.veiculos, SEED_VEICULOS),
      seedIfEmpty(COLS.os, SEED_OS),
      seedIfEmpty(COLS.cotacoes, SEED_COTACOES),
      seedIfEmpty(COLS.aprovacoes, SEED_APROVACOES),
      seedIfEmpty(COLS.manutencoes, SEED_MANUTENCOES),
      seedIfEmpty(COLS.pecas, SEED_PECAS),
      seedIfEmpty(COLS.oficinas, SEED_OFICINAS),
      fbLoad(COLS.fornecedores),
      fbGetMeta('osCounter', 6)
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
      prazo: x.prazo !== undefined ? Number(x.prazo) : undefined,
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
          prazo: data.prazo !== undefined ? Number(data.prazo) : undefined,
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