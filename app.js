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
    'Cotação':'badge-purple','Diagnóstico / Oficina':'badge-red','Aberta':'badge-gray',
    'Aprovada':'badge-green','Reprovada':'badge-red','Cancelada':'badge-gray','Descartada':'badge-gray',
    'Preventiva':'badge-green','Corretiva':'badge-amber'
  };
  return map[s]||'badge-gray';
}
function getPrioridadeBadge(p){
  return p==='Urgente'?'badge-red':p==='Alta'?'badge-amber':'badge-gray';
}
function getAprovadorBadge(a){return a==='Anselmo'?'badge-purple':'badge-blue'}

// ─── MONEY INPUT (máscara R$) ─────────────────────────────────────────────────
const moneyIn = n => (n!=null && n!=='') ? fmt(Number(n)) : '';
function parseMoney(v){
  if(v==null) return 0;
  const s=String(v).replace(/[R$\s.]/g,'').replace(',','.');
  return +s||0;
}
function formatMoneyInput(el){
  let digits=el.value.replace(/\D/g,'').replace(/^0+(?=\d)/,'');
  if(!digits){el.value='';return}
  const num=(+digits)/100;
  el.value='R$ '+num.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const len=el.value.length;
  el.setSelectionRange(len,len);
}

// ─── KM INPUT (máscara de milhar) ─────────────────────────────────────────────
const kmIn = n => (n!=null && n!=='') ? Number(n).toLocaleString('pt-BR') : '';
function parseKm(v){
  if(v==null) return 0;
  const s=String(v).replace(/\D/g,'');
  return +s||0;
}
function formatKmInput(el){
  const digits=el.value.replace(/\D/g,'').replace(/^0+(?=\d)/,'');
  if(!digits){el.value='';return}
  el.value=(+digits).toLocaleString('pt-BR');
  const len=el.value.length;
  el.setSelectionRange(len,len);
}

// ─── GLOBAL INPUT BEHAVIOR: máscara de moeda + maiúsculas em campos de texto ──
document.addEventListener('input', function(e){
  const t=e.target;
  if(!t||!t.tagName) return;
  if(t.closest && t.closest('#modal-root')) window._modalDirty=true;
  if(t.closest && t.closest('.draft-form')) window._pageDirty=true;
  if(t.classList && t.classList.contains('money-input')){
    formatMoneyInput(t);
    return;
  }
  if(t.classList && t.classList.contains('km-input')){
    formatKmInput(t);
    return;
  }
  const tag=t.tagName.toLowerCase();
  if(tag==='textarea' || (tag==='input' && t.type==='text')){
    const start=t.selectionStart, end=t.selectionEnd;
    const up=t.value.toUpperCase();
    if(t.value!==up){
      t.value=up;
      if(start!=null) t.setSelectionRange(start,end);
    }
  }
});
// Cobre casos que às vezes não disparam 'input' (checkbox, select, file)
document.addEventListener('change', function(e){
  const t=e.target;
  if(!t||!t.closest) return;
  if(t.closest('#modal-root')) window._modalDirty=true;
  if(t.closest('.draft-form')) window._pageDirty=true;
});

// ─── GLOBAL: Enter troca para o próximo campo ─────────────────────────────────
document.addEventListener('keydown', function(e){
  if(e.key!=='Enter') return;
  const t=e.target;
  if(!t||!t.tagName) return;
  const tag=t.tagName.toLowerCase();
  if(!['input','select','textarea'].includes(tag)) return;
  const container=t.closest('.modal')||t.closest('.content')||document.body;
  const focusable=Array.from(container.querySelectorAll('input,select,textarea'))
    .filter(el=>!el.disabled && el.type!=='hidden' && !el.readOnly && el.offsetParent!==null);
  const idx=focusable.indexOf(t);
  if(idx===-1) return;
  e.preventDefault();
  const next=focusable[idx+1];
  if(next){ next.focus(); if(next.select) next.select(); }
  else { t.blur(); } // último campo da seção: sai do foco para disparar o salvamento (onchange)
});

// ─── NAVIGATION ──────────────────────────────────────────────────────────────
window._pageDirty=false;
function go(page){
  if(window._pageDirty){
    const ok=confirm('Você preencheu informações que ainda não foram salvas nesta seção. Deseja realmente sair sem salvar?');
    if(!ok) return;
    window._pageDirty=false;
  }
  state.page=page;
  document.querySelectorAll('.nav-item').forEach(el=>{
    el.classList.toggle('active', el.dataset.page===page);
  });
  closeSidebar();
  render();
}

// ─── MOBILE SIDEBAR ──────────────────────────────────────────────────────────
function toggleSidebar(){
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('sidebar-overlay')?.classList.toggle('show');
}
function closeSidebar(){
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('show');
}

// ─── MODAL ───────────────────────────────────────────────────────────────────
window._modalDirty=false;
function openModal(html){
  document.getElementById('modal-root').innerHTML=html;
  window._modalDirty=false;
}
function closeModal(){
  document.getElementById('modal-root').innerHTML='';
  window._modalDirty=false;
}
// Usado pelo X, Cancelar e clique fora do modal: avisa se há alterações não salvas
function confirmCloseModal(){
  if(window._modalDirty){
    const ok=confirm('Você preencheu informações que ainda não foram salvas. Deseja realmente sair sem salvar?');
    if(!ok) return;
  }
  closeModal();
}
// Avisa também ao tentar sair da página/aba com um formulário aberto e não salvo
window.addEventListener('beforeunload', function(e){
  if(window._modalDirty || window._pageDirty){
    e.preventDefault();
    e.returnValue='';
  }
});

