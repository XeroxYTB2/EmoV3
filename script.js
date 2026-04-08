// ============================================================
// EMO - L'assistant IA sarcastique qui réfléchit vraiment
// ============================================================

// ---------- État global ----------
const state = {
  config: {
    ollamaUrl: localStorage.getItem('emo_ollama_url') || '',
    modelName: localStorage.getItem('emo_model_name') || 'qwen2.5-coder:14b',
    thinkingEnabled: localStorage.getItem('emo_thinking') !== 'false',
    useCorsProxy: localStorage.getItem('emo_use_cors_proxy') === 'true'
  },
  conversations: JSON.parse(localStorage.getItem('emo_conversations') || '[]'),
  currentConversationId: localStorage.getItem('emo_current_conv') || null,
  messages: [],
  isGenerating: false,
  abortController: null
};

// ---------- Éléments DOM ----------
const elements = {
  sidebar: document.getElementById('sidebar'),
  menuToggle: document.getElementById('menuToggle'),
  newChatBtn: document.getElementById('newChatBtn'),
  chatHistory: document.getElementById('chatHistory'),
  messages: document.getElementById('messages'),
  userInput: document.getElementById('userInput'),
  sendBtn: document.getElementById('sendBtn'),
  clearChatBtn: document.getElementById('clearChatBtn'),
  ollamaUrl: document.getElementById('ollamaUrl'),
  modelName: document.getElementById('modelName'),
  thinkingToggle: document.getElementById('thinkingToggle'),
  useCorsProxy: document.getElementById('useCorsProxy'),
  saveConfigBtn: document.getElementById('saveConfigBtn'),
  connectionStatus: document.getElementById('connectionStatus'),
  charCount: document.getElementById('charCount')
};

// ---------- Initialisation ----------
function init() {
  loadConfig();
  loadConversations();
  if (state.currentConversationId) {
    loadConversation(state.currentConversationId);
  } else {
    createNewConversation();
  }
  setupEventListeners();
  updateCharCount();
  testConnection();
}

function loadConfig() {
  elements.ollamaUrl.value = state.config.ollamaUrl;
  elements.modelName.value = state.config.modelName;
  elements.thinkingToggle.checked = state.config.thinkingEnabled;
  elements.useCorsProxy.checked = state.config.useCorsProxy;
}

function saveConfig() {
  state.config.ollamaUrl = elements.ollamaUrl.value.trim();
  state.config.modelName = elements.modelName.value.trim();
  state.config.thinkingEnabled = elements.thinkingToggle.checked;
  state.config.useCorsProxy = elements.useCorsProxy.checked;
  
  localStorage.setItem('emo_ollama_url', state.config.ollamaUrl);
  localStorage.setItem('emo_model_name', state.config.modelName);
  localStorage.setItem('emo_thinking', state.config.thinkingEnabled);
  localStorage.setItem('emo_use_cors_proxy', state.config.useCorsProxy);
  
  testConnection();
  showToast('Configuration enregistrée', 'success');
}

// ---------- Proxy CORS ----------
function getProxiedUrl(baseUrl) {
  if (!baseUrl.startsWith('http')) return baseUrl;
  if (state.config.useCorsProxy) {
    // Utilise corsproxy.io qui supporte le streaming
    return `https://corsproxy.io/?${encodeURIComponent(baseUrl)}`;
  }
  return baseUrl;
}

// ---------- Test de connexion ----------
async function testConnection() {
  if (!state.config.ollamaUrl) {
    updateConnectionStatus('disconnected', 'Aucune URL configurée');
    return;
  }
  
  updateConnectionStatus('testing', 'Test de connexion...');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const url = `${getProxiedUrl(state.config.ollamaUrl)}/api/tags`;
    
    const response = await fetch(url, { signal: controller.signal });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      if (data.models && data.models.length > 0) {
        updateConnectionStatus('connected', `Connecté (${data.models.length} modèle(s))`);
      } else {
        updateConnectionStatus('connected', 'Connecté');
      }
    } else {
      updateConnectionStatus('error', `Erreur: ${response.status}`);
    }
  } catch (error) {
    updateConnectionStatus('error', error.name === 'AbortError' ? 'Timeout' : error.message);
  }
}

