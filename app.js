// SabIA — app.js (versao corrigida)
const STATE = {
  perfil: JSON.parse(localStorage.getItem('sabia_perfil') || 'null'),
  lembretes: JSON.parse(localStorage.getItem('sabia_lembretes') || '[]'),
  evolucao: JSON.parse(localStorage.getItem('sabia_evolucao') || '[]'),
  tarefas: JSON.parse(localStorage.getItem('sabia_tarefas') || '[]'),
  streak: parseInt(localStorage.getItem('sabia_streak') || '0'),
  chatHistory: []
};

function salvarState() {
  localStorage.setItem('sabia_perfil', JSON.stringify(STATE.perfil));
  localStorage.setItem('sabia_lembretes', JSON.stringify(STATE.lembretes));
  localStorage.setItem('sabia_evolucao', JSON.stringify(STATE.evolucao));
  localStorage.setItem('sabia_tarefas', JSON.stringify(STATE.tarefas));
  localStorage.setItem('sabia_streak', STATE.streak);
}

// ===== NAVEGACAO =====
function showTab(name) {
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const section = document.getElementById('tab-' + name);
  if (section) section.classList.add('active');
  const navItem = document.querySelector('[data-tab="' + name + '"]');
  if (navItem) navItem.classList.add('active');
  const titles = {
    dashboard: 'Dashboard', cronograma: 'Cronograma',
    conteudos: 'Conteudos', evolucao: 'Evolucao',
    lembretes: 'Lembretes', feedback: 'Feedback IA'
  };
  document.getElementById('page-title').textContent = titles[name] || name;
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    showTab(item.dataset.tab);
    if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
  });
});

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ===== ONBOARDING =====
function openOnboarding() {
  document.getElementById('onboarding-modal').style.display = 'flex';
}
function closeOnboarding() {
  document.getElementById('onboarding-modal').style.display = 'none';
}
function salvarPerfil() {
  const nome = document.getElementById('modal-nome').value.trim();
  const objetivo = document.getElementById('modal-objetivo').value.trim();
  const materias = document.getElementById('modal-materias').value.trim();
  const horas = document.getElementById('modal-horas').value;
  if (!nome || !objetivo || !materias) {
    alert('Por favor, preencha todos os campos obrigatorios!');
    return;
  }
  STATE.perfil = { nome, objetivo, materias, horas: horas || '3' };
  salvarState();
  closeOnboarding();
  atualizarUI();
  showTab('cronograma');
  // Pre-preenche o formulario de cronograma
  document.getElementById('inp-nome').value = nome;
  document.getElementById('inp-objetivo').value = objetivo;
  document.getElementById('inp-materias').value = materias;
  document.getElementById('inp-horas').value = horas || '3';
}

// ===== CHAMADA A IA =====
async function chamarIA(prompt, systemPrompt) {
  const resp = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, systemPrompt })
  });

  const data = await resp.json();

  if (!resp.ok) {
    throw new Error(data.error || 'Erro desconhecido na API');
  }

  return data.result;
}

function showLoading(msg) {
  document.getElementById('loading-msg').textContent = msg || 'A IA esta pensando...';
  document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loading-overlay').style.display = 'none';
}

function mostrarErro(elementId, msg) {
  const el = document.getElementById(elementId);
  if (el) {
    el.style.display = 'block';
    el.innerHTML = '<div style="color:#ef4444;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);padding:12px;border-radius:8px;font-size:14px;">&#9888; ' + msg + '</div>';
  }
}

