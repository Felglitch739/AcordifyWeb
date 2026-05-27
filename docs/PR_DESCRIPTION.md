PR Title: ROADMAP2 — Layout fixes, PanelWrapper, DnD, IndexedDB persistence, ARIA & tests

Summary:
This PR implements the ROADMAP2 items focused on UI layout, panel infrastructure, drag & drop reordering, local persistence, accessibility improvements, and test coverage.

Changed areas (high level):
- Layout and panel behavior: `src/App.tsx`, `src/components/PanelWrapper.tsx`
- Drag & Drop: `src/hooks/useWorkspaceLayout.ts`, `src/components/SortableToggle.tsx`, `src/App.tsx`
- Accessibility (ARIA): `src/components/SortableToggle.tsx`, `src/components/PanelWrapper.tsx`, `src/App.tsx`
- Session persistence: `src/services/storageService.ts` (migrated to `idb`) and `src/hooks/useStorage.ts`
- Session IO helpers: `src/hooks/useSessionIO.ts`, `src/utils/sessionExporter.ts`
- Tests: `src/services/__tests__/storageService.test.ts`, `src/hooks/__tests__/useWorkspaceLayout.test.tsx`
- Docs: `docs/CHANGELOG.md`, `docs/ROADMAP2` (updated statuses)

Checklist
- [x] Layout fixes: ensure grid panels use `items-start` and `h-fit`/`self-start` where appropriate
- [x] `PanelWrapper` component with collapse/persist behavior
- [x] Panel reordering with `@dnd-kit` (mouse + keyboard)
- [x] Drag visuals and drop placeholder indicator
- [x] Accessibility: focusable handles, `aria-grabbed`, screen-reader instructions
- [x] IndexedDB persistence via `idb` and backup export/import helpers
- [x] Tests covering storage and workspace layout

Manual QA steps
1. Run `npm run dev` and open the app (default: http://localhost:5174/).
2. In the "Workspace Desk Manager" header, try dragging module toggles to reorder. Try keyboard reordering (space to pick up, arrows to move).
3. Verify panels persist order and collapsed state across reloads.
4. Save a session in the Vault, export backup, delete, and import backup to confirm roundtrip.

Notes
- The PR was pushed to branch `test/lyrics-vitest` on the origin remote.
- If you want me to open the PR on GitHub I can attempt to do so if the `gh` CLI or a GitHub token is available; otherwise paste this description into the GitHub PR UI.

---
Generated automatically by Copilot agent for review.