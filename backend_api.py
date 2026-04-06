#!/usr/bin/env python3
"""
Emo AI Backend API for Google Colab Deployment
Using Qwen2.5-Coder-7B-Instruct-abliterated model via llama-cpp-python
"""

import os
import json
import logging
import threading
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import uuid
from datetime import datetime

# Try to import llama_cpp, fallback to simulation if not available
try:
    from llama_cpp import Llama
    LLAMA_CPP_AVAILABLE = True
except ImportError:
    LLAMA_CPP_AVAILABLE = False
    logging.warning("llama-cpp-python not available, falling back to simulation")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for web frontend

# Global model instance
llm_model = None
model_lock = threading.Lock()

# Configuration
MODEL_PATH = "/tmp/Qwen2.5-Coder-7B-Instruct-abliterated-Q8_0.gguf"
MODEL_URL = "https://huggingface.co/bartowski/Qwen2.5-Coder-7B-Instruct-abliterated-GGUF/resolve/main/Qwen2.5-Coder-7B-Instruct-abliterated-Q8_0.gguf"

# In-memory storage for conversation histories
conversation_histories = {}

def download_model():
    """Download the model from Hugging Face if not present"""
    if os.path.exists(MODEL_PATH):
        logger.info(f"Model already exists at {MODEL_PATH}")
        return True
    
    try:
        logger.info(f"Downloading model from {MODEL_URL}")
        # In a real implementation, you would use huggingface_hub to download
        # For now, we'll simulate this - in Colab you would use wget or similar
        logger.warning("Model download would happen here in actual Colab deployment")
        return False  # Placeholder - actual download code would go here
    except Exception as e:
        logger.error(f"Failed to download model: {e}")
        return False

