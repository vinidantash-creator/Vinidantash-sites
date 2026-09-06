const cfg = window.ECO_CONFIG || {};
const hasConfig = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes('SEU-PROJETO') && cfg.SUPABASE_PUBLISHABLE_KEY && !cfg.SUPABASE_PUBLISHABLE_KEY.includes('SUA_CHAVE');

let supabaseClient = null;
if (hasConfig && typeof window.supabase !== 'undefined') {
  supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY);
}

const $ = id => document.getElementById(id);
function msg(el, text){ $(el).textContent = text; }

async function boot(){
  if(!supabaseClient){ msg('authMsg','Erro: Conexão com Supabase ausente.'); return; }
  try {
    const {data, error} = await supabaseClient.auth.getSession();
    if(error) throw error;
    if(data.session) showApp(data.session.user);
    
    supabaseClient.auth.onAuthStateChange((_event,session)=>{ 
      if(session) showApp(session.user); 
      else { $('app').classList.add('hidden'); $('auth').classList.remove('hidden'); }
    });
  } catch (err) {
    console.error("Erro na inicialização:", err);
    msg('authMsg', 'Bloqueio de segurança. Desative a prevenção de rastreamento do navegador.');
  }
}

async function auth(action){
  if(!supabaseClient) return;
  msg('authMsg', 'Processando comunicação com o banco...');
  try {
    const email = $('email').value.trim();
    const password = $('password').value;
    
    let r = action === 'login' 
      ? await supabaseClient.auth.signInWithPassword({email, password}) 
      : await supabaseClient.auth.signUp({email, password});
    
    if(r.error) throw r.error;
   msg('authMsg', action === 'login' ? 'Autenticado com sucesso.' : '✅ Quase lá! Acesse sua caixa de e-mail e clique no link de confirmação para liberar o sistema.');
  } catch (err) {
    console.error("Erro de autenticação:", err);
    msg('authMsg', err.message || 'Falha de comunicação. Verifique a privacidade do navegador.');
  }
}

$('login').onclick = () => auth('login'); 
$('signup').onclick = () => auth('signup');
$('logout').onclick = async () => supabaseClient?.auth.signOut();

$('consForm').onsubmit = async (e) => {
  e.preventDefault(); 
  if(!supabaseClient) return; 
  msg('consMsg', 'Salvando leitura...');
  try {
    const {data:{user}} = await supabaseClient.auth.getUser(); 
    const row = {
      user_id: user.id,
      period: `${$('month').value}-01`,
      energy_kwh: +$('energy').value,
      water_m3: +$('water').value,
      energy_cost: +($('energyCost').value||0),
      water_cost: +($('waterCost').value||0)
    }; 
    const {error} = await supabaseClient.from('consumption_readings').upsert(row, {onConflict:'user_id,period'}); 
    if(error) throw error;
    msg('consMsg', 'Leitura salva com sucesso.'); 
    loadUser(user);
  } catch(err) {
    console.error("Erro no consumo:", err);
    msg('consMsg', err.message);
  }
};

$('saveProfile').onclick = async () => {
  if(!supabaseClient) return;
  msg('profileMsg', 'Salvando perfil...');
  try {
    const {data:{user}} = await supabaseClient.auth.getUser(); 
    const row = {
      user_id: user.id,
      anon_code: $('anonCode').value.trim(),
      household_size: +$('people').value,
      energy_target_kwh: +$('energyTarget').value,
      water_target_m3: +$('waterTarget').value
    }; 
    const {error} = await supabaseClient.from('profiles').upsert(row); 
    if(error) throw error;
    msg('profileMsg', 'Perfil atualizado com sucesso.'); 
    loadUser(user);
  } catch(err) {
    console.error("Erro no perfil:", err);
    msg('profileMsg', err.message);
  }
};

$('saveConsent').onclick = async () => {
  if(!supabaseClient) return;
  msg('shareMsg', 'Salvando preferência...');
  try {
    const {data:{user}} = await supabaseClient.auth.getUser(); 
    const {error} = await supabaseClient.from('profiles').update({share_anonymized: $('shareConsent').checked}).eq('user_id',user.id); 
    if(error) throw error;
    msg('shareMsg', 'Preferência salva com sucesso.');
  } catch(err) {
    console.error("Erro no consentimento:", err);
    msg('shareMsg', err.message);
  }
};

async function loadUser(user){
  try {
    const {data:p} = await supabaseClient.from('profiles').select('*').eq('user_id',user.id).single();
    if(p) {
      $('anonCode').value = p.anon_code||'';
      $('people').value = p.household_size||1;
      $('energyTarget').value = p.energy_target_kwh??210;
      $('waterTarget').value = p.water_target_m3??12;
      $('shareConsent').checked = !!p.share_anonymized;
    }
    const {data:rows} = await supabaseClient.from('consumption_readings').select('*').eq('user_id',user.id).order('period',{ascending:true}); 
    render(rows||[], p||{});
  } catch (err) {
    console.error("Erro ao carregar os dados:", err);
  }
}

function render(rows, p){
  $('history').innerHTML = ''; 
  const last = rows[rows.length-1];
  
  $('kEnergy').textContent = last ? `${Number(last.energy_kwh).toFixed(1)} kWh` : '—'; 
  $('kWater').textContent = last ? `${Number(last.water_m3).toFixed(1)} m³` : '—'; 
  $('kEnergyP').textContent = last ? `${(last.energy_kwh/(p.household_size||1)).toFixed(1)}` : '—'; 
  $('kWaterP').textContent = last ? `${(last.water_m3/(p.household_size||1)).toFixed(1)}` : '—';
  
  rows.slice().reverse().forEach(r => {
    const okE = r.energy_kwh <= Number(p.energy_target_kwh||210);
    const okW = r.water_m3 <= Number(p.water_target_m3||12); 
    const tr = document.createElement('tr'); 
    tr.innerHTML = `<td>${r.period.slice(0,7)}</td><td>${Number(r.energy_kwh).toFixed(1)} kWh</td><td>${Number(r.water_m3).toFixed(1)} m³</td><td>${okE&&okW?'🟢 Dentro da meta':(!okE&&!okW?'🔴 Acima nas duas':'🟡 Atenção')}</td>`; 
    $('history').appendChild(tr);
  });
  
  const prev = rows[rows.length-2]; 
  let html = ''; 
  
  if(!last) {
    html = 'Registre uma leitura para receber um diagnóstico.'; 
  } else {
    const energyDev = (last.energy_kwh/(p.energy_target_kwh||210)-1)*100;
    const waterDev = (last.water_m3/(p.water_target_m3||12)-1)*100; 
    html = `<strong>${energyDev<=0&&waterDev<=0?'🟢 Consumo controlado':'🟡 Há oportunidade de melhoria'}</strong><br>Energia: ${energyDev.toFixed(1)}% vs. meta. Água: ${waterDev.toFixed(1)}% vs. meta.`; 
    
    if(prev){
      const de = (last.energy_kwh/prev.energy_kwh-1)*100;
      const dw = (last.water_m3/prev.water_m3-1)*100; 
      html += `<br>Evolução vs. mês anterior: energia ${de>=0?'+':''}${de.toFixed(1)}%; água ${dw>=0?'+':''}${dw.toFixed(1)}%.`;
    }
  } 
  $('diagnosis').innerHTML = html;
}

async function showApp(user){
  $('auth').classList.add('hidden');
  $('app').classList.remove('hidden');
  $('userLabel').textContent = user.email || 'Morador'; 
  await loadUser(user); 
  if(!$('month').value) $('month').value = new Date().toISOString().slice(0,7);
}

boot();