import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  Mic,
  MicOff,
  Minus,
  Plus,
  RotateCcw,
  Sliders,
  Volume2,
  X,
} from 'lucide-react';
import {
  MAX_STRING_MIDI,
  MAX_TUNING_SHIFT,
  MIN_STRING_MIDI,
  MIN_TUNING_SHIFT,
  STANDARD_MIDIS,
  TUNING_PRESETS,
  buildTuningStrings,
  clampStringMidi,
  computeRms,
  createAcousticBodyBus,
  deleteCustomTuning,
  detectPitchYin,
  formatSemitoneShift,
  formatTuningSequence,
  frequencyToTuningReading,
  listSavedCustomTunings,
  median,
  saveCustomTuning,
  synthesizePluckedStringBuffer,
  type CustomTuningSaved,
  type GuitarStringInfo,
  type GuitarTone,
  type SixStringMidis,
  type TuningPresetId,
  type TuningReading,
} from '../audio';

interface TunerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  guitarTone?: GuitarTone;
}

const CX = 150;
const CY = 136;
const RADIUS = 108;
const MAX_ARC_DEG = 66;
const IN_TUNE_HOLD_MS = 450;

const STRING_GAUGE_PX: Readonly<Record<GuitarStringInfo['stringNumber'], number>> = {
  6: 2.5,
  5: 2.2,
  4: 1.9,
  3: 1.6,
  2: 1.3,
  1: 1.0,
};

const CENT_TICKS = Array.from({ length: 21 }, (_, idx) => -50 + idx * 5);
const LED_SEGMENTS = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50] as const;

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

function getStringMidi(str: GuitarStringInfo, idx: number): number {
  return str.midi ?? STANDARD_MIDIS[idx];
}

