import { Scene } from "phaser";
import { SaveSystem } from "../systems/SaveSystem";

export class MenuScene extends Scene {
  private soundToggleBtn!: Phaser.GameObjects.Text;
  private clouds: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super({ key: "MenuScene" });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const saveData = SaveSystem.load();

    // 1. Draw luxurious sky theme container
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xe8f4fd, 0xe8f4fd, 0xd0e8f9, 0xd0e8f9, 1);
    bg.fillRect(0, 0, width, height);

    // Draw stylized grass floor
    const floor = this.add.graphics();
    floor.fillStyle(0x7dc26b, 1);
    floor.fillRect(0, 500, width, 100);
    floor.fillStyle(0x6ba95a, 1);
    floor.fillRect(0, 515, width, 85);

    // 2. Spawn some moving drifting clouds
    for (let i = 0; i < 4; i++) {
      const cy = 60 + Math.random() * 120;
      const cx = Math.random() * width;
      const scale = 0.6 + Math.random() * 0.8;
      
      const cloud = this.add.graphics();
      cloud.fillStyle(0xffffff, 0.9);
      cloud.fillCircle(0, 0, 20);
      cloud.fillCircle(15, -10, 25);
      cloud.fillCircle(35, 0, 20);
      cloud.fillCircle(18, 10, 15);
      cloud.setPosition(cx, cy);
      cloud.setScale(scale);
      
      // Store some extra data on the cloud object itself
      (cloud as any).speed = 0.2 + Math.random() * 0.4;
      this.clouds.push(cloud);
    }

    // 3. Game Title Text (Artillery Fortress)
    const titleText = this.add.text(width / 2, 130, 'ARTILLERY FORTRESS', {
      fontFamily: '"Space Grotesk", "Segoe UI", system-ui, sans-serif',
      fontSize: '52px',
      fontStyle: 'bold',
      color: '#1a375d'
    }).setOrigin(0.5);
    
    // Add text shadow or double layered outline
    titleText.setStroke('#ffffff', 8);

    const subTitleText = this.add.text(width / 2, 185, '동물 전사들의 물리 기반 요새 타격 전략 게임', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#4e6a8e',
      fontStyle: 'normal'
    }).setOrigin(0.5);

    // 4. Interactive Action Buttons
    const createButton = (x: number, y: number, label: string, callback: () => void) => {
      const btnBg = this.add.graphics();
      const text = this.add.text(x, y, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5);

      const widthBtn = 240;
      const heightBtn = 48;

      const drawNormal = () => {
        btnBg.clear();
        btnBg.fillStyle(0x3b82f6, 1); // Blue
        btnBg.fillRoundedRect(x - widthBtn / 2, y - heightBtn / 2, widthBtn, heightBtn, 8);
        btnBg.lineStyle(2, 0x1d4ed8, 1);
        btnBg.strokeRoundedRect(x - widthBtn / 2, y - heightBtn / 2, widthBtn, heightBtn, 8);
      };

      const drawHover = () => {
        btnBg.clear();
        btnBg.fillStyle(0x2563eb, 1); // Darker blue
        btnBg.fillRoundedRect(x - widthBtn / 2, y - heightBtn / 2, widthBtn, heightBtn, 8);
        btnBg.lineStyle(2, 0x1d4ed8, 1);
        btnBg.strokeRoundedRect(x - widthBtn / 2, y - heightBtn / 2, widthBtn, heightBtn, 8);
      };

      const drawClick = () => {
        btnBg.clear();
        btnBg.fillStyle(0x1d4ed8, 1); // Extra dark
        btnBg.fillRoundedRect(x - widthBtn / 2, y - heightBtn / 2, widthBtn, heightBtn, 8);
        btnBg.lineStyle(2, 0x172554, 1);
        btnBg.strokeRoundedRect(x - widthBtn / 2, y - heightBtn / 2, widthBtn, heightBtn, 8);
      };

      drawNormal();

      // Make clickable
      const zone = this.add.zone(x, y, widthBtn, heightBtn).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => drawHover());
      zone.on('pointerout', () => drawNormal());
      zone.on('pointerdown', () => {
        drawClick();
        this.playBeep(440, 0.05);
      });
      zone.on('pointerup', () => {
        drawHover();
        callback();
      });

      return text;
    };

    // Button: Play Game
    createButton(width / 2, 270, '전투 시작 (Start Game)', () => {
      this.scene.start("LevelSelectScene");
    });

    // Button: Instructions
    createButton(width / 2, 335, '조작 방법 (How to Play)', () => {
      this.showHowToPlay();
    });

    // Button: Sound Settings Toggle
    const updateSoundText = () => {
      const state = SaveSystem.load();
      this.soundToggleBtn.setText(state.settings.soundOn ? '사운드: ON' : '사운드: OFF');
    };

    this.soundToggleBtn = createButton(width / 2, 400, '사운드: ON', () => {
      const state = SaveSystem.load();
      SaveSystem.setSoundOn(!state.settings.soundOn);
      updateSoundText();
    });
    updateSoundText();

    // Button: Reset Progress
    createButton(width / 2, 465, '진행 상황 초기화 (Reset)', () => {
      if (confirm('모든 클리어 기록과 점수가 지워집니다. 초기화하시겠습니까?')) {
        SaveSystem.resetProgress();
        alert('기록이 초기화되었습니다!');
        updateSoundText();
      }
    });

    // 5. Draw decorative simple units on the grass to look premium!
    const decorativeLumi = this.add.image(120, 480, 'char_lumi').setAngle(5).setScale(1.2);
    this.tweens.add({
      targets: decorativeLumi,
      y: 472,
      angle: -5,
      yoyo: true,
      repeat: -1,
      duration: 1200,
      ease: 'Sine.easeInOut'
    });

    const decorativeTorbo = this.add.image(210, 475, 'char_torbo').setScale(1.1);
    this.tweens.add({
      targets: decorativeTorbo,
      scaleX: 1.05,
      scaleY: 0.95,
      yoyo: true,
      repeat: -1,
      duration: 800,
      ease: 'Sine.easeInOut'
    });

    const decorativeEnemy = this.add.image(width - 150, 485, 'enemy_standard').setAngle(-10).setScale(1.2);
    this.tweens.add({
      targets: decorativeEnemy,
      angle: 10,
      yoyo: true,
      repeat: -1,
      duration: 1500,
      ease: 'Sine.easeInOut'
    });
  }

  update(time: number, delta: number) {
    const width = this.cameras.main.width;
    // Drift cloud assets
    this.clouds.forEach(cloud => {
      cloud.x += (cloud as any).speed;
      if (cloud.x > width + 100) {
        cloud.x = -100;
      }
    });
  }

  private showHowToPlay() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Dim bg overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, width, height);

    const dialog = this.add.graphics();
    dialog.fillStyle(0xffffff, 1);
    dialog.fillRoundedRect(width / 2 - 280, height / 2 - 200, 560, 400, 12);
    dialog.lineStyle(4, 0x3b82f6, 1);
    dialog.strokeRoundedRect(width / 2 - 280, height / 2 - 200, 560, 400, 12);

    const title = this.add.text(width / 2, height / 2 - 160, '★ ARTILLERY FORTRESS 조작법 ★', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#1e3a8a'
    }).setOrigin(0.5);

    const body = this.add.text(width / 2 - 240, height / 2 - 110, 
      "1. 새총 모드 (Slingshot UI):\n" +
      "   - 캐릭터 바로 좌측 조준 영역에서 소총처럼 '뒤로 드래그'하세요.\n" +
      "   - 드래그 거리는 발사 파워, 드래그 반대 방향이 사격 각도입니다.\n" +
      "   - 손가락이나 마우스 마우스를 놓으면 즉시 격치 발사됩니다!\n\n" +
      "2. 대포 모드 (Cannon UI):\n" +
      "   - 하단 슬라이더나 화살표로 각도와 발사 힘(Power)을 입력합니다.\n" +
      "   - 거대한 '발사(FIRE)' 버튼을 누르면 정밀 발사됩니다.\n\n" +
      "3. 핵심 승리 조건 & 바람:\n" +
      "   - 요새 안에 숨어 있는 적들을 턴 제한 초과 전에 몰살하세요.\n" +
      "   - 매 턴마다 부는 바람 세기와 방향이 화력 궤적을 왜곡합니다!\n" +
      "   - TNT 가스통을 무너뜨려 연쇄적인 폭발 폭삭 피해를 입히세요.\n" +
      "   - 각 캐릭터 특수 능력이나 강력한 대포 7종 주포를 선점하세요.", {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      color: '#374151',
      lineSpacing: 8
    });

    const closeBtnBg = this.add.graphics();
    const closeText = this.add.text(width / 2, height / 2 + 155, '이해했습니다, 닫기', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    closeBtnBg.fillStyle(0xef4444, 1);
    closeBtnBg.fillRoundedRect(width / 2 - 100, height / 2 + 135, 200, 40, 6);

    const zone = this.add.zone(width / 2, height / 2 + 155, 200, 40).setInteractive({ useHandCursor: true });
    
    const dismiss = () => {
      this.playBeep(330, 0.05);
      overlay.destroy();
      dialog.destroy();
      title.destroy();
      body.destroy();
      closeBtnBg.destroy();
      closeText.destroy();
      zone.destroy();
    };

    zone.on('pointerdown', dismiss);
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
      // Audio context might be blocked
    }
  }
}
