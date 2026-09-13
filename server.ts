import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfModule = require("pdf-parse");
const PDFParseClass = pdfModule.PDFParse || pdfModule.default?.PDFParse;

async function extractPdfText(buffer: Buffer): Promise<{ text: string; pages: number }> {
  if (PDFParseClass && typeof PDFParseClass === "function") {
    const parser = new PDFParseClass({ data: buffer });
    try {
      const result = await parser.getText();
      const rawText = result.text || "";
      const cleanText = rawText
        .replace(/--\s*\d+\s*of\s*\d+\s*--/gi, "")
        .replace(/\r\n/g, "\n")
        .trim();
      const pageCount = result.total || (result.pages ? result.pages.length : 1);
      return { text: cleanText, pages: pageCount };
    } finally {
      if (typeof parser.destroy === "function") {
        try {
          await parser.destroy();
        } catch (_) {}
      }
    }
  } else if (typeof pdfModule === "function") {
    const data = await pdfModule(buffer);
    return { text: (data.text || "").trim(), pages: data.numpages || 1 };
  } else if (typeof pdfModule?.default === "function") {
    const data = await pdfModule.default(buffer);
    return { text: (data.text || "").trim(), pages: data.numpages || 1 };
  }
  throw new Error("Mecanismo de leitura de PDF indisponível.");
}

const app = express();
const PORT = 3000;

// Permite payloads de documentos em base64 e textos longos
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));

// Inicialização Lazy do cliente Gemini com telemetria
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("A variável de ambiente GEMINI_API_KEY não está configurada.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

// Endpoint para leitura e download dos arquivos Python
app.get("/api/source-files", (_req, res) => {
  try {
    const appPyPath = path.join(process.cwd(), "app.py");
    const reqTxtPath = path.join(process.cwd(), "requirements.txt");
    const readmePath = path.join(process.cwd(), "README.md");

    const appPy = fs.existsSync(appPyPath) ? fs.readFileSync(appPyPath, "utf-8") : "";
    const reqTxt = fs.existsSync(reqTxtPath) ? fs.readFileSync(reqTxtPath, "utf-8") : "";
    const readme = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, "utf-8") : "";

    res.json({
      appPy,
      reqTxt,
      readme,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao ler arquivos do projeto." });
  }
});

// Endpoint para download individual
app.get("/api/download/:filename", (req, res) => {
  const allowed = ["app.py", "requirements.txt", "README.md"];
  const filename = req.params.filename;

  if (!allowed.includes(filename)) {
    res.status(400).send("Arquivo não permitido.");
    return;
  }

  const filePath = path.join(process.cwd(), filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).send("Arquivo não encontrado.");
    return;
  }

  res.download(filePath, filename);
});

// Endpoint para extração de texto de URLs
app.post("/api/extract-url", async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "URL inválida ou ausente." });
    return;
  }

  try {
    const parsedUrl = new URL(url.trim());
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      res.status(400).json({ error: "A URL deve iniciar com http:// ou https://" });
      return;
    }

    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Falha ao acessar o site (HTTP ${response.status}: ${response.statusText})`);
    }

    const html = await response.text();

    // Remove scripts, styles e tags estruturais irrelevantes
    let clean = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "")
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
      .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, "");

    // Extrai o título se houver
    const titleMatch = clean.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : parsedUrl.hostname;

    // Tenta priorizar a tag <article> ou <main>
    const articleMatch = clean.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    const mainMatch = clean.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    const contentHtml = articleMatch ? articleMatch[1] : mainMatch ? mainMatch[1] : clean;

    // Converte HTML em texto simples
    let text = contentHtml
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n\s*\n/g, "\n\n")
      .trim();

    if (text.length < 80) {
      throw new Error("O conteúdo extraído da página é insuficiente ou foi bloqueado por restrições do site.");
    }

    const words = text.split(/\s+/).filter(Boolean).length;

    res.json({
      title,
      text,
      wordCount: words,
      characterCount: text.length,
      estimatedReadingTime: Math.max(1, Math.round(words / 200)),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao processar URL." });
  }
});

// Endpoint para extração de texto de PDF (via base64)
app.post("/api/extract-pdf", async (req, res) => {
  const { base64Data, filename } = req.body;
  if (!base64Data) {
    res.status(400).json({ error: "Dados do arquivo PDF não recebidos." });
    return;
  }

  try {
    const buffer = Buffer.from(base64Data, "base64");
    const { text, pages } = await extractPdfText(buffer);

    if (!text) {
      throw new Error("O PDF não contém texto legível (pode ser um documento digitalizado ou imagem).");
    }

    const words = text.split(/\s+/).filter(Boolean).length;

    res.json({
      title: filename || "Documento PDF",
      text,
      pages,
      wordCount: words,
      characterCount: text.length,
      estimatedReadingTime: Math.max(1, Math.round(words / 200)),
    });
  } catch (error: any) {
    console.error("Erro ao processar PDF:", error);
    res.status(500).json({ error: error.message || "Erro ao ler PDF." });
  }
});

// Endpoint para gerar o resumo estruturado com Gemini
app.post("/api/summarize", async (req, res) => {
  const { text, sourceName } = req.body;
  if (!text || typeof text !== "string") {
    res.status(400).json({ error: "Texto do documento ausente." });
    return;
  }

  try {
    const ai = getGeminiClient();

    const systemInstruction = `
