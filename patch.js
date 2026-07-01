const fs = require('fs');
const file = 'c:/Users/nicol/OneDrive/Documentos/frota-stay/app.js';
let c = fs.readFileSync(file, 'utf8');

// 1. Remove dashboard from quick nav grid
c = c.replace(/,\s*\{p:'dashboard',i:'[^']*',l:'Dashboard'\},/, '');

// 2. Remove dashboard from pages object in render()
c = c.replace(', dashboard:renderDashboard', '');

// 3. Add Top5 and Resumo por Status blocks to renderHome before its closing backtick
// The home nav card ends with: </div>\n      </div>\n    </div>`;
// We find the unique marker: home-nav-grid closing + renderHome closing
const marker = ")}\r\n        </div>\r\n      </div>\r\n    </div>`;";

const replacement = "`.join('')}\n        </div>\n      </div>\n      <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px\">\n        <div class=\"card\">\n          <div class=\"card-title\" style=\"margin-bottom:12px\">\u25b8 Resumo por Status</div>\n          <table style=\"width:100%\"><thead><tr><th>Status</th><th>Qtde</th><th>%</th></tr></thead><tbody>${(()=>{const os=state.os;const sc={};os.forEach(o=>{sc[o.status]=(sc[o.status]||0)+1});const total=os.length;return [{s:'Aberta',c:'badge-gray'},{s:'Diagn\u00f3stico/Oficina',c:'badge-red'},{s:'Cota\u00e7\u00e3o',c:'badge-purple'},{s:'Aguardando Aprova\u00e7\u00e3o',c:'badge-amber'},{s:'Aprovada',c:'badge-blue'},{s:'Execu\u00e7\u00e3o',c:'badge-blue'},{s:'Conclu\u00edda',c:'badge-green'},{s:'Cancelada',c:'badge-gray'}].map(({s,c})=>{const q=sc[s]||0;const p=total?Math.round((q/total)*100):0;return `<tr><td><span class=\"badge ${c}\">${s}</span></td><td><strong>${q}</strong></td><td>${p}%</td></tr>`;}).join('');})()}</tbody></table>\n        </div>\n        <div class=\"card\">\n          <div class=\"card-title\" style=\"margin-bottom:16px\">\ud83c\udfc6 Top 5 \u2014 Ve\u00edculos que mais gastaram</div>\n          ${(()=>{const os=state.os;const manuts=state.manutencoes;const gastoByPlaca={};os.forEach(o=>{const m=manuts.filter(x=>x.os===o.num);const g=m.reduce((a,x)=>a+(+x.vlrPecas||0)+(+x.vlrMO||0),0);gastoByPlaca[o.placa]=(gastoByPlaca[o.placa]||0)+g;});const top5=Object.entries(gastoByPlaca).sort((a,b)=>b[1]-a[1]).slice(0,5);const maxGasto=top5[0]?top5[0][1]:1;const rankClasses=['r1','r2','r3','',''];return top5.length?top5.map(([placa,gasto],i)=>{const v=getVeiculo(placa);const pct=Math.round((gasto/maxGasto)*100);return `<div class=\"top5-item\"><div class=\"top5-rank ${rankClasses[i]}\">${i+1}</div><div style=\"flex:1\"><div style=\"display:flex;justify-content:space-between;align-items:center\"><div><strong>${placa}</strong> <span style=\"font-size:12px;color:var(--gray)\">${v.modelo||''}</span></div><strong style=\"color:var(--green)\">${fmt(gasto)}</strong></div><div class=\"progress-bar\"><div class=\"progress-fill\" style=\"width:${pct}%\"></div></div></div></div>`;}).join(''):`<div class=\"empty-state\"><div class=\"empty-icon\">\ud83c\udfce</div><p>Nenhum dado dispon\u00edvel</p></div>`;})()}\n        </div>\n      </div>\n    </div>`;";

if (c.includes(marker)) {
  c = c.replace(marker, replacement);
  console.log('blocks inserted OK');
} else {
  // try to find what's actually there
  const idx = c.indexOf("home-nav-grid");
  console.log('marker NOT found. Context around home-nav-grid:');
  console.log(JSON.stringify(c.substring(idx, idx+300)));
}

fs.writeFileSync(file, c, 'utf8');
console.log('saved, len:', c.length);
