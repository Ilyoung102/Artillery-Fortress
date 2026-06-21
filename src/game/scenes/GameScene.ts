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
  private blockHealthMap = new Map<any, { id?: string; hp: number; maxHp: number; material: MaterialType }>();
  private enemyHealthMap = new Map<any, { id: string; hp: number; maxHp: number; name: string }>();

  // Active Physical entities
  private groundBody: any;
  private playerAnchorBody: any; // Invisible anchor
  private activePlayerUnit: any; // Dynamic body represented
  private blockBodies: any[] = [];
  private enemyBodies: any[] = [];
  private activeProjectile: any = null;
  private activeProjectiles: any[] = [];
  
  // Tactical terrain heights and graphics
  private playerBaseY: number = 500;
  private enemyBaseY: number = 510;
  private waveOffset: number = 0;
  private hazardGraphics!: Phaser.GameObjects.Graphics;
  private terrainGraphics!: Phaser.GameObjects.Graphics;
  
  // Custom stage geometries and craters
  private craters: { x: number; y: number; radius: number }[] = [];
  private hasMiddleHill1: boolean = false;
  private hasMiddleHill2: boolean = false;
  private movingBackWalls: Array<{ body: any; startY: number; range: number; speed: number; angle: number }> = [];

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
  private isGameEnded: boolean = false;
  private isMidAirActionSpent: boolean = false;
  private shieldUsesLeft: number = 3;

  // Clouds and keyboard cursors for tactical movement
  private bgClouds: { graphics: Phaser.GameObjects.Graphics; speed: number }[] = [];
  private cursors: any;
  private wasd: any;

  // Real Player Health tracker (More than doubled for robust, satisfying fortress durability!)
  private playerMaxHp: number = 1300;
  private playerHp: number = 1300;
  private sceneStartTime: number = 0;

  // Physical Debris list
  private physicalDebrisList: any[] = [];
  private healthBarGraphics!: Phaser.GameObjects.Graphics;

  // Sound Engine tracking states
  private audioCtx: AudioContext | null = null;
  private activeFlyOscillator: OscillatorNode | null = null;
  private activeFlyGain: GainNode | null = null;
  private aimOscillator: OscillatorNode | null = null;
  private aimGain: GainNode | null = null;

  constructor() {
    super({ key: "GameScene" });
  }

  init(data: { levelId: number }) {
    const matched = LEVELS.find(l => l.id === data.levelId);
    // Deep copy matched data to preserve master templates across restarts
    const rawLevel = matched || LEVELS[0];
    this.levelData = JSON.parse(JSON.stringify(rawLevel));
    
    // Dynamically inject custom cool weapons to ensure amazing tactical flexibility across all levels!
    const defaultWeapons = ["basic", "bomb", "split", "pierce", "bouncy", "gravity", "fire", "arrow", "drop_straight", "skydrop", "megabomb"];
    if (this.levelData.id === 1) {
      this.levelData.availableWeapons = ["basic", "arrow"];
    } else {
      this.levelData.availableWeapons = defaultWeapons;
    }

    this.windSystem = new WindSystem(this.levelData.windRange);
    
    // Reset state values
    this.score = 0;
    this.currentTurnNumber = 1;
    this.isPlayerTurn = true;
    this.isAiming = false;
    this.isPaused = false;
    this.isGameEnded = false;
    this.shieldUsesLeft = 3;
    this.activeProjectiles = [];
    this.blockHealthMap.clear();
    this.enemyHealthMap.clear();
    this.blockBodies = [];
    this.enemyBodies = [];
    this.activeProjectile = null;
    this.craters = [];
    this.movingBackWalls = [];

    // Real Player HP Reset (More than doubled from 600 to 1300!)
    this.playerMaxHp = 1300;
    this.playerHp = 1300;
    this.physicalDebrisList = [];

    // Make sure we stop leftover audio loops
    this.stopFlySound();
    this.stopAimCharge();

    const levelId = this.levelData.id;
    // Determine middle hill presence based on level config
    this.hasMiddleHill1 = (levelId % 2 === 1 && levelId >= 3);
    this.hasMiddleHill2 = (levelId % 3 === 0);

    // Completely clear existing template blocks to simplify as requested!
    this.levelData.blocks = [];

    // 1. Center Blocks Pile ("중앙 2-3개")
    const centerMat = levelId <= 4 ? "wood" : (levelId <= 8 ? "stone" : "metal");
    this.levelData.blocks.push({
      id: "center_middle",
      x: 500,
      y: 470,
      width: 48,
      height: 90,
      material: centerMat as any,
      shape: "box"
    });
    this.levelData.blocks.push({
      id: "center_left",
      x: 440,
      y: 495,
      width: 32,
      height: 40,
      material: "wood",
      shape: "box"
    });
    this.levelData.blocks.push({
      id: "center_right",
      x: 560,
      y: 495,
      width: 32,
      height: 40,
      material: "wood",
      shape: "box"
    });

    // 2. Hanging Horizontals & Falling Stones Above Ally ("아군 위 허공 가로 벽돌 1-2개 & 그 위 돌")
    const pStart = this.levelData.playerStart || { x: 180, y: 480 };
    const allyPlankCount = levelId >= 6 ? 2 : 1;
    for (let i = 0; i < allyPlankCount; i++) {
      const plankY = 320 - (i * 45);
      // Floating static platform brick
      this.levelData.blocks.push({
        id: `ally_plank_${i}`,
        x: pStart.x + 35,
        y: plankY,
        width: 100,
        height: 16,
        material: "wood",
        shape: "box",
        isStatic: true // Floating static suspended block!
      } as any);

      // Free-falling stone on top
      this.levelData.blocks.push({
        id: `ally_stone_${i}`,
        x: pStart.x + 35,
        y: plankY - 24,
        width: 28,
        height: 28,
        material: "stone",
        shape: "box"
      });
    }

    // 3. Hanging Horizontals & Falling Stones Above Enemies ("적군 위 허공 가로 벽돌 1-2개 & 그 위 돌")
    this.levelData.enemies.forEach((enemy, idx) => {
      if (idx > 1) return; // Prevent excessive chaos
      const enemyPlankCount = levelId >= 5 ? 2 : 1;
      for (let i = 0; i < enemyPlankCount; i++) {
        const plankY = 320 - (i * 45);
        // Floating static platform brick
        this.levelData.blocks.push({
          id: `enemy_plank_${idx}_${i}`,
          x: enemy.x,
          y: plankY,
          width: 90,
          height: 16,
          material: "wood",
          shape: "box",
          isStatic: true // Floating static suspended block!
        } as any);

        // Free-falling stone on top
        this.levelData.blocks.push({
          id: `enemy_stone_${idx}_${i}`,
          x: enemy.x,
          y: plankY - 24,
          width: 28,
          height: 28,
          material: "stone",
          shape: "box"
        });
      }
    });

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
    // Force dismiss overlay modals upon game start
    this.game.events.emit("scene_change", "GameScene");

    this.sceneStartTime = this.time.now;
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
    } else if (this.levelData.themeColor === "#e6f8f5") { // Greenhouse
      skyTopColor = 0x0c8599; // Emerald cyan
      skyBotColor = 0xe6f8f5;
    } else if (this.levelData.themeColor === "#f5f5f7") { // Factory Industrial
      skyTopColor = 0xb0b5bc; // smoggy gray
      skyBotColor = 0xf5f5f7;
    } else if (this.levelData.themeColor === "#fbf3db" || this.levelData.themeColor === "#fdf3e7") { // Desert
      skyTopColor = 0xfaad14; // deep sand amber
      skyBotColor = 0xfdf3e7;
    } else if (this.levelData.themeColor === "#fdf8ef") { // Retreat
      skyTopColor = 0xd8c29d; // sunset caramel
      skyBotColor = 0xfdf8ef;
    } else if (this.levelData.themeColor === "#fdfbff" || this.levelData.themeColor === "#f6f3fc") { // Cyber/Marble
      skyTopColor = 0x845ef7; // deep nebula violet
      skyBotColor = 0xf6f3fc;
    }

    skyBg.fillGradientStyle(skyTopColor, skyTopColor, skyBotColor, skyBotColor, 1);
    skyBg.fillRect(0, 0, width, height);

    // Draw Sun / Celestial Body in the sky
    const sunGraphics = this.add.graphics();
    sunGraphics.setScrollFactor(0.05); // far parallax
    let sunColor = 0xffe066;
    let rayColor = 0xfffae6;
    let isMoon = false;

    if (this.levelData.themeColor === "#ffd5c6" || this.levelData.themeColor === "#ffede5") { 
      sunColor = 0xe03131; // Volcano bloody deep red sun
      rayColor = 0xffc9c9; 
    } else if (this.levelData.themeColor === "#f6f3fc" || this.levelData.themeColor === "#fdfbff") {
      sunColor = 0xffd23f; // Cyber crescent moon
      rayColor = 0xf3d9fa;
      isMoon = true;
    } else if (this.levelData.themeColor === "#e5f0f8" || this.levelData.themeColor === "#edf1f2") {
      sunColor = 0xf8f9fa; // Pearl sky moon
      rayColor = 0xe9ecef;
      isMoon = true;
    }
    
    sunGraphics.fillStyle(sunColor, 1);
    if (isMoon) {
      // Draw crescent moon
      sunGraphics.fillCircle(120, 100, 32);
      sunGraphics.fillStyle(skyTopColor, 1);
      sunGraphics.fillCircle(136, 92, 28);
    } else {
      sunGraphics.fillCircle(120, 100, 35);
    }
    // Draw celestial glow rings
    sunGraphics.fillStyle(rayColor, 0.22);
    sunGraphics.fillCircle(120, 100, 48);
    sunGraphics.fillStyle(rayColor, 0.08);
    sunGraphics.fillCircle(120, 100, 68);

    // 2. Parallax Mountains and Castle Silhouettes
    const bgGraphics = this.add.graphics();
    bgGraphics.setScrollFactor(0.08); // distant mountain parallax

    // Far Mountain Layer (soft silhouetted lavender-blue/purple depending on level themes)
    let mountainFarColor = 0xd6e4f0;
    let mountainMidColor = 0xaabecf;
    if (this.levelData.themeColor === "#f5f5f7") {
      mountainFarColor = 0xb2bdc6;
      mountainMidColor = 0x8a9ba8;
    } else if (this.levelData.themeColor === "#ffd5c6" || this.levelData.themeColor === "#ffede5") {
      mountainFarColor = 0x803e3d;
      mountainMidColor = 0x4f121b;
    } else if (this.levelData.themeColor === "#f6f3fc" || this.levelData.themeColor === "#fdfbff") {
      mountainFarColor = 0xb197fc;
      mountainMidColor = 0x6741d9;
    } else if (this.levelData.themeColor === "#e6f8f5") {
      mountainFarColor = 0x99e9f2;
      mountainMidColor = 0x12b886;
    } else if (this.levelData.themeColor === "#fbf3db" || this.levelData.themeColor === "#fdf3e7") {
      mountainFarColor = 0xffe3e3;
      mountainMidColor = 0xe67e22;
    }

    const levelId = this.levelData.id || 1;

    // Shift coordinates of distant mountains mathematically depending on stage levels to make them physically separate
    const farY1 = 300 + Math.sin(levelId * 1.7) * 45;
    const farY2 = 200 + Math.cos(levelId * 2.3) * 35;
    const farY3 = 320 + Math.sin(levelId * 0.9) * 50;
    const farY4 = 180 + Math.cos(levelId * 1.4) * 30;
    const farY5 = 340 + Math.sin(levelId * 0.6) * 45;
    const farY6 = 220 + Math.cos(levelId * 1.8) * 35;
    const farY7 = 320 + Math.sin(levelId * 2.1) * 40;

    bgGraphics.fillStyle(mountainFarColor, 0.75);
    bgGraphics.beginPath();
    bgGraphics.moveTo(0, height);
    bgGraphics.lineTo(0, farY1);
    bgGraphics.lineTo(180, farY2);
    bgGraphics.lineTo(340, farY3);
    bgGraphics.lineTo(520, farY4);
    bgGraphics.lineTo(680, farY5);
    bgGraphics.lineTo(840, farY6);
    bgGraphics.lineTo(1024, farY7);
    bgGraphics.lineTo(1024, height);
    bgGraphics.closePath();
    bgGraphics.fillPath();

    // Middle background silhouettes: shift heights & castle tower placements based on levelId
    const midY1 = 360 + Math.cos(levelId * 1.5) * 30;
    const midY2 = 280 + Math.sin(levelId * 1.9) * 25;
    const castleLeftTowerTop = 180 + Math.abs(Math.sin(levelId * 1.2)) * 60 - 30;
    const castleLeftTowerX = 220 + (levelId * 17) % 60 - 30;
    const castleRightTowerTop = 220 + Math.abs(Math.cos(levelId * 1.5)) * 80 - 40;
    const castleRightTowerX = 760 + (levelId * 29) % 120 - 60;

    bgGraphics.fillStyle(mountainMidColor, 0.9);
    bgGraphics.beginPath();
    bgGraphics.moveTo(0, height);
    bgGraphics.lineTo(0, midY1);
    bgGraphics.lineTo(220, midY2);

    // Left watchtower silhouette
    bgGraphics.lineTo(castleLeftTowerX, castleLeftTowerTop + 30);
    bgGraphics.lineTo(castleLeftTowerX - 10, castleLeftTowerTop + 30);
    bgGraphics.lineTo(castleLeftTowerX - 10, castleLeftTowerTop);
    bgGraphics.lineTo(castleLeftTowerX + 25, castleLeftTowerTop);
    bgGraphics.lineTo(castleLeftTowerX + 25, castleLeftTowerTop + 30);
    bgGraphics.lineTo(castleLeftTowerX + 15, castleLeftTowerTop + 30);
    bgGraphics.lineTo(castleLeftTowerX + 15, 290);

    // Mid structural silhouettes
    bgGraphics.lineTo(330, 300);
    bgGraphics.lineTo(370, 300);
    bgGraphics.lineTo(370, 240);
    bgGraphics.lineTo(400, 240);
    bgGraphics.lineTo(400, 310);
    bgGraphics.lineTo(600, 340);

    // Right watchtower silhouette
    bgGraphics.lineTo(castleRightTowerX, castleRightTowerTop + 70);
    bgGraphics.lineTo(castleRightTowerX, castleRightTowerTop);
    bgGraphics.lineTo(castleRightTowerX + 20, castleRightTowerTop);
    bgGraphics.lineTo(castleRightTowerX + 20, castleRightTowerTop + 75);
    
    bgGraphics.lineTo(880, 370);
    bgGraphics.lineTo(1024, 340);
    bgGraphics.lineTo(1024, height);
    bgGraphics.closePath();
    bgGraphics.fillPath();

    // Near Hills Layer: Calculate dynamic hills peaks depending on level ID
    let hillColor = 0x82b473; // Grasslands default green
    let treeColor = 0x5e8c50; // default dark green trees
    if (this.levelData.themeColor === "#f5f5f7") {
      hillColor = 0x7a8a99; // Industrial grey-teal
      treeColor = 0x566473;
    } else if (this.levelData.themeColor === "#ffd5c6" || this.levelData.themeColor === "#ffede5") {
      hillColor = 0xd9a05b; // Sand/desert
      treeColor = 0xa67438;
    } else if (this.levelData.themeColor === "#fdf8ef") {
      hillColor = 0xa68c6d; // Warm brown/retreat
      treeColor = 0x7a634b;
    } else if (this.levelData.themeColor === "#fbf3db" || this.levelData.themeColor === "#fdf3e7") {
      hillColor = 0xd9a05b; // Sand
      treeColor = 0xa67438;
    } else if (this.levelData.themeColor === "#f6f3fc" || this.levelData.themeColor === "#fdfbff") {
      hillColor = 0x6741d9; // purple cyber hills!
      treeColor = 0x4523a5;
    } else if (this.levelData.themeColor === "#e6f8f5") {
      hillColor = 0x12b886; // emerald hills
      treeColor = 0x087f5b;
    } else if (this.levelData.themeColor === "#e5f0f8" || this.levelData.themeColor === "#edf1f2") {
      hillColor = 0x74c0fc; // frost blue hills
      treeColor = 0x1c7ed6;
    }
    
    const nearHills = this.add.graphics();
    nearHills.setScrollFactor(0.2); // near terrain parallax
    nearHills.fillStyle(hillColor, 0.98);
    nearHills.beginPath();
    nearHills.moveTo(0, height);

    // Compute dynamic, beautiful hills coordinates for each stage level
    const hillY1 = 470 + Math.sin(levelId * 0.7) * 35;
    const hillY2 = 410 + Math.cos(levelId * 0.9) * 25;
    const hillY3 = 455 + Math.sin(levelId * 1.3) * 30;
    const hillY4 = 485 + Math.cos(levelId * 1.7) * 40;
    const hillY5 = 430 + Math.sin(levelId * 2.1) * 25;

    nearHills.lineTo(0, hillY1);
    nearHills.lineTo(250, hillY2);
    nearHills.lineTo(500, hillY3);
    nearHills.lineTo(750, hillY4);
    nearHills.lineTo(1024, hillY5);
    nearHills.lineTo(1024, height);
    nearHills.closePath();
    nearHills.fillPath();

    // Draw little stylized pine trees / bushes silhouettes resting perfectly on the near hills heights
    nearHills.fillStyle(treeColor, 1);
    const treePoints = [100, 160, 340, 420, 580, 720, 850, 930];
    treePoints.forEach(tx => {
      // Linearly interpolate the exact height of the hills profile on x position:
      let ty = hillY1;
      if (tx < 250) {
        const t = tx / 250;
        ty = hillY1 + (hillY2 - hillY1) * t;
      } else if (tx < 500) {
        const t = (tx - 250) / 250;
        ty = hillY2 + (hillY3 - hillY2) * t;
      } else if (tx < 750) {
        const t = (tx - 500) / 250;
        ty = hillY3 + (hillY4 - hillY3) * t;
      } else {
        const t = (tx - 750) / 274;
        ty = hillY4 + (hillY5 - hillY4) * t;
      }

      // Stack triangle visuals
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
    this.drawTerrain();

    // Create the hazard graphics object
    this.hazardGraphics = this.add.graphics();

    // Connect user keyboard inputs for moving the character
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });

    // Interaction listeners for mid-air bomb deployment and splits!
    this.input.on('pointerdown', () => {
      this.handleMidAirInteraction();
    });
    
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => {
        this.handleMidAirInteraction();
      });
    }

    // Initialize trajectory draw buffer
    this.trajectoryGraphics = this.add.graphics();
    this.healthBarGraphics = this.add.graphics();

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

    // Spawn physical mid-hills matching the visual geometries
    if (this.hasMiddleHill1) {
      this.matter.add.rectangle(535, 480 + 60, 110, 120, {
        isStatic: true,
        label: "ground",
        friction: 0.9,
        restitution: 0.1
      });
    }
    if (this.hasMiddleHill2) {
      this.matter.add.rectangle(540, 420 + 90, 80, 180, {
        isStatic: true,
        label: "ground",
        friction: 0.9,
        restitution: 0.1
      });
    }

    // 2.7. Dynamically inject Left and Right moving back walls behind armies, if not pre-configured
    if (!this.levelData.blocks.some(b => b.id && b.id.includes("back_wall_left"))) {
      this.levelData.blocks.push({
        id: "back_wall_left",
        x: 35,
        y: 285,
        width: 18,
        height: 85,
        material: "metal",
        shape: "box",
        rotation: 0
      });
    }
    if (!this.levelData.blocks.some(b => b.id && b.id.includes("back_wall_right"))) {
      this.levelData.blocks.push({
        id: "back_wall_right",
        x: 989,
        y: 285,
        width: 18,
        height: 85,
        material: "metal",
        shape: "box",
        rotation: 0
      });
    }

    // 3. Assemble Fortress Blocks
    this.levelData.blocks.forEach(block => {
      this.spawnBlock(block);
    });

    // 3.5. Spawn random floating walls in various zones (Middle, Left, Right) depending on level
    const materials: Array<'wood' | 'stone' | 'metal' | 'glass'> = ['wood', 'stone', 'metal', 'glass'];
    
    // Choose count & zones depending on index
    let numObstacles = Phaser.Math.Between(3, 5);
    let allowedZones = ['middle']; // Level 1 & 2 are middle-only so players can practice
    
    if (levelId >= 8) {
      numObstacles = Phaser.Math.Between(8, 11);
      allowedZones = ['left', 'middle', 'right'];
    } else if (levelId >= 3) {
      numObstacles = Phaser.Math.Between(5, 7);
      allowedZones = ['left', 'middle', 'right'];
    }

    for (let i = 0; i < numObstacles; i++) {
      const zone = allowedZones[Phaser.Math.Between(0, allowedZones.length - 1)];
      let rx = 500;
      let ry = 250;

      if (zone === 'left') {
        rx = Phaser.Math.Between(110, 350);
        ry = Phaser.Math.Between(110, 260); // Float high above player's launching arc
      } else if (zone === 'right') {
        rx = Phaser.Math.Between(680, 910);
        ry = Phaser.Math.Between(100, 290); // Float high above enemy units
      } else {
        rx = Phaser.Math.Between(440, 620);
        ry = Phaser.Math.Between(130, 420);
      }

      // Safe separation from player's starting slingshot location
      const sPos = this.levelData.playerStart;
      if (Phaser.Math.Distance.Between(rx, ry, sPos.x, sPos.y) < 85) {
        rx += 85;
      }

      // Material block geometry styling variety (pillar/bar/cube)
      const rType = Phaser.Math.Between(0, 2);
      let rw = 32;
      let rh = 32;
      if (rType === 1) { // Long vertical pillar
        rw = Phaser.Math.Between(16, 24);
        rh = Phaser.Math.Between(55, 95);
      } else if (rType === 2) { // Long horizontal platform
        rw = Phaser.Math.Between(55, 95);
        rh = Phaser.Math.Between(16, 24);
      } else { // Regular cube
        rw = rh = Phaser.Math.Between(26, 44);
      }

      const rmat = materials[Phaser.Math.Between(0, materials.length - 1)];
      const isStatic = Math.random() > 0.44; // ~56% are stationary floaters
      const randAngle = Math.random() > 0.48 ? Phaser.Math.Between(-30, 30) : 0;

      const blockObj = this.matter.add.image(rx, ry, `block_${rmat}`, undefined, {
        isStatic: isStatic,
        friction: 0.35,
        restitution: 0.15,
        density: 0.02,
        label: `block_${rmat}`
      });
      blockObj.setDisplaySize(rw, rh);
      if (randAngle !== 0) {
        blockObj.setAngle(randAngle);
      }

      this.blockBodies.push(blockObj);
      const maxHp = DamageSystem.getMaterialMaxHp(rmat);
      this.blockHealthMap.set(blockObj.body, {
        hp: maxHp,
        maxHp,
        material: rmat
      });
    }

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

    // Update vertical moving backwalls
    if (this.movingBackWalls && this.movingBackWalls.length > 0) {
      this.movingBackWalls.forEach(wall => {
        wall.angle += wall.speed * 8; // step angle
        const nextY = wall.startY + Math.sin(wall.angle) * wall.range;
        if (wall.body) {
          this.matter.body.setPosition(wall.body, { x: wall.body.position.x, y: nextY });
        }
      });
    }

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

    // Active Keyboard Walking / Movement Adjustments - Allow moving even during enemy turns to dodge shots!
    if (this.activePlayerUnit && !this.isAiming) {
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

    // If projectiles are active, monitor their motion limits
    if (this.activeProjectiles.length > 0) {
      this.activeProjectile = this.activeProjectiles[0] || null;

      for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
        const proj = this.activeProjectiles[i];
        if (!proj || !proj.active) {
          this.activeProjectiles.splice(i, 1);
          continue;
        }

        const body = proj.body;
        if (body && body.position) {
          // Apply micro wind force to projectiles
          const windXForce = this.windSystem.getForceX(body.mass);
          this.matter.body.applyForce(body, body.position, { x: windXForce, y: 0 });

          // Auto follow the first active projectile so the camera has a focus!
          if (i === 0) {
            this.cameras.main.scrollX = Phaser.Math.Clamp(body.position.x - 400, 0, 150);
            this.updateFlySound(body.speed, body.position.y);
          }

          // Check if stopped moving, fell off boundaries, or took too long
          const speed = body.speed;
          const outOfBounds = (body.position.x > 1100 || body.position.x < -100 || body.position.y > 620);
          const settled = speed < 0.25;

          // Check if fell into the central hazard wave
          const isSpill = (body.position.x > 420 && body.position.x < 650 && body.position.y > 555);

          if (isSpill) {
            this.spawnSplashEffects(body.position.x, body.position.y);
            this.terminateSingleProjectile(proj);
          } else if (outOfBounds) {
            this.terminateSingleProjectile(proj);
          } else if (settled && this.time.now - proj.spawnTime > 1500) {
            this.terminateSingleProjectile(proj);
          } else if (this.time.now - proj.spawnTime > 8000) {
            this.terminateSingleProjectile(proj);
          }
        }
      }
    } else {
      this.activeProjectile = null;
      // Re-center camera gently
      if (this.cameras.main.scrollX > 0) {
        this.cameras.main.scrollX -= 4;
        if (this.cameras.main.scrollX < 0) this.cameras.main.scrollX = 0;
      }
    }

    // Monitoring dynamic physical blocks falling below stage bottom
    for (let i = this.blockBodies.length - 1; i >= 0; i--) {
      const block = this.blockBodies[i];
      if (block && block.body) {
        const bx = block.x;
        const by = block.y;
        if (by > 570) {
          if (bx > 410 && bx < 660) {
            this.spawnSplashEffects(bx, by);
          }
          this.destroyBlock(block.body);
        }
      }
    }

    // Monitoring enemies falling below stage bottom
    for (let i = this.enemyBodies.length - 1; i >= 0; i--) {
      const enemy = this.enemyBodies[i];
      if (enemy && enemy.body) {
        const ex = enemy.x;
        const ey = enemy.y;
        if (ey > 570) {
          if (ex > 410 && ex < 660) {
            this.spawnSplashEffects(ex, ey);
          }
          const record = this.enemyHealthMap.get(enemy.body);
          if (record) {
            record.hp = 0;
            this.destroyEnemy(enemy.body);
          }
        }
      }
    }

    // Monitoring active player falling below stage bottom (except when stretching the slingshot/aiming!)
    if (this.activePlayerUnit && this.activePlayerUnit.active && !this.isAiming) {
      if (this.activePlayerUnit.y > 570) {
        const px = this.activePlayerUnit.x;
        const py = this.activePlayerUnit.y;
        if (px > 410 && px < 660) {
          this.spawnSplashEffects(px, py);
        }
        this.playerHp = 0;
        this.cameras.main.flash(400, 255, 0, 0);
        this.playBreakSound('enemy');
        this.spawnFloatingTxt(px, 480, "ALLY FELL OFF! 💀", "#ff3333");
        
        // Remove player unit sprite from screen
        this.activePlayerUnit.destroy();
        this.activePlayerUnit = null;

        this.notifyHUD();
        this.checkGameEndStatus();
      }
    }

    // Static Launcher Frame autoredraw
    if (!this.isAiming) {
      this.trajectoryGraphics.clear();
      this.drawLauncherStand();
    }

    // Dynamic Crater hollow physics: Slide overlapping blocks or enemies downwards in craters
    if (this.craters.length > 0) {
      this.blockBodies.forEach((block) => {
        if (block && block.body && block.body.position) {
          this.craters.forEach((crater) => {
            const dx = block.x - crater.x;
            const dy = block.y - crater.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < crater.radius) {
              const angle = Math.atan2(dy, dx);
              this.matter.body.applyForce(block.body, block.body.position, {
                x: Math.cos(angle) * 0.0003 * block.body.mass,
                y: 0.0008 * block.body.mass
              });
            }
          });
        }
      });

      this.enemyBodies.forEach((enemy) => {
        if (enemy && enemy.body && enemy.body.position) {
          this.craters.forEach((crater) => {
            const dx = enemy.x - crater.x;
            const dy = enemy.y - crater.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < crater.radius) {
              const angle = Math.atan2(dy, dx);
              this.matter.body.applyForce(enemy.body, enemy.body.position, {
                x: Math.cos(angle) * 0.0004 * enemy.body.mass,
                y: 0.001 * enemy.body.mass
              });
            }
          });
        }
      });
    }

    this.drawHealthBars();
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

  private drawHealthBars() {
    if (!this.healthBarGraphics) return;

    const hg = this.healthBarGraphics;
    hg.clear();

    // 1. Draw Player Health Bar above the player's head
    if (this.activePlayerUnit && this.activePlayerUnit.active && this.activePlayerUnit.body) {
      const px = this.activePlayerUnit.x;
      const py = this.activePlayerUnit.y - 35; // Position above head

      const width = 45;
      const height = 6;
      const pct = Phaser.Math.Clamp(this.playerHp / this.playerMaxHp, 0, 1);

      // Draw background border (dark grey/black)
      hg.fillStyle(0x000000, 0.6);
      hg.fillRect(px - width / 2 - 1, py - 1, width + 2, height + 2);

      // Draw fill color (green transition to red based on health percentage)
      const color = pct > 0.5 ? 0x40c057 : pct > 0.25 ? 0xfcc419 : 0xfa5252;
      hg.fillStyle(color, 1.0);
      hg.fillRect(px - width / 2, py, width * pct, height);
    }

    // 2. Draw Enemies Health Bars
    this.enemyBodies.forEach((enemy) => {
      if (enemy && enemy.active && enemy.body) {
        const record = this.enemyHealthMap.get(enemy.body);
        if (record) {
          const ex = enemy.x;
          const ey = enemy.y - 28; // Position above enemy head

          const width = 36;
          const height = 5;
          const pct = Phaser.Math.Clamp(record.hp / record.maxHp, 0, 1);

          // Draw background border (dark grey/black)
          hg.fillStyle(0x000000, 0.6);
          hg.fillRect(ex - width / 2 - 1, ey - 1, width + 2, height + 2);

          // Draw fill color (orange-red for enemies)
          const color = pct > 0.5 ? 0xfa5252 : pct > 0.25 ? 0xfd7e14 : 0xe03131;
          hg.fillStyle(color, 1.0);
          hg.fillRect(ex - width / 2, ey, width * pct, height);
        }
      }
    });
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
    let materialVal = data.material;
    
    // Avoid spontaneous TNT explosions ending the game instantly on scene load by converting them to wood!
    if (materialVal === 'tnt') {
      materialVal = 'wood';
    }

    const baseMaxHp = DamageSystem.getMaterialMaxHp(materialVal);
    const density = materialVal === 'metal' ? 0.05 : materialVal === 'stone' ? 0.03 : 0.015;
    const friction = materialVal === 'metal' ? 0.15 : 0.4;
    const restitution = materialVal === 'glass' ? 0.1 : materialVal === 'wood' ? 0.2 : 0.05;

    // Check if block should be stationary (static) physically
    const isStatic = !!(data.isStatic || (data.id && data.id.startsWith("back_wall")));

    // Matter physical rectangle
    const block = this.matter.add.image(data.x, data.y, `block_${materialVal}`, undefined, {
      friction,
      restitution,
      density,
      isStatic,
      label: `block_${materialVal}`
    });

    block.setFriction(friction);
    block.setBounce(restitution);
    block.setDisplaySize(data.width, data.height);

    if (data.rotation) {
      block.setAngle(data.rotation);
    }

    if (data.id && data.id.startsWith("back_wall")) {
      this.movingBackWalls.push({
        body: block.body,
        startY: data.y,
        range: 120, // vertical motion range
        speed: 0.002, // speed of movement
        angle: Math.random() * Math.PI // start at random phase
      });
    }

    // Scale block HP depending on the current level for progressive strength!
    const levelId = this.levelData.id || 1;
    const hpScale = 1 + (levelId - 1) * 0.25;
    const scaledHp = Math.round(baseMaxHp * hpScale);

    // Keep handle reference
    this.blockBodies.push(block);
    this.blockHealthMap.set(block.body, {
      id: data.id,
      hp: scaledHp,
      maxHp: scaledHp,
      material: materialVal
    });
  }

  private spawnEnemy(data: EnemyPosition) {
    const scaleFactor = 16; // Double enemy health scale factor (from 8 to 16)
    const maxHp = data.hp * scaleFactor;
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
      if (!this.isAiming) {
        this.startAimCharge();
      }
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

      // Update progressive tension charging sound pitch and volume
      this.updateAimCharge(dist);

      // Compute initial velocities
      const dragMultiplier = 0.16; // Balance force scale
      const vx = dx * dragMultiplier;
      const vy = dy * dx * 0; // standard Y is resolved correctly next line
      const vyCorrect = dy * dragMultiplier;

      // Physically shift character visual slightly to mimic slingshot rubber stretching!
      if (this.activePlayerUnit && typeof this.activePlayerUnit.setPosition === 'function') {
        const visualY = Phaser.Math.Clamp(startY - dy, 50, 545);
        this.activePlayerUnit.setPosition(startX - dx, visualY);
      }

      // Redraw dots
      this.drawTrajectory(startX, startY, vx, vyCorrect);
    } else {
      // Released aim or cancelled
      if (this.isAiming) {
        this.stopAimCharge();
      }
      this.isAiming = false;
      if (this.activePlayerUnit && typeof this.activePlayerUnit.setPosition === 'function') {
        this.activePlayerUnit.setPosition(startX, startY);
      }
      this.trajectoryGraphics.clear();
    }
  }

  private drawTrajectory(sx: number, sy: number, vx: number, vy: number) {
    this.trajectoryGraphics.clear();
    
    // Constant gravity values in Matter
    const gY = 0.40; // Simulated gravity acceleration
    const gX = 0;
    const wX = this.windSystem.getStrength() * 0.003; // Wind force translation

    const points = TrajectorySystem.predict(sx, sy, vx, vy, gX, gY, wX, 35, 1.25);

    // 1. Draw glowing trajectory dots
    this.trajectoryGraphics.lineStyle(1.5, 0xffffff, 0.5);
    this.trajectoryGraphics.fillStyle(0x38d9a9, 0.9); // Beautiful neon mint green dots!
    
    points.forEach((pt, i) => {
      if (i % 2 === 0) {
        // Dot gets smaller further down the trajectory
        this.trajectoryGraphics.fillCircle(pt.x, pt.y, Math.max(1, 5 - (i * 0.12)));
      }
    });

    // 2. Draw sophisticated double slingshot bands
    const leftProngX = sx - 18;
    const leftProngY = sy - 22;
    const rightProngX = sx + 18;
    const rightProngY = sy - 22;

    const dragX = this.activePlayerUnit ? this.activePlayerUnit.x : sx;
    const dragY = this.activePlayerUnit ? this.activePlayerUnit.y : sy;

    // Draw elastic shadow lines for rich 3D appearance
    this.trajectoryGraphics.lineStyle(6, 0x1a1c23, 0.45);
    this.trajectoryGraphics.lineBetween(leftProngX, leftProngY, dragX, dragY);
    this.trajectoryGraphics.lineBetween(rightProngX, rightProngY, dragX, dragY);

    // Draw primary bands (Sleek high-tech neon amber bands)
    this.trajectoryGraphics.lineStyle(3, 0xfd7e14, 0.85);
    this.trajectoryGraphics.lineBetween(leftProngX, leftProngY, dragX, dragY);
    this.trajectoryGraphics.lineBetween(rightProngX, rightProngY, dragX, dragY);

    // Draw holding pocket leather cradle around the unit
    this.trajectoryGraphics.fillStyle(0x495057, 1);
    this.trajectoryGraphics.lineStyle(1.5, 0xadb5bd, 1);
    this.trajectoryGraphics.fillCircle(dragX, dragY, 5);
    this.trajectoryGraphics.strokeCircle(dragX, dragY, 5);

    // 3. Draw parent launcher stand over bands
    this.drawLauncherStand();

    // 4. Draw stylish power meter concentric arcs
    // Max pull is around 100 pixels
    const dx = sx - dragX;
    const dy = sy - dragY;
    const pullDistance = Math.sqrt(dx * dx + dy * dy);
    const pullRatio = Phaser.Math.Clamp(pullDistance / 100, 0, 1);

    // Arc color changes smoothly: Green (low power) -> Yellow (moderate) -> Red (extreme!)
    let arcColor = 0x40c057; // bright green
    if (pullRatio > 0.4 && pullRatio <= 0.8) {
      arcColor = 0xfcc419; // warning yellow
    } else if (pullRatio > 0.8) {
      arcColor = 0xfa5252; // bright red
    }

    // Draw tactical reticle ring around active player unit
    this.trajectoryGraphics.lineStyle(1.5, arcColor, 0.4 + (pullRatio * 0.4));
    this.trajectoryGraphics.strokeCircle(dragX, dragY, 18 + (pullRatio * 12));

    // Crosshair ticks
    this.trajectoryGraphics.lineStyle(1, arcColor, 0.6);
    this.trajectoryGraphics.lineBetween(dragX - 25, dragY, dragX + 25, dragY);
    this.trajectoryGraphics.lineBetween(dragX, dragY - 25, dragX, dragY + 25);

    // Draw elegant glowing charge bar over the launcher stand!
    this.trajectoryGraphics.fillStyle(arcColor, 0.8);
    this.trajectoryGraphics.fillRect(sx - 20, sy + 15, 40 * pullRatio, 4);
    this.trajectoryGraphics.lineStyle(1, 0xffffff, 0.3);
    this.trajectoryGraphics.strokeRect(sx - 20, sy + 15, 40, 4);
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
        this.game.events.emit("hud_message", { 
          type: "warning", 
          text: "선택한 비축 탄환이 소진되었습니다! 기본 탄환으로 대체 발사됩니다." 
        });
        this.spawnFloatingTxt(
          this.activePlayerUnit ? this.activePlayerUnit.x : 200, 
          this.activePlayerUnit ? this.activePlayerUnit.y - 70 : 300, 
          "⚠️ 탄환 소진! 기본 공격 대체", 
          "#ffa94d"
        );
        this.selectedWeaponId = "basic";
      }
      this.ammoRemaining[this.selectedWeaponId]--;
    }

    this.playBeep(260, 0.12);
    this.stopAimCharge();

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
        this.game.events.emit("hud_message", { 
          type: "warning", 
          text: "장탄이 부족합니다! 기본 탄환을 사용합니다." 
        });
        this.spawnFloatingTxt(
          this.activePlayerUnit ? this.activePlayerUnit.x : 200, 
          this.activePlayerUnit ? this.activePlayerUnit.y - 70 : 300, 
          "⚠️ 장탄 부족! 기본 탄환 사용", 
          "#ffa94d"
        );
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

  private spawnAndLaunchProjectile(vx: number, vy: number, isEnemyWeapon: boolean, customStartX?: number, customStartY?: number) {
    const sPos = isEnemyWeapon ? { x: 800, y: 150 } : this.levelData.playerStart; // Enemy position or player position
    const weaponData = WEAPONS[this.selectedWeaponId] || WEAPONS.basic;
    
    // Reset mid-air action spent tracker for the new firing event!
    this.isMidAirActionSpent = false;

    // Create new Matter circle body projectile
    const projColor = isEnemyWeapon ? 0xe03131 : weaponData.color;
    
    // Draw projectile graphics helper sprite on the fly
    const projSpriteKey = isEnemyWeapon ? 'enemy_bullet' : `bullet_${weaponData.id}`;
    if (!this.textures.exists(projSpriteKey)) {
      const g = this.add.graphics();
      g.fillStyle(projColor, 1);
      g.lineStyle(1.5, 0xffffff, 1);

      if (!isEnemyWeapon && weaponData.id === 'arrow') {
        // Triangle/Arrow shape pointing forwards
        g.beginPath();
        g.moveTo(22, 12);
        g.lineTo(4, 4);
        g.lineTo(9, 12);
        g.lineTo(4, 20);
        g.closePath();
        g.fillPath();
        g.strokePath();
        g.generateTexture(projSpriteKey, 24, 24);
      } else if (!isEnemyWeapon && weaponData.id === 'drop_straight') {
        // Spike bullet shape
        g.fillRect(8, 6, 8, 14);
        g.strokeRect(8, 6, 8, 14);
        g.beginPath();
        g.moveTo(12, 1);
        g.lineTo(5, 6);
        g.lineTo(19, 6);
        g.closePath();
        g.fillPath();
        g.strokePath();
        g.generateTexture(projSpriteKey, 24, 24);
      } else if (!isEnemyWeapon && weaponData.id === 'skydrop') {
        // Satellite orb with side nodes
        g.fillStyle(0x00f0ff, 1);
        g.fillCircle(12, 12, 7);
        g.fillRect(2, 10, 20, 4);
        g.strokeCircle(12, 12, 7);
        g.generateTexture(projSpriteKey, 24, 24);
      } else if (!isEnemyWeapon && weaponData.id === 'megabomb') {
        // Mega spiked mining bomb!
        g.fillStyle(0xd35400, 1);
        g.fillCircle(12, 12, 9);
        // Add 8 little spike nodes
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          const sx = 12 + Math.cos(a) * 9;
          const sy = 12 + Math.sin(a) * 9;
          g.fillStyle(0xffffff, 1);
          g.fillCircle(sx, sy, 2);
        }
        g.strokeCircle(12, 12, 9);
        g.generateTexture(projSpriteKey, 24, 24);
      } else if (!isEnemyWeapon && weaponData.id === 'bouncy') {
        // Highly elastic glowing cube shape!
        g.fillRect(4, 4, 16, 16);
        g.strokeRect(4, 4, 16, 16);
        g.generateTexture(projSpriteKey, 24, 24);
      } else {
        // Standard circle
        g.fillCircle(12, 12, 11);
        g.strokeCircle(12, 12, 11);
        g.generateTexture(projSpriteKey, 24, 24);
      }
      
      g.destroy();
    }

    // Launch!
    const projX = customStartX !== undefined ? customStartX : (isEnemyWeapon ? (this.enemyBodies[0]?.x || 780) - 40 : sPos.x);
    const projY = customStartY !== undefined ? customStartY : (isEnemyWeapon ? (this.enemyBodies[0]?.y || 400) - 40 : sPos.y);

    const proj = this.add.image(projX, projY, projSpriteKey);
    this.matter.add.gameObject(proj, {
      shape: { type: 'circle', radius: weaponData.radius },
      density: 0.03 * weaponData.weight,
      friction: 0.1,
      frictionAir: 0.0, // Eliminate air resistance so trajectories perfectly track predictive dots and AI solvers!
      restitution: weaponData.elasticity,
      label: isEnemyWeapon ? 'enemy_projectile' : 'projectile'
    });

    (proj as any).setVelocity(vx, vy);

    // Track spawn metadata for lifetime timeout monitoring
    (proj as any).spawnTime = this.time.now;
    (proj as any).weaponId = isEnemyWeapon ? "basic" : this.selectedWeaponId;
    (proj as any).isEnemy = isEnemyWeapon;

    this.activeProjectile = proj;
    this.activeProjectiles.push(proj);

    // Trigger whistling whoosh flight sound
    this.startFlySound();

    // Lock player selection or reset visual stretch state if player is shooting
    if (!isEnemyWeapon && this.activePlayerUnit) {
      this.activePlayerUnit.setStatic(true);
      this.activePlayerUnit.setPosition(sPos.x, sPos.y);
    }
    this.isAiming = false;
    this.trajectoryGraphics.clear();

    // Dynamically retrieve trail tint based on selected weapon color
    const wInfo = WEAPONS[(proj as any).weaponId] || WEAPONS.basic;
    const trailColor = wInfo ? wInfo.color : 0xffffff;

    // Spawn visual smoke tail trail emitter behind projectile
    const particles = this.add.particles(0, 0, 'smoke_particle', {
      scale: { start: 1.0, end: 0.1 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 600,
      frequency: 24,
      follow: proj,
      blendMode: 'ADD',
      tint: trailColor
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
          const isShrapnelA = (bodyA.label === 'hazard_shrapnel');
          const isShrapnelB = (bodyB.label === 'hazard_shrapnel');
          if (isShrapnelA || isShrapnelB) {
            const sBody = isShrapnelA ? bodyA : bodyB;
            const otherBody = isShrapnelA ? bodyB : bodyA;
            this.handleShrapnelImpact(sBody, otherBody);
          } else {
            // Block-to-block or block-to-enemy fall damage collisions!
            this.handleGenericPhysicalImpact(bodyA, bodyB);
          }
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
      const isBackWall = !!(record.id && record.id.includes("back_wall"));

      if (!isBackWall) {
        const dmg = DamageSystem.calculateImpactDamage(velocityMag, wInfo.weight, record.material);
        record.hp -= dmg;
        this.score += Math.round(dmg * 1.5);
        
        // Visual damage indicators: change transparency or spawn debris
        if (otherBody.gameObject) {
          otherBody.gameObject.setAlpha(Math.max(0.3, record.hp / record.maxHp));
        }

        const pX = (otherBody && otherBody.position && typeof otherBody.position.x === 'number') ? otherBody.position.x : (otherBody && otherBody.gameObject ? otherBody.gameObject.x : 0);
        const pY = (otherBody && otherBody.position && typeof otherBody.position.y === 'number') ? otherBody.position.y : (otherBody && otherBody.gameObject ? otherBody.gameObject.y : 0);
        this.spawnDebris(pX, pY, record.material, 5);

        if (record.id && record.id.includes("floating_target")) {
          this.triggerFloatingTargetDebrisBurst(pX, pY);
        }

        if (record.hp <= 0) {
          this.destroyBlock(otherBody);
        }
      } else {
        // Back-wall is completely indestructible. Deflect back toward playfield.
        const isLeftWall = record.id && record.id.includes("left");
        const dirX = isLeftWall ? 3.2 : -3.2; // deflect towards the middle ground platform!
        this.matter.body.setVelocity(pBody, { x: dirX, y: 4.5 });
        this.spawnFloatingTxt(pBody.position.x, pBody.position.y - 20, isLeftWall ? "DEFLECT FORWARD! ➡️" : "DEFLECT FORWARD! ⬅️", "#00f0ff");
        this.playBeep(210, 0.12);
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

      const pX = (otherBody && otherBody.position && typeof otherBody.position.x === 'number') ? otherBody.position.x : (otherBody && otherBody.gameObject ? otherBody.gameObject.x : 0);
      const pY = (otherBody && otherBody.position && typeof otherBody.position.y === 'number') ? otherBody.position.y : (otherBody && otherBody.gameObject ? otherBody.gameObject.y : 0);

      // Spawn mighty green sparks & debris chunks!
      this.spawnDebris(pX, pY, 'tnt', 22);

      this.spawnFloatingTxt(pX, pY - 25, `-${dmg} DMG`, '#ffa94d');

      if (record.hp <= 0) {
        this.destroyEnemy(otherBody);
      }
    }

    // 4. Handle player damage
    if (this.activePlayerUnit && otherBody === this.activePlayerUnit.body) {
      const isProjectileEnemy = (this.activeProjectile as any).isEnemy;
      const dmg = Math.round(velocityMag * wInfo.weight * (isProjectileEnemy ? 12 : 6));
      this.playerHp = Phaser.Math.Clamp(this.playerHp - dmg, 0, this.playerMaxHp);
      
      // Flash screen red and play pain alert beep
      this.cameras.main.flash(120, 240, 50, 50);
      this.playBeep(185, 0.15);

      this.spawnFloatingTxt(this.activePlayerUnit.x, this.activePlayerUnit.y - 30, `-${dmg} HP`, '#fa5252');

      this.spawnDebris(this.activePlayerUnit.x, this.activePlayerUnit.y, 'wood', 4);
    }

    // 5. Check for special splash ammo explosions (TNT or standard bomb)
    const isEnemy = (this.activeProjectile as any).isEnemy;
    if (wInfo.specialEffect === 'explode' || wInfo.specialEffect === 'gravity' || wInfo.specialEffect === 'fire' || wInfo.specialEffect === 'giant_explode' || isEnemy) {
      const pX = (pBody && pBody.position && typeof pBody.position.x === 'number') ? pBody.position.x : (pBody && pBody.gameObject ? pBody.gameObject.x : 0);
      const pY = (pBody && pBody.position && typeof pBody.position.y === 'number') ? pBody.position.y : (pBody && pBody.gameObject ? pBody.gameObject.y : 0);
      this.executeExplosionAt(pX, pY, wInfo);
    }

    this.notifyHUD();
  }

  private handleGenericPhysicalImpact(bodyA: any, bodyB: any) {
    if (this.time.now - this.sceneStartTime < 4000) {
      return; // Ignore default settlement toppling damage on scene start!
    }

    // Blocks to block or blocks to enemy toppling damage
    // Based on relative velocities
    const vDiff = Math.abs(bodyA.speed - bodyB.speed);
    if (vDiff < 3.2) return;

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
        const dmg = Math.round(vDiff * 15);
        if (dmg > 5) {
          record.hp -= dmg;
          
          const pX = (b && b.position && typeof b.position.x === 'number') ? b.position.x : (b && b.gameObject ? b.gameObject.x : 0);
          const pY = (b && b.position && typeof b.position.y === 'number') ? b.position.y : (b && b.gameObject ? b.gameObject.y : 0);
          this.spawnFloatingTxt(pX, pY - 25, `-${dmg} HP`, '#ffd43b');

          if (record.hp <= 0) this.destroyEnemy(b);
        }
      }
    });
  }

  private destroyBlock(b: any) {
    if (!b) return;
    if (!this.blockHealthMap.has(b)) return;
    const record = this.blockHealthMap.get(b)!;
    if (record.id && record.id.includes("back_wall")) return; // Indestructible safety guard!
    this.score += 200; // Block destruction score bonus

    const posX = (b.position && typeof b.position.x === 'number') ? b.position.x : (b.gameObject ? b.gameObject.x : 0);
    const posY = (b.position && typeof b.position.y === 'number') ? b.position.y : (b.gameObject ? b.gameObject.y : 0);

    // Fire explosive chain reaction if it's a TNT box
    if (record.material === 'tnt') {
      this.executeExplosionAt(posX, posY, {
         explosionRadius: 130,
         damage: 150,
         specialEffect: 'explode'
      } as any);
    } else {
      // Play material-specific physical break sound
      this.playBreakSound(record.material);
    }

    // Clear and remove physical body
    this.spawnDebris(posX, posY, record.material, 12);
    this.blockHealthMap.delete(b);
    this.blockBodies = this.blockBodies.filter(item => item && item.body && item.body !== b);

    if (b.gameObject) {
      b.gameObject.destroy();
    }
    this.matter.world.remove(b);
  }

  private handleMidAirInteraction() {
    if (!this.activeProjectile || !this.activeProjectile.active || (this.activeProjectile as any).isEnemy) {
      return;
    }
    if (this.isMidAirActionSpent) {
      return;
    }

    const weaponId = (this.activeProjectile as any).weaponId;
    const body = this.activeProjectile.body;
    if (!body || !body.position) return;

    if (weaponId === 'split') {
      this.isMidAirActionSpent = true;
      this.playBeep(450, 0.1);
      
      const vx = body.velocity.x;
      const vy = body.velocity.y;
      const x = body.position.x;
      const y = body.position.y;
      this.spawnDebris(x, y, 'glass', 5);

      const trail = (this.activeProjectile as any).trailParticles;
      if (trail) trail.destroy();
      this.activeProjectiles = this.activeProjectiles.filter(p => p !== this.activeProjectile);
      this.activeProjectile.destroy();
      this.matter.world.remove(body);
      this.activeProjectile = null;

      const angles = [-0.18, 0, 0.18];
      const speed = Math.sqrt(vx * vx + vy * vy) || 7;
      const baseAngle = Math.atan2(vy, vx);

      const pellets: any[] = [];
      angles.forEach((offsetAngle) => {
        const finalAngle = baseAngle + offsetAngle;
        const pVx = Math.cos(finalAngle) * speed;
        const pVy = Math.sin(finalAngle) * speed;

        const pSpriteKey = `bullet_split`;
        if (!this.textures.exists(pSpriteKey)) {
          const g = this.add.graphics();
          g.fillStyle(0x1abc9c, 1);
          g.fillCircle(12, 12, 7);
          g.lineStyle(1.2, 0xffffff, 1);
          g.strokeCircle(12, 12, 7);
          g.generateTexture(pSpriteKey, 24, 24);
          g.destroy();
        }

        const proj = this.add.image(x, y, pSpriteKey);
        this.matter.add.gameObject(proj, {
          shape: { type: 'circle', radius: 8 },
          density: 0.02,
          frictionAir: 0.0,
          restitution: 0.3,
          label: 'projectile'
        });
        (proj as any).setVelocity(pVx, pVy);
        (proj as any).spawnTime = this.time.now;
        (proj as any).weaponId = 'basic';
        (proj as any).isEnemy = false;
        
        const pt = this.add.particles(0, 0, 'smoke_particle', {
          scale: { start: 0.6, end: 0.1 },
          alpha: { start: 0.6, end: 0 },
          lifespan: 400,
          frequency: 32,
          follow: proj,
          blendMode: 'ADD'
        });
        (proj as any).trailParticles = pt;
        
        pellets.push(proj);
        this.activeProjectiles.push(proj);
      });

      this.activeProjectile = pellets[1];
      this.spawnFloatingTxt(x, y, "SPLIT SHOT!", "#1abc9c");
      this.notifyHUD();
    } 
    else if (weaponId === 'drop_straight') {
      this.isMidAirActionSpent = true;
      this.playBeep(300, 0.1);
      
      this.matter.body.setVelocity(body, { x: 0, y: 15 });
      this.spawnFloatingTxt(body.position.x, body.position.y - 20, "ORBITAL PLUNGE! ☄️", "#e74c3c");
      
      const flare = this.add.circle(body.position.x, body.position.y + 15, 14, 0xf1c40f, 0.9);
      this.tweens.add({
        targets: flare,
        alpha: 0,
        scale: 2.2,
        duration: 250,
        onComplete: () => flare.destroy()
      });
    }
    else if (weaponId === 'skydrop') {
      this.isMidAirActionSpent = true;
      this.playBeep(400, 0.1);
      
      const px = body.position.x;
      const py = body.position.y;
      
      this.matter.body.setVelocity(body, { x: body.velocity.x * 0.25, y: body.velocity.y * 0.5 });
      this.spawnFloatingTxt(px, py - 20, "AIRSTRIKE INBOUND! 🛰️", "#00f0ff");
      
      const subSpriteKey = 'bullet_bomb';
      if (!this.textures.exists(subSpriteKey)) {
        const g = this.add.graphics();
        g.fillStyle(0xe8590c, 1);
        g.fillCircle(12, 12, 9);
        g.lineStyle(1.2, 0xffffff, 1);
        g.strokeCircle(12, 12, 9);
        g.generateTexture(subSpriteKey, 24, 24);
        g.destroy();
      }

      for (let i = 0; i < 3; i++) {
        const offsetLeft = (i - 1) * 32;
        const bX = px + offsetLeft;
        const bY = py + 12;

        const bImg = this.add.image(bX, bY, subSpriteKey);
        this.matter.add.gameObject(bImg, {
          shape: { type: 'circle', radius: 9 },
          density: 0.04,
          frictionAir: 0.005,
          restitution: 0.1,
          label: 'projectile'
        });
        
        (bImg as any).setVelocity(Phaser.Math.Between(-1.5, 1.5), 7 + i * 1.5);
        (bImg as any).spawnTime = this.time.now;
        (bImg as any).weaponId = 'bomb';
        (bImg as any).isEnemy = false;

        const pt = this.add.particles(0, 0, 'smoke_particle', {
          scale: { start: 0.6, end: 0.1 },
          alpha: { start: 0.6, end: 0 },
          lifespan: 300,
          frequency: 30,
          follow: bImg,
          blendMode: 'ADD'
        });
        (bImg as any).trailParticles = pt;
        this.activeProjectiles.push(bImg);
      }
    }
  }

  private destroyEnemy(b: any) {
    if (!b) return;
    if (!this.enemyHealthMap.has(b)) return;
    const record = this.enemyHealthMap.get(b)!;
    this.score += 1500; // Massive score bonus

    const posX = (b.position && typeof b.position.x === 'number') ? b.position.x : (b.gameObject ? b.gameObject.x : 0);
    const posY = (b.position && typeof b.position.y === 'number') ? b.position.y : (b.gameObject ? b.gameObject.y : 0);

    this.spawnDebris(posX, posY, 'tnt', 16);
    this.enemyHealthMap.delete(b);
    this.enemyBodies = this.enemyBodies.filter(item => item && item.body && item.body !== b);

    if (b.gameObject) {
      b.gameObject.destroy();
    }
    this.matter.world.remove(b);

    this.cameras.main.shake(150, 0.012);
    // Play wet squishy slime pop breaking sound
    this.playBreakSound('enemy');

    this.notifyHUD();
    this.checkGameEndStatus();
  }

  // --- Cascade Explosive Radial Solver ---

  private executeExplosionAt(exX: number, exY: number, weapon: WeaponData) {
    const radius = weapon.explosionRadius || 80;
    const maxDamage = weapon.damage * 1.5;

    // Use a real Phaser Arc Game Object (circle) matching the exact weapon color palette!
    let burstColor = weapon.color || 0xff761b;
    if (weapon.specialEffect === 'giant_explode') {
      burstColor = 0xff2a2a;
    }
    
    const fireCircle = this.add.circle(exX, exY, radius, burstColor, 0.85);
    
    this.tweens.add({
      targets: fireCircle,
      alpha: 0,
      scale: 1.35,
      duration: 380,
      onComplete: () => fireCircle.destroy()
    });

    // Spawn a gorgeous fountain/burst of glowing gravity-bound spark particles outward!
    const explosionParticles = this.add.particles(0, 0, 'fire_particle', {
      x: exX,
      y: exY,
      speed: { min: 90, max: 270 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.4, end: 0.1 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 450, max: 900 },
      gravityY: 250,
      tint: burstColor,
      blendMode: 'ADD'
    });
    // Explode 25 particles (or 50 for the gigantic nuke!)
    explosionParticles.explode(weapon.specialEffect === 'giant_explode' ? 55 : 25);
    this.time.delayedCall(1100, () => explosionParticles.destroy());

    if (weapon.specialEffect === 'giant_explode') {
      // White hot core flash
      const innerCore = this.add.circle(exX, exY, radius * 0.4, 0xffffff, 0.95);
      this.tweens.add({
        targets: innerCore,
        alpha: 0,
        scale: 2.2,
        duration: 320,
        onComplete: () => innerCore.destroy()
      });
      // Massive cinematic camera vibration
      this.cameras.main.shake(320, 0.032);
    } else {
      this.cameras.main.shake(180, 0.018);
    }
    
    // Play massive deep explosive synthesize rumble sound
    this.playBreakSound('tnt');

    // Calculate crater radius first to perform precise overlapping check
    let craterRadius = 24 + Math.random() * 8;
    if (weapon.specialEffect === 'explode') craterRadius = 38;
    if (weapon.specialEffect === 'gravity') craterRadius = 45;
    if (weapon.id === 'bomb') craterRadius = 40;

    // No longer generate problematic visual craters to avoid unseemly permanent colored circles in the sky and terrain
    this.drawTerrain();

    // Apply radial physical forces to adjacent dynamic blocks & deal splash damage
    this.blockHealthMap.forEach((record, b) => {
      if (!b || !b.position) return;
      if (record.id && record.id.includes("back_wall")) return; // Completely immune to explosions!
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
      if (!b || !b.position) return;
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

        const pX = (b && b.position && typeof b.position.x === 'number') ? b.position.x : (b && b.gameObject ? b.gameObject.x : 0);
        const pY = (b && b.position && typeof b.position.y === 'number') ? b.position.y : (b && b.gameObject ? b.gameObject.y : 0);
        this.spawnFloatingTxt(pX, pY - 25, `-${dmg} HP`, '#fa5252');

        if (record.hp <= 0) {
          this.time.delayedCall(10, () => this.destroyEnemy(b));
        }
      }
    });

    // 3. Player explosion splash damage
    if (this.activePlayerUnit && this.activePlayerUnit.active && this.activePlayerUnit.body) {
      const pb = this.activePlayerUnit.body;
      if (pb && pb.position) {
        const dx = pb.position.x - exX;
        const dy = pb.position.y - exY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < radius) {
          const ratio = (radius - dist) / radius;
          const dmg = Math.round(maxDamage * ratio * 0.85);
          this.playerHp = Phaser.Math.Clamp(this.playerHp - dmg, 0, this.playerMaxHp);

          // Flash screen red and play pain sound
          this.cameras.main.flash(100, 240, 50, 50);
          this.playBeep(180, 0.15);

          // Floating Damage indicator text
          this.spawnFloatingTxt(this.activePlayerUnit.x, pb.position.y - 35, `-${dmg} HP`, '#fa5252');

          // Apply knockback visual force
          const pushFactor = ratio * 0.015;
          const angle = Math.atan2(dy, dx);
          this.matter.body.applyForce(pb, pb.position, {
            x: Math.cos(angle) * pushFactor * pb.mass,
            y: Math.sin(angle) * pushFactor * pb.mass - 0.005
          });
        }
      }
    }
  }

  // Visual Floating Text popup (damage, points)
  private spawnFloatingTxt(x: number, y: number, txt: string, col: string) {
    const ftext = this.add.text(x, y, txt, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      fontStyle: 'extrabold',
      color: col,
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    this.tweens.add({
      targets: ftext,
      y: y - 35,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.out',
      onComplete: () => ftext.destroy()
    });
  }

  private triggerFloatingTargetDebrisBurst(fx: number, fy: number) {
    this.playBeep(440, 0.2); // Special trigger sound!
    this.spawnFloatingTxt(fx, fy - 35, "TARGET SECURED! CASCADE FALL!", "#ffa94d");

    // Spawn 8-12 physical shrapnel items cascading from above the target coordinates
    const count = Phaser.Math.Between(8, 12);
    for (let i = 0; i < count; i++) {
      const rx = fx + Phaser.Math.Between(-140, 140);
      const ry = fy - Phaser.Math.Between(160, 320); // physically high up!
      const type = Phaser.Math.Between(0, 2); // 0 = arrow (wood), 1 = stone, 2 = metal fragment

      let texture = "block_wood";
      let material: MaterialType = "wood";
      let size = { w: 12, h: 12 };

      if (type === 1) {
        texture = "block_stone";
        material = "stone";
        size = { w: 14, h: 14 };
      } else if (type === 2) {
        texture = "block_metal";
        material = "metal";
        size = { w: 12, h: 6 }; // flat fragment
      } else {
        // Arrow representation
        texture = "block_wood";
        material = "wood";
        size = { w: 16, h: 5 };
      }

      // Add as dynamic physical body falling under full gravity
      const shrapnel = this.matter.add.image(rx, ry, texture, undefined, {
        restitution: 0.35,
        friction: 0.15,
        density: 0.012,
        label: "hazard_shrapnel"
      });

      shrapnel.setDisplaySize(size.w, size.h);
      shrapnel.setAngle(Phaser.Math.Between(0, 360));
      // Give it slightly randomized initial speed down
      this.matter.body.setVelocity(shrapnel.body as any, {
        x: Phaser.Math.FloatBetween(-1.5, 1.5),
        y: Phaser.Math.FloatBetween(2, 6)
      });

      // Auto-expire after 6.0 seconds so bodies don't pile up
      this.time.delayedCall(6000, () => {
        if (shrapnel && shrapnel.active) {
          shrapnel.destroy();
        }
      });
    }
  }

  private handleShrapnelImpact(sBody: any, otherBody: any) {
    if (!sBody || !sBody.position || !sBody.gameObject) return;

    // Avoid self double collision
    sBody.label = 'inactive';

    const sx = sBody.position.x;
    const sy = sBody.position.y;
    this.spawnDebris(sx, sy, 'glass', 2);
    this.playBeep(450 + Math.random() * 200, 0.02);

    // If hits enemy
    if (this.enemyHealthMap.has(otherBody)) {
      const record = this.enemyHealthMap.get(otherBody)!;
      const dmg = Phaser.Math.Between(20, 35);
      record.hp -= dmg;
      this.score += dmg * 6;
      
      this.spawnFloatingTxt(sx, sy - 20, `-${dmg} HP`, '#f1c40f');
      this.spawnDebris(sx, sy, 'tnt', 5); // red flashes

      if (record.hp <= 0) {
        this.destroyEnemy(otherBody);
      }
    } 
    // If hits block
    else if (this.blockHealthMap.has(otherBody)) {
      const record = this.blockHealthMap.get(otherBody)!;
      const dmg = Phaser.Math.Between(12, 22);
      record.hp -= dmg;
      if (otherBody.gameObject) {
        otherBody.gameObject.setAlpha(Math.max(0.3, record.hp / record.maxHp));
      }
      if (record.hp <= 0) {
        this.destroyBlock(otherBody);
      }
    }

    // Destroy the shrapnel physical object safely
    this.time.delayedCall(10, () => {
      try {
        if (sBody.gameObject) {
          sBody.gameObject.destroy();
        }
      } catch (e) {}
    });
  }

  // Physical and visual debris burst creator
  private spawnDebris(x: number, y: number, material: MaterialType, qty: number) {
    const col = DamageSystem.getMaterialColor(material);
    let targetTint = 0x868e96;
    if (material === 'wood') targetTint = 0xbc8f8f;
    else if (material === 'stone') targetTint = 0x8c8c8c;
    else if (material === 'metal') targetTint = 0x4a5d6e;
    else if (material === 'glass') targetTint = 0xb0e0e6;
    else if (material === 'tnt') targetTint = 0xd9534f;

    // 1. Spawns visual particle sparks
    const emitter = this.add.particles(x, y, 'fire_particle', {
      scale: { start: 1.2, end: 0.1 },
      alpha: { start: 0.9, end: 0 },
      tint: targetTint,
      speed: { min: 80, max: 240 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 400, max: 1000 },
      gravityY: 400,
      maxParticles: qty
    });
    this.time.delayedCall(1200, () => emitter.destroy());

    // 2. Spawn real rollable, physical Matter debris fragments!
    // "상대가 공격할 때 원자재가 남고 잔재가 남는다"
    const numDebris = Math.min(3, Math.max(1, Math.floor(qty / 4))); // Spawn 1 to 3 dynamic physical pieces

    for (let i = 0; i < numDebris; i++) {
      const size = Phaser.Math.Between(13, 18);
      const debrisKey = `block_${material}`;

      // Spawn slightly offset to avoid overlapping instantly
      const rx = x + Phaser.Math.Between(-12, 12);
      const ry = y + Phaser.Math.Between(-12, 12);

      const item = this.matter.add.image(rx, ry, debrisKey, undefined, {
        shape: { type: 'rectangle', width: size, height: size },
        friction: 0.8,
        frictionAir: 0.02,
        restitution: 0.15,
        density: 0.008,
        label: 'debris'
      });

      item.setDisplaySize(size, size);
      item.setAngle(Math.random() * 360);

      // Give a small blast shockwave drift impetus!
      const angle = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.FloatBetween(2.0, 5.0);
      this.matter.body.setVelocity(item.body as any, {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed - 1.5 // bounce upwards slightly
      });

      this.physicalDebrisList.push(item);

      // Keep maximum persistent physical debris capped to 40 for hardware efficiency
      if (this.physicalDebrisList.length > 40) {
        const oldest = this.physicalDebrisList.shift();
        if (oldest) {
          this.matter.world.remove(oldest.body as any);
          oldest.destroy();
        }
      }
    }
  }

  // --- Turn Loop Solvers ---

  private terminateSingleProjectile(proj: any) {
    if (!proj) return;
    
    // Purge particles and destroy body
    if (proj.trailParticles) {
      proj.trailParticles.destroy();
    }
    proj.destroy();
    
    // Filter out of list
    this.activeProjectiles = this.activeProjectiles.filter(p => p !== proj);
    
    // Re-assign activeProjectile helper
    this.activeProjectile = this.activeProjectiles[0] || null;

    // If all are completed, transition turn!
    if (this.activeProjectiles.length === 0) {
      this.stopFlySound();
      
      const finished = this.checkGameEndStatus();
      if (finished) return;

      if (this.isPlayerTurn) {
        this.isPlayerTurn = false;
        this.notifyHUD();
        this.time.delayedCall(1600, () => {
          this.executeEnemyCombatDecision();
        });
      } else {
        this.currentTurnNumber++;
        this.isPlayerTurn = true;
        this.windSystem.randomize();
        this.spawnPlayerAtStart();
        this.notifyHUD();

        if (this.currentTurnNumber > this.levelData.maxTurns) {
          this.triggerGameResult(false);
        }
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

    // Informing user: floating text alert banner for simultaneous coordinated firing
    const alertText = this.add.text(512, 110, `⚠️ 적군 합동 포화 개시! (COORDINATED ENEMY FIRE!)`, {
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

    const levelIndex = this.levelData.id;
    // Smoother scaling function for requirement 4: "적중률도 좀 높아간다"
    let noiseRange = 0.45;
    if (levelIndex === 1) noiseRange = 0.45;
    else if (levelIndex === 2) noiseRange = 0.35;
    else if (levelIndex === 3) noiseRange = 0.25;
    else if (levelIndex === 4) noiseRange = 0.18;
    else if (levelIndex === 5) noiseRange = 0.12;
    else if (levelIndex === 6) noiseRange = 0.08;
    else if (levelIndex === 7) noiseRange = 0.05;
    else if (levelIndex === 8) noiseRange = 0.03;
    else if (levelIndex === 9) noiseRange = 0.015;
    else noiseRange = 0.005;

    // Loop through every remaining enemy and trigger their fired shots simultaneously (staggered slightly by 120ms for visuals)
    this.enemyBodies.forEach((shootingEnemyBody, index) => {
      this.time.delayedCall(index * 120, () => {
        // Validate that the shooter is still alive (not blown up mid-firing due to simultaneous explosions)
        if (!shootingEnemyBody || !this.enemyBodies.includes(shootingEnemyBody)) {
          return;
        }

        // Precise launch coordinates matching where the projectile is actually spawned in spawnAndLaunchProjectile
        const launchStartX = shootingEnemyBody.x - 40;
        const launchStartY = shootingEnemyBody.y - 40;

        // High lobbing parabolic calculations (with beautiful flight curvature)
        // Find player position at trigger time. If player moved, AI recalcs target - extremely dynamic dodging game!
        const targetX = this.activePlayerUnit ? this.activePlayerUnit.x : this.levelData.playerStart.x;
        const targetY = this.activePlayerUnit ? this.activePlayerUnit.y : this.levelData.playerStart.y;

        // We want the mortar to climb 200-280px above heights to clear shield cover beautifully
        const heightApex = 240 + Math.random() * 50;
        const peakY = Math.min(launchStartY, targetY) - heightApex;

        // Matter physics gravity constant used for standard calculations is 0.40
        const g = 0.40;

        // Analytical flight segment solver
        const t_up = Math.sqrt(2 * Math.max(15, launchStartY - peakY) / g);
        const t_down = Math.sqrt(2 * Math.max(15, targetY - peakY) / g);
        const t_total = t_up + t_down;

        const totalDX = targetX - launchStartX;

        // Exact wind compensator: matches player-side trajectory prediction: const wX = strength * 0.003
        const wX = this.windSystem.getStrength() * 0.003;
        let baseVx = (totalDX - 0.5 * wX * t_total * t_total) / t_total;

        // Base vertical launch speed required to climb to the peakY altitude
        const baseVy = -g * t_up;

        // Inject level accuracy noise range
        const finalVx = baseVx + (Math.random() * 2 - 1) * noiseRange * 6;
        const finalVy = baseVy + (Math.random() * 2 - 1) * noiseRange * 6;

        this.spawnAndLaunchProjectile(finalVx, finalVy, true, launchStartX, launchStartY);
      });
    });
  }

  private checkGameEndStatus(): boolean {
    if (this.enemyBodies.length === 0) {
      // ALL ENEMIES SLAIN! WIN TRIGGER!
      this.triggerGameResult(true);
      return true;
    }
    // Also check if player HP has reached zero!
    if (this.playerHp <= 0) {
      this.triggerGameResult(false);
      return true;
    }
    return false;
  }

  // Allow manual horizontal move from React HUD touch buttons or cursors - Allow moving always to dodge!
  public triggerManualMove(dx: number) {
    if (!this.activePlayerUnit) return;
    const nextX = Phaser.Math.Clamp(this.activePlayerUnit.x + dx, 50, 420);
    this.activePlayerUnit.setPosition(nextX, this.activePlayerUnit.y);
    
    this.levelData.playerStart.x = nextX;
    this.levelData.playerStart.y = this.activePlayerUnit.y;
    
    if (this.playerAnchorBody) {
      this.matter.body.setPosition(this.playerAnchorBody, { x: nextX, y: this.activePlayerUnit.y });
    }
    
    // Animate a quick bobbing lift
    this.activePlayerUnit.setAngle(dx > 0 ? 15 : -15);
    this.time.delayedCall(160, () => {
      if (this.activePlayerUnit) this.activePlayerUnit.setAngle(0);
    });
    
    this.notifyHUD();
  }

  private triggerGameResult(isWin: boolean) {
    if (this.isGameEnded) return;
    this.isGameEnded = true;

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
      shieldUsesLeft: this.shieldUsesLeft,
      // Pass player and first enemy health percentage
      playerHp: Math.round((this.playerHp / this.playerMaxHp) * 100), 
      activeProjectileActive: this.activeProjectile !== null
    };

    // Broadcast through game global emitter safely
    this.game.events.emit("hud_update", hudState);
  }

  public activateShield(): boolean {
    if (this.isGameEnded) return false;
    if (this.shieldUsesLeft <= 0) {
      this.playBeep(120, 0.1);
      return false;
    }
    if (!this.activePlayerUnit) return false;

    this.shieldUsesLeft--;
    this.playBeep(880, 0.25);
    this.time.delayedCall(100, () => this.playBeep(1200, 0.2));

    this.spawnFloatingTxt(this.activePlayerUnit.x, this.activePlayerUnit.y - 45, "SHIELD CHARGED!", "#2ecc71");

    // Spawn a radiant glowing protective static energy wall in front of the player
    const sx = this.activePlayerUnit.x + 70;
    const sy = this.activePlayerUnit.y - 60;

    const shieldBlock = this.matter.add.image(sx, sy, 'block_glass', undefined, {
      isStatic: true,
      friction: 0.1,
      restitution: 0.3,
      label: 'block_glass'
    });
    shieldBlock.setDisplaySize(22, 160);
    shieldBlock.setTint(0x2ecc71); // Radiant neon green aura tint!
    shieldBlock.setAlpha(0.9);

    // Spawn green digital charge particles around the wall coordinates
    for (let i = 0; i < 15; i++) {
      const px = sx + Phaser.Math.Between(-15, 15);
      const py = sy + Phaser.Math.Between(-80, 80);
      const dot = this.add.circle(px, py, Phaser.Math.Between(3, 6), 0x2ecc71, 0.82);
      this.tweens.add({
        targets: dot,
        scale: 0,
        y: py - Phaser.Math.Between(20, 60),
        alpha: 0,
        duration: Phaser.Math.Between(500, 1000),
        onComplete: () => dot.destroy()
      });
    }

    // Keep handle reference so Matter.js runs full physical collisions on this shield
    this.blockBodies.push(shieldBlock);
    this.blockHealthMap.set(shieldBlock.body, {
      id: `shield_barrier_${this.shieldUsesLeft}`,
      hp: 1500, // Mega HP barrier protection!
      maxHp: 1500,
      material: 'glass'
    });

    this.notifyHUD();
    return true;
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

      osc.onended = () => {
        ctx.close().catch(() => {});
      };
    } catch (e) {
      // Audio context might be blocked
    }
  }

  private getAudioContext(): AudioContext | null {
    const state = SaveSystem.load();
    if (!state.settings.soundOn) return null;

    if (!this.audioCtx) {
      try {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        return null;
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  private startFlySound() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.stopFlySound();

    try {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // Sine wave works best for dynamic whistle/whoosh
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);

      gainNode.gain.setValueAtTime(0.0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.15); // Fade in whoosh

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();

      this.activeFlyOscillator = osc;
      this.activeFlyGain = gainNode;
    } catch (e) {
      // Audio issue
    }
  }

  private updateFlySound(speed: number, y: number) {
    const ctx = this.getAudioContext();
    if (!ctx || !this.activeFlyOscillator) return;

    try {
      // Whistle frequency changes as height/velocity changes
      const targetFreq = Phaser.Math.Clamp(280 + (speed * 16) + (600 - y) * 0.45, 180, 950);
      this.activeFlyOscillator.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.04);
    } catch (e) {
      // Audio issue
    }
  }

  private stopFlySound() {
    if (this.activeFlyOscillator) {
      const osc = this.activeFlyOscillator;
      const gainNode = this.activeFlyGain;
      this.activeFlyOscillator = null;
      this.activeFlyGain = null;

      try {
        const ctx = this.getAudioContext();
        if (ctx && gainNode) {
          gainNode.gain.cancelScheduledValues(ctx.currentTime);
          gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
          setTimeout(() => {
            try {
              osc.stop();
              osc.disconnect();
              gainNode.disconnect();
            } catch (err) {}
          }, 100);
        } else {
          osc.stop();
        }
      } catch (e) {
        // Fallback
      }
    }
  }

  private startAimCharge() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.stopAimCharge();

    try {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // Triangle/sawtooth wave hybrid gives a nice tension energy hum
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, ctx.currentTime);

      gainNode.gain.setValueAtTime(0.01, ctx.currentTime);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();

      this.aimOscillator = osc;
      this.aimGain = gainNode;
    } catch (e) {
      // Audio issue
    }
  }

  private updateAimCharge(dist: number) {
    const ctx = this.getAudioContext();
    if (!ctx || !this.aimOscillator || !this.aimGain) return;

    try {
      // Frequency rises from 120Hz to 480Hz as slingshot is stretched
      const targetFreq = 120 + (dist / 120) * 360;
      this.aimOscillator.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.03);

      // Volume increases slightly for physical tension representation
      const targetVol = Phaser.Math.Clamp(0.015 + (dist / 120) * 0.065, 0.015, 0.08);
      this.aimGain.gain.setValueAtTime(targetVol, ctx.currentTime);
    } catch (e) {
      // Audio issue
    }
  }

  private stopAimCharge() {
    if (this.aimOscillator) {
      const osc = this.aimOscillator;
      const gainNode = this.aimGain;
      this.aimOscillator = null;
      this.aimGain = null;

      try {
        const ctx = this.getAudioContext();
        if (ctx && gainNode) {
          gainNode.gain.cancelScheduledValues(ctx.currentTime);
          gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
          setTimeout(() => {
            try {
              osc.stop();
              osc.disconnect();
              gainNode.disconnect();
            } catch (err) {}
          }, 100);
        } else {
          osc.stop();
        }
      } catch (e) {
        // Fallback
      }
    }
  }

  private playBreakSound(material: string) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      if (material === 'glass') {
        // High-pitched crystalline clinking & shattering
        const freqs = [1900, 2600, 3700, 4400];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          osc.frequency.exponentialRampToValueAtTime(freq * 0.85, now + 0.12);

          gain.gain.setValueAtTime(0.05 - (idx * 0.008), now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1 + (idx * 0.04));

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.3);
        });
      } else if (material === 'wood') {
        // Snapping wooden plank sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);

        // Sharp dry crack transient
        const click = ctx.createOscillator();
        const clickG = ctx.createGain();
        click.type = 'sawtooth';
        click.frequency.setValueAtTime(140, now);
        clickG.gain.setValueAtTime(0.04, now);
        clickG.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        click.connect(clickG);
        clickG.connect(ctx.destination);
        click.start(now);
        click.stop(now + 0.04);
      } else if (material === 'stone') {
        // Rigid rocky/stone crash
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);

        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);

        // Low secondary rumble knock
        const low = ctx.createOscillator();
        const lowG = ctx.createGain();
        low.type = 'sine';
        low.frequency.setValueAtTime(85, now);
        lowG.gain.setValueAtTime(0.1, now);
        lowG.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        low.connect(lowG);
        lowG.connect(ctx.destination);
        low.start(now);
        low.stop(now + 0.18);
      } else if (material === 'tnt') {
        // Deep powerful explosion rumble
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(15, now + 0.35);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

        const sub = ctx.createOscillator();
        const subG = ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(70, now);
        sub.frequency.linearRampToValueAtTime(20, now + 0.4);
        subG.gain.setValueAtTime(0.35, now);
        subG.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

        osc.connect(gain);
        gain.connect(ctx.destination);
        sub.connect(subG);
        subG.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.45);
        sub.start(now);
        sub.stop(now + 0.45);
      } else {
        // Wet gelatinous pop/slime squeak for enemies
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.08);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      }
    } catch (e) {
      // Audio issue
    }
  }

  // --- Theme-driven customized visual terrain drawing & destructible craters ---

  private drawTerrain() {
    if (!this.terrainGraphics) return;
    const tg = this.terrainGraphics;
    tg.clear();
    const height = 600;

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
    } else if (this.levelData.themeColor === "#e6f8f5") { // Greenhouse
      leftGraveCol = 0x3b5bdb;
      leftTopCol = 0x12b886;
      rightBaseCol = 0x087f5b;
      rightTopCol = 0x12b886;
    } else if (this.levelData.themeColor === "#f5f5f7") { // Factory Industrial
      leftGraveCol = 0x495057;
      leftTopCol = 0xadb5bd;
      rightBaseCol = 0x212529;
      rightTopCol = 0xadb5bd;
    } else if (this.levelData.themeColor === "#fbf3db" || this.levelData.themeColor === "#fdf3e7") { // Desert
      leftGraveCol = 0x8c6239; 
      leftTopCol = 0xe67e22; 
      rightBaseCol = 0x7e5109;
      rightTopCol = 0xf5b041;
    } else if (this.levelData.themeColor === "#fdf8ef") { // Retreat
      leftGraveCol = 0x5c3d2e;
      leftTopCol = 0x865439;
      rightBaseCol = 0x3d2b1f;
      rightTopCol = 0xa87c66;
    } else if (this.levelData.themeColor === "#fdfbff" || this.levelData.themeColor === "#f6f3fc") { // Cyber/Marble
      leftGraveCol = 0x321f64;
      leftTopCol = 0x8250df;
      rightBaseCol = 0x1a0f3d;
      rightTopCol = 0xd2a6ff;
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

    // 1. Draw Left Cliff (Player side: x = 0 to 420)
    tg.fillStyle(leftGraveCol, 1);
    tg.fillRect(0, this.playerBaseY, 420, height - this.playerBaseY);
    tg.fillStyle(leftTopCol, 1);
    tg.fillRect(0, this.playerBaseY, 420, 16); // cap
    
    // Smooth high grass blades decoration on Player side
    tg.fillStyle(grassBladeCol, 1);
    for (let gx = 15; gx < 410; gx += 25) {
      tg.fillTriangle(gx, this.playerBaseY, gx + 6, this.playerBaseY - 10, gx + 12, this.playerBaseY);
    }

    // 2. Draw Middle Hill 1 (if active)
    if (this.hasMiddleHill1) {
      const midX = 480;
      const midY = 480;
      const midW = 110;
      tg.fillStyle(leftGraveCol, 1);
      tg.fillRect(midX, midY, midW, height - midY);
      tg.fillStyle(leftTopCol, 1);
      tg.fillRect(midX, midY, midW, 12);
      
      tg.fillStyle(grassBladeCol, 1);
      for (let gx = midX + 8; gx < midX + midW - 8; gx += 18) {
        tg.fillTriangle(gx, midY, gx + 4, midY - 6, gx + 8, midY);
      }
    }

    // 3. Draw Middle Hill 2 (if active)
    if (this.hasMiddleHill2) {
      const midX = 500;
      const midY = 420;
      const midW = 80;
      tg.fillStyle(rightBaseCol, 1);
      tg.fillRect(midX, midY, midW, height - midY);
      tg.fillStyle(rightTopCol, 1);
      tg.fillRect(midX, midY, midW, 12);
      
      tg.lineStyle(1.5, gridLineCol, 0.4);
      for (let rx = midX + 12; rx < midX + midW; rx += 20) {
        tg.lineBetween(rx, midY + 12, rx, height);
      }
    }

    // 4. Draw Right Cliff (Enemy side: x = 650 to 1024)
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
  }

  private getSkyColorAt(y: number): number {
    let skyTopColor = Phaser.Display.Color.HexStringToColor(this.levelData.themeColor).color;
    let skyBotColor = 0xeefbf4;
    
    if (this.levelData.themeColor === "#eefbe9") { 
      skyTopColor = 0xbce5fc; 
      skyBotColor = 0xeefbe9;
    } else if (this.levelData.themeColor === "#ffd5c6" || this.levelData.themeColor === "#ffede5") { 
      skyTopColor = 0xfd7e14; 
      skyBotColor = 0xffede5;
    } else if (this.levelData.themeColor === "#e5f0f8" || this.levelData.themeColor === "#edf1f2") { 
      skyTopColor = 0x4dabf7; 
      skyBotColor = 0xe5f0f8;
    } else if (this.levelData.themeColor === "#e6f8f5") { 
      skyTopColor = 0x0c8599; 
      skyBotColor = 0xe6f8f5;
    } else if (this.levelData.themeColor === "#f5f5f7") { 
      skyTopColor = 0xb0b5bc; 
      skyBotColor = 0xf5f5f7;
    } else if (this.levelData.themeColor === "#fbf3db" || this.levelData.themeColor === "#fdf3e7") { 
      skyTopColor = 0xfaad14; 
      skyBotColor = 0xfdf3e7;
    } else if (this.levelData.themeColor === "#fdf8ef") { 
      skyTopColor = 0xd8c29d; 
      skyBotColor = 0xfdf8ef;
    } else if (this.levelData.themeColor === "#fdfbff" || this.levelData.themeColor === "#f6f3fc") { 
      skyTopColor = 0x845ef7; 
      skyBotColor = 0xf6f3fc;
    }

    const ratio = Phaser.Math.Clamp(y / 600, 0, 1);
    
    const colorA = Phaser.Display.Color.IntegerToColor(skyTopColor);
    const colorB = Phaser.Display.Color.IntegerToColor(skyBotColor);
    
    const blended = Phaser.Display.Color.Interpolate.ColorWithColor(colorA, colorB, 100, ratio * 100);
    return blended.color;
  }

  private drawLauncherStand() {
    if (!this.trajectoryGraphics) return;
    const tg = this.trajectoryGraphics;
    
    // Only display launcher when player is active and projectile is idle
    if (!this.isPlayerTurn || this.activeProjectile) return;

    const startX = this.levelData.playerStart.x;
    const startY = this.levelData.playerStart.y;
    
    // Sleek physical girder base stand extending to the platform ground
    tg.lineStyle(5, 0xadb5bd, 1);
    tg.lineBetween(startX, startY + 5, startX, this.playerBaseY);
    
    tg.fillStyle(0x495057, 1);
    tg.fillCircle(startX, startY + 5, 7);
    
    // Left fork prong
    tg.lineStyle(3, 0x868e96, 1);
    tg.beginPath();
    tg.moveTo(startX, startY + 5);
    tg.lineTo(startX - 18, startY - 22);
    tg.strokePath();

    // Right fork prong
    tg.beginPath();
    tg.moveTo(startX, startY + 5);
    tg.lineTo(startX + 18, startY - 22);
    tg.strokePath();

    // Glowing energy emitters on tip of prongs
    tg.fillStyle(0x38d9a9, 0.95);
    tg.fillCircle(startX - 18, startY - 22, 4.5);
    tg.fillCircle(startX + 18, startY - 22, 4.5);
  }
}
