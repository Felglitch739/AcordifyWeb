import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Mic, MicOff, Volume2, X } from 'lucide-react';
import {
  GUITAR_STRINGS,
  detectPitchYin,
  frequencyToTuningReading,
  median,
  synthesizePluckedStringBuffer,
  type GuitarStringInfo,
  type TuningReading,
} from '../audio';
import { useStudioStyle } from '../styles/useStudioStyle';

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
  const { studioStyle } = useStudioStyle();
  const isApple = studioStyle === 'apple';
  const isOp1 = studioStyle === 'op1';
  const isVinyl = studioStyle === 'vinyl';
  const isDarkDial = isOp1 || studioStyle === 'luthier';

  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [lockedString, setLockedString] = useState<GuitarStringInfo | null>(null);
  const [reading, setReading] = useState<TuningReading | null>(null);

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
          'Permiso de micrófono denegado. Acordify analiza el sonido directo en tu dispositivo (sin subir audio) para medir la afinación de cada cuerda. Activa el permiso en la barra del navegador e intenta de nuevo.',
        );
      } else {
        setMicError(
          'No se pudo abrir el micrófono. Verifica que no esté ocupado por otra app o usa los tonos de referencia de abajo.',
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

  const clampedCents = reading ? Math.max(-50, Math.min(50, reading.cents)) : 0;
  const needleDeg = reading ? (clampedCents / 50) * MAX_ARC_DEG : 0;
  const isInTune = reading?.status === 'in-tune';

  const activeReferenceString = lockedString ?? reading?.targetString ?? GUITAR_STRINGS[0];

  const statusText = !isListening
    ? 'Activa el micrófono o escucha una cuerda de referencia'
    : !reading
      ? 'Toca una cuerda limpia y déjala sonar...'
      : isInTune
        ? '¡Cuerda afinada!'
        : reading.status === 'flat'
          ? 'Un poco baja — aprieta suavemente la clavija'
          : 'Un poco alta — afloja suavemente la clavija';

  const okColor = isDarkDial ? '#34D399' : '#1F7A36';
  const warnColor = isDarkDial ? '#FF8A65' : '#D83B26';

  const needleColor = !reading
    ? isDarkDial
      ? '#64748B'
      : '#7C766D'
    : isInTune
      ? okColor
      : warnColor;

  const fullArcPath = describeArc(-MAX_ARC_DEG, MAX_ARC_DEG, RADIUS);
  const sweetSpotDeg = (5 / 50) * MAX_ARC_DEG;
  const sweetSpotArcPath = describeArc(-sweetSpotDeg, sweetSpotDeg, RADIUS);

  const modalShellClass = isVinyl
    ? 'vinyl-brutal-card w-full max-w-lg p-6'
    : isOp1
      ? 'op1-chassis w-full max-w-lg rounded-2xl p-6'
      : isApple
        ? 'apple-ceramic-card w-full max-w-lg rounded-3xl p-6'
        : 'studio-surface w-full max-w-lg rounded-2xl p-6 shadow-2xl';

  const dialWellClass = isOp1
    ? 'op1-oled-screen mt-5 rounded-xl p-5 text-center text-[#F8FAFC]'
    : isVinyl
      ? 'mt-5 rounded border-2 border-[#141210] bg-[#EAE2D0] p-5 text-center text-[#141210]'
      : isApple
        ? 'mt-5 rounded-2xl bg-[#EBECEF] border border-black/[0.06] p-5 text-center text-[#1D1D1F]'
        : 'studio-recessed mt-5 rounded-2xl p-5 text-center text-[var(--text-primary)]';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={handleClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop-scrim)] backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tuner-modal-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className={modalShellClass}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--mood-accent)] font-semibold">
                  Herramienta local · Sin conexión
                </p>
                <h2
                  id="tuner-modal-title"
                  className={`text-2xl sm:text-3xl text-[var(--text-primary)] mt-0.5 ${
                    isVinyl
                      ? 'font-poster font-bold'
                      : isApple
                        ? 'font-semibold tracking-[-0.025em]'
                        : isOp1
                          ? 'font-hardware font-bold'
                          : 'font-serif-editorial'
                  }`}
                >
                  Afinador acústico (E A D G B e)
                </h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] cursor-pointer"
                aria-label="Cerrar afinador"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cerrar</span>
              </button>
            </div>

            {/* 6 String Pegs + Auto */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  Cuerda objetivo
                </span>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                  {lockedString ? `Bloqueada: ${lockedString.spanishName}` : 'Detección automática'}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                <button
                  type="button"
                  onClick={() => setLockedString(null)}
                  className={`rounded-xl border py-2 text-xs font-mono font-semibold transition cursor-pointer ${
                    lockedString === null
                      ? 'border-[var(--mood-border)] bg-[var(--mood-tint)] text-[var(--mood-accent)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-recessed)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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
                      className={`rounded-xl border py-2 text-xs font-mono font-semibold transition cursor-pointer ${
                        selected
                          ? 'border-[var(--mood-border)] bg-[var(--mood-tint)] text-[var(--mood-accent)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-recessed)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {str.stringNumber}ª {str.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Precision Semicircular Arc Dial */}
            <div className={dialWellClass}>
              <div className="relative mx-auto w-full max-w-[280px]">
                <svg viewBox="0 0 280 154" className="w-full h-auto overflow-visible">
                  <path
                    d={fullArcPath}
                    fill="none"
                    stroke={isDarkDial ? 'rgba(255,255,255,0.12)' : 'rgba(20,18,16,0.14)'}
                    strokeWidth="7"
                    strokeLinecap="round"
                  />

                  <path
                    d={sweetSpotArcPath}
                    fill="none"
                    stroke={isInTune ? okColor : isDarkDial ? 'rgba(52, 211, 153, 0.38)' : 'rgba(31, 122, 54, 0.42)'}
                    strokeWidth="8"
                    strokeLinecap="round"
                  />

                  {isInTune && (
                    <circle
                      cx={CX}
                      cy={CY - RADIUS}
                      r="11"
                      fill="rgba(52, 211, 153, 0.16)"
                      stroke={okColor}
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
                        stroke={
                          tick === 0
                            ? okColor
                            : isDarkDial
                              ? 'rgba(255,255,255,0.28)'
                              : 'rgba(20,18,16,0.28)'
                        }
                        strokeWidth={tick === 0 ? 2.2 : 1.2}
                        strokeLinecap="round"
                      />
                    );
                  })}

                  <text
                    x="32"
                    y="88"
                    fill={isDarkDial ? '#94A3B8' : '#524C44'}
                    className="font-mono text-[10px]"
                    textAnchor="middle"
                  >
                    -50
                  </text>
                  <text
                    x={CX}
                    y="14"
                    fill={okColor}
                    className="font-mono text-[10px] font-bold"
                    textAnchor="middle"
                  >
                    0
                  </text>
                  <text
                    x="248"
                    y="88"
                    fill={isDarkDial ? '#94A3B8' : '#524C44'}
                    className="font-mono text-[10px]"
                    textAnchor="middle"
                  >
                    +50
                  </text>

                  <g
                    style={{
                      transform: `rotate(${needleDeg.toFixed(1)}deg)`,
                      transformOrigin: `${CX}px ${CY}px`,
                      transition: 'transform 90ms ease-out',
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
                    fill={isDarkDial ? '#14171D' : '#FFFDF7'}
                    stroke={needleColor}
                    strokeWidth="2.5"
                  />
                </svg>
              </div>

              <div className="flex items-baseline justify-center gap-3 -mt-2">
                <span className="font-mono text-4xl sm:text-5xl font-bold num-tabular">
                  {reading ? `${reading.detectedNote}${reading.detectedOctave}` : activeReferenceString.label}
                </span>
                <span className="font-mono text-sm opacity-75 num-tabular">
                  {reading ? `${reading.frequency.toFixed(1)} Hz` : `${activeReferenceString.frequency} Hz`}
                </span>
              </div>

              <p className="mt-1 text-xs font-mono opacity-65">
                {reading
                  ? `Cuerda objetivo: ${reading.targetString.spanishName} (${reading.cents > 0 ? `+${reading.cents}` : reading.cents} cents)`
                  : activeReferenceString.spanishName}
              </p>

              <p
                className="mt-3 text-sm font-medium"
                style={{
                  color: !reading ? undefined : isInTune ? okColor : warnColor,
                }}
              >
                {statusText}
              </p>
            </div>

            {micError && (
              <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/12 p-3 text-xs text-[var(--text-primary)] leading-relaxed">
                {micError}
              </div>
            )}

            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              {!isListening ? (
                <button
                  type="button"
                  onClick={() => void startListening()}
                  className={`flex-1 inline-flex items-center justify-center gap-2 bg-[var(--mood-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-ink)] hover:brightness-110 transition cursor-pointer ${
                    isVinyl ? 'rounded border-2 border-[#141210]' : isApple ? 'rounded-full' : 'rounded-xl'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  <span>Activar micrófono</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopListening}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/60 bg-rose-500/15 px-4 py-2.5 text-sm font-semibold text-rose-500 hover:bg-rose-500/25 transition cursor-pointer"
                >
                  <MicOff className="w-4 h-4" />
                  <span>Detener micrófono</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => void playReferenceTone(activeReferenceString)}
                className={`inline-flex items-center justify-center gap-2 border border-[var(--border-strong)] bg-[var(--bg-recessed)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:border-[var(--mood-border)] transition cursor-pointer ${
                  isVinyl ? 'rounded border-2 border-[#141210]' : isApple ? 'rounded-full' : 'rounded-xl'
                }`}
              >
                <Volume2 className="w-4 h-4 text-[var(--mood-accent)]" />
                <span>Escuchar {activeReferenceString.stringNumber}ª ({activeReferenceString.label})</span>
              </button>
            </div>

            <p className="mt-3 text-[11px] text-[var(--text-muted)]">
              Todo el análisis ocurre directo en tu navegador; ningún audio sale de tu dispositivo.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
