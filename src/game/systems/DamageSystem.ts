export type MaterialType = 'wood' | 'stone' | 'metal' | 'glass' | 'tnt';

export class DamageSystem {
  // Material vulnerability tables
  private static MATERIAL_MULTIPLIERS: Record<MaterialType, number> = {
    wood: 1.4,   // Fast destruction, intermediate resistance
    stone: 0.7,  // High resistance, requires heavy projectiles or speed
    metal: 0.35, // Extremely sturdy, ignores light hits
    glass: 3.2,  // Shatters instantly under small weight/contacts
    tnt: 1.0     // Direct trigger multiplier
  };

  /**
   * Calculate direct collision damage based on impulse or velocity and mass.
   * Max speeds or mass values can scale this beautifully.
   */
  public static calculateImpactDamage(
    velocityMag: number,
    projectileMass: number,
    material: MaterialType
  ): number {
    const rawDamage = velocityMag * projectileMass * 16.0;
    const multiplier = this.MATERIAL_MULTIPLIERS[material] || 1.0;
    const finalDamage = Math.round(rawDamage * multiplier);

    // Filter out micro-scratches/vibrations below standard threshold
    if (velocityMag < 0.8) {
      // Very tiny speed, do not inflict damage to avoid vibrating collapse
      return 0;
    }

    return finalDamage;
  }

  /**
   * Calculates explosion splash damage based on distance from the explosion center.
   */
  public static calculateExplosionDamage(
    distance: number,
    maxRadius: number,
    maxDamage: number,
    material: MaterialType
  ): number {
    if (distance > maxRadius) return 0;

    // Linear damage falloff: 100% damage at center, 0% at max radius
    const ratio = (maxRadius - distance) / maxRadius;
    const rawDamage = maxDamage * ratio;
    const multiplier = this.MATERIAL_MULTIPLIERS[material] || 1.0;

    // Metal is slightly more vulnerable to explosive shockwaves
    const finalMul = material === 'metal' ? multiplier * 1.5 : multiplier;

    return Math.round(rawDamage * finalMul);
  }

  /**
   * Determine starting HP values for different materials.
   */
  public static getMaterialMaxHp(material: MaterialType): number {
    switch (material) {
      case 'wood': return 60;
      case 'stone': return 150;
      case 'metal': return 350;
      case 'glass': return 15;
      case 'tnt': return 10;
      default: return 50;
    }
  }

  /**
   * Returns representative color code or text for graphics representation.
   */
  public static getMaterialColor(material: MaterialType): number {
    switch (material) {
      case 'wood': return 0xbc8f8f;   // Sandy Brown / Wood
      case 'stone': return 0x808080;  // Grey Stone
      case 'metal': return 0x708090;  // Slate Grey Metal
      case 'glass': return 0xb0e0e6;  // Powder Blue Glass
      case 'tnt': return 0xd9534f;    // Red TNT
      default: return 0xffffff;
    }
  }
}
