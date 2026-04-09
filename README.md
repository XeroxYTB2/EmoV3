# 🌸 Émo — IA conversationnelle gratuite

> Chat web + mode DeskBuddy avec yeux expressifs. Backend Qwen2.5-Coder-7B sur Google Colab (GPU gratuit), frontend sur Hugging Face Spaces (gratuit).

---

## 🗺️ Architecture

```
GitHub (ce repo)
├── colab/Emo_Backend.ipynb   → Tourne sur Google Colab (GPU T4 gratuit)
│                               Expose l'API via ngrok
└── frontend/index.html       → Déployé auto sur HuggingFace Spaces
                                Se connecte à l'URL ngrok de Colab
```

**Flux :**
```
Utilisateur → HuggingFace Spaces (frontend) → ngrok URL → Google Colab (Qwen2.5)
```

---

## 🚀 Mise en place complète (étape par étape)

### Étape 1 — Prépare tes tokens

| Service | Où créer | Pourquoi |
|---|---|---|
| **ngrok** | [ngrok.com](https://ngrok.com) → Dashboard → Authtoken | Exposer l'API Colab publiquement |
| **Hugging Face** | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) → New token (Read) | Télécharger le modèle Qwen |

### Étape 2 — Fork ce repo sur GitHub

Clique **Fork** en haut à droite.

### Étape 3 — Crée un HuggingFace Space

1. Va sur [huggingface.co/new-space](https://huggingface.co/new-space)
2. Nom : `emo-ai`
3. SDK : **Static**
4. Visibilité : Public
5. Crée le Space

### Étape 4 — Configure les secrets GitHub

Dans ton repo GitHub → **Settings → Secrets → Actions** → ajoute :

| Secret | Valeur |
|---|---|
| `HF_TOKEN` | Ton token Hugging Face |
| `HF_USERNAME` | Ton nom d'utilisateur HuggingFace |

### Étape 5 — Déclenche le premier déploiement

Fais un commit vide pour déclencher le workflow :
```bash
git commit --allow-empty -m "🌸 First deploy"
git push
```

Ton frontend sera automatiquement poussé sur HuggingFace Spaces. ✅

### Étape 6 — Lance le backend sur Google Colab

1. Ouvre [Google Colab](https://colab.research.google.com)
2. **Fichier → Ouvrir un notebook → GitHub** → colle l'URL de ton repo → choisis `colab/Emo_Backend.ipynb`
3. **Exécution → Modifier le type d'exécution → GPU T4** ← important !
4. Lance les cellules dans l'ordre :
   - Cellule 1 : installe les dépendances
   - Cellule 2 : vérifie le GPU
   - Cellule 3 : **colle ton token ngrok ET ton token HF**
   - Cellule 4 : télécharge Qwen (~15 min la première fois)
   - Cellule 5 : démarre l'API → **copie l'URL ngrok affichée**

### Étape 7 — Connecte le frontend au backend

1. Va sur ton HuggingFace Space (`huggingface.co/spaces/TON_USERNAME/emo-ai`)
2. Dans le champ **API URL**, colle l'URL ngrok (ex: `https://abc123.ngrok-free.app`)
3. Clique **Connecter**
4. L'URL est sauvegardée dans le navigateur — tu n'as à le faire qu'une fois par session Colab

---

## ✨ Fonctionnalités

| Feature | Description |
|---|---|
| 💬 **Chat streaming** | Réponses token par token comme ChatGPT |
| 🎭 **Détection d'émotions** | Joie, tristesse, colère, peur, surprise, dégoût |
| 👀 **DeskBuddy** | Yeux qui suivent ta souris + réagissent aux émotions |
| 🌈 **UI réactive** | Couleurs qui changent selon l'émotion détectée |
| 🤖 **Qwen2.5-Coder-7B** | LLM puissant, multilingue, non-censuré |

### DeskBuddy — comportement des yeux

| Émotion | Yeux |
|---|---|
| 😄 Joie | Grands, lumineux |
| 😢 Tristesse | Baissés, pupille vers le bas |
| 😡 Colère | Mi-fermés (clip-path) |
| 😨 Peur | Très grands, petite pupille |
| 😲 Surprise | Immenses, minuscule pupille |
| 🤔 Réflexion | Regardent vers le haut |
| 😐 Neutre | Clignement normal |

---

## ⚠️ Limitations du plan gratuit

- **Colab** : s'éteint après ~12h d'inactivité ou si tu fermes le navigateur
- **ngrok gratuit** : l'URL change à chaque redémarrage de Colab (il faut la recoller)
- **GPU T4** : limité à quelques heures par jour sur le plan gratuit Colab

**Solution pour éviter de recoller l'URL :** ngrok Pro (~8$/mois) donne des URLs fixes. Ou sinon, tu peux garder Colab ouvert dans un onglet.

---

## 🗂️ Structure du projet

```
emo-ai/
├── colab/
│   └── Emo_Backend.ipynb     ← Lance ça sur Google Colab
├── frontend/
│   ├── index.html            ← Déployé sur HuggingFace Spaces
│   └── README.md             ← Config du Space HF
├── .github/
│   └── workflows/
│       └── deploy.yml        ← Auto-deploy vers HF Spaces
└── README.md
```

---

## 📄 Licence

MIT
