import {
  COL_VEICULOS, COL_REGISTROS, watch, save, remove, saveMany
} from './firebase.js';
import { SEED_VEICULOS, SEED_REGISTROS } from './seed.js';

const $ = id => document.getElementById(id);
const state = { veiculos: [], registros: [], editId: null, got: { v: false, r: false } };
let unsubs = [];
const collapsed = new Set();

const brl = n => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = iso => iso ? iso.split('-').reverse().join('/') : 'sem data';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const veic = id => state.veiculos.find(v => v.id === id);
const veicLabel = v => v ? `${v.modelo} · ${v.placa}` : '(veículo removido)';

function setStatus(msg, err = false) {
  const el = $('status');
  el.textContent = msg;
  el.classList.toggle('error', err);
}

function start() {
  const onErr = e => { console.error(e); setStatus('Erro de conexão', true); };
  unsubs.push(watch(COL_VEICULOS, d => { state.veiculos = d; state.got.v = true; render(); }, onErr));
  unsubs.push(watch(COL_REGISTROS, d => { state.registros = d; state.got.r = true; render(); }, onErr));
}

// ─── Filtros ─────────────────────────────────────────────────────────────────
function filtered() {
  const v = $('x-veiculo').value, de = $('x-de').value, ate = $('x-ate').value;
  return state.registros
    .filter(r => (!v || r.veiculoId === v) &&
      (!de || (r.data && r.data >= de)) &&
      (!ate || (r.data && r.data <= ate)))
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
}

// ─── Render ──────────────────────────────────────────────────────────────────
function fillSelect(sel, withAll) {
  const cur = sel.value;
  const list = [...state.veiculos].sort((a, b) => a.modelo.localeCompare(b.modelo) || a.placa.localeCompare(b.placa));
  sel.innerHTML = (withAll ? '<option value="">Todos os veículos</option>' : '<option value="" disabled>Selecione...</option>') +
    list.map(v => `<option value="${esc(v.id)}">${esc(veicLabel(v))}${v.motorista ? ' — ' + esc(v.motorista) : ''}</option>`).join('');
  sel.value = list.some(v => v.id === cur) ? cur : '';
}

function render() {
  if (!(state.got.v && state.got.r)) return;
  $('loading').hidden = true; $('app').hidden = false;
  setStatus('Conectado ✓');
  $('seed-banner').hidden = state.veiculos.length > 0;
  fillSelect($('f-veiculo'), false);
  fillSelect($('x-veiculo'), true);

  const rows = filtered();
  const groups = {};
  rows.forEach(r => (groups[r.veiculoId] = groups[r.veiculoId] || []).push(r));
  const sum = list => list.reduce((t, r) => t + (Number(r.valor) || 0), 0);
  const ids = Object.keys(groups).sort((a, b) => (veicLabel(veic(a))).localeCompare(veicLabel(veic(b))));
  $('rows').innerHTML = ids.length ? ids.map(id => {
    const v = veic(id), list = groups[id], closed = collapsed.has(id);
    return `<tr class="group" data-toggle="${esc(id)}"><td colspan="4">${closed ? '▸' : '▾'} ${esc(veicLabel(v))}${v?.motorista ? ' — ' + esc(v.motorista) : ''}
      <span class="muted">(${list.length} registro${list.length > 1 ? 's' : ''})</span></td>
      <td class="num">${brl(sum(list))}</td><td></td></tr>` +
      (closed ? '' : list.map(r => `<tr><td>${fmtDate(r.data)}</td><td colspan="2" class="muted">${esc(v?.placa)}</td>
      <td>${esc(r.descricao)}</td><td class="num">${r.valor == null ? '—' : brl(r.valor)}</td>
      <td class="actions"><button class="btn small" data-edit="${esc(r.id)}">Editar</button>
      <button class="btn small danger" data-del="${esc(r.id)}">Excluir</button></td></tr>`).join(''));
  }).join('') : '<tr><td colspan="6" class="empty">Nenhum registro para esse filtro.</td></tr>';
  $('count').textContent = `${rows.length} registro(s) em ${ids.length} veículo(s)`;
  $('total').textContent = 'Total geral: ' + brl(sum(rows));
}

['x-veiculo', 'x-de', 'x-ate'].forEach(id => $(id).addEventListener('input', render));
$('btn-clear').onclick = () => { $('x-veiculo').value = ''; $('x-de').value = ''; $('x-ate').value = ''; render(); };

// ─── Registro (criar / editar / excluir) ─────────────────────────────────────
function resetForm() {
  state.editId = null;
  $('form').reset();
  $('f-data').value = new Date().toISOString().slice(0, 10);
  $('form-title').textContent = 'Novo registro';
  $('btn-save').textContent = 'Salvar registro';
  $('btn-cancel').hidden = true;
}

$('form').onsubmit = async e => {
  e.preventDefault();
  const data = {
    veiculoId: $('f-veiculo').value,
    data: $('f-data').value,
    descricao: $('f-desc').value.trim(),
    valor: Math.round(parseFloat($('f-valor').value) * 100) / 100
  };
  if (!data.veiculoId || !data.descricao || isNaN(data.valor)) return;
  const id = state.editId || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
  $('btn-save').disabled = true; setStatus('Salvando...');
  try { await save(COL_REGISTROS, id, data); setStatus('Salvo ✓'); resetForm(); }
  catch (err) { console.error(err); setStatus('Erro ao salvar', true); alert('Não foi possível salvar. Verifique a conexão/permissões.'); }
  $('btn-save').disabled = false;
};
$('btn-cancel').onclick = resetForm;

