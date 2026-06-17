import { Scene } from "phaser";
import { SaveSystem } from "../systems/SaveSystem";
import { LEVELS } from "../data/levels";

export class LevelSelectScene extends Scene {
  constructor() {
    super({ key: "LevelSelectScene" });
  }

  create() {
    // Notify React to instantly lock and hide any lingering modal overlay dialogs
    this.game.events.emit("scene_change", "LevelSelectScene");

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Gradient sky background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xe8f4fd, 0xe8f4fd, 0xd0e8f9, 0xd0e8f9, 1);
    bg.fillRect(0, 0, width, height);

    // Decorative ground line
    const floor = this.add.graphics();
    floor.fillStyle(0x7dc26b, 1);
    floor.fillRect(0, 530, width, 70);

    // Header title
    this.add.text(width / 2, 50, '스테이지 선택 (Select Stage)', {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#1a375d'
    }).setOrigin(0.5);

    // Return button
    const backBtnBg = this.add.graphics();
    const backBtnText = this.add.text(120, 50, '◀ 메인 메뉴', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    backBtnBg.fillStyle(0x495057, 1);
    backBtnBg.fillRoundedRect(40, 30, 160, 40, 6);

    const backZone = this.add.zone(120, 50, 160, 40).setInteractive({ useHandCursor: true });
    backZone.on('pointerover', () => {
      backBtnBg.clear();
      backBtnBg.fillStyle(0x343a40, 1);
      backBtnBg.fillRoundedRect(40, 30, 160, 40, 6);
    });
    backZone.on('pointerout', () => {
      backBtnBg.clear();
      backBtnBg.fillStyle(0x495057, 1);
      backBtnBg.fillRoundedRect(40, 30, 160, 40, 6);
    });
    backZone.on('pointerdown', () => {
      this.playBeep(330, 0.05);
      this.scene.start("MenuScene");
    });

    // 12 Levels layout calculation (e.g., 4 columns x 3 rows grid)
    const cols = 4;
    const itemWidth = 160;
    const itemHeight = 110;
    const startX = width / 2 - ((cols - 1) * 200) / 2;
    const startY = 140;
    const paddingX = 200;
    const paddingY = 130;

    const saveData = SaveSystem.load();

    LEVELS.forEach((level, index) => {
      const c = index % cols;
      const r = Math.floor(index / cols);

      const x = startX + c * paddingX;
      const y = startY + r * paddingY;

      const record = saveData.progress[level.id] || { levelId: level.id, unlocked: level.id === 1, highScore: 0, stars: 0 };
      const isUnlocked = record.unlocked;

      const boxGraphics = this.add.graphics();
      
      if (isUnlocked) {
        // Unlocked styling: Clean soft white boxes with Blue accents
        boxGraphics.fillStyle(0xffffff, 1);
        boxGraphics.fillRoundedRect(x - itemWidth / 2, y - itemHeight / 2, itemWidth, itemHeight, 8);
        boxGraphics.lineStyle(3, 0x4dabf7, 1);
        boxGraphics.strokeRoundedRect(x - itemWidth / 2, y - itemHeight / 2, itemWidth, itemHeight, 8);

        // Stage number
        this.add.text(x, y - 25, `${level.id}`, {
          fontFamily: '"Space Grotesk", system-ui, sans-serif',
          fontSize: '32px',
          fontStyle: 'bold',
          color: '#1c7ed6'
        }).setOrigin(0.5);

        // Stage short description or short title
        const shortName = level.name.split(':')[0] || "스테이지";
        this.add.text(x, y + 10, shortName, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#495057'
        }).setOrigin(0.5);

        // Draw acquired stars on bottom of block
        const starsAcquired = record.stars || 0;
        const starGroup = this.add.graphics();
        starGroup.fillStyle(0xffd43b, 1); // Yellow
        
        for (let s = 0; s < 3; s++) {
          const starX = x + (s - 1) * 22;
          const starY = y + 36;
          
          if (s < starsAcquired) {
            // Draw filled star diamond/polygon
            starGroup.fillStyle(0xffd43b, 1);
            this.drawStar(starGroup, starX, starY, 5, 8, 4);
          } else {
            // Draw gray unreached star
            starGroup.fillStyle(0xdee2e6, 1);
            this.drawStar(starGroup, starX, starY, 5, 8, 4);
          }
        }

        // Zone for hover and interaction
        const zone = this.add.zone(x, y, itemWidth, itemHeight).setInteractive({ useHandCursor: true });
        
        zone.on('pointerover', () => {
          boxGraphics.clear();
          boxGraphics.fillStyle(0xeef8ff, 1);
          boxGraphics.fillRoundedRect(x - itemWidth / 2, y - itemHeight / 2, itemWidth, itemHeight, 8);
          boxGraphics.lineStyle(3, 0x228be6, 1);
          boxGraphics.strokeRoundedRect(x - itemWidth / 2, y - itemHeight / 2, itemWidth, itemHeight, 8);
        });

        zone.on('pointerout', () => {
          boxGraphics.clear();
          boxGraphics.fillStyle(0xffffff, 1);
          boxGraphics.fillRoundedRect(x - itemWidth / 2, y - itemHeight / 2, itemWidth, itemHeight, 8);
          boxGraphics.lineStyle(3, 0x4dabf7, 1);
          boxGraphics.strokeRoundedRect(x - itemWidth / 2, y - itemHeight / 2, itemWidth, itemHeight, 8);
        });

        zone.on('pointerdown', () => {
          this.playBeep(520, 0.08);
          this.scene.start("GameScene", { levelId: level.id });
        });

      } else {
        // Locked Stage styling
        boxGraphics.fillStyle(0xdee2e6, 0.8); // Grayed fill
        boxGraphics.fillRoundedRect(x - itemWidth / 2, y - itemHeight / 2, itemWidth, itemHeight, 8);
        boxGraphics.lineStyle(2, 0xadb5bd, 1);
        boxGraphics.strokeRoundedRect(x - itemWidth / 2, y - itemHeight / 2, itemWidth, itemHeight, 8);

        // Lock icon representation
        this.add.text(x, y - 10, '🔒', {
          fontSize: '28px'
        }).setOrigin(0.5);

        this.add.text(x, y + 25, '잠김 (Locked)', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          fontStyle: 'normal',
          color: '#868e96'
        }).setOrigin(0.5);
      }
    });
  }

  private drawStar(g: Phaser.GameObjects.Graphics, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    g.beginPath();
    g.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      g.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      g.lineTo(x, y);
      rot += step;
    }
    g.lineTo(cx, cy - outerRadius);
    g.closePath();
    g.fillPath();
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
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // audio error block
    }
  }
}
