# Emo 😏 – Ton acolyte sarcastique propulsé par Ollama

Emo est une interface de chat élégante (style ChatGPT) qui se connecte à **n'importe quel serveur Ollama** (local ou cloud).  
Il intègre un **mode réflexion** pour forcer le modèle à raisonner avant de répondre, ce qui améliore considérablement ses performances.

## 🚀 Déploiement instantané sur GitHub Pages

1. **Fork** ce dépôt ou crée un nouveau dépôt avec ces fichiers.
2. Active **GitHub Pages** dans `Settings > Pages` (branche `main`).
3. Ouvre `https://ton-utilisateur.github.io/emo-ai/`

## ⚙️ Configuration

Dans la barre latérale :
- **URL Ollama** : l'adresse de ton serveur (ex: `http://localhost:11434` ou une URL publique Colab/Ngrok)
- **Modèle** : le nom du modèle (ex: `wizardlm2:7b`, `dolphin-mixtral:8x7b`)
- **Mode réflexion** : active/désactive la pensée structurée

## 📱 Utilisation mobile

Ajoute Emo à ton écran d'accueil via "Ajouter à l'écran d'accueil" dans ton navigateur mobile. Il fonctionnera comme une application native.

## 🧠 Obtenir un serveur Ollama gratuit

- **Ollama Cloud** : [ollama.com](https://ollama.com) (offre gratuite)
- **Google Colab** : utilise un notebook comme [celui-ci](https://github.com/enescingoz/colab-llm) pour obtenir une URL publique.

## 🔮 Prochainement

- Module local Python pour contrôler ton PC à distance
- Support des appels d'outils (fonctions)