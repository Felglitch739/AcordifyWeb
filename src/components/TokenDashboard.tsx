import React, { useState } from 'react';
import { useTokenTracker } from '../hooks/useTokenTracker';
import { PanelWrapper } from './PanelWrapper';

export const TokenDashboard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { summary, clearAll } = useTokenTracker();
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const formatNumber = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  const serviceNames: Record<string, string> = {
    'songLookup': 'SONG LOOKUP',
    'generateConcept': 'MOOD GENERATE',
    'chordGeneration': 'CHORD GEN',
    'completeVerse': 'VERSE COMPLETE',
    'lyricsGeneration': 'LYRICS GEN',
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        role="button"
        tabIndex={0}
        aria-label="Cerrar dashboard"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClose();
          }
        }}
      />

      <div className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto m-4">
        <PanelWrapper
          className="bg-[var(--bg-secondary)]"
          title={
            <span className="text-2xs font-mono font-bold tracking-wider text-[var(--text-secondary)] uppercase">
              [DASHBOARD] // TOKEN USAGE MONITOR
            </span>
          }
          rightSlot={
            <button
              type="button"
              onClick={onClose}
              className="text-[9px] font-mono text-[var(--text-muted)] hover:text-[var(--accent-primary)] border border-[var(--border-color)] px-2 py-0.5 rounded-sm cursor-pointer"
            >
              [ CERRAR ]
            </button>
          }
          contentClassName="p-6"
        >
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] p-3 rounded-sm">
              <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">
                TOTAL CALLS
              </div>
              <div className="text-2xl font-mono font-bold text-[var(--accent-primary)]">
                {summary.totalCalls}
              </div>
            </div>

            <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] p-3 rounded-sm">
              <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">
                PROMPT TOKENS
              </div>
              <div className="text-2xl font-mono font-bold text-[var(--text-primary)]">
                {formatNumber(summary.totalPromptTokens)}
              </div>
            </div>

            <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] p-3 rounded-sm">
              <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">
                COMPLETION TOKENS
              </div>
              <div className="text-2xl font-mono font-bold text-[var(--text-primary)]">
                {formatNumber(summary.totalCompletionTokens)}
              </div>
            </div>

            <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] p-3 rounded-sm">
              <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">
                TOTAL TOKENS
              </div>
              <div className="text-2xl font-mono font-bold text-[var(--accent-secondary)]">
                {formatNumber(summary.totalTokens)}
              </div>
            </div>
          </div>

          {/* Per-Service Breakdown */}
          <div className="mb-6">
            <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-3">
              DESGLOSE POR SERVICIO
            </div>

            {Object.keys(summary.byService).length === 0 ? (
              <div className="text-xs font-mono text-[var(--text-muted)] text-center py-6 border border-dashed border-[var(--border-color)] rounded-sm">
                SIN DATOS — realiza una llamada a la API para empezar a trackear
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(summary.byService).map(([service, data]) => {
                  const pct = summary.totalTokens > 0
                    ? Math.round((data.totalTokens / summary.totalTokens) * 100)
                    : 0;

                  return (
                    <div
                      key={service}
                      className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] p-3 rounded-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-[var(--text-primary)] uppercase">
                          {serviceNames[service] ?? service.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">
                          {data.calls} calls · {formatNumber(data.totalTokens)} tokens
                        </span>
                      </div>

                      {/* Usage bar */}
                      <div className="h-1.5 bg-[var(--bg-primary)] rounded-sm overflow-hidden">
                        <div
                          className="h-full rounded-sm transition-all duration-300"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: 'var(--accent-primary)',
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between mt-1.5 text-[9px] font-mono text-[var(--text-muted)]">
                        <span>PROMPT: {formatNumber(data.promptTokens)}</span>
                        <span>COMPLETION: {formatNumber(data.completionTokens)}</span>
                        <span>{pct}% DEL TOTAL</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          {summary.entries.length > 0 && (
            <div className="mb-6">
              <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-3">
                ACTIVIDAD RECIENTE (ÚLTIMAS 10)
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {summary.entries.slice(-10).reverse().map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-1.5 px-2 text-[10px] font-mono border-b border-[var(--border-color)]"
                  >
                    <span className="text-[var(--text-secondary)]">
                      {serviceNames[entry.service] ?? entry.service.toUpperCase()}
                    </span>
                    <span className="text-[var(--text-muted)]">
                      {entry.model}
                    </span>
                    <span className="text-[var(--accent-primary)] font-bold">
                      {entry.totalTokens} tok
                    </span>
                    <span className="text-[var(--text-muted)]">
                      {new Date(entry.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
            <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase">
              ACORDIFY TOKEN MONITOR v1.0
            </span>
            {showConfirmClear ? (
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-red-400">¿BORRAR TODO?</span>
                <button
                  type="button"
                  onClick={() => { clearAll(); setShowConfirmClear(false); }}
                  className="text-[9px] font-mono text-red-400 border border-red-400/40 px-2 py-0.5 rounded-sm hover:bg-red-400/10 cursor-pointer"
                >
                  [ CONFIRMAR ]
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmClear(false)}
                  className="text-[9px] font-mono text-[var(--text-muted)] border border-[var(--border-color)] px-2 py-0.5 rounded-sm cursor-pointer"
                >
                  [ CANCELAR ]
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmClear(true)}
                className="text-[9px] font-mono text-[var(--text-muted)] hover:text-red-400 border border-[var(--border-color)] px-2 py-0.5 rounded-sm cursor-pointer"
              >
                [ RESET DATA ]
              </button>
            )}
          </div>
        </PanelWrapper>
      </div>
    </div>
  );
};
