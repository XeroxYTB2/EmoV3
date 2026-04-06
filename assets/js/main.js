// EMO Web Interface - JavaScript Implementation with Backend API

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const newChatBtn = document.getElementById('new-chat-btn');
    const openMemoryBtn = document.getElementById('open-memory-btn');
    const openConfigBtn = document.getElementById('open-config-btn');
    const adminBtn = document.getElementById('admin-btn');
    const statusValue = document.getElementById('status-value');
    const privilegeValue = document.getElementById('privilege-value');
    const modelValue = document.getElementById('model-value');
    const devicesValue = document.getElementById('devices-value');
    const securityValue = document.getElementById('security-value');
    const modelChip = document.getElementById('model-chip');
    const chatMessages = document.getElementById('chat-messages');
    const inputText = document.getElementById('input-text');
    const sendBtn = document.getElementById('send-btn');
    
    // State
    let processing = false;
    let history = [];
    let conversationId = null;
    let config = {
        version: "EMO Web",
        ollama: {
            model: "",
            url: "http://127.0.0.1:11434/api/generate"
        },
        devices: {},
        security: {
            sensitive_actions: []
        },
        ui: {
            show_thinking: true
        }
    };
    
    // Backend configuration - in production, this would be your Colab endpoint
    const BACKEND_URL = "https://gluey-daxton-immiscible.ngrok-free.dev/"; // Replace with actual Colab URL
    const API_ENDPOINT = `${BACKEND_URL}/chat`;
    const HEALTH_ENDPOINT = `${BACKEND_URL}/health`;
    
    // Initialize
    function init() {
        loadConfig();
        refreshSidebarInfo();
        renderHistory();
        ensurePasswordIsConfigured();
        
        // Test backend connection
        testBackendConnection();
        
        // Event Listeners
        newChatBtn.addEventListener('click', newConversation);
        openMemoryBtn.addEventListener('click', openMemoryFolder);
        openConfigBtn.addEventListener('click', openConfigFile);
        adminBtn.addEventListener('click', restartAsAdmin);
        sendBtn.addEventListener('click', sendMessage);
        inputText.addEventListener('keydown', handleKeyDown);
    }
    
    // Configuration
    function loadConfig() {
        // In a real implementation, this would load from localStorage or a config file
        // For now, we'll use defaults
        config = JSON.parse(localStorage.getItem('emoConfig') || '{}');
        if (!config.ollama) config.ollama = {};
        if (!config.devices) config.devices = {};
        if (!config.security) config.security = { sensitive_actions: [] };
        if (!config.ui) config.ui = { show_thinking: true };
    }
    
    function saveConfig() {
        localStorage.setItem('emoConfig', JSON.stringify(config));
    }
    
    // Backend Connection
    function testBackendConnection() {
        fetch(HEALTH_ENDPOINT)
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('Backend connection failed');
            })
            .then(data => {
                logger.info('Backend connected:', data);
                statusValue.textContent = "Connecté au backend IA";
                modelValue.textContent = data.model || "Modèle chargé";
            })
            .catch(error => {
                logger.warn('Backend not available, using simulation:', error);
                statusValue.textContent = "Backend IA non disponible (mode simulation)";
                // Continue with simulation
            });
    }
    
    // Sidebar Info
    function refreshSidebarInfo() {
        const model = config.ollama.model || "";
        const devices = config.devices || {};
        const protectedActions = config.security.sensitive_actions || [];
        const isAdmin = false; // In web context, we can't check Windows admin
        
        privilegeValue.textContent = isAdmin ? "Admin Windows actif" : "Session standard";
        modelValue.textContent = model || "Non configuré";
        devicesValue.textContent = `${Object.keys(devices).length} appareil(s) configuré(s)`;
        securityValue.textContent = `${protectedActions.length} action(s) sensible(s)`;
        
        // Update model chip
        const modelChipText = model.split("/").pop() || model;
        modelChip.textContent = modelChipText.length > 52 ? 
            modelChipText.substring(0, 49) + "..." : 
            modelChipText || "";
        
        // Admin button state
        adminBtn.textContent = isAdmin ? "Mode admin actif" : "Relancer en admin";
        adminBtn.disabled = isAdmin;
    }
    
    // Chat Functions
    function renderHistory() {
        chatMessages.innerHTML = "";
        
        if (history.length === 0) {
            addSystemMessage("Bienvenue dans EMO Web. Décris le but final; l'agent choisira ses outils, demandera le mot de passe pour les actions sensibles, puis poursuivra jusqu'au résultat.");
            return;
        }
        
        // Show last 25 messages
        const recentHistory = history.slice(-25);
        recentHistory.forEach(turn => {
            if (turn.user) {
                addUserMessage(turn.user);
            }
            if (turn.assistant) {
                addAssistantMessage(turn.assistant, turn.steps || [], turn.elapsed);
            }
        });
        
        scrollToBottom();
    }
    
    function addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user';
        messageDiv.innerHTML = `
            <div class="message-header">
                <div class="message-title user">Vous</div>
                <div class="message-actions">
                    <button class="action-btn" onclick="copyToClipboard(this)">Copier</button>
                    <button class="action-btn" onclick="reuseInInput(this)">Réutiliser</button>
                </div>
            </div>
            <div class="message-content">${escapeHtml(text)}</div>
        `;
        chatMessages.appendChild(messageDiv);
    }
    
    function addAssistantMessage(text, steps = [], elapsed = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant';
        
        let metaHtml = '';
        if (elapsed !== null) {
            metaHtml = `<div class="message-meta">${elapsed}s</div>`;
        }
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <div class="message-title assistant">EMO</div>
                <div class="message-actions">
                    <button class="action-btn" onclick="copyToClipboard(this)">Copier</button>
                </div>
            </div>
            <div class="message-content">${escapeHtml(text)}</div>
            ${metaHtml}
        `;
        
        // Add thinking block if enabled and steps exist
        if (config.ui.show_thinking && steps && steps.length > 0) {
            const thinkingText = formatThinking(steps);
            if (thinkingText) {
                const thinkingDiv = document.createElement('div');
                thinkingDiv.className = 'thinking-block';
                thinkingDiv.innerHTML = `
                    <div class="thinking-header" onclick="toggleThinking(this)">
                        <span class="thinking-title">Thinking</span>
                        <span class="thinking-toggle">▼</span>
                    </div>
                    <div class="thinking-content">${escapeHtml(thinkingText)}</div>
                `;
                messageDiv.appendChild(thinkingDiv);
            }
        }
        
        // Add actions block if steps exist
        if (steps && steps.length > 0) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'actions-block';
            actionsDiv.innerHTML = '<div class="actions-title">Actions exécutées</div>';
            
            steps.forEach(step => {
                step.actions.forEach(action => {
                    const actionCard = document.createElement('div');
                    actionCard.className = 'action-card';
                    actionCard.innerHTML = `
                        <div class="action-command">${escapeHtml(action.command || '')}</div>
                        <div class="action-result">${escapeHtml(action.result || '')}</div>
                    `;
                    actionsDiv.appendChild(actionCard);
                });
            });
            
            messageDiv.appendChild(actionsDiv);
        }
        
        chatMessages.appendChild(messageDiv);
    }
    
    function addSystemMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system';
        messageDiv.innerHTML = `
            <div class="message-header">
                <div class="message-title system">Système</div>
            </div>
            <div class="message-content">${escapeHtml(text)}</div>
        `;
        chatMessages.appendChild(messageDiv);
    }
    
    function formatThinking(steps) {
        const thoughts = [];
        steps.forEach((step, index) => {
            if (step.thinking) {
                thoughts.push(`Étape ${step.step + 1} : ${step.thinking}`);
            }
        });
        return thoughts.join('\n\n');
    }
    
    function toggleThinking(element) {
        const thinkingBlock = element.parentElement.nextElementSibling;
        const toggleIcon = element.querySelector('.thinking-toggle');
        
        if (thinkingBlock.style.display === 'none') {
            thinkingBlock.style.display = 'block';
            toggleIcon.textContent = '▲';
        } else {
            thinkingBlock.style.display = 'none';
            toggleIcon.textContent = '▼';
        }
    }
    
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Conversation Functions
    function newConversation() {
        history = [];
        conversationId = null;
        saveHistory();
        chatMessages.innerHTML = "";
        addSystemMessage("Nouvelle conversation prête. Les appareils et réglages restent inchangés.");
    }
    
    function openMemoryFolder() {
        // In web context, we can't open local folders directly
        showNotification("Dans une application web, l'accès au dossier de mémoire local n'est pas disponible pour des raisons de sécurité.");
    }
    
    function openConfigFile() {
        // In web context, we can't open local files directly
        showNotification("Dans une application web, l'accès au fichier de configuration local n'est pas disponible pour des raisons de sécurité.");
    }
    
    function restartAsAdmin() {
        showNotification("Le redémarrage en mode administrateur n'est pas applicable dans une application web.");
    }
    
    // Input Handling
    function handleKeyDown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
        // Allow Shift+Enter for new line
    }
    
    function sendMessage() {
        if (processing) return;
        
        const userText = inputText.value.trim();
        if (!userText) return;
        
        // Clear input
        inputText.value = '';
        
        // Add user message
        addUserMessage(userText);
        scrollToBottom();
        
        // Set processing state
        setBusy(true, "EMO observe et planifie");
        
        // Send to backend API
        fetchAPI(userText)
            .then(result => {
                // Add assistant message
                addAssistantMessage(result.reply, result.steps, result.elapsed);
                
                // Save to history
                history.push({
                    user: userText,
                    assistant: result.reply,
                    steps: result.steps,
                    elapsed: result.elapsed,
                    created_at: new Date().toISOString()
                });
                saveHistory();
                
                // Reset processing state
                setBusy(false, "Prêt");
            })
            .catch(error => {
                logger.error('API call failed:', error);
                // Fallback to simulation
                const mockResponse = {
                    reply: `Je rencontre des difficultés à me connecter au backend IA. Voici une réponse simulée : Votre message était "${userText}"`,
                    steps: [
                        {
                            step: 1,
                            thinking: "Analyse de la demande et préparation d'une réponse de secours.",
                            actions: [
                                {
                                    "command": "fallback_response",
                                    "result": "Réponse simulée générée en raison de l'indisponibilité du backend"
                                }
                            ]
                        }
                    ],
                    elapsed: 1
                };
                
                addAssistantMessage(mockResponse.reply, mockResponse.steps, mockResponse.elapsed);
                
                // Save to history
                history.push({
                    user: userText,
                    assistant: mockResponse.reply,
                    steps: mockResponse.steps,
                    elapsed: mockResponse.elapsed,
                    created_at: new Date().toISOString()
                });
                saveHistory();
                
                // Reset processing state
                setBusy(false, "Prêt");
            });
    }
    
    function fetchAPI(userText) {
        const requestData = {
            message: userText,
            conversation_id: conversationId,
            history: history
        };
        
        return fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Update conversation ID if not set
            if (!conversationId) {
                conversationId = data.conversation_id;
            }
            return data;
        });
    }
    
    function setBusy(busy, statusText) {
        processing = busy;
        statusValue.textContent = statusText;
        sendBtn.disabled = busy;
        inputText.disabled = busy;
        
        if (busy) {
            startStatusAnimation();
        } else {
            stopStatusAnimation();
            inputText.focus();
        }
    }
    
    // Status Animation
    let statusJob = null;
    const statusFrames = [
        "EMO observe et planifie",
        "EMO observe et planifie.",
        "EMO observe et planifie..",
        "EMO observe et planifie..."
    ];
    let statusFrameIndex = 0;
    
    function animateStatus() {
        if (!processing) {
            statusJob = null;
            return;
        }
        statusFrameIndex = (statusFrameIndex + 1) % statusFrames.length;
        statusValue.textContent = statusFrames[statusFrameIndex];
        statusJob = setTimeout(animateStatus, 500);
    }
    
    function startStatusAnimation() {
        stopStatusAnimation();
        statusFrameIndex = 0;
        statusJob = setTimeout(animateStatus, 500);
    }
    
    function stopStatusAnimation() {
        if (statusJob !== null) {
            clearTimeout(statusJob);
            statusJob = null;
        }
    }
    
    // History Management
    function saveHistory() {
        localStorage.setItem('emoHistory', JSON.stringify(history));
    }
    
    function loadHistory() {
        const saved = localStorage.getItem('emoHistory');
        if (saved) {
            history = JSON.parse(saved);
        }
    }
    
    // Password Management
    function ensurePasswordIsConfigured() {
        // In web context, we'll use localStorage for password hash
        const passwordHash = localStorage.getItem('emoPasswordHash');
        if (passwordHash) {
            // Password is set
            return;
        }
        
        // Show password setup dialog
        showPasswordSetupDialog();
    }
    
    function showPasswordSetupDialog() {
        // Create dialog elements
        const dialog = document.createElement('div');
        dialog.className = 'password-dialog';
        dialog.innerHTML = `
            <div class="password-dialog-content">
                <h2>Sécuriser EMO Web</h2>
                <p>Définis un mot de passe pour autoriser les actions sensibles.</p>
                <input type="password" id="password1" placeholder="Nouveau mot de passe">
                <input type="password" id="password2" placeholder="Confirmer le mot de passe">
                <div class="error-state" id="password-message"></div>
                <div>
                    <button id="password-save">Enregistrer</button>
                    <button id="password-cancel" class="cancel-btn">Annuler</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Get elements
        const password1 = dialog.querySelector('#password1');
        const password2 = dialog.querySelector('#password2');
        const messageEl = dialog.querySelector('#password-message');
        const saveBtn = dialog.querySelector('#password-save');
        const cancelBtn = dialog.querySelector('#password-cancel');
        
        // Handle save
        saveBtn.addEventListener('click', () => {
            const first = password1.value;
            const second = password2.value;
            
            if (!first) {
                messageEl.textContent = "Le mot de passe ne peut pas être vide.";
                return;
            }
            if (first !== second) {
                messageEl.textContent = "Les deux mots de passe ne correspondent pas.";
                return;
            }
            
            // Simple hash simulation (in real app, use proper hashing)
            const hash = btoa(first); // Base64 encoding for demo only
            localStorage.setItem('emoPasswordHash', hash);
            dialog.remove();
        });
        
        // Handle cancel
        cancelBtn.addEventListener('click', () => {
            dialog.remove();
            // In a real app, you might want to prevent usage without password
        });
        
        // Handle Enter key
        password2.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveBtn.click();
            }
        });
        
        // Focus first input
        password1.focus();
    }
    
    // Utility Functions
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function copyToClipboard(button) {
        const messageElement = button.closest('.message');
        const contentElement = messageElement.querySelector('.message-content');
        const text = contentElement.textContent;
        
        navigator.clipboard.writeText(text).then(() => {
            const originalText = statusValue.textContent;
            statusValue.textContent = "Texte copié dans le presse-papiers.";
            setTimeout(() => {
                statusValue.textContent = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    }
    
    function reuseInInput(button) {
        const messageElement = button.closest('.message');
        const contentElement = messageElement.querySelector('.message-content');
        const text = contentElement.textContent;
        
        inputText.value = text;
        inputText.focus();
        statusValue.textContent = "Texte réinjecté dans la zone de saisie.";
        
        // Reset status after delay
        setTimeout(() => {
            if (!processing) {
                statusValue.textContent = "Prêt";
            }
        }, 2000);
    }
    
    function showNotification(message) {
        const originalText = statusValue.textContent;
        statusValue.textContent = message;
        setTimeout(() => {
            if (!processing) {
                statusValue.textContent = originalText;
            }
        }, 3000);
    }
    
    // Initialize app
    init();
    loadHistory();
});

// Make functions globally accessible for HTML onclick attributes
function copyToClipboard(button) {
    // This will be overridden by the init function's version
    // Keeping for HTML attribute compatibility
    alert('Copy function not initialized');
}

function reuseInInput(button) {
    // This will be overridden by the init function's version
    // Keeping for HTML attribute compatibility
    alert('Reuse function not initialized');
}

function toggleThinking(element) {
    // This will be overridden by the init function's version
    // Keeping for HTML attribute compatibility
    alert('Thinking toggle not initialized');
}
