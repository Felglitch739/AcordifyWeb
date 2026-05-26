# ACORDIFY — ROADMAP MAESTRO
> Actualizado: Mayo 2026 | Stack: React + TypeScript + Vite + Tailwind + Tone.js

---

## ESTADO DEL PROYECTO

```
Migración Android → Web         ✅ Completo
Motor de Audio (Tone.js)        ✅ Completo
Transpositor de acordes         ✅ Completo
Metrónomo visual                ✅ Completo
Auto-scroll manos libres        ✅ Completo
Pipeline CI/CD (GitHub Actions) ✅ Completo
harmonicValidator.ts            ✅ Completo → /src/utils/harmonicValidator.ts
buildChordPrompt.ts             ✅ Completo → /src/services/chordPromptBuilder.ts
```

---

## PIPELINE DE IMPLEMENTACIÓN

Cada tarea tiene su prompt experto en `/docs/prompts/`.
Implementar **en orden**. No avanzar al siguiente paso sin aprobar el anterior.

---

### 01 — harmonicValidator.ts ✅
**Archivo:** `/docs/prompts/01_harmonic_validator.txt`
**Destino:** `/src/utils/harmonicValidator.ts`
**Descripción:** Validación armónica post-generación. Detecta acordes
disonantes, borrowed chords, dominantes secundarios y calcula un
coherenceScore (0-100) para cada progresión antes de mostrarla al usuario.

**Exports clave:**
- `parseChord(raw)`
- `validateChord(chord, keyRoot, mode)`
- `validateProgression(chords, keyRoot, mode)`
- `detectKey(chords)` *(bonus)*

---

### 02 — buildChordPrompt.ts ✅
**Archivo:** `/docs/prompts/02_chord_prompt_builder.txt`
**Destino:** `/src/services/chordPromptBuilder.ts`
**Descripción:** Sistema de prompt engineering para la generación de
acordes. Elimina progresiones cliché (I-V-vi-IV puro), fuerza variedad
armónica por mood y conecta con harmonicValidator como capa de validación.

**Exports clave:**
- `buildChordPrompt(params: ChordPromptParams)`
- `parseChordResponse(raw: string)`

---

### 03 — Modo "Completar Verso" ✅ PROMPT LISTO
**Archivo:** `/docs/prompts/03_completar_verso.txt`
**Destino:** `/src/services/completeVerseService.ts`
**Descripción:** El usuario escribe 1-4 líneas y la IA completa la
estrofa preservando su voz, esquema de rima, métrica silábica y
mapeando cada línea generada a un acorde de la progresión activa.
El resultado se inyecta directo al ChordPro Notebook en formato ChordPro.

**Exports clave:**
- `buildCompleteVersePrompt(params: CompleteVerseParams)`
- `parseCompleteVerseResponse(raw: string)`
- `toChordProFormat(result: CompleteVerseResult)`

**Variables runtime:**
`{{USER_LINES}}` `{{ACTIVE_CHORDS}}` `{{KEY_ROOT}}` `{{MODE}}`
`{{BPM}}` `{{MOOD}}` `{{LANGUAGE}}` `{{RHYME_SCHEME}}` `{{LINES_TO_COMPLETE}}` `{{STYLE_HINT}}`

---

### 04 — Parámetros Avanzados de Letras 🔨 SIGUIENTE
**Archivo:** `/docs/prompts/04_parametros_letras.txt`
**Destino:** `/src/components/LyricsControlPanel.tsx` + `/src/services/lyricsService.ts`
**Descripción:** Panel de controles avanzados para la generación de letras.
El usuario puede ajustar: esquema de rima, métrica, estado de ánimo emocional,
punto de vista narrativo (1ra/3ra persona), densidad metafórica y nivel de
oscuridad/luminosidad temática. Los parámetros se sincronizan con el BPM
activo y la progresión de acordes.

**UI a implementar:**
- Selector de esquema de rima: `ABAB | AABB | ABBA | free`
- Slider de mood emocional: `melancólico ←→ esperanzador`
- Selector de persona narrativa: `1ra | 2da | 3ra`
- Toggle de densidad metafórica: `literal | balanceado | poético`
- Input de tema/concepto libre (opcional)

---

