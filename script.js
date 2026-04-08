// ============================================================
// EMO - Version finale déploiement GitHub Pages
// ============================================================

(function() {
  console.log('🚀 Emo initialisé');

  // ---------- État global ----------
  const state = {
    config: {
      ollamaUrl: localStorage.getItem('emo_ollama_url') || 'https://gluey-daxton-immiscible.ngrok-free.dev',
      modelName: localStorage.getItem('emo_model_name') || 'hf.co/bartowski/Qwen2.5-Coder-7B-Instruct-abliterated-GGUF:Q8_0',
      thinkingEnabled: localStorage.getItem('emo_thinking') !== 'false',
      useProxy: localStorage.getItem('emo_use_proxy') === 'true',
      proxyUrl: localStorage.getItem('emo_proxy_url') || ''
    },
    conversations: JSON.parse(localStorage.getItem('emo_conversations') || '[]'),
    currentConversationId: localStorage.getItem('emo_current_conv') || null,
    messages: [],
    isGenerating: false,
    abortController: null
  };

  let elements = {};

  // ---------- Initialisation des éléments DOM ----------
  function initElements() {
    elements = {
      ollamaUrl: document.getElementById('ollamaUrl'),
      modelName: document.getElementById('modelName'),
      thinkingToggle: document.getElementById('thinkingToggle'),
      useProxy: document.getElementById('useCorsProxy'),
      proxyUrl: document.getElementById('proxyUrl'),
      saveConfigBtn: document.getElementById('saveConfigBtn'),
      connectionStatus: document.getElementById('connectionStatus'),
      messages: document.getElementById('messages'),
      userInput: document.getElementById('userInput'),
      sendBtn: document.getElementById('sendBtn'),
      newChatBtn: document.getElementById('newChatBtn'),
      clearChatBtn: document.getElementById('clearChatBtn'),
      charCount: document.getElementById('charCount'),
      chatHistory: document.getElementById('chatHistory'),
      sidebar: document.getElementById('sidebar'),
      menuToggle: document.getElementById('menuToggle')
    };
  }

  // ---------- Initialisation ----------
  function init() {
    initElements();
    loadConfigToUI();
    loadConversations();
    setupListeners();
    renderChatHistory();
    if (state.config.ollamaUrl) testConnection();
  }

  // ---------- Configuration UI ----------
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

    localStorage.setItem('emo_ollama_url', state.config.ollamaUrl);
    localStorage.setItem('emo_model_name', state.config.modelName);
    localStorage.setItem('emo_thinking', state.config.thinkingEnabled);
    localStorage.setItem('emo_use_proxy', state.config.useProxy);
    if (state.config.proxyUrl) localStorage.setItem('emo_proxy_url', state.config.proxyUrl);

    showToast('Configuration enregistrée', 'success');
    testConnection();
  }

  // ---------- Proxy ----------
  function getBaseUrl() {
    let base = state.config.ollamaUrl.replace(/\/$/, '');
    if (state.config.useProxy && state.config.proxyUrl) {
      base = state.config.proxyUrl.replace(/\/$/, '');
    }
    return base;
  }

  // ---------- Test de connexion ----------
  async function testConnection() {
    const base = getBaseUrl();
    const url = `${base}/api/tags`;
    console.log(`🔌 Test connexion vers ${url}`);

    updateStatus('testing', 'Test...');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        const count = data.models?.length || 0;
        updateStatus('connected', `✅ Connecté (${count} modèle(s))`);
        console.log('✅ Modèles:', data.models.map(m => m.name));
      } else {
        updateStatus('error', `Erreur HTTP ${response.status}`);
        console.error('Réponse erreur:', await response.text());
      }
    } catch (e) {
      updateStatus('error', e.name === 'AbortError' ? 'Timeout' : e.message);
      console.error('Erreur connexion:', e);
    }
  }

  function updateStatus(type, text) {
    elements.connectionStatus.textContent = text;
    elements.connectionStatus.className = 'status ' + (type === 'connected' ? 'connected' : type === 'error' ? 'error' : '');
  }

  function showToast(msg, type) {
    console.log(`🔔 ${msg}`);
    // Tu peux ajouter un vrai toast ici si tu veux
  }

  // ---------- Conversations ----------
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
        const first = state.messages.find(m => m.role === 'user');
        state.conversations[existing].title = first ? first.content.slice(0, 30) : 'Sans titre';
      }
    } else if (state.messages.length > 0) {
      const first = state.messages.find(m => m.role === 'user');
      state.conversations.unshift({
        id: state.currentConversationId,
        title: first ? first.content.slice(0, 30) : 'Nouvelle discussion',
        messages: state.messages,
        createdAt: new Date().toISOString()
      });
    }
    localStorage.setItem('emo_conversations', JSON.stringify(state.conversations));
    localStorage.setItem('emo_current_conv', state.currentConversationId);
  }

  function loadConversation(id) {
    const conv = state.conversations.find(c => c.id === id);
    if (conv) {
      state.currentConversationId = id;
      state.messages = [...conv.messages];
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
    saveConversationsToStorage();
    renderChatHistory();
  }

  function saveConversationsToStorage() {
    localStorage.setItem('emo_conversations', JSON.stringify(state.conversations));
    localStorage.setItem('emo_current_conv', state.currentConversationId);
  }

  // ---------- Rendu UI ----------
  function renderChatHistory() {
    if (!elements.chatHistory) return;
    elements.chatHistory.innerHTML = '';
    state.conversations.forEach(c => {
      const div = document.createElement('div');
      div.className = `chat-history-item ${c.id === state.currentConversationId ? 'active' : ''}`;
      div.textContent = c.title;
      div.onclick = () => { loadConversation(c.id); };
      div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (confirm('Supprimer cette conversation ?')) {
          deleteConversation(c.id);
        }
      });
      elements.chatHistory.appendChild(div);
    });
  }

  function renderMessages() {
    if (state.messages.length === 0) {
      elements.messages.innerHTML = `
        <div class="welcome-message">
          <div class="welcome-avatar">😏</div>
          <h2>Hey. Moi c'est Emo.</h2>
          <p>Ton acolyte légèrement sarcastique et bien trop intelligent.<br>Pose-moi ce que tu veux. Je lèverai sans doute les yeux au ciel avant de répondre.</p>
        </div>
      `;
      return;
    }
    let html = '';
    state.messages.forEach(m => {
      const avatar = m.role === 'user' ? '👤' : '😏';
      const content = formatMessage(m.content);
      html += `<div class="message ${m.role}"><div class="message-avatar">${avatar}</div><div class="message-content">${content}</div></div>`;
    });
    elements.messages.innerHTML = html;
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }

  function formatMessage(text) {
    return text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  // ---------- Envoi message ----------
  async function sendMessage() {
    const input = elements.userInput.value.trim();
    if (!input || state.isGenerating) return;

    state.messages.push({ role: 'user', content: input });
    renderMessages();
    elements.userInput.value = '';
    updateCharCount();
    elements.sendBtn.disabled = true;
    state.isGenerating = true;

    const assistantMsg = { role: 'assistant', content: '', thinking: null };
    state.messages.push(assistantMsg);
    renderMessages();

    try {
      const responseText = await callOllama(input);
      const parsed = parseThinking(responseText);
      assistantMsg.thinking = parsed.thinking;
      assistantMsg.content = parsed.answer;
    } catch (e) {
      assistantMsg.content = `Erreur: ${e.message}`;
    } finally {
      state.isGenerating = false;
      elements.sendBtn.disabled = false;
      renderMessages();
      saveConversations();
    }
  }

  async function callOllama(prompt) {
    const base = getBaseUrl();
    const url = `${base}/api/generate`;
    console.log('📤 Envoi à', url);

    const finalPrompt = state.config.thinkingEnabled ? buildThinkingPrompt(prompt) : prompt;

    const body = {
      model: state.config.modelName,
      prompt: finalPrompt,
      stream: false,
      options: { temperature: 0.7, num_predict: 2048 }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.response;
  }

  function buildThinkingPrompt(userMsg) {
    return `Tu es Emo, un assistant IA extrêmement intelligent avec une personnalité sarcastique et légèrement joueuse. Tu es comme un collègue de bureau brillant mais un peu agacé qui tient à toi.

IMPORTANT : Avant de répondre, tu DOIS réfléchir au problème étape par étape. Ton processus de réflexion doit être approfondi et montrer ton raisonnement. Formate ta réponse comme suit :

<thinking>
[Ton raisonnement détaillé. Décompose le problème, envisage plusieurs angles, reconnais les incertitudes et planifie ta réponse.]
</thinking>

<answer>
[Ta réponse réelle. Sois utile mais garde ton ton sarcastique. Sois concis mais complet. Utilise des emojis à l'occasion.]
</answer>

Utilisateur: ${userMsg}
Emo:`;
  }

  function parseThinking(full) {
    const thinkMatch = full.match(/<thinking>([\s\S]*?)<\/thinking>/i);
    const answerMatch = full.match(/<answer>([\s\S]*?)<\/answer>/i);
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

  // ---------- Event listeners ----------
  function setupListeners() {
    elements.saveConfigBtn.addEventListener('click', saveConfig);
    elements.sendBtn.addEventListener('click', sendMessage);
    elements.newChatBtn.addEventListener('click', createNewConversation);
    elements.clearChatBtn.addEventListener('click', () => {
      if (confirm('Effacer la discussion en cours ?')) {
        state.messages = [];
        renderMessages();
        saveConversations();
      }
    });
    elements.userInput.addEventListener('input', () => {
      updateCharCount();
      elements.sendBtn.disabled = !elements.userInput.value.trim() || state.isGenerating;
    });
    elements.userInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    elements.menuToggle.addEventListener('click', () => {
      elements.sidebar.classList.toggle('closed');
    });
  }

  // ---------- Démarrage ----------
  init();
})();