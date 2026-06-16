import { Scene } from "phaser";
import { LEVELS, LevelData, BlockData, EnemyPosition } from "../data/levels";
import { WEAPONS, WeaponData } from "../data/weapons";
import { CHARACTERS, CharacterData } from "../data/characters";
import { DamageSystem, MaterialType } from "../systems/DamageSystem";
import { WindSystem } from "../systems/WindSystem";
import { TrajectorySystem } from "../systems/TrajectorySystem";
import { SaveSystem } from "../systems/SaveSystem";

export class GameScene extends Scene {
  private levelData!: LevelData;
  private windSystem!: WindSystem;

  // State
  private score: number = 0;
  private currentTurnNumber: number = 1;
  private isPlayerTurn: boolean = true;
  private isAiming: boolean = false;
  private blockHealthMap = new Map<any, { hp: number; maxHp: number; material: MaterialType }>();
  private enemyHealthMap = new Map<any, { id: string; hp: number; maxHp: number; name: string }>();

  // Active Physical entities
  private groundBody: any;
  private playerAnchorBody: any; // Invisible anchor
  private activePlayerUnit: any; // Dynamic body represented
  private blockBodies: any[] = [];
  private enemyBodies: any[] = [];
  private activeProjectile: any = null;
  
  // Tactical terrain heights and graphics
  private playerBaseY: number = 500;
  private enemyBaseY: number = 510;
  private waveOffset: number = 0;
  private hazardGraphics!: Phaser.GameObjects.Graphics;
  private terrainGraphics!: Phaser.GameObjects.Graphics;

  // Slingshot drag tracking
  private dragStartPos = { x: 0, y: 0 };
  private currentDragPos = { x: 0, y: 0 };
  
  // Selection
  private selectedCharId: string = "lumi";
  private selectedWeaponId: string = "basic";
  private ammoRemaining: Record<string, number> = {};

  // Trajectory graphics
  private trajectoryGraphics!: Phaser.GameObjects.Graphics;

  // React/HUD connection
  private isPaused: boolean = false;

  // Clouds and keyboard cursors for tactical movement
  private bgClouds: { graphics: Phaser.GameObjects.Graphics; speed: number }[] = [];
  private cursors: any;
  private wasd: any;

  constructor() {
    super({ key: "GameScene" });
  }

