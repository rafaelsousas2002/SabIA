// SabIA app.js
var STATE = {
  perfil: null,
  lembretes: [],
  evolucao: [],
  tarefas: [],
  streak: 0,
  chatHistory: []
};

try { STATE.perfil = JSON.parse(localStorage.getItem('sabia_perfil') || 'null'); } catch(e){}
try { STATE.lembretes = JSON.parse(localStorage.getItem('sabia_lembretes') || '[]'); } catch(e){}
try { STATE.evolucao = JSON.parse(localStorage.getItem('sabia_evolucao') || '[]'); } catch(e){}
try { STATE.tarefas = JSON.parse(localStorage.getItem('sabia_tarefas') || '[]'); } catch(e){}
STATE.streak = parseInt(localStorage.getItem('sabia_streak') || '0');

function salvarState() {
  try {
    localStorage.setItem('sabia_perfil', JSON.stringify(STATE.perfil));
    localStorage.setItem('sabia_lembretes', JSON.stringify(STATE.lembretes));
    localStorage.setItem('sabia_evolucao', JSON.stringify(STATE.evolucao));
    localStorage.setItem('sabia_tarefas', JSON.stringify(STATE.tarefas));
    localStorage.setItem('sabia_streak', STATE.streak);
  } catch(e) { console.error('Erro ao salvar:', e); }
}

// NAVEGACAO
function showTab(name) {
  document.querySelectorAll('.tab-section').forEach(function(s) { s.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  var section = document.getElementById('tab-' + name);
  if (section) section.classList.add('active');
  var navItem = document.querySelector('[data-tab="' + name + '"]');
  if (navItem) navItem.classList.add('active');
  var titles = { dashboard:'Dashboard', cronograma:'Cronograma', conteudos:'Conteudos', evolucao:'Evolucao', lembretes:'Lembretes', feedback:'Feedback IA' };
  var pt = document.getElementById('page-title');
  if (pt) pt.textContent = titles[name] || name;
}

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.nav-item').forEach(function(item) {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      showTab(item.dataset.tab);
      if (window.innerWidth <= 768) {
        var sb = document.getElementById('sidebar');
        if (sb) sb.classList.remove('open');
      }
    });
  });
  atualizarDashboard();
  if (!STATE.perfil) { setTimeout(openOnboarding, 600); }
  setInterval(verificarLembretes, 60000);
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission();
  }
});

function toggleSidebar() {
  var sb = document.getElementById('sidebar');
  if (sb) sb.classList.toggle('open');
}

// ONBOARDING
function openOnboarding() {
  var m = document.getElementById('onboarding-modal');
  if (m) m.style.display = 'flex';
}
function closeOnboarding() {
  var m = document.getElementById('onboarding-modal');
  if (m) m.style.display = 'none';
}
function salvarPerfil() {
  var nome = (document.getElementById('modal-nome').value || '').trim();
  var objetivo = (document.getElementById('modal-objetivo').value || '').trim();
  var materias = (document.getElementById('modal-materias').value || '').trim();
  var horas = document.getElementById('modal-horas').value || '3';
  if (!nome || !objetivo || !materias) { alert('Preencha todos os campos!'); return; }
  STATE.perfil = { nome: nome, objetivo: objetivo, materias: materias, horas: horas };
  salvarState();
  closeOnboarding();
  atualizarUI();
  showTab('cronograma');
  var inp = document.getElementById('inp-nome'); if (inp) inp.value = nome;
  var ino = document.getElementById('inp-objetivo'); if (ino) ino.value = objetivo;
  var inm = document.getElementById('inp-materias'); if (inm) inm.value = materias;
  var inh = document.getElementById('inp-horas'); if (inh) inh.value = horas;
}

// CHAMADA IA
async function chamarIA(prompt, systemPrompt) {
  var resp = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: prompt, systemPrompt: systemPrompt })
  });
  var data = await resp.json();
  if (!resp.ok) { throw new Error(data.error || 'Erro na API: ' + resp.status); }
  if (!data.result) { throw new Error('Resposta vazia da IA'); }
  return data.result;
}

function showLoading(msg) {
  var lm = document.getElementById('loading-msg');
  if (lm) lm.textContent = msg || 'A IA esta pensando...';
  var lo = document.getElementById('loading-overlay');
  if (lo) lo.style.display = 'flex';
}
function hideLoading() {
  var lo = document.getElementById('loading-overlay');
  if (lo) lo.style.display = 'none';
}
function mostrarErro(elementId, msg) {
  var el = document.getElementById(elementId);
  if (el) {
    el.style.display = 'block';
    el.innerHTML = '<div style="color:#ef4444;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);padding:12px 14px;border-radius:8px;font-size:14px;line-height:1.6">⚠️ ' + msg + '</div>';
  }
}