// ─── LOCK ────────────────────────────────────────────────────────────────────
function showLock(cb){
  document.getElementById('lock-root').innerHTML=`
    <div class="lock-overlay">
      <div class="lock-box">
        <div class="lock-icon">🔐</div>
        <div class="lock-title">Área Restrita</div>
        <div class="lock-sub">Apenas <strong>Anselmo</strong> pode aprovar valores acima de R$ 50.<br>Digite a senha para continuar.</div>
        <div class="form-group"><input type="password" id="lock-pass" placeholder="Senha..." autofocus onkeydown="if(event.key==='Enter'){event.preventDefault();event.stopPropagation();tryLock()}"/></div>
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
  let manuts=getManutencoesGeradas();
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
  const statusManut=['Aberta','Diagnóstico / Oficina','Cotação','Aguardando Aprovação','Aprovada','Execução'];
  const veicsManut=new Set(os.filter(o=>statusManut.includes(o.status)).map(o=>o.placa)).size;
  const diag=new Set(os.filter(o=>o.status==='Diagnóstico / Oficina').map(o=>o.placa)).size;
  const osAguardApro=getOSNumsAguardandoAprovacao();
  const aguard=new Set(osAguardApro.map(n=>os.find(o=>o.num===n)?.placa).filter(Boolean)).size;
  const exec=new Set(os.filter(o=>o.status==='Execução').map(o=>o.placa)).size;
  const cotPendente=getOSNumsPendentesCotacao().length;
  const pctDiag=veicsManut?Math.round((diag/veicsManut)*100):0;
  const pctAguard=veicsManut?Math.round((aguard/veicsManut)*100):0;
  const pctExec=veicsManut?Math.round((exec/veicsManut)*100):0;
  return `
    <div class="topbar"><div><div class="page-title">🏠 Início</div><div class="page-sub">STAYNET · Gestão de Frota</div></div>
    <span style="font-size:11px;color:#16A34A;background:#DCFCE7;padding:4px 10px;border-radius:20px;font-weight:600">🔥 Firebase Ativo</span></div>
    <div class="content">
      <div class="alert alert-green">✅ Dados sincronizados com Firebase Firestore em tempo real. Qualquer alteração é persistida automaticamente na nuvem.</div>
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="margin-bottom:14px">▸ Indicadores Operacionais</div>
        <div class="kpi-grid" style="margin-bottom:14px">
          <div class="kpi clickable-box" style="border-color:var(--blue);background:var(--blue-light)" onclick="go('os')" title="Ver Ordens de Serviço">
            <div class="kpi-label">🔧 Em Manutenção</div>
            <div class="kpi-val" style="color:var(--blue)">${veicsManut}</div>
            <div style="font-size:11px;color:var(--gray);margin-top:2px">veículos ativos</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">
          <div class="stat-tile clickable-box" style="background:var(--red-light);border:1px solid #FECACA" onclick="go('diagnostico')" title="Ver Diagnóstico Oficina">
            <div style="font-size:10px;color:var(--red);font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Diagnóstico / Oficina</div>
            <div style="font-size:24px;font-weight:700;color:var(--red);margin:4px 0">${diag}</div>
            <div style="font-size:11px;color:var(--gray)">${pctDiag}% da manutenção</div>
          </div>
          <div class="stat-tile clickable-box" style="background:var(--purple-light);border:1px solid #DDD6FE" onclick="go('cotacoes')" title="Ver Cotações">
            <div style="font-size:10px;color:var(--purple);font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Cotação Pendente</div>
            <div style="font-size:24px;font-weight:700;color:var(--purple);margin:4px 0">${cotPendente}</div>
            <div style="font-size:11px;color:var(--gray)">OS aguardando cotação</div>
          </div>
          <div class="stat-tile clickable-box" style="background:var(--amber-light);border:1px solid #FCD34D" onclick="go('aprovacoes')" title="Ver Aprovações">
            <div style="font-size:10px;color:var(--amber);font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Aguard. Aprovação</div>
            <div style="font-size:24px;font-weight:700;color:var(--amber);margin:4px 0">${aguard}</div>
            <div style="font-size:11px;color:var(--gray)">${pctAguard}% da manutenção</div>
          </div>
          <div class="stat-tile clickable-box" style="background:var(--blue-light);border:1px solid #BFDBFE" onclick="go('manutencoes')" title="Ver Manutenções">
            <div style="font-size:10px;color:var(--blue);font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Em Execução</div>
            <div style="font-size:24px;font-weight:700;color:var(--blue);margin:4px 0">${exec}</div>
            <div style="font-size:11px;color:var(--gray)">${pctExec}% da manutenção</div>
          </div>
        </div>
      </div>
    </div>`;
}

// ─── RESUMO FINANCEIRO ───────────────────────────────────────────────────────
function renderFinanceiro(){
  const{total:totalMes,avg}=calcHomeFinanceiro('all','','');
  const os=state.os;
  const manuts=getManutencoesGeradas();
  const gastoByPlaca={};
  os.forEach(o=>{
    const g=manuts.filter(x=>x.os===o.num).reduce((a,x)=>a+(+x.vlrPecas||0)+(+x.vlrMO||0),0);
    gastoByPlaca[o.placa]=(gastoByPlaca[o.placa]||0)+g;
  });
  const top5=Object.entries(gastoByPlaca).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxGasto=top5[0]?top5[0][1]:1;
  const rankClasses=['r1','r2','r3','',''];
  const top5Html=top5.length?top5.map(([placa,gasto],i)=>{
    const v=getVeiculo(placa);
    const pct=Math.round((gasto/maxGasto)*100);
    return `<div class="top5-item"><div class="top5-rank ${rankClasses[i]}">${i+1}</div><div style="flex:1;min-width:0"><div class="top5-row"><div class="top5-name"><strong>${placa}</strong> <span style="font-size:12px;color:var(--gray)">${v.modelo||''}</span></div><strong class="top5-value" style="color:var(--green)">${fmt(gasto)}</strong></div><div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div></div></div>`;
  }).join(''):`<div class="empty-state"><div class="empty-icon">🏎</div><p>Nenhum dado disponível</p></div>`;
  return `
    <div class="topbar"><div><div class="page-title">💵 Resumo Financeiro</div><div class="page-sub">Gastos consolidados de manutenção da frota</div></div></div>
    <div class="content">
      <div class="card">
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
      <div class="card" style="margin-top:16px">
        <div class="card-title" style="margin-bottom:16px">🏆 Top 5 — Veículos que mais gastaram</div>
        ${top5Html}
      </div>
    </div>`;
}

// ─── ORDENS DE SERVIÇO ───────────────────────────────────────────────────────
function renderOS(){
  const rows=state.os.filter(o=>o.status!=='Concluída').map(o=>`
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
        <button class="btn btn-sm btn-outline" onclick="editOS(${o.id})" title="Dados Gerais">✏️</button>
        ${(o.status==='Aberta'||o.status==='Diagnóstico / Oficina')?`<button class="btn btn-sm btn-outline" onclick="window._diagOpenOS.add('${o.num}');go('diagnostico')" title="Diagnóstico Oficina">🩺</button>`:''}
        ${(o.status!=='Cancelada'&&o.status!=='Reprovada')?`<button class="btn btn-sm btn-outline" onclick="window._pecasOpenOS.add('${o.num}');go('pecasOS')" title="Peças">🔩</button>`:''}
        <button class="btn btn-sm btn-danger" onclick="delOS(${o.id})">🗑</button>
      </div></td>
    </tr>`).join('');
  return `
    <div class="topbar"><div><div class="page-title">📋 Ordens de Serviço</div><div class="page-sub">Responsável: Júlio</div></div>
      <button class="btn btn-primary" onclick="novaOS()">+ Nova OS</button></div>
    <div class="content">
      <div class="alert alert-blue">💡 Após criar a OS, use 🩺 para preencher o Laudo de Oficina e 🔩 para cadastrar as peças — ambos têm seções próprias no menu. OS concluídas saem desta lista e ficam disponíveis no Histórico.</div>
      <div class="card">
        <div class="table-wrap">
          <table><thead><tr><th>OS #</th><th>Data</th><th>Placa</th><th>Veículo</th><th>Motorista</th><th>KM</th><th>Defeito</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>${rows||'<tr><td colspan="9" class="empty-state">Nenhuma OS em aberto</td></tr>'}</tbody></table>
        </div>
      </div>
    </div>`;
}
function novaOS(){
  const veics=state.veiculos.map(v=>`<option value="${v.placa}">${v.placa} – ${v.modelo}</option>`).join('');
  openModal(`<div class="modal-overlay" onclick="if(event.target===this)confirmCloseModal()">
    <div class="modal">
      <div class="modal-header"><div class="modal-title">📋 Nova Ordem de Serviço</div><button class="btn btn-ghost" onclick="confirmCloseModal()">✕</button></div>
      <div class="form-row">
        <div class="form-group"><label>Placa *</label><select id="os-placa" onchange="autoFillOS()"><option value="">Selecione...</option>${veics}</select></div>
        <div class="form-group"><label>Data *</label><input type="date" id="os-data" value="${today()}"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Veículo</label><input id="os-modelo" readonly placeholder="Preenchimento automático"/></div>
        <div class="form-group"><label>Motorista</label><input id="os-motorista" readonly placeholder="Preenchimento automático"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>KM Atual *</label><input type="text" inputmode="numeric" class="km-input" id="os-km" placeholder="0"/></div>
      </div>
      <div class="form-group"><label>Defeito Relatado pelo motorista *</label><textarea id="os-problema" rows="3"></textarea></div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="confirmCloseModal()">Cancelar</button>
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
    km:parseKm(document.getElementById('os-km').value),
    problema:document.getElementById('os-problema').value.toUpperCase(),
    defeitoMecanico:'',
    solucao:'',
    status:'Aberta',
    prioridade:'Normal',
    oficina:'',
    mo:0,
    dispensaPeca:false,
    pecas:[]
  };
  if(!obj.placa||!obj.problema){alert('Preencha Placa e Defeito.');return}

  await window._fb.save(window._fb.cols.os, obj);
  closeModal();
}
function editOS(id){
  const o=state.os.find(x=>x.id===id);
  if(!o)return;
  const veics=state.veiculos.map(v=>`<option value="${v.placa}"${v.placa===o.placa?' selected':''}>${v.placa} – ${v.modelo}</option>`).join('');
  openModal(`<div class="modal-overlay" onclick="if(event.target===this)confirmCloseModal()">
    <div class="modal">
      <div class="modal-header"><div class="modal-title">✏️ Editar OS ${o.num}</div><button class="btn btn-ghost" onclick="confirmCloseModal()">✕</button></div>
      <input type="hidden" id="edit-os-id" value="${id}"/>
      <div class="form-row">
        <div class="form-group"><label>Placa</label><select id="os-placa-edit" onchange="autoFillOS(true)"><option value="">Selecione...</option>${veics}</select></div>
        <div class="form-group"><label>Data</label><input type="date" id="os-data-edit" value="${o.data}"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Veículo</label><input id="os-modelo-edit" value="${o.modelo}" readonly/></div>
        <div class="form-group"><label>Motorista</label><input id="os-motorista-edit" value="${o.motorista}" readonly/></div>
      </div>
      <div class="form-group"><label>KM Atual</label><input type="text" inputmode="numeric" class="km-input" id="os-km-edit" value="${kmIn(o.km)}"/></div>
      <div class="form-group"><label>Defeito Relatado pelo motorista</label><textarea id="os-problema-edit" rows="3">${o.problema}</textarea></div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="confirmCloseModal()">Cancelar</button>
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
    km:parseKm(document.getElementById('os-km-edit').value),
    problema:document.getElementById('os-problema-edit').value.toUpperCase()
  };
  await window._fb.save(window._fb.cols.os, updated);
  closeModal();
}
async function delOS(id){
  if(!confirm('Remover esta OS?'))return;
  await window._fb.del(window._fb.cols.os, id);
}

// ─── VISUALIZAÇÃO (somente leitura) DE UMA OS — usado pelo Histórico ─────────
function verDetalhesOS(id){
  const o=state.os.find(x=>x.id===id);
  if(!o)return;
  const m=getManutencoesGeradas().find(x=>x.os===o.num);
  const pecas=o.pecas||[];
  openModal(`<div class="modal-overlay" onclick="if(event.target===this)confirmCloseModal()">
    <div class="modal">
      <div class="modal-header"><div class="modal-title">📄 Detalhes da OS ${o.num}</div><button class="btn btn-ghost" onclick="confirmCloseModal()">✕</button></div>

      <div style="font-size:12px;font-weight:600;color:var(--gray);margin-bottom:8px;text-transform:uppercase">Dados Gerais</div>
      <div class="form-row">
        <div><label>Placa</label><div style="font-size:14px;font-weight:600">${o.placa}</div></div>
        <div><label>Data</label><div style="font-size:14px">${fmtDate(o.data)}</div></div>
      </div>
      <div class="form-row" style="margin-top:10px">
        <div><label>Veículo</label><div style="font-size:14px">${o.modelo||'—'}</div></div>
        <div><label>Motorista</label><div style="font-size:14px">${o.motorista||'—'}</div></div>
      </div>
      <div class="form-row" style="margin-top:10px">
        <div><label>KM</label><div style="font-size:14px">${o.km!=null?Number(o.km).toLocaleString('pt-BR'):'—'}</div></div>
        <div><label>Status</label><div><span class="badge ${getStatusBadge(o.status)}">${o.status}</span></div></div>
      </div>
      <div style="margin-top:10px"><label>Defeito Relatado pelo motorista</label><div style="font-size:14px">${o.problema||'—'}</div></div>

      <hr style="border:none;border-top:1px solid var(--border);margin:16px 0">
      <div style="font-size:12px;font-weight:600;color:var(--gray);margin-bottom:8px;text-transform:uppercase">Laudo de Oficina</div>
      <div class="form-row">
        <div><label>Oficina</label><div style="font-size:14px">${o.oficina||'—'}</div></div>
        <div><label>Valor de Mão de Obra</label><div style="font-size:14px">${o.mo?fmt(o.mo):'—'}</div></div>
      </div>
      <div style="margin-top:10px"><label>Defeito Encontrado pelo mecânico</label><div style="font-size:14px">${o.defeitoMecanico||'—'}</div></div>
      <div style="margin-top:10px"><label>Solução Proposta pelo mecânico</label><div style="font-size:14px">${o.solucao||'—'}</div></div>

      ${m?`
      <hr style="border:none;border-top:1px solid var(--border);margin:16px 0">
      <div style="font-size:12px;font-weight:600;color:var(--gray);margin-bottom:8px;text-transform:uppercase">Cotação Aprovada / Manutenção</div>
      <div class="form-row">
        <div><label>Vlr. Peças</label><div style="font-size:14px">${fmt(m.vlrPecas)}</div></div>
        <div><label>Vlr. Mão de Obra</label><div style="font-size:14px">${fmt(m.vlrMO)}</div></div>
      </div>
      <div class="form-row" style="margin-top:10px">
        <div><label>Total</label><div style="font-size:14px;font-weight:600">${fmt(m.total)}</div></div>
        <div><label>NF</label><div style="font-size:14px">${m.nf||'—'}</div></div>
      </div>`:''}

      <hr style="border:none;border-top:1px solid var(--border);margin:16px 0">
      <div style="font-size:12px;font-weight:600;color:var(--gray);margin-bottom:8px;text-transform:uppercase">Peças (${pecas.length})</div>
      ${o.dispensaPeca?'<div class="empty-state" style="padding:12px;font-size:12px">Peça dispensada para esta OS</div>':renderPecaRowsOS(o,true)}

      <div class="modal-actions">
        <button class="btn btn-primary" onclick="confirmCloseModal()">Fechar</button>
      </div>
    </div></div>`);
}

// ─── DIAGNÓSTICO OFICINA (seção própria, integrada com Peças) ────────────────
window._diagOpenOS=new Set();
function toggleDiagOS(osNum){
  const el=document.getElementById('diag-body-'+osNum);
  if(!el)return;
  const isOpen=el.style.display!=='none';
  el.style.display=isOpen?'none':'block';
  if(isOpen) window._diagOpenOS.delete(osNum); else window._diagOpenOS.add(osNum);
  const icon=document.getElementById('diag-icon-'+osNum);
  if(icon)icon.textContent=isOpen?'▶':'▼';
}
function laudoOficinaFormHTML(o){
  const suf='-'+o.num;
  const ofList=state.oficinas.map(x=>`<option>${x.fantasia}</option>`).join('');
  return `
    <div class="form-group"><label>Oficina</label><input id="lo-oficina${suf}" list="lo-of-list${suf}" placeholder="Nome da oficina" value="${o.oficina||''}"/><datalist id="lo-of-list${suf}">${ofList}</datalist></div>
    <div class="form-group"><label>Defeito Encontrado pelo mecânico</label><textarea id="lo-defeito${suf}" rows="3">${o.defeitoMecanico||''}</textarea></div>
    <div class="form-group"><label>Solução Proposta pelo mecânico</label><textarea id="lo-solucao${suf}" rows="3">${o.solucao||''}</textarea></div>
    <div class="form-group"><label>Valor de Mão de Obra</label><input type="text" inputmode="decimal" class="money-input" id="lo-mo${suf}" placeholder="R$ 0,00" value="${moneyIn(o.mo)}"/></div>
    <div class="modal-actions" style="justify-content:flex-start;border:none;padding-top:0;margin-top:0">
      <button type="button" class="btn btn-primary btn-sm" onclick="saveLaudoOficina('${o.num}')">💾 Salvar Laudo</button>
    </div>`;
}
async function saveLaudoOficina(osNum){
  const o=state.os.find(x=>x.num===osNum);
  if(!o)return;
  const suf='-'+osNum;
  const oficina=document.getElementById('lo-oficina'+suf).value;
  const defeitoMecanico=document.getElementById('lo-defeito'+suf).value;
  const solucao=document.getElementById('lo-solucao'+suf).value;
  const mo=parseMoney(document.getElementById('lo-mo'+suf).value);
  const laudoPreenchido=!!(oficina&&defeitoMecanico&&solucao);
  let status=o.status;
  if(status==='Aberta'&&laudoPreenchido) status='Diagnóstico / Oficina';
  window._diagOpenOS.add(osNum);
  window._pageDirty=false;
  await window._fb.save(window._fb.cols.os, {...o, oficina, defeitoMecanico, solucao, mo, status});
}
function renderDiagnosticoOficina(){
  const osList=state.os.filter(o=>o.status==='Aberta'||o.status==='Diagnóstico / Oficina')
    .slice().sort((a,b)=>(a.status===b.status)?(a.num<b.num?-1:1):(a.status==='Aberta'?-1:1));
  const cards=osList.map(o=>{
    const isOpen=window._diagOpenOS.has(o.num);
    const pecasCount=(o.pecas||[]).length;
    return `<div class="card" style="margin-bottom:12px">
      <div onclick="toggleDiagOS('${o.num}')" class="card-toggle-header" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:10px">
          <span id="diag-icon-${o.num}" style="font-size:12px;color:var(--gray)">${isOpen?'▼':'▶'}</span>
          <strong>${o.placa}</strong>
          <span style="font-size:12px;color:var(--gray)">${o.modelo||''} · ${o.num} · ${fmtDate(o.data)}</span>
          <span class="badge ${getStatusBadge(o.status)}">${o.status}</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:12px;color:var(--gray)">🔩 ${o.dispensaPeca?'peça dispensada':pecasCount+' peça(s)'}</span>
          <button type="button" class="btn btn-sm btn-outline" onclick="event.stopPropagation();window._pecasOpenOS.add('${o.num}');go('pecasOS')">Ver Peças</button>
        </div>
      </div>
      <div id="diag-body-${o.num}" class="draft-form" style="display:${isOpen?'block':'none'};margin-top:14px">
        <div class="alert alert-blue" style="margin-bottom:12px"><strong>Defeito Relatado pelo motorista:</strong> ${o.problema}</div>
        ${laudoOficinaFormHTML(o)}
      </div>
    </div>`;
  });
  return `
    <div class="topbar"><div><div class="page-title">🩺 Diagnóstico Oficina</div><div class="page-sub">Laudo técnico das OS abertas — integrado com Peças</div></div></div>
    <div class="content">
      <div class="alert alert-blue">💡 Ao salvar o laudo com Oficina, Defeito Encontrado e Solução preenchidos, a OS avança automaticamente para "Diagnóstico / Oficina". Use "Ver Peças" para cadastrar as peças desta OS.</div>
      ${cards.length?cards.join(''):'<div class="card"><div class="empty-state"><div class="empty-icon">🩺</div><p>Nenhuma OS aguardando diagnóstico</p></div></div>'}
    </div>`;
}

// ─── PEÇAS DA OS (seção própria, integrada com Diagnóstico Oficina) ──────────
window._pecasOpenOS=new Set();
function togglePecasOS(osNum){
  const el=document.getElementById('pc-body-'+osNum);
  if(!el)return;
  const isOpen=el.style.display!=='none';
  el.style.display=isOpen?'none':'block';
  if(isOpen) window._pecasOpenOS.delete(osNum); else window._pecasOpenOS.add(osNum);
  const icon=document.getElementById('pc-icon-'+osNum);
  if(icon)icon.textContent=isOpen?'▶':'▼';
}
// ─── FOTO DA PEÇA (compressão + visualização) ─────────────────────────────────
function compressImageFile(file, maxDim=900, quality=0.7){
  return new Promise((resolve,reject)=>{
    if(!file.type||!file.type.startsWith('image/')){reject(new Error('Selecione um arquivo de imagem.'));return}
    const reader=new FileReader();
    reader.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        let {width,height}=img;
        if(width>maxDim||height>maxDim){
          if(width>height){height=Math.round(height*maxDim/width);width=maxDim;}
          else{width=Math.round(width*maxDim/height);height=maxDim;}
        }
        const canvas=document.createElement('canvas');
        canvas.width=width;canvas.height=height;
        canvas.getContext('2d').drawImage(img,0,0,width,height);
        resolve(canvas.toDataURL('image/jpeg',quality));
      };
      img.onerror=()=>reject(new Error('Não foi possível processar a imagem.'));
      img.src=reader.result;
    };
    reader.onerror=()=>reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}
function viewFotoPeca(foto,desc){
  if(!foto)return;
  openModal(`<div class="modal-overlay" onclick="if(event.target===this)confirmCloseModal()">
    <div class="modal" style="max-width:520px;text-align:center">
      <div class="modal-header"><div class="modal-title">🔩 ${desc||'Foto da peça'}</div><button class="btn btn-ghost" onclick="confirmCloseModal()">✕</button></div>
      <img src="${foto}" style="max-width:100%;border-radius:10px;margin-bottom:16px"/>
      <div class="modal-actions" style="justify-content:center">
        <a class="btn btn-primary" href="${foto}" download="peca.jpg">⬇️ Baixar</a>
        <button class="btn btn-outline" onclick="confirmCloseModal()">Fechar</button>
      </div>
    </div></div>`);
}
function renderPecaRowsOS(o, readOnly){
  const pecas=o.pecas||[];
  if(!pecas.length) return '<div class="empty-state" style="padding:12px;font-size:12px">Nenhuma peça adicionada</div>';
  return pecas.map(p=>{
    const descAttr=(p.desc||'').replace(/'/g,"\\'");
    const fotoHtml=p.foto
      ?`<div style="position:relative;flex:none">
          <img src="${p.foto}" onclick="viewFotoPeca('${p.foto}','${descAttr}')" style="width:44px;height:44px;object-fit:cover;border-radius:6px;cursor:pointer" title="Clique para ver/baixar"/>
          ${readOnly?'':`<button type="button" onclick="removeFotoPecaOS('${o.num}','${p.id}')" title="Remover foto" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:var(--red);color:#fff;border:none;font-size:10px;line-height:1;cursor:pointer">✕</button>`}
        </div>`
      :'<div style="width:44px;height:44px;border-radius:6px;background:var(--gray-light);flex:none;display:flex;align-items:center;justify-content:center;font-size:18px">🔩</div>';
    return `
    <div style="display:flex;gap:14px;align-items:center;border:1px solid var(--border);border-radius:8px;padding:8px;margin-bottom:8px">
      ${fotoHtml}
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:13px">${p.qtde}x ${p.desc}</div>
        <div style="font-size:12px;color:var(--gray)">${[p.marca&&('Marca: '+p.marca),p.ref&&('Ref.: '+p.ref)].filter(Boolean).join(' · ')||'—'}</div>
        ${p.obs?`<div style="font-size:12px;color:var(--gray)">Obs.: ${p.obs}</div>`:''}
      </div>
      ${readOnly?'':`<button type="button" class="btn btn-sm btn-danger" onclick="removePecaOS('${o.num}','${p.id}')">🗑</button>`}
    </div>`;
  }).join('');
}
async function addPecaOS(osNum){
  const o=state.os.find(x=>x.num===osNum);
  if(!o)return;
  const qtde=+document.getElementById('pc-qtde-'+osNum).value||1;
  const desc=document.getElementById('pc-desc-'+osNum).value.trim();
  const marca=document.getElementById('pc-marca-'+osNum).value.trim();
  const ref=document.getElementById('pc-ref-'+osNum).value.trim();
  const obs=document.getElementById('pc-obs-'+osNum).value.trim();
  const fileInput=document.getElementById('pc-foto-'+osNum);
  const file=fileInput.files[0];
  if(!desc){alert('Informe a descrição da peça.');return}
  const push=async(foto)=>{
    const id=Date.now()+'_'+Math.random().toString(36).slice(2,7);
    const pecas=[...(o.pecas||[]), {id,qtde,desc,marca,ref,foto:foto||'',obs}];
    window._pecasOpenOS.add(osNum);
    window._pageDirty=false;
    await window._fb.save(window._fb.cols.os, {...o, pecas});
  };
  if(file){
    try{
      const foto=await compressImageFile(file);
      await push(foto);
    }catch(err){
      alert('Erro ao processar a foto: '+err.message);
    }
  } else await push('');
}
async function removePecaOS(osNum,pecaId){
  const o=state.os.find(x=>x.num===osNum);
  if(!o)return;
  const pecas=(o.pecas||[]).filter(p=>String(p.id)!==String(pecaId));
  window._pecasOpenOS.add(osNum);
  await window._fb.save(window._fb.cols.os, {...o, pecas});
}
async function removeFotoPecaOS(osNum,pecaId){
  const o=state.os.find(x=>x.num===osNum);
  if(!o)return;
  const pecas=(o.pecas||[]).map(p=>String(p.id)===String(pecaId)?{...p,foto:''}:p);
  window._pecasOpenOS.add(osNum);
  await window._fb.save(window._fb.cols.os, {...o, pecas});
}
function toggleDispensaPecaOS(osNum){
  const cb=document.getElementById('pc-dispensa-'+osNum);
  const wrap=document.getElementById('pc-form-'+osNum);
  if(wrap) wrap.style.display=cb.checked?'none':'block';
  const o=state.os.find(x=>x.num===osNum);
  if(o){ window._pecasOpenOS.add(osNum); window._fb.save(window._fb.cols.os, {...o, dispensaPeca:cb.checked}); }
}
function renderPecasOS(){
  const osList=state.os.filter(o=>o.status!=='Cancelada'&&o.status!=='Concluída'&&o.status!=='Reprovada').slice().sort((a,b)=>(b.num||'').localeCompare(a.num||''));
  const cards=osList.map(o=>{
    const isOpen=window._pecasOpenOS.has(o.num);
    const pecas=o.pecas||[];
    return `<div class="card" style="margin-bottom:12px">
      <div onclick="togglePecasOS('${o.num}')" class="card-toggle-header" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:10px">
          <span id="pc-icon-${o.num}" style="font-size:12px;color:var(--gray)">${isOpen?'▼':'▶'}</span>
          <strong>${o.num}</strong>
          <span style="font-size:12px;color:var(--gray)">${o.placa} · ${o.modelo||''}${o.oficina?' · Oficina: '+o.oficina:''}</span>
          <span class="badge ${getStatusBadge(o.status)}">${o.status}</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:12px;color:var(--gray)">${o.dispensaPeca?'Peça dispensada':pecas.length+' peça(s)'}</span>
          <button type="button" class="btn btn-sm btn-outline" onclick="event.stopPropagation();window._diagOpenOS.add('${o.num}');go('diagnostico')">🩺 Ver Diagnóstico</button>
        </div>
      </div>
      <div id="pc-body-${o.num}" style="display:${isOpen?'block':'none'};margin-top:14px">
        ${o.defeitoMecanico?`<div class="alert alert-blue" style="margin-bottom:12px"><strong>Defeito encontrado pelo mecânico:</strong> ${o.defeitoMecanico}</div>`:''}
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin:0 0 14px;cursor:pointer">
          <input type="checkbox" id="pc-dispensa-${o.num}" ${o.dispensaPeca?'checked':''} onchange="toggleDispensaPecaOS('${o.num}')"/>
          Dispensar necessidade de peça
        </label>
        <div id="pc-form-${o.num}" class="draft-form" style="display:${o.dispensaPeca?'none':'block'}">
          <div class="form-row">
            <div class="form-group" style="max-width:100px"><label>Qtde.</label><input type="number" id="pc-qtde-${o.num}" min="1" value="1"/></div>
            <div class="form-group"><label>Descrição</label><input id="pc-desc-${o.num}"/></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Marca</label><input id="pc-marca-${o.num}"/></div>
            <div class="form-group"><label>Referência</label><input id="pc-ref-${o.num}"/></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Foto da Peça</label><input type="file" accept="image/*" id="pc-foto-${o.num}"/></div>
            <div class="form-group"><label>Observação</label><input id="pc-obs-${o.num}"/></div>
          </div>
          <div class="modal-actions" style="justify-content:flex-start;border:none;padding-top:0;margin:0 0 12px">
            <button type="button" class="btn btn-primary btn-sm" onclick="addPecaOS('${o.num}')">+ Adicionar Peça</button>
          </div>
          <div id="pc-list-${o.num}">${renderPecaRowsOS(o)}</div>
        </div>
      </div>
    </div>`;
  });
  return `
    <div class="topbar"><div><div class="page-title">🔩 Peças</div><div class="page-sub">Peças necessárias por OS — integrado com Diagnóstico Oficina e Cotações</div></div></div>
    <div class="content">
      <div class="alert alert-blue">💡 As peças cadastradas aqui alimentam as Cotações. Marque "Dispensar necessidade de peça" para OS que não precisam de peças. Use "Ver Diagnóstico" para abrir o laudo desta OS.</div>
      ${cards.length?cards.join(''):'<div class="card"><div class="empty-state"><div class="empty-icon">🔩</div><p>Nenhuma OS cadastrada</p></div></div>'}
    </div>`;
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
  openModal(`<div class="modal-overlay" onclick="if(event.target===this)confirmCloseModal()">
    <div class="modal">
      <div class="modal-header"><div class="modal-title">🚙 Cadastrar Veículo</div><button class="btn btn-ghost" onclick="confirmCloseModal()">✕</button></div>
      <div class="form-row"><div class="form-group"><label>Placa *</label><input id="v-placa" placeholder="ABC-1234"/></div>
        <div class="form-group"><label>Modelo *</label><input id="v-modelo" placeholder="Fiat Strada 1.3"/></div></div>
      <div class="form-row"><div class="form-group"><label>Motorista *</label><input id="v-motorista"/></div>
        <div class="form-group"><label>Ano</label><input type="number" id="v-ano" value="${new Date().getFullYear()}"/></div></div>
      <div class="form-row"><div class="form-group"><label>Cor</label><input id="v-cor"/></div>
        <div class="form-group"><label>Observação</label><input id="v-obs"/></div></div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="confirmCloseModal()">Cancelar</button>
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
  openModal(`<div class="modal-overlay" onclick="if(event.target===this)confirmCloseModal()">
    <div class="modal">
      <div class="modal-header"><div class="modal-title">✏️ Editar Veículo</div><button class="btn btn-ghost" onclick="confirmCloseModal()">✕</button></div>
      <input type="hidden" id="edit-v-id" value="${id}"/>
      <div class="form-row"><div class="form-group"><label>Placa</label><input id="v-placa-e" value="${v.placa}"/></div>
        <div class="form-group"><label>Modelo</label><input id="v-modelo-e" value="${v.modelo}"/></div></div>
      <div class="form-row"><div class="form-group"><label>Motorista</label><input id="v-motorista-e" value="${v.motorista}"/></div>
        <div class="form-group"><label>Ano</label><input type="number" id="v-ano-e" value="${v.ano}"/></div></div>
      <div class="form-row"><div class="form-group"><label>Cor</label><input id="v-cor-e" value="${v.cor}"/></div>
        <div class="form-group"><label>Obs.</label><input id="v-obs-e" value="${v.obs||''}"/></div></div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="confirmCloseModal()">Cancelar</button>
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
  const pecas=pecasDaOSCotacao(c.os);
  const subtotal=pecas.reduce((a,p)=>{
    const unit=(c.precos&&c.precos[p.id]!=null)?+c.precos[p.id]:0;
    return a+unit*(+p.qtde||1);
  },0);
  const descVal=subtotal*(+c.desconto||0)/100;
  return {subtotal, descVal, total:subtotal-descVal};
}
// OS que já têm cotação lançada e ainda aguardam decisão de aprovação (nem aprovada, nem reprovada)
// true se a parte "peças" da OS já está resolvida (dispensada ou com cotação aprovada)
function osPecaAprovada(osNum){
  const o=state.os.find(x=>x.num===osNum);
  if(o&&o.dispensaPeca) return true;
  const cotsOS=state.cotacoes.filter(c=>c.os===osNum);
  if(!cotsOS.length) return false;
  return cotsOS.some(c=>{
    const a=state.aprovacoes.find(x=>x.cotacaoId===c.id);
    return a&&a.status==='Aprovada';
  });
}
// true se a mão de obra desta OS já foi aprovada
function osMOAprovada(osNum){
  return state.aprovacoes.some(a=>a.os===osNum&&a.tipo==='mo'&&a.status==='Aprovada');
}
// true se a M.O. desta OS já teve uma decisão (aprovada ou reprovada)
function osMODecidida(osNum){
  return state.aprovacoes.some(a=>a.os===osNum&&a.tipo==='mo'&&(a.status==='Aprovada'||a.status==='Reprovada'));
}
// true se a OS já tem laudo (oficina/defeito/solução) preenchido e a M.O. ainda não foi decidida
function osPrecisaAprovarMO(o){
  if(!o) return false;
  const laudoPreenchido=!!(o.oficina&&o.defeitoMecanico&&o.solucao);
  if(!laudoPreenchido) return false;
  return !osMODecidida(o.num);
}
const STATUS_OS_ENCERRADOS=['Execução','Concluída','Cancelada','Reprovada'];
function getOSNumsAguardandoAprovacao(){
  const nums=new Set();
  // OS com cotação de peças lançada e ainda sem decisão definitiva (aprovada ou 100% reprovada)
  const osComCot=[...new Set(state.cotacoes.map(c=>c.os))];
  osComCot.forEach(osNum=>{
    const o=state.os.find(x=>x.num===osNum);
    if(!o||STATUS_OS_ENCERRADOS.includes(o.status)) return;
    const cotsOS=state.cotacoes.filter(c=>c.os===osNum);
    const aprovsOS=state.aprovacoes.filter(a=>a.os===osNum&&a.cotacaoId);
    const cotAprovada=cotsOS.find(c=>{
      const a=aprovsOS.find(x=>x.cotacaoId===c.id);
      return a&&a.status==='Aprovada';
    });
    const todasReprovadas=cotsOS.length && cotsOS.every(c=>{const a=aprovsOS.find(x=>x.cotacaoId===c.id);return a&&a.status==='Reprovada';});
    if(!cotAprovada && !todasReprovadas) nums.add(osNum);
  });
  // OS com laudo preenchido (peça dispensada ou não) cuja mão de obra ainda não foi aprovada
  state.os.forEach(o=>{
    if(STATUS_OS_ENCERRADOS.includes(o.status)) return;
    if(osPrecisaAprovarMO(o)) nums.add(o.num);
  });
  return [...nums];
}
// OS com peças cadastradas (não dispensadas) que ainda não têm nenhuma cotação lançada
function getOSNumsPendentesCotacao(){
  const osComCot=new Set(state.cotacoes.map(c=>c.os));
  return state.os
    .filter(o=>o.status!=='Cancelada'&&o.status!=='Concluída'&&o.status!=='Reprovada')
    .filter(o=>!o.dispensaPeca && (o.pecas||[]).length>0 && !osComCot.has(o.num))
    .map(o=>o.num);
}
window._cotOpenOS=new Set();
function toggleCotacaoOS(osNum){
  const el=document.getElementById('cot-body-'+osNum);
  if(!el)return;
  const isOpen=el.style.display!=='none';
  el.style.display=isOpen?'none':'block';
  if(isOpen) window._cotOpenOS.delete(osNum); else window._cotOpenOS.add(osNum);
  const icon=document.getElementById('cot-icon-'+osNum);
  if(icon)icon.textContent=isOpen?'▶':'▼';
}
function updateCotacaoPreco(cotId,pecaId,value){
  const c=state.cotacoes.find(x=>x.id===cotId);
  if(!c)return;
  const precos={...(c.precos||{}),[pecaId]:parseMoney(value)};
  window._fb.save(window._fb.cols.cotacoes, {...c, precos});
}
function updateCotacaoDesconto(cotId,value){
  const c=state.cotacoes.find(x=>x.id===cotId);
  if(!c)return;
  window._fb.save(window._fb.cols.cotacoes, {...c, desconto:+value||0});
}
function renderCotacoes(){
  const osAtivas=new Set(state.os.filter(o=>o.status!=='Concluída'&&o.status!=='Cancelada'&&o.status!=='Reprovada').map(o=>o.num));
  const osComCot=[...new Set(state.cotacoes.map(c=>c.os))].filter(osNum=>osAtivas.has(osNum));
  const todasOS=state.os.filter(o=>!o.dispensaPeca&&o.pecas&&o.pecas.length&&osAtivas.has(o.num)).map(o=>o.num);
  const osOrdenadas=[...new Set([...todasOS,...osComCot])];
  const cards=osOrdenadas.map(osNum=>{
    const o=state.os.find(x=>x.num===osNum);
    const pecas=(o&&o.pecas)||[];
    const cotsOS=state.cotacoes.filter(c=>c.os===osNum);
    const totais=cotsOS.map(c=>calcTotalCotacao(c).total);
    const minValor=totais.length?Math.min(...totais):null;
    const isOpen=window._cotOpenOS.has(osNum);

    const fornCols=cotsOS.map(c=>`<th>${c.fornecedor||'—'} <button class="btn btn-sm btn-outline" style="margin-left:4px" onclick="editCotacao(${c.id})">✏️</button><button class="btn btn-sm btn-danger" style="margin-left:4px" onclick="delCotacao(${c.id})">🗑</button></th>`).join('');
    const pecaRows=pecas.map(p=>{
      const descAttr=(p.desc||'').replace(/'/g,"\\'");
      const fotoCell=p.foto
        ?`<img src="${p.foto}" onclick="viewFotoPeca('${p.foto}','${descAttr}')" style="width:36px;height:36px;object-fit:cover;border-radius:6px;cursor:pointer" title="Clique para ver/baixar"/>`
        :'—';
      const cells=cotsOS.map(c=>{
        const val=(c.precos&&c.precos[p.id]!=null)?c.precos[p.id]:'';
        const lineTotal=val!==''?(+val)*(+p.qtde||1):0;
        return `<td><input type="text" inputmode="decimal" class="money-input" value="${moneyIn(val)}" style="width:110px" placeholder="R$ 0,00 (unit.)" onchange="updateCotacaoPreco(${c.id},'${p.id}',this.value)"/>${val!==''?`<div style="font-size:11px;color:var(--gray);margin-top:2px">Total: ${fmt(lineTotal)}</div>`:''}</td>`;
      }).join('');
      return `<tr><td>${fotoCell}</td><td>${p.desc}</td><td>${p.marca||'—'}</td><td>${p.qtde}</td>${cells}</tr>`;
    }).join('');
    const totalCells=cotsOS.map(c=>`<td><strong>${fmt(calcTotalCotacao(c).subtotal)}</strong></td>`).join('');
    const descCells=cotsOS.map(c=>`<td><input type="number" step="0.1" min="0" max="100" value="${c.desconto||0}" style="width:70px" onchange="updateCotacaoDesconto(${c.id},this.value)"/>%</td>`).join('');
    const finalCells=cotsOS.map(c=>{
      const t=calcTotalCotacao(c).total;
      const sugerido=minValor!==null&&t===minValor;
      return `<td style="${sugerido?'background:#DCFCE7':''}"><strong style="color:var(--green)">${fmt(t)}</strong>${sugerido?' ✅':''}</td>`;
    }).join('');

    return `<div class="card" style="margin-bottom:12px">
      <div onclick="toggleCotacaoOS('${osNum}')" class="card-toggle-header" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:10px">
          <span id="cot-icon-${osNum}" style="font-size:12px;color:var(--gray)">${isOpen?'▼':'▶'}</span>
          <strong>${osNum}</strong>
          ${o?`<span style="font-size:12px;color:var(--gray)">${o.placa} · ${o.modelo||''}${o.oficina?' · Oficina: '+o.oficina:''}</span><span class="badge ${getStatusBadge(o.status)}">${o.status}</span>`:''}
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:12px;color:var(--gray)">${cotsOS.length} fornecedor(es)</span>
          ${cotsOS.length?`<strong style="color:var(--green);font-size:13px">${fmt(minValor)} menor</strong>`:''}
          <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();novaCotacao('${osNum}')">+ Fornecedor</button>
        </div>
      </div>
      <div id="cot-body-${osNum}" style="display:${isOpen?'block':'none'};margin-top:14px">
        ${!pecas.length?'<div style="text-align:center;padding:20px;color:var(--gray)">Esta OS não possui peças cadastradas.</div>'
        :!cotsOS.length?'<div style="text-align:center;padding:20px;color:var(--gray)">Nenhum fornecedor adicionado ainda.</div>'
        :`<div class="table-wrap"><table>
          <thead><tr><th>Foto</th><th>Produto</th><th>Marca</th><th>Qntd</th>${fornCols}</tr></thead>
          <tbody>${pecaRows}<tr style="background:var(--gray-light)"><td colspan="4"><strong>TOTAL</strong></td>${totalCells}</tr></tbody>
        </table></div>
        <div class="table-wrap" style="margin-top:10px"><table>
          <thead><tr><th></th>${cotsOS.map(c=>`<th>${c.fornecedor||'—'}</th>`).join('')}</tr></thead>
          <tbody>
            <tr><td>Subtotal</td>${totalCells}</tr>
            <tr><td>Desconto</td>${descCells}</tr>
            <tr><td><strong>Total</strong></td>${finalCells}</tr>
          </tbody>
        </table></div>`}
      </div>
    </div>`;
  });
  return `
    <div class="topbar"><div><div class="page-title">💰 Cotações</div><div class="page-sub">Responsável: Bruna — Clique na OS para comparar fornecedores</div></div>
      <button class="btn btn-primary" onclick="novaCotacao()">+ Nova Cotação</button></div>
    <div class="content">
      <div class="alert alert-blue">💡 Informe o <strong>valor unitário</strong> de cada peça — o sistema multiplica automaticamente pela quantidade. A coluna em <strong>verde</strong> indica o fornecedor de menor valor total. Total = Subtotal das peças − Desconto.</div>
      ${cards.length?cards.join(''):'<div class="card"><div class="empty-state"><div class="empty-icon">💰</div><p>Nenhuma OS com peças pendentes de cotação</p></div></div>'}
    </div>`;
}
window._cotFornTmp=[];
function pecasDaOSCotacao(osNum){
  const o=state.os.find(x=>x.num===osNum);
  return (o&&o.pecas)||[];
}
function renderCotPecasRef(osNum){
  const pecas=pecasDaOSCotacao(osNum);
  if(!pecas.length) return '<div class="empty-state" style="padding:8px;font-size:12px">Esta OS não possui peças cadastradas.</div>';
  return `<div class="table-wrap"><table><thead><tr><th>Foto</th><th>Produto</th><th>Marca</th><th>Qntd</th></tr></thead><tbody>${pecas.map(p=>{
    const descAttr=(p.desc||'').replace(/'/g,"\\'");
    const fotoCell=p.foto?`<img src="${p.foto}" onclick="viewFotoPeca('${p.foto}','${descAttr}')" style="width:36px;height:36px;object-fit:cover;border-radius:6px;cursor:pointer" title="Clique para ver/baixar"/>`:'—';
    return `<tr><td>${fotoCell}</td><td>${p.desc}</td><td>${p.marca||'—'}</td><td>${p.qtde}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}
function renderCotPrecoInputs(osNum,prefix,precos){
  const pecas=pecasDaOSCotacao(osNum);
  if(!pecas.length) return '';
  return pecas.map(p=>`
    <div class="form-group"><label>Valor Unitário — ${p.desc}${p.marca?' ('+p.marca+')':''} (Qtd ${p.qtde})</label><input type="text" inputmode="decimal" class="money-input" id="${prefix}${p.id}" value="${precos&&precos[p.id]!=null?moneyIn(precos[p.id]):''}" placeholder="R$ 0,00 por unidade"/></div>`).join('');
}
function onCotacaoOSChange(){
  const osNum=document.getElementById('c-os').value;
  document.getElementById('cot-pecas-ref').innerHTML=renderCotPecasRef(osNum);
  document.getElementById('cot-preco-inputs').innerHTML=renderCotPrecoInputs(osNum,'cf-preco-');
}
function renderCotFornRows(){
  return window._cotFornTmp.map((f,i)=>{
    const total=Object.values(f.precos||{}).reduce((a,v)=>a+(+v||0),0);
    return `<div class="form-row" style="align-items:center;border:1px solid var(--border);border-radius:8px;padding:8px;margin-bottom:8px">
      <div style="flex:1">
        <div style="font-weight:600;font-size:13px">${f.fornecedor}</div>
        <div style="font-size:12px;color:var(--gray)">Total peças: ${fmt(total)}${f.pgto?' · '+f.pgto:''}</div>
      </div>
      <button type="button" class="btn btn-sm btn-danger" onclick="removeFornecedorTmp(${i})">🗑</button>
    </div>`;
  }).join('') || '<div class="empty-state" style="padding:12px;font-size:12px">Nenhum fornecedor adicionado ainda</div>';
}
function refreshCotFornList(){
  const el=document.getElementById('cot-forn-list');
  if(el) el.innerHTML=renderCotFornRows();
}
function addFornecedorTmp(){
  const osNum=document.getElementById('c-os').value;
  const fornecedor=document.getElementById('c-forn').value.trim();
  if(!osNum||!fornecedor){alert('Informe a OS e o Fornecedor.');return}
  const pecas=pecasDaOSCotacao(osNum);
  const precos={};
  pecas.forEach(p=>{const el=document.getElementById('cf-preco-'+p.id); precos[p.id]=el?parseMoney(el.value):0;});
  const pgto=document.getElementById('c-pgto').value;
  const obs=document.getElementById('c-obs').value;
  window._cotFornTmp.push({fornecedor,precos,pgto,obs});
  document.getElementById('c-forn').value='';
  document.getElementById('c-pgto').value='';
  document.getElementById('c-obs').value='';
  pecas.forEach(p=>{const el=document.getElementById('cf-preco-'+p.id); if(el) el.value='';});
  refreshCotFornList();
}
function removeFornecedorTmp(i){
  window._cotFornTmp.splice(i,1);
  refreshCotFornList();
}
function novaCotacao(osPresel){
  window._cotFornTmp=[];
  const osList=state.os.filter(o=>!o.dispensaPeca&&!STATUS_OS_ENCERRADOS.includes(o.status));
  const osAtual=osPresel||(osList[0]?osList[0].num:'');
  const osOptions=osList.map(o=>`<option value="${o.num}"${o.num===osAtual?' selected':''}>${o.num} — ${o.placa}</option>`).join('');
  const fornList=state.fornecedores.map(f=>`<option>${f.fantasia}</option>`).join('');
  openModal(`<div class="modal-overlay" onclick="if(event.target===this)confirmCloseModal()">
    <div class="modal" style="max-width:640px">
      <div class="modal-header"><div class="modal-title">💰 Adicionar Fornecedores à Cotação</div><button class="btn btn-ghost" onclick="confirmCloseModal()">✕</button></div>
      <div class="form-group"><label>OS # *</label><select id="c-os" ${osPresel?'disabled':''} onchange="onCotacaoOSChange()">${osOptions}</select></div>
      <div style="font-size:12px;font-weight:600;color:var(--gray);margin:8px 0 6px;text-transform:uppercase">Peças desta OS</div>
      <div id="cot-pecas-ref">${renderCotPecasRef(osAtual)}</div>
      <hr style="border:none;border-top:1px solid var(--border);margin:12px 0">
      <div style="font-size:12px;font-weight:600;color:var(--gray);margin-bottom:8px;text-transform:uppercase">Novo Fornecedor</div>
      <div class="form-group"><label>Fornecedor *</label><input id="c-forn" list="c-forn-list" placeholder="Nome do fornecedor"/><datalist id="c-forn-list">${fornList}</datalist></div>
      <div id="cot-preco-inputs">${renderCotPrecoInputs(osAtual,'cf-preco-')}</div>
      <div class="form-row">
        <div class="form-group"><label>Forma de Pgto</label><input id="c-pgto"/></div>
        <div class="form-group"><label>Observação</label><input id="c-obs"/></div>
      </div>
      <div class="modal-actions" style="justify-content:flex-start;margin:0 0 12px">
        <button type="button" class="btn btn-primary btn-sm" onclick="addFornecedorTmp()">+ Adicionar Fornecedor</button>
      </div>
      <div id="cot-forn-list">${renderCotFornRows()}</div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="confirmCloseModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveCotacoes()">Salvar</button>
      </div>
    </div></div>`);
}
async function saveCotacoes(){
  const os=document.getElementById('c-os').value;
  if(!os){alert('Informe a OS.');return}
  if(!window._cotFornTmp.length){
    const ok=confirm('Nenhum fornecedor foi adicionado. Deseja salvar mesmo assim, sem fornecedor?');
    if(!ok) return;
    window._cotOpenOS.add(os);
    closeModal();
    return;
  }
  for(const f of window._cotFornTmp){
    const id=Date.now()+Math.floor(Math.random()*1000);
    await window._fb.save(window._fb.cols.cotacoes, {id,os,fornecedor:f.fornecedor,desconto:0,precos:f.precos,pgto:f.pgto,obs:f.obs,escolhido:false});
  }
  window._cotOpenOS.add(os);
  closeModal();
}
function editCotacao(id){
  const c=state.cotacoes.find(x=>x.id===id);
  if(!c)return;
  const fornList=state.fornecedores.map(f=>`<option>${f.fantasia}</option>`).join('');
  openModal(`<div class="modal-overlay" onclick="if(event.target===this)confirmCloseModal()">
    <div class="modal" style="max-width:640px">
      <div class="modal-header"><div class="modal-title">✏️ Editar Fornecedor — ${c.os}</div><button class="btn btn-ghost" onclick="confirmCloseModal()">✕</button></div>
      <input type="hidden" id="cf-edit-id" value="${id}"/>
      <div class="form-group"><label>Fornecedor *</label><input id="cf-forn-edit" list="cf-forn-edit-list" value="${c.fornecedor||''}"/><datalist id="cf-forn-edit-list">${fornList}</datalist></div>
      <div style="font-size:12px;font-weight:600;color:var(--gray);margin:8px 0 6px;text-transform:uppercase">Valores por peça</div>
      ${renderCotPrecoInputs(c.os,'cfe-preco-',c.precos)}
      <div class="form-row">
        <div class="form-group"><label>Forma de Pgto</label><input id="cf-pgto-edit" value="${c.pgto||''}"/></div>
        <div class="form-group"><label>Observação</label><input id="cf-obs-edit" value="${c.obs||''}"/></div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="confirmCloseModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="updateCotacao()">Salvar</button>
      </div>
    </div></div>`);
}
async function updateCotacao(){
  const id=+document.getElementById('cf-edit-id').value;
  const c=state.cotacoes.find(x=>x.id===id);
  if(!c)return;
  const pecas=pecasDaOSCotacao(c.os);
  const precos={};
  pecas.forEach(p=>{const el=document.getElementById('cfe-preco-'+p.id); precos[p.id]=el?parseMoney(el.value):0;});
  const updated={...c,
    fornecedor:document.getElementById('cf-forn-edit').value.trim(),
    precos,
    pgto:document.getElementById('cf-pgto-edit').value,
    obs:document.getElementById('cf-obs-edit').value
  };
  await window._fb.save(window._fb.cols.cotacoes, updated);
  closeModal();
}
async function delCotacao(id){if(!confirm('Remover fornecedor desta cotação?'))return;await window._fb.del(window._fb.cols.cotacoes,id);}

// ─── APROVAÇÕES (100% integrado com Cotações) ─────────────────────────────
window._apOpenOS=new Set();
function toggleAprovOS(osNum){
  const el=document.getElementById('ap-body-'+osNum);
  if(!el)return;
  const isOpen=el.style.display!=='none';
  el.style.display=isOpen?'none':'block';
  if(isOpen) window._apOpenOS.delete(osNum); else window._apOpenOS.add(osNum);
  const icon=document.getElementById('ap-icon-'+osNum);
  if(icon)icon.textContent=isOpen?'▶':'▼';
}

function renderAprovacoes(){
  return `
    <div class="topbar"><div><div class="page-title">✅ Aprovações</div><div class="page-sub">Até R$ 50 → Júlio · Acima de R$ 50 → Anselmo (senha requerida)</div></div></div>
    <div class="content">
      <div class="alert alert-amber">🔒 Aprovações acima de R$ 50,00 exigem autenticação de Anselmo.</div>
      <div class="alert alert-blue">💡 A coluna em <strong>verde</strong> é a recomendada (menor valor total). Aprovar um fornecedor diferente pedirá confirmação. Ao aprovar um fornecedor, os demais da mesma OS ficam bloqueados. A <strong>Mão de Obra</strong> tem aprovação própria, separada da cotação de peças — a OS só vai para Execução quando ambas estiverem aprovadas.</div>
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
          <button class="btn btn-outline" style="margin-bottom:1px" onclick="limparFiltroAprov()">✕ Limpar</button>
        </div>
      </div>
      <div id="ap-cards"></div>
    </div>`;
}

function renderAprovacoesFiltro(){
  const ini=document.getElementById('ap-f-ini')?.value||'';
  const fim=document.getElementById('ap-f-fim')?.value||'';

  // Apenas OS com cotação lançada que ainda aguardam decisão de aprovação
  let osOrdenadas=getOSNumsAguardandoAprovacao();

  const cards=osOrdenadas.map(osNum=>{
    const o=state.os.find(x=>x.num===osNum);
    const pecas=(o&&o.pecas)||[];
    const cotsOS=state.cotacoes.filter(c=>c.os===osNum);
    let aprovsOS=state.aprovacoes.filter(a=>a.os===osNum&&a.cotacaoId);
    const moAprov=state.aprovacoes.find(a=>a.os===osNum&&a.tipo==='mo');

    let cotsVisiveis=cotsOS;
    let moVisivel=true;
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
      const dMO=(moAprov&&moAprov.data)||osData;
      if(dMO){
        if(ini&&dMO<ini) moVisivel=false;
        if(fim&&dMO>fim) moVisivel=false;
      }
    }

    // Se não sobrou nada visível (nem cotação, nem M.O.) para esta OS após os filtros, oculta o card
    if((ini||fim) && !cotsVisiveis.length && !moVisivel) return '';

    const minValor=cotsOS.length?Math.min(...cotsOS.map(c=>calcTotalCotacao(c).total)):null;

    const isOpen=window._apOpenOS.has(osNum);

    const fornCols=cotsVisiveis.map(c=>`<th>${c.fornecedor||'—'}</th>`).join('');
    const pecaRows=pecas.map(p=>{
      const cells=cotsVisiveis.map(c=>{
        const unit=(c.precos&&c.precos[p.id]!=null)?+c.precos[p.id]:0;
        return `<td>${fmt(unit*(+p.qtde||1))}</td>`;
      }).join('');
      return `<tr><td>${p.desc}</td><td>${p.marca||'—'}</td><td>${p.qtde}</td>${cells}</tr>`;
    }).join('');
    const totalCells=cotsVisiveis.map(c=>`<td><strong>${fmt(calcTotalCotacao(c).subtotal)}</strong></td>`).join('');
    const descCells=cotsVisiveis.map(c=>`<td style="color:var(--red)">${c.desconto||0}%</td>`).join('');
    const finalCells=cotsVisiveis.map(c=>{
      const t=calcTotalCotacao(c).total;
      const sugerido=minValor!==null&&t===minValor;
      return `<td style="${sugerido?'background:#DCFCE7':''}"><strong style="color:var(--green)">${fmt(t)}</strong>${sugerido?' ✅':''}</td>`;
    }).join('');
    const statusCells=cotsVisiveis.map(c=>{
      const aprovDaCot=aprovsOS.find(a=>a.cotacaoId===c.id);
      const status=aprovDaCot?aprovDaCot.status:'Aguardando Aprovação';
      const statusTag = status==='Aprovada'
        ? `<span class="badge ${getStatusBadge(status)}">Aprovada · ${fmt(aprovDaCot.valor)}</span>`
        : `<span class="badge ${getStatusBadge(status)}">${status}</span>`;
      return `<td>${statusTag}</td>`;
    }).join('');
    const acaoCells=cotsVisiveis.map(c=>{
      const aprovDaCot=aprovsOS.find(a=>a.cotacaoId===c.id);
      const status=aprovDaCot?aprovDaCot.status:'Aguardando Aprovação';
      // Como só chegam aqui OS ainda sem cotação aprovada, basta checar se esta cotação já foi decidida
      const podeAgir=status==='Aguardando Aprovação';
      const btns=podeAgir
        ? `<button class="btn btn-sm btn-success" onclick="tryApproveCotacao('${osNum}',${c.id})">✅ Aprovar</button>
           <button class="btn btn-sm btn-danger" onclick="reproveCotacao('${osNum}',${c.id})">❌ Reprovar</button>`
        : '';
      return `<td><div class="action-btns">${btns}</div></td>`;
    }).join('');

    const moValor=+(o&&o.mo)||0;
    const moStatus=moAprov?moAprov.status:'Aguardando Aprovação';
    const moPodeAgir=moStatus==='Aguardando Aprovação';
    const moBlockHtml=!moVisivel?'':`
      <div style="margin-bottom:14px;padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--gray-light);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
        <div>
          <div style="font-size:11px;font-weight:600;color:var(--gray);text-transform:uppercase;letter-spacing:0.5px">🔧 Mão de Obra</div>
          <div style="font-size:18px;font-weight:700;color:var(--header)">${fmt(moValor)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span class="badge ${getStatusBadge(moStatus)}">${moStatus}</span>
          ${moPodeAgir?`<button class="btn btn-sm btn-success" onclick="tryApproveMO('${osNum}')">✅ Aprovar M.O.</button><button class="btn btn-sm btn-danger" onclick="reproveMO('${osNum}')">❌ Reprovar</button>`:''}
        </div>
      </div>`;
    const pecasBlockHtml=!pecas.length
      ?(o&&o.dispensaPeca?'<div class="empty-state" style="padding:12px;font-size:12px">Peça dispensada para esta OS</div>':'<div style="text-align:center;padding:20px;color:var(--gray)">Esta OS não possui peças cadastradas.</div>')
      :!cotsVisiveis.length?'<div style="text-align:center;padding:20px;color:var(--gray)">Nenhuma cotação encontrada para os filtros aplicados</div>'
      :`<div class="table-wrap"><table>
          <thead><tr><th>Produto</th><th>Marca</th><th>Qntd</th>${fornCols}</tr></thead>
          <tbody>${pecaRows}<tr style="background:var(--gray-light)"><td colspan="3"><strong>TOTAL</strong></td>${totalCells}</tr></tbody>
        </table></div>
        <div class="table-wrap" style="margin-top:10px"><table>
          <thead><tr><th></th>${cotsVisiveis.map(c=>`<th>${c.fornecedor||'—'}</th>`).join('')}</tr></thead>
          <tbody>
            <tr><td>Subtotal</td>${totalCells}</tr>
            <tr><td>Desconto</td>${descCells}</tr>
            <tr><td><strong>Total</strong></td>${finalCells}</tr>
            <tr><td>Status</td>${statusCells}</tr>
            <tr><td>Ações</td>${acaoCells}</tr>
          </tbody>
        </table></div>`;

    return `<div class="card" style="margin-bottom:12px">
      <div onclick="toggleAprovOS('${osNum}')" class="card-toggle-header" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:10px">
          <span id="ap-icon-${osNum}" style="font-size:12px;color:var(--gray)">${isOpen?'▼':'▶'}</span>
          <strong>${osNum}</strong>
          ${o?`<span style="font-size:12px;color:var(--gray)">${o.placa} · ${o.modelo||''}${o.oficina?' · Oficina: '+o.oficina:''}</span>`:''}
          ${o&&o.dispensaPeca?'<span class="badge badge-gray">Peça dispensada</span>':''}
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:12px;color:var(--gray)">${cotsOS.length} cotação(ões)</span>
          ${cotsOS.length?`<strong style="color:var(--green);font-size:13px">${fmt(minValor)} menor</strong>`:''}
        </div>
      </div>
      <div id="ap-body-${osNum}" style="display:${isOpen?'block':'none'};margin-top:14px">
        ${moBlockHtml}
        ${pecasBlockHtml}
      </div>
    </div>`;
  }).filter(Boolean);

  const wrap=document.getElementById('ap-cards');
  if(wrap) wrap.innerHTML=cards.length?cards.join(''):'<div class="card"><div class="empty-state"><div class="empty-icon">✅</div><p>Nenhuma cotação encontrada</p></div></div>';
}

function limparFiltroAprov(){
  const ini=document.getElementById('ap-f-ini');if(ini)ini.value='';
  const fim=document.getElementById('ap-f-fim');if(fim)fim.value='';
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
    const ok=confirm(`Esta NÃO é a cotação recomendada pelo sistema (menor valor: ${fmt(minValor)}).\n\nValor desta cotação: ${fmt(total)} — Fornecedor: ${cot.fornecedor||'—'}.\n\nDeseja realmente aprovar esta cotação mesmo assim?`);
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
    obs: aprov?.obs||(cot.fornecedor?`Cotação: ${cot.fornecedor}`:'')
  };
  await window._fb.save(window._fb.cols.aprovacoes, obj);

  await checkAndAdvanceExecucao(osNum);
}

// A OS só avança para Execução quando peças (ou dispensa) E mão de obra estiverem aprovadas
async function checkAndAdvanceExecucao(osNum){
  const o=state.os.find(x=>x.num===osNum);
  if(!o||o.status==='Execução'||o.status==='Concluída') return;
  if(osPecaAprovada(osNum)&&osMOAprovada(osNum)){
    await window._fb.save(window._fb.cols.os, {...o, status:'Execução'});
  }
}

// ── Aprovação da Mão de Obra (separada da cotação de peças) ────────────────
function tryApproveMO(osNum){
  const o=state.os.find(x=>x.num===osNum);
  if(!o)return;
  const valor=+o.mo||0;
  const fazer=()=>doApproveMO(osNum,valor);
  if(valor>50){ showLock(fazer); } else { fazer(); }
}
async function doApproveMO(osNum,valor){
  let aprov=state.aprovacoes.find(a=>a.os===osNum&&a.tipo==='mo');
  const id=aprov?aprov.id:Date.now()+Math.floor(Math.random()*1000);
  const obj={
    id, os:osNum, tipo:'mo', valor,
    aprovador: valor>50?'Anselmo':'Júlio',
    status:'Aprovada',
    data: today(),
    autorizado: valor>50?'Anselmo':'Júlio',
    obs: aprov?.obs||'Mão de obra'
  };
  await window._fb.save(window._fb.cols.aprovacoes, obj);
  await checkAndAdvanceExecucao(osNum);
}
async function reproveMO(osNum){
  const o=state.os.find(x=>x.num===osNum);
  const valor=+(o&&o.mo)||0;
  let aprov=state.aprovacoes.find(a=>a.os===osNum&&a.tipo==='mo');
  const id=aprov?aprov.id:Date.now()+Math.floor(Math.random()*1000);
  const obj={
    id, os:osNum, tipo:'mo', valor,
    aprovador: valor>50?'Anselmo':'Júlio',
    status:'Reprovada',
    data: today(),
    autorizado: aprov?.autorizado||'',
    obs: aprov?.obs||'Mão de obra'
  };
  await window._fb.save(window._fb.cols.aprovacoes, obj);
  // Mão de obra reprovada reprova a OS inteira, retirando-a das demais seções
  if(o) await window._fb.save(window._fb.cols.os, {...o, status:'Reprovada'});
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
    obs: aprov?.obs||(cot.fornecedor?`Cotação: ${cot.fornecedor}`:'')
  };
  await window._fb.save(window._fb.cols.aprovacoes, obj);

  // Se todos os fornecedores desta OS já foram reprovados, a OS inteira é reprovada
  const cotsOS=state.cotacoes.filter(c=>c.os===osNum);
  const todasReprovadas=cotsOS.every(c=>{
    if(c.id===cotacaoId) return true; // acabamos de reprovar esta agora mesmo
    const a=state.aprovacoes.find(x=>x.cotacaoId===c.id);
    return a&&a.status==='Reprovada';
  });
  if(todasReprovadas){
    const o=state.os.find(x=>x.num===osNum);
    if(o) await window._fb.save(window._fb.cols.os, {...o, status:'Reprovada'});
  }
}

// ─── MANUTENÇÕES (gerado automaticamente a partir de OS em Execução/Concluída) ──
function getManutencoesGeradas(){
  // Uma "manutenção" = uma OS que já chegou em Execução (peça aprovada/dispensada + M.O. aprovada) ou já foi Concluída
  return state.os
    .filter(o=>o.status==='Execução'||o.status==='Concluída')
    .map(o=>{
      const cot=state.cotacoes.find(c=>c.os===o.num && state.aprovacoes.some(a=>a.cotacaoId===c.id&&a.status==='Aprovada'));
      const aprovCot=cot?state.aprovacoes.find(a=>a.cotacaoId===cot.id&&a.status==='Aprovada'):null;
      const aprovMO=state.aprovacoes.find(a=>a.os===o.num&&a.tipo==='mo'&&a.status==='Aprovada');
      const vlrPecas=cot?calcTotalCotacao(cot).total:0;
      const vlrMO=+(o.mo)||0;
      const cotacaoId=cot?cot.id:('mo-'+o.num);
      // solução editável manualmente; usa override salvo em state.manutDescs, senão vem da Solução cadastrada na OS
      const override=state.manutDescs?.[cotacaoId];
      const pecasResumo=o.pecas?.length?o.pecas.map(p=>`${p.qtde}x ${p.desc}`).join(', '):'';
      const desc=override!=null?override:(o.solucao||pecasResumo||(cot&&cot.obs)||'—');
      return {
        cotacaoId,
        os:o.num,
        data:(aprovCot&&aprovCot.data)||(aprovMO&&aprovMO.data)||o.data,
        oficina:o.oficina||(cot&&cot.fornecedor)||'',
        desc,
        vlrPecas,
        vlrMO,
        total:vlrPecas+vlrMO,
        nf:(cot&&cot.obs)||'—',
        km:o.km,
        placa:o.placa,
        status:o.status
      };
    });
}

function renderManutVeiculosAndamento(){
  const grupos=[
    {status:'Diagnóstico / Oficina', label:'Em Diagnóstico', action:o=>`window._diagOpenOS.add('${o.num}');go('diagnostico')`},
    {status:'Execução', label:'Em Execução', action:o=>`editOS(${o.id})`}
  ];
  const blocks=grupos.map(g=>{
    const lista=state.os.filter(o=>o.status===g.status);
    if(!lista.length) return '';
    const btns=lista.map(o=>`
      <button type="button" class="diag-veiculo-btn" onclick="${g.action(o)}">
        <div class="diag-veiculo-placa">${o.placa} <span style="font-weight:400;color:var(--gray)">${o.modelo||''}</span></div>
        <div class="diag-veiculo-info">${o.num} · ${fmtDate(o.data)}</div>
      </button>`).join('');
    return `<div style="margin-bottom:16px">
      <div class="card-title" style="margin-bottom:10px">${g.label} (${lista.length})</div>
      <div class="diag-grid">${btns}</div>
    </div>`;
  }).join('');
  return blocks;
}
function renderManutencoes(){
  const linhas=getManutencoesGeradas().filter(m=>m.status!=='Concluída');
  const rows=linhas.map(m=>`<tr>
      <td><strong>${m.os}</strong></td>
      <td>${fmtDate(m.data)}</td>
      <td>${m.km!=null?Number(m.km).toLocaleString('pt-BR')+' km':'—'}</td>
      <td>${m.oficina||'—'}</td>
      <td>${m.desc}</td>
      <td>${fmt(m.vlrPecas)}</td>
      <td>${fmt(m.vlrMO)}</td>
      <td><strong>${fmt(m.total)}</strong></td>
      <td><div class="action-btns">
        <button class="btn btn-sm btn-outline" onclick="editManutDesc('${m.cotacaoId}')">✏️ Solução</button>
        <button class="btn btn-sm btn-success" onclick="baixarOS('${m.os}')">✅ Baixar OS</button>
      </div></td>
    </tr>`).join('');
  return `
    <div class="topbar"><div><div class="page-title">🔧 Manutenções</div><div class="page-sub">Responsável: Bruna — Gerado automaticamente a partir das OS em execução</div></div></div>
    <div class="content">
      <div class="alert alert-blue">💡 Estas linhas vêm automaticamente das OS aprovadas em ✅ Aprovações (peças e mão de obra). Ao dar baixa, a OS sai desta lista e passa para o Histórico do veículo.</div>
      ${renderManutVeiculosAndamento()}
      <div class="card">
        <div class="table-wrap">
          <table><thead><tr><th>OS #</th><th>Data</th><th>KM</th><th>Oficina</th><th>Solução</th><th>Vlr. Peças</th><th>Vlr. M.O.</th><th>Total</th><th>Ações</th></tr></thead>
          <tbody>${rows||'<tr><td colspan="9" style="text-align:center;padding:24px;color:#64748B">Nenhuma OS em manutenção encontrada</td></tr>'}</tbody></table>
        </div>
      </div>
    </div>`;
}

async function baixarOS(osNum){
  if(!confirm(`Dar baixa na OS ${osNum}? Ela será marcada como Concluída e passará a aparecer apenas no Histórico do veículo.`))return;
  const o=state.os.find(x=>x.num===osNum);
  if(!o)return;
  await window._fb.save(window._fb.cols.os, {...o, status:'Concluída'});
}

function editManutDesc(cotacaoId){
  const linhas=getManutencoesGeradas();
  const m=linhas.find(x=>String(x.cotacaoId)===String(cotacaoId));
  if(!m)return;
  openModal(`<div class="modal-overlay" onclick="if(event.target===this)confirmCloseModal()">
    <div class="modal">
      <div class="modal-header"><div class="modal-title">✏️ Editar Solução — ${m.os}</div><button class="btn btn-ghost" onclick="confirmCloseModal()">✕</button></div>
      <input type="hidden" id="md-cotid" value="${cotacaoId}"/>
      <div class="form-group"><label>Solução</label><textarea id="md-desc" rows="3">${m.desc}</textarea></div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="confirmCloseModal()">Cancelar</button>
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
  openModal(`<div class="modal-overlay" onclick="if(event.target===this)confirmCloseModal()">
    <div class="modal">
      <div class="modal-header"><div class="modal-title">🔩 Registrar Peça</div><button class="btn btn-ghost" onclick="confirmCloseModal()">✕</button></div>
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
        <div class="form-group"><label>Vlr. Unitário</label><input type="text" inputmode="decimal" class="money-input" id="p-vlr" placeholder="R$ 0,00"/></div>
      </div>
      <div class="form-group"><label>Observação</label><input id="p-obs"/></div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="confirmCloseModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="savePeca()">Salvar</button>
      </div>
    </div></div>`);
}
async function savePeca(){
  const id=Date.now();
  const obj={id, os:document.getElementById('p-os').value, peca:document.getElementById('p-peca').value, marca:document.getElementById('p-marca').value, qtde:+document.getElementById('p-qtde').value||1, fornecedor:document.getElementById('p-forn').value, vlrUnit:parseMoney(document.getElementById('p-vlr').value), obs:document.getElementById('p-obs').value};
  await window._fb.save(window._fb.cols.pecas, obj);
  closeModal();
}
async function delPeca(id){if(!confirm('Remover?'))return;await window._fb.del(window._fb.cols.pecas,id);}

// ─── HISTÓRICO ───────────────────────────────────────────────────────────────
function renderHistorico(){
  const placas=[...new Set(state.veiculos.map(v=>v.placa))];
  const placaChecks=placas.map(p=>`
            <label style="display:flex;align-items:center;gap:5px;font-size:13px;font-weight:400;margin:0;cursor:pointer">
              <input type="checkbox" class="hist-placa-cb" value="${p}" onchange="toggleHistPlaca(this)"/> ${p}
            </label>`).join('');
  return `
    <div class="topbar"><div><div class="page-title">📂 Histórico</div><div class="page-sub">Todas as OS — filtre por período e placa</div></div></div>
    <div class="content">
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap">
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:var(--header);margin-bottom:5px">🔍 Placa(s)</label>
            <div style="display:flex;flex-wrap:wrap;gap:6px 14px;border:1px solid var(--border);border-radius:8px;padding:8px 12px;max-width:360px">
              <label style="display:flex;align-items:center;gap:5px;font-size:13px;font-weight:600;margin:0;cursor:pointer">
                <input type="checkbox" id="hist-placa-todas" onchange="toggleHistTodas(this)"/> Todas
              </label>
              ${placaChecks}
            </div>
          </div>
          <div><label style="display:block;font-size:12px;font-weight:600;color:var(--header);margin-bottom:5px">De</label>
            <input type="date" id="hist-data-ini" onchange="renderHistoricoResult()" style="padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px"/>
          </div>
          <div><label style="display:block;font-size:12px;font-weight:600;color:var(--header);margin-bottom:5px">Até</label>
            <input type="date" id="hist-data-fim" onchange="renderHistoricoResult()" style="padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px"/>
          </div>
          <button class="btn btn-outline" onclick="limparFiltrosHistorico()">Limpar Filtros</button>
          <div style="flex:1"></div>
          <button class="btn btn-primary" onclick="exportHistoricoExcel()">⬇️ Baixar Excel</button>
        </div>
      </div>
      <div id="hist-result"></div>
    </div>`;
}
function toggleHistTodas(cb){
  if(cb.checked){
    document.querySelectorAll('.hist-placa-cb').forEach(el=>{el.checked=false});
  }
  renderHistoricoResult();
}
function toggleHistPlaca(cb){
  if(cb.checked){
    const todas=document.getElementById('hist-placa-todas');
    if(todas) todas.checked=false;
  }
  renderHistoricoResult();
}
function getHistPlacasSelecionadas(){
  return Array.from(document.querySelectorAll('.hist-placa-cb:checked')).map(el=>el.value);
}
function limparFiltrosHistorico(){
  const todas=document.getElementById('hist-placa-todas'); if(todas) todas.checked=false;
  document.querySelectorAll('.hist-placa-cb').forEach(el=>{el.checked=false});
  document.getElementById('hist-data-ini').value='';
  document.getElementById('hist-data-fim').value='';
  renderHistoricoResult();
}
function getHistoricoFiltrado(){
  const placas=getHistPlacasSelecionadas();
  const dataIni=document.getElementById('hist-data-ini')?.value||'';
  const dataFim=document.getElementById('hist-data-fim')?.value||'';
  const geradas=getManutencoesGeradas();
  const osFiltradas=state.os
    .filter(o=>{
      if(placas.length&&!placas.includes(o.placa))return false;
      if(dataIni&&o.data<dataIni)return false;
      if(dataFim&&o.data>dataFim)return false;
      return true;
    })
    .slice()
    .sort((a,b)=>(b.data||'').localeCompare(a.data||''));
  return osFiltradas.map(o=>({o, m:geradas.find(x=>x.os===o.num)}));
}
function renderHistoricoResult(){
  const div=document.getElementById('hist-result');
  if(!div)return;
  const todasSelecionada=document.getElementById('hist-placa-todas')?.checked||false;
  const placas=getHistPlacasSelecionadas();
  const dataIni=document.getElementById('hist-data-ini')?.value||'';
  const dataFim=document.getElementById('hist-data-fim')?.value||'';
  if(!todasSelecionada&&!placas.length&&!dataIni&&!dataFim){
    div.innerHTML='<div class="card"><div class="empty-state"><div class="empty-icon">🔍</div><p>Selecione ao menos uma placa (ou "Todas") ou um período para visualizar as OS do histórico</p></div></div>';
    return;
  }
  const itens=getHistoricoFiltrado();
  const totalGasto=itens.reduce((a,{m})=>a+(m?m.total:0),0);
  const veiculosDistintos=new Set(itens.map(({o})=>o.placa)).size;
  const rows=itens.map(({o,m})=>`<tr style="cursor:pointer" onclick="verDetalhesOS(${o.id})">
      <td><strong>${o.num}</strong></td>
      <td>${fmtDate(o.data)}</td>
      <td><strong>${o.placa}</strong></td>
      <td>${o.modelo||'—'}</td>
      <td>${m?m.oficina:(o.oficina||'—')}</td>
      <td>${o.solucao||'—'}</td>
      <td>${m?fmt(m.vlrPecas):'—'}</td>
      <td>${m?fmt(m.vlrMO):(o.mo?fmt(o.mo):'—')}</td>
      <td>${m?fmt(m.total):'—'}</td>
      <td>${o.problema}</td>
    </tr>`).join('');
  div.innerHTML=`
    <div class="card" style="margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">
        <div><div style="font-size:11px;color:var(--gray);text-transform:uppercase">Total OS</div><div style="font-weight:700;font-size:16px;color:var(--blue)">${itens.length}</div></div>
        <div><div style="font-size:11px;color:var(--gray);text-transform:uppercase">Veículos</div><div style="font-weight:600">${veiculosDistintos}</div></div>
        <div><div style="font-size:11px;color:var(--gray);text-transform:uppercase">Total Gasto</div><div style="font-weight:700;color:var(--green)">${fmt(totalGasto)}</div></div>
      </div>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table><thead><tr><th>OS #</th><th>Data</th><th>Placa</th><th>Veículo</th><th>Oficina</th><th>Serviço</th><th>Vlr. Peças</th><th>Vlr. M.O.</th><th>Total</th><th>Defeito</th></tr></thead>
        <tbody>${rows||'<tr><td colspan="10" style="text-align:center;padding:24px;color:#64748B">Nenhuma OS encontrada para os filtros aplicados</td></tr>'}</tbody></table>
      </div>
    </div>`;
}
function exportHistoricoExcel(){
  const itens=getHistoricoFiltrado();
  if(!itens.length){alert('Nenhuma OS para exportar com os filtros aplicados.');return}
  const data=itens.map(({o,m})=>({
    'OS':o.num,
    'Data':fmtDate(o.data),
    'Placa':o.placa,
    'Veículo':o.modelo||'',
    'Motorista':o.motorista||'',
    'KM':o.km||'',
    'Status':o.status,
    'Oficina':m?m.oficina:'',
    'Problema':o.problema||'',
    'Serviço':o.solucao||'',
    'Valor Peças':m?m.vlrPecas:'',
    'Valor MO':m?m.vlrMO:'',
    'Total':m?m.total:'',
    'NF':m?m.nf:''
  }));
  const ws=XLSX.utils.json_to_sheet(data);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Histórico');
  const placas=getHistPlacasSelecionadas();
  const dataIni=document.getElementById('hist-data-ini')?.value||'';
  const dataFim=document.getElementById('hist-data-fim')?.value||'';
  const partes=['historico', placas.length?placas.join('-'):'todas-placas'];
  if(dataIni||dataFim) partes.push(`${dataIni||'inicio'}_a_${dataFim||'hoje'}`);
  XLSX.writeFile(wb, partes.join('_')+'.xlsx');
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
  openModal(`<div class="modal-overlay" onclick="if(event.target===this)confirmCloseModal()">
    <div class="modal">
      <div class="modal-header"><div class="modal-title">🏭 Cadastrar Oficina</div><button class="btn btn-ghost" onclick="confirmCloseModal()">✕</button></div>
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
        <button class="btn btn-outline" onclick="confirmCloseModal()">Cancelar</button>
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
  openModal(`<div class="modal-overlay" onclick="if(event.target===this)confirmCloseModal()">
    <div class="modal">
      <div class="modal-header"><div class="modal-title">✏️ Editar Oficina</div><button class="btn btn-ghost" onclick="confirmCloseModal()">✕</button></div>
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
        <button class="btn btn-outline" onclick="confirmCloseModal()">Cancelar</button>
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
          <table><thead><tr><th>Razão Social</th><th>Fantasia</th><th>CNPJ</th><th>Telefone</th><th>Contato</th><th>Email</th><th>Ações</th></tr></thead>
          <tbody>${rows||'<tr><td colspan="7" style="text-align:center;padding:32px;color:#64748B">Nenhum fornecedor cadastrado</td></tr>'}</tbody></table>
        </div>
      </div>
    </div>`;
}
function novoFornecedor(){
  openModal(`<div class="modal-overlay" onclick="if(event.target===this)confirmCloseModal()">
    <div class="modal">
      <div class="modal-header"><div class="modal-title">🏪 Cadastrar Fornecedor</div><button class="btn btn-ghost" onclick="confirmCloseModal()">✕</button></div>
      <div class="form-row">
        <div class="form-group"><label>Razão Social</label><input id="fn-razao"/></div>
        <div class="form-group"><label>Nome Fantasia *</label><input id="fn-fantasia"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>CNPJ</label><input id="fn-cnpj"/></div>
        <div class="form-group"><label>Telefone</label><input id="fn-tel"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Contato</label><input id="fn-cont"/></div>
        <div class="form-group"><label>Email</label><input type="email" id="fn-email"/></div>
      </div>
      <div class="form-group"><label>Endereço</label><input id="fn-end"/></div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="confirmCloseModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveFornecedor()">Salvar</button>
      </div>
    </div></div>`);
}
async function saveFornecedor(){
  const f=document.getElementById('fn-fantasia').value;
  if(!f){alert('Informe o nome fantasia.');return}
  const id=Date.now();
  const obj={id, razao:document.getElementById('fn-razao').value, fantasia:f, cnpj:document.getElementById('fn-cnpj').value, tel:document.getElementById('fn-tel').value, contato:document.getElementById('fn-cont').value, email:document.getElementById('fn-email').value, endereco:document.getElementById('fn-end').value};
  await window._fb.save(window._fb.cols.fornecedores, obj);
  closeModal();
}
function editFornecedor(id){
  const f=state.fornecedores.find(x=>x.id===id);if(!f)return;
  openModal(`<div class="modal-overlay" onclick="if(event.target===this)confirmCloseModal()">
    <div class="modal">
      <div class="modal-header"><div class="modal-title">✏️ Editar Fornecedor</div><button class="btn btn-ghost" onclick="confirmCloseModal()">✕</button></div>
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
        <div class="form-group"><label>Contato</label><input id="fn-cont-e" value="${f.contato}"/></div>
        <div class="form-group"><label>Email</label><input id="fn-email-e" value="${f.email||''}"/></div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="confirmCloseModal()">Cancelar</button>
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
      <div style="flex:1;min-width:0">
        <div class="top5-row">
          <div class="top5-name"><strong>${placa}</strong> <span style="font-size:12px;color:var(--gray)">${v.modelo||''}</span></div>
          <strong class="top5-value" style="color:var(--green)">${fmt(gasto)}</strong>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
    </div>`;
  }).join(''):`<div class="empty-state"><div class="empty-icon">🏎</div><p>Nenhum dado disponível</p></div>`;
  const statusList=[
    {s:'Aberta',c:'badge-gray'},{s:'Diagnóstico / Oficina',c:'badge-red'},{s:'Cotação',c:'badge-purple'},
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
          <div class="kpi"><div class="kpi-label">Diagnóstico / Oficina</div><div class="kpi-val" style="color:var(--red)">${statusCounts['Diagnóstico / Oficina']||0}</div></div>
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
      <div class="grid-2col" style="margin-bottom:16px">
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
    diagnostico:renderDiagnosticoOficina, pecasOS:renderPecasOS,
    cotacoes:renderCotacoes, aprovacoes:renderAprovacoes,
    manutencoes:renderManutencoes, pecas:renderPecas,
    historico:renderHistorico, oficinas:renderOficinas,
    fornecedores:renderFornecedores, dashboard:renderDashboard,
    financeiro:renderFinanceiro
  };
  const fn=pages[state.page]||renderHome;
  document.getElementById('main-content').innerHTML=fn();
  if(state.page==='aprovacoes') renderAprovacoesFiltro();
  if(state.page==='historico') renderHistoricoResult();
  document.querySelectorAll('.nav-item').forEach(el=>{
    el.classList.toggle('active',el.dataset.page===state.page);
  });
}