// ============================================================
// EMO - VERSION ULTIME (proxy public intégré)
// ============================================================

(function() {
  console.log('🚀 Emo ultime démarré');

  // État
  const state = {
    config: {
      ollamaUrl: 'https://gluey-daxton-immiscible.ngrok-free.dev',
      modelName: 'hf.co/bartowski/Qwen2.5-Coder-7B-Instruct-abliterated-GGUF:Q8_0',
      thinkingEnabled: true,
      useProxy: true
    },
    messages: [],
    isGenerating: false
  };

  let elements = {};

  function initElements() {
    elements = {
      ollamaUrl: document.getElementById('ollamaUrl'),
      modelName: document.getElementById('modelName'),
      thinkingToggle: document.getElementById('thinkingToggle'),
      useProxy: document.getElementById('useCorsProxy'),
      saveConfigBtn: document.getElementById('saveConfigBtn'),
      connectionStatus: document.getElementById('connectionStatus'),
      messages: document.getElementById('messages'),
      userInput: document.getElementById('userInput'),
      sendBtn: document.getElementById('sendBtn'),
      newChatBtn: document.getElementById('newChatBtn'),
      charCount: document.getElementById('charCount')
    };
  }

  function loadStoredConfig() {
    const url = localStorage.getItem('emo_ollama_url');
    const model = localStorage.getItem('emo_model_name');
    const thinking = localStorage.getItem('emo_thinking');
    const proxy = localStorage.getItem('emo_use_proxy');
    if (url) state.config.ollamaUrl = url;
    if (model) state.config.modelName = model;
    if (thinking !== null) state.config.thinkingEnabled = thinking !== 'false';
    if (proxy !== null) state.config.useProxy = proxy === 'true';
    console.log('📦 Config chargée :', state.config);
  }

  function populateUI() {
    elements.ollamaUrl.value = state.config.ollamaUrl;
    elements.modelName.value = state.config.modelName;
    elements.thinkingToggle.checked = state.config.thinkingEnabled;
    elements.useProxy.checked = state.config.useProxy;
  }

  function saveConfig() {
    state.config.ollamaUrl = elements.ollamaUrl.value.trim();
    state.config.modelName = elements.modelName.value.trim();
    state.config.thinkingEnabled = elements.thinkingToggle.checked;
    state.config.useProxy = elements.useProxy.checked;
    localStorage.setItem('emo_ollama_url', state.config.ollamaUrl);
    localStorage.setItem('emo_model_name', state.config.modelName);
    localStorage.setItem('emo_thinking', state.config.thinkingEnabled);
    localStorage.setItem('emo_use_proxy', state.config.useProxy);
    console.log('💾 Config sauvegardée');
    testConnection();
  }

  function buildUrl(endpoint) {
    const base = state.config.ollamaUrl.replace(/\/$/, '');
    const target = base + endpoint;
    if (!state.config.useProxy) {
      console.log('🔗 Direct :', target);
      return target;
    }
    // Utilisation systématique de corsproxy.io
    const proxy = 'https://corsproxy.io/?';
    const finalUrl = proxy + encodeURIComponent(target);
    console.log('🔗 Proxy corsproxy.io :', finalUrl);
    return finalUrl;
  }

  async function testConnection() {
    const url = buildUrl('/api/tags');
    console.log('🔌 Test :', url);
    elements.connectionStatus.textContent = 'Test...';
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        elements.connectionStatus.textContent = `✅ Connecté (${data.models?.length || 0} modèles)`;
        console.log('✅ Modèles :', data.models);
      } else {
        const text = await res.text();
        elements.connectionStatus.textContent = `Erreur HTTP ${res.status}`;
        console.error('❌', text);
      }
    } catch (e) {
      elements.connectionStatus.textContent = e.name === 'AbortError' ? 'Timeout' : e.message;
      console.error('🔥', e);
    }
  }

  function renderMessages() {
    if (state.messages.length === 0) {
      elements.messages.innerHTML = '<div class="welcome-message"><div class="welcome-avatar">😏</div><h2>Hey. Prêt à coder.</h2></div>';
      return;
    }
    let html = '';
    state.messages.forEach(m => {
      const avatar = m.role === 'user' ? '👤' : '😏';
      html += `<div class="message ${m.role}"><div class="message-avatar">${avatar}</div><div class="message-content">${m.content.replace(/</g,'&lt;').replace(/\n/g,'<br>')}</div></div>`;
    });
    elements.messages.innerHTML = html;
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }

  async function sendMessage() {
    const input = elements.userInput.value.trim();
    if (!input || state.isGenerating) return;
    state.messages.push({ role: 'user', content: input });
    renderMessages();
    elements.userInput.value = '';
    elements.sendBtn.disabled = true;
    state.isGenerating = true;
    const assistantMsg = { role: 'assistant', content: '' };
    state.messages.push(assistantMsg);
    renderMessages();
    try {
      const url = buildUrl('/api/generate');
      console.log('📤 Envoi à :', url);
      const body = {
        model: state.config.modelName,
        prompt: state.config.thinkingEnabled ? `Tu es Emo, assistant sarcastique. Réponds à : ${input}` : input,
        stream: false,
        options: { temperature: 0.7, num_predict: 2048 }
      };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      assistantMsg.content = data.response;
    } catch (e) {
      assistantMsg.content = `Erreur : ${e.message}`;
    } finally {
      state.isGenerating = false;
      elements.sendBtn.disabled = false;
      renderMessages();
    }
  }

  function setupListeners() {
    elements.saveConfigBtn.addEventListener('click', saveConfig);
    elements.sendBtn.addEventListener('click', sendMessage);
    elements.newChatBtn.addEventListener('click', () => {
      state.messages = [];
      renderMessages();
    });
    elements.userInput.addEventListener('input', () => {
      elements.charCount.textContent = elements.userInput.value.length;
      elements.sendBtn.disabled = !elements.userInput.value.trim() || state.isGenerating;
    });
    elements.userInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
  }

  function init() {
    initElements();
    loadStoredConfig();
    populateUI();
    setupListeners();
    renderMessages();
    testConnection();
  }

  init();
})();
