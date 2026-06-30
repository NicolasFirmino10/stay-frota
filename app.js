// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = n => n!=null ? 'R$ '+Number(n).toLocaleString('pt-BR',{minimumFractionDigits:2}) : '-';
const fmtDate = d => { if(!d)return '-'; try{const [y,m,dd]=d.split('-');return `${dd}/${m}/${y}`}catch{return d}};
const today = () => new Date().toISOString().split('T')[0];

function nextOS(){
  const n = String(state.osCounter).padStart(3,'0');
  state.osCounter++;
  if(window._fb) window._fb.saveMeta('osCounter', state.osCounter);
  return `OS-${n}`;
}
function getVeiculo(placa){return state.veiculos.find(v=>v.placa===placa)||{}}
function getStatusBadge(s){
  const map={
    'Concluída':'badge-green','Execução':'badge-blue','Aguardando Aprovação':'badge-amber',
    'Cotação':'badge-purple','Diagnóstico/Oficina':'badge-red','Aberta':'badge-gray',
    'Aprovada':'badge-green','Reprovada':'badge-red','Cancelada':'badge-gray','Descartada':'badge-gray',
    'Preventiva':'badge-green','Corretiva':'badge-amber'
  };
  return map[s]||'badge-gray';
}
function getPrioridadeBadge(p){
  return p==='Urgente'?'badge-red':p==='Alta'?'badge-amber':'badge-gray';
}
function getAprovadorBadge(a){return a==='Anselmo'?'badge-purple':'badge-blue'}

// ─── NAVIGATION ──────────────────────────────────────────────────────────────
function go(page){
  state.page=page;
  document.querySelectorAll('.nav-item').forEach(el=>{
    el.classList.toggle('active', el.dataset.page===page);
  });
  render();
}

// ─── MODAL ───────────────────────────────────────────────────────────────────
function openModal(html){document.getElementById('modal-root').innerHTML=html}
function closeModal(){document.getElementById('modal-root').innerHTML=''}

// ─── LOCK ────────────────────────────────────────────────────────────────────
function showLock(cb){
  document.getElementById('lock-root').innerHTML=`
    <div class="lock-overlay">
      <div class="lock-box">
        <div class="lock-icon">🔐</div>
        <div class="lock-title">Área Restrita</div>
        <div class="lock-sub">Apenas <strong>Anselmo</strong> pode aprovar valores acima de R$ 50.<br>Digite a senha para continuar.</div>
        <div class="form-group"><input type="password" id="lock-pass" placeholder="Senha..." autofocus/></div>
        <div id="lock-err" style="color:#DC2626;font-size:12px;margin-bottom:8px;display:none">Senha incorreta.</div>
        <div style="display:flex;gap:8px;justify-content:center">
          <button class="btn btn-primary" onclick="tryLock()">Entrar</button>
          <button class="btn btn-outline" onclick="closeLock()">Cancelar</button>
        </div>
      </div>
    </div>`;
  window._lockCb = cb;
  setTimeout(()=>{const i=document.getElementById('lock-pass');if(i)i.focus();},100);
}
function tryLock(){
  const p=document.getElementById('lock-pass').value;
  if(p==='anselmo123'){
    const cb=window._lockCb;
    closeLock();
    if(cb)cb();
  } else {
    document.getElementById('lock-err').style.display='block';
  }
}
function closeLock(){document.getElementById('lock-root').innerHTML='';window._lockCb=null}

// ─── PAGES ───────────────────────────────────────────────────────────────────

function calcHomeFinanceiro(periodo, dtIni, dtFim){
  const now=new Date();
  let ini, fim=new Date(now);
  fim.setHours(23,59,59,999);
  if(periodo==='30d'){ini=new Date(now);ini.setDate(ini.getDate()-29);ini.setHours(0,0,0,0);}
  else if(periodo==='trim'){ini=new Date(now);ini.setMonth(ini.getMonth()-3);ini.setHours(0,0,0,0);}
  else if(periodo==='sem'){ini=new Date(now);ini.setMonth(ini.getMonth()-6);ini.setHours(0,0,0,0);}
  else if(periodo==='custom'&&dtIni&&dtFim){ini=new Date(dtIni+'T00:00:00');fim=new Date(dtFim+'T23:59:59');}
  else{ini=null;}
  let manuts=state.manutencoes;
  if(ini){
    manuts=manuts.filter(m=>{
      if(!m.data)return false;
      const d=new Date(m.data+'T12:00:00');
      return d>=ini&&d<=fim;
    });
  }
  const total=manuts.reduce((a,m)=>a+(+m.vlrPecas||0)+(+m.vlrMO||0),0);
  const avg=state.veiculos.length?total/state.veiculos.length:0;
  return{total,avg};
}
function renderHomeFinanceiro(){
  const periodo=document.getElementById('hf-periodo')?.value||'all';
  const dtIni=document.getElementById('hf-ini')?.value||'';
  const dtFim=document.getElementById('hf-fim')?.value||'';
  const{total,avg}=calcHomeFinanceiro(periodo,dtIni,dtFim);
  document.getElementById('hf-total').textContent=fmt(total);
  document.getElementById('hf-avg').textContent=fmt(avg.toFixed(2));
  const custom=document.getElementById('hf-custom');
  if(custom) custom.style.display=periodo==='custom'?'flex':'none';
}
function renderHome(){
  const os=state.os;
  const statusManut=['Diagnóstico/Oficina','Cotação','Aguardando Aprovação','Aprovada','Execução'];
  const veicsManut=new Set(os.filter(o=>statusManut.includes(o.status)).map(o=>o.placa)).size;
  const diag=new Set(os.filter(o=>o.status==='Diagnóstico/Oficina').map(o=>o.placa)).size;
  const aguard=new Set(os.filter(o=>o.status==='Aguardando Aprovação').map(o=>o.placa)).size;
  const exec=new Set(os.filter(o=>o.status==='Execução').map(o=>o.placa)).size;
  const pctDiag=veicsManut?Math.round((diag/veicsManut)*100):0;
  const pctAguard=veicsManut?Math.round((aguard/veicsManut)*100):0;
  const pctExec=veicsManut?Math.round((exec/veicsManut)*100):0;
  const{total:totalMes,avg}=calcHomeFinanceiro('all','','');
  return `
    <div class="topbar"><div><div class="page-title">🏠 Início</div><div class="page-sub">STAYNET · Gestão de Frota</div></div>
    <span style="font-size:11px;color:#16A34A;background:#DCFCE7;padding:4px 10px;border-radius:20px;font-weight:600">🔥 Firebase Ativo</span></div>
    <div class="content">
      <div class="alert alert-green">✅ Dados sincronizados com Firebase Firestore em tempo real. Qualquer alteração é persistida automaticamente na nuvem.</div>
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:14px">▸ Indicadores Operacionais</div>
        <div class="kpi-grid" style="margin-bottom:14px">
          <div class="kpi" style="border-color:var(--blue);background:var(--blue-light)">
            <div class="kpi-label">🔧 Em Manutenção</div>
            <div class="kpi-val" style="color:var(--blue)">${veicsManut}</div>
            <div style="font-size:11px;color:var(--gray);margin-top:2px">veículos ativos</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
          <div style="background:var(--red-light);border:1px solid #FECACA;border-radius:10px;padding:14px;text-align:center">
            <div style="font-size:10px;color:var(--red);font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Diagnóstico/Oficina</div>
            <div style="font-size:24px;font-weight:700;color:var(--red);margin:4px 0">${diag}</div>
            <div style="font-size:11px;color:var(--gray)">${pctDiag}% da manutenção</div>
          </div>
          <div style="background:var(--amber-light);border:1px solid #FCD34D;border-radius:10px;padding:14px;text-align:center">
            <div style="font-size:10px;color:var(--amber);font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Aguard. Aprovação</div>
            <div style="font-size:24px;font-weight:700;color:var(--amber);margin:4px 0">${aguard}</div>
            <div style="font-size:11px;color:var(--gray)">${pctAguard}% da manutenção</div>
          </div>
          <div style="background:var(--blue-light);border:1px solid #BFDBFE;border-radius:10px;padding:14px;text-align:center">
            <div style="font-size:10px;color:var(--blue);font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Em Execução</div>
            <div style="font-size:24px;font-weight:700;color:var(--blue);margin:4px 0">${exec}</div>
            <div style="font-size:11px;color:var(--gray)">${pctExec}% da manutenção</div>
          </div>
        </div>
      </div>
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px">
          <div class="card-title">▸ Indicadores Financeiros</div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <select id="hf-periodo" onchange="renderHomeFinanceiro()" style="padding:5px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px">
              <option value="all">Todos os períodos</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="trim">Trimestre</option>
              <option value="sem">Semestre</option>
              <option value="custom">Personalizado</option>
            </select>
            <div id="hf-custom" style="display:none;align-items:center;gap:6px">
              <input type="date" id="hf-ini" onchange="renderHomeFinanceiro()" style="padding:5px 8px;border:1px solid var(--border);border-radius:8px;font-size:12px"/>
              <span style="font-size:12px;color:var(--gray)">até</span>
              <input type="date" id="hf-fim" onchange="renderHomeFinanceiro()" style="padding:5px 8px;border:1px solid var(--border);border-radius:8px;font-size:12px"/>
            </div>
          </div>
        </div>
        <div class="kpi-grid">
          <div class="kpi"><div class="kpi-label">💰 Gasto Total</div><div id="hf-total" class="kpi-val" style="color:var(--green);font-size:20px">${fmt(totalMes)}</div></div>
          <div class="kpi"><div class="kpi-label">📊 Média / Veículo</div><div id="hf-avg" class="kpi-val" style="color:var(--blue);font-size:20px">${fmt(avg.toFixed(2))}</div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:14px">▸ Navegação Rápida</div>
        <div class="home-nav-grid">
          ${[
            {p:'os',i:'📋',l:'Ordens de Serviço'},
            {p:'cotacoes',i:'💰',l:'Cotações'},
            {p:'aprovacoes',i:'✅',l:'Aprovações'},
            {p:'manutencoes',i:'🔧',l:'Manutenções'},
            {p:'historico',i:'📂',l:'Histórico'},
            {p:'oficinas',i:'🏭',l:'Oficinas'},
            {p:'veiculos',i:'🚙',l:'Veículos'},
            {p:'fornecedores',i:'🏪',l:'Fornecedores'},
            {p:'dashboard',i:'📊',l:'Dashboard'},
          ].map(n=>`<div class="home-nav-item" onclick="go('${n.p}')"><div class="nav-icon">${n.i}</div><div class="nav-label">${n.l}</div></div>`).join('')}
        </div>
      </div>
    </div>`;
}

