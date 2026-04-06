# Guide d'installation du backend EMO sur Google Colab

Ce guide vous montre comment déployer un backend d'IA puissant sur Google Colab pour alimenter votre interface web EMO.

## Modèles recommandés pour Colab

Pour obtenir le modèle le plus puissant et le moins censuré possible dans les limites de Colab, nous recommandons :

1. **Nemotron 3 Super 120B** (si vous avez accès via des APIs ou des versions quantifiées)
2. **Llama 3 70B** (version instruct, nécessite une quantification pour tenir dans la RAM de Colab)
3. **Mixtral 8x22B** (également nécessite une quantification)
4. **Phi-3 Medium** (14B, plus facile à faire tourner, moins puissant mais très capable)
5. **StableLM Zephyr 3B** (pour un déploiement léger mais capable)

Pour un modèle véritablement "puissant" et moins restreint, vous pourriez envisager d'utiliser des APIs comme :
- Together AI
- Replicate
- Hugging Face Inference API
- Ou des services spécialisés dans les modèles moins censurés

## Étapes pour déployer sur Google Colab

### Option 1: Utiliser un notebook Colab avec inference API locale

1. Ouvrez Google Colab : https://colab.research.google.com/
2. Créez un nouveau notebook
3. Copiez-collez le contenu du fichier `colab_backend.ipynb` (à créer ci-dessous)
4. Connectez-vous à un runtime GPU (Runtime > Change runtime type > GPU)
5. Exécutez les cellules successivement
6. À la fin, vous obtiendrez une URL publique pour votre API (via ngrok ou similaire)

### Option 2: Utiliser des APIs externes (recommandé pour la puissance)

Puisque les modèles véritablement puissants (>70B) sont difficiles à faire tourner sur Colab gratuit, envisagez d'utiliser :

1. **Hugging Face Inference API** avec des modèles comme :
   - `meta-llama/Llama-3-70b-chat-hf`
   - `mistralai/Mixtral-8x22B-Instruct-v0.1`
   - `nvidia/nemotron-3-super-120b-instruct` (si disponible)

2. **Together AI** offre accès à de nombreux modèles puissants avec des crédits gratuits

3. **Replicate** permet de faire tourner des modèles open-source

## Fichiers fournis

Dans ce répertoire, vous trouverez :

1. `backend_api.py` - L'API Flask que nous allons déployer
2. `colab_backend.ipynb` - Notebook Colab prêt à l'emploi
3. `requirements.txt` - Dépendances Python nécessaires
4. `README_COLAB.md` - Instructions détaillées

## Configuration de l'interface web

Une fois votre backend déployé sur Colab et accessible via une URL publique :

1. Éditez le fichier `assets/js/main.js`
2. Modifiez la constante `BACKEND_URL` pour pointer vers votre URL Colab
   ```javascript
   const BACKEND_URL = "https://votre-url-colab.ngrok.io"; // Exemple avec ngrok
   ```
3. Redéployez votre interface web sur GitHub Pages

## Considérations importantes

### Limites de Colab gratuit
- GPU limité (généralement T4 ou K80 avec 16GB VRAM)
- Runtime limité à 12 heures maximum
- Déconnexions périodiques
- Pas adapté pour une utilisation en production 24/7

### Pour une utilisation sérieuse
Envisagez plutôt :
- Un abonnement Colab Pro
- Un service comme RunPod, Lambda Labs, ou vast.ai
- Déployer sur votre propre matériel si disponible
- Utiliser des APIs dédiées

### Modèles moins censurés
Pour des modèles avec moins de restrictions, recherchez sur Hugging Face :
- Des modèles basés sur Llama 3 avec des licences permissives
- Des modèles de la famille "Mistral" ou "Nemotron" avec des versions instruct
- Lisez toujours la carte modèle (model card) pour comprendre les limitations et les licences

## Sécurité

Notez que exposer une API publiquement (même avec ngrok) comporte des risques de sécurité :
- Personne ne devrait pouvoir accéder à votre API sans authentification
- En production, ajoutez une authentification par token ou clé API
- Ne exposez jamais des clés sensibles dans le code client

Pour une utilisation personnelle/test, cette approche est acceptable. Pour une utilisation sérieuse, implémentez une authentification appropriée.