// ===== CRONOGRAMA =====
async function gerarCronograma() {
  const nome = document.getElementById('inp-nome').value.trim();
  const materias = document.getElementById('inp-materias').value.trim();
  const horas = document.getElementById('inp-horas').value;
  const objetivo = document.getElementById('inp-objetivo').value.trim();
  const data = document.getElementById('inp-data').value;
  const nivel = document.getElementById('inp-nivel').value;

  if (!nome || !materias || !objetivo) {
    alert('Preencha nome, materias e objetivo!');
    return;
  }

  const btn = document.getElementById('btn-gerar');
  btn.disabled = true;
  showLoading('Gerando seu cronograma personalizado...');

  try {
    const prompt = 'Crie um cronograma de estudos semanal detalhado para:
' +
      'Nome: ' + nome + '
' +
      'Materias: ' + materias + '
' +
      'Horas por dia: ' + (horas || 3) + '
' +
      'Objetivo: ' + objetivo + '
' +
      'Prazo/prova: ' + (data || 'nao definido') + '
' +
      'Nivel: ' + nivel + '

' +
      'Formate com dias da semana, horarios, materias e dicas praticas. Use emojis para ficar visualmente agradavel. Inclua tambem dicas de tecnicas de estudo (Pomodoro, revisao espacada, etc).';

    const sys = 'Voce e o SabIA, um assistente educacional inteligente. Crie cronogramas praticos, motivadores e realistas. Use markdown simples com titulos (###), negrito (**texto**) e emojis. Adapte ao nivel do aluno. Responda sempre em portugues do Brasil.';

    const result = await chamarIA(prompt, sys);

    const card = document.getElementById('cronograma-result');
    const output = document.getElementById('cronograma-output');
    card.style.display = 'block';
    output.innerHTML = formatarTextoIA(result);

    STATE.tarefas = extrairTarefas(result, materias);
    salvarState();
    atualizarDashboard();

    // Scroll para o resultado
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    mostrarErro('cronograma-result', 'Erro ao conectar com a IA: ' + e.message + '. Verifique se a ANTHROPIC_API_KEY esta configurada no Vercel.');
    document.getElementById('cronograma-result').style.display = 'block';
  }

  btn.disabled = false;
  hideLoading();
}

// ===== CONTEUDOS =====
async function sugerirConteudo() {
  const topico = document.getElementById('inp-conteudo').value.trim();
  if (!topico) { alert('Digite uma materia ou topico!'); return; }

  showLoading('Buscando conteudos personalizados...');

  try {
    const perfil = STATE.perfil ? 'Aluno: ' + STATE.perfil.nome + ', Objetivo: ' + STATE.perfil.objetivo + '.' : '';
    const prompt = 'Sugira 5 recursos de estudo sobre: ' + topico + '. ' + perfil +
      '
Inclua: videos no YouTube, sites gratuitos, exercicios e dicas praticas. Seja especifico com nomes de canais e sites reais.';
    const sys = 'Voce e o SabIA, especialista em educacao. Sugira recursos de qualidade, preferencialmente gratuitos. Formate em topicos numerados com descricoes. Responda sempre em portugues do Brasil.';

    const result = await chamarIA(prompt, sys);
    const card = document.getElementById('conteudo-result');
    card.style.display = 'block';
    document.getElementById('conteudo-output').innerHTML = formatarTextoIA(result);
    card.scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    mostrarErro('conteudo-result', 'Erro: ' + e.message);
    document.getElementById('conteudo-result').style.display = 'block';
  }

  hideLoading();
}

// ===== EVOLUCAO =====
async function analisarEvolucao() {
  const texto = document.getElementById('inp-evolucao').value.trim();
  if (!texto) { alert('Descreva como foi seu estudo!'); return; }

  showLoading('Analisando sua evolucao...');

  try {
    const prompt = 'Analise este relato de estudo e forneça:
1) Resumo do que foi estudado
2) Pontos positivos
3) Areas de melhoria
4) Sugestoes para o proximo estudo
5) Mensagem motivacional

Relato: ' + texto;
    const sys = 'Voce e o SabIA, tutor empatico e encorajador. Analise o progresso com positividade. Seja especifico e construtivo. Use emojis e formatacao clara. Responda sempre em portugues do Brasil.';

    const result = await chamarIA(prompt, sys);

    STATE.evolucao.push({
      data: new Date().toLocaleDateString('pt-BR'),
      texto: texto,
      analise: result
    });
    salvarState();

    const card = document.getElementById('evolucao-result');
    card.style.display = 'block';
    document.getElementById('evolucao-output').innerHTML = formatarTextoIA(result);
    atualizarGrafico();
    atualizarDashboard();
    card.scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    mostrarErro('evolucao-result', 'Erro: ' + e.message);
    document.getElementById('evolucao-result').style.display = 'block';
  }

  hideLoading();
}

