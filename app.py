"""
Resumidor e Chatbot de Documentação Técnica e Artigos
=====================================================
Aplicação desenvolvida com Streamlit e a API Oficial do Google GenAI (SDK google-genai).
Permite extrair conteúdo de URLs e arquivos PDF, gerar resumos técnicos estruturados
e interagir via Chat Q&A com respostas fundamentadas no documento.
"""

import os
import re
from typing import Optional
from dotenv import load_dotenv
import streamlit as st
import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader
from google import genai
from google.genai import types

# 1. Carrega variáveis de ambiente (.env)
load_dotenv()

# Configuração da página no Streamlit
st.set_page_config(
    page_title="DocuGemini | Resumidor & Chatbot",
    page_icon="📄",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Estilização CSS customizada para visual profissional e limpo
st.markdown("""
<style>
    .main-title {
        font-size: 2.2rem;
        font-weight: 700;
        color: #1E293B;
        margin-bottom: 0.2rem;
    }
    .sub-title {
        font-size: 1.05rem;
        color: #64748B;
        margin-bottom: 1.5rem;
    }
    .metric-card {
        background-color: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 12px;
    }
    .source-badge {
        display: inline-block;
        background-color: #EFF6FF;
        color: #1D4ED8;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 0.85rem;
        font-weight: 600;
        margin-bottom: 8px;
    }
</style>
""", unsafe_allow_html=True)


# ==============================================================================
# 2. Inicialização do Cliente Gemini e Sessão do Streamlit
# ==============================================================================

def get_gemini_client(api_key: Optional[str] = None) -> genai.Client:
    """
    Inicializa o cliente oficial do Google GenAI utilizando a chave fornecida
    ou a variável de ambiente GEMINI_API_KEY.
    """
    key = api_key or os.getenv("GEMINI_API_KEY")
    if not key:
        raise ValueError("Chave de API do Gemini não encontrada. Configure o arquivo .env ou informe na barra lateral.")
    return genai.Client(api_key=key)


def init_session_state():
    """Inicializa as variáveis de controle no st.session_state."""
    if "document_text" not in st.session_state:
        st.session_state.document_text = None
    if "document_source" not in st.session_state:
        st.session_state.document_source = None
    if "summary" not in st.session_state:
        st.session_state.summary = None
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []
    if "processed" not in st.session_state:
        st.session_state.processed = False


init_session_state()


# ==============================================================================
# 3. Funções de Extração de Conteúdo (PDF e URL)
# ==============================================================================

def extract_text_from_pdf(uploaded_file) -> str:
    """
    Extrai todo o conteúdo de texto de um arquivo PDF carregado via Streamlit.
    """
    try:
        reader = PdfReader(uploaded_file)
        text_parts = []
        for index, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text and page_text.strip():
                text_parts.append(page_text.strip())
        
        full_text = "\n\n".join(text_parts)
        if not full_text.strip():
            raise ValueError("O PDF não contém texto selecionável (pode ser uma imagem escaneada).")
        return full_text
    except Exception as e:
        raise RuntimeError(f"Erro ao extrair texto do PDF: {str(e)}")


def extract_text_from_url(url: str) -> str:
    """
    Faz requisição HTTP à URL informada e extrai o texto do corpo da página,
    removendo scripts, estilos, rodapés e tags de navegação irrelevantes.
    """
    # Validação simples de formato de URL
    if not re.match(r"^https?://", url.strip()):
        raise ValueError("A URL deve iniciar com http:// ou https://")

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
    }
    
    try:
        response = requests.get(url.strip(), headers=headers, timeout=20)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Remove tags irrelevantes para o conteúdo do artigo/documentação
        for tag in soup(["script", "style", "nav", "footer", "header", "noscript", "aside", "form"]):
            tag.decompose()
            
        # Prioriza elementos semânticos de conteúdo se existirem
        main_content = soup.find("article") or soup.find("main") or soup.find(id=re.compile(r"content|main|article", re.I))
        target = main_content if main_content else soup.body
        
        if not target:
            raise ValueError("Não foi possível identificar o corpo de texto na página.")
            
        text = target.get_text(separator="\n", strip=True)
        # Limpa quebras excessivas de linha
        clean_text = re.sub(r"\n{3,}", "\n\n", text)
        
        if len(clean_text.strip()) < 100:
            raise ValueError("O conteúdo extraído da URL é muito curto ou foi bloqueado por paywall/anti-bot.")
            
        return clean_text
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Falha na requisição web da URL: {str(e)}")
    except Exception as e:
        raise RuntimeError(f"Erro no processamento da página HTML: {str(e)}")


# ==============================================================================
# 4. Serviços de IA Generativa com Gemini
# ==============================================================================

