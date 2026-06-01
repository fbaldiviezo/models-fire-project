import { Injectable, signal, WritableSignal } from '@angular/core';

export type WindDirection = 'N' | 'S' | 'E' | 'W' | 'NW' | 'NE' | 'SW' | 'SE';

@Injectable({
  providedIn: 'root'
})
export class FireEngineService {
  // Grid properties
  public width = 100;
  public height = 100;
  
  // Writable signals for state and environment parameters
  // Allows easy reactiveness in the UI
  public grid: WritableSignal<number[][]> = signal([]);
  public windSpeed: WritableSignal<number> = signal(10); // 0 to 30
  public windDirection: WritableSignal<WindDirection> = signal('SE');
  public slope: WritableSignal<number> = signal(15); // 0 to 60

  constructor() {
    this.initializeGrid();
  }

  /**
   * Initializes the grid with all cells in state 0 (Intact/Pastizal).
   */
  public initializeGrid(width: number = 100, height: number = 100): void {
    this.width = width;
    this.height = height;
    const newGrid: number[][] = [];
    for (let r = 0; r < height; r++) {
      newGrid.push(new Array(width).fill(0));
    }
    this.grid.set(newGrid);
  }

  /**
   * Ignites a specific cell on the grid (sets state to 1).
   */
  public igniteCell(r: number, c: number): void {
    if (r >= 0 && r < this.height && c >= 0 && c < this.width) {
      this.grid.update(currentGrid => {
        const nextGrid = currentGrid.map(row => [...row]);
        nextGrid[r][c] = 1;
        return nextGrid;
      });
    }
  }

  /**
   * Resets the simulation to the initial intact state.
   */
  public resetGrid(): void {
    this.initializeGrid(this.width, this.height);
  }

  /**
   * Helper to map relative neighbor direction coordinates to string.
   * dr is the row offset (nr - r), dc is the col offset (nc - c).
   */
  private getDirectionString(dr: number, dc: number): string {
    if (dr === -1 && dc === 0) return 'N';
    if (dr === 1 && dc === 0) return 'S';
    if (dr === 0 && dc === 1) return 'E';
    if (dr === 0 && dc === -1) return 'W';
    if (dr === -1 && dc === -1) return 'NW';
    if (dr === -1 && dc === 1) return 'NE';
    if (dr === 1 && dc === -1) return 'SW';
    if (dr === 1 && dc === 1) return 'SE';
    return '';
  }

  /**
   * Performs one tick of the simulation.
   * Uses double buffering: evaluates from current state, writes to a new matrix,
   * then updates the grid state.
   */
  public calculateNextTick(): void {
    const current = this.grid();
    if (current.length === 0) return;

    // Create double buffer (a new matrix populated with current states)
    const nextGrid = current.map(row => [...row]);

    const speed = this.windSpeed();
    const direction = this.windDirection();
    const sl = this.slope();

    // Iterate through all cells
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        const state = current[r][c];

        if (state === 1) {
          // Rule 1: A burning cell (1) transitions to burnt/ash (2) in the next step
          nextGrid[r][c] = 2;
        } else if (state === 0) {
          // Rule 2: An intact cell (0) can ignite if at least one neighbor is burning (1)
          let hasBurningNeighbor = false;
          let isAlignedWithWind = false;

          // Check 8 neighbors
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;

              const nr = r + dr;
              const nc = c + dc;

              // Boundary check
              if (nr >= 0 && nr < this.height && nc >= 0 && nc < this.width) {
                if (current[nr][nc] === 1) {
                  hasBurningNeighbor = true;
                  
                  // Check if the burning neighbor is in the wind direction relative to target
                  // e.g., if wind is SE, a neighbor at SE (dr=1, dc=1) is in opposite direction to push (NW),
                  // meaning wind blows from neighbor to target.
                  const relativeDir = this.getDirectionString(dr, dc);
                  if (relativeDir === direction) {
                    isAlignedWithWind = true;
                  }
                }
              }
            }
          }

          if (hasBurningNeighbor) {
            // Base ignition probability of 10%
            let probability = 0.10;

            // Wind modifier: if burning neighbor is opposite to wind direction,
            // multiply the probability by a factor based on wind speed.
            // e.g. factor = 1 + windSpeed * 0.05
            if (isAlignedWithWind) {
              probability *= (1.0 + speed * 0.08);
            }

            // Slope modifier: linearly increase probability by slope
            // e.g. +0.0025 per degree of slope (max 60 -> +0.15)
            probability += sl * 0.0025;

            // Clamp probability between 0 and 1
            probability = Math.min(1.0, Math.max(0.0, probability));

            // Probability roll
            if (Math.random() < probability) {
              nextGrid[r][c] = 1;
            }
          }
        }
      }
    }

    // Set the new state to grid (triggers bindings)
    this.grid.set(nextGrid);
  }
}