### 05 — Rasgueos Animados por Género 🔨
**Archivo:** `/docs/prompts/05_rasgueos_animados.txt`
**Destino:** `/src/components/StrumsVisualizer.tsx`
**Descripción:** Visualizador de patrones de rasgueo representados con
flechas animadas (↓ ↑) que se iluminan en sincronía con el BPM del
metrónomo. Cada mood tiene su patrón predefinido.

**Patrones por mood:**
- Jazz Melancólico → swing sincopado, énfasis en tiempos débiles
- Indie Rock Energético → down-strokes pesados, palm mute visual
- Pop Acústico Relajado → patrón arpegiado suave

**Integración:** Se conecta con el Tone.js Transport para sincronía exacta.

---

### 06 — Modo Sesión en Vivo 🔨
**Archivo:** `/docs/prompts/06_sesion_en_vivo.txt`
**Destino:** `/src/hooks/useLiveSession.ts` + `/src/components/LiveSessionOverlay.tsx`
**Descripción:** Los acordes del ChordPro Notebook se resaltan
automáticamente al ritmo del BPM. El usuario configura cuántos
compases dura cada acorde (1 o 2). El Tone.js Transport es el único
source of truth para el timing. Al activarse, el foco visual sigue
al acorde activo con auto-scroll.

**Lógica:**
- 1 compás = 4 beats a X BPM
- Cada acorde tiene `durationBars: 1 | 2`
- El highlight avanza en `durationBars * 4` beats
- Si auto-scroll está activo, se desactiva y re-activa en modo live

---

### 07 — Export de Sesión como JSON 🔨
**Archivo:** `/docs/prompts/07_export_sesion.txt`
**Destino:** `/src/utils/sessionExporter.ts`
**Descripción:** Permite exportar e importar una sesión completa
como archivo `.acordify.json`. Incluye progresión, transposición,
BPM, mood, letras y metadatos.

**Schema de sesión:**
```json
{
  "version": "1.0",
  "metadata": { "createdAt", "title", "mood", "bpm" },
  "music": { "keyRoot", "mode", "chords", "capo" },
  "lyrics": { "chordProContent", "language", "rhymeScheme" },
  "player": { "bpm", "transposition", "autoScrollSpeed" }
}
```

---

### 08 — Persistencia Local (IndexedDB) 🔨
**Archivo:** `/docs/prompts/08_indexeddb.txt`
**Destino:** `/src/services/storageService.ts` + `/src/hooks/useStorage.ts`
**Descripción:** Almacenamiento local de sesiones usando IndexedDB.
Sin servidor, sin costo, datos en el browser del usuario.
Se implementa **después** de que el export JSON esté listo,
ya que usa el mismo schema de sesión.

**Funcionalidades:**
- Guardar sesión actual (con nombre opcional o timestamp automático)
- Listar sesiones guardadas
- Cargar sesión guardada
- Eliminar sesión
- Exportar todas las sesiones como backup ZIP

---

## NOTAS DE ARQUITECTURA

```
/src
  /components   → UI puro, sin lógica de negocio
  /hooks        → lógica stateful (useLiveSession, useStorage)
  /utils        → funciones puras (harmonicValidator, sessionExporter)
  /services     → llamadas a APIs (chordPromptBuilder, lyricsService)

/docs
  /prompts      → prompts expertos por feature, un archivo por tarea
  ROADMAP.md    → este archivo
```

**Reglas que no se negocian:**
- Cero `any` en TypeScript
- Tone.js Transport = único source of truth para timing
- No manipular Web Audio API directamente
- Tailwind only, sin inline styles
- Funciones puras en /utils, sin efectos secundarios

---

## CONVENCIONES DE NOMBRES

| Elemento | Convención | Ejemplo |
|---|---|---|
| Componentes | PascalCase | `StrumsVisualizer.tsx` |
| Hooks | camelCase con `use` | `useLiveSession.ts` |
| Servicios | camelCase + Service | `lyricsService.ts` |
| Utils | camelCase + descriptor | `harmonicValidator.ts` |
| Acordes | Notación estándar | `Cmaj7`, `Am9`, `G13` |

---

*ACORDIFY CORP. © 2026 — Documento interno de desarrollo*