// ─── ORDENS DE SERVIÇO ───────────────────────────────────────────────────────
function renderOS(){
  const rows=state.os.map(o=>`
    <tr>
      <td><strong>${o.num}</strong></td>
      <td>${fmtDate(o.data)}</td>
      <td><strong>${o.placa}</strong></td>
      <td>${o.modelo}</td>
      <td>${o.motorista}</td>
      <td>${Number(o.km||0).toLocaleString('pt-BR')}</td>
      <td style="max-width:200px">${o.problema}</td>
      <td><span class="badge ${getStatusBadge(o.status)}">${o.status}</span></td>
      <td><div class="action-btns">
        <button class="btn btn-sm btn-outline" onclick="editOS(${o.id})">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="delOS(${o.id})">🗑</button>
      </div></td>
    </tr>`).join('');
  return `
    <div class="topbar"><div><div class="page-title">📋 Ordens de Serviço</div><div class="page-sub">Responsável: Júlio</div></div>
      <button class="btn btn-primary" onclick="novaOS()">+ Nova OS</button></div>
    <div class="content">
      <div class="card">
        <div class="table-wrap">
          <table><thead><tr><th>OS #</th><th>Data</th><th>Placa</th><th>Veículo</th><th>Motorista</th><th>KM</th><th>Defeito</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>${rows||'<tr><td colspan="9" class="empty-state">Nenhuma OS cadastrada</td></tr>'}</tbody></table>
        </div>
      </div>
    </div>`;
}
function novaOS(){
  const veics=state.veiculos.map(v=>`<option value="${v.placa}">${v.placa} – ${v.modelo}</option>`).join('');
  openModal(`<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-header"><div class="modal-title">📋 Nova Ordem de Serviço</div><button class="btn btn-ghost" onclick="closeModal()">✕</button></div>
      <div class="form-row">
        <div class="form-group"><label>Placa *</label><select id="os-placa" onchange="autoFillOS()"><option value="">Selecione...</option>${veics}</select></div>
        <div class="form-group"><label>Data *</label><input type="date" id="os-data" value="${today()}"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Veículo</label><input id="os-modelo" readonly placeholder="Preenchimento automático"/></div>
        <div class="form-group"><label>Motorista</label><input id="os-motorista" readonly placeholder="Preenchimento automático"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>KM Atual *</label><input type="number" id="os-km"/></div>
      </div>
      <div class="form-group"><label>Defeito Relatado *</label><textarea id="os-problema" rows="3" oninput="this.value=this.value.toUpperCase()"></textarea></div>
      <div class="form-group"><label>Status</label><select id="os-status"><option>Aberta</option><option>Diagnóstico/Oficina</option><option>Cotação</option><option>Aguardando Aprovação</option><option>Execução</option><option>Concluída</option><option>Cancelada</option></select></div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveOS()">Salvar OS</button>
      </div>
    </div></div>`);
}
function autoFillOS(isEdit){
  const placa=(isEdit?document.getElementById('os-placa-edit'):document.getElementById('os-placa')).value;
  const v=getVeiculo(placa);
  if(isEdit){
    document.getElementById('os-modelo-edit').value=v.modelo||'';
    document.getElementById('os-motorista-edit').value=v.motorista||'';
  } else {
    document.getElementById('os-modelo').value=v.modelo||'';
    document.getElementById('os-motorista').value=v.motorista||'';
  }
}
async function saveOS(){
  const placa=document.getElementById('os-placa').value;
  const v=getVeiculo(placa);
  const num=nextOS();
  const id=Date.now();
  const obj={
    id, num,
    data:document.getElementById('os-data').value,
    placa, modelo:v.modelo||document.getElementById('os-modelo').value,
    motorista:v.motorista||document.getElementById('os-motorista').value,
    km:+document.getElementById('os-km').value||0,
    problema:document.getElementById('os-problema').value.toUpperCase(),
    status:document.getElementById('os-status').value,
    prioridade:'Normal'
  };
  if(!obj.placa||!obj.problema){alert('Preencha Placa e Defeito.');return}

  await window._fb.save(window._fb.cols.os, obj);
  closeModal();
}
function editOS(id){
  const o=state.os.find(x=>x.id===id);
  if(!o)return;
  const veics=state.veiculos.map(v=>`<option value="${v.placa}"${v.placa===o.placa?' selected':''}>${v.placa} – ${v.modelo}</option>`).join('');
  openModal(`<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-header"><div class="modal-title">✏️ Editar OS ${o.num}</div><button class="btn btn-ghost" onclick="closeModal()">✕</button></div>
      <input type="hidden" id="edit-os-id" value="${id}"/>
      <div class="form-row">
        <div class="form-group"><label>Placa</label><select id="os-placa-edit" onchange="autoFillOS(true)"><option value="">Selecione...</option>${veics}</select></div>
        <div class="form-group"><label>Data</label><input type="date" id="os-data-edit" value="${o.data}"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Veículo</label><input id="os-modelo-edit" value="${o.modelo}" readonly/></div>
        <div class="form-group"><label>Motorista</label><input id="os-motorista-edit" value="${o.motorista}" readonly/></div>
      </div>
      <div class="form-group"><label>KM</label><input type="number" id="os-km-edit" value="${o.km}"/></div>
      <div class="form-group"><label>Defeito</label><textarea id="os-problema-edit" rows="3" oninput="this.value=this.value.toUpperCase()">${o.problema}</textarea></div>
      <div class="form-group"><label>Status</label><select id="os-status-edit">${['Aberta','Diagnóstico/Oficina','Cotação','Aguardando Aprovação','Execução','Concluída','Cancelada'].map(s=>`<option${s===o.status?' selected':''}>${s}</option>`).join('')}</select></div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="updateOS()">Atualizar</button>
      </div>
    </div></div>`);
}
async function updateOS(){
  const id=+document.getElementById('edit-os-id').value;
  const o=state.os.find(x=>x.id===id);
  if(!o)return;
  const placa=document.getElementById('os-placa-edit').value;
  const v=getVeiculo(placa);
  const updated={...o,
    placa, modelo:v.modelo||document.getElementById('os-modelo-edit').value,
    motorista:v.motorista||document.getElementById('os-motorista-edit').value,
    data:document.getElementById('os-data-edit').value,
    km:+document.getElementById('os-km-edit').value||0,
    problema:document.getElementById('os-problema-edit').value.toUpperCase(),
    status:document.getElementById('os-status-edit').value,
    prioridade:o.prioridade||'Normal'
  };
  await window._fb.save(window._fb.cols.os, updated);
  closeModal();
}
async function delOS(id){
  if(!confirm('Remover esta OS?'))return;
  await window._fb.del(window._fb.cols.os, id);
}

