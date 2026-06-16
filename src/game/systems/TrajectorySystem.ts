export interface Point2D {
  x: number;
  y: number;
}

export class TrajectorySystem {
  /**
   * Predict coordinate steps of a physical projectile.
   * Assumes basic Matter.js movement with constant wind force and standard gravity.
   */
  public static predict(
    startX: number,
    startY: number,
    vx: number,         // Initial horizontal velocity
    vy: number,         // Initial vertical velocity
    gravityX: number,   // Gravity on X (usually 0)
    gravityY: number,   // Gravity on Y (standard, e.g. 0.001)
    windForceX: number, // Wind acceleration per step
    stepsCount: number = 30,
    timeDelta: number = 1.0
  ): Point2D[] {
    const points: Point2D[] = [];
    
    let currentX = startX;
    let currentY = startY;
    let currentVx = vx;
    let currentVy = vy;

    // Simulate step by step
    for (let i = 0; i < stepsCount; i++) {
      points.push({ x: currentX, y: currentY });

      // Apply accelerations
      currentVx += (gravityX + windForceX) * timeDelta;
      currentVy += gravityY * timeDelta;

      // Update positions
      currentX += currentVx * timeDelta;
      currentY += currentVy * timeDelta;

      // Stop predicting if we hit the ground limit to keep graphics clean
      if (currentY > 580) {
        points.push({ x: currentX, y: 580 });
        break;
      }
    }

    return points;
  }
}
