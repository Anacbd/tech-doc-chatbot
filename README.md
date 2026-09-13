# 📄 DocuGemini — Resumidor e Chatbot de Documentação Técnica & Artigos

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/)
[![Streamlit](https://img.shields.io/badge/framework-Streamlit%201.38+-FF4B4B.svg)](https://streamlit.io/)
[![Google GenAI SDK](https://img.shields.io/badge/SDK-google--genai-4285F4.svg)](https://pypi.org/project/google-genai/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Uma aplicação web interativa e profissional desenvolvida em **Python** com **Streamlit** e integrada ao modelo **Google Gemini** através do SDK oficial **`google-genai`**. Projetada para engenheiros, pesquisadores e desenvolvedores sintetizarem artigos científicos, manuais e documentações técnicas em segundos, além de dialogar interativamente com o material.

---

## 📑 Sumário

- [Visão Geral](#-visão-geral)
- [Principais Funcionalidades](#-principais-funcionalidades)
- [Estrutura do Resumo Estruturado](#-estrutura-do-resumo-estruturado)
- [Estrutura do Repositório](#-estrutura-do-repositório)
- [Pré-requisitos](#-pré-requisitos)
- [Guia de Instalação e Execução Local](#-guia-de-instalação-e-execução-local)
  - [1. Clonar ou Baixar o Projeto](#1-clonar-ou-baixar-o-projeto)
  - [2. Criar e Ativar o Ambiente Virtual](#2-criar-e-ativar-o-ambiente-virtual)
  - [3. Instalar Dependências](#3-instalar-dependências)
  - [4. Configurar a Chave de API do Gemini](#4-configurar-a-chave-de-api-do-gemini)
  - [5. Iniciar o Servidor Streamlit](#5-iniciar-o-servidor-streamlit)
- [Como Utilizar a Ferramenta](#-como-utilizar-a-ferramenta)
- [Modelos Gemini Suportados](#-modelos-gemini-suportados)
- [Resolução de Problemas Frequentes](#-resolução-de-problemas-frequentes)
- [Licença](#-licença)

---

## 🌟 Visão Geral

A leitura de documentações densas e papers de dezenas de páginas consome tempo valioso. O **DocuGemini** resolve esse desafio combinando:

1. **Ingestão Inteligente:** Extrai texto limpo de arquivos PDF ou páginas web, descartando menus, cabeçalhos, rodapés e anúncios.
2. **Resumo Analítico de 4 Pilares:** Organiza o conhecimento em blocos estruturados que destacam arquiteturas, conceitos e conclusões.
3. **Chatbot Grounded (Q&A Fundamentado):** Permite fazer perguntas específicas onde o Gemini responde estritamente de acordo com o material carregado, citando termos e evitando alucinações.

---

## ⚡ Principais Funcionalidades

- **📂 Suporte a Arquivos PDF:** Leitura e extração de páginas completas via biblioteca `pypdf`, com suporte a drag-and-drop.
- **🔗 Leitura e Sanitização de URLs:** Raspagem automatizada com `requests` e `BeautifulSoup4`, eliminando scripts, tags semânticas irrelevantes e banners.
- **🧠 Prompt Especializado de Engenharia:** Geração de análises factuais com baixa temperatura (`temperature=0.2`), focadas em precisão técnica.
- **💬 Chatbot Interativo com Histórico:** Memória contextual via `st.session_state` para perguntas e respostas encadeadas.
- **📊 Métricas do Documento:** Cálculo automático de volume de palavras, caracteres totais e estimativa de tempo de leitura original.
- **⚙️ Troca Rápida de Modelos:** Alternância intuitiva na barra lateral entre `gemini-2.5-flash`, `gemini-2.5-pro` e `gemini-2.0-flash`.
- **🔐 Chave de API Flexível:** Leitura automática do arquivo `.env` ou inserção direta com mascaramento na interface.

---

## 📋 Estrutura do Resumo Estruturado

Todo documento submetido gera um resumo padronizado dividido em quatro seções essenciais:

1. **📋 1. Visão Geral:** Resumo executivo em 2 a 3 parágrafos explicando o objetivo central, motivações e valor prático do documento.
2. **💡 2. Principais Conceitos:** Marcadores detalhando definições teóricas, arquiteturas e princípios fundamentais abordados.
3. **🛠️ 3. Tecnologias e Metodologias Citadas:** Inventário de linguagens, frameworks, bibliotecas, protocolos ou métodos experimentais.
4. **🎯 4. Conclusão e Impactos:** Desfechos principais, benefícios práticos, limitações técnicas e considerações futuras.

---

## 📁 Estrutura do Repositório

```text
├── app.py              # Aplicação principal Streamlit com toda a lógica de UI, extração e IA
├── requirements.txt    # Dependências Python necessárias para execução do projeto
├── .env.example        # Modelo para configuração da chave da API do Google Gemini
├── README.md           # Documentação completa e instruções de uso do projeto
```

---

## 🔧 Pré-requisitos

- **Python 3.10** ou versão superior instalada no sistema.
- Gerenciador de pacotes **pip** atualizado.
- Chave de API ativa do **Google Gemini** (gratuita através do [Google AI Studio](https://aistudio.google.com/)).

---

## 🚀 Guia de Instalação e Execução Local

Siga as etapas abaixo para configurar e executar a aplicação no seu computador:

### 1. Clonar ou Baixar o Projeto

Coloque os arquivos `app.py`, `requirements.txt` e `.env` no mesmo diretório:

```bash
mkdir docugemini
cd docugemini
# Copie ou crie app.py e requirements.txt nesta pasta
```

### 2. Criar e Ativar o Ambiente Virtual

Criar um ambiente isolado (`venv`) evita conflitos entre versões de bibliotecas.

- **No Linux / macOS:**
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```

- **No Windows (PowerShell):**
  ```powershell
  python -m venv venv
  .\venv\Scripts\Activate.ps1
  ```

- **No Windows (Prompt de Comando - CMD):**
  ```cmd
  python -m venv venv
  .\venv\Scripts\activate.bat
  ```

### 3. Instalar Dependências

Com o ambiente virtual ativado, instale todos os pacotes requeridos:

```bash
pip install -r requirements.txt
```

> **As principais dependências instaladas são:**
> - `streamlit`: Framework reativo de interface web.
> - `google-genai`: SDK oficial da Google para chamadas ao Gemini.
> - `pypdf`: Biblioteca moderna para leitura e extração de texto de PDFs.
> - `beautifulsoup4` & `requests`: Raspagem e limpeza semântica de páginas web.
> - `python-dotenv`: Carregamento automático de variáveis do `.env`.

### 4. Configurar a Chave de API do Gemini

Crie um arquivo chamado `.env` na raiz do projeto (ao lado de `app.py`):

```env
GEMINI_API_KEY="sua_chave_do_google_ai_studio_aqui"
```

> **Nota:** Caso prefira não criar o arquivo `.env`, você também poderá digitar a chave diretamente no campo "Chave GEMINI_API_KEY" localizado na barra lateral da aplicação.

### 5. Iniciar o Servidor Streamlit

Execute o comando no terminal:

```bash
streamlit run app.py
```

O Streamlit iniciará localmente e abrirá a aplicação automaticamente no seu navegador padrão pelo endereço:
```text
http://localhost:8501
```

---

## 💡 Como Utilizar a Ferramenta

1. **Escolha o tipo de entrada:**
   - **🔗 Inserir Link (URL):** Cole o link de um artigo (ex.: Medium, Dev.to, arXiv, documentação do React, Python ou Docker).
   - **📂 Fazer Upload de PDF:** Selecione ou arraste um PDF técnico do seu computador.
2. **Selecione o Modelo do Gemini:** Escolha `gemini-2.5-flash` para velocidade ideal ou `gemini-2.5-pro` para raciocínio analítico profundo.
3. **Clique em "🚀 Processar Documento":** A ferramenta extrairá o conteúdo e gerará o resumo estruturado completo.
4. **Interaja no Chatbot Q&A:** Utilize o campo de chat inferior para tirar dúvidas pontuais sobre termos, códigos ou conceitos presentes no texto.

---

## 🤖 Modelos Gemini Suportados

| Modelo | Recomendação de Uso | Velocidade | Raciocínio |
| :--- | :--- | :---: | :---: |
| **`gemini-2.5-flash`** | **Padrão recomendado.** Excelente equilíbrio entre velocidade, precisão e limites de tokens. | ⚡ Muito Alta | ⭐⭐⭐⭐ |
| **`gemini-2.5-pro`** | Ideal para documentos longos, papers acadêmicos densos ou análises que exigem síntese detalhada. | ⏳ Média | ⭐⭐⭐⭐⭐ |
| **`gemini-2.0-flash`** | Modelo ágil para consultas rápidas e resumos executivos diretos. | ⚡ Muito Alta | ⭐⭐⭐ |

---

## 🔍 Resolução de Problemas Frequentes

### 1. `Chave de API do Gemini não encontrada`
- Certifique-se de que o arquivo `.env` foi criado na mesma pasta do `app.py`.
- Verifique se a variável está com o nome exato `GEMINI_API_KEY`.
- Alternativamente, cole a chave diretamente na caixa de texto na barra lateral do Streamlit.

### 2. `O PDF não contém texto selecionável`
- Esse aviso indica que o PDF é composto por **imagens escaneadas** e não por texto vetorial selecionável.
- Utilize documentos PDF que permitam selecionar texto com o cursor do mouse.

### 3. `Falha na requisição web da URL`
- Alguns sites bloqueiam raspagens por meio de paywalls, captchas (Cloudflare) ou autenticação obrigatória.
- Nesses casos, copie o texto da página ou salve o artigo como arquivo PDF e faça o upload direto pela aba de PDF.

---

## 📄 Licença

Este projeto é distribuído sob a licença **MIT**. Sinta-se livre para usar, modificar e distribuir conforme necessário.

