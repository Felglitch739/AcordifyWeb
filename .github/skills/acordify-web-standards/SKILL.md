---
name: acordify-web-standards
description: 'Use when working in Acordify web to keep code clean, clear, professional, and senior-level across full-stack, software, UI, and UX tasks. Trigger for features, refactors, debugging, architecture, components, TypeScript, React, Vite, Tailwind, API integration, accessibility, and design consistency.'
argument-hint: 'What do you want to improve in Acordify web?'
user-invocable: true
disable-model-invocation: false
---

# Acordify Web Standards

## Propósito
Usa esta skill para mantener Acordify web con un criterio consistente de ingeniería y producto: código limpio, decisiones simples, UI profesional, UX clara y una ejecución propia de un senior full-stack.

## Cuándo usarla
- Al crear o refactorizar features en React, TypeScript, Vite o Tailwind.
- Al ajustar componentes, layouts, navegación, estados vacíos, loading o error.
- Al tocar lógica de negocio, servicios, validaciones o contratos de datos.
- Al corregir bugs sin romper consistencia visual o técnica.
- Al revisar calidad general del proyecto antes de entregar.

## Principios
- Prioriza claridad antes que astucia.
- Prefiere cambios pequeños, localizados y fáciles de revisar.
- Mantén tipado fuerte y contratos explícitos.
- Reutiliza componentes y utilidades existentes antes de crear duplicados.
- Evita sobrearquitectura, pero no sacrifiques mantenibilidad.
- Cada cambio debe mejorar legibilidad, consistencia o experiencia de usuario.
- La UI debe verse intencional, profesional, responsive y accesible.

## Flujo de trabajo
1. Identifica el objetivo real del cambio y el archivo o abstracción que lo controla.
2. Lee solo el contexto necesario para formar una hipótesis comprobable.
3. Elige la solución más simple que corrija la causa raíz.
4. Si el cambio toca UI, valida jerarquía visual, spacing, estados, contraste, accesibilidad y comportamiento responsive.
5. Si el cambio toca lógica o datos, valida tipos, edge cases, errores y compatibilidad con el resto del flujo.
6. Mantén el alcance pequeño y evita reescribir piezas que ya funcionan.
7. Verifica con la comprobación más barata y específica disponible.

## Criterios de calidad
- El código queda más fácil de entender que antes.
- No se introducen dependencias o capas innecesarias.
- Los componentes tienen responsabilidades claras.
- Los estados de carga, error y vacío no quedan improvisados.
- La interfaz conserva coherencia visual entre pantallas y componentes.
- La experiencia funciona bien en desktop y mobile.
- El resultado final se siente pulido, no solo funcional.

## Checklist de cierre
- Tipos y lint sin errores relevantes.
- No hay regresiones obvias en UX, layout o interacción.
- Los nombres de variables, funciones y componentes describen intención.
- La solución sigue siendo mantenible para el siguiente cambio.
- Si algo quedó fuera de alcance, se deja explicitado con claridad.

## Estilo de respuesta
- Sé directo, técnico y claro.
- Explica decisiones cuando haya tradeoffs reales.
- Si hay varias opciones, elige una y justifica por qué.
- Si el cambio afecta diseño, habla en términos de intención visual, jerarquía, consistencia y accesibilidad.
