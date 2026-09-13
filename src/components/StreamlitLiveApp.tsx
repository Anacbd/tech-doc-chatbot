import { useState, useRef, useEffect, ChangeEvent, FormEvent, DragEvent } from 'react';
import {
  FileText,
  Link as LinkIcon,
  Upload,
  Send,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  MessageSquare,
  Bot,
  User,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileCode2,
} from 'lucide-react';
import { ChatMessage, DocumentData } from '../types';
import { SAMPLE_DOCS, SampleDoc } from '../data/sampleDocs';

interface StreamlitLiveAppProps {
  onGoToCodeTab?: () => void;
}

export function StreamlitLiveApp({ onGoToCodeTab }: StreamlitLiveAppProps) {
  // Input State
  const [activeInputTab, setActiveInputTab] = useState<'url' | 'pdf' | 'sample'>('url');
  const [urlInput, setUrlInput] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [selectedSample, setSelectedSample] = useState<SampleDoc>(SAMPLE_DOCS[0]);

  // Processing & Data State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  // Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');

  // UI state
  const [summaryViewMode, setSummaryViewMode] = useState<'cards' | 'markdown'>('cards');
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    concepts: true,
    tech: true,
    conclusion: true,
  });

  const [isDragging, setIsDragging] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatLoading]);

  // Helper to validate and set selected PDF
  const setPdfFromSelectedFile = (file: File) => {
    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setErrorMessage('Por favor selecione um arquivo válido no formato PDF (.pdf).');
      return;
    }
    setPdfFile(file);
    setErrorMessage(null);
  };

  // Handle PDF file selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFromSelectedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setPdfFromSelectedFile(e.dataTransfer.files[0]);
    }
  };

  // Convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Process document
  const handleProcessDocument = async () => {
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      let extractedText = '';
      let title = '';
      let sourceName = '';
      let sourceType: 'url' | 'pdf' | 'sample' = activeInputTab;
      let pagesCount: number | undefined;

      if (activeInputTab === 'url') {
        if (!urlInput.trim()) {
          throw new Error('Insira a URL do artigo ou documentação.');
        }
        setProcessingStep('Extraindo conteúdo textual da URL informada...');
        const res = await fetch('/api/extract-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: urlInput.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao extrair texto da URL.');
        extractedText = data.text;
        title = data.title;
        sourceName = `URL: ${urlInput.trim()}`;
      } else if (activeInputTab === 'pdf') {
        if (!pdfFile) {
          throw new Error('Selecione um arquivo PDF no seu computador.');
        }
        setProcessingStep('Lendo e parseando páginas do documento PDF...');
        const base64Data = await fileToBase64(pdfFile);
        const res = await fetch('/api/extract-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Data, filename: pdfFile.name }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao processar o arquivo PDF.');
        extractedText = data.text;
        title = data.title;
        sourceName = `PDF: ${pdfFile.name}`;
        pagesCount = data.pages;
      } else {
        // Sample document
        setProcessingStep('Carregando artigo técnico de exemplo...');
        extractedText = selectedSample.text;
        title = selectedSample.title;
        sourceName = selectedSample.sourceName;
      }

      const words = extractedText.split(/\s+/).filter(Boolean).length;
      const doc: DocumentData = {
        title,
        sourceType,
        sourceName,
        text: extractedText,
        wordCount: words,
        characterCount: extractedText.length,
        estimatedReadingTime: Math.max(1, Math.round(words / 200)),
        pages: pagesCount,
      };
      setDocumentData(doc);

      // Summarization step
      setProcessingStep('Gerando resumo estruturado com o Google Gemini...');
      const sumRes = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: extractedText,
          sourceName,
          model: selectedModel,
        }),
      });
      const sumData = await sumRes.json();
      if (!sumRes.ok) throw new Error(sumData.error || 'Falha ao gerar resumo no Gemini.');

      setSummary(sumData.summary);
      setChatHistory([]); // Reset chat for new document
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocorreu um erro ao processar o documento.');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  // Reset Session
  const handleResetSession = () => {
    setDocumentData(null);
    setSummary(null);
    setChatHistory([]);
    setUrlInput('');
    setPdfFile(null);
    setErrorMessage(null);
  };

  // Chat Submission
  const handleSendChat = async (questionText?: string) => {
    const textToSend = questionText || userQuery;
    if (!textToSend.trim() || !documentData || isChatLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [...chatHistory, userMessage];
    setChatHistory(updatedHistory);
    setUserQuery('');
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText: documentData.text,
          chatHistory: updatedHistory,
          userQuery: userMessage.content,
          model: selectedModel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro no chat do Gemini.');

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatHistory([...updatedHistory, assistantMessage]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ Falha ao obter resposta: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatHistory([...updatedHistory, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Parse summary into 4 distinct sections if present
  const parseSummarySections = (raw: string) => {
    const sections: Record<string, string> = {
      overview: '',
      concepts: '',
      tech: '',
      conclusion: '',
    };

    // Regex to detect headers
    const p1 = raw.indexOf('1.');
    const p2 = raw.indexOf('2.');
    const p3 = raw.indexOf('3.');
    const p4 = raw.indexOf('4.');

    if (p1 !== -1 && p2 !== -1 && p3 !== -1 && p4 !== -1) {
      sections.overview = raw.substring(p1, p2).trim();
      sections.concepts = raw.substring(p2, p3).trim();
      sections.tech = raw.substring(p3, p4).trim();
      sections.conclusion = raw.substring(p4).trim();
      return sections;
    }

    return null;
  };

  const parsed = summary ? parseSummarySections(summary) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[750px]">
      {/* Streamlit-styled Sidebar */}
      <aside className="lg:col-span-3 bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between shadow-xs">
        <div>
          {/* Logo and App Title */}
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
              St
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 leading-tight">Streamlit Console</h2>
              <span className="text-[11px] text-slate-500">Google GenAI Integration</span>
            </div>
          </div>

          {/* Model Selection */}
          <div className="mt-5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Modelo Gemini
            </label>
            <select
              id="select-model"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="gemini-2.5-flash">gemini-2.5-flash (Recomendado)</option>
              <option value="gemini-2.5-pro">gemini-2.5-pro (Raciocínio Profundo)</option>
              <option value="gemini-2.0-flash">gemini-2.0-flash</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-normal">
              Otimizado para sumarização e Q&A técnico em alta velocidade.
            </p>
          </div>

          {/* API Key Status */}
          <div className="mt-5 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>GEMINI_API_KEY Ativa</span>
            </div>
            <p className="text-[11px] text-emerald-700 mt-1 leading-normal">
              Conectada com segurança no backend Node/Python via Secrets/dotenv.
            </p>
          </div>

          {/* Reset Session Button */}
          <button
            id="btn-reset-session"
            onClick={handleResetSession}
            className="w-full mt-5 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpar Sessão / Novo Doc</span>
          </button>
        </div>

        {/* Python Code shortcut */}
        <div className="pt-4 mt-6 border-t border-slate-200">
          <button
            onClick={onGoToCodeTab}
            className="w-full flex items-center justify-between p-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold text-blue-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-blue-600" />
              <span>Ver Código Python (app.py)</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* Main Execution Area */}
      <main className="lg:col-span-9 flex flex-col gap-6">
        {/* Step 1: Input Document */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                1. Forneça o Documento para Análise
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Escolha entre colar uma URL web, carregar um arquivo PDF ou usar um exemplo pré-carregado.
              </p>
            </div>
          </div>

          {/* Input Source Tabs */}
          <div className="flex border-b border-slate-200 mb-4 gap-4">
            <button
              id="tab-input-url"
              onClick={() => setActiveInputTab('url')}
              className={`flex items-center gap-2 pb-2.5 text-xs font-semibold border-b-2 transition-all ${
                activeInputTab === 'url'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>🔗 Link de Artigo / URL</span>
            </button>

            <button
              id="tab-input-pdf"
              onClick={() => setActiveInputTab('pdf')}
              className={`flex items-center gap-2 pb-2.5 text-xs font-semibold border-b-2 transition-all ${
                activeInputTab === 'pdf'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>📂 Upload de PDF</span>
            </button>

            <button
              id="tab-input-sample"
              onClick={() => setActiveInputTab('sample')}
              className={`flex items-center gap-2 pb-2.5 text-xs font-semibold border-b-2 transition-all ${
                activeInputTab === 'sample'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>✨ Exemplos Técnicos Prontos</span>
            </button>
          </div>

          {/* Active Tab Content */}
          {activeInputTab === 'url' && (
            <div className="flex flex-col gap-2">
              <label htmlFor="url-input" className="text-xs font-semibold text-slate-700">
                Cole a URL da documentação técnica ou artigo web:
              </label>
              <div className="flex gap-2">
                <input
                  id="url-input"
                  type="url"
                  placeholder="https://exemplo.org/artigo-tecnico"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() =>
                    setUrlInput('https://en.wikipedia.org/wiki/Transformer_(deep_learning_architecture)')
                  }
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors whitespace-nowrap"
                >
                  Usar URL de Exemplo
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                A aplicação fará requisição HTTP e extrairá o texto principal limpando menus e rodapés.
              </p>
            </div>
          )}

          {activeInputTab === 'pdf' && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-700">
                Selecione ou arraste um arquivo PDF do seu dispositivo:
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/70 scale-[1.01]'
                    : pdfFile
                    ? 'border-emerald-400 bg-emerald-50/40 hover:bg-emerald-50/60'
                    : 'border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/50'
                }`}
              >
                <FileText
                  className={`w-9 h-9 mx-auto mb-2 transition-colors ${
                    isDragging
                      ? 'text-blue-600 animate-bounce'
                      : pdfFile
                      ? 'text-emerald-600'
                      : 'text-slate-400'
                  }`}
                />
                <p className="text-xs font-semibold text-slate-800">
                  {pdfFile ? pdfFile.name : 'Clique para selecionar um arquivo PDF ou solte o arquivo aqui'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {pdfFile
                    ? `${(pdfFile.size / 1024).toFixed(1)} KB selecionados • Clique para trocar`
                    : 'Suporta documentos técnicos, relatórios, manuais ou papers (.pdf)'}
                </p>
                {pdfFile && (
                  <div className="mt-3 flex justify-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPdfFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="px-2.5 py-1 text-[10px] font-medium text-slate-600 hover:text-red-600 bg-white hover:bg-red-50 border border-slate-200 rounded-md transition-colors"
                    >
                      Remover arquivo selecionado
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeInputTab === 'sample' && (
            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold text-slate-700">
                Escolha um paper ou artigo técnico demonstrativo:
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SAMPLE_DOCS.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => setSelectedSample(sample)}
                    className={`text-left p-3.5 rounded-xl border transition-all ${
                      selectedSample.id === sample.id
                        ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-100/60 px-2 py-0.5 rounded">
                        {sample.category}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 leading-snug">{sample.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{sample.sourceName}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Process Button */}
          <div className="mt-5 flex items-center justify-between pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              {activeInputTab === 'url' && urlInput.trim() ? 'Pronto para extrair URL' : ''}
              {activeInputTab === 'pdf' && pdfFile ? `Arquivo: ${pdfFile.name}` : ''}
              {activeInputTab === 'sample' ? `Exemplo: ${selectedSample.title}` : ''}
            </span>
            <button
              id="btn-process-document"
              onClick={handleProcessDocument}
              disabled={isProcessing}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white shadow-xs transition-all ${
                isProcessing
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-98'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{processingStep || 'Processando...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>🚀 Processar Documento</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Step 2: Summary Section */}
        {documentData && summary && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            {/* Header & Metrics */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  2. Resumo Estruturado do Documento
                </h3>
                <span className="text-xs text-slate-500">{documentData.sourceName}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setSummaryViewMode(summaryViewMode === 'cards' ? 'markdown' : 'cards')
                  }
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                >
                  {summaryViewMode === 'cards' ? 'Ver em Markdown' : 'Ver em Seções'}
                </button>
              </div>
            </div>

            {/* Document Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Volume Total</span>
                <span className="text-sm font-bold text-slate-800">
                  {documentData.wordCount.toLocaleString()} palavras
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Caracteres Lidos</span>
                <span className="text-sm font-bold text-slate-800">
                  {documentData.characterCount.toLocaleString()} chars
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 block">Tempo Est. Leitura</span>
                  <span className="text-sm font-bold text-slate-800">
                    ~{documentData.estimatedReadingTime} min
                  </span>
                </div>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Structured Summary Cards */}
            {summaryViewMode === 'cards' && parsed ? (
              <div className="flex flex-col gap-3 mt-4">
                {/* 1. Visão Geral */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div
                    onClick={() =>
                      setExpandedSections({
                        ...expandedSections,
                        overview: !expandedSections.overview,
                      })
                    }
                    className="flex items-center justify-between px-4 py-3 bg-blue-50/50 cursor-pointer hover:bg-blue-50 transition-colors"
                  >
                    <span className="text-xs font-bold text-blue-900 flex items-center gap-2">
                      📋 1. Visão Geral
                    </span>
                    {expandedSections.overview ? (
                      <ChevronUp className="w-4 h-4 text-blue-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  {expandedSections.overview && (
                    <div className="p-4 bg-white text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                      {parsed.overview.replace(/###?\s*1\.\s*📋?\s*Visão Geral/i, '').trim()}
                    </div>
                  )}
                </div>

                {/* 2. Principais Conceitos */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div
                    onClick={() =>
                      setExpandedSections({
                        ...expandedSections,
                        concepts: !expandedSections.concepts,
                      })
                    }
                    className="flex items-center justify-between px-4 py-3 bg-amber-50/50 cursor-pointer hover:bg-amber-50 transition-colors"
                  >
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-2">
                      💡 2. Principais Conceitos
                    </span>
                    {expandedSections.concepts ? (
                      <ChevronUp className="w-4 h-4 text-amber-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                  {expandedSections.concepts && (
                    <div className="p-4 bg-white text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                      {parsed.concepts.replace(/###?\s*2\.\s*💡?\s*Principais Conceitos/i, '').trim()}
                    </div>
                  )}
                </div>

                {/* 3. Tecnologias e Metodologias */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div
                    onClick={() =>
                      setExpandedSections({
                        ...expandedSections,
                        tech: !expandedSections.tech,
                      })
                    }
                    className="flex items-center justify-between px-4 py-3 bg-indigo-50/50 cursor-pointer hover:bg-indigo-50 transition-colors"
                  >
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-2">
                      🛠️ 3. Tecnologias e Metodologias Citadas
                    </span>
                    {expandedSections.tech ? (
                      <ChevronUp className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-indigo-600" />
                    )}
                  </div>
                  {expandedSections.tech && (
                    <div className="p-4 bg-white text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                      {parsed.tech.replace(/###?\s*3\.\s*🛠️?\s*Tecnologias[^\n]*/i, '').trim()}
                    </div>
                  )}
                </div>

                {/* 4. Conclusão e Impactos */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div
                    onClick={() =>
                      setExpandedSections({
                        ...expandedSections,
                        conclusion: !expandedSections.conclusion,
                      })
                    }
                    className="flex items-center justify-between px-4 py-3 bg-emerald-50/50 cursor-pointer hover:bg-emerald-50 transition-colors"
                  >
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-2">
                      🎯 4. Conclusão e Impactos
                    </span>
                    {expandedSections.conclusion ? (
                      <ChevronUp className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  {expandedSections.conclusion && (
                    <div className="p-4 bg-white text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                      {parsed.conclusion.replace(/###?\s*4\.\s*🎯?\s*Conclusão[^\n]*/i, '').trim()}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-line mt-4">
                {summary}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Interactive Q&A Chat Section */}
        {documentData && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col">
            <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  3. Chat Q&A Interativo com o Documento
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Faça perguntas específicas. O Gemini consultará estritamente o conteúdo extraído.
                </p>
              </div>
            </div>

            {/* Quick Question Chips */}
            <div className="flex flex-wrap gap-2 my-4">
              <button
                onClick={() => handleSendChat('Quais são as principais vantagens e pontos fortes citados?')}
                className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full border border-slate-200 transition-colors"
              >
                💡 Principais vantagens citadas?
              </button>
              <button
                onClick={() => handleSendChat('Quais são os principais desafios ou limitações apontadas?')}
                className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full border border-slate-200 transition-colors"
              >
                ⚠️ Desafios ou limitações?
              </button>
              <button
                onClick={() => handleSendChat('Liste em tópicos resumidos as tecnologias mencionadas.')}
                className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full border border-slate-200 transition-colors"
              >
                🛠️ Lista de tecnologias citadas
              </button>
            </div>

            {/* Chat Message History */}
            <div className="min-h-[200px] max-h-[420px] overflow-y-auto p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3">
              {chatHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Bot className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-medium">Nenhuma mensagem ainda.</p>
                  <p className="text-[11px] mt-0.5">
                    Digite uma pergunta abaixo ou clique em uma das sugestões acima.
                  </p>
                </div>
              ) : (
                chatHistory.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 max-w-[85%] ${
                      msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-white'
                      }`}
                    >
                      {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div
                      className={`p-3 rounded-xl text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-2xs'
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.content}</p>
                      <span
                        className={`text-[9px] block mt-1 ${
                          msg.role === 'user' ? 'text-blue-200 text-right' : 'text-slate-400'
                        }`}
                      >
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))
              )}

              {isChatLoading && (
                <div className="flex gap-3 self-start max-w-[80%]">
                  <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200 rounded-tl-none shadow-2xs flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" />
                    <div
                      className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    />
                    <div
                      className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"
                      style={{ animationDelay: '0.4s' }}
                    />
                    <span className="text-xs text-slate-500 ml-1">Consultando documento...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="mt-3 flex gap-2"
            >
              <input
                id="chat-user-query"
                type="text"
                placeholder="Faça uma pergunta sobre o documento..."
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                disabled={isChatLoading}
                className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                id="btn-send-chat"
                type="submit"
                disabled={isChatLoading || !userQuery.trim()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar</span>
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