def load_model():
    """Load the Llama model"""
    global llm_model
    
    if not LLAMA_CPP_AVAILABLE:
        logger.warning("llama-cpp-python not available, using simulation mode")
        return False
    
    if llm_model is not None:
        return True
    
    with model_lock:
        if llm_model is not None:  # Double-check locking
            return True
            
        try:
            if not os.path.exists(MODEL_PATH):
                if not download_model():
                    logger.error("Model file not found and download failed")
                    return False
            
            logger.info(f"Loading model from {MODEL_PATH}")
            llm_model = Llama(
                model_path=MODEL_PATH,
                n_ctx=4096,  # Context window
                n_threads=6,  # Number of CPU threads to use
                n_gpu_layers=30,  # Number of layers to offload to GPU (adjust based on available VRAM)
                verbose=False
            )
            logger.info("Model loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            llm_model = None
            return False

def generate_response(prompt, max_tokens=512, temperature=0.7, top_p=0.95):
    """Generate a response using the loaded model"""
    global llm_model
    
    if not LLAMA_CPP_AVAILABLE or llm_model is None:
        # Fallback to simulation
        return generate_simulated_response(prompt)
    
    try:
        with model_lock:  # Ensure thread-safe access to the model
            output = llm_model(
                prompt,
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
                stop=["</s>", "\n\n"],  # Stop tokens
                echo=False
            )
        
        return output['choices'][0]['text'].strip()
    except Exception as e:
        logger.error(f"Error during generation: {e}")
        return generate_simulated_response(prompt)

def generate_simulated_response(prompt):
    """Fallback simulated response when model is not available"""
    # Simple keyword-based response generation for demo
    prompt_lower = prompt.lower()
    
    if any(word in prompt_lower for word in ["bonjour", "salut", "hello", "hi"]):
        return "Bonjour ! Je suis EMO, votre agent IA local puissant. Comment puis-je vous aider aujourd'hui ?"
    
    elif any(word in prompt_lower for word in ["code", "programmer", "développer", "script"]):
        return """Je peux vous aider avec vos besoins de programmation. En tant qu'agent IA avancé, je peux :
- Écrire, déboguer et optimiser du code dans de nombreux langages
- Expliquer des concepts de programmation complexes
- Générer des scripts d'automatisation
- Analyser et améliorer du code existant

Quel langage ou quelle tâche spécifique souhaitez-vous aborder ?"""

    elif any(word in prompt_lower for word in ["analyse", "analyser", "data", "données"]):
        return """Pour votre demande d'analyse, je peux vous assister avec :
- Analyse statistique et exploration de données
- Visualisation et interprétation de résultats
- Nettoyage et prétraitement de données
- Modélisation prédictive
- Extraction d'insights pertinents

Avez-vous des données spécifiques que vous souhaitez analyser ?"""

    else:
        return f"""Je comprends votre demande : "{prompt[:100]}..."

En tant qu'agent IA avancé conçu pour réfléchir, utiliser des outils et agir sur la machine, je peux vous aider de plusieurs manières :
1. Analyse et raisonnement
2. Utilisation d'outils (fichiers, shell, recherche web, etc.)
3. Action concrète pour obtenir des résultats tangibles

Pour mieux vous assister, pourriez-vous préciser le contexte ou le domaine spécifique de votre demande ?"""

class EmoAgent:
    """EMO Agent that uses the language model for reasoning"""
    
    def __init__(self):
        self.tools_available = [
            "file_read", "file_write", "file_edit", "shell_execute", 
            "web_search", "code_execution", "system_info", "process_management"
        ]
        # Ensure model is loaded
        load_model()
    
    def process_message(self, user_input, history=None):
        """
        Process a user message and return agent response with thinking steps
        """
        if history is None:
            history = []
        
        # Generate a unique conversation ID if not exists
        conv_id = str(uuid.uuid4())
        
        # Simulate thinking process (in a real implementation, this would come from the model's reasoning)
        thinking_steps = self.generate_thinking_process(user_input, history)
        
        # Generate the actual response
        response = self.generate_response_with_model(user_input, history, thinking_steps)
        
        return {
            "reply": response,
            "steps": thinking_steps,
            "elapsed": len(thinking_steps) * 0.8  # Simulated processing time
        }
    
    def generate_thinking_process(self, user_input, history):
        """Generate thinking steps that show the agent's reasoning process"""
        # This simulates what the model's internal reasoning might look like
        steps = []
        
        # Step 1: Understanding the request
        steps.append({
            "step": 1,
            "thinking": "Je comprends la demande de l'utilisateur et j'analyse son intention, son contexte et ses implications potentiels.",
            "actions": [
                {
                    "command": "analyze_request --input \"user message\" --context \"conversation history\"",
                    "result": "Intention identifiée : [analyse basée sur le contenu du message]"
                }
            ]
        })
        
        # Step 2: Planning the approach
        steps.append({
            "step": 2,
            "thinking": "Je planifie comment répondre au mieux à cette demande en considérant les outils disponibles et les contraintes.",
            "actions": [
                {
                    "command": "plan_approach --request \"user intent\" --available_tools \"file,shell,web,code\"",
                    "result": "Stratégie déterminée : [approche basée sur le type de demande]"
                }
            ]
        })
        
        # Step 3: Considering potential actions
        steps.append({
            "step": 3,
            "thinking": "Je considère les différentes actions que je pourrais entreprendre pour fournir une réponse utile et complète.",
            "actions": [
                {
                    "command": "evaluate_options --context \"request analysis\" --goal \"provide helpful response\"",
                    "result": "Options évaluées : [liste d'approches possibles]"
                }
            ]
        })
        
        # Step 4: Formulating the response
        steps.append({
            "step": 4,
            "thinking": "Je formulate ma réponse finale en m'assurant qu'elle est précise, utile et adaptée aux besoins de l'utilisateur.",
            "actions": [
                {
                    "command": "formulate_response --approach \"chosen strategy\" --style \"helpful and detailed\"",
                    "result": "Réponse préparée pour transmission à l'utilisateur"
                }
            ]
        })
        
        return steps
    
    def generate_response_with_model(self, user_input, history, thinking_steps):
        """Generate a response using the language model"""
        # Construct a prompt that encourages the model to think step by step
        system_prompt = """Tu es EMO, un agent IA local avancé conçu pour réfléchir, utiliser des outils et agir sur la machine. 
Tu dois toujours :
1. Analyser profondément la demande de l'utilisateur
2. Penser étape par étape avant de répondre
3. Considérer comment utiliser des outils (fichiers, shell, recherche web, etc.) si nécessaire
4. Fournir des réponses précises, utiles et bien structurées
5. Quand tu n'es pas sûr, le dire clairement plutôt que de deviner

Tu es particulièrement fort pour :
- La résolution de problèmes complexes
- La programmation dans de nombreux langages
- L'analyse de données et d'informations
- L'automatisation de tâches
- L'explication de concepts techniques

Réponds en français sauf si l'utilisateur utilise explicitement une autre langue."""
        
        # Format conversation history
        history_text = ""
        if history:
            history_text = "\nHistorique de la conversation :\n"
            for i, turn in enumerate(history[-3:]):  # Last 3 turns for context
                history_text += f"Utilisateur : {turn.get('user', '')}\n"
                history_text += f"Assistant : {turn.get('assistant', '')}\n\n"
        
        # Construct the full prompt
        full_prompt = f"{system_prompt}\n\n{history_text}Utilisateur : {user_input}\n\nAssistant :"
        
        # Generate response
        try:
            response = generate_response(full_prompt, max_tokens=1024, temperature=0.7)
            return response if response else "Je n'ai pas pu générer une réponse appropriée. Pouvez-vous reformuler votre demande ?"
        except Exception as e:
            logger.error(f"Error in model generation: {e}")
            return generate_simulated_response(user_input)

# Initialize agent
emo_agent = EmoAgent()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    model_status = "loaded" if llm_model is not None else "not loaded (using simulation)"
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "model": "Qwen2.5-Coder-7B-Instruct-abliterated" if llm_model is not None else "simulation",
        "model_status": model_status,
        "version": "EMO Backend API v1.0"
    })

