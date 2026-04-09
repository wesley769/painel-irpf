'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export default function SyncButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [wasPending, setWasPending] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setLastSync(new Date());
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      handleSync();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  useEffect(() => {
    if (isPending) {
      setWasPending(true);
    } else if (wasPending && !isPending) {
      setLastSync(new Date());
      setWasPending(false);
    }
  }, [isPending, wasPending]);

  if (!isMounted) {
    return (
      <div className="flex items-center gap-3 text-sm text-white bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm">
        <RefreshCw className="w-4 h-4 animate-spin-slow" />
        <div className="flex flex-col">
          <span className="font-medium">Sincronizando...</span>
        </div>
      </div>
    );
  }

  return (
    <button 
      onClick={handleSync}
      disabled={isPending}
      className="flex items-center gap-3 text-sm text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm transition-colors cursor-pointer disabled:opacity-70 text-left"
    >
      <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
      <div className="flex flex-col">
        <span className="font-medium">
          {isPending ? 'Sincronizando...' : `Atualizado às ${lastSync?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
        </span>
        {!isPending && (
          <span className="text-[11px] text-blue-200 -mt-0.5">Sinc. auto (60s) • Clique para forçar</span>
        )}
      </div>
    </button>
  );
}
