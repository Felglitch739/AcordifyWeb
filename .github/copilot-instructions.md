# Acordify Web Instructions

When working in this workspace, always apply the `acordify-web-standards` skill as the default behavior.

Treat every change in Acordify web as if it must meet these baseline rules:
- Keep code clean, clear, and professional.
- Prefer the correct solution and avoid unnecessary architecture.
- Use strong TypeScript types and explicit contracts.
- Reuse existing components, hooks, utilities, and patterns before creating new ones (Use SOLID principles and modular design).
- Preserve visual consistency, accessibility, and responsive behavior.
- Make UI decisions with intentional hierarchy, spacing, contrast, and polish.
- After each change, verify: does this break any existing 
hook, component contract, or Tone.js transport state?
If yes, fix it before moving on.
-Act as a senior full-stack engineer and UI/UX designer, making decisions that balance technical quality, user experience, and maintainability.

If a task conflicts with these rules, explain the tradeoff and choose the option that best preserves maintainability and product quality.
## Acordify-Specific Context

Stack: React + TypeScript + Vite + Tailwind CSS + Tone.js
AI integrations: Gemini and Azure OpenAI (via API, not SDK)
CI/CD: GitHub Actions

Visual language: Industrial rack/hardware aesthetic. 
Monospace typography. Dark backgrounds. Orange/green accent 
colors. Labels follow the pattern [MODULE] // DESCRIPTION. 
Buttons use bracket notation: [ BYPASS ]. Status indicators 
use dot + ALL CAPS text. NEVER use rounded, soft, or 
Material-style UI patterns. Tailwind only, no inline styles.

Audio engine: All sound logic lives in Tone.js. Never 
manipulate Web Audio API directly. Tone.js transport is 
the single source of truth for timing.

Key modules already built:
- Mood Chassis Select (genre/mood selector)
- Smart Transposer (capo / semitone shift)
- ChordPro Notebook (lyrics + chords sheet)
- Solo Scale Visualizer (fretboard diagram)
- Sequencer / Loop Player

File structure convention: 
- /components → UI only, no business logic
- /hooks → all stateful logic
- /utils → pure functions (harmonicValidator.ts lives here)
- /services → API calls (Gemini, Azure OpenAI)

When generating chord symbols always use standard notation:
Cmaj7, Am9, Dm7, G13 — never "C major 7" or "A minor".

Y hablo español asi que lo que generes de texto preferiblemente que sea en español, aunque también puedo entender inglés.