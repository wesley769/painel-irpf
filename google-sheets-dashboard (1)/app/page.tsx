import Papa from 'papaparse';
import DashboardClient from '@/components/DashboardClient';
import SyncButton from '@/components/SyncButton';
import { AlertCircle } from 'lucide-react';

const SHEET_ID = '1KiickVOaaPhzDqXentmGhKafKvl77SpA';
const GID = '527678426';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

export const revalidate = 60; // Revalidate every 60 seconds

async function fetchSheetData() {
  try {
    const response = await fetch(CSV_URL, { next: { revalidate: 60 } });
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    const csvText = await response.text();
    
    // Check if the response is actually an HTML page (which happens if it redirects to Google Login because it's private)
    if (csvText.trim().startsWith('<!DOCTYPE html>')) {
      throw new Error('A planilha é privada. Por favor, altere o compartilhamento para "Qualquer pessoa com o link".');
    }

    const parsed = Papa.parse(csvText, {
      header: false,
      skipEmptyLines: true,
      dynamicTyping: false, // Keep as strings to avoid losing formatting on CPFs or large numbers
    });

    return { data: parsed.data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || 'Erro desconhecido ao carregar a planilha.' };
  }
}

const LionLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2L9 6H5l-1 5 3 3v5l5 3 5-3v-5l3-3-1-5h-4l-3-4zM10 10a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm2 4c-1.5 0-3 1-3 2v2h6v-2c0-1-1.5-2-3-2z"/>
  </svg>
);

export default async function Page() {
  const { data, error } = await fetchSheetData();

  return (
    <main className="min-h-screen bg-neutral-50">
      {/* Header with Brand Colors: #1A3375 (Navy) and #00FCA8 (Neon Green) */}
      <header className="bg-[#1A3375] text-white pt-8 pb-12 px-4 md:px-8 shadow-lg relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00FCA8] opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-[#00FCA8] rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(0,252,168,0.3)] transform rotate-3">
              <LionLogo className="w-10 h-10 text-[#1A3375] -rotate-3" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                Departamento de IRPF
              </h1>
              <p className="text-[#00FCA8] font-medium mt-1 text-lg">
                Patrimonium Contabilidade
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start md:items-end gap-3">
            <a 
              href={`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=${GID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-bold text-[#1A3375] bg-[#00FCA8] rounded-lg hover:bg-[#00e096] transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              Acessar Planilha Original
            </a>
            <SyncButton />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 md:p-8 -mt-8 relative z-20">
        {error ? (
          <div className="bg-white border-l-4 border-red-500 rounded-xl p-6 flex items-start gap-4 shadow-lg">
            <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">Não foi possível acessar os dados</h3>
              <p className="text-neutral-600 mt-1">{error}</p>
              <div className="mt-4 p-4 bg-neutral-50 rounded-lg border border-neutral-100 text-sm text-neutral-700 space-y-2">
                <p className="font-medium">Para resolver isso:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Abra sua planilha do Google Sheets.</li>
                  <li>Clique no botão <strong>Compartilhar</strong> (canto superior direito).</li>
                  <li>Em &quot;Acesso geral&quot;, mude de &quot;Restrito&quot; para <strong>Qualquer pessoa com o link</strong>.</li>
                  <li>O papel pode continuar como &quot;Leitor&quot;.</li>
                  <li>Volte aqui e recarregue a página.</li>
                </ol>
              </div>
            </div>
          </div>
        ) : (
          <DashboardClient data={data as any[][]} />
        )}
      </div>
    </main>
  );
}
