// SMC – System of Improvement and Correction
// Login base com Supabase Auth.

const SMC_SUPABASE_URL = "https://quqqcudiyhajbmtrebvr.supabase.co";
const SMC_SUPABASE_KEY = "sb_publishable_X3m3BdRtfzaH4c12ehjkMw_VsqiZGJG";
const SMC_API = "https://quqqcudiyhajbmtrebvr.functions.supabase.co/solicitacoes-api";

let smcAuthClient = null;
let smcSession = null;
let smcUser = null;

function smcLoadSupabaseClient(){
  return new Promise((resolve, reject) => {
    if (window.supabase) return resolve(window.supabase);
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    s.onload = () => resolve(window.supabase);
    s.onerror = () => reject(new Error("Falha ao carregar Supabase Auth."));
    document.head.appendChild(s);
  });
}

async function smcInitAuth(){
  const lib = await smcLoadSupabaseClient();
  smcAuthClient = lib.createClient(SMC_SUPABASE_URL, SMC_SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
  const { data } = await smcAuthClient.auth.getSession();
  smcSession = data.session || null;
  smcUser = smcSession?.user || null;
  smcRenderLoginBox();
  smcAuthClient.auth.onAuthStateChange((_event, session) => {
    smcSession = session || null;
    smcUser = smcSession?.user || null;
    smcRenderLoginBox();
    if (typeof loadSolicitacoes === "function") loadSolicitacoes();
  });
}

function smcRenderLoginBox(){
  let box = document.getElementById("smcAuthBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "smcAuthBox";
    box.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:9999;background:#102540;border:1px solid #24425f;border-radius:14px;padding:12px;box-shadow:0 12px 30px rgba(0,0,0,.35);color:#f4f8ff;font-family:Arial;min-width:260px";
    document.body.appendChild(box);
  }
  if (smcUser) {
    box.innerHTML = `<strong>SMC conectado</strong><br><small>${smcUser.email}</small><br><button onclick="smcLogout()" style="margin-top:10px">Sair</button>`;
  } else {
    box.innerHTML = `<strong>Login ADM SMC</strong><br><small>Entrar libera funções administrativas.</small><br><input id="smcLoginEmail" placeholder="e-mail" style="margin-top:8px;width:100%"><input id="smcLoginSenha" type="password" placeholder="senha" style="margin-top:6px;width:100%"><div style="display:flex;gap:6px;margin-top:8px"><button onclick="smcLogin()">Entrar</button><button onclick="smcCriarConta()">Criar conta</button></div><small id="smcLoginMsg"></small>`;
  }
}

async function smcLogin(){
  const email = document.getElementById("smcLoginEmail").value.trim();
  const password = document.getElementById("smcLoginSenha").value;
  const msg = document.getElementById("smcLoginMsg");
  msg.textContent = "Entrando...";
  const { error } = await smcAuthClient.auth.signInWithPassword({ email, password });
  msg.textContent = error ? error.message : "Login realizado.";
}

async function smcCriarConta(){
  const email = document.getElementById("smcLoginEmail").value.trim();
  const password = document.getElementById("smcLoginSenha").value;
  const msg = document.getElementById("smcLoginMsg");
  msg.textContent = "Criando conta...";
  const { error } = await smcAuthClient.auth.signUp({ email, password });
  msg.textContent = error ? error.message : "Conta criada. Se pedir confirmação, verifique o e-mail.";
}

async function smcLogout(){
  await smcAuthClient.auth.signOut();
}

function smcAuthHeader(){
  return smcSession?.access_token ? { Authorization: `Bearer ${smcSession.access_token}` } : {};
}

smcInitAuth().catch(console.error);
