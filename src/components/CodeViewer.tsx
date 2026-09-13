import { useState } from 'react';
import { Check, Copy, Download, FileCode, FileText, Terminal, BookOpen } from 'lucide-react';
import { SourceFiles } from '../types';

interface CodeViewerProps {
  files: SourceFiles;
}

export function CodeViewer({ files }: CodeViewerProps) {
  const [activeTab, setActiveTab] = useState<'app' | 'req' | 'readme'>('app');
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (content: string, key: string) => {
    navigator.clipboard.writeText(content);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const currentContent =
    activeTab === 'app' ? files.appPy : activeTab === 'req' ? files.reqTxt : files.readme;
  const currentFilename =
    activeTab === 'app' ? 'app.py' : activeTab === 'req' ? 'requirements.txt' : 'README.md';

  return (
    <div className="flex flex-col gap-6">
      {/* Quick Setup Card */}
      <div className="bg-slate-900 text-slate-100 rounded-xl p-5 border border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <h3 className="font-semibold text-base text-white">Guia Rápido de Execução Local</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Execute os comandos abaixo no seu terminal para rodar o Streamlit na sua máquina:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col justify-between">
            <span className="text-slate-400 text-[11px] mb-1">1. Criar ambiente virtual</span>
            <code className="text-emerald-400">python -m venv venv</code>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col justify-between">
            <span className="text-slate-400 text-[11px] mb-1">2. Instalar dependências</span>
            <code className="text-emerald-400">pip install -r requirements.txt</code>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col justify-between">
            <span className="text-slate-400 text-[11px] mb-1">3. Iniciar a aplicação</span>
            <code className="text-emerald-400">streamlit run app.py</code>
          </div>
        </div>
      </div>

      {/* File Viewer Section */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Header with Tabs and Actions */}
        <div className="flex flex-wrap items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 gap-3">
          <div className="flex items-center gap-1.5">
            <button
              id="tab-app-py"
              onClick={() => setActiveTab('app')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'app'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileCode className="w-4 h-4 text-blue-600" />
              <span>app.py</span>
            </button>

            <button
              id="tab-req-txt"
              onClick={() => setActiveTab('req')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'req'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4 text-amber-600" />
              <span>requirements.txt</span>
            </button>

            <button
              id="tab-readme-md"
              onClick={() => setActiveTab('readme')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'readme'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>README.md</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-copy-code"
              onClick={() => handleCopy(currentContent, activeTab)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              {copied === activeTab ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copiar Código</span>
                </>
              )}
            </button>

            <button
              id="btn-download-file"
              onClick={() => handleDownload(currentFilename, currentContent)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar {currentFilename}</span>
            </button>
          </div>
        </div>

        {/* Code Content Display */}
        <div className="relative">
          <div className="max-h-[640px] overflow-auto p-4 bg-slate-950 font-mono text-xs leading-relaxed text-slate-200">
            <pre className="whitespace-pre">
              <code>{currentContent || 'Carregando arquivo...'}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
