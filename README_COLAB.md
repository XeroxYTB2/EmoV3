# Déploiement du backend EMO sur Google Colab

Ce guide vous montre comment déployer le backend d'IA EMO sur Google Colab en utilisant le modèle Qwen2.5-Coder-7B-Instruct-abliterated.

## Prérequis

1. Un compte Google pour accéder à Google Colab
2. Une connexion internet stable
3. (Optionnel) Un compte Hugging Face pour télécharger le modèle plus facilement

## Étapes de déploiement

### Étape 1: Créer un nouveau notebook Colab

1. Allez sur https://colab.research.google.com/
2. Cliquez sur "Nouveau notebook"
3. Renommez-le en "EMO Backend" ou similaire

### Étape 2: Configurer le runtime GPU

1. Dans le menu déroulant, choisissez "Runtime" > "Change runtime type"
2. Sélectionnez "GPU" comme type d'accélérateur matériel
3. Cliquez sur "Sauvegarder"

### Étape 3: Installer les dépendances

Copiez et collez ce code dans la première cellule du notebook, puis exécutez-le :

```python
# Installer les dépendances nécessaires
!pip install flask flask-cors llama-cpp-python huggingface-hub sentencepiece -q
```

### Étape 4: Télécharger le modèle

Dans une nouvelle cellule, exécutez ce code pour télécharger le modèle depuis Hugging Face :

```python
import os
from huggingface_hub import hf_hub_download

# Créer le répertoire pour le modèle
os.makedirs("/tmp/models", exist_ok=True)

# Télécharger le modèle Qwen2.5-Coder-7B-Instruct-abliterated
print("Téléchargement du modèle Qwen2.5-Coder-7B-Instruct-abliterated...")
model_path = hf_hub_download(
    repo_id="bartowski/Qwen2.5-Coder-7B-Instruct-abliterated-GGUF",
    filename="Qwen2.5-Coder-7B-Instruct-abliterated-Q8_0.gguf",
    local_dir="/tmp/models",
    local_dir_use_symlinks=False
)
print(f"Modèle téléchargé avec succès : {model_path}")
```

### Étape 5: Déployer l'API Flask

Dans une nouvelle cellule, créez et exécutez le backend API :

```python
# Copiez le contenu du fichier backend_api.py ici
# Ou bien, si vous l'avez téléchargé, exécutez-le directement

# Pour exécuter le backend en arrière-plan
import subprocess
import time
import signal
import os

# Fonction pour démarrer le serveur Flask
def start_flask_app():
    # Changer le répertoire de travail si nécessaire
    os.chdir('/content')
    
    # Démarrer le serveur Flask
    process = subprocess.Popen(
        ['python', 'backend_api.py'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Attendre un peu que le serveur démarre
    time.sleep(5)
    
    return process

# Démarrer le serveur
flask_process = start_flask_app()
print("Serveur Flask démarré en arrière-plan")

# Vérifier que le serveur fonctionne
import requests
try:
    response = requests.get('http://127.0.0.1:7860/health', timeout=10)
    print(f"Réponse du serveur : {response.json()}")
except Exception as e:
    print(f"Erreur lors de la connexion au serveur : {e}")
    # Essayer de lire les sorties du processus
    stdout, stderr = flask_process.communicate(timeout=1)
    print(f"Sortie standard : {stdout}")
    print(f"Erreur standard : {stderr}")
```

### Étape 6: Exposer l'API publiquement avec ngrok

Dans une nouvelle cellule, exécutez :

```python
# Installer ngrok si ce n'est pas déjà fait
!pip install pyngrok -q

# Importer et configurer ngrok
from pyngrok import ngrok

# Ouvrir un tunnel vers le port 7860 (où notre Flask app écoute)
public_url = ngrok.connect(7860)
print(f"URL publique de votre API : {public_url}")
print(f"Utilisez cette URL dans votre interface web EMO : {public_url}")

# Garder le notebook actif pour maintenir le tunnel
# Vous pouvez laisser cette cellule en cours d'exécution
```

### Étape 7: Tester l'API

Dans une nouvelle cellule, testez votre API :

```python
import requests
import json

# Remplacez par votre URL réelle de ngrok
API_URL = "http://127.0.0.1:7860"  # Pour test local, ou utilisez l'URL ngrok

# Test de santé
health_response = requests.get(f"{API_URL}/health")
print("Health check:", health_response.json())

# Test de chat
chat_data = {
    "message": "Bonjour, comment ça va ?",
    "history": []
}

chat_response = requests.post(f"{API_URL}/chat", json=chat_data)
print("Chat response:", chat_response.json())
```

## Configuration de l'interface web EMO

Une fois que vous avez votre URL publique ngrok :

1. Éditez le fichier `assets/js/main.js` dans votre projet EMO web
2. Modifiez la constante `BACKEND_URL` au début du fichier :
   ```javascript
   const BACKEND_URL = "https://votre-url-ngrok.ngrok.io";  // Sans le / à la fin
   ```
3. Redéployez votre interface web sur GitHub Pages

## Conseils pour une meilleure expérience

### Gestion de la mémoire
Le modèle Qwen2.5-Coder-7B-Instruct-abliterated-Q8_0 quantifié en 8 bits devrait tenir confortablement dans la VRAM d'un GPU T4 Colab (16GB).

### Durée de session
Les notebooks Colab gratuits ont une limite d'environ 12 heures d'utilisation continue. Après cela, vous devrez redémarrer le processus.

### Alternative: Utiliser directement les APIs Hugging Face
Si vous préférez ne pas gérer l'infrastructure vous-même, vous pouvez utiliser directement l'API d'inférence de Hugging Face :

1. Obtenez un token d'accès sur https://huggingface.co/settings/tots
2. Utilisez le modèle via leur API d'inférence
3. Modifiez le backend_api.py pour appeler l'API Hugging Face au lieu de llama-cpp-python

## Dépannage

### Problème: "CUDA out of memory"
- Réduisez `n_gpu_layers` dans le backend_api.py
- Utilisez une quantification plus agressive (si disponible)
- Fermez les autres notebooks ou processus qui utilisent la GPU

### Problème: Modèle ne se charge pas
- Vérifiez que le fichier .gguf existe bien dans /tmp/models/
- Assurez-vous d'avoir suffisamment d'espace disque (/tmp a généralement beaucoup d'espace)
- Essayez de re-télécharger le modèle

### Problème: L'API ne répond pas
- Vérifiez que le serveur Flask est bien en cours d'exécution
- Vérifiez les logs du processus Flask pour les erreurs
- Assurez-vous que le port 7860 n'est pas déjà utilisé

## Ressources utiles

- Modèle utilisé : https://huggingface.co/bartowski/Qwen2.5-Coder-7B-Instruct-abliterated-GGUF
- Documentation llama-cpp-python : https://github.com/abetlen/llama-cpp-python
- Guide ngrok : https://ngrok.com/docs
- Limites de Google Colab : https://research.google.com/colaboratory/faq.html

---

**Note importante sur la sécurité** : Exposer une API publiquement via ngrok comporte des risques. Pour une utilisation personnelle ou de démonstration, cette approche est acceptable. Pour une utilisation en production, vous devriez implémenter une authentification appropriée et envisager un hébergement plus sécurisé.

Pour un modèle véritablement "puissant" et moins restreint dans un environnement de production, envisagez plutôt :
- Un service dédié comme RunPod ou Lambda Labs
- Déployer sur votre propre matériel GPU
- Utiliser des APIs spécialisées qui offrent accès à des modèles moins censurés
