'use client';

import React, { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { 
  Target, DollarSign, Clock, CalendarDays, CheckCircle2, FileSpreadsheet, Activity, TrendingUp, TrendingDown
} from 'lucide-react';

interface DashboardClientProps {
  data: any[][];
}

const META_DECLARACOES = 700;
const META_FATURAMENTO = 196000;
const PRAZO_INICIO = new Date(2026, 2, 23); // 23/03/2026 (Month is 0-indexed, so 2 = March)
const PRAZO_FIM = new Date(2026, 4, 29); // 29/05/2026 (4 = May)

// Feriados nacionais no período para descontar dos dias úteis
const FERIADOS_2026 = [
  '2026-04-03', // Paixão de Cristo (Sexta-feira Santa)
  '2026-04-21', // Tiradentes
  '2026-05-01', // Dia do Trabalhador
];

function isFeriado(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const dateString = `${yyyy}-${mm}-${dd}`;
  return FERIADOS_2026.includes(dateString);
}

function parseNumber(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/R\$\s?/g, '').replace(/\./g, '').replace(/,/g, '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function getWorkingDays(startDate: Date, endDate: Date) {
  let count = 0;
  let curDate = new Date(startDate.getTime());
  // Set time to midnight to avoid timezone issues
  curDate.setHours(0, 0, 0, 0);
  const end = new Date(endDate.getTime());
  end.setHours(0, 0, 0, 0);
  
  if (curDate > end) return 0;

  while (curDate <= end) {
    const dayOfWeek = curDate.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isFeriado(curDate)) {
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  return count;
}

export default function DashboardClient({ data }: DashboardClientProps) {
  const router = useRouter();

  // Filter rows where "Nome" (index 1) is not empty
  const rows = useMemo(() => {
    if (!data || data.length <= 1) return [];
    return data.slice(1).filter(row => row[1] && String(row[1]).trim() !== '');
  }, [data]);

  const [isMounted, setIsMounted] = React.useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const stats = useMemo(() => {
    let faturamento = 0;
    let naoEntregue = 0;
    let aguardandoFinanceiro = 0;
    let transmitida = 0;
    let pago = 0;
    let naoPago = 0;

    rows.forEach(row => {
      // Faturamento (E = 4)
      faturamento += parseNumber(row[4]);

      // Status (L = 11)
      const status = String(row[11] || '').trim().toLowerCase();
      if (!status) {
        naoEntregue++;
      } else if (status === 'aguardando financeiro') {
        aguardandoFinanceiro++;
      } else {
        transmitida++;
      }

      // Pagamento (N = 13)
      const statusPagamento = String(row[13] || '').trim().toLowerCase();
      if (statusPagamento === 'sim') {
        pago++;
      } else {
        naoPago++;
      }
    });

    const totalDeclaracoes = rows.length;
    const prontas = aguardandoFinanceiro + transmitida;
    const percentualMeta = Math.min(100, (prontas / META_DECLARACOES) * 100);
    const percentualConfirmados = Math.min(100, (totalDeclaracoes / META_DECLARACOES) * 100);
    const percentualProntas = totalDeclaracoes > 0 ? Math.min(100, (prontas / totalDeclaracoes) * 100) : 0;
    const percentualFaturamento = Math.min(100, (faturamento / META_FATURAMENTO) * 100);

    // Cálculos de Dias Úteis e Ritmo
    const dataReferencia = new Date();
    const totalDiasUteis = getWorkingDays(PRAZO_INICIO, PRAZO_FIM);
    
    let diasUteisPassados = 0;
    if (dataReferencia >= PRAZO_INICIO) {
      const dataCalculoPassados = dataReferencia > PRAZO_FIM ? PRAZO_FIM : dataReferencia;
      diasUteisPassados = getWorkingDays(PRAZO_INICIO, dataCalculoPassados);
    }
    
    const diasUteisRestantes = Math.max(0, totalDiasUteis - diasUteisPassados);
    
    const ritmoIdealDiario = totalDiasUteis > 0 ? META_DECLARACOES / totalDiasUteis : 0;
    const metaAcumulada = Math.round(ritmoIdealDiario * diasUteisPassados);
    
    // Defasagem: Positivo = Adiantado, Negativo = Atrasado (invertido para melhor UX visual)
    const defasagem = prontas - metaAcumulada;
    
    const declaracoesRestantes = Math.max(0, META_DECLARACOES - prontas);
    const novoRitmo = diasUteisRestantes > 0 ? Math.ceil(declaracoesRestantes / diasUteisRestantes) : 0;

    return {
      totalDeclaracoes,
      prontas,
      faturamento,
      naoEntregue,
      aguardandoFinanceiro,
      transmitida,
      pago,
      naoPago,
      percentualMeta,
      percentualConfirmados,
      percentualProntas,
      percentualFaturamento,
      totalDiasUteis,
      diasUteisPassados,
      diasUteisRestantes,
      ritmoIdealDiario,
      metaAcumulada,
      defasagem,
      novoRitmo
    };
  }, [rows]);

  // Brand Colors: #1A3375 (Navy), #00FCA8 (Neon Green)
  const statusData = [
    { name: 'Não Entregue', value: stats.naoEntregue, color: '#f43f5e' }, // Rose
    { name: 'Aguardando Fin.', value: stats.aguardandoFinanceiro, color: '#eab308' }, // Yellow
    { name: 'Transmitida', value: stats.transmitida, color: '#00FCA8' }, // Neon Green (Brand)
  ];

  const pagamentoData = [
    { name: 'Pago', value: stats.pago, color: '#00FCA8' }, // Neon Green (Brand)
    { name: 'Não Pago', value: stats.naoPago, color: '#1A3375' }, // Navy (Brand)
  ];

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-[#1A3375] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data || data.length <= 1) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center">
        <FileSpreadsheet className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-neutral-900">A planilha está vazia</h3>
        <p className="text-neutral-500 mt-1">Adicione dados à sua planilha para visualizar o dashboard.</p>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Top Goals Section - Brand Colors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Goal 1: Declarações Prontas */}
        <div className="bg-[#1A3375] rounded-2xl p-6 shadow-xl relative overflow-hidden text-white border border-[#1A3375]/80">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#00FCA8] opacity-10 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-lg font-semibold text-white/90">Declarações Prontas</h3>
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
              <CheckCircle2 className="w-6 h-6 text-[#00FCA8]" />
            </div>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{stats.prontas}</span>
              <span className="text-xl text-white/60">/ {stats.totalDeclaracoes}</span>
            </div>
            <p className="text-sm text-[#00FCA8] mt-1 font-medium">Aguard. Fin. + Transmitidas</p>
          </div>
          <div className="mt-6 relative z-10">
            <div className="flex justify-between text-sm mb-2 font-medium">
              <span>Progresso (Confirmados)</span>
              <span className="text-[#00FCA8]">{stats.percentualProntas.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div 
                className="bg-[#00FCA8] h-3 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,252,168,0.5)]"
                style={{ width: `${stats.percentualProntas}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Goal 2: Clientes Confirmados */}
        <div className="bg-[#1A3375] rounded-2xl p-6 shadow-xl relative overflow-hidden text-white border border-[#1A3375]/80">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#00FCA8] opacity-10 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-lg font-semibold text-white/90">Clientes Confirmados</h3>
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
              <Target className="w-6 h-6 text-[#00FCA8]" />
            </div>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{stats.totalDeclaracoes}</span>
              <span className="text-xl text-white/60">/ {META_DECLARACOES}</span>
            </div>
            <p className="text-sm text-[#00FCA8] mt-1 font-medium">Na Planilha</p>
          </div>
          <div className="mt-6 relative z-10">
            <div className="flex justify-between text-sm mb-2 font-medium">
              <span>Captação</span>
              <span className="text-[#00FCA8]">{stats.percentualConfirmados.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div 
                className="bg-[#00FCA8] h-3 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,252,168,0.5)]"
                style={{ width: `${stats.percentualConfirmados}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Goal 3: Faturamento */}
        <div className="bg-[#1A3375] rounded-2xl p-6 shadow-xl relative overflow-hidden text-white border border-[#1A3375]/80">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#00FCA8] opacity-10 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-lg font-semibold text-white/90">Meta de Faturamento</h3>
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
              <DollarSign className="w-6 h-6 text-[#00FCA8]" />
            </div>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{formatCurrency(stats.faturamento)}</span>
            </div>
            <p className="text-sm text-[#00FCA8] mt-1 font-medium">Meta: {formatCurrency(META_FATURAMENTO)}</p>
          </div>
          <div className="mt-6 relative z-10">
            <div className="flex justify-between text-sm mb-2 font-medium">
              <span>Progresso</span>
              <span className="text-[#00FCA8]">{stats.percentualFaturamento.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div 
                className="bg-[#00FCA8] h-3 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,252,168,0.5)]"
                style={{ width: `${stats.percentualFaturamento}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Análise de Desempenho e Defasagem (Funil) */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-200 flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#1A3375]" />
          <h2 className="text-lg font-bold text-[#1A3375]">Análise de Desempenho e Defasagem</h2>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          
          <div className="flex flex-col">
            <span className="text-sm text-neutral-500 font-medium mb-1">Dias Úteis (Total)</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-neutral-800">{stats.diasUteisPassados}</span>
              <span className="text-sm text-neutral-400">/ {stats.totalDiasUteis}</span>
            </div>
            <span className="text-xs text-neutral-400 mt-1">Passados vs Total</span>
          </div>

          <div className="hidden lg:flex items-center justify-center text-neutral-300">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </div>

          <div className="flex flex-col">
            <span className="text-sm text-neutral-500 font-medium mb-1">Ritmo Ideal</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-neutral-800">{stats.ritmoIdealDiario.toFixed(1)}</span>
              <span className="text-sm text-neutral-400">/ dia</span>
            </div>
            <span className="text-xs text-neutral-400 mt-1">Para bater a meta</span>
          </div>

          <div className="hidden lg:flex items-center justify-center text-neutral-300">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </div>

          <div className="flex flex-col">
            <span className="text-sm text-neutral-500 font-medium mb-1">Meta até Hoje</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-neutral-800">{stats.metaAcumulada}</span>
            </div>
            <span className="text-xs text-neutral-400 mt-1">Declarações esperadas</span>
          </div>

          <div className="hidden lg:flex items-center justify-center text-neutral-300">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </div>

          <div className="flex flex-col">
            <span className="text-sm text-neutral-500 font-medium mb-1">Prontas (Realizado)</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-[#1A3375]">{stats.prontas}</span>
            </div>
            <span className="text-xs text-neutral-400 mt-1">Entregues ou Aguard. Fin.</span>
          </div>

          <div className="hidden lg:flex items-center justify-center text-neutral-300">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </div>

          <div className={`flex flex-col p-4 rounded-xl border ${stats.defasagem >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <span className={`text-sm font-bold mb-1 ${stats.defasagem >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              Status Atual
            </span>
            <div className="flex items-center gap-2">
              {stats.defasagem >= 0 ? (
                <TrendingUp className="w-6 h-6 text-green-600" />
              ) : (
                <TrendingDown className="w-6 h-6 text-red-600" />
              )}
              <span className={`text-2xl font-black ${stats.defasagem >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {stats.defasagem > 0 ? '+' : ''}{stats.defasagem}
              </span>
            </div>
            <span className={`text-xs mt-1 font-medium ${stats.defasagem >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.defasagem >= 0 ? 'Declarações adiantadas' : 'Declarações em atraso'}
            </span>
          </div>

        </div>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-yellow-100 rounded-xl">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-500">Aguardando Financeiro</p>
            <h3 className="text-3xl font-bold text-neutral-900">{stats.aguardandoFinanceiro}</h3>
            <p className="text-xs text-neutral-400 mt-1">Prontas, aguardando pgto.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-blue-100 rounded-xl">
            <CalendarDays className="w-8 h-8 text-[#1A3375]" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-500">Novo Ritmo Necessário</p>
            <div className="flex items-baseline gap-1">
              <h3 className="text-3xl font-bold text-[#1A3375]">{stats.novoRitmo}</h3>
              <span className="text-sm text-neutral-500">/ dia útil</span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">Para concluir as faltantes no prazo</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Chart */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[#1A3375] mb-6 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Status das Declarações
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: any) => [`${value} declarações`, 'Quantidade']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Chart */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[#1A3375] mb-6 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Status de Pagamento
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pagamentoData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pagamentoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: any) => [`${value} declarações`, 'Quantidade']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-neutral-200">
          <h3 className="text-lg font-bold text-[#1A3375]">Últimas Declarações Registradas</h3>
          <p className="text-sm text-neutral-500">Mostrando os 10 registros mais recentes da planilha.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-neutral-500 uppercase bg-neutral-50">
              <tr>
                <th className="px-6 py-4 font-medium">Controle</th>
                <th className="px-6 py-4 font-medium">Nome</th>
                <th className="px-6 py-4 font-medium">CPF</th>
                <th className="px-6 py-4 font-medium">Valor</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Pago</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.slice(-10).reverse().map((row, idx) => {
                const status = String(row[11] || '').trim();
                const isAguardando = status.toLowerCase() === 'aguardando financeiro';
                const isTransmitida = status && !isAguardando;
                const pago = String(row[13] || '').trim().toLowerCase() === 'sim';
                
                return (
                  <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-neutral-900">{row[0] || '-'}</td>
                    <td className="px-6 py-4">{row[1] || '-'}</td>
                    <td className="px-6 py-4 text-neutral-500">{row[2] || '-'}</td>
                    <td className="px-6 py-4 font-medium text-[#1A3375]">
                      {row[4] ? formatCurrency(parseNumber(row[4])) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {!status ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Não Entregue
                        </span>
                      ) : isAguardando ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Aguardando Fin.
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#00FCA8]/20 text-[#1A3375]">
                          {status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {pago ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#00FCA8]/20 text-[#1A3375]">
                          SIM
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                          NÃO
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-neutral-500">
                    Nenhum dado encontrado na planilha.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
