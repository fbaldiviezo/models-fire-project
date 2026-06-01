import { 
  Component, 
  OnInit, 
  AfterViewInit, 
  OnDestroy, 
  ViewChild, 
  ElementRef, 
  computed, 
  inject, 
  signal,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FireEngineService, WindDirection } from '../fire-engine.service';

@Component({
  selector: 'app-fire-simulation',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './fire-simulation.component.html',
  styleUrl: './fire-simulation.component.css'
})
export class FireSimulationComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('simulationCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  
  public fireEngine = inject(FireEngineService);
  private platformId = inject(PLATFORM_ID);

  // Simulation speed control
  public ticksPerSecond = signal(12); // Ticks per second (1 to 60)
  
  // Animation state
  public isRunning = signal(false);
  private animationFrameId: number | null = null;
  private lastTickTime = 0;

  // Drawing state on canvas
  private isDrawing = false;

  // Render cache to optimize drawing (double buffer on canvas level)
  private previousGrid: number[][] = [];
  
  // List of wind directions for the UI selector
  public readonly directions: WindDirection[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

  // Computed statistics for display
  public totalCells = computed(() => this.fireEngine.width * this.fireEngine.height);
  
  public stats = computed(() => {
    const grid = this.fireEngine.grid();
    let intact = 0;
    let burning = 0;
    let burnt = 0;

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const val = grid[r][c];
        if (val === 0) intact++;
        else if (val === 1) burning++;
        else if (val === 2) burnt++;
      }
    }

    const total = intact + burning + burnt || 1;
    return {
      intact,
      burning,
      burnt,
      intactPercent: (intact / total) * 100,
      burningPercent: (burning / total) * 100,
      burntPercent: (burnt / total) * 100
    };
  });

  ngOnInit(): void {
    // Make sure service grid is initialized
    if (this.fireEngine.grid().length === 0) {
      this.fireEngine.initializeGrid(100, 100);
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.resizeCanvas();
      this.drawGrid(true); // Force full redraw on init
    }
  }

  ngOnDestroy(): void {
    this.stopSimulation();
  }

  /**
   * Resizes canvas to matching layout container dimensions if needed.
   */
  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    // Set internal canvas coordinate space
    canvas.width = 600;
    canvas.height = 600;
  }

  /**
   * Animation loop driven by requestAnimationFrame
   */
  private animationLoop = (timestamp: number): void => {
    if (!this.isRunning()) return;

    if (!this.lastTickTime) {
      this.lastTickTime = timestamp;
    }

    const elapsed = timestamp - this.lastTickTime;
    const interval = 1000 / this.ticksPerSecond();

    if (elapsed >= interval) {
      this.fireEngine.calculateNextTick();
      this.drawGrid();
      this.lastTickTime = timestamp - (elapsed % interval);
    }

    this.animationFrameId = requestAnimationFrame(this.animationLoop);
  };

  /**
   * Toggle play/pause of the simulation loop.
   */
  public toggleSimulation(): void {
    if (this.isRunning()) {
      this.stopSimulation();
    } else {
      this.startSimulation();
    }
  }

  private startSimulation(): void {
    this.isRunning.set(true);
    this.lastTickTime = 0;
    this.animationFrameId = requestAnimationFrame(this.animationLoop);
  }

  private stopSimulation(): void {
    this.isRunning.set(false);
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Performs exactly one tick manually.
   */
  public stepSimulation(): void {
    this.stopSimulation();
    this.fireEngine.calculateNextTick();
    this.drawGrid();
  }

  /**
   * Clears the grid and resets statistics.
   */
  public resetSimulation(): void {
    this.stopSimulation();
    this.fireEngine.resetGrid();
    this.previousGrid = [];
    this.drawGrid(true);
  }

  /**
   * Randomly ignites 3 to 7 spots on the grid.
   */
  public seedRandomFires(): void {
    const firesCount = Math.floor(Math.random() * 5) + 3; // 3 to 7 fires
    for (let i = 0; i < firesCount; i++) {
      const r = Math.floor(Math.random() * this.fireEngine.height);
      const c = Math.floor(Math.random() * this.fireEngine.width);
      this.fireEngine.igniteCell(r, c);
    }
    this.drawGrid();
  }

  /**
   * Renders the matrix onto the HTML5 Canvas context.
   * Optimizes drawing by drawing only changed cells.
   * @param forceRedraw if true, redraws every single cell regardless of cache.
   */
  public drawGrid(forceRedraw = false): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grid = this.fireEngine.grid();
    if (grid.length === 0) return;

    const cellWidth = canvas.width / this.fireEngine.width;
    const cellHeight = canvas.height / this.fireEngine.height;

    // Standard colors from prompt requirements
    const colors = {
      0: '#4CAF50', // Verde (Intacto)
      1: '#F44336', // Rojo (Ardiendo)
      2: '#212121'  // Gris oscuro (Quemado)
    };

    // If dimensions changed or forceRedraw is requested, reset previousGrid
    if (forceRedraw || this.previousGrid.length !== grid.length || (grid.length > 0 && this.previousGrid[0]?.length !== grid[0].length)) {
      ctx.fillStyle = '#1e1e24'; // Canvas background
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      this.previousGrid = [];
    }

    for (let r = 0; r < this.fireEngine.height; r++) {
      if (!this.previousGrid[r]) {
        this.previousGrid[r] = [];
      }

      for (let c = 0; c < this.fireEngine.width; c++) {
        const val = grid[r][c];
        const prevVal = this.previousGrid[r][c];

        // Draw cell only if value changed or cache is empty
        if (forceRedraw || prevVal === undefined || val !== prevVal) {
          const x = c * cellWidth;
          const y = r * cellHeight;

          // Standard filling
          ctx.fillStyle = colors[val as 0 | 1 | 2] || colors[0];
          
          // Draw cell with a tiny pixel gap to simulate structured grids
          ctx.fillRect(x, y, cellWidth - 0.2, cellHeight - 0.2);

          // Add a subtle bloom glow to burning cells
          if (val === 1) {
            ctx.shadowColor = '#F44336';
            ctx.shadowBlur = 4;
            ctx.fillStyle = '#ff7663'; // slightly brighter core
            ctx.fillRect(x + 0.5, y + 0.5, cellWidth - 1.2, cellHeight - 1.2);
            ctx.shadowBlur = 0; // Reset shadow for other drawings
          }

          // Cache current state
          this.previousGrid[r][c] = val;
        }
      }
    }
  }

  /**
   * Converts mouse click coordinates to matrix indexes and ignites cell.
   */
  public handleCanvasClick(event: MouseEvent): void {
    this.igniteCellFromCoordinates(event);
  }

  /**
   * Tracks mouse movement for drag-to-paint ignition.
   */
  public handleMouseDown(event: MouseEvent): void {
    this.isDrawing = true;
    this.igniteCellFromCoordinates(event);
  }

  public handleMouseMove(event: MouseEvent): void {
    if (this.isDrawing) {
      this.igniteCellFromCoordinates(event);
    }
  }

  public handleMouseUpOrLeave(): void {
    this.isDrawing = false;
  }

  private igniteCellFromCoordinates(event: MouseEvent): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    
    // Scale client mouse coordinates to match canvas coordinate space
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;

    const cellWidth = canvas.width / this.fireEngine.width;
    const cellHeight = canvas.height / this.fireEngine.height;

    const c = Math.floor(x / cellWidth);
    const r = Math.floor(y / cellHeight);

    if (r >= 0 && r < this.fireEngine.height && c >= 0 && c < this.fireEngine.width) {
      this.fireEngine.igniteCell(r, c);
      this.drawGrid();
    }
  }

  /**
   * Interactive handler to change wind direction parameter.
   */
  public selectWindDirection(dir: WindDirection): void {
    this.fireEngine.windDirection.set(dir);
  }
}
