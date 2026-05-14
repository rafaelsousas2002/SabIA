// SabIA — app.js
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

// ===== NAVEGAÇÃO =====
function showTab(name) {
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const section = document.getElementById('tab-' + name);
  if (section) section.classList.add('active');
  const navItem = document.querySelector('[data-tab="' + name + '"]');
  if (navItem) navItem.classList.add('active');
  document.getElementById('page-title').textContent =
    name.charAt(0).toUpperCase() + name.slice(1).replace('conteudos','Conteúdos').replace('evolucao','Evolução').replace('lembretes','Lembretes').replace('feedback','Feedback IA');
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
  if (!nome || !objetivo || !materias) return alert('Preencha todos os campos!');
  STATE.perfil = { nome, objetivo, materias, horas };
  salvarState();
  closeOnboarding();
  atualizarUI();
  showTab('cronograma');
  document.getElementById('inp-nome').value = nome;
  document.getElementById('inp-objetivo').value = objetivo;
  document.getElementById('inp-materias').value = materias;
  document.getElementById('inp-horas').value = horas;
}

// ===== CHAMADA À IA =====
async function chamarIA(prompt, systemPrompt) {
  const resp = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, systemPrompt })
  });
  if (!resp.ok) throw new Error('Erro na API');
  const data = await resp.json();
  return data.result;
}

function showLoading(msg) {
  document.getElementById('loading-msg').textContent = msg || 'A IA está pensando...';
  document.getElementById('loading-overlay').style.display = 'flex';
}
function hideLoading() {
  document.getElementById('loading-overlay').style.display = 'none';
}

// ===== CRONOGRAMA =====
async function gerarCronograma() {
  const nome = document.getElementById('inp-nome').value.trim();
  const materias = document.getElementById('inp-materias').value.trim();
  const horas = document.getElementById('inp-horas').value;
  const objetivo = document.getElementById('inp-objetivo').value.trim();
  const data = document.getElementById('inp-data').value;
  const nivel = document.getElementById('inp-nivel').value;
  if (!nome || !materias || !objetivo) return alert('Preencha nome, matérias e objetivo!');

  showLoading('Gerando seu cronograma personalizado...');
  try {
    const prompt = `Crie um cronograma de estudos semanal detalhado para:
Nome: ${nome}
Matérias: ${materias}
Horas por dia: ${horas || 3}
Objetivo: ${objetivo}
Prazo/prova: ${data || 'não definido'}
Nível: ${nivel}

Formate de forma clara com dias da semana, horários, matérias e dicas. Use emojis.`;
    const sys = `Você é o SabIA, um assistente educacional inteligente. Crie cronogramas práticos, motivadores e realistas. Formate em seções claras usando markdown simples (sem backticks). Use emojis para tornar visual. Adapte ao nível do aluno.`;
    const result = await chamarIA(prompt, sys);
    const card = document.getElementById('cronograma-result');
    const output = document.getElementById('cronograma-output');
    card.style.display = 'block';
    output.innerHTML = formatarTextoIA(result);
    STATE.tarefas = extrairTarefas(result, materias);
    salvarState();
    atualizarDashboard();
  } catch(e) {
    alert('Erro ao conectar com a IA. Verifique a API Key.');
  }
  hideLoading();
}

// ===== CONTEÚDOS =====
async function sugerirConteudo() {
  const topico = document.getElementById('inp-conteudo').value.trim();
  if (!topico) return alert('Digite uma matéria ou tópico!');
  showLoading('Buscando conteúdos personalizados...');
  try {
    const perfil = STATE.perfil ? `Aluno: ${STATE.perfil.nome}, Objetivo: ${STATE.perfil.objetivo}, Nível implícito pelo contexto.` : '';
    const prompt = `Sugira 5 conteúdos e recursos de estudo sobre: ${topico}. ${perfil}
Incluir: vídeos, sites, livros, exercícios e dicas práticas. Seja específico e motivador.`;
    const sys = `Você é o SabIA, especialista em educação. Sugira recursos de qualidade, gratuitos quando possível, com links reais (YouTube, Khan Academy, etc). Formate em tópicos numerados com descrições curtas.`;
    const result = await chamarIA(prompt, sys);
    document.getElementById('conteudo-result').style.display = 'block';
    document.getElementById('conteudo-output').innerHTML = formatarTextoIA(result);
  } catch(e) { alert('Erro na IA.'); }
  hideLoading();
}

