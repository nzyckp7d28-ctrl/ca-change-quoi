#!/usr/bin/env node
// Serveur MCP minimal (stdio, sans dépendance) qui relaie des demandes vers l'API OpenAI.
// Variables d'environnement : OPENAI_API_KEY (obligatoire), OPENAI_MODEL (optionnel).

import { createInterface } from "node:readline";

const MODEL = process.env.OPENAI_MODEL || "gpt-5";
const API_URL = "https://api.openai.com/v1/chat/completions";

const PROMPT_WRITER = `Tu es un rédacteur de prompts expert pour Claude Code, un agent de développement qui travaille dans un dépôt Git.
À partir de la demande brute de l'utilisateur, rédige un prompt clair et exécutable, en français, structuré ainsi :
## Objectif
## Contexte
## Tâches (liste numérotée d'étapes concrètes)
## Critères de réussite
## À ne pas faire
N'invente pas de détails techniques absents de la demande : signale-les plutôt comme points à clarifier.
Réponds uniquement avec le prompt, sans introduction ni conclusion.`;

const TOOLS = [
  {
    name: "ameliorer_prompt",
    description:
      "Envoie une demande brute à ChatGPT pour qu'il la réécrive en prompt structuré (objectif, contexte, tâches, critères, limites) prêt à être exécuté par Claude.",
    inputSchema: {
      type: "object",
      properties: {
        demande: { type: "string", description: "La demande brute de l'utilisateur." },
        contexte: { type: "string", description: "Contexte optionnel sur le projet (fichiers, stack, contraintes)." },
      },
      required: ["demande"],
    },
  },
  {
    name: "demander_chatgpt",
    description: "Pose une question libre à ChatGPT et renvoie sa réponse (avis, relecture, reformulation...).",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "Le message à envoyer à ChatGPT." },
        instructions: { type: "string", description: "Instructions système optionnelles." },
      },
      required: ["message"],
    },
  },
];

async function callOpenAI(system, user) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY n'est pas définie dans l'environnement.");
  }
  const messages = system ? [{ role: "system", content: system }] : [];
  messages.push({ role: "user", content: user });
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, messages }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`API OpenAI (${res.status}) : ${data.error?.message || res.statusText}`);
  }
  return data.choices?.[0]?.message?.content ?? "";
}

async function runTool(name, args = {}) {
  switch (name) {
    case "ameliorer_prompt": {
      const user = args.contexte
        ? `Contexte du projet :\n${args.contexte}\n\nDemande brute :\n${args.demande}`
        : `Demande brute :\n${args.demande}`;
      return callOpenAI(PROMPT_WRITER, user);
    }
    case "demander_chatgpt":
      return callOpenAI(args.instructions, args.message);
    default:
      throw new Error(`Outil inconnu : ${name}`);
  }
}

function send(msg) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", ...msg }) + "\n");
}

async function handle(req) {
  const { id, method, params } = req;
  if (id === undefined) return; // notification
  switch (method) {
    case "initialize":
      return send({
        id,
        result: {
          protocolVersion: params?.protocolVersion || "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "chatgpt", version: "1.0.0" },
        },
      });
    case "ping":
      return send({ id, result: {} });
    case "tools/list":
      return send({ id, result: { tools: TOOLS } });
    case "tools/call":
      try {
        const text = await runTool(params?.name, params?.arguments);
        return send({ id, result: { content: [{ type: "text", text }] } });
      } catch (err) {
        return send({ id, result: { content: [{ type: "text", text: err.message }], isError: true } });
      }
    default:
      return send({ id, error: { code: -32601, message: `Méthode non prise en charge : ${method}` } });
  }
}

createInterface({ input: process.stdin }).on("line", (line) => {
  if (!line.trim()) return;
  let req;
  try {
    req = JSON.parse(line);
  } catch {
    return send({ id: null, error: { code: -32700, message: "JSON invalide" } });
  }
  handle(req);
});