// ─── VEÍCULOS ────────────────────────────────────────────────────────────────
function renderVeiculos(){
  const rows=state.veiculos.map(v=>`
    <tr>
      <td><strong>${v.placa}</strong></td>
      <td>${v.modelo}</td>
      <td>${v.motorista}</td>
      <td>${v.ano}</td>
      <td>${v.cor}</td>
      <td>${v.obs||'-'}</td>
      <td><div class="action-btns">
        <button class="btn btn-sm btn-outline" onclick="editVeiculo(${v.id})">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="delVeiculo(${v.id})">🗑</button>
      </div></td>
    </tr>`).join('');
  return `
    <div class="topbar"><div><div class="page-title">🚙 Veículos</div><div class="page-sub">Cadastro da frota</div></div>
      <button class="btn btn-primary" onclick="novoVeiculo()">+ Novo Veículo</button></div>
    <div class="content">
      <div class="alert alert-blue">💡 Os dados de veículo e motorista preenchem automaticamente nas Ordens de Serviço ao selecionar a placa.</div>
      <div class="card">
        <div class="table-wrap">
          <table><thead><tr><th>Placa</th><th>Modelo</th><th>Motorista</th><th>Ano</th><th>Cor</th><th>Obs.</th><th>Ações</th></tr></thead>
          <tbody>${rows}</tbody></table>
        </div>
      </div>
    </div>`;
}
function novoVeiculo(){
  openModal(`<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-header"><div class="modal-title">🚙 Cadastrar Veículo</div><button class="btn btn-ghost" onclick="closeModal()">✕</button></div>
      <div class="form-row"><div class="form-group"><label>Placa *</label><input id="v-placa" placeholder="ABC-1234"/></div>
        <div class="form-group"><label>Modelo *</label><input id="v-modelo" placeholder="Fiat Strada 1.3"/></div></div>
      <div class="form-row"><div class="form-group"><label>Motorista *</label><input id="v-motorista"/></div>
        <div class="form-group"><label>Ano</label><input type="number" id="v-ano" value="${new Date().getFullYear()}"/></div></div>
      <div class="form-row"><div class="form-group"><label>Cor</label><input id="v-cor"/></div>
        <div class="form-group"><label>Observação</label><input id="v-obs"/></div></div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveVeiculo()">Salvar</button>
      </div>
    </div></div>`);
}
async function saveVeiculo(){
  const placa=document.getElementById('v-placa').value.trim().toUpperCase();
  if(!placa){alert('Informe a placa.');return}
  if(state.veiculos.find(v=>v.placa===placa)){alert('Placa já cadastrada!');return}
  const id=Date.now();
  const obj={id, placa, modelo:document.getElementById('v-modelo').value, motorista:document.getElementById('v-motorista').value, ano:+document.getElementById('v-ano').value, cor:document.getElementById('v-cor').value, obs:document.getElementById('v-obs').value};
  await window._fb.save(window._fb.cols.veiculos, obj);
  closeModal();
}
function editVeiculo(id){
  const v=state.veiculos.find(x=>x.id===id);if(!v)return;
  openModal(`<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-header"><div class="modal-title">✏️ Editar Veículo</div><button class="btn btn-ghost" onclick="closeModal()">✕</button></div>
      <input type="hidden" id="edit-v-id" value="${id}"/>
      <div class="form-row"><div class="form-group"><label>Placa</label><input id="v-placa-e" value="${v.placa}"/></div>
        <div class="form-group"><label>Modelo</label><input id="v-modelo-e" value="${v.modelo}"/></div></div>
      <div class="form-row"><div class="form-group"><label>Motorista</label><input id="v-motorista-e" value="${v.motorista}"/></div>
        <div class="form-group"><label>Ano</label><input type="number" id="v-ano-e" value="${v.ano}"/></div></div>
      <div class="form-row"><div class="form-group"><label>Cor</label><input id="v-cor-e" value="${v.cor}"/></div>
        <div class="form-group"><label>Obs.</label><input id="v-obs-e" value="${v.obs||''}"/></div></div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="updateVeiculo()">Atualizar</button>
      </div>
    </div></div>`);
}
async function updateVeiculo(){
  const id=+document.getElementById('edit-v-id').value;
  const v=state.veiculos.find(x=>x.id===id);if(!v)return;
  const updated={...v,
    placa:document.getElementById('v-placa-e').value.toUpperCase(),
    modelo:document.getElementById('v-modelo-e').value,
    motorista:document.getElementById('v-motorista-e').value,
    ano:+document.getElementById('v-ano-e').value,
    cor:document.getElementById('v-cor-e').value,
    obs:document.getElementById('v-obs-e').value
  };
  await window._fb.save(window._fb.cols.veiculos, updated);
  closeModal();
}
async function delVeiculo(id){if(!confirm('Remover veículo?'))return;await window._fb.del(window._fb.cols.veiculos,id);}

// ─── COTAÇÕES ────────────────────────────────────────────────────────────────
function calcTotalCotacao(c){
  const vlrPeca=(+c.vlrPeca||0);
  const descPeca=vlrPeca*(+c.descPeca||0)/100;
  const vlrMO=(+c.vlrMO||0);
  return {subtotal:vlrPeca+vlrMO, descVal:descPeca, total:vlrPeca-descPeca+vlrMO};
}
function toggleCotacaoOS(osNum){
  const el=document.getElementById('cot-body-'+osNum);
  if(!el)return;
  const isOpen=el.style.display!=='none';
  el.style.display=isOpen?'none':'block';
  const icon=document.getElementById('cot-icon-'+osNum);
  if(icon)icon.textContent=isOpen?'▶':'▼';
}
function renderCotacoes(){
  const osComCot=[...new Set(state.cotacoes.map(c=>c.os))];
  const todasOS=state.os.map(o=>o.num);
  const osOrdenadas=[...new Set([...todasOS,...osComCot])];
  const cards=osOrdenadas.map(osNum=>{
    const o=state.os.find(x=>x.num===osNum);
    const cotsOS=state.cotacoes.filter(c=>c.os===osNum);
    const minValor=cotsOS.length?Math.min(...cotsOS.map(c=>calcTotalCotacao(c).total)):null;
    const rows=cotsOS.map(c=>{
      const {subtotal,descVal,total}=calcTotalCotacao(c);
      const sugerido=minValor!==null&&total===minValor;
      return `<tr style="${sugerido?'background:#DCFCE7':''}">
        <td>${c.oficina||'—'}</td>
        <td>${c.peca||'—'}</td>
        <td>${c.fornecedor||'—'}</td>
        <td>${fmt(c.vlrPeca||0)}</td>
        <td style="color:var(--red)">${c.descPeca||0}%</td>
        <td>${fmt(c.vlrMO||0)}</td>
        <td>${fmt(subtotal)}</td>
        <td>${c.prazo||0} dias</td>
        <td>${c.pgto||'—'}</td>
        <td><strong style="color:var(--green)">${fmt(total)}</strong>${sugerido?' <span class="badge badge-green">✅ Menor</span>':''}</td>
        <td><button class="btn btn-sm btn-danger" onclick="delCotacao(${c.id})">🗑</button></td>
      </tr>`;
    }).join('');
    return `<div class="card" style="margin-bottom:12px">
      <div onclick="toggleCotacaoOS('${osNum}')" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:10px">
          <span id="cot-icon-${osNum}" style="font-size:12px;color:var(--gray)">▶</span>
          <strong>${osNum}</strong>
          ${o?`<span style="font-size:12px;color:var(--gray)">${o.placa} · ${o.modelo||''}</span><span class="badge ${getStatusBadge(o.status)}">${o.status}</span>`:''}
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:12px;color:var(--gray)">${cotsOS.length} cotação(ões)</span>
          ${cotsOS.length?`<strong style="color:var(--green);font-size:13px">${fmt(minValor)} menor</strong>`:''}
          <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();novaCotacao('${osNum}')">+ Cotação</button>
        </div>
      </div>
      <div id="cot-body-${osNum}" style="display:none;margin-top:14px">
        ${cotsOS.length?`<div class="table-wrap"><table>
          <thead><tr><th>Oficina</th><th>Peça</th><th>Fornecedor Peça</th><th>Vlr. Peça</th><th>Desc. %</th><th>M.O.</th><th>Subtotal</th><th>Prazo</th><th>Pgto</th><th>Total</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>`:'<div style="text-align:center;padding:20px;color:var(--gray)">Nenhuma cotação para esta OS</div>'}
      </div>
    </div>`;
  });
  return `
    <div class="topbar"><div><div class="page-title">💰 Cotações</div><div class="page-sub">Responsável: Bruna — Clique na OS para ver as cotações</div></div>
      <button class="btn btn-primary" onclick="novaCotacao()">+ Nova Cotação</button></div>
    <div class="content">
      <div class="alert alert-blue">💡 A linha em <strong>verde</strong> indica a cotação de menor valor total. Total = Vlr. Peça − Desconto + M.O.</div>
      ${cards.length?cards.join(''):'<div class="card"><div class="empty-state"><div class="empty-icon">💰</div><p>Nenhuma OS cadastrada</p></div></div>'}
    </div>`;
}
function calcCotacaoTotal(){
  const vp=+document.getElementById('c-vlrpeca')?.value||0;
  const desc=+document.getElementById('c-desc')?.value||0;
  const vmo=+document.getElementById('c-vlrmo')?.value||0;
  const subtotal=vp+vmo;
  const descVal=vp*desc/100;
  const total=subtotal-descVal;
  const elSub=document.getElementById('c-subtotal-preview');
  const elDesc=document.getElementById('c-desc-preview');
  const elTot=document.getElementById('c-total-preview');
  if(elSub)elSub.textContent=fmt(subtotal);
  if(elDesc)elDesc.textContent='− '+fmt(descVal);
  if(elTot)elTot.textContent=fmt(total);
}
function novaCotacao(osPresel){
  const osList=state.os.map(o=>`<option${o.num===osPresel?' selected':''}>${o.num}</option>`).join('');
  const ofList=state.oficinas.map(o=>`<option>${o.fantasia}</option>`).join('');
  const fornList=state.fornecedores.map(f=>`<option>${f.fantasia}</option>`).join('');
  openModal(`<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal" style="max-width:640px">
      <div class="modal-header"><div class="modal-title">💰 Nova Cotação</div><button class="btn btn-ghost" onclick="closeModal()">✕</button></div>
      <div class="form-row">
        <div class="form-group"><label>OS # *</label><select id="c-os">${osList}</select></div>
        <div class="form-group"><label>Prazo (dias)</label><input type="number" id="c-prazo"/></div>
      </div>
      <hr style="border:none;border-top:1px solid var(--border);margin:4px 0 12px">
      <div style="font-size:12px;font-weight:600;color:var(--gray);margin-bottom:8px;text-transform:uppercase">Oficina / Mão de Obra</div>
      <div class="form-row">
        <div class="form-group"><label>Oficina *</label><input id="c-oficina" list="c-of-list" placeholder="Nome da oficina"/><datalist id="c-of-list">${ofList}</datalist></div>
        <div class="form-group"><label>Vlr. Mão de Obra (R$)</label><input type="number" id="c-vlrmo" step="0.01" oninput="calcCotacaoTotal()"/></div>
      </div>
      <hr style="border:none;border-top:1px solid var(--border);margin:4px 0 12px">
      <div style="font-size:12px;font-weight:600;color:var(--gray);margin-bottom:8px;text-transform:uppercase">Peça / Fornecedor</div>
      <div class="form-row">
        <div class="form-group"><label>Peça / Serviço</label><input id="c-peca"/></div>
        <div class="form-group"><label>Fornecedor da Peça</label><input id="c-forn" list="c-forn-list"/><datalist id="c-forn-list">${fornList}</datalist></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Vlr. Peça (R$)</label><input type="number" id="c-vlrpeca" step="0.01" oninput="calcCotacaoTotal()"/></div>
        <div class="form-group"><label>Desconto (%)</label><input type="number" id="c-desc" step="0.1" min="0" max="100" value="0" oninput="calcCotacaoTotal()"/></div>
      </div>
      <hr style="border:none;border-top:1px solid var(--border);margin:4px 0 12px">
      <div class="form-row">
        <div class="form-group"><label>Forma de Pgto</label><input id="c-pgto"/></div>
        <div class="form-group"><label>Observação</label><input id="c-obs"/></div>
      </div>
      <div style="background:var(--gray-light);border-radius:8px;padding:12px;margin-bottom:4px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:12px;color:var(--gray)">Subtotal (Peça + M.O.)</span>
          <span id="c-subtotal-preview" style="font-size:14px;font-weight:600;color:var(--header)">${fmt(0)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:12px;color:var(--red)">Desconto</span>
          <span id="c-desc-preview" style="font-size:14px;font-weight:600;color:var(--red)">− ${fmt(0)}</span>
        </div>
        <div style="border-top:1px solid var(--border);padding-top:8px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;font-weight:600;color:var(--blue)">Total da Cotação</span>
          <span id="c-total-preview" style="font-size:18px;font-weight:700;color:var(--blue)">${fmt(0)}</span>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveCotacao()">Salvar</button>
      </div>
    </div></div>`);
}
async function saveCotacao(){
  const os=document.getElementById('c-os').value;
  const oficina=document.getElementById('c-oficina').value;
  if(!os||!oficina){alert('Informe a OS e a Oficina.');return}
  const vlrPeca=+document.getElementById('c-vlrpeca').value||0;
  const descPeca=+document.getElementById('c-desc').value||0;
  const vlrMO=+document.getElementById('c-vlrmo').value||0;
  const valor=vlrPeca-(vlrPeca*descPeca/100)+vlrMO;
  const id=Date.now();
  const obj={id,os,oficina,peca:document.getElementById('c-peca').value,fornecedor:document.getElementById('c-forn').value,vlrPeca,descPeca,vlrMO,valor,prazo:+document.getElementById('c-prazo').value||0,pgto:document.getElementById('c-pgto').value,obs:document.getElementById('c-obs').value,escolhido:false};
  await window._fb.save(window._fb.cols.cotacoes, obj);
  closeModal();
}
async function delCotacao(id){if(!confirm('Remover cotação?'))return;await window._fb.del(window._fb.cols.cotacoes,id);}

