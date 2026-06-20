import { Scene } from "phaser";
import { SaveSystem } from "../systems/SaveSystem";
import { LEVELS } from "../data/levels";

export interface ResultPayload {
  levelId: number;
  status: 'win' | 'lose';
  score: number;
  stars: number;
  turnsUsed: number;
}

export class ResultScene extends Scene {
  private payload!: ResultPayload;

  constructor() {
    super({ key: "ResultScene" });
  }

  init(data: ResultPayload) {
    this.payload = data || {
      levelId: 1,
      status: 'win',
      score: 1500,
      stars: 3,
      turnsUsed: 2
    };
  }

  create() {
    this.game.events.emit("scene_change", "ResultScene");

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Save level results
    if (this.payload.status === 'win') {
      SaveSystem.saveLevelResult(this.payload.levelId, this.payload.score, this.payload.stars);
    }

    // 1. Draw overlay background
    const bg = this.add.graphics();
    if (this.payload.status === 'win') {
      bg.fillGradientStyle(0xe6fcf5, 0xe6fcf5, 0xc3fae8, 0xc3fae8, 1); // Mint green win
    } else {
      bg.fillGradientStyle(0xfff5f5, 0xfff5f5, 0xffe3e3, 0xffe3e3, 1); // Pastel red lose
    }
    bg.fillRect(0, 0, width, height);

    // 2. Main cardboard box container shadow and layout
    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 1);
    panel.fillRoundedRect(width / 2 - 240, 80, 480, 440, 12);
    panel.lineStyle(4, this.payload.status === 'win' ? 0x2b8a3e : 0xc92a2a, 1);
    panel.strokeRoundedRect(width / 2 - 240, 80, 480, 440, 12);

    // 3. Status Heading label
    const headingText = this.payload.status === 'win' ? '★ 작전 성공 (VICTORY) ★' : '작전 실패 (DEFEAT)';
    const headingCol = this.payload.status === 'win' ? '#2b8a3e' : '#c92a2a';
    this.add.text(width / 2, 125, headingText, {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
      color: headingCol
    }).setOrigin(0.5);

    // Play victory or loss beeps
    if (this.payload.status === "win") {
      this.playToneSequence([523.25, 659.25, 783.99, 1046.50], [0.1, 0.1, 0.1, 0.25]);
    } else {
      this.playToneSequence([392.00, 349.23, 311.13, 261.63], [0.15, 0.15, 0.2, 0.35]);
    }

    // 4. Star animations if win
    if (this.payload.status === 'win') {
      const starsArr: Phaser.GameObjects.Graphics[] = [];
      const totalStars = this.payload.stars;

      for (let s = 0; s < 3; s++) {
        const starX = width / 2 + (s - 1) * 75;
        const starY = 205;

        const starG = this.add.graphics();
        starG.setScale(0); // For entry popping tween
        
        if (s < totalStars) {
          starG.fillStyle(0xffd43b, 1); // Shiny golden
          this.drawStar(starG, 0, 0, 5, 26, 12);
        } else {
          starG.fillStyle(0xe9ecef, 1); // Darker grayed unobtained
          this.drawStar(starG, 0, 0, 5, 26, 12);
        }

        starG.setPosition(starX, starY);
        starsArr.push(starG);

        this.tweens.add({
          targets: starG,
          scaleX: 1.0,
          scaleY: 1.0,
          angle: 360,
          duration: 400,
          delay: 150 + s * 220,
          ease: 'Back.easeOut'
        });
      }
    } else {
      // Skull or Sad face
      const emoticonText = this.add.text(width / 2, 205, '💀', {
        fontSize: '64px'
      }).setOrigin(0.5);
    }

    // 5. Statistics details
    const activeLevel = LEVELS.find(l => l.id === this.payload.levelId);
    const lvlName = activeLevel ? activeLevel.name.split(':')[1] || activeLevel.name : "스테이지";

    this.add.text(width / 2, 280, `${lvlName}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#495057'
    }).setOrigin(0.5);

    const scoreMeta = this.add.text(width / 2, 320, `획득 누적 점수: ${this.payload.score.toLocaleString()} 점`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#212529',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, 350, `투입 턴 점유율: ${this.payload.turnsUsed} 턴 째 완료`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#495057'
    }).setOrigin(0.5);

    // 6. Practical control buttons
    const createBtn = (x: number, y: number, text: string, color: number, callback: () => void) => {
      const g = this.add.graphics();
      const txt = this.add.text(x, y, text, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5);

      const w = 180;
      const h = 42;

      const redraw = (hover: boolean) => {
        g.clear();
        g.fillStyle(hover ? color - 0x111111 : color, 1);
        g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
        g.lineStyle(2, 0xffffff, 0.4);
        g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6);
      };

      redraw(false);

      const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => redraw(true));
      zone.on('pointerout', () => redraw(false));
      zone.on('pointerdown', () => {
        this.playToneSequence([440], [0.05]);
        callback();
      });
    };

    // Row coordinates for grid row layout
    if (this.payload.status === 'win' && this.payload.levelId < LEVELS.length) {
      // 3 buttons: Next, Replay, Map list
      createBtn(width / 2, 405, '다음 스테이지 ▶', 0x3b82f6, () => {
        this.scene.start("GameScene", { levelId: this.payload.levelId + 1 });
      });
      createBtn(width / 2 - 110, 465, '스테이지 다시 하기', 0x6b7280, () => {
        this.scene.start("GameScene", { levelId: this.payload.levelId });
      });
      createBtn(width / 2 + 110, 465, '선택 창으로', 0x10b981, () => {
        this.scene.start("LevelSelectScene");
      });
    } else {
      // 2 buttons: Replay, Map list
      createBtn(width / 2 - 110, 435, '다시 도전 하기', 0x3b82f6, () => {
        this.scene.start("GameScene", { levelId: this.payload.levelId });
      });
      createBtn(width / 2 + 110, 435, '스테이지 선택', 0x10b981, () => {
        this.scene.start("LevelSelectScene");
      });
    }
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

  private playToneSequence(freqs: number[], durations: number[] = []) {
    const state = SaveSystem.load();
    if (!state.settings.soundOn) return;

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      let delay = 0;

      freqs.forEach((freq, idx) => {
        const dur = durations[idx] || 0.15;
        this.time.delayedCall(delay * 1000, () => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + dur);
        });
        delay += dur;
      });
    } catch (e) {
      // Audio context might be blocked
    }
  }
}
