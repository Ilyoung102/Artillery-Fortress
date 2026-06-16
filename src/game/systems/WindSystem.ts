export interface WindState {
  currentStrength: number; // -1 to 1 (negative is left, positive is right)
  displayValue: number;    // Absolute wind reading for display
  direction: 'left' | 'right' | 'calm';
}

export class WindSystem {
  private maxRange: number;
  private strength: number = 0; // Current wind force in pixels/sec^2 or Matter force force multipliers

  constructor(maxRange: number) {
    this.maxRange = maxRange;
    this.randomize();
  }

  public randomize(): WindState {
    if (this.maxRange === 0) {
      this.strength = 0;
      return this.getState();
    }
    
    // Choose a random wind value
    // E.g. max range 20 gives a float between -20 and +20
    const val = (Math.random() * 2 - 1) * this.maxRange;
    this.strength = Math.round(val * 10) / 10; // Round to 1 decimal place
    return this.getState();
  }

  public setMaxRange(range: number) {
    this.maxRange = range;
    this.randomize();
  }

  public getStrength(): number {
    return this.strength;
  }

  public getState(): WindState {
    if (Math.abs(this.strength) < 0.5) {
      return {
        currentStrength: 0,
        displayValue: 0,
        direction: 'calm'
      };
    }
    return {
      currentStrength: this.strength / (this.maxRange || 1),
      displayValue: Math.abs(this.strength),
      direction: this.strength < 0 ? 'left' : 'right'
    };
  }

  /**
   * Apply physics wind force to a Matter.js body.
   * X force to be applied during the update loop.
   */
  public getForceX(bodyMass: number): number {
    // scale factor so that the force is balanced and playable
    // Typically wind force should be proportional to body mass (or a constant acceleration independent of mass)
    const ACCEL_FACTOR = 0.00015; 
    return this.strength * ACCEL_FACTOR * bodyMass;
  }
}