// CRONOGRAMA
async function gerarCronograma() {
  var nome = (document.getElementById('inp-nome').value || '').trim();
  var materias = (document.getElementById('inp-materias').value || '').trim();
  var horas = document.getElementById('inp-horas').value || '3';
  var objetivo = (document.getElementById('inp-objetivo').value || '').trim();
  var data = document.getElementById('inp-data').value || 'nao definido';
  var nivel = document.getElementById('inp-nivel').value || 'intermediario';
  if (!nome || !materias || !objetivo) { alert('Preencha nome, materias e objetivo!'); return; }
  var btn = document.getElementById('btn-gerar');
  if (btn) btn.disabled = true;
  showLoading('Gerando seu cronograma personalizado...');
  var prompt = 'Crie um cronograma de estudos semanal para:' +
    ' Nome: ' + nome +
    ', Materias: ' + materias +
    ', Horas por dia: ' + horas +
    ', Objetivo: ' + objetivo +
    ', Prazo: ' + data +
    ', Nivel: ' + nivel +
    '. Formate com dias da semana, horarios e dicas. Use emojis.';
  var sys = 'Voce e o SabIA, assistente educacional. Crie cronogramas praticos e motivadores. Use markdown simples com ### para titulos e **negrito**. Responda em portugues do Brasil.';
  try {
    var result = await chamarIA(prompt, sys);
    var card = document.getElementById('cronograma-result');
    var output = document.getElementById('cronograma-output');
    if (card) card.style.display = 'block';
    if (output) output.innerHTML = formatarTextoIA(result);
    STATE.tarefas = extrairTarefas(materias);
    salvarState();
    atualizarDashboard();
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch(e) {
    mostrarErro('cronograma-result', 'Erro: ' + e.message);
    var cr = document.getElementById('cronograma-result');
    if (cr) cr.style.display = 'block';
  }
  if (btn) btn.disabled = false;
  hideLoading();
}

// CONTEUDOS
async function sugerirConteudo() {
  var topico = (document.getElementById('inp-conteudo').value || '').trim();
  if (!topico) { alert('Digite uma materia ou topico!'); return; }
  showLoading('Buscando conteudos personalizados...');
  var perfInfo = STATE.perfil ? 'Aluno: ' + STATE.perfil.nome + ', Objetivo: ' + STATE.perfil.objetivo + '.' : '';
  var prompt = 'Sugira 5 recursos de estudo sobre: ' + topico + '. ' + perfInfo + ' Inclua videos YouTube, sites gratuitos, exercicios e dicas praticas com nomes reais.';
  var sys = 'Voce e o SabIA, especialista educacional. Sugira recursos gratuitos e de qualidade. Formate em topicos numerados. Responda em portugues do Brasil.';
  try {
    var result = await chamarIA(prompt, sys);
    var card = document.getElementById('conteudo-result');
    if (card) { card.style.display = 'block'; }
    var out = document.getElementById('conteudo-output');
    if (out) out.innerHTML = formatarTextoIA(result);
    if (card) card.scrollIntoView({ behavior: 'smooth' });
  } catch(e) {
    mostrarErro('conteudo-result', 'Erro: ' + e.message);
    var cr2 = document.getElementById('conteudo-result');
    if (cr2) cr2.style.display = 'block';
  }
  hideLoading();
}

// EVOLUCAO
async function analisarEvolucao() {
  var texto = (document.getElementById('inp-evolucao').value || '').trim();
  if (!texto) { alert('Descreva como foi seu estudo!'); return; }
  showLoading('Analisando sua evolucao...');
  var prompt = 'Analise este relato de estudo e forneça: 1) Resumo do que foi estudado 2) Pontos positivos 3) Areas de melhoria 4) Sugestoes para proxima sessao 5) Mensagem motivacional. Relato: ' + texto;
  var sys = 'Voce e o SabIA, tutor empatico. Analise com positividade e seja construtivo. Use emojis. Responda em portugues do Brasil.';
  try {
    var result = await chamarIA(prompt, sys);
    STATE.evolucao.push({ data: new Date().toLocaleDateString('pt-BR'), texto: texto, analise: result });
    salvarState();
    var card = document.getElementById('evolucao-result');
    if (card) card.style.display = 'block';
    var out = document.getElementById('evolucao-output');
    if (out) out.innerHTML = formatarTextoIA(result);
    atualizarGrafico();
    atualizarDashboard();
    if (card) card.scrollIntoView({ behavior: 'smooth' });
  } catch(e) {
    mostrarErro('evolucao-result', 'Erro: ' + e.message);
    var er = document.getElementById('evolucao-result');
    if (er) er.style.display = 'block';
  }
  hideLoading();
}

// LEMBRETES
function adicionarLembrete() {
  var titulo = (document.getElementById('inp-lembrete-titulo').value || '').trim();
  var dataHora = document.getElementById('inp-lembrete-data').value;
  var desc = (document.getElementById('inp-lembrete-desc').value || '').trim();
  if (!titulo || !dataHora) { alert('Preencha titulo e data/hora!'); return; }
  STATE.lembretes.push({ id: Date.now(), titulo: titulo, dataHora: dataHora, desc: desc });
  salvarState();
  document.getElementById('inp-lembrete-titulo').value = '';
  document.getElementById('inp-lembrete-data').value = '';
  document.getElementById('inp-lembrete-desc').value = '';
  renderLembretes();
  atualizarDashboard();
}
function removerLembrete(id) {
  STATE.lembretes = STATE.lembretes.filter(function(l) { return l.id !== id; });
  salvarState();
  renderLembretes();
  atualizarDashboard();
}
function renderLembretes() {
  var lista = document.getElementById('lembretes-lista');
  var preview = document.getElementById('reminder-preview');
  var count = document.getElementById('lembretes-count');
  var dot = document.getElementById('notif-dot');
  if (!STATE.lembretes.length) {
    if (lista) lista.innerHTML = '<li class="task-empty">Nenhum lembrete ainda.</li>';
    if (preview) preview.innerHTML = '';
    if (count) { count.textContent = '0'; count.classList.remove('visible'); }
    if (dot) dot.style.display = 'none';
    return;
  }
  var sorted = STATE.lembretes.slice().sort(function(a,b){ return new Date(a.dataHora) - new Date(b.dataHora); });
  if (lista) {
    lista.innerHTML = sorted.map(function(l) {
      return '<li class="reminder-full-item">' +
        '<span class="r-time">' + formatarDataHora(l.dataHora) + '</span>' +
        '<div><div class="r-title">' + l.titulo + '</div>' +
        (l.desc ? '<div style="color:#7a8ba8;font-size:12px">' + l.desc + '</div>' : '') +
        '</div>' +
        '<button class="r-del" onclick="removerLembrete(' + l.id + ')">&#10005;</button>' +
        '</li>';
    }).join('');
  }
  if (preview) {
    preview.innerHTML = sorted.slice(0,3).map(function(l) {
      return '<li class="reminder-item">&#128276; ' + l.titulo + ' &mdash; ' + formatarDataHora(l.dataHora) + '</li>';
    }).join('');
  }
  if (count) { count.textContent = STATE.lembretes.length; count.classList.add('visible'); }
  if (dot) dot.style.display = 'block';
}
function formatarDataHora(dt) {
  if (!dt) return '';
  try {
    var d = new Date(dt);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
  } catch(e) { return dt; }
}
function verificarLembretes() {
  var agora = new Date();
  STATE.lembretes.forEach(function(l) {
    var dt = new Date(l.dataHora);
    var diffMin = (dt - agora) / 60000;
    if (diffMin > 0 && diffMin < 2 && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('SabIA 🔔 ' + l.titulo, { body: l.desc || 'Hora de estudar!' });
    }
  });
}

// FEEDBACK
async function obterFeedback() {
  var texto = (document.getElementById('inp-feedback').value || '').trim();
  if (!texto) { alert('Escreva sua pergunta ou resposta!'); return; }
  showLoading('Analisando e gerando feedback...');
  var nomeAluno = STATE.perfil ? STATE.perfil.nome : 'Aluno';
  var sys = 'Voce e o SabIA, tutor especializado. Aluno: ' + nomeAluno + '. Forneca feedback educativo, claro e motivador. Corrija erros com explicacao detalhada. Responda em portugues do Brasil.';
  try {
    var result = await chamarIA(texto, sys);
    STATE.chatHistory.push({ role: 'user', content: texto }, { role: 'ia', content: result });
    var card = document.getElementById('feedback-result');
    if (card) card.style.display = 'block';
    var out = document.getElementById('feedback-output');
    if (out) out.innerHTML = formatarTextoIA(result);
    renderChat();
    var inp = document.getElementById('inp-feedback');
    if (inp) inp.value = '';
  } catch(e) {
    mostrarErro('feedback-result', 'Erro: ' + e.message);
    var fr = document.getElementById('feedback-result');
    if (fr) fr.style.display = 'block';
  }
  hideLoading();
}
function renderChat() {
  var hist = document.getElementById('chat-history');
  if (!hist) return;
  hist.innerHTML = STATE.chatHistory.map(function(m) {
    return '<div class="chat-bubble ' + (m.role === 'user' ? 'user' : 'ia') + '">' +
      (m.role === 'ia' ? '<strong>SabIA</strong><br>' : '<strong>Voce</strong><br>') +
      formatarTextoIA(m.content) + '</div>';
  }).join('');
  hist.scrollTop = hist.scrollHeight;
}

// UTILIDADES
function formatarTextoIA(texto) {
  if (!texto) return '';
  return texto
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^### (.*)$/gm, '<h3 style="color:rgb(0,200,230);margin:1rem 0 0.4rem;font-size:15px">$1</h3>')
    .replace(/^## (.*)$/gm, '<h3 style="color:rgb(0,200,230);margin:1rem 0 0.4rem;font-size:15px">$1</h3>')
    .replace(/^# (.*)$/gm, '<h3 style="color:rgb(0,200,230);margin:1rem 0 0.4rem;font-size:16px">$1</h3>')
    .replace(/^- (.*)$/gm, '<li style="margin-left:1rem;margin-bottom:4px">$1</li>')
    .replace(/\n/g, '<br>');
}
function extrairTarefas(materias) {
  var lista = (materias || '').split(',').map(function(m){ return m.trim(); }).filter(Boolean);
  var dias = ['Seg','Ter','Qua','Qui','Sex','Sab','Dom'];
  return lista.map(function(m, i) { return { id: i, texto: 'Estudar ' + m, done: false, dia: dias[i % 7] }; });
}
function toggleTarefa(id) {
  var t = STATE.tarefas.find(function(t){ return t.id === id; });
  if (t) { t.done = !t.done; salvarState(); atualizarDashboard(); }
}
function atualizarGrafico() {
  var bars = document.getElementById('chart-bars');
  var labels = document.getElementById('chart-labels');
  if (!bars || !labels) return;
  var ultimos = STATE.evolucao.slice(-7);
  if (!ultimos.length) {
    bars.innerHTML = '<div style="color:#7a8ba8;font-size:13px;padding:0.5rem">Nenhum registro ainda. Registre seus estudos acima!</div>';
    labels.innerHTML = '';
    return;
  }
  bars.innerHTML = ultimos.map(function(e, i) {
    var h = 25 + Math.round((i / (ultimos.length - 1 || 1)) * 55);
    return '<div class="chart-bar" style="height:' + h + 'px" title="' + e.data + '"></div>';
  }).join('');
  labels.innerHTML = ultimos.map(function(e) {
    return '<div class="chart-label">' + e.data.slice(0,5) + '</div>';
  }).join('');
}
function atualizarUI() {
  var p = STATE.perfil;
  if (!p) return;
  var nameEl = document.getElementById('user-name-sidebar');
  var avatarEl = document.getElementById('user-avatar');
  if (nameEl) nameEl.textContent = p.nome || 'Aluno';
  if (avatarEl) avatarEl.textContent = (p.nome || 'A')[0].toUpperCase();
  var banner = document.getElementById('welcome-banner');
  if (banner) banner.style.display = 'none';
}
function atualizarDashboard() {
  atualizarUI();
  var done = STATE.tarefas.filter(function(t){ return t.done; }).length;
  var total = STATE.tarefas.length;
  var pct = total ? Math.round((done / total) * 100) : 0;
  function setEl(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
  setEl('stat-tarefas', done);
  setEl('stat-tarefas-delta', 'de ' + total + ' planejadas');
  setEl('stat-progresso', pct + '%');
  setEl('stat-horas', (STATE.evolucao.length * 2) + 'h');
  setEl('stat-streak', '🔥 ' + (STATE.streak + STATE.evolucao.length));
  var barFill = document.getElementById('mini-bar-fill');
  if (barFill) barFill.style.width = pct + '%';
  var hoje = document.getElementById('today-tasks');
  if (hoje && STATE.tarefas.length) {
    hoje.innerHTML = STATE.tarefas.slice(0,5).map(function(t) {
      return '<li class="task-item ' + (t.done ? 'done' : '') + '" onclick="toggleTarefa(' + t.id + ')">' +
        '<div class="task-check">' + (t.done ? '&#10003;' : '') + '</div>' +
        '<span>' + t.texto + '</span>' +
        '<span style="margin-left:auto;font-size:11px;color:#7a8ba8">' + t.dia + '</span>' +
        '</li>';
    }).join('');
  }
  renderLembretes();
  atualizarGrafico();
}