// ─── APROVAÇÕES (100% integrado com Cotações) ─────────────────────────────
function toggleAprovOS(osNum){
  const el=document.getElementById('ap-body-'+osNum);
  if(!el)return;
  const isOpen=el.style.display!=='none';
  el.style.display=isOpen?'none':'block';
  const icon=document.getElementById('ap-icon-'+osNum);
  if(icon)icon.textContent=isOpen?'▶':'▼';
}

function renderAprovacoes(){
  return `
    <div class="topbar"><div><div class="page-title">✅ Aprovações</div><div class="page-sub">Até R$ 50 → Júlio · Acima de R$ 50 → Anselmo (senha requerida)</div></div></div>
    <div class="content">
      <div class="alert alert-amber">🔒 Aprovações acima de R$ 50,00 exigem autenticação de Anselmo.</div>
      <div class="alert alert-blue">💡 A cotação em <strong>verde</strong> é a recomendada (menor valor total). Aprovar uma cotação diferente pedirá confirmação. Ao aprovar uma cotação, as demais da mesma OS ficam bloqueadas.</div>
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap">
          <div class="form-group" style="margin:0;flex:1;min-width:140px">
            <label>Data início</label>
            <input type="date" id="ap-f-ini" onchange="renderAprovacoesFiltro()"/>
          </div>
          <div class="form-group" style="margin:0;flex:1;min-width:140px">
            <label>Data fim</label>
            <input type="date" id="ap-f-fim" onchange="renderAprovacoesFiltro()"/>
          </div>
          <div class="form-group" style="margin:0;flex:1;min-width:160px">
            <label>Status</label>
            <select id="ap-f-status" onchange="renderAprovacoesFiltro()">
              <option value="">Todos</option>
              <option value="Aguardando Aprovação">Pendentes</option>
              <option value="Aprovada">Aprovadas</option>
              <option value="Reprovada">Reprovadas</option>
            </select>
          </div>
          <button class="btn btn-outline" style="margin-bottom:1px" onclick="limparFiltroAprov()">✕ Limpar</button>
        </div>
      </div>
      <div id="ap-cards"></div>
    </div>`;
}

