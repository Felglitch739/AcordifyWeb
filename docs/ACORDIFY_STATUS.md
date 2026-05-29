# Estado Actual de Acordify y Roadmap Futuro

Este documento proporciona una visión general detallada del estado actual del proyecto **Acordify** (una aplicación web de asistencia armónica y lírica para músicos) y las características pendientes de desarrollo.

---

## 🚀 ¿Qué tiene actualmente Acordify? (Características Implementadas)

Acordify cuenta con un entorno interactivo inspirado en hardware musical vintage (estética industrial "rack") que combina lógica de audio, persistencia local y asistencia de Inteligencia Artificial.

### 1. Panel de Control y Motor de Acordes
*   **Generación de Acordes Asistida por IA**: Panel `[CONTROL PANEL] // MOOD CHASSIS SELECT` para configurar tonalidad raíz, modo (Mayor/Menor), complejidad armónica (Básico, Intermedio, Avanzado) y BPM.
*   **Selección de Moods & Géneros**: Soporta tarjetas de estilos predefinidos (Jazz Melancólico, Indie Rock, Pop Acústico) y un **input de género custom/libre** con límite de 40 caracteres.
*   **Validación Armónica (`harmonicValidator.ts`)**: Analiza la coherencia tonal de las progresiones de acordes generadas, calcula un puntaje de coincidencia (`coherenceScore`) y detecta acordes disonantes o prestados.

### 2. Edición Lógica y Formato de Canciones
*   **ChordPro Notebook (`LyricsSheet.tsx`)**: Editor interactivo que soporta lectura y edición directa de acordes/letras.
*   **Modo Edición Avanzado**:
    *   Textarea con fuente monoespaciada.
    *   **Resaltado de Sintaxis en tiempo real**: Colorea los acordes entre corchetes `[Cmaj7]` en color naranja/acento y el texto normal en blanco.
    *   **Autocompletado de Acordes**: Menú desplegable dinámico al escribir `[C` con sugerencias de acordes.
    *   **Asistencia por IA**: Botón `[ ASISTIR CON IA ]` que inserta sugerencias líricas coherentes al final de la letra usando el servicio de autocompletado de versos (`completeVerse.ts`).
    *   **Mapeador de Acordes**: Botón `[ MAPEAR ACORDES ]` que distribuye automáticamente los acordes de la progresión activa al inicio de las líneas de la letra.
    *   **Autoguardado**: Guarda automáticamente en `localStorage` cada 30 segundos durante la edición.

### 3. Motor de Audio y Visualizadores
*   **Metrónomo & Playback (Tone.js)**: Permite reproducir la progresión de acordes en bucle sincronizada con el BPM seleccionado. Utiliza por defecto un **Sampler de Guitarra Acústica** con muestras de audio reales.
*   **Rasgueos Animados (`StrumsVisualizer.tsx`)**: Visualizador interactivo de flechas (↓ ↑) que se iluminan al tempo del metrónomo. Los patrones cambian según el género.
*   **Transpositor Inteligente (`[PITCH] // SMART TRANSPOSER`)**: Permite transponer la progresión por semitonos o mediante simulación de capo traste. Integra al visualizador de rasgueos en la parte superior para ahorrar espacio.
*   **Visualizador de Escalas (`ScaleVisualizer.tsx` / Fretboard)**: Muestra un diapasón de guitarra (Fretboard) y la escala activa recomendada para solos.

### 4. Búsqueda de Canciones (`Song Lookup`)
*   **Búsqueda con IA y Web Search**: Permite buscar cualquier canción por título y artista en internet.
*   **Resiliencia y Conectividad**:
    *   Timeout controlado de 10s con `AbortController`.
    *   Reintentos automáticos con retroceso exponencial (max 2).
    *   Advertencia de confianza amarilla si `confidence < 0.7` (`⚠ Acordes aproximados`).
    *   Carga directa al ChordPro Notebook, tonalidad detectada y BPM sugerido.

### 5. Personalización y UX Avanzada
*   **Theme Engine (9 Temas)**: Selector dropdown en el Header que permite alternar entre 9 esquemas de colores (Dark Industrial, Midnight Blue, Forest Studio, Synthwave Neon, Amber Analog, Minimal Light, Blood Red, Slate Pro, Arctic) utilizando variables CSS adaptativas en Tailwind. Soporta previsualización instantánea al pasar el cursor (hover).
*   **Drag & Drop (Reordenamiento de Paneles)**: Implementado usando `@dnd-kit`. Permite reordenar visualmente los módulos arrastrándolos con el cursor o mediante el teclado (soporte ARIA).
*   **Paneles Colapsables (`PanelWrapper.tsx`)**: Cada módulo tiene un botón `[ BYPASS ]` / `[ BYPASSED ]` para colapsar y ocultar el panel. El estado colapsado persiste localmente.
*   **Sistema de Notificaciones (Toasts)**: Cola de notificaciones en la esquina inferior derecha con colores diferenciados para Success (verde), Info (azul), Warning (amarillo) y Error (rojo).
*   **Dashboard de Consumo de Tokens**:
    *   Boton `[ DASHBOARD ]` en el Header.
    *   Visualizador en tiempo real de consumo de tokens (Prompt, Completion y Total) acumulados e individuales por llamada a la API (Chord Generation, Verse Completion, Lyrics y Song Lookup).