Você é um Engenheiro de Software Sênior e Especialista em IA encarregado de analisar documentações técnicas e artigos de engenharia.
Sua missão é ler com precisão o material fornecido e gerar um resumo analítico e estruturado em Português.

O resumo DEVE conter rigorosamente as quatro seções a seguir formatadas em Markdown elegante:

### 1. 📋 Visão Geral
Um resumo executivo conciso (2 a 3 parágrafos) do tema principal, do problema abordado e da proposta de valor do documento.

### 2. 💡 Principais Conceitos
Lista com marcadores detalhando as ideias fundamentais, arquiteturas, princípios ou definições cruciais explicadas no documento.

### 3. 🛠️ Tecnologias e Metodologias Citadas
Lista detalhada das ferramentas, linguagens, frameworks, padrões de projeto, protocolos ou metodologias científicas/técnicas abordadas.

### 4. 🎯 Conclusão e Impactos
Principais conclusões do autor, aplicações práticas, benefícios técnicos e desafios ou limitações mencionadas.

Seja factual, claro e estritamente fiel ao texto original, sem inventar dados.
`;

    const prompt = `Analise o seguinte documento (${sourceName || "Documento"}) e produza o resumo estruturado:

--- INÍCIO DO DOCUMENTO ---
${text.slice(0, 70000)}
--- FIM DO DOCUMENTO ---
`;

    // Conforme o skill gemini-api: usa gemini-3.8-flash para tarefas básicas de texto e sumarização
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    res.json({
      summary: response.text || "Não foi possível gerar o resumo.",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao conectar à API do Gemini." });
  }
});

// Endpoint para Chat Q&A com o Documento
app.post("/api/chat", async (req, res) => {
  const { documentText, chatHistory, userQuery } = req.body;

  if (!documentText || !userQuery) {
    res.status(400).json({ error: "Parâmetros insuficientes para o chat." });
    return;
  }

  try {
    const ai = getGeminiClient();

    const systemInstruction = `
Você é o assistente técnico especialista exclusivo do documento analisado.
Seu objetivo é responder às perguntas do usuário com base ESTRITAMENTE no conteúdo fornecido no contexto do documento.

Diretrizes obrigatórias:
1. Responda de maneira clara, técnica, precisa e prestativa em Português.
2. Baseie cada afirmação no documento. Sempre que relevante, cite conceitos ou dados do material.
3. Se a pergunta do usuário não puder ser respondida com base no documento, responda educadamente:
   "Com base no documento fornecido, essa informação não é abordada ou não foi mencionada."
4. Nunca invente informações que não estejam no texto.
`;

    const recentHistory = (Array.isArray(chatHistory) ? chatHistory : [])
      .slice(-6)
      .map((m: any) => `${m.role === "user" ? "Usuário" : "Assistente"}: ${m.content}`)
      .join("\n");

    const prompt = `CONTEXTO DO DOCUMENTO:
"""
${documentText.slice(0, 70000)}
"""

${recentHistory ? `HISTÓRICO DA CONVERSA:\n${recentHistory}\n` : ""}
PERGUNTA ATUAL DO USUÁRIO:
${userQuery}

Responda à pergunta acima em conformidade com as diretrizes e exclusivamente com os fatos do documento.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.25,
      },
    });

    res.json({
      reply: response.text || "Sem resposta gerada.",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro no chat com o Gemini." });
  }
});

// Inicialização do servidor com Vite Middleware ou Produção
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando na porta ${PORT} (http://0.0.0.0:${PORT})`);
  });
}

startServer();
