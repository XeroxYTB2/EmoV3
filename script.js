// ============================================================
// EMO - VERSION CORRIGÉE (ngrok + CORS)
// ============================================================

(function() {
console.log(‘🚀 Emo initialisé’);

// ––––– Headers communs pour ngrok –––––
const COMMON_HEADERS = {
‘Content-Type’: ‘application/json’,
‘ngrok-skip-browser-warning’: ‘true’,
‘Accept’: ‘application/json’
};

// ––––– État global –––––
const state = {
config: {
ollamaUrl: localStorage.getItem(‘emo_ollama_url’) || ‘’,
modelName: localStorage.getItem(‘emo_model_name’) || ‘hf.co/bartowski/Qwen2.5-Coder-7B-Instruct-abliterated-GGUF:Q8_0’,
thinkingEnabled: localStorage.getItem(‘emo_thinking’) !== ‘false’,
useProxy: localStorage.getItem(‘emo_use_proxy’) === ‘true’,
proxyUrl: localStorage.getItem(‘emo_proxy_url’) || ‘https://corsproxy.io/?’
},
conversations: JSON.parse(localStorage.getItem(‘emo_conversations’) || ‘[]’),
currentConversationId: localStorage.getItem(‘emo_current_conv’) || null,
messages: [],
isGenerating: false,
abortController: null
};

let elements = {};

// ––––– Initialisation des éléments DOM –––––
function initElements() {
elements = {
ollamaUrl: document.getElementById(‘ollamaUrl’),
modelName: document.getElementById(‘modelName’),
thinkingToggle: document.getElementById(‘thinkingToggle’),
useProxy: document.getElementById(‘useCorsProxy’),
proxyUrl: document.getElementById(‘proxyUrl’),
saveConfigBtn: document.getElementById(‘saveConfigBtn’),
connectionStatus: document.getElementById(‘connectionStatus’),
messages: document.getElementById(‘messages’),
userInput: document.getElementById(‘userInput’),
sendBtn: document.getElementById(‘sendBtn’),
newChatBtn: document.getElementById(‘newChatBtn’),
clearChatBtn: document.getElementById(‘clearChatBtn’),
charCount: document.getElementById(‘charCount’),
chatHistory: document.getElementById(‘chatHistory’),
sidebar: document.getElementById(‘sidebar’),
menuToggle: document.getElementById(‘menuToggle’)
};
}

// ––––– Initialisation –––––
function init() {
initElements();
loadConfigToUI();
loadConversations();
setupListeners();
renderChatHistory();
if (state.config.ollamaUrl) testConnection();
}

// ––––– Configuration UI –––––
function loadConfigToUI() {
elements.ollamaUrl.value = state.config.ollamaUrl;
elements.modelName.value = state.config.modelName;
elements.thinkingToggle.checked = state.config.thinkingEnabled;
elements.useProxy.checked = state.config.useProxy;
if (elements.proxyUrl) elements.proxyUrl.value = state.config.proxyUrl;
}

function saveConfig() {
state.config.ollamaUrl = elements.ollamaUrl.value.trim();
state.config.modelName = elements.modelName.value.trim();
state.config.thinkingEnabled = elements.thinkingToggle.checked;
state.config.useProxy = elements.useProxy.checked;
if (elements.proxyUrl) state.config.proxyUrl = elements.proxyUrl.value.trim();

```
localStorage.setItem('emo_ollama_url', state.config.ollamaUrl);
localStorage.setItem('emo_model_name', state.config.modelName);
localStorage.setItem('emo_thinking', state.config.thinkingEnabled);
localStorage.setItem('emo_use_proxy', state.config.useProxy);
if (state.config.proxyUrl) localStorage.setItem('emo_proxy_url', state.config.proxyUrl);

showToast('Configuration enregistrée ✅', 'success');
testConnection();
```

}

// ––––– Construction de l’URL effective –––––
// Stratégie :
//  - Sans proxy → requête directe avec headers ngrok
//  - Avec proxy corsproxy.io → on ajoute l’URL encodée après le ?
//  - Avec proxy allorigins.win → format différent
//  - Avec proxy perso (workers.dev) → on POSTe directement dessus
function getEffectiveUrl(endpoint = ‘’) {
const base = state.config.ollamaUrl.replace(//$/, ‘’);
const targetUrl = base + endpoint;

```
if (!state.config.useProxy || !state.config.proxyUrl) {
  return targetUrl;
}

const proxy = state.config.proxyUrl.trim().replace(/\/$/, '');

// allorigins.win : GET seulement, utile pour le test de connexion
if (proxy.includes('allorigins.win')) {
  return `${proxy}/get?url=${encodeURIComponent(targetUrl)}`;
}

// corsproxy.io : https://corsproxy.io/?URL_ENCODEE
if (proxy.includes('corsproxy.io')) {
  const base = proxy.replace(/\/?\?$/, '');
  return `${base}/?${encodeURIComponent(targetUrl)}`;
}

// Worker Cloudflare ou proxy perso : on lui passe l'URL cible en paramètre
if (proxy.includes('workers.dev') || proxy.includes('worker')) {
  return `${proxy}?url=${encodeURIComponent(targetUrl)}`;
}

// Fallback générique
return `${proxy}/?${encodeURIComponent(targetUrl)}`;
```

}

// ––––– Fetch avec gestion ngrok + proxy –––––
async function doFetch(url, options = {}) {
// Si on passe par un proxy qui encode l’URL, on ne peut pas ajouter
// les headers ngrok (le proxy les transmet rarement).
// Solution : on essaie d’abord sans proxy avec les headers ngrok,
// et seulement en cas d’échec CORS on bascule sur le proxy.
const headers = { …COMMON_HEADERS, …(options.headers || {}) };
return fetch(url, { …options, headers });
}

// ––––– Test de connexion –––––
async function testConnection() {
if (!state.config.ollamaUrl) {
updateStatus(‘error’, ‘⚠️ URL Ollama manquante’);
return;
}

```
updateStatus('testing', '⏳ Test...');

// Stratégie : on essaie d'abord en direct (avec header ngrok),
// puis via proxy si ça échoue (CORS bloqué par le navigateur).
const directUrl = state.config.ollamaUrl.replace(/\/$/, '') + '/api/tags';
const proxyUrl = getEffectiveUrl('/api/tags');
const useProxy = state.config.useProxy && state.config.proxyUrl;

console.log('🔌 Test direct :', directUrl);
if (useProxy) console.log('🔀 Fallback proxy :', proxyUrl);

try {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  // Essai 1 : direct avec headers ngrok (fonctionne si Ollama est accessible + ngrok configuré)
  let response;
  try {
    response = await doFetch(directUrl, { signal: controller.signal });
  } catch (corsErr) {
    // Erreur réseau/CORS → on tente le proxy
    if (useProxy) {
      console.warn('⚠️ Échec direct, tentative via proxy…', corsErr.message);
      response = await doFetch(proxyUrl, { signal: controller.signal });
    } else {
      throw corsErr;
    }
  }

  clearTimeout(timeout);

  const contentType = response.headers.get('content-type') || '';

  if (response.ok && contentType.includes('application/json')) {
    const data = await response.json();
    // allorigins.win encapsule dans { contents: "..." }
    const models = data.models || (data.contents ? JSON.parse(data.contents).models : []);
    const count = models?.length || 0;
    updateStatus('connected', `✅ Connecté (${count} modèle(s))`);
    console.log('✅ Modèles :', models);
  } else {
    const text = await response.text();
    console.error('❌ Réponse inattendue :', text.substring(0, 300));
    updateStatus('error', `Erreur HTTP ${response.status} — réponse non-JSON`);
    showDiagnostic(text);
  }
} catch (e) {
  const msg = e.name === 'AbortError' ? 'Timeout (>10s)' : e.message;
  updateStatus('error', `❌ ${msg}`);
  console.error('Erreur connexion :', e);
}
```

}

// Affiche un message de diagnostic dans la console si on reçoit du HTML
function showDiagnostic(text) {
if (text.includes(’<!DOCTYPE’) || text.includes(’<html’)) {
console.warn(
‘💡 Diagnostic : le serveur renvoie une page HTML. ’ +
‘Si tu utilises ngrok, assure-toi que :\n’ +
’  1. Le tunnel est actif\n’ +
’  2. OLLAMA_ORIGINS=* est défini côté serveur\n’ +
’  3. Tu peux activer le proxy CORS dans les paramètres’
);
}
}

function updateStatus(type, text) {
elements.connectionStatus.textContent = text;
elements.connectionStatus.className = ’status ’ + (
type === ‘connected’ ? ‘connected’ :
type === ‘error’ ? ‘error’ : ‘’
);
}

function showToast(msg) {
console.log(`🔔 ${msg}`);
// Toast visuel simple
const toast = document.createElement(‘div’);
toast.style.cssText = `position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:#10a37f; color:white; padding:10px 20px; border-radius:8px; font-size:14px; z-index:9999; animation:fadeIn .3s ease;`;
toast.textContent = msg;
document.body.appendChild(toast);
setTimeout(() => toast.remove(), 2500);
}

// ––––– Gestion des conversations –––––
function loadConversations() {
if (state.currentConversationId) {
const conv = state.conversations.find(c => c.id === state.currentConversationId);
if (conv) state.messages = conv.messages;
} else {
createNewConversation();
}
renderMessages();
}

function createNewConversation() {
state.messages = [];
state.currentConversationId = Date.now().toString();
renderMessages();
saveConversations();
renderChatHistory();
}

function saveConversations() {
const existing = state.conversations.findIndex(c => c.id === state.currentConversationId);
if (existing >= 0) {
state.conversations[existing].messages = state.messages;
if (state.messages.length > 0) {
const first = state.messages.find(m => m.role === ‘user’);
state.conversations[existing].title = first ? first.content.slice(0, 30) : ‘Sans titre’;
}
} else if (state.messages.length > 0) {
const first = state.messages.find(m => m.role === ‘user’);
state.conversations.unshift({
id: state.currentConversationId,
title: first ? first.content.slice(0, 30) : ‘Nouvelle discussion’,
messages: state.messages,
createdAt: new Date().toISOString()
});
}
localStorage.setItem(‘emo_conversations’, JSON.stringify(state.conversations));
localStorage.setItem(‘emo_current_conv’, state.currentConversationId);
}

function loadConversation(id) {
const conv = state.conversations.find(c => c.id === id);
if (conv) {
state.currentConversationId = id;
state.messages = […conv.messages];
renderMessages();
renderChatHistory();
}
}

function deleteConversation(id) {
state.conversations = state.conversations.filter(c => c.id !== id);
if (state.currentConversationId === id) {
if (state.conversations.length > 0) {
loadConversation(state.conversations[0].id);
} else {
createNewConversation();
}
}
localStorage.setItem(‘emo_conversations’, JSON.stringify(state.conversations));
localStorage.setItem(‘emo_current_conv’, state.currentConversationId);
renderChatHistory();
}

// ––––– Rendu UI –––––
function renderChatHistory() {
if (!elements.chatHistory) return;
elements.chatHistory.innerHTML = ‘’;
state.conversations.forEach(c => {
const div = document.createElement(‘div’);
div.className = `chat-history-item ${c.id === state.currentConversationId ? 'active' : ''}`;
div.textContent = c.title;
div.onclick = () => { loadConversation(c.id); };
div.addEventListener(‘contextmenu’, (e) => {
e.preventDefault();
if (confirm(‘Supprimer cette conversation ?’)) deleteConversation(c.id);
});
elements.chatHistory.appendChild(div);
});
}

function renderMessages() {
if (state.messages.length === 0) {
elements.messages.innerHTML = `<div class="welcome-message"> <div class="welcome-avatar">😏</div> <h2>Hey. Moi c'est Emo.</h2> <p>Ton acolyte légèrement sarcastique et bien trop intelligent.<br>Pose-moi ce que tu veux. Je lèverai sans doute les yeux au ciel avant de répondre.</p> </div>`;
return;
}
let html = ‘’;
state.messages.forEach(m => {
const avatar = m.role === ‘user’ ? ‘👤’ : ‘😏’;
const content = formatMessage(m.content || ‘…’);
html += `<div class="message ${m.role}"><div class="message-avatar">${avatar}</div><div class="message-content">${content}</div></div>`;
});
elements.messages.innerHTML = html;
elements.messages.scrollTop = elements.messages.scrollHeight;
}

function formatMessage(text) {
return text
.replace(/</g, ‘<’)
.replace(/>/g, ‘>’)
.replace(/\n/g, ‘<br>’)
.replace(/`(\w*)\n([\s\S]*?)`/g, ‘<pre><code>$2</code></pre>’)
.replace(/`([^`]+)`/g, ‘<code>$1</code>’);
}

// ––––– Envoi de message –––––
async function sendMessage() {
const input = elements.userInput.value.trim();
if (!input || state.isGenerating) return;

```
if (!state.config.ollamaUrl) {
  showToast('⚠️ Configure d\'abord l\'URL Ollama dans la barre latérale !');
  return;
}

state.messages.push({ role: 'user', content: input });
renderMessages();
elements.userInput.value = '';
updateCharCount();
elements.sendBtn.disabled = true;
state.isGenerating = true;

const assistantMsg = { role: 'assistant', content: '⏳', thinking: null };
state.messages.push(assistantMsg);
renderMessages();

try {
  const responseText = await callOllama(input);
  const parsed = parseThinking(responseText);
  assistantMsg.thinking = parsed.thinking;
  assistantMsg.content = parsed.answer;
} catch (e) {
  assistantMsg.content = `❌ Erreur: ${e.message}`;
  console.error('Erreur Ollama :', e);
} finally {
  state.isGenerating = false;
  elements.sendBtn.disabled = false;
  renderMessages();
  saveConversations();
}
```

}

async function callOllama(prompt) {
// Essai direct d’abord (avec headers ngrok), puis proxy si CORS
const directUrl = state.config.ollamaUrl.replace(//$/, ‘’) + ‘/api/generate’;
const proxyUrl = getEffectiveUrl(’/api/generate’);
const useProxy = state.config.useProxy && state.config.proxyUrl;

```
console.log(`📤 Envoi direct : ${directUrl}`);

const finalPrompt = state.config.thinkingEnabled
  ? buildThinkingPrompt(prompt)
  : prompt;

const body = {
  model: state.config.modelName,
  prompt: finalPrompt,
  stream: false,
  options: { temperature: 0.7, num_predict: 2048 }
};

let response;
try {
  response = await doFetch(directUrl, {
    method: 'POST',
    body: JSON.stringify(body)
  });
} catch (corsErr) {
  if (useProxy) {
    console.warn('⚠️ Échec direct, tentative proxy :', proxyUrl);
    response = await doFetch(proxyUrl, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  } else {
    throw new Error(`Impossible de joindre Ollama (CORS). Active le proxy dans les paramètres. Détail: ${corsErr.message}`);
  }
}

if (!response.ok) {
  const text = await response.text();
  throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
}

const contentType = response.headers.get('content-type') || '';
if (!contentType.includes('application/json')) {
  const text = await response.text();
  throw new Error(`Réponse non-JSON reçue: ${text.substring(0, 100)}`);
}

const data = await response.json();
return data.response;
```

}

function buildThinkingPrompt(userMsg) {
return `Tu es Emo, un assistant IA extrêmement intelligent avec une personnalité sarcastique et légèrement joueuse. Tu es comme un collègue de bureau brillant mais un peu agacé qui tient à toi.

IMPORTANT : Avant de répondre, tu DOIS réfléchir au problème étape par étape. Formate ta réponse comme suit :

<thinking>
[Ton raisonnement détaillé.]
</thinking>

<answer>
[Ta réponse réelle. Sois utile mais garde ton ton sarcastique. Utilise des emojis à l'occasion.]
</answer>

Utilisateur: ${userMsg}
Emo:`;
}

function parseThinking(full) {
const thinkMatch = full.match(/<thinking>([\s\S]*?)</thinking>/i);
const answerMatch = full.match(/<answer>([\s\S]*?)</answer>/i);
return {
thinking: thinkMatch ? thinkMatch[1].trim() : null,
answer: answerMatch ? answerMatch[1].trim() : full
};
}

function updateCharCount() {
if (elements.charCount && elements.userInput) {
elements.charCount.textContent = elements.userInput.value.length;
}
}

// ––––– Écouteurs d’événements –––––
function setupListeners() {
elements.saveConfigBtn.addEventListener(‘click’, saveConfig);
elements.sendBtn.addEventListener(‘click’, sendMessage);
elements.newChatBtn.addEventListener(‘click’, createNewConversation);
elements.clearChatBtn.addEventListener(‘click’, () => {
if (confirm(‘Effacer la discussion en cours ?’)) {
state.messages = [];
renderMessages();
saveConversations();
}
});
elements.userInput.addEventListener(‘input’, () => {
updateCharCount();
elements.sendBtn.disabled = !elements.userInput.value.trim() || state.isGenerating;
});
elements.userInput.addEventListener(‘keydown’, (e) => {
if (e.key === ‘Enter’ && !e.shiftKey) {
e.preventDefault();
sendMessage();
}
});
elements.menuToggle.addEventListener(‘click’, () => {
elements.sidebar.classList.toggle(‘closed’);
});
}

// ––––– Démarrage –––––
init();
})();