function renderAprovacoesFiltro(){
  const ini=document.getElementById('ap-f-ini')?.value||'';
  const fim=document.getElementById('ap-f-fim')?.value||'';
  const st=document.getElementById('ap-f-status')?.value||'';

  // Todas as OS que possuem ao menos uma cotação (única origem das aprovações agora)
  let osOrdenadas=[...new Set(state.cotacoes.map(c=>c.os))];

  const cards=osOrdenadas.map(osNum=>{
    const o=state.os.find(x=>x.num===osNum);
    const cotsOS=state.cotacoes.filter(c=>c.os===osNum);
    let aprovsOS=state.aprovacoes.filter(a=>a.os===osNum&&a.cotacaoId);

    // Filtro de status: aplica-se às cotações via status de sua aprovação (ou 'Aguardando Aprovação' se não houver)
    const statusDaCot=c=>{
      const a=aprovsOS.find(x=>x.cotacaoId===c.id);
      return a?a.status:'Aguardando Aprovação';
    };
    let cotsVisiveis=cotsOS;
    if(st) cotsVisiveis=cotsOS.filter(c=>statusDaCot(c)===st);

    if(ini||fim){
      const osData=o?.data||'';
      cotsVisiveis=cotsVisiveis.filter(c=>{
        const a=aprovsOS.find(x=>x.cotacaoId===c.id);
        const d=(a&&a.data)||osData;
        if(!d) return true;
        if(ini&&d<ini) return false;
        if(fim&&d>fim) return false;
        return true;
      });
    }

    // Se não sobrou nenhuma cotação visível para esta OS após os filtros, oculta o card
    if((st||ini||fim) && !cotsVisiveis.length) return '';

    const minValor=cotsOS.length?Math.min(...cotsOS.map(c=>calcTotalCotacao(c).total)):null;

    // Já existe alguma cotação aprovada para esta OS?
    const cotAprovada=cotsOS.find(c=>{
      const a=aprovsOS.find(x=>x.cotacaoId===c.id);
      return a&&a.status==='Aprovada';
    });

    let statusResumo='Aguardando Aprovação';
    if(cotAprovada) statusResumo='Aprovada';
    else if(cotsOS.length && cotsOS.every(c=>{const a=aprovsOS.find(x=>x.cotacaoId===c.id);return a&&a.status==='Reprovada';})) statusResumo='Reprovada';

    const rowsCot=cotsVisiveis.map(c=>{
      const {subtotal,descVal,total}=calcTotalCotacao(c);
      const sugerido=minValor!==null&&total===minValor;
      const aprovDaCot=aprovsOS.find(a=>a.cotacaoId===c.id);
      const status=aprovDaCot?aprovDaCot.status:'Aguardando Aprovação';

      // Bloqueia ações se: esta cotação já foi decidida, OU outra cotação da mesma OS já foi aprovada
      const bloqueadaPorOutra=!!cotAprovada && (!aprovDaCot || aprovDaCot.status!=='Aprovada');
      const jaDecidida=status!=='Aguardando Aprovação';
      const podeAgir=!jaDecidida && !bloqueadaPorOutra;

      const statusTag = status==='Aprovada'
        ? `<span class="badge ${getStatusBadge(status)}">Aprovada · ${fmt(aprovDaCot.valor)}</span>`
        : `<span class="badge ${getStatusBadge(status)}">${status}</span>`;

      const btns=podeAgir
        ? `<button class="btn btn-sm btn-success" onclick="tryApproveCotacao('${osNum}',${c.id})">✅ Aprovar</button>
           <button class="btn btn-sm btn-danger" onclick="reproveCotacao('${osNum}',${c.id})">❌ Reprovar</button>`
        : '';

      return `<tr style="${sugerido?'background:#DCFCE7':''}">
        <td>${c.oficina||'—'}</td>
        <td>${c.peca||'—'}</td>
        <td>${c.fornecedor||'—'}</td>
        <td>${fmt(c.vlrPeca||0)}</td>
        <td style="color:var(--red)">${c.descPeca||0}%</td>
        <td>${fmt(c.vlrMO||0)}</td>
        <td>${fmt(subtotal)}</td>
        <td>${c.prazo||0} dias</td>
        <td>${c.pgto||'—'}</td>
        <td><strong style="color:var(--green)">${fmt(total)}</strong>${sugerido?' <span class="badge badge-green">✅ Recomendada</span>':''}</td>
        <td>${statusTag}</td>
        <td><div class="action-btns">${btns}</div></td>
      </tr>`;
    }).join('');

    return `<div class="card" style="margin-bottom:12px">
      <div onclick="toggleAprovOS('${osNum}')" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:10px">
          <span id="ap-icon-${osNum}" style="font-size:12px;color:var(--gray)">▶</span>
          <strong>${osNum}</strong>
          ${o?`<span style="font-size:12px;color:var(--gray)">${o.placa} · ${o.modelo||''}</span><span class="badge ${getStatusBadge(o.status)}">${o.status}</span>`:''}
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:12px;color:var(--gray)">${cotsOS.length} cotação(ões)</span>
          ${cotsOS.length?`<strong style="color:var(--green);font-size:13px">${fmt(minValor)} menor</strong>`:''}
          <span class="badge ${getStatusBadge(statusResumo)}">${statusResumo}${cotAprovada?' · '+fmt(aprovsOS.find(a=>a.cotacaoId===cotAprovada.id).valor):''}</span>
        </div>
      </div>
      <div id="ap-body-${osNum}" style="display:none;margin-top:14px">
        ${rowsCot?`<div class="table-wrap"><table>
          <thead><tr><th>Oficina</th><th>Peça</th><th>Fornecedor Peça</th><th>Vlr. Peça</th><th>Desc. %</th><th>M.O.</th><th>Subtotal</th><th>Prazo</th><th>Pgto</th><th>Total</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>${rowsCot}</tbody>
        </table></div>`:'<div style="text-align:center;padding:20px;color:var(--gray)">Nenhuma cotação encontrada para os filtros aplicados</div>'}
      </div>
    </div>`;
  }).filter(Boolean);

  const wrap=document.getElementById('ap-cards');
  if(wrap) wrap.innerHTML=cards.length?cards.join(''):'<div class="card"><div class="empty-state"><div class="empty-icon">✅</div><p>Nenhuma cotação encontrada</p></div></div>';
}

function limparFiltroAprov(){
  const ini=document.getElementById('ap-f-ini');if(ini)ini.value='';
  const fim=document.getElementById('ap-f-fim');if(fim)fim.value='';
  const st=document.getElementById('ap-f-status');if(st)st.value='';
  renderAprovacoesFiltro();
}

// ── Aprovação vinculada a uma cotação específica ───────────────────────────
function tryApproveCotacao(osNum,cotacaoId){
  const cotsOS=state.cotacoes.filter(c=>c.os===osNum);
  const cot=cotsOS.find(c=>c.id===cotacaoId);
  if(!cot)return;

  // Trava extra: se já existe cotação aprovada para esta OS, impede nova aprovação
  const jaAprovada=state.aprovacoes.some(a=>a.os===osNum&&a.cotacaoId&&a.cotacaoId!==cotacaoId&&a.status==='Aprovada');
  if(jaAprovada){ alert('Já existe uma cotação aprovada para esta OS. Não é possível aprovar outra.'); return; }

  const {total}=calcTotalCotacao(cot);
  const minValor=cotsOS.length?Math.min(...cotsOS.map(c=>calcTotalCotacao(c).total)):null;
  const ehRecomendada=minValor!==null&&total===minValor;

  const prosseguir=()=>{
    const fazer=()=>doApproveCotacao(osNum,cotacaoId,total);
    if(total>50){ showLock(fazer); } else { fazer(); }
  };

  if(!ehRecomendada){
    const ok=confirm(`Esta NÃO é a cotação recomendada pelo sistema (menor valor: ${fmt(minValor)}).\n\nValor desta cotação: ${fmt(total)} — Oficina: ${cot.oficina||'—'}.\n\nDeseja realmente aprovar esta cotação mesmo assim?`);
    if(!ok) return;
  }
  prosseguir();
}

async function doApproveCotacao(osNum,cotacaoId,valor){
  const cot=state.cotacoes.find(c=>c.id===cotacaoId);
  if(!cot)return;

  // Cancela quaisquer outras aprovações ligadas a outras cotações da mesma OS,
  // travando definitivamente a possibilidade de aprovar outra cotação desta OS
  const outras=state.aprovacoes.filter(a=>a.os===osNum&&a.cotacaoId&&a.cotacaoId!==cotacaoId&&a.status!=='Descartada');
  for(const a of outras){
    await window._fb.save(window._fb.cols.aprovacoes, {...a, status:'Descartada', data:today(), obs:(a.obs?a.obs+' · ':'')+'Outra cotação foi aprovada para esta OS'});
  }
  // Garante registro até para cotações da OS que ainda não tinham aprovação lançada
  const cotsOS=state.cotacoes.filter(c=>c.os===osNum&&c.id!==cotacaoId);
  for(const c of cotsOS){
    const existente=state.aprovacoes.find(a=>a.cotacaoId===c.id);
    if(!existente){
      const {total}=calcTotalCotacao(c);
      await window._fb.save(window._fb.cols.aprovacoes, {
        id:Date.now()+Math.floor(Math.random()*1000), os:osNum, cotacaoId:c.id, valor:total,
        aprovador: total>50?'Anselmo':'Júlio', status:'Descartada', data:today(),
        autorizado:'', obs:'Outra cotação foi aprovada para esta OS'
      });
    }
  }

  // Localiza aprovação existente para esta cotação, ou cria uma nova
  let aprov=state.aprovacoes.find(a=>a.cotacaoId===cotacaoId);
  const id=aprov?aprov.id:Date.now();
  const obj={
    id, os:osNum, cotacaoId, valor,
    aprovador: valor>50?'Anselmo':'Júlio',
    status:'Aprovada',
    data: today(),
    autorizado: valor>50?'Anselmo':'Júlio',
    obs: aprov?.obs||(cot.oficina?`Cotação: ${cot.oficina}`:'')
  };
  await window._fb.save(window._fb.cols.aprovacoes, obj);

  const os=state.os.find(x=>x.num===osNum);
  if(os){ await window._fb.save(window._fb.cols.os, {...os, status:'Execução'}); }
}

async function reproveCotacao(osNum,cotacaoId){
  const cot=state.cotacoes.find(c=>c.id===cotacaoId);
  if(!cot)return;
  const {total}=calcTotalCotacao(cot);
  let aprov=state.aprovacoes.find(a=>a.cotacaoId===cotacaoId);
  const id=aprov?aprov.id:Date.now();
  const obj={
    id, os:osNum, cotacaoId, valor:total,
    aprovador: total>50?'Anselmo':'Júlio',
    status:'Reprovada',
    data: today(),
    autorizado: aprov?.autorizado||'',
    obs: aprov?.obs||(cot.oficina?`Cotação: ${cot.oficina}`:'')
  };
  await window._fb.save(window._fb.cols.aprovacoes, obj);
}

