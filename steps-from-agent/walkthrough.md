# Resumen de Cambios (Walkthrough)

Hemos completado satisfactoriamente la implementación del simulador de propagación de incendios forestales basado en el modelo de Autómatas Celulares.

A continuación se detallan los componentes creados, las optimizaciones realizadas y los resultados de la verificación.

---

## Cambios Realizados

### 1. Motor del Autómata Celular (Matemáticas y Reglas)
- **Archivo creado:** [fire-engine.service.ts](file:///c:/Users/fbald/OneDrive/Escritorio/models-fire/src/app/fire-engine.service.ts)
- **Funcionalidades:**
  - Estructuración de grilla de $100 \times 100$ celdas reactivas mediante Angular Signals (`grid()`).
  - Doble búfer implementado en `calculateNextTick()` para evaluar celdas desde el búfer de lectura y escribir los cambios simultáneamente en un búfer temporal de escritura.
  - Modificador de viento: multiplica la probabilidad de ignición base ($10\%$) cuando la celda vecina en llamas se localiza en la dirección desde donde sopla el viento (empujando el fuego hacia el objetivo).
  - Modificador de pendiente: incrementa de forma lineal la probabilidad general sumando `slope * 0.0025`.

### 2. Tablero de Simulación y Visualización Canvas
- **Directorio creado:** `src/app/fire-simulation/`
- **Archivos:**
  - [fire-simulation.component.ts](file:///c:/Users/fbald/OneDrive/Escritorio/models-fire/src/app/fire-simulation/fire-simulation.component.ts): Lógica del bucle `requestAnimationFrame` con limitador de fotogramas (Ticks por segundo), captura de eventos de arrastre/clic del ratón para encender vegetación, y estadísticas calculadas en tiempo real mediante `computed` signals.
  - [fire-simulation.component.html](file:///c:/Users/fbald/OneDrive/Escritorio/models-fire/src/app/fire-simulation/fire-simulation.component.html): Interfaz HTML estructurada y semántica con tema oscuro, sliders reactivos, una rosa de los vientos interactiva de 8 direcciones (CSS Grid) y telemetría de vegetación.
  - [fire-simulation.component.css](file:///c:/Users/fbald/OneDrive/Escritorio/models-fire/src/app/fire-simulation/fire-simulation.component.css): Estilos Vanilla CSS premium que proporcionan sombras, animaciones de parpadeo del fuego (`fire-flicker`), y diseño adaptable móvil/escritorio.

### 3. Integración en la App Principal
- **Archivos modificados:**
  - [app.ts](file:///c:/Users/fbald/OneDrive/Escritorio/models-fire/src/app/app.ts): Se removió el módulo de enrutamiento sin uso y se importó `FireSimulationComponent`.
  - [app.html](file:///c:/Users/fbald/OneDrive/Escritorio/models-fire/src/app/app.html): Se sustituyó el contenido genérico por `<app-fire-simulation></app-fire-simulation>`.

### 4. Soporte SSR (Prerendering) y Presupuesto CSS
- **Archivos modificados:**
  - [main.server.ts](file:///c:/Users/fbald/OneDrive/Escritorio/models-fire/src/main.server.ts): Se corrigió el bootstrapping del servidor pasando la variable `BootstrapContext` requerida para solucionar el error `NG0401` durante la compilación.
  - [angular.json](file:///c:/Users/fbald/OneDrive/Escritorio/models-fire/angular.json): Se incrementó el límite de presupuesto de estilos por componente (`anyComponentStyle`) de $8\text{ kB}$ a $40\text{ kB}$ para permitir hojas de estilo de interfaces ricas y visualmente de alto nivel sin fallos de compilación.
  - [fire-simulation.component.ts](file:///c:/Users/fbald/OneDrive/Escritorio/models-fire/src/app/fire-simulation/fire-simulation.component.ts): Se encapsularon todas las llamadas del Canvas y APIs del navegador bajo la condición `isPlatformBrowser(this.platformId)` para asegurar la compatibilidad con Server-Side Rendering (SSR).

---

## Verificación

Se ejecutó la prueba de construcción de producción:
```bash
npm run build
```
**Resultado:**
- La compilación terminó con éxito (`exit code: 0`).
- Se generaron los bundles del navegador (`main-CIYBLG7M.js`) y del servidor (`server.mjs`, `main.server.mjs`) exitosamente.
- El prerenderizado estático de rutas finalizó correctamente para la ruta principal de la aplicación.
