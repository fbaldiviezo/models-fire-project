# Plan de Implementación: Simulador de Propagación de Incendios Forestales

Este plan describe el diseño e implementación de un simulador de propagación de incendios forestales basado en el modelo de Autómatas Celulares. El simulador se creará utilizando Angular (v20) y se renderizará de forma optimizada utilizando un elemento `<canvas>` HTML5.

## Resumen del Proyecto

El simulador constará de dos partes principales:
1. **`FireEngineService` (Lógica Matemática):** Un servicio Angular independiente del DOM que gestionará el estado de la grilla (matriz de $100 \times 100$) y calculará el siguiente "tick" de simulación aplicando las reglas de transición y modificadores ambientales de viento y pendiente utilizando el patrón de "doble búfer".
2. **`FireSimulationComponent` (UI e Interacción):** Un componente Angular que contendrá el canvas para el renderizado nativo en 2D, los controles reactivos en tiempo real (viento, velocidad, pendiente, play/pause, reset) y la gestión del bucle de animación con `requestAnimationFrame`.

---

## Preguntas Abiertas

> [!NOTE]
> Hemos asumido los siguientes detalles del cálculo físico. Si prefieres valores o fórmulas diferentes, por favor indícalo en tu retroalimentación:
> 1. **Fórmula del factor de viento:** Si el vecino en estado 1 (ardiendo) está alineado con la dirección de procedencia del viento (es decir, el viento sopla de este vecino hacia la celda intacta), multiplicaremos la probabilidad por `1 + windSpeed * 0.05` (un incremento de hasta +150% para `windSpeed = 30`).
> 2. **Fórmula del factor de pendiente (slope):** Incrementaremos linealmente la probabilidad general de ignición sumando `slope * 0.002` (añadiendo hasta +12% de probabilidad para un ángulo de `60`).
> 3. **Frecuencia de la animación:** Ofreceremos un control deslizante para ajustar la velocidad de ticks (ticks por segundo) con un rango de 1 a 60 ticks/seg para controlar la velocidad del fuego.

---

## Cambios Propuestos

### Componente de Lógica Matemática: `FireEngineService`

Crearemos un servicio en `src/app/fire-engine.service.ts` para manejar el estado puro y la lógica celular de la grilla.

#### [NEW] [fire-engine.service.ts](file:///c:/Users/fbald/OneDrive/Escritorio/models-fire/src/app/fire-engine.service.ts)
- **Estado de la grilla:** `grid: number[][]` de tamaño ajustable (por defecto $100 \times 100$).
- **Estados de las celdas:**
  - `0`: Intacto (Pastizal/Bosque)
  - `1`: Ardiendo (Foco)
  - `2`: Quemado (Ceniza)
- **Variables de entorno:**
  - `windSpeed`: velocidad del viento (0 a 30)
  - `windDirection`: dirección del viento ('N', 'S', 'E', 'W', 'NW', 'NE', 'SW', 'SE')
  - `slope`: pendiente del terreno (0 a 60)
- **Métodos:**
  - `initializeGrid(width: number, height: number)`: Inicializa la grilla llena de estado `0` (intacto).
  - `calculateNextTick()`: Aplica el doble búfer. Clona la grilla actual a una grilla temporal, recorre cada celda y escribe los nuevos estados en la grilla original (o viceversa) basándose en las siguientes reglas:
    - Si celda actual es `1` (Ardiendo) -> cambia a `2` (Quemado).
    - Si celda actual es `0` (Intacto) -> comprueba sus 8 vecinos. Si al menos uno es `1`, calcula la probabilidad de ignición.
      - Probabilidad base: 10% (`0.10`).
      - Si el vecino ardiente está alineado con la dirección de donde sopla el viento, se multiplica por un factor basado en `windSpeed`.
      - Se incrementa linealmente según el `slope` (pendiente).
      - Si se supera el umbral probabilístico (`Math.random() < prob`), la celda se enciende (`1`).
  - `igniteCell(x: number, y: number)`: Pone una celda específica en estado `1`.
  - `resetGrid()`: Restablece toda la grilla a `0`.

