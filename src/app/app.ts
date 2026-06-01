import { Component, signal } from '@angular/core';
import { FireSimulationComponent } from './fire-simulation/fire-simulation.component';

@Component({
  selector: 'app-root',
  imports: [FireSimulationComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('models-fire');
}