SUMMARY_SYSTEM_INSTRUCTION = """
Você é um Engenheiro de Software Sênior e Especialista em IA encarregado de analisar 
documentações técnicas e artigos de engenharia.
Sua missão é ler com precisão o material fornecido e gerar um resumo analítico de alto valor.

O resumo DEVE conter estritamente as quatro seções a seguir formatadas em Markdown elegante:

### 1. 📋 Visão Geral
Um resumo executivo conciso (2 a 3 parágrafos) do tema principal, do problema abordado e da proposta de valor do documento.

### 2. 💡 Principais Conceitos
Lista com marcadores detalhando as ideias fundamentais, arquiteturas, princípios ou definições cruciais explicadas no documento.

### 3. 🛠️ Tecnologias e Metodologias Citadas
Lista detalhada das ferramentas, linguagens, frameworks, padrões de projeto, protocolos ou metodologias científicas/técnicas abordadas.

### 4. 🎯 Conclusão e Impactos
Principais conclusões do autor, aplicações práticas, benefícios técnicos e desafios ou limitações mencionadas.

Seja factual, claro e estritamente fiel ao texto original, sem inventar dados.
"""

CHAT_SYSTEM_INSTRUCTION = """
Você é o assistente técnico especialista exclusivo do documento analisado.
Seu objetivo é responder às perguntas do usuário com base ESTRITAMENTE no conteúdo fornecido no contexto do documento.

Diretrizes obrigatórias:
1. Responda de maneira clara, técnica, precisa e prestativa em Português.
2. Baseie cada afirmação no documento. Sempre que relevante, faça referências ou cite trechos conceituais do material lido.
3. Se a pergunta do usuário não puder ser respondida com base no documento, responda honestamente:
   "Com base no documento fornecido, essa informação não é abordada ou não foi mencionada."
4. Não invente informações externas fora do contexto fornecido.
"""

def generate_summary(client: genai.Client, model_name: str, document_text: str) -> str:
    """
    Gera o resumo estruturado utilizando o modelo Gemini especificado.
    """
    prompt = f"""Analise o seguinte documento e produza o resumo estruturado conforme suas instruções:

--- INÍCIO DO DOCUMENTO ---
{document_text[:60000]}
--- FIM DO DOCUMENTO ---
"""
    config = types.GenerateContentConfig(
        system_instruction=SUMMARY_SYSTEM_INSTRUCTION,
        temperature=0.2,
    )
    
    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=config,
    )
    return response.text or "Não foi possível obter o resumo."


def answer_chat_question(
    client: genai.Client,
    model_name: str,
    document_text: str,
    chat_history: list,
    user_query: str
) -> str:
    """
    Responde à dúvida do usuário mantendo o contexto histórico da conversa e do documento.
    """
    # Monta o contexto de histórico recente
    history_formatted = []
    for msg in chat_history[-6:]:  # Últimas 6 interações
        role_label = "Usuário" if msg["role"] == "user" else "Assistente"
        history_formatted.append(f"{role_label}: {msg['content']}")
    
    history_context = "\n".join(history_formatted)
    
    prompt = f"""CONTEXTO DO DOCUMENTO:
\"\"\"{document_text[:60000]}\"\"\"

HISTÓRICO DA CONVERSA:
{history_context}

PERGUNTA ATUAL DO USUÁRIO:
{user_query}

Responda à pergunta atual respeitando rigorosamente as diretrizes e o conteúdo do documento."""

    config = types.GenerateContentConfig(
        system_instruction=CHAT_SYSTEM_INSTRUCTION,
        temperature=0.3,
    )
    
    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=config,
    )
    return response.text or "Não foi possível gerar a resposta."


# ==============================================================================
# 5. Barra Lateral (Configurações & Chave de API)
# ==============================================================================

