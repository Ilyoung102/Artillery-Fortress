import { Scene } from "phaser";

export class PreloadScene extends Scene {
  constructor() {
    super({ key: "PreloadScene" });
  }

  preload() {
    // Elegant dynamic visual feedback for the user during assets generation
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const loadingText = this.add.text(width / 2, height / 2 - 50, '자원을 소집하는 중...', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '20px',
      color: '#495057'
    }).setOrigin(0.5);

    const percentText = this.add.text(width / 2, height / 2, '0%', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#868e96'
    }).setOrigin(0.5);

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0xe9ecef, 0.8);
    progressBox.fillRoundedRect(width / 2 - 160, height / 2 + 30, 320, 20, 6);

    this.load.on('progress', (value: number) => {
      percentText.setText(Math.round(value * 100) + '%');
      progressBar.clear();
      progressBar.fillStyle(0x4dabf7, 1);
      progressBar.fillRoundedRect(width / 2 - 156, height / 2 + 34, 312 * value, 12, 4);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });

    // We can load external audio buffers if we want, or generate beep placeholder tones via Web Audio API.
    // Let's generate our procedural visual textures right now.
  }

  create() {
    this.createProceduralTextures();
    // After creating procedural assets, skip the main menu/guides and start GameScene directly with Level 1combat
    this.scene.start("GameScene", { levelId: 1 });
  }

  private createProceduralTextures() {
    // Helper to streamline graphic texture creation
    const makeTexture = (key: string, width: number, height: number, drawFn: (g: Phaser.GameObjects.Graphics) => void) => {
      const g = this.add.graphics();
      drawFn(g);
      g.generateTexture(key, width, height);
      g.destroy();
    };

    // 1. Wood block texture (box)
    makeTexture('block_wood', 60, 60, (g) => {
      // Wood color background
      g.fillStyle(0xbc8f8f, 1); // Sandy brown
      g.fillRoundedRect(0, 0, 60, 60, 4);
      // Grain shadows
      g.fillStyle(0xa0522d, 1); // Sienna brown
      g.fillRect(3, 3, 54, 4);
      g.fillRect(3, 53, 54, 4);
      // Diagonals for planks
      g.lineStyle(2, 0x8b4513, 1);
      g.lineBetween(10, 10, 50, 50);
      g.lineBetween(10, 50, 50, 10);
      // Border
      g.lineStyle(3, 0x5c2c16, 1);
      g.strokeRoundedRect(0, 0, 60, 60, 4);
    });

    // 2. Stone block texture
    makeTexture('block_stone', 60, 60, (g) => {
      g.fillStyle(0x8c8c8c, 1); // Limestone gray
      g.fillRoundedRect(0, 0, 60, 60, 6);
      // Rocky texture highlight and shadows
      g.fillStyle(0xb3b3b3, 1);
      g.fillRect(4, 4, 52, 4);
      g.fillStyle(0x5c5c5c, 1);
      g.fillRect(4, 52, 52, 4);
      // Cracks
      g.lineStyle(2, 0x4d4d4d, 0.8);
      g.lineBetween(10, 15, 25, 30);
      g.lineBetween(25, 30, 15, 45);
      g.lineBetween(40, 20, 50, 35);
      // Dark border
      g.lineStyle(3, 0x333333, 1);
      g.strokeRoundedRect(0, 0, 60, 60, 6);
    });

    // 3. Metal block texture
    makeTexture('block_metal', 60, 60, (g) => {
      g.fillStyle(0x4a5d6e, 1); // Blueish steel
      g.fillRect(0, 0, 60, 60);
      // Specs plate highlight
      g.fillStyle(0x758c9f, 1);
      g.fillRect(3, 3, 54, 4);
      g.fillStyle(0x27313b, 1);
      g.fillRect(3, 53, 54, 4);
      // Metal rivets in corners
      g.fillStyle(0x9fc3db, 1);
      g.fillCircle(8, 8, 3);
      g.fillCircle(52, 8, 3);
      g.fillCircle(8, 52, 3);
      g.fillCircle(52, 52, 3);
      // Heavy border
      g.lineStyle(3, 0x1a2128, 1);
      g.strokeRect(0, 0, 60, 60);
    });

    // 4. Glass block texture
    makeTexture('block_glass', 60, 60, (g) => {
      g.fillStyle(0xb0e0e6, 0.6); // Powder blue transparent
      g.fillRoundedRect(0, 0, 60, 60, 8);
      // Dynamic shine diagonals
      g.fillStyle(0xffffff, 0.7);
      g.fillRect(5, 5, 50, 3);
      g.fillRect(5, 12, 18, 2);
      g.fillStyle(0x4682b4, 0.7);
      g.fillRect(5, 50, 50, 3);
      // High-contrast clean outline
      g.lineStyle(2, 0xe0f7fa, 0.9);
      g.strokeRoundedRect(2, 2, 56, 56, 8);
    });

    // 5. TNT explosives (super shiny!)
    makeTexture('block_tnt', 60, 60, (g) => {
      // Crimson base
      g.fillStyle(0xd9534f, 1);
      g.fillRect(0, 0, 60, 60);
      // Yellow hazard caution border
      g.lineStyle(4, 0xf0ad4e, 1);
      g.strokeRect(4, 4, 52, 52);
      // White caution banner
      g.fillStyle(0xffffff, 1);
      g.fillRect(6, 20, 48, 20);
      // Bold black "TNT" text is written manually or using simple vector lines:
      // Letter T
      g.lineStyle(3, 0x000000, 1);
      g.lineBetween(12, 24, 20, 24);
      g.lineBetween(16, 24, 16, 36);
      // Letter N
      g.lineBetween(23, 36, 23, 24);
      g.lineBetween(23, 24, 29, 36);
      g.lineBetween(29, 36, 29, 24);
      // Letter T
      g.lineBetween(32, 24, 40, 24);
      g.lineBetween(36, 24, 36, 36);
      
      // Heavy border
      g.lineStyle(3, 0x7c1512, 1);
      g.strokeRect(0, 0, 60, 60);
    });

    // 6. Characters
    // Lumi
    makeTexture('char_lumi', 40, 40, (g) => {
      g.fillStyle(0x4dabf7, 1); // Blue body
      g.fillCircle(20, 20, 18);
      // Face
      g.fillStyle(0xffffff, 1);
      g.fillCircle(14, 16, 5); // Eyes back
      g.fillCircle(26, 16, 5);
      g.fillStyle(0x212529, 1);
      g.fillCircle(15, 16, 2.5); // Pupils
      g.fillCircle(25, 16, 2.5);
      // Cheeks blush
      g.fillStyle(0xff8787, 0.7);
      g.fillCircle(9, 21, 3);
      g.fillCircle(31, 21, 3);
      // Leader forehead headband star
      g.fillStyle(0xffd43b, 1);
      g.fillTriangle(20, 6, 17, 11, 23, 11);
      // Outer stroke
      g.lineStyle(2.5, 0x1864ab, 1);
      g.strokeCircle(20, 20, 18);
    });

    // Torbo
    makeTexture('char_torbo', 50, 50, (g) => {
      g.fillStyle(0xffb3c6, 1); // Steel Pink solid armor body
      g.fillCircle(25, 25, 23);
      // Face
      g.fillStyle(0x495057, 1);
      g.fillCircle(18, 20, 6); // Eyes
      g.fillCircle(32, 20, 6);
      g.fillStyle(0xf8f9fa, 1);
      g.fillCircle(18, 19, 2); // Tiny shine
      g.fillCircle(32, 19, 2);
      // Golden tusks
      g.fillStyle(0xffec99, 1);
      g.fillTriangle(13, 28, 10, 36, 17, 32);
      g.fillTriangle(37, 28, 40, 36, 33, 32);
      // Snout
      g.fillStyle(0xff8ab4, 1);
      g.fillRoundedRect(19, 24, 12, 10, 3);
      // Metal helmet bands
      g.lineStyle(3, 0x495057, 1);
      g.lineBetween(5, 25, 45, 25);
      // Outer stroke
      g.lineStyle(3, 0xa61e4d, 1);
      g.strokeCircle(25, 25, 23);
    });

    // Pico
    makeTexture('char_pico', 30, 30, (g) => {
      g.fillStyle(0xffd43b, 1); // Golden Winged squirrel
      g.fillCircle(15, 15, 13);
      // Feather crest
      g.fillStyle(0xf59f00, 1);
      g.fillTriangle(15, 2, 11, 9, 19, 9);
      // Eyes (big, glowing)
      g.fillStyle(0x000000, 1);
      g.fillCircle(10, 14, 3);
      g.fillCircle(20, 14, 3);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(11, 13, 1.2);
      g.fillCircle(21, 13, 1.2);
      // Pink cheeks
      g.fillStyle(0xff8787, 0.8);
      g.fillCircle(7, 18, 2);
      g.fillCircle(23, 18, 2);
      // Stroke
      g.lineStyle(2, 0xd9480f, 1);
      g.strokeCircle(15, 15, 13);
    });

    // Bumba
    makeTexture('char_bumba', 44, 44, (g) => {
      g.fillStyle(0xfa5252, 1); // Crimson Chameleon Bomb
      g.fillCircle(22, 22, 20);
      // Fuse on top
      g.lineStyle(3, 0x343a40, 1);
      g.lineBetween(22, 4, 25, 0);
      g.fillStyle(0xffad06, 1);
      g.fillCircle(25, 0, 3); // Spark
      // Eyes (Crazy scope goggles)
      g.fillStyle(0x343a40, 1);
      g.fillCircle(14, 18, 7);
      g.fillCircle(30, 18, 7);
      g.fillStyle(0xffe066, 1);
      g.fillCircle(14, 18, 4);
      g.fillCircle(30, 18, 4);
      g.fillStyle(0x000000, 1);
      g.fillCircle(14, 18, 1.5);
      g.fillCircle(30, 18, 1.5);
      // Grumpy mouth
      g.lineStyle(2, 0x343a40, 1);
      g.lineBetween(17, 28, 27, 28);
      // Splash red stroke
      g.lineStyle(3, 0xb01a1a, 1);
      g.strokeCircle(22, 22, 20);
    });

    // Neo
    makeTexture('char_neo', 36, 36, (g) => {
      g.fillStyle(0xae3ec9, 1); // Cosmic Purple cat
      g.fillCircle(18, 18, 17);
      // Ears
      g.fillStyle(0x862e9c, 1);
      g.fillTriangle(6, 6, 2, 16, 10, 14);
      g.fillTriangle(30, 6, 34, 16, 26, 14);
      // Sci-fi goggles
      g.fillStyle(0x15aabf, 1);
      g.fillRoundedRect(7, 12, 22, 8, 2);
      g.fillStyle(0xe3fafc, 1);
      g.lineStyle(2, 0x0b7285, 1);
      g.strokeRoundedRect(7, 12, 22, 8, 2);
      g.fillRect(11, 14, 6, 4);
      g.fillRect(19, 14, 6, 4);
      // Whisker Lines
      g.lineStyle(1.5, 0xc2255c, 0.8);
      g.lineBetween(3, 22, 8, 23);
      g.lineBetween(33, 22, 28, 23);
      // Outer stroke
      g.lineStyle(2.5, 0x4a0e4e, 1);
      g.strokeCircle(18, 18, 17);
    });

    // 7. Enemy textures
    makeTexture('enemy_standard', 36, 36, (g) => {
      g.fillStyle(0x40c057, 1); // Goblin green slime-beast
      g.fillCircle(18, 18, 17);
      // Angered Eyes
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(8, 12, 15, 16, 10, 18);
      g.fillTriangle(28, 12, 21, 16, 26, 18);
      g.fillStyle(0xe03131, 1);
      g.fillCircle(12, 15, 2);
      g.fillCircle(24, 15, 2);
      // Sharp fangs smile
      g.lineStyle(2.5, 0x2b8a3e, 1);
      g.lineBetween(12, 24, 24, 24);
      // Little tooth
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(14, 24, 16, 28, 18, 24);
      g.fillTriangle(20, 24, 22, 28, 24, 24);
      // Outer stroke
      g.lineStyle(2.5, 0x235e2d, 1);
      g.strokeCircle(18, 18, 17);
    });

    // 8. Particle explosion circle
    makeTexture('smoke_particle', 8, 8, (g) => {
      g.fillStyle(0xffffff, 0.6);
      g.fillCircle(4, 4, 3.5);
    });
    
    makeTexture('fire_particle', 8, 8, (g) => {
      g.fillStyle(0xff761b, 1);
      g.fillCircle(4, 4, 3.5);
    });
  }
}