export const TunerPanel: React.FC<TunerPanelProps> = ({
  isOpen,
  onClose,
  guitarTone = 'nylon',
}) => {
  const [presetId, setPresetId] = useState<TuningPresetId>('standard');
  const [activeSavedCustomId, setActiveSavedCustomId] = useState<string | null>(null);
  const [semitoneShift, setSemitoneShift] = useState(0);
  const [customMidis, setCustomMidis] = useState<[number, number, number, number, number, number]>(
    () => [...STANDARD_MIDIS],
  );
  const [savedCustomTunings, setSavedCustomTunings] = useState<CustomTuningSaved[]>(() =>
    listSavedCustomTunings(),
  );
  const [isCustomEditorOpen, setIsCustomEditorOpen] = useState(false);
  const [customNameInput, setCustomNameInput] = useState('');

  const [lockedStringNumber, setLockedStringNumber] = useState<
    GuitarStringInfo['stringNumber'] | null
  >(null);
  const [tunedStrings, setTunedStrings] = useState<number[]>([]);

  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [reading, setReading] = useState<TuningReading | null>(null);
  const [signalLevel, setSignalLevel] = useState(0);

  const selectedPreset = useMemo(
    () => TUNING_PRESETS.find((p) => p.id === presetId) ?? TUNING_PRESETS[0],
    [presetId],
  );

  const activeSavedCustom = useMemo(
    () =>
      presetId === 'custom' && activeSavedCustomId
        ? savedCustomTunings.find((item) => item.id === activeSavedCustomId) ?? null
        : null,
    [presetId, activeSavedCustomId, savedCustomTunings],
  );

  const baseMidis: SixStringMidis = useMemo(() => {
    if (presetId === 'custom') {
      return activeSavedCustom ? activeSavedCustom.midis : customMidis;
    }
    return selectedPreset.midis;
  }, [presetId, activeSavedCustom, customMidis, selectedPreset]);

  const effectivePreferFlats =
    semitoneShift < 0
      ? true
      : semitoneShift > 0
        ? false
        : selectedPreset.preferFlats;

  const activeStrings = useMemo(
    () => buildTuningStrings(baseMidis, semitoneShift, effectivePreferFlats),
    [baseMidis, semitoneShift, effectivePreferFlats],
  );

  const lockedString = useMemo(
    () =>
      lockedStringNumber === null
        ? null
        : activeStrings.find((s) => s.stringNumber === lockedStringNumber) ?? null,
    [activeStrings, lockedStringNumber],
  );

  const activeTuningTitle = activeSavedCustom ? activeSavedCustom.name : selectedPreset.name;
  const activeTuningSequence = formatTuningSequence(activeStrings);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const recentFreqsRef = useRef<number[]>([]);
  const lastDetectedAtRef = useRef<number>(0);

  const refCtxRef = useRef<AudioContext | null>(null);
  const refBusRef = useRef<ReturnType<typeof createAcousticBodyBus> | null>(null);

  const activeStringsRef = useRef<GuitarStringInfo[]>(activeStrings);
  const lockedStringRef = useRef<GuitarStringInfo | null>(lockedString);
  const preferFlatsRef = useRef<boolean>(Boolean(effectivePreferFlats));
  const inTuneHoldRef = useRef<{ stringNumber: number; since: number } | null>(null);

  useEffect(() => {
    activeStringsRef.current = activeStrings;
  }, [activeStrings]);

  useEffect(() => {
    lockedStringRef.current = lockedString;
  }, [lockedString]);

  useEffect(() => {
    preferFlatsRef.current = Boolean(effectivePreferFlats);
  }, [effectivePreferFlats]);

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

    if (refBusRef.current) {
      refBusRef.current.dispose();
      refBusRef.current = null;
    }

    if (refCtxRef.current) {
      void refCtxRef.current.close();
      refCtxRef.current = null;
    }

    analyserRef.current = null;
    recentFreqsRef.current = [];
    inTuneHoldRef.current = null;
  }, []);

  const stopListening = useCallback(() => {
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
    inTuneHoldRef.current = null;
    setIsListening(false);
    setReading(null);
    setSignalLevel(0);
  }, []);

  const handleClose = useCallback(() => {
    stopListening();
    releaseAudioResources();
    onClose();
  }, [stopListening, releaseAudioResources, onClose]);

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

  const resetSessionProgress = useCallback(() => {
    setTunedStrings([]);
    setReading(null);
    recentFreqsRef.current = [];
    inTuneHoldRef.current = null;
  }, []);

  const handleSelectTuningChange = (val: string) => {
    resetSessionProgress();
    setLockedStringNumber(null);

    if (val.startsWith('saved:')) {
      const id = val.slice('saved:'.length);
      const found = savedCustomTunings.find((item) => item.id === id);
      if (found) {
        setPresetId('custom');
        setActiveSavedCustomId(found.id);
        setCustomMidis([...found.midis]);
        setSemitoneShift(0);
        setIsCustomEditorOpen(false);
        return;
      }
    }

    if (val === 'custom') {
      const currentMidis = activeStrings.map((str, idx) => getStringMidi(str, idx)) as [
        number,
        number,
        number,
        number,
        number,
        number,
      ];
      setCustomMidis(currentMidis);
      setPresetId('custom');
      setActiveSavedCustomId(null);
      setSemitoneShift(0);
      setIsCustomEditorOpen(true);
      return;
    }

    setPresetId(val as TuningPresetId);
    setActiveSavedCustomId(null);
    setSemitoneShift(0);
    setIsCustomEditorOpen(false);
  };

  const handleShiftSemitones = (delta: number) => {
    const nextShift = Math.max(MIN_TUNING_SHIFT, Math.min(MAX_TUNING_SHIFT, semitoneShift + delta));
    if (nextShift === semitoneShift) return;
    setSemitoneShift(nextShift);
    resetSessionProgress();
  };

  const handleResetShift = () => {
    if (semitoneShift === 0) return;
    setSemitoneShift(0);
    resetSessionProgress();
  };

  const handleToggleCustomEditor = () => {
    if (!isCustomEditorOpen) {
      const currentMidis = activeStrings.map((str, idx) => getStringMidi(str, idx)) as [
        number,
        number,
        number,
        number,
        number,
        number,
      ];
      setCustomMidis(currentMidis);
      setPresetId('custom');
      setActiveSavedCustomId(null);
      setSemitoneShift(0);
      resetSessionProgress();
      setIsCustomEditorOpen(true);
    } else {
      setIsCustomEditorOpen(false);
    }
  };

  const handleStepCustomString = (stringIndex: number, delta: number) => {
    setCustomMidis((prev) => {
      const next: [number, number, number, number, number, number] = [...prev];
      next[stringIndex] = clampStringMidi(next[stringIndex] + delta);
      return next;
    });
    setPresetId('custom');
    setActiveSavedCustomId(null);
    setSemitoneShift(0);
    resetSessionProgress();
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const created = saveCustomTuning(customNameInput || 'Mi afinación', customMidis);
    setSavedCustomTunings(listSavedCustomTunings());
    setPresetId('custom');
    setActiveSavedCustomId(created.id);
    setSemitoneShift(0);
    setCustomNameInput('');
    setIsCustomEditorOpen(false);
  };

  const handleDeleteCustom = (id: string) => {
    const remaining = deleteCustomTuning(id);
    setSavedCustomTunings(remaining);
    if (activeSavedCustomId === id) {
      setActiveSavedCustomId(null);
      setPresetId('standard');
      setSemitoneShift(0);
      resetSessionProgress();
    }
  };

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
      inTuneHoldRef.current = null;
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
          minFreq: 48,
          maxFreq: 720,
          threshold: 0.15,
          minRms: 0.01,
        });

        const now = performance.now();
        if (pitch) {
          lastDetectedAtRef.current = now;
          const nextWindow = [...recentFreqsRef.current, pitch.frequency].slice(-5);
          recentFreqsRef.current = nextWindow;
          const smoothedFreq = median(nextWindow);
          const nextReading = frequencyToTuningReading(
            smoothedFreq,
            lockedStringRef.current,
            activeStringsRef.current,
            preferFlatsRef.current,
          );
          setReading(nextReading);

          if (nextReading.status === 'in-tune') {
            const targetNum = nextReading.targetString.stringNumber;
            const hold = inTuneHoldRef.current;
            if (!hold || hold.stringNumber !== targetNum) {
              inTuneHoldRef.current = { stringNumber: targetNum, since: now };
            } else if (now - hold.since >= IN_TUNE_HOLD_MS) {
              setTunedStrings((prev) => (prev.includes(targetNum) ? prev : [...prev, targetNum]));
            }
          } else {
            inTuneHoldRef.current = null;
          }
        } else if (now - lastDetectedAtRef.current > 650) {
          recentFreqsRef.current = [];
          inTuneHoldRef.current = null;
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
    try {
      const webkitWin = window as Window & { webkitAudioContext?: typeof AudioContext };
      const AudioCtx = window.AudioContext || webkitWin.webkitAudioContext;
      if (!AudioCtx) return;

      if (!refCtxRef.current || refCtxRef.current.state === 'closed') {
        refCtxRef.current = new AudioCtx();
        refBusRef.current = createAcousticBodyBus(refCtxRef.current);
      }

      const ctx = refCtxRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      if (!refBusRef.current) {
        refBusRef.current = createAcousticBodyBus(ctx);
      }

      const samples = synthesizePluckedStringBuffer(
        ctx.sampleRate,
        target.frequency,
        2.2,
        guitarTone,
        0.88,
      );
      const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
      buffer.copyToChannel(new Float32Array(samples), 0);

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.62, now);
      gain.gain.setValueAtTime(0.54, now + 1.6);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 2.2);

      src.connect(gain);
      gain.connect(refBusRef.current.input);
      src.start(now);
      src.stop(now + 2.24);
      src.onended = () => {
        try {
          src.disconnect();
          gain.disconnect();
        } catch {
          // Ignore teardown errors
        }
      };
    } catch {
      // Ignore audio playback errors when blocked
    }
  };

  const hasLiveReading = isListening && reading !== null;
  const clampedCents = hasLiveReading ? Math.max(-50, Math.min(50, reading.cents)) : 0;
  const needleDeg = hasLiveReading ? (clampedCents / 50) * MAX_ARC_DEG : 0;
  const isInTune = hasLiveReading && reading.status === 'in-tune';

  const activeReferenceString =
    lockedString ?? (hasLiveReading ? reading.targetString : activeStrings[0]);

  const statusText = !isListening
    ? 'En espera · Sin señal — activa el micrófono para medir o escucha una cuerda'
    : !reading
      ? 'Escuchando… toca una cuerda limpia y déjala sonar'
      : isInTune
        ? 'Afinada'
        : reading.status === 'flat'
          ? 'Un poco baja — aprieta la clavija'
          : 'Un poco alta — afloja la clavija';

  const needleColor = !hasLiveReading
    ? '#71717A'
    : isInTune
      ? '#15803D'
      : '#E85D3D';

  const fullArcPath = describeArc(-MAX_ARC_DEG, MAX_ARC_DEG, RADIUS);
  const sweetSpotDeg = (5 / 50) * MAX_ARC_DEG;
  const sweetSpotArcPath = describeArc(-sweetSpotDeg, sweetSpotDeg, RADIUS);

  const selectValue =
    presetId === 'custom' && activeSavedCustomId ? `saved:${activeSavedCustomId}` : presetId;

  const activeMeterBars = Math.round(signalLevel * 5);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="tuner-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={handleClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-backdrop)] p-3 sm:p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tuner-modal-title"
        >
          <motion.div
            key="tuner-modal"
            initial={{ opacity: 0, y: 12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="surface-card w-full max-w-xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-[0_24px_60px_-20px_rgba(17,17,17,0.34)]"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] pb-3.5">
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
                  Herramienta local · Sin conexión
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h2
                    id="tuner-modal-title"
                    className="text-xl sm:text-2xl font-medium text-[var(--color-ink)]"
                  >
                    Afinador · {activeTuningTitle}
                  </h2>
                  <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-board)] px-2.5 py-0.5 font-mono text-xs font-medium text-[var(--color-ink)]">
                    {activeTuningSequence}
                  </span>
                  {semitoneShift !== 0 && (
                    <span className="rounded-full border border-[var(--color-accent-border)] bg-[var(--color-accent-tint)] px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--color-accent)]">
                      {formatSemitoneShift(semitoneShift)}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="btn-secondary shrink-0 px-3 py-1.5 text-xs"
                aria-label="Cerrar afinador"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cerrar</span>
              </button>
            </div>

            {/* Preset selector + Semitone transpose + Customize toggle */}
            <div className="mt-4 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-board)] p-2.5 flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-[180px]">
                <select
                  aria-label="Seleccionar afinación"
                  value={selectValue}
                  onChange={(e) => handleSelectTuningChange(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none cursor-pointer"
                >
                  <optgroup label="Afinaciones populares">
                    {TUNING_PRESETS.filter((p) => p.id !== 'custom').map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name} · {preset.shortLabel}
                      </option>
                    ))}
                  </optgroup>
                  {savedCustomTunings.length > 0 && (
                    <optgroup label="Mis afinaciones">
                      {savedCustomTunings.map((ct) => (
                        <option key={ct.id} value={`saved:${ct.id}`}>
                          {ct.name} · {formatTuningSequence(buildTuningStrings(ct.midis))}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <option value="custom">Personalizada…</option>
                </select>
              </div>

              {/* Semitone transpose stepper */}
              <div
                className="inline-flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5"
                role="group"
                aria-label="Transportar afinación por semitonos"
              >
                <button
                  type="button"
                  onClick={() => handleShiftSemitones(-1)}
                  disabled={semitoneShift <= MIN_TUNING_SHIFT}
                  aria-label="Bajar medio tono"
                  className="rounded-md p-1.5 text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-ink)] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetShift}
                  title="Restablecer a 0 semitonos"
                  className={`px-2 py-1 font-mono text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors ${
                    semitoneShift !== 0
                      ? 'text-[var(--color-accent)]'
                      : 'text-[var(--color-ink-secondary)]'
                  }`}
                >
                  {semitoneShift === 0 ? 'Tono 0' : formatSemitoneShift(semitoneShift)}
                </button>
                <button
                  type="button"
                  onClick={() => handleShiftSemitones(1)}
                  disabled={semitoneShift >= MAX_TUNING_SHIFT}
                  aria-label="Subir medio tono"
                  className="rounded-md p-1.5 text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-ink)] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleToggleCustomEditor}
                aria-expanded={isCustomEditorOpen}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  isCustomEditorOpen
                    ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-white'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink-muted)]'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Personalizar</span>
              </button>
            </div>

            {/* Top 6-String Interactive Rack (syncs live in Auto mode) */}
            <div className="mt-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-pressed={lockedString === null}
                    onClick={() => setLockedStringNumber(null)}
                    className={`rounded-full border px-3 py-1 font-mono text-[11px] font-medium transition-colors cursor-pointer ${
                      lockedString === null
                        ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-white'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    Auto
                  </button>

                  {tunedStrings.length > 0 && (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-[#15803D]/35 bg-[#15803D]/10 px-2.5 py-0.5 text-[11px] font-mono text-[#15803D]">
                      <span>{tunedStrings.length}/6 afinadas</span>
                      <button
                        type="button"
                        onClick={resetSessionProgress}
                        aria-label="Reiniciar progreso de cuerdas"
                        className="inline-flex items-center gap-0.5 hover:underline cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reiniciar</span>
                      </button>
                    </div>
                  )}
                </div>

                <span
                  className="font-mono text-xs font-medium transition-colors"
                  style={{
                    color: lockedString
                      ? 'var(--color-ink)'
                      : hasLiveReading
                        ? isInTune
                          ? 'var(--color-ok)'
                          : 'var(--color-accent)'
                        : 'var(--color-ink-muted)',
                  }}
                >
                  {lockedString
                    ? `Manual · ${lockedString.spanishName}`
                    : hasLiveReading
                      ? `Auto · ${reading.targetString.spanishName}`
                      : isListening
                        ? 'Auto · Toca una cuerda'
                        : 'Detección automática'}
                </span>
              </div>

              <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                {activeStrings.map((str) => {
                  const isManualLocked = lockedString?.stringNumber === str.stringNumber;
                  const isAutoDetected =
                    lockedString === null &&
                    hasLiveReading &&
                    reading.targetString.stringNumber === str.stringNumber;
                  const isHighlighted = isManualLocked || isAutoDetected;
                  const isMarkedTuned = tunedStrings.includes(str.stringNumber);

                  const activeBg =
                    (isAutoDetected || isManualLocked) && isInTune
                      ? '#15803D'
                      : isAutoDetected
                        ? '#E85D3D'
                        : '#111111';

                  return (
                    <button
                      key={str.stringNumber}
                      type="button"
                      data-string-number={str.stringNumber}
                      data-auto-active={isAutoDetected ? 'true' : 'false'}
                      data-locked={isManualLocked ? 'true' : 'false'}
                      aria-pressed={isManualLocked}
                      onClick={() =>
                        setLockedStringNumber((prev) =>
                          prev === str.stringNumber ? null : str.stringNumber,
                        )
                      }
                      className={`relative overflow-hidden rounded-[12px] border px-1.5 py-2 sm:py-2.5 flex flex-col items-center justify-between gap-1.5 transition-colors cursor-pointer ${
                        isHighlighted
                          ? 'border-transparent text-white shadow-sm'
                          : isMarkedTuned
                            ? 'border-[#15803D]/45 bg-[#15803D]/[0.07] text-[var(--color-ink)] hover:border-[#15803D]'
                            : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-ink-muted)]'
                      }`}
                    >
                      {isHighlighted && (
                        <motion.span
                          layoutId="tuner-active-string"
                          transition={{ type: 'spring', stiffness: 460, damping: 32 }}
                          className="absolute inset-0 rounded-[11px]"
                          style={{ backgroundColor: activeBg }}
                          aria-hidden="true"
                        />
                      )}

                      <div className="relative z-10 w-full flex items-center justify-between px-0.5">
                        <span
                          className={`font-mono text-[10px] leading-none ${
                            isHighlighted ? 'text-white/80' : 'text-[var(--color-ink-muted)]'
                          }`}
                        >
                          {str.stringNumber}ª
                        </span>
                        {isMarkedTuned && (
                          <span
                            className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                              isHighlighted
                                ? 'bg-white/25 text-white'
                                : 'bg-[#15803D] text-white'
                            }`}
                            title="Cuerda afinada"
                          >
                            <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                          </span>
                        )}
                      </div>

                      <div className="relative z-10 flex items-baseline justify-center leading-none">
                        <span className="font-mono text-sm sm:text-base font-semibold">
                          {str.label}
                        </span>
                        <span
                          className={`font-mono text-[10px] ml-0.5 ${
                            isHighlighted ? 'text-white/75' : 'text-[var(--color-ink-muted)]'
                          }`}
                        >
                          {str.octave}
                        </span>
                      </div>

                      <span
                        className="relative z-10 w-4/5 rounded-full transition-colors"
                        style={{
                          height: `${STRING_GAUGE_PX[str.stringNumber]}px`,
                          backgroundColor: isHighlighted
                            ? 'rgba(255, 255, 255, 0.72)'
                            : isMarkedTuned
                              ? 'rgba(21, 128, 61, 0.55)'
                              : '#D4D4D8',
                        }}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Expandable 6-string Custom Tuning Builder */}
            <AnimatePresence initial={false}>
              {isCustomEditorOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                  className="mt-3 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-board)] p-3.5 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-[var(--color-ink)]">
                      Ajusta cada cuerda nota por nota
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomMidis([...STANDARD_MIDIS]);
                        setPresetId('custom');
                        setActiveSavedCustomId(null);
                        setSemitoneShift(0);
                        resetSessionProgress();
                      }}
                      className="btn-secondary bg-[var(--color-surface)] px-2.5 py-1 text-[11px]"
                    >
                      Estándar
                    </button>
                  </div>

                  <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                    {activeStrings.map((str, idx) => {
                      const midiVal = getStringMidi(str, idx);
                      return (
                        <div
                          key={`custom-col-${str.stringNumber}`}
                          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 flex flex-col items-center gap-1"
                        >
                          <button
                            type="button"
                            onClick={() => handleStepCustomString(idx, 1)}
                            disabled={midiVal >= MAX_STRING_MIDI}
                            aria-label={`Subir cuerda ${str.stringNumber}ª`}
                            className="w-full rounded py-1 flex items-center justify-center text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-ink)] disabled:opacity-30 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <div className="text-center py-0.5">
                            <p className="font-mono text-xs font-semibold text-[var(--color-ink)] leading-tight">
                              {str.label}
                              {str.octave}
                            </p>
                            <p className="font-mono text-[10px] text-[var(--color-ink-muted)] leading-tight">
                              {str.frequency.toFixed(0)} Hz
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleStepCustomString(idx, -1)}
                            disabled={midiVal <= MIN_STRING_MIDI}
                            aria-label={`Bajar cuerda ${str.stringNumber}ª`}
                            className="w-full rounded py-1 flex items-center justify-center text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-ink)] disabled:opacity-30 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void playReferenceTone(str)}
                            aria-label={`Escuchar cuerda ${str.stringNumber}ª`}
                            className="w-full rounded py-1 flex items-center justify-center text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-accent)] cursor-pointer"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <form
                    onSubmit={handleSaveCustom}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1"
                  >
                    <input
                      id="custom-tuning-name"
                      type="text"
                      value={customNameInput}
                      onChange={(e) => setCustomNameInput(e.target.value)}
                      placeholder="Ej. Mi afinación abierta"
                      className="flex-1 min-w-0 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-1.5 text-xs text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-ink)] focus:outline-none"
                    />
                    <button type="submit" className="btn-primary px-4 py-1.5 text-xs shrink-0">
                      Guardar afinación
                    </button>
                  </form>

                  {savedCustomTunings.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[var(--color-border)]">
                      {savedCustomTunings.map((ct) => {
                        const isSelected = activeSavedCustomId === ct.id;
                        return (
                          <div
                            key={ct.id}
                            className={`inline-flex items-center gap-1 rounded-full border pl-2.5 pr-1 py-0.5 text-[11px] font-medium ${
                              isSelected
                                ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-white'
                                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-secondary)]'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleSelectTuningChange(`saved:${ct.id}`)}
                              className="cursor-pointer hover:underline"
                            >
                              {ct.name}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCustom(ct.id)}
                              aria-label={`Eliminar afinación ${ct.name}`}
                              className="rounded-full p-0.5 hover:bg-black/10 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Light Studio Porcelain Precision Viewport (AAA Contrast) */}
            <div className="mt-4 rounded-[14px] border border-[#D4D4D8] bg-[#FAFAFA] p-4 sm:p-5 text-[#111111]">
              {/* Top Telemetry Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <span className="text-[#52525B]">
                  {activeReferenceString.spanishName} · obj. {activeReferenceString.frequency} Hz
                </span>
                <div className="flex items-center gap-2.5">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium num-tabular ${
                      !hasLiveReading
                        ? 'bg-[#ECECEF] text-[#111111]'
                        : isInTune
                          ? 'bg-[#15803D]/15 text-[#15803D]'
                          : 'bg-[#E85D3D]/15 text-[#C2410C]'
                    }`}
                  >
                    {hasLiveReading
                      ? `${reading.cents > 0 ? '+' : ''}${reading.cents} ct`
                      : isListening
                        ? '— ct'
                        : 'Sin señal'}
                  </span>
                  <div
                    className="flex items-end gap-0.5 h-3.5"
                    aria-label="Nivel de señal del micrófono"
                  >
                    {[1, 2, 3, 4, 5].map((bar) => {
                      const lit = isListening && activeMeterBars >= bar;
                      return (
                        <span
                          key={bar}
                          className="w-1 rounded-full transition-colors duration-75"
                          style={{
                            height: `${4 + bar * 2}px`,
                            backgroundColor: lit
                              ? isInTune
                                ? '#15803D'
                                : '#111111'
                              : '#E4E4E7',
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Semicircular Gauge */}
              <div className="relative mx-auto mt-2 w-full max-w-[300px]">
                <svg viewBox="0 0 300 156" className="w-full h-auto overflow-visible">
                  <path
                    d={fullArcPath}
                    fill="none"
                    stroke="#E4E4E7"
                    strokeWidth="6.5"
                    strokeLinecap="round"
                  />

                  <path
                    d={sweetSpotArcPath}
                    fill="none"
                    stroke={isInTune ? '#15803D' : '#A1A1AA'}
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
                      strokeWidth="1.5"
                    />
                  )}

                  {CENT_TICKS.map((tick) => {
                    const deg = (tick / 50) * MAX_ARC_DEG;
                    const isMajor = tick % 10 === 0;
                    const isZero = tick === 0;
                    const inner = polarPoint(
                      deg,
                      isZero ? RADIUS - 14 : isMajor ? RADIUS - 10 : RADIUS - 6,
                    );
                    const outer = polarPoint(deg, RADIUS + 5);
                    return (
                      <line
                        key={tick}
                        x1={inner.x}
                        y1={inner.y}
                        x2={outer.x}
                        y2={outer.y}
                        stroke={
                          isZero && hasLiveReading
                            ? '#15803D'
                            : isMajor
                              ? '#52525B'
                              : '#A1A1AA'
                        }
                        strokeWidth={isZero ? 2.2 : isMajor ? 1.4 : 1}
                        strokeLinecap="round"
                      />
                    );
                  })}

                  <text
                    x="30"
                    y="88"
                    fill="#52525B"
                    className="font-mono text-[10px] font-medium"
                    textAnchor="middle"
                  >
                    -50
                  </text>
                  <text
                    x={CX}
                    y="13"
                    fill={hasLiveReading ? '#15803D' : '#111111'}
                    className="font-mono text-[10px] font-semibold"
                    textAnchor="middle"
                  >
                    0
                  </text>
                  <text
                    x="270"
                    y="88"
                    fill="#52525B"
                    className="font-mono text-[10px] font-medium"
                    textAnchor="middle"
                  >
                    +50
                  </text>

                  {/* Direction Hints */}
                  <text
                    x="36"
                    y="144"
                    fill={hasLiveReading && reading.status === 'flat' ? '#C2410C' : '#52525B'}
                    className="font-mono text-[10px] font-semibold"
                    textAnchor="start"
                  >
                    ◀ Apretar
                  </text>
                  <text
                    x="264"
                    y="144"
                    fill={hasLiveReading && reading.status === 'sharp' ? '#C2410C' : '#52525B'}
                    className="font-mono text-[10px] font-semibold"
                    textAnchor="end"
                  >
                    Aflojar ▶
                  </text>

                  {/* Spring Damped Needle */}
                  <motion.g
                    initial={false}
                    animate={{
                      rotate: needleDeg,
                      opacity: hasLiveReading ? 1 : 0.65,
                    }}
                    transition={{ type: 'spring', stiffness: 260, damping: 26, mass: 0.6 }}
                    style={{ transformOrigin: `${CX}px ${CY}px` }}
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
                  </motion.g>

                  <circle
                    cx={CX}
                    cy={CY}
                    r="6.5"
                    fill="#FFFFFF"
                    stroke={needleColor}
                    strokeWidth="2.5"
                  />
                </svg>
              </div>

              {/* Hero Note + Frequency Readout */}
              <div className="flex items-baseline justify-center gap-3 -mt-2">
                <span
                  className="font-mono text-5xl sm:text-6xl font-medium num-tabular transition-colors"
                  style={{
                    color: !hasLiveReading
                      ? '#52525B'
                      : isInTune
                        ? '#15803D'
                        : '#111111',
                  }}
                >
                  {hasLiveReading ? reading.detectedNote : activeReferenceString.label}
                  <sup className="text-xl sm:text-2xl ml-0.5 opacity-80">
                    {hasLiveReading ? reading.detectedOctave : activeReferenceString.octave}
                  </sup>
                </span>
                <span className="font-mono text-sm text-[#52525B] num-tabular">
                  {hasLiveReading
                    ? `${reading.frequency.toFixed(1)} Hz`
                    : `${activeReferenceString.frequency} Hz`}
                </span>
              </div>

              {/* 11-Segment Cent Deviation LED Bar */}
              <div
                className="mt-3 mx-auto grid max-w-[260px] grid-cols-11 gap-1"
                aria-hidden="true"
              >
                {LED_SEGMENTS.map((seg) => {
                  const isZero = seg === 0;
                  const activeSide =
                    hasLiveReading &&
                    !isInTune &&
                    ((seg < 0 && clampedCents <= seg + 5) || (seg > 0 && clampedCents >= seg - 5));
                  const litGreen = isInTune && isZero;
                  return (
                    <span
                      key={seg}
                      className="h-1.5 rounded-full transition-colors duration-75"
                      style={{
                        backgroundColor: litGreen
                          ? '#15803D'
                          : activeSide
                            ? '#E85D3D'
                            : isZero
                              ? '#A1A1AA'
                              : '#E4E4E7',
                      }}
                    />
                  );
                })}
              </div>

              {/* Honest Live Status Copy */}
              <p
                className="mt-3 text-center text-sm font-medium"
                style={{
                  color: !hasLiveReading
                    ? '#3F3F46'
                    : isInTune
                      ? '#15803D'
                      : '#C2410C',
                }}
              >
                {statusText}
              </p>
            </div>

            {micError && (
              <div className="mt-4 rounded-[12px] border border-[var(--color-accent-border)] bg-[var(--color-accent-tint)] p-3 text-xs text-[var(--color-ink)] leading-relaxed">
                {micError}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
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
                <span>
                  Escuchar {activeReferenceString.stringNumber}ª ({activeReferenceString.label}
                  {activeReferenceString.octave})
                </span>
              </button>
            </div>

            <p className="mt-3 text-xs text-[var(--color-ink-muted)] text-center sm:text-left">
              Todo el análisis ocurre directo en tu navegador; ningún audio sale de tu dispositivo.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