  init(data: { levelId: number }) {
    const matched = LEVELS.find(l => l.id === data.levelId);
    // Deep copy matched data to preserve master templates across restarts
    const rawLevel = matched || LEVELS[0];
    this.levelData = JSON.parse(JSON.stringify(rawLevel));
    this.windSystem = new WindSystem(this.levelData.windRange);
    
    // Reset state values
    this.score = 0;
    this.currentTurnNumber = 1;
    this.isPlayerTurn = true;
    this.isAiming = false;
    this.isPaused = false;
    this.blockHealthMap.clear();
    this.enemyHealthMap.clear();
    this.blockBodies = [];
    this.enemyBodies = [];
    this.activeProjectile = null;

    // Load sound configurations and last selections if stored
    const saveData = SaveSystem.load();
    this.selectedCharId = saveData.settings.lastCharacterId || "lumi";
    
    // Validate if current character is available in this stage
    if (!this.levelData.availableCharacters.includes(this.selectedCharId)) {
      this.selectedCharId = this.levelData.availableCharacters[0] || "lumi";
    }

    this.selectedWeaponId = saveData.settings.lastWeaponId || "basic";
    if (!this.levelData.availableWeapons.includes(this.selectedWeaponId)) {
      this.selectedWeaponId = this.levelData.availableWeapons[0] || "basic";
    }

    // Load ammo limits
    this.levelData.availableWeapons.forEach(wId => {
      const wInfo = WEAPONS[wId];
      if (wInfo) {
        this.ammoRemaining[wId] = wInfo.ammoLimit;
      }
    });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Set scale mode
    this.scale.setGameSize(1024, 600);

    // 1. Theme Color Background drawing with vertical gradient
    const skyBg = this.add.graphics();
    let skyTopColor = Phaser.Display.Color.HexStringToColor(this.levelData.themeColor).color;
    let skyBotColor = 0xeefbf4;
    
    // Customize sky gradient based on levels/themes
    if (this.levelData.themeColor === "#eefbe9") { // Grasslands
      skyTopColor = 0xbce5fc; // beautiful morning blue
      skyBotColor = 0xeefbe9;
    } else if (this.levelData.themeColor === "#ffd5c6" || this.levelData.themeColor === "#ffede5") { // Volcano/Sunset
      skyTopColor = 0xfd7e14; // fiery orange
      skyBotColor = 0xffede5;
    } else if (this.levelData.themeColor === "#e5f0f8" || this.levelData.themeColor === "#edf1f2") { // Sky / High grounds
      skyTopColor = 0x4dabf7; // bright blue sky
      skyBotColor = 0xe5f0f8;
    }

    skyBg.fillGradientStyle(skyTopColor, skyTopColor, skyBotColor, skyBotColor, 1);
    skyBg.fillRect(0, 0, width, height);

    // Draw Sun / Celestial Body in the sky
    const sunGraphics = this.add.graphics();
    sunGraphics.setScrollFactor(0.05); // far parallax
    let sunColor = 0xffe066;
    let rayColor = 0xfffae6;
    if (this.levelData.themeColor === "#ffede5") { sunColor = 0xff6b6b; rayColor = 0xffc9c9; } // Volcano blood sun
    
    // Draw sun core
    sunGraphics.fillStyle(sunColor, 1);
    sunGraphics.fillCircle(120, 100, 35);
    // Draw sun glow rings
    sunGraphics.fillStyle(rayColor, 0.25);
    sunGraphics.fillCircle(120, 100, 50);
    sunGraphics.fillStyle(rayColor, 0.1);
    sunGraphics.fillCircle(120, 100, 70);

    // 2. Parallax Mountains and Castle Silhouettes
    const bgGraphics = this.add.graphics();
    bgGraphics.setScrollFactor(0.08); // distant mountain parallax

    // Far Mountain Layer (soft silhouetted lavender-blue)
    bgGraphics.fillStyle(0xd6e4f0, 0.75);
    bgGraphics.beginPath();
    bgGraphics.moveTo(0, height);
    bgGraphics.lineTo(0, 300);
    bgGraphics.lineTo(180, 200);
    bgGraphics.lineTo(340, 320);
    bgGraphics.lineTo(520, 180);
    bgGraphics.lineTo(680, 340);
    bgGraphics.lineTo(840, 220);
    bgGraphics.lineTo(1024, 320);
    bgGraphics.lineTo(1024, height);
    bgGraphics.closePath();
    bgGraphics.fillPath();

    // Middle Mountain Layer with Castle Fortress Architecture Silhouettes
    bgGraphics.fillStyle(0xaabecf, 0.9);
    bgGraphics.beginPath();
    bgGraphics.moveTo(0, height);
    bgGraphics.lineTo(0, 360);
    bgGraphics.lineTo(220, 280);
    // Left Castle Fortress watchtower silhouette:
    bgGraphics.lineTo(220, 210);
    bgGraphics.lineTo(210, 210);
    bgGraphics.lineTo(210, 180);
    bgGraphics.lineTo(225, 180);
    bgGraphics.lineTo(225, 190);
    bgGraphics.lineTo(235, 190);
    bgGraphics.lineTo(235, 180);
    bgGraphics.lineTo(250, 180);
    bgGraphics.lineTo(250, 210);
    bgGraphics.lineTo(240, 210);
    bgGraphics.lineTo(240, 290);
    // Fortress battlements walls trailing:
    bgGraphics.lineTo(330, 300);
    bgGraphics.lineTo(370, 300);
    bgGraphics.lineTo(370, 240); // another fort wall
    bgGraphics.lineTo(400, 240);
    bgGraphics.lineTo(400, 310);
    bgGraphics.lineTo(600, 340);
    // Right castle tower:
    bgGraphics.lineTo(760, 290);
    bgGraphics.lineTo(760, 220);
    bgGraphics.lineTo(780, 220);
    bgGraphics.lineTo(780, 295);
    bgGraphics.lineTo(880, 370);
    bgGraphics.lineTo(1024, 340);
    bgGraphics.lineTo(1024, height);
    bgGraphics.closePath();
    bgGraphics.fillPath();

    // Near Hills Layer (adjust color to match level themes perfectly)
    let hillColor = 0x82b473; // Grasslands default green
    let treeColor = 0x5e8c50; // default dark green trees
    if (this.levelData.themeColor === "#f5f5f7") {
      hillColor = 0x7a8a99; // Industrial grey-teal
      treeColor = 0x566473;
    } else if (this.levelData.themeColor === "#fdf3e7" || this.levelData.themeColor === "#ffd5c6") {
      hillColor = 0xd9a05b; // Sand/desert
      treeColor = 0xa67438;
    } else if (this.levelData.themeColor === "#fdf8ef") {
      hillColor = 0xa68c6d; // Warm brown/retreat
      treeColor = 0x7a634b;
    }
    
    const nearHills = this.add.graphics();
    nearHills.setScrollFactor(0.2); // near terrain parallax
    nearHills.fillStyle(hillColor, 0.98);
    nearHills.beginPath();
    nearHills.moveTo(0, height);
    nearHills.lineTo(0, 470);
    // Scenic geometric multi-segment ridges instead of curves for strong type-safe styling
    nearHills.lineTo(250, 410);
    nearHills.lineTo(500, 455);
    nearHills.lineTo(750, 485);
    nearHills.lineTo(1024, 430);
    nearHills.lineTo(1024, height);
    nearHills.closePath();
    nearHills.fillPath();

    // Draw little stylized pine trees / bushes silhouettes on the near hills
    nearHills.fillStyle(treeColor, 1);
    const treePoints = [100, 160, 340, 420, 580, 720, 850, 930];
    treePoints.forEach(tx => {
      // Calculate height of the hill at x coordinate approx
      let ty = 470;
      if (tx < 500) {
        ty = 450;
      } else {
        ty = 460;
      }
      // Stack triangle visual
      nearHills.fillTriangle(tx, ty - 38, tx - 10, ty - 14, tx + 10, ty - 14);
      nearHills.fillTriangle(tx, ty - 49, tx - 8, ty - 25, tx + 8, ty - 25);
      nearHills.fillRect(tx - 3, ty - 14, 6, 14); // Trunk
    });

    // 3. Dynamic cloud spawning
    this.bgClouds = [];
    for (let i = 0; i < 4; i++) {
      const cx = Phaser.Math.Between(50, 950);
      const cy = Phaser.Math.Between(40, 180);
      const scale = Phaser.Math.FloatBetween(0.8, 1.6);
      const speed = Phaser.Math.FloatBetween(0.08, 0.28);
      
      const cloud = this.add.graphics();
      cloud.fillStyle(0xffffff, 0.82);
      cloud.fillCircle(15, 12, 14);
      cloud.fillCircle(32, 10, 19);
      cloud.fillCircle(49, 12, 14);
      cloud.fillCircle(32, 0, 14);
      
      cloud.setX(cx);
      cloud.setY(cy);
      cloud.setScale(scale);
      cloud.setScrollFactor(0.12); // float parallax
      
      this.bgClouds.push({ graphics: cloud, speed });
    }

    // 4. Calculate heights and spawn procedural tactical terrain
    const charInfo = CHARACTERS[this.selectedCharId] || CHARACTERS.lumi;
    this.playerBaseY = this.levelData.playerStart.y + charInfo.radius;

    // Dynamically calculate the perfect right base cliff height
    let calculatedEnemyBaseY = 510;
    const rightBlocks = this.levelData.blocks.filter(b => b.x > 500);
    if (rightBlocks.length > 0) {
      const bottoms = rightBlocks.map(b => b.y + b.height / 2);
      calculatedEnemyBaseY = Math.max(...bottoms);
    } else {
      const rightEnemies = this.levelData.enemies.filter(e => e.x > 450);
      if (rightEnemies.length > 0) {
        calculatedEnemyBaseY = Math.max(...rightEnemies.map(e => e.y + 18));
      }
    }
    
    // Safety clamp baseY
    this.enemyBaseY = Math.min(calculatedEnemyBaseY, 560);

    // Graphic terrain drawing
    this.terrainGraphics = this.add.graphics();
    const tg = this.terrainGraphics;

    // Choose styling colors based on theme
    let leftGraveCol = 0x8c6239; // Brown dirt
    let leftTopCol = 0x5e8c50;   // Green grass cap
    let rightBaseCol = 0x7a8a99; // Grey castle stone
    let rightTopCol = 0x495057;  // Dark grey top
    
    if (this.levelData.themeColor === "#eefbe9") { // Grasslands
      leftGraveCol = 0x8c6239;
      leftTopCol = 0x5e8c50;
      rightBaseCol = 0x868e96;
      rightTopCol = 0xadb5bd;
    } else if (this.levelData.themeColor === "#ffd5c6" || this.levelData.themeColor === "#ffede5") { // Volcano
      leftGraveCol = 0x2b2d42; // Deep obsidian ash
      leftTopCol = 0xff6b6b;   // Lava fire crust
      rightBaseCol = 0x1d1e2c; // Black volcanic obsidian
      rightTopCol = 0xff922b;  // Flame amber orange
    } else if (this.levelData.themeColor === "#e5f0f8" || this.levelData.themeColor === "#edf1f2") { // Sky / High grounds
      leftGraveCol = 0xaabecf; // Soft high ground lavender
      leftTopCol = 0x74c0fc;   // Ice bright blue cap
      rightBaseCol = 0x495057; // Cloud palace silver
      rightTopCol = 0xdee2e6;  // White marble crown
    } else { // Industrial or generic
      leftGraveCol = 0x495057;
      leftTopCol = 0xaabecf;
      rightBaseCol = 0x343a40;
      rightTopCol = 0xf1f3f5;
    }

    // Choose styling contrast colors for spikes/brick outlines
    let grassBladeCol = 0x406635;
    let gridLineCol = 0x5c636a;
    
    if (this.levelData.themeColor === "#eefbe9") {
      grassBladeCol = 0x406635;
      gridLineCol = 0x5c636a;
    } else if (this.levelData.themeColor === "#ffd5c6" || this.levelData.themeColor === "#ffede5") {
      grassBladeCol = 0xe03131; // molten red spikes
      gridLineCol = 0x090a0f;    // dark borders
    } else if (this.levelData.themeColor === "#e5f0f8" || this.levelData.themeColor === "#edf1f2") {
      grassBladeCol = 0x339af0; // dark frost blue spikes
      gridLineCol = 0x343a40;    // dark stone lines
    }

    // Draw Left Cliff (Player side: x = 0 to 420)
    tg.fillStyle(leftGraveCol, 1);
    tg.fillRect(0, this.playerBaseY, 420, height - this.playerBaseY);
    tg.fillStyle(leftTopCol, 1);
    tg.fillRect(0, this.playerBaseY, 420, 16); // cap
    
    // Tiny grass blades on Player side
    tg.fillStyle(grassBladeCol, 1);
    for (let gx = 15; gx < 410; gx += 30) {
      tg.fillTriangle(gx, this.playerBaseY, gx + 6, this.playerBaseY - 8, gx + 12, this.playerBaseY);
    }

    // Draw Right Cliff (Enemy side: x = 650 to 1024)
    tg.fillStyle(rightBaseCol, 1);
    tg.fillRect(650, this.enemyBaseY, 374, height - this.enemyBaseY);
    tg.fillStyle(rightTopCol, 1);
    tg.fillRect(650, this.enemyBaseY, 374, 16); // cap
    
    // Draw brick outline patterns on right fortress cliff
    tg.lineStyle(2, gridLineCol, 0.5);
    for (let rx = 650; rx <= 1024; rx += 38) {
      tg.lineBetween(rx, this.enemyBaseY + 16, rx, height);
    }
    for (let ry = this.enemyBaseY + 16; ry < height; ry += 32) {
      tg.lineBetween(650, ry, 1024, ry);
    }

    // Create the hazard graphics object
    this.hazardGraphics = this.add.graphics();

    // Connect user keyboard inputs for moving the character
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });

    // Initialize trajectory draw buffer
    this.trajectoryGraphics = this.add.graphics();

    // 2. Setup Matter physics boundaries
    // Ground bed (at the deep valley bottom across the whole width as base, plus left/right static cliffs)
    this.groundBody = this.matter.add.rectangle(width / 2, height - 10, width, 20, {
      isStatic: true,
      label: "ground",
      friction: 0.9,
      restitution: 0.1
    });

    // Static Player Hill platform (strictly physical left platform matching the visual)
    this.matter.add.rectangle(210, this.playerBaseY + (height - this.playerBaseY) / 2, 420, height - this.playerBaseY, {
      isStatic: true,
      label: "ground",
      friction: 0.9,
      restitution: 0.1
    });

    // Static Enemy Hill platform (strictly physical right platform matching the visual)
    this.matter.add.rectangle(837, this.enemyBaseY + (height - this.enemyBaseY) / 2, 374, height - this.enemyBaseY, {
      isStatic: true,
      label: "ground",
      friction: 0.9,
      restitution: 0.1
    });

    // 3. Assemble Fortress Blocks
    this.levelData.blocks.forEach(block => {
      this.spawnBlock(block);
    });

    // 4. Populate Enemy Units
    this.levelData.enemies.forEach(enemy => {
      this.spawnEnemy(enemy);
    });

    // 5. Place Player Character Unit
    this.spawnPlayerAtStart();

    // 6. Setup Collision Handler Loops
    this.setupPhysicsCollisions();

    // 7. Emit HUD update instantly
    this.notifyHUD();

    // Display Stage Title sliding text banner
    const bannerBg = this.add.graphics();
    bannerBg.fillStyle(0x1a375d, 0.85);
    bannerBg.fillRect(0, 180, width, 80);
    
    const bannerText = this.add.text(width / 2, 220, this.levelData.name, {
      fontFamily: '"Space Grotesk", system-ui, sans-serif',
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: [bannerBg, bannerText],
      alpha: 0,
      delay: 2000,
      duration: 500,
      onComplete: () => {
        bannerBg.destroy();
        bannerText.destroy();
      }
    });
  }

  update() {
    // Update animated hazard wave graphics
    this.updateHazardLiquid();

    // Update drifting clouds background parallax
    if (this.bgClouds && this.bgClouds.length > 0) {
      this.bgClouds.forEach(cloudObj => {
        cloudObj.graphics.x += cloudObj.speed;
        if (cloudObj.graphics.x > 1050) {
          cloudObj.graphics.x = -100;
          cloudObj.graphics.y = Phaser.Math.Between(40, 180);
        }
      });
    }

    // Active Keyboard Walking / Movement Adjustments
    if (this.isPlayerTurn && !this.activeProjectile && this.activePlayerUnit) {
      let moveX = 0;
      if (this.cursors && (this.cursors.left.isDown || (this.wasd.left && this.wasd.left.isDown))) {
        moveX = -2;
      } else if (this.cursors && (this.cursors.right.isDown || (this.wasd.right && this.wasd.right.isDown))) {
        moveX = 2;
      }

      if (moveX !== 0) {
        // Move character left or right
        const nextX = Phaser.Math.Clamp(this.activePlayerUnit.x + moveX, 50, 420);
        this.activePlayerUnit.setPosition(nextX, this.activePlayerUnit.y);
        
        // Update anchor coordinates so slingshot dragging or launcher shoot from the new position
        this.levelData.playerStart.x = nextX;
        this.levelData.playerStart.y = this.activePlayerUnit.y;
        if (this.playerAnchorBody) {
          this.matter.body.setPosition(this.playerAnchorBody, { x: nextX, y: this.activePlayerUnit.y });
        }
        
        // Cute bobbing animation when moving
        this.activePlayerUnit.setAngle(Math.sin(this.time.now / 60) * 12);
      } else {
        this.activePlayerUnit.setAngle(0);
      }
    }

    // If projectile is active, monitor its motion limits
    if (this.activeProjectile) {
      const body = this.activeProjectile.body;
      if (body) {
        // Apply micro wind force to projectiles
        const windXForce = this.windSystem.getForceX(body.mass);
        this.matter.body.applyForce(body, body.position, { x: windXForce, y: 0 });

        // Auto follow weapon body
        this.cameras.main.scrollX = Phaser.Math.Clamp(body.position.x - 400, 0, 150);

        // Check if stopped moving, fell off boundaries, or took too long
        const speed = body.speed;
        const outOfBounds = (body.position.x > 1100 || body.position.x < -100 || body.position.y > 620);
        const settled = speed < 0.25;

        // Check if fell into the central hazard wave
        const isSpill = (body.position.x > 420 && body.position.x < 650 && body.position.y > 555);

        if (isSpill) {
          this.spawnSplashEffects(body.position.x, body.position.y);
          this.terminateProjectileTurn();
        } else if (outOfBounds) {
          this.terminateProjectileTurn();
        } else if (settled && this.time.now - (this.activeProjectile as any).spawnTime > 1500) {
          // Slow down slide, then resolve
          this.terminateProjectileTurn();
        } else if (this.time.now - (this.activeProjectile as any).spawnTime > 8000) {
          // Safe timer fallback (e.g. infinite bouncy movement)
          this.terminateProjectileTurn();
        }
      }
    } else {
      // Re-center camera gently
      if (this.cameras.main.scrollX > 0) {
        this.cameras.main.scrollX -= 4;
        if (this.cameras.main.scrollX < 0) this.cameras.main.scrollX = 0;
      }
    }

    // Monitoring dynamic physical blocks falling in hazard lava/liquid pool
    for (let i = this.blockBodies.length - 1; i >= 0; i--) {
      const block = this.blockBodies[i];
      if (block && block.body) {
        const bx = block.x;
        const by = block.y;
        if (bx > 410 && bx < 660 && by > 550) {
          this.spawnSplashEffects(bx, by);
          this.blockHealthMap.delete(block.body);
          this.blockBodies.splice(i, 1);
          block.destroy();
          this.matter.world.remove(block.body);
        }
      }
    }

    // Monitoring enemies falling in hazard lava/liquid pool
    for (let i = this.enemyBodies.length - 1; i >= 0; i--) {
      const enemy = this.enemyBodies[i];
      if (enemy && enemy.body) {
        const ex = enemy.x;
        const ey = enemy.y;
        if (ex > 410 && ex < 660 && ey > 550) {
          this.spawnSplashEffects(ex, ey);
          const record = this.enemyHealthMap.get(enemy.body);
          if (record) {
            record.hp = 0;
            this.destroyEnemy(enemy.body);
          }
        }
      }
    }
  }

  private updateHazardLiquid() {
    if (!this.hazardGraphics) return;
    
    const hg = this.hazardGraphics;
    hg.clear();
    
    const height = this.cameras.main.height;
    
    let hazardColor = 0x339af0; // Default spark water blue
    let alpha = 0.82;
    
    // Set colors based on level theme
    if (this.levelData.themeColor === "#ffd5c6" || this.levelData.themeColor === "#ffede5") {
      hazardColor = 0xe03131; // Lava red
    } else if (this.levelData.themeColor === "#f5f5f7" || this.levelData.themeColor === "#eceef4") {
      hazardColor = 0x0ca678; // Poison green
    }
    
    hg.fillStyle(hazardColor, alpha);
    hg.beginPath();
    hg.moveTo(420, height);
    
    this.waveOffset += 0.08;
    
    // Create animated wave crest inside valley
    for (let x = 420; x <= 650; x += 10) {
      const waveY = 565 + Math.sin((x / 18) + this.waveOffset) * 6;
      hg.lineTo(x, waveY);
    }
    
    hg.lineTo(650, height);
    hg.closePath();
    hg.fillPath();
    
    // Add glowing hazard surface line
    hg.lineStyle(3, 0xffffff, 0.55);
    hg.beginPath();
    for (let x = 420; x <= 650; x += 10) {
      const waveY = 565 + Math.sin((x / 18) + this.waveOffset) * 6;
      if (x === 420) hg.moveTo(x, waveY);
      else hg.lineTo(x, waveY);
    }
    hg.strokePath();
  }

  private spawnSplashEffects(x: number, y: number) {
    let tint = 0x339af0;
    if (this.levelData.themeColor === "#ffd5c6" || this.levelData.themeColor === "#ffede5") {
      tint = 0xff6b6b; // Magma orange-red
    } else if (this.levelData.themeColor === "#f5f5f7" || this.levelData.themeColor === "#eceef4") {
      tint = 0x38d9a9; // Poison slime green
    }

    const emitter = this.add.particles(x, y, 'fire_particle', {
      scale: { start: 1.4, end: 0.1 },
      alpha: { start: 0.9, end: 0 },
      tint: tint,
      speed: { min: 60, max: 180 },
      angle: { min: 230, max: 310 }, // Primary vertical splash direction
      lifespan: { min: 300, max: 700 },
      gravityY: 300,
      maxParticles: 14
    });
    
    this.playBeep(180, 0.15); // watery plunge splash sound!
    this.time.delayedCall(800, () => emitter.destroy());
  }

  // --- Entity Spawning Helper Methods ---

  private spawnBlock(data: BlockData) {
    const maxHp = DamageSystem.getMaterialMaxHp(data.material);
    const density = data.material === 'metal' ? 0.05 : data.material === 'stone' ? 0.03 : 0.015;
    const friction = data.material === 'metal' ? 0.15 : 0.4;
    const restitution = data.material === 'glass' ? 0.1 : data.material === 'wood' ? 0.2 : 0.05;

    // Matter physical rectangle
    const block = this.matter.add.image(data.x, data.y, `block_${data.material}`, undefined, {
      friction,
      restitution,
      density,
      label: `block_${data.material}`
    });

    block.setFriction(friction);
    block.setBounce(restitution);
    block.setDisplaySize(data.width, data.height);

    if (data.rotation) {
      block.setAngle(data.rotation);
    }

    // Keep handle reference
    this.blockBodies.push(block);
    this.blockHealthMap.set(block.body, {
      hp: maxHp,
      maxHp,
      material: data.material
    });
  }

  private spawnEnemy(data: EnemyPosition) {
    const maxHp = data.hp;
    // Slime or enemy capsule
    const enemy = this.matter.add.image(data.x, data.y, 'enemy_standard', undefined, {
      shape: { type: 'circle', radius: 17 },
      density: 0.02,
      friction: 0.6,
      restitution: 0.1,
      label: 'enemy'
    });

    enemy.setDisplaySize(36, 36);

    this.enemyBodies.push(enemy);
    this.enemyHealthMap.set(enemy.body, {
      id: data.id,
      hp: maxHp,
      maxHp,
      name: data.name
    });
  }

  private spawnPlayerAtStart() {
    // If previous exists, destroy it first
    if (this.activePlayerUnit) {
      this.matter.world.remove(this.activePlayerUnit);
      this.activePlayerUnit.destroy();
    }

    const charInfo = CHARACTERS[this.selectedCharId] || CHARACTERS.lumi;
    const sPos = this.levelData.playerStart;

    // Invisible anchor to secure slingshot rubberband representation
    if (!this.playerAnchorBody) {
      this.playerAnchorBody = this.matter.add.circle(sPos.x, sPos.y, 1, { isStatic: true, isSensor: true });
    }

    // Player body
    this.activePlayerUnit = this.add.image(sPos.x, sPos.y, `char_${this.selectedCharId}`);
    this.activePlayerUnit.setDisplaySize(charInfo.radius * 2, charInfo.radius * 2);
    
    // Add Matter body
    this.matter.add.gameObject(this.activePlayerUnit, {
      shape: { type: 'circle', radius: charInfo.radius },
      density: 0.025 * charInfo.weight,
      friction: 0.5,
      restitution: charInfo.elasticity,
      label: 'player'
    });

    // Make player slightly static or lock body position till launch
    this.activePlayerUnit.setStatic(true);
  }

  // --- Game Mechanics Controller Loops ---

  public selectCharacter(charId: string) {
    if (!this.isPlayerTurn || this.activeProjectile) return;
    if (!this.levelData.availableCharacters.includes(charId)) return;

    this.selectedCharId = charId;
    this.spawnPlayerAtStart();
    this.notifyHUD();
  }

  public selectWeapon(weaponId: string) {
    if (!this.isPlayerTurn || this.activeProjectile) return;
    if (!this.levelData.availableWeapons.includes(weaponId)) return;

    this.selectedWeaponId = weaponId;
    this.notifyHUD();
  }

  // Draw dot line prediction matching drag states
  public updateAimingDetails(isDragging: boolean, screenX: number, screenY: number) {
    if (!this.isPlayerTurn || this.activeProjectile) return;

    const limitPower = 20;
    const startX = this.levelData.playerStart.x;
    const startY = this.levelData.playerStart.y;

    if (isDragging) {
      this.isAiming = true;
      // Calculate drag distance
      let dx = startX - screenX;
      let dy = startY - screenY;
      let dist = Math.sqrt(dx * dx + dy * dy);

      // Clamp drag
      if (dist > 120) {
        dist = 120;
        const angle = Math.atan2(dy, dx);
        dx = Math.cos(angle) * 120;
        dy = Math.sin(angle) * 120;
      }

      // Compute initial velocities
      const dragMultiplier = 0.16; // Balance force scale
      const vx = dx * dragMultiplier;
      const vy = dy * dragMultiplier;

      // Physically shift character visual slightly to mimic slingshot rubber stretching!
      this.activePlayerUnit.setPosition(startX - dx, startY - dy);

      // Redraw dots
      this.drawTrajectory(startX, startY, vx, vy);
    } else {
      // Released aim or cancelled
      this.isAiming = false;
      this.activePlayerUnit.setPosition(startX, startY);
      this.trajectoryGraphics.clear();
    }
  }

  private drawTrajectory(sx: number, sy: number, vx: number, vy: number) {
    this.trajectoryGraphics.clear();
    
    // Constant gravity values in Matter
    const gY = 0.40; // Simulated gravity acceleration
    const gX = 0;
    const wX = this.windSystem.getStrength() * 0.006; // Wind force translation

    const points = TrajectorySystem.predict(sx, sy, vx, vy, gX, gY, wX, 35, 1.25);

    // Draw lines/dots
    this.trajectoryGraphics.lineStyle(1.5, 0xadb5bd, 1);
    this.trajectoryGraphics.fillStyle(0xe03131, 0.9); // Highlight red dot at the tip

    points.forEach((pt, i) => {
      if (i % 2 === 0) {
        this.trajectoryGraphics.fillCircle(pt.x, pt.y, 4 - (i * 0.05));
      }
    });

    // Draw visual rubberband string connect!
    this.trajectoryGraphics.lineStyle(3, 0x495057, 0.7);
    this.trajectoryGraphics.lineBetween(this.levelData.playerStart.x, this.levelData.playerStart.y, this.activePlayerUnit.x, this.activePlayerUnit.y);
  }

  /**
   * Launch projectile using slingshot drag values
   */
  public launchSlingshot(dx: number, dy: number) {
    if (!this.isPlayerTurn || this.activeProjectile) return;

    // Check Ammo constraints
    const currentWeapon = WEAPONS[this.selectedWeaponId] || WEAPONS.basic;
    if (this.ammoRemaining[this.selectedWeaponId] !== undefined) {
      if (this.ammoRemaining[this.selectedWeaponId] <= 0) {
        alert("선택한 비축 탄환이 소진되었습니다! 기본 탄환으로 대체 발사됩니다.");
        this.selectedWeaponId = "basic";
      }
      this.ammoRemaining[this.selectedWeaponId]--;
    }

    this.playBeep(260, 0.12);

    // Calculate launching velocity
    const dragMultiplier = 0.16;
    const vx = dx * dragMultiplier;
    const vy = dy * dragMultiplier;

    this.spawnAndLaunchProjectile(vx, vy, false);
  }

  /**
   * Launch projectile using exact retro Angle and Power slider inputs from React HUD
   */
  public launchCannon(angleDeg: number, power: number) {
    if (!this.isPlayerTurn || this.activeProjectile) return;

    // Validate ammo
    if (this.ammoRemaining[this.selectedWeaponId] !== undefined) {
      if (this.ammoRemaining[this.selectedWeaponId] <= 0) {
        alert("장탄이 부족합니다! 기본 탄환을 사용합니다.");
        this.selectedWeaponId = "basic";
      }
      this.ammoRemaining[this.selectedWeaponId]--;
    }

    this.playBeep(290, 0.15);

    // Calculate vectors
    // angle is standard degree: e.g. 45 degrees shoots up-right
    const angleRad = Phaser.Math.DegToRad(angleDeg);
    const speed = power * 0.22; // Scale factor
    
    // Shoot up-right
    const vx = Math.cos(angleRad) * speed;
    const vy = -Math.sin(angleRad) * speed; // Matter standard negative Y goes up

    this.spawnAndLaunchProjectile(vx, vy, false);
  }

  private spawnAndLaunchProjectile(vx: number, vy: number, isEnemyWeapon: boolean) {
    const sPos = isEnemyWeapon ? { x: 800, y: 150 } : this.levelData.playerStart; // Enemy position or player position
    const weaponData = WEAPONS[this.selectedWeaponId] || WEAPONS.basic;
    
    // Create new Matter circle body projectile
    const projColor = isEnemyWeapon ? 0xe03131 : weaponData.color;
    
    // Draw projectile graphics helper sprite on the fly
    const projSpriteKey = isEnemyWeapon ? 'enemy_bullet' : `bullet_${weaponData.id}`;
    if (!this.textures.exists(projSpriteKey)) {
      const g = this.add.graphics();
      g.fillStyle(projColor, 1);
      g.fillCircle(12, 12, 11);
      g.lineStyle(1.5, 0xffffff, 1);
      g.strokeCircle(12, 12, 11);
      g.generateTexture(projSpriteKey, 24, 24);
      g.destroy();
    }

    // Launch!
    const projX = isEnemyWeapon ? (this.enemyBodies[0]?.x || 780) - 40 : sPos.x;
    const projY = isEnemyWeapon ? (this.enemyBodies[0]?.y || 400) - 40 : sPos.y;

    const proj = this.add.image(projX, projY, projSpriteKey);
    this.matter.add.gameObject(proj, {
      shape: { type: 'circle', radius: weaponData.radius },
      density: 0.03 * weaponData.weight,
      friction: 0.1,
      restitution: weaponData.elasticity,
      label: isEnemyWeapon ? 'enemy_projectile' : 'projectile'
    });

    (proj as any).setVelocity(vx, vy);

    // Track spawn metadata for lifetime timeout monitoring
    (proj as any).spawnTime = this.time.now;
    (proj as any).weaponId = isEnemyWeapon ? "basic" : this.selectedWeaponId;
    (proj as any).isEnemy = isEnemyWeapon;

    this.activeProjectile = proj;

    // Lock player selection or reset visual stretch state
    this.activePlayerUnit.setStatic(true);
    this.activePlayerUnit.setPosition(sPos.x, sPos.y);
    this.isAiming = false;
    this.trajectoryGraphics.clear();

    // Spawn visual smoke tail trail emitter behind projectile
    const particles = this.add.particles(0, 0, 'smoke_particle', {
      scale: { start: 1.0, end: 0.1 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 600,
      frequency: 24,
      follow: proj,
      blendMode: 'ADD'
    });
    (proj as any).trailParticles = particles;

    this.notifyHUD();
  }

  // --- Physics Collision Handler ---

  private setupPhysicsCollisions() {
    this.matter.world.on('collisionstart', (event: any) => {
      event.pairs.forEach((pair: any) => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        // Resolve collision details
        const isProjA = (bodyA.label === 'projectile' || bodyA.label === 'enemy_projectile');
        const isProjB = (bodyB.label === 'projectile' || bodyB.label === 'enemy_projectile');

        // Check weapon hit
        if (isProjA || isProjB) {
          const pBody = isProjA ? bodyA : bodyB;
          const otherBody = isProjA ? bodyB : bodyA;
          
          this.handleProjectileImpact(pBody, otherBody);
        } else {
          // Block-to-block or block-to-enemy fall damage collisions!
          this.handleGenericPhysicalImpact(bodyA, bodyB);
        }
      });
    });
  }

  private handleProjectileImpact(pBody: any, otherBody: any) {
    if (!this.activeProjectile) return;

    // Extract dynamic damage metrics
    const velocityMag = pBody.speed || 3.0;
    const wInfo = WEAPONS[(this.activeProjectile as any).weaponId] || WEAPONS.basic;
    
    // 1. Play impact spark sounds
    this.playBeep(350, 0.05);

    // 2. Handle block damage
    if (this.blockHealthMap.has(otherBody)) {
      const record = this.blockHealthMap.get(otherBody)!;
      const dmg = DamageSystem.calculateImpactDamage(velocityMag, wInfo.weight, record.material);
      
      record.hp -= dmg;
      this.score += Math.round(dmg * 1.5);
      
      // Visual damage indicators: change transparency or spawn debris
      if (otherBody.gameObject) {
        otherBody.gameObject.setAlpha(Math.max(0.3, record.hp / record.maxHp));
      }

      this.spawnDebris(otherBody.position.x, otherBody.position.y, record.material, 5);

      if (record.hp <= 0) {
        this.destroyBlock(otherBody);
      }
    }

    // 3. Handle enemy damage
    if (this.enemyHealthMap.has(otherBody)) {
      const record = this.enemyHealthMap.get(otherBody)!;
      const dmg = Math.round(velocityMag * wInfo.weight * 14);
      record.hp -= dmg;
      this.score += dmg * 10;
      
      // Zoom camera momentarily for high-impact cinematic feedback!
      this.cameras.main.shake(100, 0.008);

      // Spawn bloody green sparks
      this.spawnDebris(otherBody.position.x, otherBody.position.y, 'tnt', 8);

      if (record.hp <= 0) {
        this.destroyEnemy(otherBody);
      }
    }

    // 4. Check for special splash ammo explosions (TNT or standard bomb)
    const isEnemy = (this.activeProjectile as any).isEnemy;
    if (wInfo.specialEffect === 'explode' || wInfo.specialEffect === 'gravity' || wInfo.specialEffect === 'fire' || isEnemy) {
      this.executeExplosionAt(pBody.position.x, pBody.position.y, wInfo);
    }

    this.notifyHUD();
  }

  private handleGenericPhysicalImpact(bodyA: any, bodyB: any) {
    // Blocks to block or blocks to enemy toppling damage
    // Based on relative velocities
    const vDiff = Math.abs(bodyA.speed - bodyB.speed);
    if (vDiff < 1.2) return;

    [bodyA, bodyB].forEach((b) => {
      // If it is a block
      if (this.blockHealthMap.has(b)) {
        const record = this.blockHealthMap.get(b)!;
        const dmg = DamageSystem.calculateImpactDamage(vDiff, 1.0, record.material);
        if (dmg > 5) {
          record.hp -= dmg;
          if (b.gameObject) b.gameObject.setAlpha(Math.max(0.3, record.hp / record.maxHp));
          if (record.hp <= 0) this.destroyBlock(b);
        }
      }

      // If it is an enemy
      if (this.enemyHealthMap.has(b)) {
        const record = this.enemyHealthMap.get(b)!;
        const dmg = Math.round(vDiff * 10);
        if (dmg > 5) {
          record.hp -= dmg;
          if (record.hp <= 0) this.destroyEnemy(b);
        }
      }
    });
  }

  private destroyBlock(b: any) {
    if (!this.blockHealthMap.has(b)) return;
    const record = this.blockHealthMap.get(b)!;
    this.score += 200; // Block destruction score bonus

    // Fire explosive chain reaction if it's a TNT box
    if (record.material === 'tnt') {
      this.executeExplosionAt(b.position.x, b.position.y, {
         explosionRadius: 130,
         damage: 150,
         specialEffect: 'explode'
      } as any);
    }

    // Clear and remove physical body
    this.spawnDebris(b.position.x, b.position.y, record.material, 12);
    this.blockHealthMap.delete(b);
    this.blockBodies = this.blockBodies.filter(item => item.body !== b);

    if (b.gameObject) {
      b.gameObject.destroy();
    }
    this.matter.world.remove(b);
  }

  private destroyEnemy(b: any) {
    if (!this.enemyHealthMap.has(b)) return;
    const record = this.enemyHealthMap.get(b)!;
    this.score += 1500; // Massive score bonus

    this.spawnDebris(b.position.x, b.position.y, 'tnt', 16);
    this.enemyHealthMap.delete(b);
    this.enemyBodies = this.enemyBodies.filter(item => item.body !== b);

    if (b.gameObject) {
      b.gameObject.destroy();
    }
    this.matter.world.remove(b);

    this.cameras.main.shake(150, 0.012);
    this.playBeep(120, 0.4);

    this.notifyHUD();
    this.checkGameEndStatus();
  }

  // --- Cascade Explosive Radial Solver ---

  private executeExplosionAt(exX: number, exY: number, weapon: WeaponData) {
    const radius = weapon.explosionRadius || 80;
    const maxDamage = weapon.damage * 1.5;

    // Draw visual explosion burst cloud
    const fireCircles = this.add.graphics();
    fireCircles.fillStyle(weapon.specialEffect === 'gravity' ? 0x7048e8 : 0xff761b, 0.85);
    fireCircles.fillCircle(exX, exY, radius);
    
    this.tweens.add({
      targets: fireCircles,
      alpha: 0,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 350,
      onComplete: () => fireCircles.destroy()
    });

    this.cameras.main.shake(180, 0.018);
    this.playBeep(90, 0.35);

    // Apply radial physical forces to adjacent dynamic blocks & deal splash damage
    this.blockHealthMap.forEach((record, b) => {
      const dx = b.position.x - exX;
      const dy = b.position.y - exY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius) {
        // Calculate explosion damage
        const dmg = DamageSystem.calculateExplosionDamage(dist, radius, maxDamage, record.material);
        record.hp -= dmg;
        this.score += dmg;

        if (b.gameObject) {
          b.gameObject.setAlpha(Math.max(0.3, record.hp / record.maxHp));
        }

        // Apply visual blast pushes
        const pushFactor = (radius - dist) / radius * 0.03;
        const angle = Math.atan2(dy, dx);
        this.matter.body.applyForce(b, b.position, {
          x: Math.cos(angle) * pushFactor * b.mass,
          y: Math.sin(angle) * pushFactor * b.mass - 0.005 // Lift them slightly
        });

        if (record.hp <= 0) {
          // Schedule to delete securely
          this.time.delayedCall(10, () => this.destroyBlock(b));
        }
      }
    });

    // Enemy explosion solves
    this.enemyHealthMap.forEach((record, b) => {
      const dx = b.position.x - exX;
      const dy = b.position.y - exY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius) {
        const ratio = (radius - dist) / radius;
        const dmg = Math.round(maxDamage * ratio * 1.1);
        record.hp -= dmg;
        this.score += dmg * 4;

        const pushFactor = ratio * 0.02;
        const angle = Math.atan2(dy, dx);
        this.matter.body.applyForce(b, b.position, {
          x: Math.cos(angle) * pushFactor * b.mass,
          y: Math.sin(angle) * pushFactor * b.mass - 0.01
        });

        if (record.hp <= 0) {
          this.time.delayedCall(10, () => this.destroyEnemy(b));
        }
      }
    });
  }

  // Visual debris cloud burst particles creator
  private spawnDebris(x: number, y: number, material: MaterialType, qty: number) {
    const col = DamageSystem.getMaterialColor(material);
    const emitter = this.add.particles(x, y, 'fire_particle', {
      scale: { start: 1.2, end: 0.1 },
      alpha: { start: 0.9, end: 0 },
      tint: col,
      speed: { min: 80, max: 240 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 400, max: 1000 },
      gravityY: 400,
      maxParticles: qty
    });
    
    // Auto purge emitter
    this.time.delayedCall(1200, () => emitter.destroy());
  }

  // --- Turn Loop Solvers ---

  private terminateProjectileTurn() {
    if (!this.activeProjectile) return;

    // Purge particles and destroy body
    if ((this.activeProjectile as any).trailParticles) {
      (this.activeProjectile as any).trailParticles.destroy();
    }
    
    this.activeProjectile.destroy();
    this.activeProjectile = null;

    // Direct solver checks if level resolves
    const finished = this.checkGameEndStatus();
    if (finished) return;

    // Check if the current turn was a player turn
    if (this.isPlayerTurn) {
      // Player turn completed, now trigger Enemy AI turn!
      this.isPlayerTurn = false;
      this.notifyHUD();

      // Simple AI action latency delay
      this.time.delayedCall(1600, () => {
        this.executeEnemyCombatDecision();
      });
    } else {
      // Enemy turn completed, return crown to player and consume standard turn index
      this.currentTurnNumber++;
      this.isPlayerTurn = true;
      
      // Shuffle wind direction vector
      this.windSystem.randomize();
      this.spawnPlayerAtStart();
      this.notifyHUD();

      if (this.currentTurnNumber > this.levelData.maxTurns) {
        this.triggerGameResult(false);
      }
    }
  }

  private executeEnemyCombatDecision() {
    // If all enemies are dead prior to choice
    if (this.enemyBodies.length === 0) {
      this.isPlayerTurn = true;
      this.currentTurnNumber++;
      this.notifyHUD();
      return;
    }

    // Informing user: floating text alert banner
    const alertText = this.add.text(512, 100, '⚠️ 적 요새의 반격 사격! (ENEMY FIRE)', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#e03131',
      backgroundColor: '#fff0f0',
      padding: { x: 16, y: 8 }
    }).setOrigin(0.5);

    this.tweens.add({
      targets: alertText,
      alpha: 1,
      yoyo: true,
      hold: 800,
      duration: 300,
      onComplete: () => alertText.destroy()
    });

    // Select randomly from alive enemies
    const shootingEnemyBody = this.enemyBodies[0]; // Standard bottom slimes
    if (!shootingEnemyBody) {
      this.isPlayerTurn = true;
      this.currentTurnNumber++;
      this.notifyHUD();
      return;
    }

    // Aim calculations targeting player starting zone
    const targetX = this.levelData.playerStart.x;
    const targetY = this.levelData.playerStart.y;
    const selfX = shootingEnemyBody.x;
    const selfY = shootingEnemyBody.y;

    // Basic artillery aiming: ballistic offset
    const dx = targetX - selfX;
    const dy = targetY - selfY - 80; // Aim with moderate arch

    // Enemy AI accuracy factor determined by Level difficulty
    // Level 1-3: very inaccurate. Level 10-12: highly accurate!
    const accuracyNoise = (4 - Math.min(3, Math.floor(this.levelData.id / 3))) * 25;
    const rdx = dx + (Math.random() * 2 - 1) * accuracyNoise;
    const rdy = dy + (Math.random() * 2 - 1) * accuracyNoise;

    // Apply wind adjustment mitigation: Smart enemies adjust slightly to strong winds
    const windEffect = this.windSystem.getStrength() * 4.5;
    const finalDx = rdx - windEffect; 

    // Convert spacing vector into launch impulse speed
    const scaleFactor = 0.045;
    const vx = finalDx * scaleFactor;
    const vy = rdy * scaleFactor;

    this.time.delayedCall(400, () => {
      this.spawnAndLaunchProjectile(vx, vy, true);
    });
  }

  private checkGameEndStatus(): boolean {
    if (this.enemyBodies.length === 0) {
      // ALL ENEMIES SLAIN! WIN TRIGGER!
      this.triggerGameResult(true);
      return true;
    }
    return false;
  }

  private triggerGameResult(isWin: boolean) {
    let stars = 0;
    if (isWin) {
      // Calculate star count based on remaining turns compared to golden stars conditions config
      const turnsRemaining = this.levelData.maxTurns - this.currentTurnNumber + 1;
      const cond = this.levelData.starConditions;
      if (turnsRemaining >= cond.threeStars) {
        stars = 3;
      } else if (turnsRemaining >= cond.twoStars) {
        stars = 2;
      } else {
        stars = 1;
      }

      // Record state progress
      SaveSystem.saveLevelResult(this.levelData.id, this.score, stars);
    }

    // Boot Result scene with visual context payloads after a short delay
    this.time.delayedCall(1000, () => {
      this.scene.start("ResultScene", {
        levelId: this.levelData.id,
        status: isWin ? "win" : "lose",
        score: this.score,
        stars,
        turnsUsed: this.currentTurnNumber
      });
    });
  }

  // --- React UI Integration Event emitters ---

  private notifyHUD() {
    // Generate active listing of current available weapons and characters
    const hudState = {
      levelId: this.levelData.id,
      levelName: this.levelData.name,
      theme: this.levelData.theme,
      maxTurns: this.levelData.maxTurns,
      currentTurn: this.currentTurnNumber,
      isPlayerTurn: this.isPlayerTurn,
      score: this.score,
      wind: this.windSystem.getState(),
      selectedCharId: this.selectedCharId,
      selectedWeaponId: this.selectedWeaponId,
      availableChars: this.levelData.availableCharacters.map(id => CHARACTERS[id]),
      availableWeapons: this.levelData.availableWeapons.map(id => WEAPONS[id]),
      ammoRemaining: this.ammoRemaining,
      enemiesLeft: this.enemyBodies.length,
      enemiesTotal: this.levelData.enemies.length,
      // Pass player and first enemy health percentage
      playerHp: this.activePlayerUnit ? 100 : 0, 
      activeProjectileActive: this.activeProjectile !== null
    };

    // Broadcast through game global emitter safely
    this.game.events.emit("hud_update", hudState);
  }

  private playBeep(freq: number, duration: number) {
    const state = SaveSystem.load();
    if (!state.settings.soundOn) return;

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio context might be blocked
    }
  }
}