@app.route('/chat', methods=['POST'])
def chat():
    """Main chat endpoint for EMO agent"""
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({"error": "Message is required"}), 400
        
        user_message = data['message']
        conversation_id = data.get('conversation_id', str(uuid.uuid4()))
        history = data.get('history', [])
        
        logger.info(f"Processing message for conversation {conversation_id}: {user_message[:100]}...")
        
        # Process with EMO agent
        result = emo_agent.process_message(user_message, history)
        
        # Store in conversation history (in production, use a proper database)
        if conversation_id not in conversation_histories:
            conversation_histories[conversation_id] = []
        
        conversation_histories[conversation_id].append({
            "timestamp": datetime.now().isoformat(),
            "user": user_message,
            "assistant": result["reply"],
            "steps": result["steps"]
        })
        
        # Keep only last 50 exchanges per conversation to manage memory
        if len(conversation_histories[conversation_id]) > 50:
            conversation_histories[conversation_id] = conversation_histories[conversation_id][-50:]
        
        return jsonify({
            "conversation_id": conversation_id,
            "reply": result["reply"],
            "steps": result["steps"],
            "elapsed": result["elapsed"],
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error processing chat request: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/history/<conversation_id>', methods=['GET'])
def get_history(conversation_id):
    """Get conversation history"""
    if conversation_id not in conversation_histories:
        return jsonify({"error": "Conversation not found"}), 404
    
    return jsonify({
        "conversation_id": conversation_id,
        "history": conversation_histories[conversation_id]
    })

@app.route('/clear/<conversation_id>', methods=['DELETE'])
def clear_history(conversation_id):
    """Clear conversation history"""
    if conversation_id in conversation_histories:
        del conversation_histories[conversation_id]
        return jsonify({"message": "History cleared"})
    else:
        return jsonify({"error": "Conversation not found"}), 404

@app.route('/models', methods=['GET'])
def list_models():
    """List available models"""
    return jsonify({
        "available_models": [
            "Qwen2.5-Coder-7B-Instruct-abliterated",
            "nemotron-3-super-120b",
            "llama-3-70b",
            "mixtral-8x22b"
        ],
        "current": "Qwen2.5-Coder-7B-Instruct-abliterated" if llm_model is not None else "simulation"
    })

if __name__ == '__main__':
    # Get port from environment variable (important for Cloud platforms)
    port = int(os.environ.get("PORT", 7860))
    
    logger.info(f"Starting EMO Backend API on port {port}")
    
    # Try to load the model
    model_loaded = load_model()
    if model_loaded:
        logger.info("Successfully loaded Qwen2.5-Coder-7B-Instruct-abliterated model")
    else:
        logger.warning("Failed to load model, will use simulation mode")
    
    app.run(host='0.0.0.0', port=port, debug=False)