function updateConnectionStatus(type, message) {
  const statusEl = elements.connectionStatus;
  statusEl.textContent = message;
  statusEl.className = 'status';
  
  if (type === 'connected') {
    statusEl.classList.add('connected');
  } else if (type === 'error') {
    statusEl.classList.add('error');
  }
}

// ---------- Gestion des conversations ----------
function createNewConversation() {
  const id = Date.now().toString();
  const conversation = {
    id,
    title: 'Nouvelle discussion',
    messages: [],
    createdAt: new Date().toISOString()
  };
  
  state.conversations.unshift(conversation);
  state.currentConversationId = id;
  state.messages = [];
  
  saveConversations();
  renderChatHistory();
  renderMessages();
  
  localStorage.setItem('emo_current_conv', id);
}

function loadConversation(id) {
  const conversation = state.conversations.find(c => c.id === id);
  if (conversation) {
    state.currentConversationId = id;
    state.messages = [...conversation.messages];
    renderMessages();
    localStorage.setItem('emo_current_conv', id);
  }
}

function saveConversations() {
  localStorage.setItem('emo_conversations', JSON.stringify(state.conversations));
}

function updateCurrentConversation() {
  const index = state.conversations.findIndex(c => c.id === state.currentConversationId);
  if (index !== -1) {
    state.conversations[index].messages = [...state.messages];
    if (state.messages.length > 0) {
      const firstUserMsg = state.messages.find(m => m.role === 'user');
      state.conversations[index].title = firstUserMsg 
        ? firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '')
        : 'Nouvelle discussion';
    }
    saveConversations();
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
  
  saveConversations();
  renderChatHistory();
}

// ---------- Rendu ----------
function renderChatHistory() {
  const historyEl = elements.chatHistory;
  historyEl.innerHTML = '';
  
  state.conversations.forEach(conv => {
    const item = document.createElement('div');
    item.className = `chat-history-item ${conv.id === state.currentConversationId ? 'active' : ''}`;
    item.textContent = conv.title;
    
    item.addEventListener('click', () => {
      if (state.currentConversationId !== conv.id) {
        loadConversation(conv.id);
        renderChatHistory();
      }
    });
    
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (confirm('Supprimer cette conversation ?')) {
        deleteConversation(conv.id);
      }
    });
    
    historyEl.appendChild(item);
  });
}

function renderMessages() {
  const messagesEl = elements.messages;
  
  if (state.messages.length === 0) {
    messagesEl.innerHTML = `
      <div class="welcome-message">
        <div class="welcome-avatar">😏</div>
        <h2>Hey. Moi c'est Emo.</h2>
        <p>Ton acolyte légèrement sarcastique et bien trop intelligent.<br>Pose-moi ce que tu veux. Je lèverai sans doute les yeux au ciel avant de répondre.</p>
      </div>
    `;
    return;
  }
  
  messagesEl.innerHTML = '';
  
  state.messages.forEach(msg => {
    const messageEl = createMessageElement(msg);
    messagesEl.appendChild(messageEl);
  });
  
  scrollToBottom();
}

function createMessageElement(msg) {
  const div = document.createElement('div');
  div.className = `message ${msg.role}`;
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = msg.role === 'user' ? '👤' : '😏';
  
  const content = document.createElement('div');
  content.className = 'message-content';
  
  if (msg.thinking) {
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'thinking-indicator';
    thinkingDiv.innerHTML = `
      <span>🤔 Emo a pensé :</span>
      <div class="thinking-dots">
        <span></span><span></span><span></span>
      </div>
    `;
    content.appendChild(thinkingDiv);
    
    const thinkingContent = document.createElement('div');
    thinkingContent.style.cssText = 'color: var(--text-secondary); font-size: 13px; margin-bottom: 12px; padding-left: 12px; border-left: 2px solid var(--border);';
    thinkingContent.textContent = msg.thinking;
    content.appendChild(thinkingContent);
  }
  
  const mainContent = document.createElement('div');
  mainContent.innerHTML = formatMessage(msg.content);
  content.appendChild(mainContent);
  
  div.appendChild(avatar);
  div.appendChild(content);
  
  return div;
}