---

### Componente de Interfaz y Renderizado: `FireSimulationComponent`

Crearemos una carpeta `src/app/fire-simulation/` con el componente y sus estilos para un diseño moderno, interactivo y premium.

#### [NEW] [fire-simulation.component.ts](file:///c:/Users/fbald/OneDrive/Escritorio/models-fire/src/app/fire-simulation/fire-simulation.component.ts)
- Contiene la referencia al `<canvas>` usando `@ViewChild`.
- Gestiona el bucle de animación con `requestAnimationFrame`.
- Optimiza el renderizado comparando la matriz previa con la actual y dibujando únicamente las celdas que cambiaron de estado.
- Maneja la interacción de clic en el canvas para convertir las coordenadas del ratón en índices `[x][y]`.
- Enlaza los sliders del viento y pendiente usando `ngModel` de forma reactiva con el servicio.

#### [NEW] [fire-simulation.component.html](file:///c:/Users/fbald/OneDrive/Escritorio/models-fire/src/app/fire-simulation/fire-simulation.component.html)
- Diseñará un tablero (dashboard) elegante y premium con tema oscuro.
- Incluirá controles:
  - Botón Play/Pause con iconos interactivos.
  - Botón Reset y botón "Spark" (para encender focos aleatorios).
  - Slider para velocidad de la simulación (FPS/Ticks por segundo).
  - Slider para `windSpeed` (0 a 30) y `slope` (0 a 60).
  - Selector de dirección del viento en forma de rosa de los vientos interactiva o grid radial.
- Widgets de telemetría:
  - Porcentaje de área intacta, quemada y ardiendo con barras de progreso y colores temáticos.

#### [NEW] [fire-simulation.component.css](file:///c:/Users/fbald/OneDrive/Escritorio/models-fire/src/app/fire-simulation/fire-simulation.component.css)
- Estilos CSS premium sin Tailwind CSS (Vanilla CSS moderno).
- Uso de variables personalizadas (CSS custom properties), sombras, efectos de cristal (glassmorphism), y bordes degradados.
- Transiciones y animaciones suaves para los botones y controles.

---

### Integración en la Aplicación

#### [MODIFY] [app.ts](file:///c:/Users/fbald/OneDrive/Escritorio/models-fire/src/app/app.ts)
- Importará e incluirá `FireSimulationComponent` en el arreglo de imports de la clase.

#### [MODIFY] [app.html](file:///c:/Users/fbald/OneDrive/Escritorio/models-fire/src/app/app.html)
- Reemplazará el contenido marcador de posición por la etiqueta del simulador: `<app-fire-simulation></app-fire-simulation>`.

#### [MODIFY] [app.routes.ts](file:///c:/Users/fbald/OneDrive/Escritorio/models-fire/src/app/app.routes.ts)
- Mantendremos las rutas vacías ya que el componente se integrará directamente como la vista principal de la aplicación.

---

## Plan de Verificación

### Pruebas de Compilación
- Ejecutaremos `npm run build` o `ng build` para asegurar que el TypeScript compile sin errores de tipado o dependencias.

### Verificación Manual
1. **Inicio de Simulación:** Cargar la página y hacer clic en el canvas para plantar un foco de incendio. Presionar "Iniciar" y observar la propagación del fuego.
2. **Influencia del Viento:** Poner velocidad del viento al máximo (30) con dirección "E" (Este). El fuego debe propagarse mucho más rápido hacia el "W" (Oeste).
3. **Influencia de la Pendiente:** Poner pendiente al máximo (60). La velocidad general de propagación debe incrementarse notoriamente en comparación con una pendiente de 0.
4. **Interacción:** Probar pintar focos de incendio haciendo clic y arrastrando el ratón sobre el canvas durante la simulación activa o en pausa.
