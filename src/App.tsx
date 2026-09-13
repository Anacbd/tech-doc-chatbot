import { useState, useEffect } from 'react';
import {
  FileCode,
  PlayCircle,
  BookOpen,
  Download,
  Terminal,
  Sparkles,
  Layers,
  Cpu,
} from 'lucide-react';
import { StreamlitLiveApp } from './components/StreamlitLiveApp';
import { CodeViewer } from './components/CodeViewer';
import { SourceFiles } from './types';

export default function App() {
  const [activeMainTab, setActiveMainTab] = useState<'demo' | 'code' | 'guide'>('demo');
  const [sourceFiles, setSourceFiles] = useState<SourceFiles>({
    appPy: '',
    reqTxt: '',
    readme: '',
  });
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);

  // Fetch the source files from backend
  useEffect(() => {
    async function loadFiles() {
      try {
        const res = await fetch('/api/source-files');
        if (res.ok) {
          const data = await res.json();
          setSourceFiles({
            appPy: data.appPy || '',
            reqTxt: data.reqTxt || '',
            readme: data.readme || '',
          });
        }
      } catch (err) {
        console.error('Erro ao carregar arquivos fonte:', err);
      } finally {
        setIsLoadingFiles(false);
      }
    }
    loadFiles();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Top Header Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  DocuGemini
                </h1>
                <span className="text-[10px] uppercase tracking-wider font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  Streamlit + Gemini
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Resumidor Estruturado & Chatbot Q&A de Documentações e Artigos
              </p>
            </div>
          </div>

          {/* Navigation Mode Tabs */}
          <nav className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
            <button
              id="nav-tab-demo"
              onClick={() => setActiveMainTab('demo')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMainTab === 'demo'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>Demo Interativa</span>
            </button>

            <button
              id="nav-tab-code"
              onClick={() => setActiveMainTab('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMainTab === 'code'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Código Python</span>
            </button>

            <button
              id="nav-tab-guide"
              onClick={() => setActiveMainTab('guide')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMainTab === 'guide'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Como Rodar</span>
            </button>
          </nav>

          {/* Quick Download Button */}
          <div className="flex items-center gap-2">
            <a
              id="btn-download-app-py"
              href="/api/download/app.py"
              download="app.py"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar app.py</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full">
        {activeMainTab === 'demo' && (
          <StreamlitLiveApp onGoToCodeTab={() => setActiveMainTab('code')} />
        )}

        {activeMainTab === 'code' && (
          <div className="flex flex-col gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <FileCode className="w-5 h-5 text-blue-600" />
                Arquivos da Aplicação Streamlit
              </h2>
              <p className="text-xs text-slate-500">
                Código modular completo pronto para execução local com o SDK oficial <code>google-genai</code> e <code>pypdf</code>.
              </p>
            </div>
            {isLoadingFiles ? (
              <div className="p-8 text-center text-xs text-slate-500">Carregando código...</div>
            ) : (
              <CodeViewer files={sourceFiles} />
            )}
          </div>
        )}

        {activeMainTab === 'guide' && (
          <div className="max-w-4xl mx-auto flex flex-col gap-6">
            {/* Guide Introduction */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                Instruções Passo a Passo para Execução Local
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Esta aplicação foi desenvolvida seguindo as melhores práticas da engenharia de software e da biblioteca <strong>Streamlit</strong>, integrando a versão mais recente do SDK do Google Gemini (<strong>google-genai</strong>).
              </p>
            </div>

            {/* Architecture Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 mb-1">1. Ingestão Multiformato</h3>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Extração automática de PDFs com <code>pypdf</code> e raspagem de artigos via <code>requests</code> + <code>BeautifulSoup4</code>, removendo scripts e propagandas.
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3">
                  <Cpu className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 mb-1">2. Resumo Estruturado</h3>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Prompt refinado dividindo a análise em 4 pilares: Visão Geral, Conceitos, Tecnologias citadas e Conclusão/Impactos.
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 mb-1">3. Chatbot Grounded</h3>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Q&A interativo com histórico mantido em <code>st.session_state</code>, instruindo o Gemini a responder estritamente com base no texto.
                </p>
              </div>
            </div>

            {/* Terminal Commands Guide */}
            <div className="bg-slate-900 text-slate-100 p-6 rounded-xl border border-slate-800 shadow-sm flex flex-col gap-4 font-mono text-xs">
              <div>
                <span className="text-emerald-400 font-semibold block mb-1"># Passo 1: Clone ou organize a pasta do projeto</span>
                <p className="text-slate-400 text-[11px] mb-2 font-sans">
                  Salve os arquivos <code>app.py</code> e <code>requirements.txt</code> no mesmo diretório.
                </p>
              </div>

              <div className="border-t border-slate-800 pt-3">
                <span className="text-emerald-400 font-semibold block mb-1"># Passo 2: Crie e ative o ambiente virtual (Venv)</span>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-200 leading-relaxed">
                  <span className="text-slate-500"># No Linux / macOS:</span><br />
                  python3 -m venv venv<br />
                  source venv/bin/activate<br /><br />
                  <span className="text-slate-500"># No Windows:</span><br />
                  python -m venv venv<br />
                  .\venv\Scripts\activate
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3">
                <span className="text-emerald-400 font-semibold block mb-1"># Passo 3: Instale as bibliotecas requeridas</span>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-emerald-300">
                  pip install -r requirements.txt
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3">
                <span className="text-emerald-400 font-semibold block mb-1"># Passo 4: Configure sua chave no arquivo .env</span>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-300">
                  echo GEMINI_API_KEY="sua_chave_aqui" &gt; .env
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3">
                <span className="text-emerald-400 font-semibold block mb-1"># Passo 5: Inicie o Streamlit</span>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-emerald-400 font-bold">
                  streamlit run app.py
                </div>
                <p className="text-slate-400 text-[11px] mt-2 font-sans">
                  Acesse pelo navegador em <code>http://localhost:8501</code>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>Resumidor e Chatbot com Streamlit & Google GenAI (Gemini)</span>
          <div className="flex items-center gap-3">
            <span>SDK: <code>google-genai</code></span>
            <span>•</span>
            <span>Framework: <code>streamlit</code></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
