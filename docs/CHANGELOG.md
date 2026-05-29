# Changelog — Cambios recientes

Fecha: 2026-05-27

Resumen: cambios implementados para ROADMAP2 (layout, PanelWrapper, DnD, IndexedDB, ARIA y tests).

- PanelWrapper y colapso
  - Archivo: `src/components/PanelWrapper.tsx`
  - Descripción: nuevo componente base para paneles con header estándar, botón `[ BYPASS ]`, animación `max-height`, y soporte accesible para el drag handle.

- Drag & Drop — UX, accesibilidad y lógica
  - Archivos:
    - `src/hooks/useWorkspaceLayout.ts` — hook de orden de paneles y persistencia en `localStorage` (`acordify_layout`).
    - `src/components/SortableToggle.tsx` — drag handle, transiciones, atributos ARIA (`role`, `tabIndex`, `aria-grabbed`, `aria-describedby`).
    - `src/App.tsx` — integración `@dnd-kit` (`DndContext`, `SortableContext`), drop-placeholder visual, detección touch y KeyboardSensor.
  - Descripción: reordenado de módulos con indicadores visuales, soporte para teclado y fallback en dispositivos táctiles.

- Persistencia local (IndexedDB)
  - Archivo: `src/services/storageService.ts`
  - Descripción: migración a `idb` para guardar sesiones, helpers de export/import y backup JSON.

- Session IO
  - Archivo: `src/hooks/useSessionIO.ts` y `src/utils/sessionExporter.ts`
  - Descripción: helpers para build/serialize/parse de snapshots `.acordify.json` y utilidades de descarga/import.

- Tests añadidos / actualizados
  - Archivos de test:
    - `src/services/__tests__/storageService.test.ts` — pruebas de persistencia e import/export JSON.
    - `src/hooks/__tests__/useWorkspaceLayout.test.tsx` — prueba DOM que valida `handleDragEnd` y mock de `localStorage`.
  - Descripción: suite ajustada para `fake-indexeddb` y pruebas de integración de layout.

- Accesibilidad y documentación
  - Archivos:
    - `src/App.tsx` — elemento `id="workspace-dnd-instructions"` (sr-only) con instrucciones para lectores de pantalla.
    - `src/components/PanelWrapper.tsx` y `src/components/SortableToggle.tsx` — mejoras ARIA.

Instrucciones para commitear (sugerido):

```bash
git add docs/CHANGELOG.md src/components/PanelWrapper.tsx src/hooks/useWorkspaceLayout.ts \
  src/components/SortableToggle.tsx src/App.tsx src/services/storageService.ts \
  src/hooks/useSessionIO.ts src/utils/sessionExporter.ts src/services/__tests__/storageService.test.ts \
  src/hooks/__tests__/useWorkspaceLayout.test.tsx

git commit -m "ROADMAP2: layout fixes, PanelWrapper, DnD, IndexedDB persistence, ARIA & tests"
```

¿Quieres que también cree un PR description (resumen listo para pegar) para usar en GitHub?