// ─── MANUTENÇÕES (gerado automaticamente a partir das Cotações aprovadas) ──
function getManutencoesGeradas(){
  // Uma "manutenção" = uma cotação com aprovação status 'Aprovada'
  return state.aprovacoes
    .filter(a=>a.cotacaoId && a.status==='Aprovada')
    .map(a=>{
      const cot=state.cotacoes.find(c=>c.id===a.cotacaoId);
      if(!cot) return null;
      const o=state.os.find(x=>x.num===a.os);
      const {total}=calcTotalCotacao(cot);
      const vlrPecas=(+cot.vlrPeca||0)-((+cot.vlrPeca||0)*(+cot.descPeca||0)/100);
      const vlrMO=(+cot.vlrMO||0);
      // descrição editável manualmente; usa override salvo em state.manutDescs, senão monta a partir da peça/cotação
      const override=state.manutDescs?.[a.cotacaoId];
      const desc=override!=null?override:(cot.peca||cot.obs||'—');
      return {
        cotacaoId:a.cotacaoId,
        os:a.os,
        data:a.data,
        oficina:cot.oficina,
        tipo:'Corretiva',
        desc,
        vlrPecas,
        vlrMO,
        total:vlrPecas+vlrMO,
        nf:cot.obs||'—',
        km:o?o.km:null
      };
    })
    .filter(Boolean);
}

function renderManutencoes(){
  const linhas=getManutencoesGeradas();
  const rows=linhas.map(m=>`<tr>
      <td><strong>${m.os}</strong></td>
      <td>${fmtDate(m.data)}</td>
      <td>${m.km!=null?Number(m.km).toLocaleString('pt-BR')+' km':'—'}</td>
      <td>${m.oficina||'—'}</td>
      <td><span class="badge ${getStatusBadge(m.tipo)}">${m.tipo}</span></td>
      <td>${m.desc}</td>
      <td>${fmt(m.vlrPecas)}</td>
      <td>${fmt(m.vlrMO)}</td>
      <td><strong>${fmt(m.total)}</strong></td>
      <td><button class="btn btn-sm btn-outline" onclick="editManutDesc('${m.cotacaoId}')">✏️ Descrição</button></td>
    </tr>`).join('');
  const totP=linhas.reduce((a,m)=>a+m.vlrPecas,0);
  const totMO=linhas.reduce((a,m)=>a+m.vlrMO,0);
  return `
    <div class="topbar"><div><div class="page-title">🔧 Manutenções</div><div class="page-sub">Responsável: Bruna — Gerado automaticamente a partir das cotações aprovadas</div></div></div>
    <div class="content">
      <div class="alert alert-blue">💡 Estas linhas vêm automaticamente das cotações aprovadas em ✅ Aprovações. Apenas a descrição pode ser editada aqui.</div>
      <div class="kpi-grid" style="margin-bottom:16px">
        <div class="kpi"><div class="kpi-label">Total Peças</div><div class="kpi-val" style="color:var(--blue);font-size:18px">${fmt(totP)}</div></div>
        <div class="kpi"><div class="kpi-label">Total M.O.</div><div class="kpi-val" style="color:var(--purple);font-size:18px">${fmt(totMO)}</div></div>
        <div class="kpi"><div class="kpi-label">Total Geral</div><div class="kpi-val" style="color:var(--green);font-size:18px">${fmt(totP+totMO)}</div></div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table><thead><tr><th>OS #</th><th>Data</th><th>KM</th><th>Oficina</th><th>Tipo</th><th>Descrição do serviço</th><th>Vlr. Peças</th><th>Vlr. M.O.</th><th>Total</th><th>Alterar descrição</th></tr></thead>
          <tbody>${rows||'<tr><td colspan="11" style="text-align:center;padding:24px;color:#64748B">Nenhuma cotação aprovada ainda</td></tr>'}</tbody></table>
        </div>
      </div>
    </div>`;
}

function editManutDesc(cotacaoId){
  const linhas=getManutencoesGeradas();
  const m=linhas.find(x=>String(x.cotacaoId)===String(cotacaoId));
  if(!m)return;
  openModal(`<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-header"><div class="modal-title">✏️ Editar Descrição — ${m.os}</div><button class="btn btn-ghost" onclick="closeModal()">✕</button></div>
      <input type="hidden" id="md-cotid" value="${cotacaoId}"/>
      <div class="form-group"><label>Descrição</label><textarea id="md-desc" rows="3">${m.desc}</textarea></div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveManutDesc()">Salvar</button>
      </div>
    </div></div>`);
}

async function saveManutDesc(){
  const cotacaoId=document.getElementById('md-cotid').value;
  const desc=document.getElementById('md-desc').value;
  if(!state.manutDescs) state.manutDescs={};
  state.manutDescs[cotacaoId]=desc;
  if(window._fb && window._fb.saveMeta) await window._fb.saveMeta('manutDescs', state.manutDescs);
  closeModal();
  render();
}

// ─── PEÇAS ───────────────────────────────────────────────────────────────────
function renderPecas(){
  const rows=state.pecas.map(p=>`<tr>
    <td><strong>${p.os}</strong></td>
    <td>${p.peca}</td>
    <td>${p.marca}</td>
    <td>${p.qtde}</td>
    <td>${p.fornecedor}</td>
    <td>${fmt(p.vlrUnit)}</td>
    <td><strong>${fmt(p.vlrUnit*p.qtde)}</strong></td>
    <td>${p.obs||'—'}</td>
    <td><button class="btn btn-sm btn-danger" onclick="delPeca(${p.id})">🗑</button></td>
  </tr>`).join('');
  const total=state.pecas.reduce((a,p)=>a+(p.vlrUnit*p.qtde),0);
  return `
    <div class="topbar"><div><div class="page-title">🔩 Peças Aplicadas</div><div class="page-sub">Registro de peças utilizadas</div></div>
      <button class="btn btn-primary" onclick="novaPeca()">+ Registrar Peça</button></div>
    <div class="content">
      <div class="card" style="margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:12px">
          <div class="kpi" style="flex:1"><div class="kpi-label">Total em Peças</div><div class="kpi-val" style="color:var(--blue);font-size:20px">${fmt(total)}</div></div>
          <div class="kpi" style="flex:1"><div class="kpi-label">Registros</div><div class="kpi-val" style="color:var(--gray)">${state.pecas.length}</div></div>
        </div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table><thead><tr><th>OS #</th><th>Peça</th><th>Marca</th><th>Qtde</th><th>Fornecedor</th><th>Vlr. Unit.</th><th>Vlr. Total</th><th>Obs.</th><th>Ações</th></tr></thead>
          <tbody>${rows}</tbody></table>
        </div>
      </div>
    </div>`;
}
function novaPeca(){
  const osList=state.os.map(o=>`<option>${o.num}</option>`).join('');
  const fornList=state.fornecedores.map(f=>`<option>${f.fantasia}</option>`).join('');
  openModal(`<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-header"><div class="modal-title">🔩 Registrar Peça</div><button class="btn btn-ghost" onclick="closeModal()">✕</button></div>
      <div class="form-row">
        <div class="form-group"><label>OS #</label><select id="p-os">${osList}</select></div>
        <div class="form-group"><label>Peça *</label><input id="p-peca"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Marca</label><input id="p-marca"/></div>
        <div class="form-group"><label>Quantidade</label><input type="number" id="p-qtde" value="1" min="1"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Fornecedor</label><input id="p-forn" list="pf-list"/><datalist id="pf-list">${fornList}</datalist></div>
        <div class="form-group"><label>Vlr. Unitário (R$)</label><input type="number" id="p-vlr" step="0.01"/></div>
      </div>
      <div class="form-group"><label>Observação</label><input id="p-obs"/></div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="savePeca()">Salvar</button>
      </div>
    </div></div>`);
}
async function savePeca(){
  const id=Date.now();
  const obj={id, os:document.getElementById('p-os').value, peca:document.getElementById('p-peca').value, marca:document.getElementById('p-marca').value, qtde:+document.getElementById('p-qtde').value||1, fornecedor:document.getElementById('p-forn').value, vlrUnit:+document.getElementById('p-vlr').value||0, obs:document.getElementById('p-obs').value};
  await window._fb.save(window._fb.cols.pecas, obj);
  closeModal();
}
async function delPeca(id){if(!confirm('Remover?'))return;await window._fb.del(window._fb.cols.pecas,id);}

