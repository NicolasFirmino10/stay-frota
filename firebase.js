import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBeV3TJh9soujuBrWv9V53AnZJlqbD8CNM",
  authDomain: "stay-frota.firebaseapp.com",
  projectId: "stay-frota",
  storageBucket: "stay-frota.firebasestorage.app",
  messagingSenderId: "534741603014",
  appId: "1:534741603014:web:157e85446a4552e10a3dc7",
  measurementId: "G-NESZ8G62WD"
};

const app = initializeApp(firebaseConfig);

// Cache local persistente: sem internet, leituras vêm do cache e escritas ficam
// numa fila que é enviada sozinha quando a conexão volta.
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch (e) {
  console.warn('Cache offline indisponível, seguindo sem ele:', e);
  db = getFirestore(app);
}

// Coleções novas (o modelo antigo — ordens_servico, cotacoes etc. — não é mais usado).
export const COL_VEICULOS = 'frota_veiculos';
export const COL_REGISTROS = 'frota_registros';

const who = () => 'app';

export function watch(colName, onData, onError) {
  return onSnapshot(collection(db, colName),
    snap => onData(snap.docs.map(d => ({ ...d.data(), id: d.id }))),
    onError);
}

export async function save(colName, id, data) {
  const clean = { ...data };
  delete clean.id;
  Object.keys(clean).forEach(k => clean[k] === undefined && delete clean[k]);
  await setDoc(doc(db, colName, String(id)), { ...clean, _updatedBy: who(), _updatedAt: Date.now() }, { merge: true });
}

export const remove = (colName, id) => deleteDoc(doc(db, colName, String(id)));

// Grava vários documentos de uma vez (lotes de até 400 — limite do Firestore é 500).
export async function saveMany(items) {
  for (let i = 0; i < items.length; i += 400) {
    const batch = writeBatch(db);
    items.slice(i, i + 400).forEach(({ col, id, data }) =>
      batch.set(doc(db, col, String(id)), { ...data, _updatedBy: who(), _updatedAt: Date.now() }));
    await batch.commit();
  }
}