with st.sidebar:
    st.image("https://img.icons8.com/color/96/google-logo.png", width=48)
    st.title("Configurações")
    
    env_api_key = os.getenv("GEMINI_API_KEY", "")
    api_key_input = st.text_input(
        "Chave GEMINI_API_KEY:",
        value=env_api_key,
        type="password",
        help="Carregada automaticamente do .env ou inserida manualmente aqui.",
        placeholder="AIzaSy..."
    )
    
    model_selected = st.selectbox(
        "Modelo do Gemini:",
        options=["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
        index=0,
        help="gemini-2.5-flash oferece alta velocidade e excelente capacidade de raciocínio para sumarização e Q&A."
    )
    
    st.markdown("---")
    st.subheader("Sobre o Projeto")
    st.markdown("""
    Este sistema utiliza:
    - **Streamlit** para a interface reativa
    - **Google GenAI SDK** (`google-genai`)
    - **PyPDF** para extração de arquivos PDF
    - **BeautifulSoup4** para parsing de artigos Web
    - **python-dotenv** para gerenciamento de credenciais
    """)
    
    if st.button("🗑️ Limpar Sessão / Novo Documento", use_container_width=True):
        st.session_state.document_text = None
        st.session_state.document_source = None
        st.session_state.summary = None
        st.session_state.chat_history = []
        st.session_state.processed = False
        st.rerun()


# ==============================================================================
# 6. Área Principal da Aplicação
# ==============================================================================

st.markdown('<div class="main-title">📄 Resumidor & Chatbot de Artigos e Docs</div>', unsafe_allow_html=True)
st.markdown('<div class="sub-title">Extraia insights estruturados de documentações ou PDFs e converse interativamente com o material via Google Gemini.</div>', unsafe_allow_html=True)

# Bloco 1: Seleção de Fonte e Upload
st.subheader("1. Forneça o Documento para Análise")

tab_url, tab_pdf = st.tabs(["🔗 Inserir Link (URL)", "📂 Fazer Upload de PDF"])

with tab_url:
    url_input = st.text_input(
        "Cole a URL da documentação técnica ou artigo:",
        placeholder="https://docs.exemplo.com/artigo-tecnico",
        key="input_url"
    )

with tab_pdf:
    pdf_file = st.file_uploader(
        "Selecione um arquivo PDF no seu computador:",
        type=["pdf"],
        help="O arquivo deve conter texto legível.",
        key="input_pdf"
    )

process_col1, process_col2 = st.columns([1, 4])
with process_col1:
    process_button = st.button("🚀 Processar Documento", type="primary", use_container_width=True)

# Processamento ao clicar no botão
if process_button:
    current_key = api_key_input.strip() or env_api_key
    if not current_key:
        st.error("⚠️ Por favor, informe sua GEMINI_API_KEY no arquivo .env ou na barra lateral para continuar.")
    else:
        text_content = ""
        source_name = ""
        
        try:
            with st.spinner("⏳ Extraindo conteúdo do documento..."):
                # Prioriza PDF se enviado, caso contrário a URL
                if pdf_file is not None:
                    text_content = extract_text_from_pdf(pdf_file)
                    source_name = f"Arquivo PDF: {pdf_file.name}"
                elif url_input.strip():
                    text_content = extract_text_from_url(url_input)
                    source_name = f"URL: {url_input.strip()}"
                else:
                    st.warning("⚠️ Insira uma URL válida ou anexe um arquivo PDF antes de processar.")
                    st.stop()
            
            # Inicializa cliente Gemini
            client = get_gemini_client(api_key=current_key)
            
            with st.spinner("🧠 O Gemini está lendo o conteúdo e gerando o resumo estruturado..."):
                summary_result = generate_summary(client, model_selected, text_content)
                
            # Salva na sessão
            st.session_state.document_text = text_content
            st.session_state.document_source = source_name
            st.session_state.summary = summary_result
            st.session_state.chat_history = []  # Reseta o chat para o novo documento
            st.session_state.processed = True
            
            st.success("✅ Documento processado e resumo gerado com sucesso!")
            st.rerun()
            
        except Exception as err:
            st.error(f"❌ Erro durante o processamento: {str(err)}")


# ==============================================================================
# 7. Exibição do Resumo e Métricas
# ==============================================================================

if st.session_state.processed and st.session_state.summary:
    st.markdown("---")
    st.subheader("2. Resumo Estruturado do Documento")
    
    words_count = len(st.session_state.document_text.split())
    read_time_min = max(1, round(words_count / 200))
    
    col_m1, col_m2, col_m3 = st.columns(3)
    with col_m1:
        st.info(f"📌 **Origem:** {st.session_state.document_source}")
    with col_m2:
        st.info(f"📊 **Volume:** {words_count:,} palavras ({len(st.session_state.document_text):,} caracteres)")
    with col_m3:
        st.info(f"⏱️ **Tempo Estimado de Leitura Original:** ~{read_time_min} min")

    # Renderiza o resumo em Markdown
    with st.container():
        st.markdown(st.session_state.summary)

    # ==========================================================================
    # 8. Funcionalidade de Chat Interativo (Q&A com Grounding)
    # ==========================================================================
    st.markdown("---")
    st.subheader("3. Chat Q&A Interativo com o Documento")
    st.caption("Faça perguntas pontuais. As respostas serão baseadas estritamente no conteúdo extraído.")

    # Exibe o histórico de mensagens
    for message in st.session_state.chat_history:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    # Campo para entrada de pergunta
    if user_prompt := st.chat_input("Pergunte algo sobre este documento..."):
        # 1. Adiciona a pergunta do usuário ao histórico
        st.session_state.chat_history.append({"role": "user", "content": user_prompt})
        with st.chat_message("user"):
            st.markdown(user_prompt)

        # 2. Gera a resposta do Gemini
        with st.chat_message("assistant"):
            with st.spinner("Consultando documento com o Gemini..."):
                current_key = api_key_input.strip() or env_api_key
                try:
                    client = get_gemini_client(api_key=current_key)
                    answer = answer_chat_question(
                        client=client,
                        model_name=model_selected,
                        document_text=st.session_state.document_text,
                        chat_history=st.session_state.chat_history,
                        user_query=user_prompt
                    )
                    st.markdown(answer)
                    st.session_state.chat_history.append({"role": "assistant", "content": answer})
                except Exception as e:
                    error_msg = f"Erro ao gerar resposta: {str(e)}"
                    st.error(error_msg)