// ===== EVOLUÇÃO =====
async function analisarEvolucao() {
  const texto = document.getElementById('inp-evolucao').value.trim();
  if (!texto) return alert('Descreva como foi seu estudo!');
  showLoading('Analisando sua evolução...');
  try {
    const prompt = `Analise o relato de estudo do aluno e forneça: 1) Resumo do que foi estudado, 2) Pontos positivos, 3) Pontos de melhoria, 4) Sugestões para o próximo estudo, 5) Nota motivacional.
Relato: ${texto}`;
    const sys = `Você é o SabIA, tutor empático e encorajador. Analise o progresso com positividade. Seja específico e construtivo. Use emojis e formatação clara.`;
    const result = await chamarIA(prompt, sys);
    STATE.evolucao.push({ data: new Date().toLocaleDateString('pt-BR'), texto, analise: result });
    salvarState();
    document.getElementById('evolucao-result').style.display = 'block';
    document.getElementById('evolucao-output').innerHTML = formatarTextoIA(result);
    atualizarGrafico();
    atualizarDashboard();
  } catch(e) { alert('Erro na IA.'); }
  hideLoading();
}

// ===== LEMBRETES =====
function adicionarLembrete() {
  const titulo = document.getElementById('inp-lembrete-titulo').value.trim();
  const dataHora = document.getElementById('inp-lembrete-data').value;
  const desc = document.getElementById('inp-lembrete-desc').value.trim();
  if (!titulo || !dataHora) return alert('Preencha título e data/hora!');
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
    preview.innerHTML = '';
    return;
  }
  const sorted = [...STATE.lembretes].sort((a,b) => new Date(a.dataHora) - new Date(b.dataHora));
  lista.innerHTML = sorted.map(l => `
    <li class="reminder-full-item">
      <span class="r-time">${formatarDataHora(l.dataHora)}</span>
      <div><div class="r-title">${l.titulo}</div>${l.desc ? '<div style="color:#7a8ba8;font-size:12px">'+l.desc+'</div>' : ''}</div>
      <button class="r-del" onclick="removerLembrete(${l.id})">✕</button>
    </li>
  `).join('');
  const prox = sorted.slice(0,3);
  preview.innerHTML = prox.map(l => `<li class="reminder-item">🔔 ${l.titulo} — ${formatarDataHora(l.dataHora)}</li>`).join('');
  const count = document.getElementById('lembretes-count');
  count.textContent = STATE.lembretes.length;
  count.classList.toggle('visible', STATE.lembretes.length > 0);
  document.getElementById('notif-dot').style.display = STATE.lembretes.length > 0 ? 'block' : 'none';
}

function formatarDataHora(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
}

// ===== FEEDBACK =====
async function obterFeedback() {
  const texto = document.getElementById('inp-feedback').value.trim();
  if (!texto) return alert('Escreva sua pergunta ou resposta!');
  showLoading('Analisando e gerando feedback...');
  try {
    const perfil = STATE.perfil ? `Aluno: ${STATE.perfil.nome || 'Aluno'}` : '';
    const prompt = texto;
    const sys = `Você é o SabIA, tutor IA especializado. ${perfil}. Forneça feedback educativo, claro e motivador. Se houver erro, corrija com explicação. Se for pergunta, responda com exemplos. Use formatação clara com emojis.`;
    const result = await chamarIA(prompt, sys);
    document.getElementById('feedback-result').style.display = 'block';
    document.getElementById('feedback-output').innerHTML = formatarTextoIA(result);
    STATE.chatHistory.push({ role: 'user', content: texto }, { role: 'ia', content: result });
    renderChat();
    document.getElementById('inp-feedback').value = '';
  } catch(e) { alert('Erro na IA.'); }
  hideLoading();
}

