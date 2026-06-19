// SMC panel upgrade - fluxo sem responsavel obrigatorio e status novo
(function(){
  const API = "https://quqqcudiyhajbmtrebvr.functions.supabase.co/solicitacoes-api";
  const STATUS = ["Aberta", "Em andamento", "Finalizado"];
  const OPEN = new Set(["Aberta", "Recebido", "Em análise", "Aguardando informação", "Encaminhado"]);
  const RUNNING = new Set(["Em andamento", "Em execução"]);
  const DONE = new Set(["Finalizado", "Concluído", "Reprovado", "Cancelado"]);
  const state = { users: [], requests: [], period: "mensal" };

  function esc(v){return String(v ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));}
  function auth(){return typeof smcAuthHeader === "function" ? smcAuthHeader() : {};}
  function code(email){return String(email || "").toLowerCase().split("@")[0] || "";}
  function created(r){return r.criado_em || r.created_at || r.dataHoraIso || new Date().toISOString();}
  function minutes(r){
    let total = Number(r.total_tracked_minutes || r.task_total_tracked_minutes || 0);
    const start = r.active_timer_started_at || r.task_timer_started_at;
    if ((r.time_running || r.task_status === "Em andamento") && start) total += Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 60000));
    return total;
  }
  function fmt(min){min=Math.max(0,Math.floor(Number(min||0)));const h=Math.floor(min/60),m=min%60;return h?`${h}h ${String(m).padStart(2,"0")}min`:`${m}min`;}
  async function api(action="",method="GET",body){
    const url = action ? `${API}?action=${encodeURIComponent(action)}` : API;
    const r = await fetch(url,{method,headers:{"Content-Type":"application/json",...auth()},body:body?JSON.stringify(body):undefined});
    const j = await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(j.error || `Falha HTTP ${r.status}`);
    return j;
  }
  function norm(r){return {...r,tipo:r.tipo_solicitacao||r.tipo||"",responsible_user_code:r.responsible_user_code||code(r.responsible_email)||"Sem responsável",total_tracked_minutes:Number(r.total_tracked_minutes||r.task_total_tracked_minutes||0)};}

  async function loadContext(){
    try{const j=await api("engineering-users");state.users=(j.users||[]).map(u=>({...u,user_code:u.user_code||code(u.email)}));fillResponsible();}catch(e){console.warn(e.message);}
  }
  async function refresh(){
    try{const j=await api("");state.requests=(j.data||[]).map(norm);enhanceTable();renderDashboard();renderNotifications();}catch(e){console.warn(e.message);}
  }

  function addResponsibleField(){
    const pr=document.getElementById("prioridade");
    if(!pr || document.getElementById("responsavelInicial")) return;
    const w=document.createElement("div");
    w.className="field smc-responsible-field";
    w.innerHTML='<label>Responsável inicial <span class="mini">(opcional)</span></label><select id="responsavelInicial"><option value="">Sem responsável definido</option></select><span class="mini">A tarefa pode ser aberta sem responsável e atribuída depois.</span>';
    pr.closest(".field")?.after(w);
    fillResponsible();
  }
  function fillResponsible(){
    const s=document.getElementById("responsavelInicial"); if(!s) return;
    const cur=s.value;
    s.innerHTML='<option value="">Sem responsável definido</option>'+state.users.map(u=>`<option value="${esc(u.id)}" data-email="${esc(u.email)}" data-code="${esc(u.user_code||code(u.email))}">${esc(u.user_code||code(u.email))}${u.nome?" - "+esc(u.nome):""}</option>`).join("");
    s.value=cur||"";
  }
  function selectedResp(){const s=document.getElementById("responsavelInicial"),o=s?.selectedOptions?.[0],email=o?.dataset.email||"";return {responsible_id:s?.value||null,responsible_email:email||null,responsible_user_code:o?.dataset.code||code(email)||null};}

  function patchSave(){
    const old=window.salvarSolicitacaoSupabase;
    if(typeof old!=="function" || old.__smcNoRequiredResp) return;
    window.salvarSolicitacaoSupabase=async function(reg){return old({...reg,...selectedResp(),status:"Aberta"});};
    window.salvarSolicitacaoSupabase.__smcNoRequiredResp=true;
  }
  function patchLoadRender(){
    if(typeof window.loadSolicitacoes==="function" && !window.loadSolicitacoes.__smcNewFlow){
      const old=window.loadSolicitacoes;
      window.loadSolicitacoes=async function(){const r=await old.apply(this,arguments);await refresh();return r;};
      window.loadSolicitacoes.__smcNewFlow=true;
    }
    if(typeof window.renderTable==="function" && !window.renderTable.__smcNewFlow){
      const old=window.renderTable;
      window.renderTable=function(){const r=old.apply(this,arguments);enhanceTable();return r;};
      window.renderTable.__smcNewFlow=true;
    }
  }
  function enhanceTable(){
    const rows=[...document.querySelectorAll("#tableArea tbody tr")];
    rows.forEach((tr,i)=>{
      const r=state.requests[i]; if(!r) return;
      const status=tr.querySelector("select.status-select");
      if(status){status.innerHTML=STATUS.map(s=>`<option ${s===r.status?"selected":""}>${s}</option>`).join("");}
      const cell=tr.children[2];
      if(cell) cell.innerHTML=`<strong>${esc(r.responsible_user_code||"Sem responsável")}</strong><span class="mini">${r.due_date?new Date(r.due_date).toLocaleDateString("pt-BR"):"Sem prazo"}</span><span class="mini">Tempo: ${fmt(minutes(r))}${r.time_running?" • rodando":""}</span><span class="sync-pill ${esc(r.sync_status||"synced")}">${esc(r.sync_status||"synced")}</span>`;
    });
  }

  function buildTabs(){
    const card=document.querySelector("#painel > .card"); if(!card || card.dataset.smcTabs==="1") return; card.dataset.smcTabs="1";
    const stats=card.querySelector(".stats"),toolbar=card.querySelector(".toolbar"),actions=card.querySelector(".panel-actions"),table=card.querySelector("#tableArea"),footer=card.querySelector(".footer-note");
    const tabs=document.createElement("div");tabs.className="smc-panel-tabs";tabs.innerHTML='<button class="smc-panel-tab active" data-tab="sol">Solicitações</button><button class="smc-panel-tab" data-tab="dash">Dashboard</button><button class="smc-panel-tab" data-tab="backup">Backup / Sincronização</button>';card.querySelector(".card-header")?.after(tabs);
    const sol=document.createElement("div");sol.className="smc-panel-view active";sol.dataset.view="sol";[stats,toolbar,actions,table,footer].forEach(x=>x&&sol.appendChild(x));tabs.after(sol);
    const dash=document.createElement("div");dash.className="smc-panel-view";dash.dataset.view="dash";dash.innerHTML='<div id="smcDashboardView" class="smc-dashboard-view"></div>';sol.after(dash);
    tabs.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{tabs.querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll("#painel [data-view]").forEach(v=>v.classList.toggle("active",v.dataset.view===b.dataset.tab));renderDashboard();});
  }
  function current(){const now=new Date();return state.requests.filter(r=>{const d=new Date(created(r));if(state.period==="diario")return d.toDateString()===now.toDateString();if(state.period==="anual")return d.getFullYear()===now.getFullYear();return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();});}
  function renderDashboard(){
    const root=document.getElementById("smcDashboardView"); if(!root) return; const list=current();
    const open=list.filter(r=>OPEN.has(r.status)).length,run=list.filter(r=>RUNNING.has(r.status)).length,done=list.filter(r=>DONE.has(r.status)).length,total=list.length,time=list.reduce((s,r)=>s+minutes(r),0);
    const by=new Map(); list.forEach(r=>{const k=r.responsible_user_code||"Sem responsável";if(!by.has(k))by.set(k,[]);by.get(k).push(r);});
    root.innerHTML=`<div class="smc-dashboard-head"><div><h3>Dashboard</h3><span>Status novo: Aberta, Em andamento e Finalizado.</span></div><select id="smcDashPeriod"><option value="diario">Diário</option><option value="mensal">Mensal</option><option value="anual">Anual</option></select></div><div class="smc-dash-cards"><div><strong>${total}</strong><span>Total</span></div><div><strong>${open}</strong><span>Abertas</span></div><div><strong>${run}</strong><span>Em andamento</span></div><div><strong>${done}</strong><span>Finalizadas</span></div><div><strong>${fmt(time)}</strong><span>Tempo total</span></div></div><section class="smc-dash-chart"><h3>Carga por colaborador</h3>${[...by.entries()].map(([u,rs])=>{const a=rs.filter(x=>OPEN.has(x.status)).length,e=rs.filter(x=>RUNNING.has(x.status)).length,f=rs.filter(x=>DONE.has(x.status)).length;return `<div class="smc-work-row"><strong>${esc(u)}</strong><span>${a} abertas - ${e} em andamento - ${f} finalizadas</span>${a>=10?'<span class="smc-work-alert red">Alerta: 10+ abertas</span>':''}${e>=10?'<span class="smc-work-alert yellow">Atenção: 10+ em andamento</span>':''}</div>`}).join("")||'<div class="empty">Sem dados.</div>'}</section>`;
    const p=document.getElementById("smcDashPeriod");if(p){p.value=state.period;p.onchange=e=>{state.period=e.target.value;renderDashboard();};}
  }
  function renderNotifications(){
    let box=document.getElementById("smcFloatingNotifications"); if(!box){box=document.createElement("div");box.id="smcFloatingNotifications";box.className="planner-notifications";document.body.appendChild(box);} const hidden=new Set(JSON.parse(localStorage.getItem("SMC_HIDDEN_NOTIFICATIONS")||"[]"));
    const list=state.requests.filter(r=>!DONE.has(r.status)&&!hidden.has(String(r.id))).slice(0,7);
    box.innerHTML=list.map(r=>`<article class="planner-notification media"><strong>Nova demanda: ${esc(r.titulo||"-")}</strong><span>Para: ${esc(r.responsible_user_code||"Sem responsável")}</span><span>Status: ${esc(r.status)}</span><button data-hide="${esc(r.id)}">Visualizada</button></article>`).join("");
    box.querySelectorAll("[data-hide]").forEach(b=>b.onclick=()=>{hidden.add(String(b.dataset.hide));localStorage.setItem("SMC_HIDDEN_NOTIFICATIONS",JSON.stringify([...hidden]));renderNotifications();});
  }
  function init(){addResponsibleField();patchSave();patchLoadRender();buildTabs();loadContext().then(refresh);setTimeout(()=>{addResponsibleField();patchSave();patchLoadRender();buildTabs();window.loadSolicitacoes?.();},800);setInterval(()=>{enhanceTable();renderDashboard();renderNotifications();},30000);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();