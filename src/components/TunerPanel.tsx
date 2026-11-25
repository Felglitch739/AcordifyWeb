import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, X } from 'lucide-react';
import {
  GUITAR_STRINGS,
  computeRms,
  detectPitchYin,
  frequencyToTuningReading,
  median,
  synthesizePluckedStringBuffer,
  type GuitarStringInfo,
  type TuningReading,
} from '../audio';

interface TunerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayReferenceNote?: (noteName: string) => void;
}

const CX = 140;
const CY = 132;
const RADIUS = 104;
const MAX_ARC_DEG = 65;

function polarPoint(degFromTop: number, r: number): { x: number; y: number } {
  const rad = ((degFromTop - 90) * Math.PI) / 180;
  return {
    x: CX + r * Math.cos(rad),
    y: CY + r * Math.sin(rad),
  };
}

function describeArc(startDeg: number, endDeg: number, r: number): string {
  const start = polarPoint(startDeg, r);
  const end = polarPoint(endDeg, r);
  const largeArcFlag = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

const CENT_TICKS = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50] as const;

export const TunerPanel: React.FC<TunerPanelProps> = ({
  isOpen,
  onClose,
  onPlayReferenceNote,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [lockedString, setLockedString] = useState<GuitarStringInfo | null>(null);
  const [reading, setReading] = useState<TuningReading | null>(null);
  const [signalLevel, setSignalLevel] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const recentFreqsRef = useRef<number[]>([]);
  const lastDetectedAtRef = useRef<number>(0);
  const lockedStringRef = useRef<GuitarStringInfo | null>(lockedString);

  useEffect(() => {
    lockedStringRef.current = lockedString;
  }, [lockedString]);

  const releaseAudioResources = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioCtxRef.current) {
      void audioCtxRef.current.close();
      audioCtxRef.current = null;
    }

    analyserRef.current = null;
    recentFreqsRef.current = [];
  }, []);

  const stopListening = useCallback(() => {
    releaseAudioResources();
    setIsListening(false);
    setReading(null);
    setSignalLevel(0);
  }, [releaseAudioResources]);

  const handleClose = useCallback(() => {
    stopListening();
    onClose();
  }, [stopListening, onClose]);

  useEffect(() => {
    if (!isOpen) {
      releaseAudioResources();
    }
  }, [isOpen, releaseAudioResources]);

  useEffect(() => {
    return () => {
      releaseAudioResources();
    };
  }, [releaseAudioResources]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  const startListening = async () => {
    setMicError(null);

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      setMicError(
        'Tu navegador no permite acceso al micrófono. Prueba en Chrome, Edge o Safari con HTTPS y usa los tonos de referencia mientras tanto.',
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      const webkitWin = window as Window & { webkitAudioContext?: typeof AudioContext };
      const AudioCtx = window.AudioContext || webkitWin.webkitAudioContext;
      if (!AudioCtx) {
        setMicError('AudioContext no está disponible en este navegador.');
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      source.connect(analyser);
      analyserRef.current = analyser;

      const buffer = new Float32Array(analyser.fftSize);
      recentFreqsRef.current = [];
      lastDetectedAtRef.current = performance.now();
      setIsListening(true);

      const tick = () => {
        const currentAnalyser = analyserRef.current;
        const currentCtx = audioCtxRef.current;
        if (!currentAnalyser || !currentCtx) return;

        currentAnalyser.getFloatTimeDomainData(buffer);
        const rms = computeRms(buffer);
        setSignalLevel(Math.min(1, rms * 12));

        const pitch = detectPitchYin(buffer, currentCtx.sampleRate, {
          minFreq: 65,
          maxFreq: 500,
          threshold: 0.15,
          minRms: 0.01,
        });

        const now = performance.now();
        if (pitch) {
          lastDetectedAtRef.current = now;
          const nextWindow = [...recentFreqsRef.current, pitch.frequency].slice(-5);
          recentFreqsRef.current = nextWindow;
          const smoothedFreq = median(nextWindow);
          setReading(frequencyToTuningReading(smoothedFreq, lockedStringRef.current));
        } else if (now - lastDetectedAtRef.current > 650) {
          recentFreqsRef.current = [];
          setReading(null);
        }

        rafIdRef.current = requestAnimationFrame(tick);
      };

      rafIdRef.current = requestAnimationFrame(tick);
    } catch (err) {
      const errorName = err instanceof Error ? err.name : '';
      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        setMicError(
          'Permiso de micrófono denegado. El afinador analiza el audio directo en tu navegador sin subir nada. Activa el permiso en la barra de direcciones e intenta de nuevo.',
        );
      } else {
        setMicError(
          'No se pudo abrir el micrófono. Verifica que no esté ocupado por otra app o usa los tonos de referencia.',
        );
      }
      stopListening();
    }
  };

  const playReferenceTone = async (target: GuitarStringInfo) => {
    if (onPlayReferenceNote) {
      onPlayReferenceNote(`${target.noteName}${target.octave}`);
      return;
    }

    try {
      const webkitWin = window as Window & { webkitAudioContext?: typeof AudioContext };
      const AudioCtx = window.AudioContext || webkitWin.webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const samples = synthesizePluckedStringBuffer(
        ctx.sampleRate,
        target.frequency,
        1.8,
        'nylon',
        0.85,
      );
      const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
      buffer.copyToChannel(new Float32Array(samples), 0);

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = 0.55;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      src.onended = () => {
        void ctx.close();
      };
    } catch {
      // Ignore audio playback errors when blocked
    }
  };

  if (!isOpen) return null;

  const hasLiveReading = isListening && reading !== null;
  const clampedCents = hasLiveReading ? Math.max(-50, Math.min(50, reading.cents)) : 0;
  const needleDeg = hasLiveReading ? (clampedCents / 50) * MAX_ARC_DEG : 0;
  const isInTune = hasLiveReading && reading.status === 'in-tune';

  const activeReferenceString = lockedString ?? (hasLiveReading ? reading.targetString : GUITAR_STRINGS[0]);

  const statusText = !isListening
    ? 'En espera — activa el micrófono o escucha una cuerda de referencia'
    : !reading
      ? 'Escuchando… toca una cuerda limpia y déjala sonar'
      : isInTune
        ? 'Afinada'
        : reading.status === 'flat'
          ? 'Un poco baja — aprieta la clavija'
          : 'Un poco alta — afloja la clavija';

  const needleColor = !hasLiveReading
    ? '#D4D4D8'
    : isInTune
      ? '#15803D'
      : '#E85D3D';

  const fullArcPath = describeArc(-MAX_ARC_DEG, MAX_ARC_DEG, RADIUS);
  const sweetSpotDeg = (5 / 50) * MAX_ARC_DEG;
  const sweetSpotArcPath = describeArc(-sweetSpotDeg, sweetSpotDeg, RADIUS);

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-backdrop)] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tuner-modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="surface-card w-full max-w-lg p-6"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] pb-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
              Herramienta local · Sin conexión
            </p>
            <h2
              id="tuner-modal-title"
              className="text-2xl font-medium text-[var(--color-ink)] mt-0.5"
            >
              Afinador (E A D G B e)
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="btn-secondary px-3 py-1.5 text-xs"
            aria-label="Cerrar afinador"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cerrar</span>
          </button>
        </div>

        {/* 6 String Pegs + Auto */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--color-ink-secondary)]">
              Cuerda objetivo
            </span>
            <span className="font-mono text-xs text-[var(--color-ink-muted)]">
              {lockedString ? lockedString.spanishName : 'Detección automática'}
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            <button
              type="button"
              onClick={() => setLockedString(null)}
              className={`rounded-lg border py-2 font-mono text-xs font-medium transition-colors cursor-pointer ${
                lockedString === null
                  ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-white'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]'
              }`}
            >
              Auto
            </button>
            {GUITAR_STRINGS.map((str) => {
              const selected = lockedString?.stringNumber === str.stringNumber;
              return (
                <button
                  key={str.stringNumber}
                  type="button"
                  onClick={() => setLockedString(str)}
                  className={`rounded-lg border py-2 font-mono text-xs font-medium transition-colors cursor-pointer ${
                    selected
                      ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-white'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  {str.stringNumber}ª {str.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Clean Monochrome Semicircular Arc Dial */}
        <div className="mt-5 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-board)] p-5 text-center">
          <div className="relative mx-auto w-full max-w-[280px]">
            <svg viewBox="0 0 280 154" className="w-full h-auto overflow-visible">
              <path
                d={fullArcPath}
                fill="none"
                stroke="#E4E4E7"
                strokeWidth="7"
                strokeLinecap="round"
              />

              <path
                d={sweetSpotArcPath}
                fill="none"
                stroke={isInTune ? '#15803D' : '#D4D4D8'}
                strokeWidth="8"
                strokeLinecap="round"
              />

              {isInTune && (
                <circle
                  cx={CX}
                  cy={CY - RADIUS}
                  r="11"
                  fill="rgba(21, 128, 61, 0.14)"
                  stroke="#15803D"
                  strokeWidth="1.4"
                />
              )}

              {CENT_TICKS.map((tick) => {
                const deg = (tick / 50) * MAX_ARC_DEG;
                const inner = polarPoint(deg, tick === 0 ? RADIUS - 14 : RADIUS - 9);
                const outer = polarPoint(deg, RADIUS + 6);
                return (
                  <line
                    key={tick}
                    x1={inner.x}
                    y1={inner.y}
                    x2={outer.x}
                    y2={outer.y}
                    stroke={tick === 0 && hasLiveReading ? '#15803D' : '#A1A1AA'}
                    strokeWidth={tick === 0 ? 2 : 1.1}
                    strokeLinecap="round"
                  />
                );
              })}

              <text x="32" y="88" fill="#71717A" className="font-mono text-[10px]" textAnchor="middle">
                -50
              </text>
              <text
                x={CX}
                y="14"
                fill={hasLiveReading ? '#15803D' : '#71717A'}
                className="font-mono text-[10px] font-medium"
                textAnchor="middle"
              >
                0
              </text>
              <text x="248" y="88" fill="#71717A" className="font-mono text-[10px]" textAnchor="middle">
                +50
              </text>

              {/* Active live needle only when sound is detected */}
              <g
                style={{
                  transform: `rotate(${needleDeg.toFixed(1)}deg)`,
                  transformOrigin: `${CX}px ${CY}px`,
                  transition: 'transform 90ms ease-out',
                  opacity: hasLiveReading ? 1 : 0.35,
                }}
              >
                <line
                  x1={CX}
                  y1={CY}
                  x2={CX}
                  y2={CY - RADIUS + 12}
                  stroke={needleColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx={CX} cy={CY - RADIUS + 12} r="3.5" fill={needleColor} />
              </g>

              <circle
                cx={CX}
                cy={CY}
                r="7"
                fill="#FFFFFF"
                stroke={needleColor}
                strokeWidth="2.5"
              />
            </svg>
          </div>

          <div className="flex items-baseline justify-center gap-3 -mt-2">
            <span className="font-mono text-4xl sm:text-5xl font-medium text-[var(--color-ink)] num-tabular">
              {hasLiveReading
                ? `${reading.detectedNote}${reading.detectedOctave}`
                : activeReferenceString.label}
            </span>
            <span className="font-mono text-sm text-[var(--color-ink-muted)] num-tabular">
              {hasLiveReading
                ? `${reading.frequency.toFixed(1)} Hz`
                : `${activeReferenceString.frequency} Hz`}
            </span>
          </div>

          <p className="mt-1 font-mono text-xs text-[var(--color-ink-muted)]">
            {hasLiveReading
              ? `${reading.targetString.spanishName} (${reading.cents > 0 ? `+${reading.cents}` : reading.cents} cents)`
              : activeReferenceString.spanishName}
          </p>

          <p
            className="mt-3 text-sm font-medium"
            style={{
              color: !hasLiveReading
                ? 'var(--color-ink-secondary)'
                : isInTune
                  ? 'var(--color-ok)'
                  : 'var(--color-accent)',
            }}
          >
            {statusText}
          </p>

          {isListening && (
            <div className="mt-3 mx-auto max-w-[200px] space-y-1">
              <div className="h-1.5 w-full rounded-full bg-[var(--color-border)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-75"
                  style={{
                    width: `${Math.round(signalLevel * 100)}%`,
                    backgroundColor: isInTune ? 'var(--color-ok)' : 'var(--color-ink)',
                  }}
                />
              </div>
              <p className="font-mono text-[10px] uppercase text-[var(--color-ink-muted)]">
                Señal de micrófono
              </p>
            </div>
          )}
        </div>

        {micError && (
          <div className="mt-4 rounded-[12px] border border-[var(--color-accent-border)] bg-[var(--color-accent-tint)] p-3 text-xs text-[var(--color-ink)] leading-relaxed">
            {micError}
          </div>
        )}

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          {!isListening ? (
            <button
              type="button"
              onClick={() => void startListening()}
              className="btn-primary flex-1 px-4 py-2.5 text-sm"
            >
              <Mic className="w-4 h-4" />
              <span>Activar micrófono</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopListening}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity cursor-pointer"
            >
              <MicOff className="w-4 h-4" />
              <span>Detener micrófono</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => void playReferenceTone(activeReferenceString)}
            className="btn-secondary px-4 py-2.5 text-sm"
          >
            <Volume2 className="w-4 h-4" />
            <span>Escuchar {activeReferenceString.stringNumber}ª ({activeReferenceString.label})</span>
          </button>
        </div>

        <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
          Todo el análisis ocurre directo en tu navegador; ningún audio sale de tu dispositivo.
        </p>
      </div>
    </div>
  );
};
