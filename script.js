// ============================================================
// EMO - VERSION ROBUSTE AVEC LOGS COMPLETS
// ============================================================

(function() {
  console.log('🚀 Emo initialisé');

  // ---------- État global ----------
  const state = {
    config: {
      ollamaUrl: '',
      modelName: '',
      thinkingEnabled: true,
      useProxy: false,
      proxyUrl: ''
    },
    conversations: [],
    currentConversationId: null,
    messages: [],
    isGenerating: false
  };

  let elements = {};

  // ---------- Initialisation DOM ----------
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

  // ---------- Chargement de la config stockée ----------
  function loadStoredConfig() {
    try {
      state.config.ollamaUrl = localStorage.getItem('emo_ollama_url') || 'https://gluey-daxton-immiscible.ngrok-free.dev';
      state.config.modelName = localStorage.getItem('emo_model_name') || 'hf.co/bartowski/Qwen2.5-Coder-7B-Instruct-abliterated-GGUF:Q8_0';
      state.config.thinkingEnabled = localStorage.getItem('emo_thinking') !== 'false';
      state.config.useProxy = localStorage.getItem('emo_use_proxy') === 'true';
      state.config.proxyUrl = localStorage.getItem('emo_proxy_url') || 'https://corsproxy.io/?';
    } catch (e) {
      console.warn('Erreur lecture localStorage, valeurs par défaut utilisées');
    }
    console.log('📦 Configuration chargée :', { ...state.config });
  }

  // ---------- Remplir les champs UI ----------
  function populateUI() {
    elements.ollamaUrl.value = state.config.ollamaUrl;
    elements.modelName.value = state.config.modelName;
    elements.thinkingToggle.checked = state.config.thinkingEnabled;
    elements.useProxy.checked = state.config.useProxy;
    elements.proxyUrl.value = state.config.proxyUrl;
  }

  // ---------- Sauvegarde ----------
  function saveConfig() {
    // Lire depuis l'UI
    state.config.ollamaUrl = elements.ollamaUrl.value.trim();
    state.config.modelName = elements.modelName.value.trim();
    state.config.thinkingEnabled = elements.thinkingToggle.checked;
    state.config.useProxy = elements.useProxy.checked;
    state.config.proxyUrl = elements.proxyUrl.value.trim();

    // Stocker
    localStorage.setItem('emo_ollama_url', state.config.ollamaUrl);
    localStorage.setItem('emo_model_name', state.config.modelName);
    localStorage.setItem('emo_thinking', state.config.thinkingEnabled);
    localStorage.setItem('emo_use_proxy', state.config.useProxy);
    localStorage.setItem('emo_proxy_url', state.config.proxyUrl);

    console.log('💾 Configuration sauvegardée :', { ...state.config });
    showToast('Configuration enregistrée', 'success');
    testConnection();
  }

  // ---------- Construction de l'URL ----------
  function buildUrl(endpoint) {
    let base = state.config.ollamaUrl.replace(/\/$/, '');
    const fullTarget = base + endpoint;
    
    if (!state.config.useProxy || !state.config.proxyUrl) {
      console.log(`🔗 URL directe : ${fullTarget}`);
      return fullTarget;
    }
    
    // Utilisation du proxy
    let proxy = state.config.proxyUrl.trim();
    // Nettoyage : on s'assure qu'il y a un ? à la fin pour corsproxy.io
    if (proxy.includes('corsproxy.io') && !proxy.includes('?')) {
      proxy = proxy.replace(/\/$/, '') + '/?';
    }
    // Construction selon le type de proxy
    let finalUrl;
    if (proxy.includes('corsproxy.io')) {
      // Format attendu : https://corsproxy.io/?https://cible.com/endpoint
      finalUrl = proxy + encodeURIComponent(fullTarget);
    } else {
      // Format : https://proxy.com/url=https://cible.com/endpoint (ou autre)
      finalUrl = proxy + encodeURIComponent(fullTarget);
    }
    console.log(`🔗 URL via proxy : ${finalUrl}`);
    return finalUrl;
  }

  // ---------- Test de connexion ----------
  async function testConnection() {
    const testUrl = buildUrl('/api/tags');
    console.log(`🔌 Test connexion vers : ${testUrl}`);
    updateStatus('testing', 'Test en cours...');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(testUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        const count = data.models?.length || 0;
        updateStatus('connected', `✅ Connecté (${count} modèle(s))`);
        console.log('✅ Modèles :', data.models);
      } else {
        const text = await response.text();
        updateStatus('error', `Erreur HTTP ${response.status}`);
        console.error('❌ Réponse non OK :', text.substring(0, 200));
      }
    } catch (e) {
      updateStatus('error', e.name === 'AbortError' ? 'Timeout' : e.message);
      console.error('🔥 Erreur fetch :', e);
    }
  }

  function updateStatus(type, text) {
    elements.connectionStatus.textContent = text;
    elements.connectionStatus.className = 'status ' + (type === 'connected' ? 'connected' : type === 'error' ? 'error' : '');
  }

  function showToast(msg, type) {
    console.log(`🔔 ${msg}`);
  }

  // ---------- Gestion des conversations (simplifiée) ----------
  function loadConversations() {
    try {
      const convs = localStorage.getItem('emo_conversations');
      if (convs) state.conversations = JSON.parse(convs);
      const current = localStorage.getItem('emo_current_conv');
      if (current) state.currentConversationId = current;
    } catch (e) {}
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

  function renderChatHistory() {
    if (!elements.chatHistory) return;
    elements.chatHistory.innerHTML = '';
    state.conversations.forEach(c => {
      const div = document.createElement('div');
      div.className = `chat-history-item ${c.id === state.currentConversationId ? 'active' : ''}`;
      div.textContent = c.title;
      div.onclick = () => { loadConversation(c.id); };
      elements.chatHistory.appendChild(div);
    });
  }

  function renderMessages() {
    if (state.messages.length === 0) {
      elements.messages.innerHTML = `<div class="welcome-message"><div class="welcome-avatar">😏</div><h2>Hey. Moi c'est Emo.</h2><p>Prêt à bosser.</p></div>`;
      return;
    }
    let html = '';
    state.messages.forEach(m => {
      const avatar = m.role === 'user' ? '👤' : '😏';
      html += `<div class="message ${m.role}"><div class="message-avatar">${avatar}</div><div class="message-content">${formatMessage(m.content)}</div></div>`;
    });
    elements.messages.innerHTML = html;
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }

  function formatMessage(text) {
    return text.replace(/</g, '&lt;').replace(/\n/g, '<br>');
  }

  // ---------- Envoi de message ----------
  async function sendMessage() {
    const input = elements.userInput.value.trim();
    if (!input || state.isGenerating) return;

    state.messages.push({ role: 'user', content: input });
    renderMessages();
    elements.userInput.value = '';
    updateCharCount();
    elements.sendBtn.disabled = true;
    state.isGenerating = true;

    const assistantMsg = { role: 'assistant', content: '' };
    state.messages.push(assistantMsg);
    renderMessages();

    try {
      const response = await callOllama(input);
      assistantMsg.content = response;
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
    const url = buildUrl('/api/generate');
    console.log(`📤 Envoi à : ${url}`);

    const body = {
      model: state.config.modelName,
      prompt: state.config.thinkingEnabled ? buildThinkingPrompt(prompt) : prompt,
      stream: false,
      options: { temperature: 0.7, num_predict: 2048 }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`);
    }
    const data = await response.json();
    return data.response;
  }

  function buildThinkingPrompt(userMsg) {
    return `Tu es Emo, un assistant IA extrêmement intelligent avec une personnalité sarcastique. Réfléchis d'abord dans <thinking>...</thinking> puis réponds dans <answer>...</answer>.\nUtilisateur: ${userMsg}\nEmo:`;
  }

  function updateCharCount() {
    if (elements.charCount) elements.charCount.textContent = elements.userInput.value.length;
  }

  // ---------- Écouteurs ----------
  function setupListeners() {
    elements.saveConfigBtn.addEventListener('click', saveConfig);
    elements.sendBtn.addEventListener('click', sendMessage);
    elements.newChatBtn.addEventListener('click', createNewConversation);
    elements.clearChatBtn.addEventListener('click', () => {
      if (confirm('Effacer la discussion ?')) {
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
  function init() {
    initElements();
    loadStoredConfig();
    populateUI();
    loadConversations();
    setupListeners();
    renderChatHistory();
    console.log('⚙️ Initialisation terminée, test de connexion...');
    testConnection();
  }

  init();
})();