function renderChat() {
  const hist = document.getElementById('chat-history');
  hist.innerHTML = STATE.chatHistory.map(m => `
    <div class="chat-bubble ${m.role === 'user' ? 'user' : 'ia'}">
      ${m.role === 'ia' ? '<strong>SabIA</strong><br>' : '<strong>Você</strong><br>'}
      ${formatarTextoIA(m.content)}
    </div>
  `).join('');
}

// ===== UTILIDADES =====
function formatarTextoIA(texto) {
  return texto
    .replace(/**(.*?)**/g, '<strong>$1</strong>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h3>$1</h3>')
    .replace(/^# (.*$)/gm, '<h3>$1</h3>')
    .replace(/
/g, '<br>');
}

function extrairTarefas(texto, materias) {
  const lista = materias.split(',').map(m => m.trim());
  return lista.map((m, i) => ({
    id: i, texto: `Estudar ${m}`, done: false,
    dia: ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'][i % 7]
  }));
}

function toggleTarefa(id) {
  const t = STATE.tarefas.find(t => t.id === id);
  if (t) { t.done = !t.done; salvarState(); atualizarDashboard(); }
}

function atualizarGrafico() {
  const bars = document.getElementById('chart-bars');
  const labels = document.getElementById('chart-labels');
  const ultimos = STATE.evolucao.slice(-7);
  if (!ultimos.length) return;
  const max = ultimos.length;
  bars.innerHTML = ultimos.map((e,i) => `
    <div class="chart-bar" style="height:${40 + (i/(max||1))*40}px" title="${e.data}"></div>
  `).join('');
  labels.innerHTML = ultimos.map(e => `<div class="chart-label">${e.data.slice(0,5)}</div>`).join('');
}

function atualizarDashboard() {
  const p = STATE.perfil;
  if (p) {
    document.getElementById('user-name-sidebar').textContent = p.nome || 'Aluno';
    document.getElementById('user-avatar').textContent = (p.nome || 'A')[0].toUpperCase();
    document.getElementById('welcome-banner').style.display = 'none';
  }
  const done = STATE.tarefas.filter(t => t.done).length;
  const total = STATE.tarefas.length;
  const pct = total ? Math.round((done/total)*100) : 0;
  document.getElementById('stat-tarefas').textContent = done;
  document.getElementById('stat-tarefas-delta').textContent = `de ${total} planejadas`;
  document.getElementById('stat-progresso').textContent = pct + '%';
  document.getElementById('mini-bar-fill').style.width = pct + '%';
  document.getElementById('stat-horas').textContent = (STATE.evolucao.length * 2) + 'h';
  document.getElementById('stat-streak').textContent = '🔥 ' + (STATE.streak + STATE.evolucao.length);
  const hoje = document.getElementById('today-tasks');
  if (STATE.tarefas.length) {
    hoje.innerHTML = STATE.tarefas.slice(0,5).map(t => `
      <li class="task-item ${t.done ? 'done' : ''}" onclick="toggleTarefa(${t.id})">
        <div class="task-check">${t.done ? '✓' : ''}</div>
        <span>${t.texto}</span>
        <span style="margin-left:auto;font-size:11px;color:#7a8ba8">${t.dia}</span>
      </li>
    `).join('');
  }
  renderLembretes();
  atualizarGrafico();
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  atualizarDashboard();
  if (!STATE.perfil) {
    setTimeout(openOnboarding, 800);
  }
  // Verificar lembretes próximos
  setInterval(() => {
    const agora = new Date();
    STATE.lembretes.forEach(l => {
      const dt = new Date(l.dataHora);
      const diff = (dt - agora) / 60000;
      if (diff > 0 && diff < 5) {
        if (Notification.permission === 'granted') {
          new Notification('SabIA 🔔', { body: l.titulo });
        }
      }
    });
  }, 60000);
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
});