// ─── HISTÓRICO ───────────────────────────────────────────────────────────────
function renderHistorico(){
  const placas=[...new Set(state.veiculos.map(v=>v.placa))];
  const placaOpts=placas.map(p=>`<option>${p}</option>`).join('');
  return `
    <div class="topbar"><div><div class="page-title">📂 Histórico do Veículo</div><div class="page-sub">Filtro por placa</div></div></div>
    <div class="content">
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;align-items:flex-end;gap:12px">
          <div style="flex:1"><label style="display:block;font-size:12px;font-weight:600;color:var(--header);margin-bottom:5px">🔍 Placa do Veículo</label>
            <select id="hist-placa" onchange="renderHistoricoResult()" style="max-width:240px;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px">
              <option value="">Selecione uma placa...</option>${placaOpts}
            </select>
          </div>
        </div>
      </div>
      <div id="hist-result"></div>
    </div>`;
}
function renderHistoricoResult(){
  const placa=document.getElementById('hist-placa').value;
  const div=document.getElementById('hist-result');
  if(!placa){div.innerHTML='';return}
  const v=getVeiculo(placa);
  const osPlaca=state.os.filter(o=>o.placa===placa);
  const manutIds=osPlaca.map(o=>o.num);
  const manuts=state.manutencoes.filter(m=>manutIds.includes(m.os));
  const total=manuts.reduce((a,m)=>a+(+m.vlrPecas||0)+(+m.vlrMO||0),0);
  const ultima=manuts[manuts.length-1];
  const rows=osPlaca.map(o=>{
    const m=state.manutencoes.find(x=>x.os===o.num);
    return `<tr>
      <td><strong>${o.num}</strong></td>
      <td>${fmtDate(o.data)}</td>
      <td><span class="badge ${getStatusBadge(o.status)}">${o.status}</span></td>
      <td>${m?m.oficina:'—'}</td>
      <td>${m?m.tipo:'—'}</td>
      <td>${m?fmt((+m.vlrPecas||0)+(+m.vlrMO||0)):'—'}</td>
      <td>${m?m.nf:'—'}</td>
      <td>${o.problema}</td>
    </tr>`;
  }).join('');
  div.innerHTML=`
    <div class="card" style="margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">
        <div><div style="font-size:11px;color:var(--gray);text-transform:uppercase">Veículo</div><div style="font-weight:700;font-size:16px">${v.modelo||'—'}</div></div>
        <div><div style="font-size:11px;color:var(--gray);text-transform:uppercase">Motorista</div><div style="font-weight:600">${v.motorista||'—'}</div></div>
        <div><div style="font-size:11px;color:var(--gray);text-transform:uppercase">Total OS</div><div style="font-weight:700;color:var(--blue)">${osPlaca.length}</div></div>
        <div><div style="font-size:11px;color:var(--gray);text-transform:uppercase">Total Gasto</div><div style="font-weight:700;color:var(--green)">${fmt(total)}</div></div>
        <div><div style="font-size:11px;color:var(--gray);text-transform:uppercase">Última Oficina</div><div style="font-weight:600">${ultima?ultima.oficina:'—'}</div></div>
      </div>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table><thead><tr><th>OS #</th><th>Data</th><th>Status</th><th>Oficina</th><th>Tipo</th><th>Total</th><th>NF</th><th>Problema</th></tr></thead>
        <tbody>${rows||'<tr><td colspan="8" style="text-align:center;padding:24px;color:#64748B">Nenhuma OS encontrada para esta placa</td></tr>'}</tbody></table>
      </div>
    </div>`;
}

// ─── OFICINAS ────────────────────────────────────────────────────────────────
function renderOficinas(){
  const rows=state.oficinas.map(o=>`<tr>
    <td>${o.razao}</td>
    <td><strong>${o.fantasia}</strong></td>
    <td>${o.cnpj}</td>
    <td>${o.tel}</td>
    <td>${o.endereco}</td>
    <td>${o.cidade}</td>
    <td>${o.contato}</td>
    <td><div class="action-btns">
      <button class="btn btn-sm btn-outline" onclick="editOficina(${o.id})">✏️</button>
      <button class="btn btn-sm btn-danger" onclick="delOficina(${o.id})">🗑</button>
    </div></td>
  </tr>`).join('');
  return `
    <div class="topbar"><div><div class="page-title">🏭 Oficinas</div><div class="page-sub">Cadastro de oficinas parceiras</div></div>
      <button class="btn btn-primary" onclick="novaOficina()">+ Nova Oficina</button></div>
    <div class="content">
      <div class="card">
        <div class="table-wrap">
          <table><thead><tr><th>Razão Social</th><th>Nome Fantasia</th><th>CNPJ</th><th>Telefone</th><th>Endereço</th><th>Cidade</th><th>Contato</th><th>Ações</th></tr></thead>
          <tbody>${rows||'<tr><td colspan="8" style="text-align:center;padding:24px;color:#64748B">Nenhuma oficina cadastrada</td></tr>'}</tbody></table>
        </div>
      </div>
    </div>`;
}
function novaOficina(){
  openModal(`<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-header"><div class="modal-title">🏭 Cadastrar Oficina</div><button class="btn btn-ghost" onclick="closeModal()">✕</button></div>
      <div class="form-row">
        <div class="form-group"><label>Razão Social</label><input id="of-razao"/></div>
        <div class="form-group"><label>Nome Fantasia *</label><input id="of-fantasia"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>CNPJ</label><input id="of-cnpj" placeholder="00.000.000/0001-00"/></div>
        <div class="form-group"><label>Telefone</label><input id="of-tel"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Endereço</label><input id="of-end"/></div>
        <div class="form-group"><label>Cidade</label><input id="of-cid"/></div>
      </div>
      <div class="form-group"><label>Contato</label><input id="of-cont"/></div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveOficina()">Salvar</button>
      </div>
    </div></div>`);
}
async function saveOficina(){
  const f=document.getElementById('of-fantasia').value;
  if(!f){alert('Informe o nome fantasia.');return}
  const id=Date.now();
  const obj={id, razao:document.getElementById('of-razao').value, fantasia:f, cnpj:document.getElementById('of-cnpj').value, tel:document.getElementById('of-tel').value, endereco:document.getElementById('of-end').value, cidade:document.getElementById('of-cid').value, contato:document.getElementById('of-cont').value};
  await window._fb.save(window._fb.cols.oficinas, obj);
  closeModal();
}
function editOficina(id){
  const o=state.oficinas.find(x=>x.id===id);if(!o)return;
  openModal(`<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-header"><div class="modal-title">✏️ Editar Oficina</div><button class="btn btn-ghost" onclick="closeModal()">✕</button></div>
      <input type="hidden" id="edit-of-id" value="${id}"/>
      <div class="form-row">
        <div class="form-group"><label>Razão Social</label><input id="of-razao-e" value="${o.razao}"/></div>
        <div class="form-group"><label>Nome Fantasia</label><input id="of-fantasia-e" value="${o.fantasia}"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>CNPJ</label><input id="of-cnpj-e" value="${o.cnpj}"/></div>
        <div class="form-group"><label>Telefone</label><input id="of-tel-e" value="${o.tel}"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Endereço</label><input id="of-end-e" value="${o.endereco}"/></div>
        <div class="form-group"><label>Cidade</label><input id="of-cid-e" value="${o.cidade}"/></div>
      </div>
      <div class="form-group"><label>Contato</label><input id="of-cont-e" value="${o.contato}"/></div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="updateOficina()">Atualizar</button>
      </div>
    </div></div>`);
}
async function updateOficina(){
  const id=+document.getElementById('edit-of-id').value;
  const o=state.oficinas.find(x=>x.id===id);if(!o)return;
  const updated={...o,
    razao:document.getElementById('of-razao-e').value,
    fantasia:document.getElementById('of-fantasia-e').value,
    cnpj:document.getElementById('of-cnpj-e').value,
    tel:document.getElementById('of-tel-e').value,
    endereco:document.getElementById('of-end-e').value,
    cidade:document.getElementById('of-cid-e').value,
    contato:document.getElementById('of-cont-e').value
  };
  await window._fb.save(window._fb.cols.oficinas, updated);
  closeModal();
}
async function delOficina(id){if(!confirm('Remover?'))return;await window._fb.del(window._fb.cols.oficinas,id);}

