# ca-change-quoi

## Pont Claude ↔ ChatGPT (serveur MCP)

`mcp/chatgpt-server.mjs` est un petit serveur MCP (Node, sans dépendance) qui permet à Claude Code
d'interroger l'API OpenAI. Il est déclaré dans `.mcp.json` et activé par `.claude/settings.json`.

### Outils exposés

| Outil | Rôle |
|---|---|
| `ameliorer_prompt` | ChatGPT réécrit une demande brute en prompt structuré (objectif, contexte, tâches, critères, limites). |
| `demander_chatgpt` | Question libre à ChatGPT (avis, relecture, reformulation). |

### Configuration

1. Créer une clé sur https://platform.openai.com/api-keys (l'API est facturée séparément de ChatGPT Plus).
2. Dans les paramètres de l'environnement Claude Code (cloud) :
   - variable d'environnement `OPENAI_API_KEY` = votre clé ;
   - optionnel : `OPENAI_MODEL` (par défaut `gpt-5`) ;
   - accès réseau : ajouter `api.openai.com` aux domaines autorisés.
3. Démarrer une nouvelle session : l'outil `chatgpt` apparaît dans `/mcp`.

### Utilisation

> « Demande à ChatGPT d'améliorer ce prompt, montre-le-moi, puis exécute-le : … »
