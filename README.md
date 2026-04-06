# EMO Web - Agent IA Local (Version Web Deployable)

Cette version web d'EMO est conçue pour être déployée sur GitHub Pages tout en conservant le même objectif : fournir un agent IA local capable de réfléchir, utiliser des outils et agir sur la machine.

## Fonctionnalités

- Interface utilisateur inspirée de l'application Tkinter originale
- Chat interactif avec messages utilisateur/assistant
- Affichage du raisonnement (thinking) et des actions exécutées
- Sidebar avec informations sur le statut, les privilèges, le modèle, etc.
- Gestion de l'historique des conversations via localStorage
- Simulation d'agent IA pour démonstration

## Déploiement sur GitHub Pages

1. Poussez ce dépôt sur GitHub
2. Allez dans les paramètres du dépôt (Settings)
3. Dans la section "Pages", sélectionnez la branche `main` et le dossier `/` (root)
4. GitHub Pages publiera votre site à l'adresse `https://username.github.io/repository-name/`

## Adaptations pour le web

Puisque cette version s'exécute dans un navigateur web, certaines fonctionnalités de l'application originale ne sont pas disponibles :

- Aucune intégration réelle avec Ollama ou autres modèles locaux
- Aucune capacité à exécuter des commandes système réelles
- Aucune accès au système de fichiers local (pour des raisons de sécurité du navigateur)
- Le mot de passe est stocké dans localStorage (non sécurisé pour une utilisation réelle)
- Les actions sont simulées plutôt que réellement exécutées

Ces limitations sont inhérentes à l'environnement de navigateur web et permettent toutefois de conserver l'interface et l'expérience utilisateur de l'application originale.

## Développement local

Pour tester localement :
1. Ouvrez simplement `index.html` dans votre navigateur
2. Ou utilisez un serveur local simple comme :
   ```bash
   # Avec Python
   python -m http.server 8000
   
   # Avec Node.js
   npx serve
   ```

## Structure du projet

```
emo-locale/
├── index.html              # Page principale
├── README.md               # Ce fichier
└── assets/
    ├── css/
    │   └── style.css       # Styles de l'interface
    └── js/
        └── main.js         # Logique de l'application
```

## Personnalisation

Vous pouvez personnaliser cette version en modifiant :
- `assets/css/style.css` pour changer l'apparence
- `assets/js/main.js` pour modifier le comportement ou ajouter de vraies intégrations API
- `index.html` pour ajuster la structure HTML

---
*Version adaptée pour GitHub Pages tout en préservant l'objectif original d'EMO : fournir une interface puissante pour interagir avec un agent IA capable de raisonnement et d'utilisation d'outils.*