// ─── FORNECEDORES ────────────────────────────────────────────────────────────
function renderFornecedores(){
  const rows=state.fornecedores.map(f=>`<tr>
    <td>${f.razao}</td>
    <td><strong>${f.fantasia}</strong></td>
    <td>${f.cnpj}</td>
    <td>${f.tel}</td>
    <td>${f.tipo}</td>
    <td>${f.contato}</td>
    <td>${f.email||'—'}</td>
    <td><div class="action-btns">
      <button class="btn btn-sm btn-outline" onclick="editFornecedor(${f.id})">✏️</button>
      <button class="btn btn-sm btn-danger" onclick="delFornecedor(${f.id})">🗑</button>
    </div></td>
  </tr>`).join('');
  return `
    <div class="topbar"><div><div class="page-title">🏪 Fornecedores</div><div class="page-sub">Cadastro de fornecedores</div></div>
      <button class="btn btn-primary" onclick="novoFornecedor()">+ Novo Fornecedor</button></div>
    <div class="content">
      <div class="card">
        <div class="table-wrap">
          <table><thead><tr><th>Razão Social</th><th>Fantasia</th><th>CNPJ</th><th>Telefone</th><th>Tipo</th><th>Contato</th><th>Email</th><th>Ações</th></tr></thead>
          <tbody>${rows||'<tr><td colspan="8" style="text-align:center;padding:32px;color:#64748B">Nenhum fornecedor cadastrado</td></tr>'}</tbody></table>
        </div>
      </div>
    </div>`;
}
function novoFornecedor(){
  openModal(`<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-header"><div class="modal-title">🏪 Cadastrar Fornecedor</div><button class="btn btn-ghost" onclick="closeModal()">✕</button></div>
      <div class="form-row">
        <div class="form-group"><label>Razão Social</label><input id="fn-razao"/></div>
        <div class="form-group"><label>Nome Fantasia *</label><input id="fn-fantasia"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>CNPJ</label><input id="fn-cnpj"/></div>
        <div class="form-group"><label>Telefone</label><input id="fn-tel"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Tipo</label><select id="fn-tipo"><option>Peças</option><option>Oficina</option><option>Combustível</option><option>Outros</option></select></div>
        <div class="form-group"><label>Contato</label><input id="fn-cont"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Email</label><input type="email" id="fn-email"/></div>
        <div class="form-group"><label>Endereço</label><input id="fn-end"/></div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveFornecedor()">Salvar</button>
      </div>
    </div></div>`);
}
async function saveFornecedor(){
  const f=document.getElementById('fn-fantasia').value;
  if(!f){alert('Informe o nome fantasia.');return}
  const id=Date.now();
  const obj={id, razao:document.getElementById('fn-razao').value, fantasia:f, cnpj:document.getElementById('fn-cnpj').value, tel:document.getElementById('fn-tel').value, tipo:document.getElementById('fn-tipo').value, contato:document.getElementById('fn-cont').value, email:document.getElementById('fn-email').value, endereco:document.getElementById('fn-end').value};
  await window._fb.save(window._fb.cols.fornecedores, obj);
  closeModal();
}
function editFornecedor(id){
  const f=state.fornecedores.find(x=>x.id===id);if(!f)return;
  openModal(`<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-header"><div class="modal-title">✏️ Editar Fornecedor</div><button class="btn btn-ghost" onclick="closeModal()">✕</button></div>
      <input type="hidden" id="edit-fn-id" value="${id}"/>
      <div class="form-row">
        <div class="form-group"><label>Razão Social</label><input id="fn-razao-e" value="${f.razao}"/></div>
        <div class="form-group"><label>Fantasia</label><input id="fn-fantasia-e" value="${f.fantasia}"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>CNPJ</label><input id="fn-cnpj-e" value="${f.cnpj}"/></div>
        <div class="form-group"><label>Telefone</label><input id="fn-tel-e" value="${f.tel}"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Tipo</label><select id="fn-tipo-e">${['Peças','Oficina','Combustível','Outros'].map(t=>`<option${t===f.tipo?' selected':''}>${t}</option>`).join('')}</select></div>
        <div class="form-group"><label>Contato</label><input id="fn-cont-e" value="${f.contato}"/></div>
      </div>
      <div class="form-group"><label>Email</label><input id="fn-email-e" value="${f.email||''}"/></div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="updateFornecedor()">Atualizar</button>
      </div>
    </div></div>`);
}
async function updateFornecedor(){
  const id=+document.getElementById('edit-fn-id').value;
  const f=state.fornecedores.find(x=>x.id===id);if(!f)return;
  const updated={...f,
    razao:document.getElementById('fn-razao-e').value,
    fantasia:document.getElementById('fn-fantasia-e').value,
    cnpj:document.getElementById('fn-cnpj-e').value,
    tel:document.getElementById('fn-tel-e').value,
    tipo:document.getElementById('fn-tipo-e').value,
    contato:document.getElementById('fn-cont-e').value,
    email:document.getElementById('fn-email-e').value
  };
  await window._fb.save(window._fb.cols.fornecedores, updated);
  closeModal();
}
async function delFornecedor(id){if(!confirm('Remover?'))return;await window._fb.del(window._fb.cols.fornecedores,id);}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function renderDashboard(){
  const os=state.os;
  const manuts=state.manutencoes;
  const statusCounts={};
  os.forEach(o=>{statusCounts[o.status]=(statusCounts[o.status]||0)+1});
  const total=os.length;
  const totalGasto=manuts.reduce((a,m)=>a+(+m.vlrPecas||0)+(+m.vlrMO||0),0);
  const avgVeic=state.veiculos.length?totalGasto/state.veiculos.length:0;
  const maiorOS=Math.max(0,...manuts.map(m=>(+m.vlrPecas||0)+(+m.vlrMO||0)));
  const gastoByPlaca={};
  os.forEach(o=>{
    const m=manuts.filter(x=>x.os===o.num);
    const g=m.reduce((a,x)=>a+(+x.vlrPecas||0)+(+x.vlrMO||0),0);
    gastoByPlaca[o.placa]=(gastoByPlaca[o.placa]||0)+g;
  });
  const top5=Object.entries(gastoByPlaca).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxGasto=top5[0]?top5[0][1]:1;
  const rankClasses=['r1','r2','r3','',''];
  const top5Html=top5.length?top5.map(([placa,gasto],i)=>{
    const v=getVeiculo(placa);
    const pct=Math.round((gasto/maxGasto)*100);
    return `<div class="top5-item">
      <div class="top5-rank ${rankClasses[i]}">${i+1}</div>
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><strong>${placa}</strong> <span style="font-size:12px;color:var(--gray)">${v.modelo||''}</span></div>
          <strong style="color:var(--green)">${fmt(gasto)}</strong>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
    </div>`;
  }).join(''):`<div class="empty-state"><div class="empty-icon">🏎</div><p>Nenhum dado disponível</p></div>`;
  const statusList=[
    {s:'Aberta',c:'badge-gray'},{s:'Diagnóstico/Oficina',c:'badge-red'},{s:'Cotação',c:'badge-purple'},
    {s:'Aguardando Aprovação',c:'badge-amber'},{s:'Aprovada',c:'badge-blue'},{s:'Execução',c:'badge-blue'},
    {s:'Concluída',c:'badge-green'},{s:'Cancelada',c:'badge-gray'}
  ];
  const statusRows=statusList.map(({s,c})=>{
    const q=statusCounts[s]||0;
    const p=total?Math.round((q/total)*100):0;
    return `<tr><td><span class="badge ${c}">${s}</span></td><td><strong>${q}</strong></td><td>${p}%</td></tr>`;
  }).join('');
  return `
    <div class="topbar"><div><div class="page-title">📊 Dashboard Executivo</div><div class="page-sub">Responsável: Anselmo · Visão gerencial completa</div></div></div>
    <div class="content">
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:12px">▸ Indicadores Operacionais</div>
        <div class="kpi-grid">
          <div class="kpi"><div class="kpi-label">OS Abertas</div><div class="kpi-val" style="color:var(--gray)">${statusCounts['Aberta']||0}</div></div>
          <div class="kpi"><div class="kpi-label">Diagnóstico/Oficina</div><div class="kpi-val" style="color:var(--red)">${statusCounts['Diagnóstico/Oficina']||0}</div></div>
          <div class="kpi"><div class="kpi-label">Em Execução</div><div class="kpi-val" style="color:var(--blue)">${statusCounts['Execução']||0}</div></div>
          <div class="kpi"><div class="kpi-label">Concluídas</div><div class="kpi-val" style="color:var(--green)">${statusCounts['Concluída']||0}</div></div>
          <div class="kpi"><div class="kpi-label">Canceladas</div><div class="kpi-val" style="color:var(--gray)">${statusCounts['Cancelada']||0}</div></div>
          <div class="kpi"><div class="kpi-label">Total OS</div><div class="kpi-val" style="color:var(--header)">${total}</div></div>
        </div>
      </div>
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:12px">▸ Indicadores Financeiros</div>
        <div class="kpi-grid">
          <div class="kpi"><div class="kpi-label">💰 Gasto Total</div><div class="kpi-val" style="color:var(--green);font-size:18px">${fmt(totalGasto)}</div></div>
          <div class="kpi"><div class="kpi-label">📊 Média / Veículo</div><div class="kpi-val" style="color:var(--blue);font-size:18px">${fmt(avgVeic.toFixed(2))}</div></div>
          <div class="kpi"><div class="kpi-label">🔺 Maior OS</div><div class="kpi-val" style="color:var(--amber);font-size:18px">${fmt(maiorOS)}</div></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div class="card">
          <div class="card-title" style="margin-bottom:12px">▸ Resumo por Status</div>
          <table style="width:100%"><thead><tr><th>Status</th><th>Qtde</th><th>%</th></tr></thead><tbody>${statusRows}</tbody></table>
        </div>
        <div class="card">
          <div class="card-title" style="margin-bottom:12px">▸ Regras de Aprovação</div>
          <table style="width:100%"><thead><tr><th>Valor</th><th>Aprovador</th></tr></thead><tbody>
            <tr><td>Até R$ 50,00</td><td><span class="badge badge-blue">✅ Júlio</span></td></tr>
            <tr><td>Acima de R$ 50,00</td><td><span class="badge badge-purple">🔐 Anselmo</span></td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:16px">🏆 Top 5 — Veículos que mais gastaram</div>
        ${top5Html}
      </div>
    </div>`;
}

// ─── RENDER ──────────────────────────────────────────────────────────────────
function render(){
  if(!state._loaded) return;
  const pages={
    home:renderHome, os:renderOS, veiculos:renderVeiculos,
    cotacoes:renderCotacoes, aprovacoes:renderAprovacoes,
    manutencoes:renderManutencoes, pecas:renderPecas,
    historico:renderHistorico, oficinas:renderOficinas,
    fornecedores:renderFornecedores, dashboard:renderDashboard
  };
  const fn=pages[state.page]||renderHome;
  document.getElementById('main-content').innerHTML=fn();
  if(state.page==='aprovacoes') renderAprovacoesFiltro();
  document.querySelectorAll('.nav-item').forEach(el=>{
    el.classList.toggle('active',el.dataset.page===state.page);
  });
}