$('rows').onclick = async e => {
  const g = e.target.closest('tr.group');
  if (g) { const id = g.dataset.toggle; collapsed.has(id) ? collapsed.delete(id) : collapsed.add(id); return render(); }
  const ed = e.target.dataset.edit, del = e.target.dataset.del;
  if (ed) {
    const r = state.registros.find(x => x.id === ed); if (!r) return;
    state.editId = ed;
    $('f-veiculo').value = r.veiculoId; $('f-data').value = r.data || '';
    $('f-desc').value = r.descricao; $('f-valor').value = r.valor ?? '';
    $('form-title').textContent = 'Editando registro';
    $('btn-save').textContent = 'Atualizar registro';
    $('btn-cancel').hidden = false;
    scrollTo({ top: 0, behavior: 'smooth' });
  } else if (del && confirm('Excluir este registro?')) {
    try { await remove(COL_REGISTROS, del); setStatus('Removido ✓'); } catch (err) { console.error(err); setStatus('Erro ao remover', true); }
  }
};

// ─── Veículos ────────────────────────────────────────────────────────────────
let editVeic = null;
function openVeic(v) {
  editVeic = v || null;
  $('form-veic').reset();
  $('v-title').textContent = v ? 'Editar veículo / motorista' : 'Novo veículo';
  $('v-placa').readOnly = !!v;
  if (v) { $('v-modelo').value = v.modelo; $('v-placa').value = v.placa; $('v-motorista').value = v.motorista || ''; }
  $('dlg-veic').showModal();
}
$('btn-veic').onclick = () => openVeic(null);
$('btn-veic-edit').onclick = () => {
  const v = veic($('f-veiculo').value);
  if (!v) return alert('Selecione um veículo no campo "Veículo" para editar.');
  openVeic(v);
};
$('v-cancel').onclick = () => $('dlg-veic').close();
$('form-veic').onsubmit = async e => {
  const placa = $('v-placa').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!placa) return;
  if (!editVeic && state.veiculos.some(v => v.id === placa)) { e.preventDefault(); alert('Já existe um veículo com essa placa.'); return; }
  try {
    await save(COL_VEICULOS, placa, { placa, modelo: $('v-modelo').value.trim().toUpperCase(), motorista: $('v-motorista').value.trim().toUpperCase() });
    $('f-veiculo').value = placa;
  } catch (err) { console.error(err); alert('Não foi possível salvar o veículo.'); }
};

// ─── Importação única da planilha ────────────────────────────────────────────
$('btn-seed').onclick = async () => {
  if (!confirm(`Importar ${SEED_VEICULOS.length} veículos e ${SEED_REGISTROS.length} registros da planilha 2026?`)) return;
  $('btn-seed').disabled = true; setStatus('Importando...');
  try {
    await saveMany([
      ...SEED_VEICULOS.map(({ id, ...data }) => ({ col: COL_VEICULOS, id, data })),
      ...SEED_REGISTROS.map(({ id, ...data }) => ({ col: COL_REGISTROS, id, data }))
    ]);
    setStatus('Importação concluída ✓');
  } catch (err) { console.error(err); setStatus('Erro na importação', true); alert('Falha na importação: ' + err.message); }
  $('btn-seed').disabled = false;
};

// ─── Exportar Excel (respeita os filtros atuais) ─────────────────────────────
$('btn-export').onclick = () => {
  const rows = filtered();
  if (!rows.length) return alert('Nada para exportar com esse filtro.');
  const toDate = iso => iso ? new Date(iso + 'T12:00:00') : '';
  const aoa = [['Data', 'Placa', 'Veículo', 'Motorista', 'Defeito / serviço', 'Valor (R$)']];
  rows.forEach(r => { const v = veic(r.veiculoId); aoa.push([toDate(r.data), v?.placa || '', v?.modelo || '', v?.motorista || '', r.descricao, r.valor ?? '']); });
  const total = rows.reduce((s, r) => s + (Number(r.valor) || 0), 0);
  aoa.push([], ['', '', '', '', 'TOTAL', total]);
  const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true });
  ws['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 60 }, { wch: 14 }];
  for (let r = 1; r <= aoa.length; r++) {
    const d = ws['A' + r], m = ws['F' + r];
    if (d && d.t === 'd') d.z = 'dd/mm/yyyy';
    if (m && m.t === 'n') m.z = '#,##0.00';
  }
  const por = {};
  rows.forEach(r => { const k = r.veiculoId; por[k] = por[k] || { q: 0, t: 0 }; por[k].q++; por[k].t += Number(r.valor) || 0; });
  const resumo = [['Placa', 'Veículo', 'Motorista', 'Qtd. registros', 'Total gasto (R$)'],
    ...Object.entries(por).map(([id, x]) => { const v = veic(id); return [v?.placa || id, v?.modelo || '', v?.motorista || '', x.q, x.t]; }).sort((a, b) => b[4] - a[4]),
    [], ['', '', 'TOTAL', rows.length, total]];
  const ws2 = XLSX.utils.aoa_to_sheet(resumo);
  ws2['!cols'] = [{ wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Registros');
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumo por veículo');
  const sel = $('x-veiculo').value;
  const parts = ['frota', sel || 'todos', $('x-de').value, $('x-ate').value].filter(Boolean);
  XLSX.writeFile(wb, parts.join('_') + '.xlsx');
};

resetForm();
start();