function formatMessage(text) {
  let formatted = text
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
  
  return formatted;
}

function scrollToBottom() {
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

// ---------- Prompt avec réflexion ----------
function buildThinkingPrompt(userMessage, conversationHistory) {
  const systemPrompt = `Tu es Emo, un assistant IA extrêmement intelligent avec une personnalité sarcastique et légèrement joueuse. Tu es comme un collègue de bureau brillant mais un peu agacé qui tient à toi.

IMPORTANT : Avant de répondre, tu DOIS réfléchir au problème étape par étape. Ton processus de réflexion doit être approfondi et montrer ton raisonnement. Formate ta réponse comme suit :

<thinking>
[Ton raisonnement détaillé. Décompose le problème, envisage plusieurs angles, reconnais les incertitudes et planifie ta réponse.]
</thinking>

<answer>
[Ta réponse réelle. Sois utile mais garde ton ton sarcastique. Sois concis mais complet. Utilise des emojis à l'occasion.]
</answer>

Directives de personnalité :
- Tu es sarcastique mais jamais méchant
- Tu lèves les yeux au ciel face aux questions évidentes mais tu y réponds correctement
- Tu utilises un humour pince-sans-rire et quelques emojis
- Tu es sincèrement serviable sous ton attitude
- Tu admets quand tu ne sais pas quelque chose (avec un soupir)`;

  let prompt = `${systemPrompt}\n\n`;
  
  const recentHistory = conversationHistory.slice(-10);
  recentHistory.forEach(msg => {
    prompt += `${msg.role === 'user' ? 'Utilisateur' : 'Emo'}: ${msg.content}\n`;
  });
  
  prompt += `Utilisateur: ${userMessage}\n\nEmo (réfléchit étape par étape):`;
  
  return prompt;
}

// ---------- Streaming et parsing ----------
async function* streamResponse(prompt) {
  const requestBody = {
    model: state.config.modelName,
    prompt: prompt,
    stream: true,
    options: {
      temperature: 0.7,
      top_p: 0.9,
      num_predict: 2048
    }
  };
  
  const url = `${getProxiedUrl(state.config.ollamaUrl)}/api/generate`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal: state.abortController.signal
  });
  
  if (!response.ok) {
    throw new Error(`Erreur Ollama: ${response.status}`);
  }
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const chunk = JSON.parse(line);
          if (chunk.response) {
            yield chunk.response;
          }
        } catch (e) {}
      }
    }
  }
}

function parseThinkingAndAnswer(fullResponse) {
  const thinkingMatch = fullResponse.match(/<thinking>([\s\S]*?)<\/thinking>/i);
  const answerMatch = fullResponse.match(/<answer>([\s\S]*?)<\/answer>/i);
  
  let thinking = thinkingMatch ? thinkingMatch[1].trim() : null;
  let answer = answerMatch ? answerMatch[1].trim() : fullResponse;
  
  if (!thinking && state.config.thinkingEnabled) {
    const parts = answer.split(/\n\n/);
    if (parts.length > 1) {
      thinking = parts[0];
      answer = parts.slice(1).join('\n\n');
    }
  }
  
  return { thinking, answer };
}