// ===== LEMBRETES =====
function adicionarLembrete() {
  const titulo = document.getElementById('inp-lembrete-titulo').value.trim();
  const dataHora = document.getElementById('inp-lembrete-data').value;
  const desc = document.getElementById('inp-lembrete-desc').value.trim();

  if (!titulo || !dataHora) {
    alert('Preencha titulo e data/hora!');
    return;
  }

  STATE.lembretes.push({ id: Date.now(), titulo, dataHora, desc });
  salvarState();

  document.getElementById('inp-lembrete-titulo').value = '';
  document.getElementById('inp-lembrete-data').value = '';
  document.getElementById('inp-lembrete-desc').value = '';

  renderLembretes();
  atualizarDashboard();
}

function removerLembrete(id) {
  STATE.lembretes = STATE.lembretes.filter(l => l.id !== id);
  salvarState();
  renderLembretes();
  atualizarDashboard();
}

function renderLembretes() {
  const lista = document.getElementById('lembretes-lista');
  const preview = document.getElementById('reminder-preview');

  if (!STATE.lembretes.length) {
    lista.innerHTML = '<li class="task-empty">Nenhum lembrete ainda.</li>';
    if (preview) preview.innerHTML = '';
    const count = document.getElementById('lembretes-count');
    count.textContent = '0';
    count.classList.remove('visible');
    document.getElementById('notif-dot').style.display = 'none';
    return;
  }

  const sorted = [...STATE.lembretes].sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));

  lista.innerHTML = sorted.map(l =>
    '<li class="reminder-full-item">' +
    '<span class="r-time">' + formatarDataHora(l.dataHora) + '</span>' +
    '<div><div class="r-title">' + l.titulo + '</div>' +
    (l.desc ? '<div style="color:#7a8ba8;font-size:12px">' + l.desc + '</div>' : '') +
    '</div>' +
    '<button class="r-del" onclick="removerLembrete(' + l.id + ')">&#10005;</button>' +
    '</li>'
  ).join('');

  if (preview) {
    preview.innerHTML = sorted.slice(0, 3).map(l =>
      '<li class="reminder-item">&#128276; ' + l.titulo + ' &mdash; ' + formatarDataHora(l.dataHora) + '</li>'
    ).join('');
  }

  const count = document.getElementById('lembretes-count');
  count.textContent = STATE.lembretes.length;
  count.classList.add('visible');
  document.getElementById('notif-dot').style.display = 'block';
}