*   **Barra de Estado Dinámica**:
    *   **Header status bar**: Muestra el nombre del tema activo y la frecuencia de muestreo de audio real de Tone.js (ej. `44.1 KHZ`).
    *   **Rack status bar (footer)**: Muestra el estado del rack (`READY`, `ACTIVE` con LED verde parpadeante en reproducción, o `GENERATING` cuando hay llamadas a API).

### 6. Persistencia y Exportación
*   **IndexedDB**: Almacenamiento local de sesiones (título, BPM, mood, acordes, capo, letra) a través de la librería `idb`.
*   **Import/Export de Sesión**: Posibilidad de exportar la sesión actual o todo el backup de sesiones como archivos `.acordify.json` o `.acordify-backup.json`.

### 7. Responsividad Móvil (`MobileWorkspace.tsx`)
*   **Vista de Móvil Dedicada**: Layout optimizado para pantallas < 768px.
*   **Estructura del workspace móvil**:
    *   Header simplificado (oculta barra de estado).
    *   Visor principal del ChordPro Notebook en primer plano (con tamaños de fuente agrandados de mínimo 18px para acordes y 16px para letras).
    *   Barra de herramientas inferior y panel "Bottom Drawer" (desplegable) con el resto de módulos para no saturar la pantalla.
    *   Touch targets agrandados (mínimo `44px`).

---

## 🛠️ ¿Qué le falta por hacer / tener? (Roadmap & Futuras Características)

A continuación, se listan las mejoras y funcionalidades que podrían agregarse para llevar Acordify al siguiente nivel:

### 1. Autenticación y Cuentas de Usuario (Prioridad Alta)
*   **Creación de Cuenta / Login**: Implementar un sistema de autenticación (ej. Firebase Auth, Supabase, Auth0) para registrarse e iniciar sesión.
*   **Roles de Administrador**:
    *   Restringir el botón del **Dashboard de Tokens** para que sea visible e interactivo únicamente por administradores autorizados.
*   **Sincronización en la Nube**: Guardar las sesiones en una base de datos en línea (ej. Firestore, PostgreSQL) en lugar de depender únicamente de IndexedDB local, permitiendo acceder a las canciones creadas desde cualquier dispositivo.

### 2. Mejoras del Motor de Audio y Simulación de Instrumentos
*   **Cambio de Presets de Instrumentos**: Actualmente los acordes suenan con una guitarra acústica por defecto. Falta agregar un selector de múltiples timbres en la interfaz (Piano Eléctrico, Sintetizador Retro, Pad Ambiental, Guitarra de Nylon).
*   **Grabación de Audio Real**:
    *   Habilitar un grabador que capture el micrófono o línea del usuario (haciendo real el mock del Header `INPUT: LINE/MIC`).
    *   Guardar y exportar la grabación de audio junto con la sesión.
*   **Exportación MIDI y WAV**: Permitir descargar la progresión generada y rasgueada como archivo MIDI para cargar en un DAW, o como archivo de audio WAV.

### 3. Editor ChordPro Avanzado y Ayuda de IA
*   **Drag & Drop Móvil**: Reactivar el reordenamiento de paneles en dispositivos táctiles de forma amigable (actualmente desactivado por conflictos de scroll).
*   **Diagramas de Acordes Visuales (Voicings)**: Mostrar gráficamente el diagrama de dedos en el diapasón para acordes complejos (ej. `C#min9` o `G13`) cuando se les hace click o hover.
*   **Colaboración en Tiempo Real**: Permitir a múltiples músicos editar la misma letra y progresión en tiempo real (utilizando WebSockets o CRDTs).

### 4. Optimización Web Móvil (PWA)
*   **Soporte Offline Completo (PWA)**: Registrar un Service Worker y un manifiesto web para que la aplicación funcione en modo sin conexión a internet como aplicación nativa instalable en Android e iOS.
*   **Detección de Acordes por Micrófono**: Utilizar algoritmos de procesamiento de audio en el navegador (pitch detection) para que la aplicación "escuche" lo que el usuario toca con su guitarra real e indique si el acorde es correcto.

### 5. Internacionalización (i18n)
*   **Centralización y traducción de textos**: Preparar la aplicación para soportar múltiples idiomas (Español / Inglés) de forma nativa mediante un selector de idioma en el Header.