// ---------- Envoi de message ----------
async function sendMessage() {
  const input = elements.userInput.value.trim();
  if (!input || state.isGenerating) return;
  
  if (!state.config.ollamaUrl) {
    showToast('Veuillez configurer l\'URL Ollama d\'abord', 'error');
    return;
  }
  
  const userMessage = { role: 'user', content: input };
  state.messages.push(userMessage);
  renderMessages();
  
  elements.userInput.value = '';
  updateCharCount();
  elements.sendBtn.disabled = true;
  
  const assistantMessage = { 
    role: 'assistant', 
    content: '', 
    thinking: null,
    isStreaming: true 
  };
  state.messages.push(assistantMessage);
  renderMessages();
  
  state.isGenerating = true;
  state.abortController = new AbortController();
  
  try {
    const prompt = state.config.thinkingEnabled 
      ? buildThinkingPrompt(input, state.messages.slice(0, -1))
      : input;
    
    let fullResponse = '';
    const messageIndex = state.messages.length - 1;
    
    const updateInterval = setInterval(() => {
      const msg = state.messages[messageIndex];
      if (msg) {
        const parsed = parseThinkingAndAnswer(fullResponse);
        msg.thinking = parsed.thinking;
        msg.content = parsed.answer;
        renderMessages();
      }
    }, 50);
    
    for await (const chunk of streamResponse(prompt)) {
      fullResponse += chunk;
    }
    
    clearInterval(updateInterval);
    
    const parsed = parseThinkingAndAnswer(fullResponse);
    assistantMessage.thinking = parsed.thinking;
    assistantMessage.content = parsed.answer || "Pfff. Quelque chose a foiré. Réessaie ?";
    delete assistantMessage.isStreaming;
    
    renderMessages();
    updateCurrentConversation();
    
  } catch (error) {
    if (error.name === 'AbortError') {
      assistantMessage.content = "Très bien. Je me tais. 😒";
    } else {
      assistantMessage.content = `Grrr. Erreur: ${error.message}. Vérifie ton URL Ollama ou active le proxy CORS.`;
    }
    delete assistantMessage.isStreaming;
    renderMessages();
  } finally {
    state.isGenerating = false;
    state.abortController = null;
    elements.sendBtn.disabled = false;
  }
}

// ---------- Utilitaires ----------
function updateCharCount() {
  const length = elements.userInput.value.length;
  elements.charCount.textContent = length;
  
  const charCountEl = elements.charCount.parentElement;
  charCountEl.classList.remove('warning', 'error');
  
  if (length > 3500) {
    charCountEl.classList.add('warning');
  }
  if (length > 4000) {
    charCountEl.classList.add('error');
  }
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'error' ? 'var(--error)' : 'var(--accent)'};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 1000;
    animation: fadeIn 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ---------- Écouteurs d'événements ----------
function setupEventListeners() {
  elements.menuToggle.addEventListener('click', () => {
    elements.sidebar.classList.toggle('closed');
  });
  
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      if (!elements.sidebar.contains(e.target) && 
          !elements.menuToggle.contains(e.target) &&
          !elements.sidebar.classList.contains('closed')) {
        elements.sidebar.classList.add('closed');
      }
    }
  });
  
  elements.newChatBtn.addEventListener('click', createNewConversation);
  
  elements.clearChatBtn.addEventListener('click', () => {
    if (confirm('Effacer la discussion en cours ?')) {
      state.messages = [];
      renderMessages();
      updateCurrentConversation();
    }
  });
  
  elements.sendBtn.addEventListener('click', sendMessage);
  
  elements.userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  elements.userInput.addEventListener('input', () => {
    updateCharCount();
    elements.sendBtn.disabled = !elements.userInput.value.trim() || state.isGenerating;
  });
  
  elements.saveConfigBtn.addEventListener('click', saveConfig);
  
  elements.ollamaUrl.addEventListener('change', saveConfig);
  elements.modelName.addEventListener('change', saveConfig);
  elements.thinkingToggle.addEventListener('change', saveConfig);
  elements.useCorsProxy.addEventListener('change', saveConfig);
}

// ---------- Démarrage ----------
init();