function formatarDataHora(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ===== FEEDBACK =====
async function obterFeedback() {
  const texto = document.getElementById('inp-feedback').value.trim();
  if (!texto) { alert('Escreva sua pergunta ou resposta!'); return; }

  showLoading('Analisando e gerando feedback...');

  try {
    const perfil = STATE.perfil ? 'Aluno: ' + (STATE.perfil.nome || 'Aluno') + '. ' : '';
    const sys = 'Voce e o SabIA, tutor IA especializado. ' + perfil +
      'Forneca feedback educativo, claro e motivador. Se houver erro, corrija com explicacao detalhada. Se for pergunta, responda com exemplos praticos. Use formatacao clara com emojis. Responda sempre em portugues do Brasil.';

    const result = await chamarIA(texto, sys);

    STATE.chatHistory.push(
      { role: 'user', content: texto },
      { role: 'ia', content: result }
    );

    renderChat();
    document.getElementById('feedback-result').style.display = 'block';
    document.getElementById('feedback-output').innerHTML = formatarTextoIA(result);
    document.getElementById('inp-feedback').value = '';
  } catch (e) {
    mostrarErro('feedback-result', 'Erro: ' + e.message);
    document.getElementById('feedback-result').style.display = 'block';
  }

  hideLoading();
}

function renderChat() {
  const hist = document.getElementById('chat-history');
  hist.innerHTML = STATE.chatHistory.map(m =>
    '<div class="chat-bubble ' + (m.role === 'user' ? 'user' : 'ia') + '">' +
    (m.role === 'ia' ? '<strong>SabIA</strong><br>' : '<strong>Voce</strong><br>') +
    formatarTextoIA(m.content) +
    '</div>'
  ).join('');
  hist.scrollTop = hist.scrollHeight;
}

// ===== UTILIDADES =====
function formatarTextoIA(texto) {
  if (!texto) return '';
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/**(.*?)**/g, '<strong>$1</strong>')
    .replace(/^### (.*$)/gm, '<h3 style="color:rgb(0,200,230);margin:1rem 0 0.4rem;font-size:15px">$1</h3>')
    .replace(/^## (.*$)/gm, '<h3 style="color:rgb(0,200,230);margin:1rem 0 0.4rem;font-size:15px">$1</h3>')
    .replace(/^# (.*$)/gm, '<h3 style="color:rgb(0,200,230);margin:1rem 0 0.4rem;font-size:16px">$1</h3>')
    .replace(/^- (.*$)/gm, '<li style="margin-left:1rem;margin-bottom:4px">$1</li>')
    .replace(/
/g, '<br>');
}

function extrairTarefas(texto, materias) {
  const lista = materias.split(',').map(m => m.trim()).filter(Boolean);
  const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
  return lista.map((m, i) => ({
    id: i,
    texto: 'Estudar ' + m,
    done: false,
    dia: dias[i % 7]
  }));
}

function toggleTarefa(id) {
  const t = STATE.tarefas.find(t => t.id === id);
  if (t) {
    t.done = !t.done;
    salvarState();
    atualizarDashboard();
  }
}

function atualizarGrafico() {
  const bars = document.getElementById('chart-bars');
  const labels = document.getElementById('chart-labels');
  if (!bars || !labels) return;

  const ultimos = STATE.evolucao.slice(-7);
  if (!ultimos.length) {
    bars.innerHTML = '<div style="color:#7a8ba8;font-size:13px;padding:1rem">Nenhum registro de evolucao ainda. Registre seus estudos acima!</div>';
    labels.innerHTML = '';
    return;
  }

  const max = ultimos.length;
  bars.innerHTML = ultimos.map((e, i) =>
    '<div class="chart-bar" style="height:' + (30 + Math.round((i / (max || 1)) * 50)) + 'px" title="' + e.data + '"></div>'
  ).join('');
  labels.innerHTML = ultimos.map(e =>
    '<div class="chart-label">' + e.data.slice(0, 5) + '</div>'
  ).join('');
}

function atualizarUI() {
  const p = STATE.perfil;
  if (!p) return;
  const nameEl = document.getElementById('user-name-sidebar');
  const avatarEl = document.getElementById('user-avatar');
  if (nameEl) nameEl.textContent = p.nome || 'Aluno';
  if (avatarEl) avatarEl.textContent = (p.nome || 'A')[0].toUpperCase();
  const banner = document.getElementById('welcome-banner');
  if (banner) banner.style.display = 'none';
}

function atualizarDashboard() {
  atualizarUI();

  const done = STATE.tarefas.filter(t => t.done).length;
  const total = STATE.tarefas.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  setEl('stat-tarefas', done);
  setEl('stat-tarefas-delta', 'de ' + total + ' planejadas');
  setEl('stat-progresso', pct + '%');
  setEl('stat-horas', (STATE.evolucao.length * 2) + 'h');
  setEl('stat-streak', '🔥 ' + (STATE.streak + STATE.evolucao.length));

  const barFill = document.getElementById('mini-bar-fill');
  if (barFill) barFill.style.width = pct + '%';

  const hoje = document.getElementById('today-tasks');
  if (hoje && STATE.tarefas.length) {
    hoje.innerHTML = STATE.tarefas.slice(0, 5).map(t =>
      '<li class="task-item ' + (t.done ? 'done' : '') + '" onclick="toggleTarefa(' + t.id + ')">' +
      '<div class="task-check">' + (t.done ? '&#10003;' : '') + '</div>' +
      '<span>' + t.texto + '</span>' +
      '<span style="margin-left:auto;font-size:11px;color:#7a8ba8">' + t.dia + '</span>' +
      '</li>'
    ).join('');
  }

  renderLembretes();
  atualizarGrafico();
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  atualizarDashboard();

  if (!STATE.perfil) {
    setTimeout(openOnboarding, 600);
  }

  // Verificar lembretes proximos (a cada minuto)
  setInterval(() => {
    const agora = new Date();
    STATE.lembretes.forEach(l => {
      const dt = new Date(l.dataHora);
      const diffMin = (dt - agora) / 60000;
      if (diffMin > 0 && diffMin < 2) {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('SabIA 🔔 ' + l.titulo, { body: l.desc || 'Hora de estudar!' });
        }
      }
    });
  }, 60000);

  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission();
  }
});
