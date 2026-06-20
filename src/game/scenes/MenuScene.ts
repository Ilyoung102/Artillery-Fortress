import { Scene } from "phaser";
import { SaveSystem } from "../systems/SaveSystem";
import { LEVELS } from "../data/levels";

export class MenuScene extends Scene {
  private clouds: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super({ key: "MenuScene" });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const saveData = SaveSystem.load();

    // 1. 강제 다른 React 오버레이 제거 보장
    this.game.events.emit("scene_change", "MenuScene");

    // 2. 우아한 스카이 그라디언트 배경 그리기
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xe8f4fd, 0xe8f4fd, 0xd0e8f9, 0xd0e8f9, 1);
    bg.fillRect(0, 0, width, height);

    // 아름다운 풀밭 바닥 그리기 (안정적인 하단 배경)
    const floor = this.add.graphics();
    floor.fillStyle(0x7dc26b, 1);
    floor.fillRect(0, 480, width, 120);
    floor.fillStyle(0x6ba95a, 1);
    floor.fillRect(0, 505, width, 95);

    // 구름 오브젝트 생성 (흘러가는 패럴랙스 효과)
    for (let i = 0; i < 4; i++) {
      const cy = 35 + Math.random() * 85;
      const cx = Math.random() * width;
      const scale = 0.5 + Math.random() * 0.7;
      
      const cloud = this.add.graphics();
      cloud.fillStyle(0xffffff, 0.9);
      cloud.fillCircle(0, 0, 18);
      cloud.fillCircle(14, -10, 22);
      cloud.fillCircle(30, 0, 18);
      cloud.fillCircle(16, 8, 14);
      cloud.setPosition(cx, cy);
      cloud.setScale(scale);
      
      (cloud as any).speed = 0.15 + Math.random() * 0.25;
      this.clouds.push(cloud);
    }

    // 3. 게임 타이틀 헤더 텍스트
    const titleText = this.add.text(width / 2, 55, 'ARTILLERY FORTRESS', {
      fontFamily: '"Space Grotesk", "Segoe UI", system-ui, sans-serif',
      fontSize: '40px',
      fontStyle: '900',
      color: '#1a375d',
      letterSpacing: 2
    }).setOrigin(0.5);
    titleText.setStroke('#ffffff', 8);

    const subtitleText = this.add.text(width / 2, 95, '동물 전사들의 물리 엔진 기반 요새 파괴 전술 전략 게임', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      color: '#4e6a8e',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    subtitleText.setStroke('#ffffff', 4);

    // 4. 메인 메뉴 화면에 "진행 레벨 선택 그리드" (1~12 스테이지) 핵심 복원 구현
    const cols = 6;
    const itemWidth = 115;
    const itemHeight = 92;
    const paddingX = 142;
    const paddingY = 115;
    const startX = 158;
    const startY = 195;

    LEVELS.forEach((level, index) => {
      const c = index % cols;
      const r = Math.floor(index / cols);

      const x = startX + c * paddingX;
      const y = startY + r * paddingY;

      const record = saveData.progress[level.id] || { 
        levelId: level.id, 
        unlocked: level.id === 1, 
        highScore: 0, 
        stars: 0 
      };
      const isUnlocked = record.unlocked;

      const cardBg = this.add.graphics();
      
      const drawCardNormal = () => {
        cardBg.clear();
        if (isUnlocked) {
          cardBg.fillStyle(0xffffff, 1);
          cardBg.fillRoundedRect(x - itemWidth / 2, y - itemHeight / 2, itemWidth, itemHeight, 12);
          cardBg.lineStyle(3, 0x4dabf7, 1);
          cardBg.strokeRoundedRect(x - itemWidth / 2, y - itemHeight / 2, itemWidth, itemHeight, 12);
          // 안쪽 테두리 선
          cardBg.lineStyle(1, 0xe9ecef, 1);
          cardBg.strokeRoundedRect(x - itemWidth / 2 + 3, y - itemHeight / 2 + 3, itemWidth - 6, itemHeight - 6, 10);
        } else {
          cardBg.fillStyle(0xdee2e6, 0.7);
          cardBg.fillRoundedRect(x - itemWidth / 2, y - itemHeight / 2, itemWidth, itemHeight, 12);
          cardBg.lineStyle(2, 0xadb5bd, 1);
          cardBg.strokeRoundedRect(x - itemWidth / 2, y - itemHeight / 2, itemWidth, itemHeight, 12);
        }
      };

      const drawCardHover = () => {
        cardBg.clear();
        if (isUnlocked) {
          cardBg.fillStyle(0xeef8ff, 1);
          cardBg.fillRoundedRect(x - itemWidth / 2, y - itemHeight / 2, itemWidth, itemHeight, 12);
          cardBg.lineStyle(3, 0x228be6, 1);
          cardBg.strokeRoundedRect(x - itemWidth / 2, y - itemHeight / 2, itemWidth, itemHeight, 12);
        }
      };

      drawCardNormal();

      // 스테이지 텍스트 그리기
      if (isUnlocked) {
        // 스테이지 번호
        const stageNumStr = level.id < 10 ? `0${level.id}` : `${level.id}`;
        const indexText = this.add.text(x, y - 22, stageNumStr, {
          fontFamily: '"Space Grotesk", system-ui, sans-serif',
          fontSize: '28px',
          fontStyle: 'bold',
          color: '#1c7ed6'
        }).setOrigin(0.5);

        // 테마명
        const themeShort = level.theme.split(' ')[0] || "전장";
        const nameText = this.add.text(x, y + 8, themeShort, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#495057'
        }).setOrigin(0.5);

        // 획득한 별 별모양 드로잉
        const starGroup = this.add.graphics();
        const starsAcquired = record.stars || 0;
        
        for (let s = 0; s < 3; s++) {
          const starX = x + (s - 1) * 20;
          const starY = y + 28;
          if (s < starsAcquired) {
            starGroup.fillStyle(0xffd43b, 1);
            this.drawStar(starGroup, starX, starY, 5, 7, 3);
          } else {
            starGroup.fillStyle(0xe9ecef, 1);
            this.drawStar(starGroup, starX, starY, 5, 7, 3);
          }
        }

        // 클릭 및 호버 인터랙티브 구역 설정
        const zone = this.add.zone(x, y, itemWidth, itemHeight).setInteractive({ useHandCursor: true });
        zone.on('pointerover', () => drawCardHover());
        zone.on('pointerout', () => drawCardNormal());
        let cardTransitioned = false;
        zone.on('pointerdown', () => {
          if (cardTransitioned) return;
          cardTransitioned = true;
          this.playBeep(520, 0.08);
          this.time.delayedCall(30, () => {
            this.scene.start("GameScene", { levelId: level.id });
          });
        });
      } else {
        // 잠겨 있는 상태 표시물
        this.add.text(x, y - 10, '🔒', {
          fontSize: '22px'
        }).setOrigin(0.5);

        this.add.text(x, y + 16, '잠김 (Locked)', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '10px',
          color: '#868e96',
          fontStyle: 'normal'
        }).setOrigin(0.5);
      }
    });

    // 5. 하단 보조 세틀 액션 버튼 설계 (정확한 위치 조정으로 이벤트 겹침 버그 완전 방지)
    const createActionButton = (x: number, y: number, widthBtn: number, heightBtn: number, label: string, colorHex: number, callback: () => void) => {
      const btnBg = this.add.graphics();
      const text = this.add.text(x, y, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5);

      const drawNormal = () => {
        btnBg.clear();
        btnBg.fillStyle(colorHex, 1);
        btnBg.fillRoundedRect(x - widthBtn / 2, y - heightBtn / 2, widthBtn, heightBtn, 10);
        btnBg.lineStyle(2, 0xffffff, 0.2);
        btnBg.strokeRoundedRect(x - widthBtn / 2, y - heightBtn / 2, widthBtn, heightBtn, 10);
      };

      const drawHover = () => {
        btnBg.clear();
        btnBg.fillStyle(colorHex + 0x0c0c0c, 1);
        btnBg.fillRoundedRect(x - widthBtn / 2, y - heightBtn / 2, widthBtn, heightBtn, 10);
        btnBg.lineStyle(2, 0xffffff, 0.5);
        btnBg.strokeRoundedRect(x - widthBtn / 2, y - heightBtn / 2, widthBtn, heightBtn, 10);
      };

      const drawClick = () => {
        btnBg.clear();
        btnBg.fillStyle(colorHex - 0x111111, 1);
        btnBg.fillRoundedRect(x - widthBtn / 2, y - heightBtn / 2, widthBtn, heightBtn, 10);
        btnBg.lineStyle(2, 0x000000, 0.6);
        btnBg.strokeRoundedRect(x - widthBtn / 2, y - heightBtn / 2, widthBtn, heightBtn, 10);
      };

      drawNormal();

      // 넓고 명확한 터치/클릭 감지 구역 (이전보다 정확하게 분리)
      const zone = this.add.zone(x, y, widthBtn, heightBtn).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => drawHover());
      zone.on('pointerout', () => drawNormal());
      let btnTransitioned = false;
      zone.on('pointerdown', () => {
        if (btnTransitioned) return;
        btnTransitioned = true;
        drawClick();
        this.playBeep(440, 0.05);
        this.time.delayedCall(30, () => {
          callback();
        });
      });

      return { text, btnBg, zone };
    };

    // 하단 보조 제어 단추 레이아웃 (y = 425로 설정하여 스테이지 카드 영역과 넉넉히 격리)
    const btnY = 428;
    const btnWidth = 230;
    const btnHeight = 42;

    // 1번 단추: 조작 방법 & 동물도감 팝업 가이드
    createActionButton(270, btnY, btnWidth, btnHeight, '📖 조작 방법 & 도감 사전', 0x2563eb, () => {
      this.game.events.emit("open_help");
    });

    // 2번 단추: 실시간 사운드 토글
    const state = SaveSystem.load();
    const soundTextInit = state.settings.soundOn ? '🔊 사운드 효과: 켜짐' : '🔇 사운드 효과: 꺼짐';
    const soundBtn = createActionButton(512, btnY, btnWidth, btnHeight, soundTextInit, 0x0d9488, () => {
      const currentSave = SaveSystem.load();
      const nextSoundState = !currentSave.settings.soundOn;
      SaveSystem.setSoundOn(nextSoundState);
      
      // 사운드 라벨 실시간 갱신 및 효과음 피드백
      soundBtn.text.setText(nextSoundState ? '🔊 사운드 효과: 켜짐' : '🔇 사운드 효과: 꺼짐');
      if (nextSoundState) {
        this.playBeep(640, 0.08);
      }
    });

    // 3번 단추: 진행 데이터 초기화
    createActionButton(754, btnY, btnWidth, btnHeight, '🗑️ 게임 데이터 초기화', 0xe11d48, () => {
      this.game.events.emit("reset_progress");
    });


    // 6. 하단 조화로운 장식용 동물 캐릭터 바운싱 (베이스 캠프 부대원 느낌 연출)
    const decorativeLumi = this.add.image(110, 525, 'char_lumi').setAngle(5).setScale(1.3);
    this.tweens.add({
      targets: decorativeLumi,
      y: 508,
      angle: -5,
      yoyo: true,
      repeat: -1,
      duration: 1200,
      ease: 'Sine.easeInOut'
    });

    const decorativeTorbo = this.add.image(195, 520, 'char_torbo').setScale(1.2);
    this.tweens.add({
      targets: decorativeTorbo,
      scaleX: 1.15,
      scaleY: 0.92,
      yoyo: true,
      repeat: -1,
      duration: 800,
      ease: 'Sine.easeInOut'
    });

    this.add.text(145, 560, '우리 군 진영 (Player Camp)', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      color: '#4a6042',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // 우측 적 초소 장식
    const decorativeEnemy = this.add.image(width - 120, 518, 'enemy_standard').setAngle(-12).setScale(1.28);
    this.tweens.add({
      targets: decorativeEnemy,
      angle: 12,
      yoyo: true,
      repeat: -1,
      duration: 1500,
      ease: 'Sine.easeInOut'
    });

    this.add.text(width - 120, 560, '타격 타겟 적 요새 구조물', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      color: '#554242',
      fontStyle: 'bold'
    }).setOrigin(0.5);
  }

  update(time: number, delta: number) {
    const width = this.cameras.main.width;
    this.clouds.forEach(cloud => {
      cloud.x += (cloud as any).speed;
      if (cloud.x > width + 100) {
        cloud.x = -100;
        cloud.y = 35 + Math.random() * 85;
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
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio fallback
    }
  }
}
