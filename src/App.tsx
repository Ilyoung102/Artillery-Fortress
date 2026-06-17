import React, { useEffect, useRef, useState } from 'react';
import { createGame } from './game/GameRoot';
import { Game } from 'phaser';
import { Settings, Volume2, VolumeX, HelpCircle, X, ChevronLeft, ChevronRight, Info, Maximize } from 'lucide-react';
import { SaveSystem } from './game/systems/SaveSystem';
import { LEVELS } from './game/data/levels';

// Interface matching Phaser GameScene.notifyHUD payload
interface HudData {
  levelId: number;
  levelName: string;
  theme: string;
  maxTurns: number;
  currentTurn: number;
  isPlayerTurn: boolean;
  score: number;
  wind: {
    currentStrength: number;
    displayValue: number;
    direction: 'left' | 'right' | 'calm';
  };
  selectedCharId: string;
  selectedWeaponId: string;
  availableChars: Array<{
    id: string;
    name: string;
    hp: number;
    weight: number;
    elasticity: number;
    specialAbility: string;
    colorHex: string;
    desc: string;
  }>;
  availableWeapons: Array<{
    id: string;
    name: string;
    damage: number;
    weight: number;
    elasticity: number;
    colorHex?: string;
    desc: string;
    ammoLimit: number;
    specialEffect?: string;
  }>;
  ammoRemaining: Record<string, number>;
  enemiesLeft: number;
  enemiesTotal: number;
  playerHp: number;
  activeProjectileActive: boolean;
}

export default function App() {
  const gameParentRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const touchZoneRef = useRef<HTMLDivElement>(null);

  // HUD state loaded dynamically from active Phaser GameScene
  const [hudState, setHudState] = useState<HudData | null>(null);

  // Manual Artillery Cannon sliders state (alternative mode)
  const [cannonAngle, setCannonAngle] = useState<number>(45);
  const [cannonPower, setCannonPower] = useState<number>(55);

  // Drag tracking variables for Slingshot drag inputs mapping
  const [isSlingshotDragging, setIsSlingshotDragging] = useState<boolean>(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Settings & Rules Modal overlay states
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [activeSceneKey, setActiveSceneKey] = useState<string>('BootScene');
  const [saveVersion, setSaveVersion] = useState<number>(0);

  // Load sound state on mount
  useEffect(() => {
    const data = SaveSystem.load();
    setSoundOn(data.settings?.soundOn ?? true);
  }, []);

  useEffect(() => {
    // Prevent double initialization in React safe mode
    if (!gameRef.current) {
      const parentId = 'phaser-game-container';
      
      // Clean up any remaining canvas elements from previous renders
      const container = document.getElementById(parentId);
      if (container) {
        container.innerHTML = '';
      }

      const gameInstance = createGame(parentId);
      gameRef.current = gameInstance;

      // Handle custom events mapped from GameScene
      gameInstance.events.on('hud_update', (data: HudData) => {
        setHudState(data);
      });

      gameInstance.events.on('scene_change', (sceneKey: string) => {
        setIsSettingsOpen(false);
        setActiveSceneKey(sceneKey);
        if (sceneKey !== 'GameScene') {
          setHudState(null);
        }
      });

      gameInstance.events.on('open_help', () => {
        setIsSettingsOpen(true);
      });

      gameInstance.events.on('reset_progress', () => {
        if (confirm("정말로 모든 게임 진행 레벨과 점수를 초기화하시겠습니까?")) {
          SaveSystem.resetProgress();
          window.location.reload();
        }
      });
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.events.off('hud_update');
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  // Sync manual slider trajectory guide on change if state is active
  useEffect(() => {
    if (gameRef.current && hudState && !hudState.activeProjectileActive && hudState.isPlayerTurn) {
      const activeScene = gameRef.current.scene.getScene('GameScene') as any;
      if (activeScene && typeof activeScene.updateAimingDetails === 'function') {
        // Compute manual launch specs just to render passive trajectory dots when sliders slide
        const angleRad = (cannonAngle * Math.PI) / 180;
        const speed = cannonPower * 0.22;
        const vx = Math.cos(angleRad) * speed;
        const vy = -Math.sin(angleRad) * speed;

        // Directly call scene graphics drawing
        activeScene.drawTrajectory(
          activeScene.levelData.playerStart.x,
          activeScene.levelData.playerStart.y,
          vx,
          vy
        );
      }
    }
  }, [cannonAngle, cannonPower, hudState?.selectedWeaponId, hudState?.selectedCharId]);

  // Execute manual cannon shot
  const handleFireCannon = () => {
    if (!gameRef.current || !hudState || !hudState.isPlayerTurn || hudState.activeProjectileActive) return;
    const activeScene = gameRef.current.scene.getScene('GameScene') as any;
    if (activeScene && typeof activeScene.launchCannon === 'function') {
      activeScene.launchCannon(cannonAngle, cannonPower);
    }
  };

  // Exit game scene and go back to stage selector
  const handleExitToSelect = () => {
    if (!gameRef.current) return;
    const activeScene = gameRef.current.scene.getScene('GameScene');
    if (activeScene) {
      // Return game to level selection
      activeScene.scene.start('LevelSelectScene');
      setHudState(null);
    }
  };

  // Select alternative weapon
  const handleSelectWeapon = (wId: string) => {
    if (!gameRef.current) return;
    const activeScene = gameRef.current.scene.getScene('GameScene') as any;
    if (activeScene && typeof activeScene.selectWeapon === 'function') {
      activeScene.selectWeapon(wId);
    }
  };

  // Select alternative character unit
  const handleSelectCharacter = (cId: string) => {
    if (!gameRef.current) return;
    const activeScene = gameRef.current.scene.getScene('GameScene') as any;
    if (activeScene && typeof activeScene.selectCharacter === 'function') {
      activeScene.selectCharacter(cId);
    }
  };

  // Move the player horizontally
  const handleMovePlayer = (dir: 'left' | 'right') => {
    if (!gameRef.current || !hudState || !hudState.isPlayerTurn || hudState.activeProjectileActive) return;
    const activeScene = gameRef.current.scene.getScene('GameScene') as any;
    if (activeScene && typeof activeScene.triggerManualMove === 'function') {
      activeScene.triggerManualMove(dir === 'left' ? -25 : 25);
    }
  };

  // Keep a reference to see the dragging flag without closures getting stale
  const isSlingshotDraggingRef = useRef(false);
  useEffect(() => {
    isSlingshotDraggingRef.current = isSlingshotDragging;
  }, [isSlingshotDragging]);

  // Phaser의 실제 1024x600 좌표 축으로 이벤트 터치 좌표를 일치시키는 컴버터
  const getPhaserCoords = (clientX: number, clientY: number) => {
    if (!touchZoneRef.current) return { x: 0, y: 0 };
    const rect = touchZoneRef.current.getBoundingClientRect();
    
    if (isPortrait) {
      // 90도 회전된 환경의 기하학적 보정 공식을 적용하여 수동 조준 타격 정밀 제어 완벽 연결
      const relativeX = clientY - rect.top;
      const relativeY = (rect.left + rect.width) - clientX;
      
      const scaleX = 1024 / (rect.height || 1);
      const scaleY = 600 / (rect.width || 1);
      
      return {
        x: Math.max(0, Math.min(1024, relativeX * scaleX)),
        y: Math.max(0, Math.min(600, relativeY * scaleY))
      };
    }

    const relativeX = clientX - rect.left;
    const relativeY = clientY - rect.top;
    
    // 1024x600 해상도와의 비율 계산
    const scaleX = 1024 / (rect.width || 1);
    const scaleY = 600 / (rect.height || 1);
    
    return {
      x: relativeX * scaleX,
      y: relativeY * scaleY
    };
  };

  const handleTouchEnd = () => {
    if (!isSlingshotDraggingRef.current || !hudState) return;
    setIsSlingshotDragging(false);

    const activeScene = gameRef.current?.scene.getScene('GameScene') as any;
    if (activeScene && typeof activeScene.updateAimingDetails === 'function') {
      const dx = activeScene.levelData.playerStart.x - activeScene.activePlayerUnit.x;
      const dy = activeScene.levelData.playerStart.y - activeScene.activePlayerUnit.y;
      
      // Stop rendering aiming trail
      activeScene.updateAimingDetails(false, 0, 0);

      // Trigger standard launch!
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        activeScene.launchSlingshot(dx, dy);
      }
    }
  };

  // --- Handlers for Slingshot drag tracking ---
  const handleTouchStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!hudState || !hudState.isPlayerTurn || hudState.activeProjectileActive) return;
    
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
      e.preventDefault(); // Prevent text selection/drag start in browser
    }

    const coords = getPhaserCoords(clientX, clientY);

    // Ensure click is occurring inside player launch zone sector (Phaser X < 380)
    if (coords.x < 380) {
      setIsSlingshotDragging(true);
      dragStart.current = { x: coords.x, y: coords.y };

      // Inform phaser scene
      const activeScene = gameRef.current?.scene.getScene('GameScene') as any;
      if (activeScene && typeof activeScene.updateAimingDetails === 'function') {
        activeScene.updateAimingDetails(true, coords.x, coords.y);
      }
    }
  };

  // Global event listeners for tracking custom slingshot drag smoothly over the entire screen
  useEffect(() => {
    if (!isSlingshotDragging) return;

    const handleGlobalMove = (e: MouseEvent) => {
      const clientX = e.clientX;
      const clientY = e.clientY;

      const coords = getPhaserCoords(clientX, clientY);
      const activeScene = gameRef.current?.scene.getScene('GameScene') as any;
      if (activeScene && typeof activeScene.updateAimingDetails === 'function') {
        activeScene.updateAimingDetails(true, coords.x, coords.y);
      }
    };

    const handleGlobalUp = () => {
      handleTouchEnd();
    };

    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
    };
  }, [isSlingshotDragging, hudState]);

  useEffect(() => {
    if (!isSlingshotDragging) return;

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const clientX = e.touches[0].clientX;
      const clientY = e.touches[0].clientY;

      const coords = getPhaserCoords(clientX, clientY);
      const activeScene = gameRef.current?.scene.getScene('GameScene') as any;
      if (activeScene && typeof activeScene.updateAimingDetails === 'function') {
        activeScene.updateAimingDetails(true, coords.x, coords.y);
      }
    };

    const handleGlobalTouchEnd = () => {
      handleTouchEnd();
    };

    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: true });
    window.addEventListener('touchend', handleGlobalTouchEnd);
    return () => {
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isSlingshotDragging, hudState]);

  const lockLandscape = () => {
    try {
      const screenAny = window.screen as any;
      if (screenAny && screenAny.orientation && screenAny.orientation.lock) {
        screenAny.orientation.lock("landscape").catch(() => {});
      } else if (screenAny.lockOrientation) {
        screenAny.lockOrientation("landscape");
      }
    } catch (e) {}
  };

  const playBeep = (freq: number, duration: number) => {
    if (!soundOn) return;
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
      // quiet
    }
  };

  const handleLaunchLevel = (levelId: number) => {
    lockLandscape();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }

    playBeep(520, 0.08);

    if (gameRef.current) {
      gameRef.current.scene.stop("MenuScene");
      gameRef.current.scene.stop("LevelSelectScene");
      gameRef.current.scene.start("GameScene", { levelId });
    }
  };

  const handleToggleSound = () => {
    const nextVal = !soundOn;
    SaveSystem.setSoundOn(nextVal);
    setSoundOn(nextVal);

    if (gameRef.current) {
      const activeScene = gameRef.current.scene.getScene('GameScene') as any;
      if (activeScene) {
        if (typeof activeScene.stopAimCharge === 'function') activeScene.stopAimCharge();
        if (typeof activeScene.stopFlySound === 'function') activeScene.stopFlySound();
      }
    }
  };

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [dismissPortraitGuide, setDismissPortraitGuide] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    // Run dynamic aspect ratio check immediately
    handleResize();

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    lockLandscape();

    // Extremely robust click/touch listener: triggers immediate fullscreen on first interaction
    const triggerFullscreenOnFirstInteract = () => {
      lockLandscape();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      // Remove to prevent multiple calls
      window.removeEventListener('click', triggerFullscreenOnFirstInteract, true);
      window.removeEventListener('touchstart', triggerFullscreenOnFirstInteract, true);
    };

    window.addEventListener('click', triggerFullscreenOnFirstInteract, true);
    window.addEventListener('touchstart', triggerFullscreenOnFirstInteract, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('click', triggerFullscreenOnFirstInteract, true);
      window.removeEventListener('touchstart', triggerFullscreenOnFirstInteract, true);
    };
  }, []);

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Fullscreen request failed: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const styleOverride: React.CSSProperties = isPortrait ? {
    position: 'fixed',
    top: '50%',
    left: '50%',
    width: '100vh',
    height: '100vw',
    transform: 'translate(-50%, -50%) rotate(90deg)',
    transformOrigin: 'center center',
    maxWidth: 'none',
    maxHeight: 'none',
  } : {};

  return (
    <div 
      id="artillery-app-root" 
      style={styleOverride}
      className="h-screen w-screen max-w-full max-h-full overflow-hidden bg-gradient-to-b from-[#111827] via-[#0f172a] to-[#020617] flex flex-col items-center justify-center font-sans antialiased select-none text-slate-100 p-1 sm:p-3 relative"
    >

      {/* Sleek Minimal Header - UI is completely focused inside the viewport element once you enter active stage */}
      {!hudState && (
        <header className="w-full max-w-[1024px] px-5 py-2.5 flex items-center justify-between border border-white/10 bg-slate-900/40 backdrop-blur-md z-10 rounded-2xl shadow-lg mb-2 animate-fade-in shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-400 border border-slate-950 rounded-xl shadow-md font-bold text-slate-950 text-base flex items-center justify-center transform -rotate-3">
              🏰
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                Fortress Fury
              </h1>
              <p className="text-[7.5px] uppercase font-bold text-yellow-300 tracking-widest font-mono">Animal Warriors</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-mono font-bold text-emerald-400 bg-black/40 px-2.5 py-0.5 rounded-lg border border-white/5 uppercase">
            ● Live Engine
          </div>
        </header>
      )}

      {/* Main Game Block */}
      <main className="w-full max-w-[1024px] max-h-[calc(100vh-20px)] flex flex-col items-center justify-center relative overflow-hidden shrink">
        <div className="w-full aspect-[1024/600] max-h-[min(92vh,600px)] rounded-[24px] border-4 border-slate-950 bg-slate-950 shadow-[0_10px_30px_rgba(0,0,0,0.8)] overflow-hidden relative select-none">
          {/* Phaser HTML Element */}
          <div id="phaser-game-container" className="w-full h-full" ref={gameParentRef}></div>
          
          {/* 🏰 Elegant React Main Menu & Level Grid Overlay */}
          {!hudState && (() => {
            const currentSave = SaveSystem.load();
            return (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-between bg-slate-950/80 backdrop-blur-sm p-3 text-center select-none animate-fade-in">
                
                {/* Lobby Header */}
                <div className="w-full flex justify-between items-center px-4 pt-1 pb-2 border-b border-white/5 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏰</span>
                    <div className="text-left">
                      <h2 className="text-base font-black tracking-tight text-white leading-tight">
                        Fortress Fury
                      </h2>
                      <p className="text-[8px] uppercase tracking-wider text-yellow-400 font-mono font-bold">Animal Warriors</p>
                    </div>
                  </div>
                  
                  {/* Status Indicator */}
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleToggleSound}
                      className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 hover:bg-white/15 rounded-xl cursor-pointer active:scale-95 transition-all text-xs text-slate-200"
                    >
                      {soundOn ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-zinc-500" />}
                      <span className="font-bold text-[10px] tracking-tight">{soundOn ? "소리 켬" : "소리 끔"}</span>
                    </button>

                    <button 
                      onClick={toggleFullscreen}
                      className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 hover:bg-white/15 rounded-xl cursor-pointer active:scale-95 transition-all text-xs text-slate-200"
                    >
                      <Maximize className="w-3.5 h-3.5 text-sky-400" />
                      <span className="font-bold text-[10px] tracking-tight">전체화면</span>
                    </button>
                  </div>
                </div>

                {/* Grid Grid Section */}
                <div className="w-full grow flex flex-col justify-center items-center overflow-y-auto px-1 py-1">
                  <p className="text-[10px] text-slate-300 font-semibold mb-2 tracking-wide">
                    ⚔️ 도전할 스테이지 레벨을 터치하여 요새 수호 전쟁을 시작하세요! (가로모드로 스마트폰을 회전하고 터치하시면 주소창이 가려집니다)
                  </p>
                  
                  <div className="grid grid-cols-6 sm:grid-cols-6 md:grid-cols-8 gap-1.5 w-full max-w-[620px] justify-center">
                    {LEVELS.map((level) => {
                      const record = currentSave.progress[level.id] || { levelId: level.id, unlocked: level.id === 1, highScore: 0, stars: 0 };
                      const isUnlocked = level.id === 1 || record.unlocked;
                      const starsAcquired = record.stars || 0;
                      
                      return (
                        <div 
                          key={level.id}
                          onClick={() => {
                            if (isUnlocked) {
                              handleLaunchLevel(level.id);
                            } else {
                              playBeep(220, 0.12); // Locked feedback sound
                            }
                          }}
                          className={`group relative aspect-[1.3/1] rounded-xl border flex flex-col items-center justify-between p-1 cursor-pointer transition-all duration-150 transform active:scale-95 select-none ${
                            isUnlocked 
                              ? "bg-slate-900/95 border-sky-500/30 hover:border-sky-400 hover:bg-slate-800/95 hover:shadow-[0_2px_8px_rgba(14,165,233,0.15)]" 
                              : "bg-slate-950/70 border-slate-900 filter grayscale opacity-35 cursor-not-allowed"
                          }`}
                        >
                          {/* Locked Badge */}
                          {!isUnlocked && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20 backdrop-blur-[0.5px] rounded-xl z-10">
                              <span className="text-[10px] bg-slate-900 border border-slate-800 p-0.5 rounded-full shadow-md">🔒</span>
                            </div>
                          )}

                          {/* Level ID number badge */}
                          <div className={`text-[7px] font-bold font-mono self-start rounded px-1 py-0.2 ${
                            isUnlocked ? "bg-sky-500/10 text-sky-400 border border-sky-500/10" : "bg-zinc-800 text-zinc-500"
                          }`}>
                            STG {level.id}
                          </div>

                          {/* Theme visual helper title / nickname */}
                          <div className="text-[8px] font-black text-slate-100 group-hover:text-yellow-300 transition-colors leading-[1.0] text-center my-0.5 max-w-full truncate px-0.5">
                            {level.name.split(':')[0] || "전투 훈련"}
                          </div>

                          {/* Stars Row representation */}
                          {isUnlocked ? (
                            <div className="flex gap-0.5 items-center justify-center self-stretch h-2.5">
                              {[0, 1, 2].map((starIdx) => (
                                <span 
                                  key={starIdx} 
                                  className={`text-[6.5px] filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] ${
                                    starIdx < starsAcquired ? "text-yellow-400 font-bold" : "text-zinc-650"
                                  }`}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[6.5px] text-zinc-650 font-bold">LOCKED</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer and Data resetting utility */}
                <div className="w-full flex justify-between items-center px-4 py-1.5 border-t border-white/5 shrink-0 text-[9px]">
                  <span className="text-zinc-500 font-mono">APP V2.2.0 // AUTO ROTATOR SYSTEM ENGAGES</span>
                  <button 
                    onClick={() => {
                      if (confirm("정말로 모든 게임 점수와 스테이지 도전을 초기화하시겠습니까?")) {
                        SaveSystem.resetProgress();
                        setSaveVersion(v => v + 1);
                        window.location.reload();
                      }
                    }}
                    className="text-red-400/80 hover:text-red-400 font-bold bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/30 active:scale-95 transition-all px-2.5 py-1 rounded-xl cursor-pointer"
                  >
                    데이터 전체 리셋 🔄
                  </button>
                </div>

              </div>
            );
          })()}
          
          {/* Slingshot Drag Zone Layer */}
          {hudState && hudState.isPlayerTurn && !hudState.activeProjectileActive && (
            <div 
              ref={touchZoneRef}
              className="absolute inset-0 z-10 cursor-crosshair sm:pointer-events-auto animate-fade-in"
              onMouseDown={handleTouchStart}
              onTouchStart={handleTouchStart}
            />
          )}

          {/* HUD GLASS OVERLAYS - FLUID INTEGRATED INSIDE MAIN GAMEBOARD */}
          {hudState && (
            <>
              {/* TOP FLOATING STATUS BAR (Stage info, wind direction, score, foes, HP, setup buttons) */}
              {/* 1. TOP LEFT: STAGE, WIND, AND TURN BUDGET (Compact Floating Row) */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 pointer-events-auto z-20 select-none">
                <div className="bg-yellow-400 text-slate-950 px-1.5 py-0.5 rounded-lg font-black text-[8px] font-mono shadow-md">
                  STAGE {hudState.levelId}
                </div>
                
                {/* Wind indicator */}
                <div className="flex items-center gap-1 text-[8px] text-zinc-300 font-mono bg-black/50 border border-white/10 px-2 py-0.5 rounded-lg shadow-md">
                  <span className="text-sky-300">WIND</span>
                  {hudState.wind.direction === 'calm' ? (
                    <span className="text-zinc-400 font-bold">CALM</span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-sky-200 font-bold">
                      <span className={hudState.wind.direction === 'left' ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {hudState.wind.direction === 'left' ? '◀' : '▶'}
                      </span>
                      <span>{(hudState.wind.displayValue * 3).toFixed(1)}m/s</span>
                    </span>
                  )}
                </div>

                {/* Turn budget */}
                <div className="flex items-center gap-1 text-[8px] text-zinc-300 font-mono bg-black/50 border border-white/10 px-2 py-0.5 rounded-lg shadow-md">
                  <span className="text-amber-400">TURN</span>
                  <span className={`font-bold ${hudState.maxTurns - hudState.currentTurn <= 1 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
                    {hudState.currentTurn}/{hudState.maxTurns}
                  </span>
                </div>
              </div>

              {/* 2. TOP RIGHT: STATUS, HP, SETTINGS AND RETREAT (Compact Floating Row) */}
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 pointer-events-auto z-20 select-none">
                {/* Score & Foes indicator */}
                <div className="bg-black/50 border border-white/10 px-2 py-0.5 rounded-lg flex items-center gap-1.5 font-mono shadow-md">
                  <div className="text-[8px] font-black text-amber-300 uppercase">
                    SCORE <span className="text-white ml-0.5 font-bold">{hudState.score.toLocaleString()}</span>
                  </div>
                  <div className="h-2.5 w-[1px] bg-white/15" />
                  <div className="text-[8px] font-black text-rose-300 uppercase">
                    FOES <span className="text-white ml-0.5 font-bold">{hudState.enemiesLeft}/{hudState.enemiesTotal}</span>
                  </div>
                </div>

                {/* Player HP */}
                <div className="flex items-center gap-1.5 bg-black/50 border border-white/10 px-2 py-0.5 rounded-lg shadow-md">
                  <span className="text-[8px]">❤️</span>
                  <div className="w-10 h-1 bg-black/45 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 rounded-full ${hudState.playerHp > 50 ? 'bg-emerald-400' : hudState.playerHp > 25 ? 'bg-amber-400' : 'bg-rose-500 animate-pulse'}`} 
                      style={{ width: `${Math.max(0, Math.min(100, hudState.playerHp))}%` }}
                    />
                  </div>
                  <span className="text-[8px] font-bold text-rose-200 font-mono">{hudState.playerHp}%</span>
                </div>

                {/* Fullscreen Toggle */}
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 bg-black/50 hover:bg-zinc-800 border border-white/10 text-sky-400 hover:text-white rounded-lg shadow-md transition-all cursor-pointer active:scale-90"
                  title="전체화면 토글"
                >
                  <Maximize className="w-3 h-3" />
                </button>

                {/* Settings gear */}
                <button
                  onClick={(e) => { e.stopPropagation(); setIsSettingsOpen(true); }}
                  className="p-1.5 bg-black/50 hover:bg-zinc-800 border border-white/10 text-yellow-400 hover:text-white rounded-lg shadow-md transition-all cursor-pointer active:scale-90"
                  title="게임 옵션 및 비기로그"
                >
                  <Settings className="w-3 h-3" />
                </button>

                {/* Exit stage retreat */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleExitToSelect(); }}
                  className="px-2 py-0.5 bg-rose-950/70 hover:bg-rose-900 border border-rose-500/20 text-rose-200 hover:text-white rounded-lg shadow-md transition-all cursor-pointer text-[7.5px] font-bold font-mono tracking-wider"
                >
                  🚪 RETREAT
                </button>
              </div>

              {/* 3. TOP LEFT STACKED: SQUAD QUICK SELECTOR (Planted Floating) */}
              <div className="absolute left-2.5 top-[42px] flex flex-col gap-1 pointer-events-auto z-20 select-none">
                {/* Character Choose Tiny Buttons */}
                <div className="flex gap-1 bg-black/35 border border-white/10 p-0.5 rounded-lg shadow-lg">
                  {hudState.availableChars.map((char) => {
                    const isActive = hudState.selectedCharId === char.id;
                    const charEmoji = char.id === 'lumi' ? '🐱' : char.id === 'torbo' ? '🐗' : char.id === 'pico' ? '🐿️' : char.id === 'bumba' ? '🦎' : '🐈';
                    return (
                      <button
                        key={char.id}
                        onClick={(e) => { e.stopPropagation(); handleSelectCharacter(char.id); }}
                        className={`px-1.5 py-0.5 rounded-md flex items-center gap-1 border transition-all text-left cursor-pointer ${
                          isActive
                            ? 'bg-emerald-500/80 border-emerald-400 text-white shadow-md scale-102 font-black'
                            : 'bg-black/50 border-white/5 hover:bg-black/70 text-zinc-300'
                        }`}
                        style={{ width: '68px' }}
                      >
                        <span className="text-[9.5px] shrink-0">{charEmoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[7.5px] font-black uppercase font-mono leading-none truncate">{char.id}</div>
                          <div className="h-0.5 bg-black/40 rounded-full overflow-hidden mt-0.5">
                            <div className="h-full bg-emerald-400" style={{ width: `${char.hp}%` }} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 🎮 Tactile Gamepad Left/Right keys - Reduced in size by 50% with clean 30% opacity styling and high-responsiveness */}
              <div className="absolute left-2.5 top-[50%] -translate-y-1/2 bg-slate-900/95 border border-white/15 rounded-xl p-1 flex gap-1 shadow-2xl w-[82px] pointer-events-auto z-20 select-none opacity-30 hover:opacity-80 active:opacity-100 transition-opacity duration-200">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleMovePlayer('left'); }}
                  className="flex-1 h-9 bg-black/60 hover:bg-amber-450 hover:text-slate-950 text-white rounded-lg border border-white/10 active:scale-90 transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-0.5"
                  title="Move Left [A]"
                >
                  <ChevronLeft className="w-4 h-4 text-amber-400" />
                  <span className="text-[6.5px] font-black tracking-tight leading-none font-sans">LEFT</span>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleMovePlayer('right'); }}
                  className="flex-1 h-9 bg-black/60 hover:bg-amber-450 hover:text-slate-950 text-white rounded-lg border border-white/10 active:scale-90 transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-0.5"
                  title="Move Right [D]"
                >
                  <ChevronRight className="w-4 h-4 text-amber-400" />
                  <span className="text-[6.5px] font-black tracking-tight leading-none font-sans">RIGHT</span>
                </button>
              </div>

              {/* 4. BOTTOM RIGHT: SCI-FI WEAPONS ROW & CASSINI PRECISION INPUTS */}
              <div className="absolute right-2.5 bottom-2.5 flex flex-col gap-1.5 pointer-events-auto z-20 select-none">
                {/* Weapons Horizontal Ribbon Grid */}
                <div className="flex gap-1 bg-black/35 border border-white/10 p-0.5 rounded-lg shadow-lg max-w-[210px] overflow-x-auto">
                  {hudState.availableWeapons.map((w) => {
                    const isActive = hudState.selectedWeaponId === w.id;
                    const hasAmmo = (hudState.ammoRemaining[w.id] ?? 99) > 0;
                    let bgClass = 'bg-orange-500/80 border-orange-400 text-white';
                    let emojiSpec = '💣';
                    if (w.id === 'standard') { bgClass = 'bg-orange-500/80 border-orange-400 text-white'; emojiSpec = '💣'; }
                    else if (w.id === 'split_shot') { bgClass = 'bg-sky-400/80 border-sky-300 text-white'; emojiSpec = '☄️'; }
                    else if (w.id === 'heavy_shell') { bgClass = 'bg-pink-500/80 border-pink-400 text-white'; emojiSpec = '🔮'; }
                    else if (w.id === 'napalm_strike') { bgClass = 'bg-red-500/80 border-red-400 text-white'; emojiSpec = '🔥'; }
                    else if (w.id === 'bouncy_ball') { bgClass = 'bg-lime-500/80 border-lime-400 text-white'; emojiSpec = '🏐'; }
                    else if (w.id === 'pierce_bullet') { bgClass = 'bg-cyan-500/80 border-cyan-400 text-white'; emojiSpec = '🚀'; }
                    else if (w.id === 'gravity_bomb') { bgClass = 'bg-violet-500/80 border-violet-400 text-white'; emojiSpec = '🌀'; }
                    else if (w.id === 'inferno') { bgClass = 'bg-emerald-500/80 border-emerald-400 text-white'; emojiSpec = '☄️'; }

                    return (
                      <button
                        key={w.id}
                        disabled={!hasAmmo}
                        onClick={(e) => { e.stopPropagation(); handleSelectWeapon(w.id); }}
                        className={`p-1 rounded-md border flex flex-col items-center justify-center transition-all text-center cursor-pointer relative shrink-0 ${
                          isActive
                            ? `${bgClass} shadow-md scale-102 font-black`
                            : 'bg-black/50 border-white/5 hover:bg-black/70 text-zinc-300'
                        } ${!hasAmmo ? 'opacity-20 cursor-not-allowed' : ''}`}
                        style={{ width: '38px', height: '36px' }}
                        title={w.name}
                      >
                        <span className="text-[11px] leading-none mb-0.5">{emojiSpec}</span>
                        <span className="text-[6px] font-mono leading-none font-bold">
                          {hudState.ammoRemaining[w.id] === undefined ? '∞' : `${hudState.ammoRemaining[w.id]}`}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Interactive sliders + Fire trigger button */}
                <div className="bg-black/20 border border-white/5 rounded-lg p-1 text-white font-mono flex flex-col gap-0.5 w-[110px] self-end shadow-md">
                  {/* Angle slider */}
                  <div>
                    <div className="flex items-center justify-between text-[6.5px] font-semibold">
                      <span>DEGREE</span>
                      <span className="text-amber-300 font-bold font-mono">{cannonAngle}°</span>
                    </div>
                    <input 
                      type="range"
                      min="10"
                      max="170"
                      value={cannonAngle}
                      onChange={(e) => setCannonAngle(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer h-0.5 bg-white/5 rounded appearance-none m-0 p-0"
                    />
                  </div>

                  {/* Power slider */}
                  <div>
                    <div className="flex items-center justify-between text-[6.5px] font-semibold mt-0.5">
                      <span>POWER</span>
                      <span className="text-amber-300 font-bold font-mono">{cannonPower}%</span>
                    </div>
                    <input 
                      type="range"
                      min="15"
                      max="100"
                      value={cannonPower}
                      onChange={(e) => setCannonPower(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer h-0.5 bg-white/5 rounded appearance-none m-0 p-0"
                    />
                  </div>

                  {/* Action Fire button */}
                  <button
                    disabled={!hudState.isPlayerTurn || hudState.activeProjectileActive}
                    onClick={(e) => { e.stopPropagation(); handleFireCannon(); }}
                    className="w-full mt-0.5 py-0.5 bg-rose-600/90 hover:bg-rose-700/90 border border-rose-500/20 text-white rounded font-bold transition-all text-center flex items-center justify-center disabled:opacity-30 cursor-pointer active:scale-[0.98]"
                    title="Artillery Shot [SPACE]"
                  >
                    <span className="text-[6.5px] font-black uppercase tracking-wide leading-none">
                      {!hudState.isPlayerTurn ? 'WAIT' : hudState.activeProjectileActive ? 'TRACK' : 'CANNON 🎯'}
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
      </main>

      {/* SYSTEM SETTINGS & GAMEPLAY INTEL MODAL DIALOG */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-45 flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="w-full max-w-2xl bg-slate-900 border-2 border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 text-lg">⚙️</span>
                <h2 className="text-sm sm:text-base font-black tracking-tight text-white uppercase font-mono">
                  Fortress Intel & System Configuration
                </h2>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-600 hover:text-white transition-all cursor-pointer text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-1">
              
              {/* Sound toggle panel */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-col justify-between">
                <div>
                  <h3 className="text-zinc-200 font-bold font-mono text-xs mb-1 uppercase flex items-center gap-1.5">
                    <span>🔊 Hardware Audio Controls</span>
                  </h3>
                  <p className="text-[10px] text-zinc-400 mb-3 leading-relaxed">
                    실시간 사운드 상태를 컨트롤합니다. 대포 조준 주파수 웅웅거림 효과음 및 비행 바람 가르는 리얼타임 휘슬음이 구현되어 있습니다.
                  </p>
                </div>
                
                <button
                  onClick={handleToggleSound}
                  className={`w-full py-1.5 px-3 rounded-lg border font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    soundOn 
                    ? 'bg-emerald-500/70 border-emerald-400 text-white' 
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                  }`}
                >
                  {soundOn ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>SOUND EFFECTS: ACTIVE (ON)</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3.5 h-3.5" />
                      <span>SOUND EFFECTS: MUTED (OFF)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Progress Reset panel */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-col justify-between">
                <div>
                  <h3 className="text-zinc-200 font-bold font-mono text-xs mb-1 uppercase">
                    ⚠️ Reset Game progress
                  </h3>
                  <p className="text-[10px] text-zinc-400 mb-3 leading-relaxed">
                    기록되어 있는 점수 및 스테이지 클리어 언락 내역과 저장 데이터를 초기화 한 후 1스테이지 목록으로 롤백합니다.
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    if (confirm("정말로 모든 게임 진행 레벨과 점수를 초기화하시겠습니까?")) {
                      SaveSystem.resetProgress();
                      window.location.reload();
                    }
                  }}
                  className="w-full py-1.5 px-3 rounded-lg border border-rose-500/40 bg-rose-950/20 text-rose-300 hover:bg-rose-900/60 hover:text-white transition-all font-black text-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  🗑️ RESET PROGRESS
                </button>
              </div>

              {/* Squad Troops explanation */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-3 col-span-1 md:col-span-2">
                <h3 className="text-amber-400 font-bold font-mono text-xs mb-2 uppercase">
                  🐾 SQUAD TROOPS DIRECTORY
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[9.5px]">
                  <div className="bg-black/25 p-2 rounded-xl border border-white/5">
                    <span className="font-bold text-zinc-200">🐱 LUMI (Ranger):</span>
                    <p className="text-zinc-400 mt-0.5">가장 가볍고 민첩함. 기본 포탄 사격. 날아가는 포물선 궤적이 장쾌하여 격돌 고도를 미세 타격하는 사격에 이상적입니다.</p>
                  </div>
                  <div className="bg-black/25 p-2 rounded-xl border border-white/5">
                    <span className="font-bold text-zinc-200">🐗 TORBO (Vanguard):</span>
                    <p className="text-zinc-400 mt-0.5">묵직한 멧돼지 돌격장군. 하강할 때 가속도가 붙으며, 접지 파괴 점프 범위가 아주 커서 조밀한 적 진영 붕괴용입니다.</p>
                  </div>
                  <div className="bg-black/25 p-2 rounded-xl border border-white/5">
                    <span className="font-bold text-zinc-200">🐿️ PICO (Artillery):</span>
                    <p className="text-zinc-400 mt-0.5">도토리 화염 연쇄 포격이 가능하며, 민첩하면서 정교한 투사 각도로 다점 피격 타점을 생성하는 화력 수급 요원.</p>
                  </div>
                  <div className="bg-black/25 p-2 rounded-xl border border-white/5">
                    <span className="font-bold text-zinc-200">🦎 BUMBA (Grenadier):</span>
                    <p className="text-zinc-400 mt-0.5">산성 점액 유탄 고폭탄두를 가공 분출. 장애물과 지면 지형 기공을 강력하게 부식시키는 침식 특장 전투병입니다.</p>
                  </div>
                </div>
              </div>

              {/* Weapons intel */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-3 col-span-1 md:col-span-2">
                <h3 className="text-sky-300 font-bold font-mono text-xs mb-2 uppercase">
                  💣 SCI-FI WEAPONS PROTOCOL
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[9.5px] text-zinc-400">
                  <div>
                    <span className="text-zinc-200 font-bold">• Standard Bomb (💣):</span> 기본 고성능 화약 성분의 기초 유탄.
                  </div>
                  <div>
                    <span className="text-zinc-200 font-bold">• Split Shot (☄️):</span> 비행 타겟 중 공중 폭산 분산되는 확산포.
                  </div>
                  <div>
                    <span className="text-zinc-200 font-bold">• Heavy Shell (🔮):</span> 묵직한 하강 질량으로 장갑벽을 단번에 부수는 대공포.
                  </div>
                  <div>
                    <span className="text-zinc-200 font-bold">• Napalm Strike (🔥):</span> 화염 장막 가연성 타르 지대를 주입하여 연속 도트 가스피해 유도.
                  </div>
                  <div>
                    <span className="text-zinc-200 font-bold">• Bouncy Ball (🏐):</span> 단단한 강도를 보강한 탄성 도면 바운싱 무쇠볼.
                  </div>
                  <div>
                    <span className="text-zinc-200 font-bold">• Pierce Bullet (🚀):</span> 암석 및 성벽 지대를 고속 회전하여 터널링해 안쪽에 폭사.
                  </div>
                  <div>
                    <span className="text-zinc-200 font-bold">• Gravity Bomb (🌀):</span> 적의 미세 파편과 잔해를 압밀해 중앙으로 모아 수축 폭발.
                  </div>
                  <div>
                    <span className="text-zinc-200 font-bold">• Inferno (☄️):</span> 하늘에서 운석 종렬포화 3발이 융단 포화하는 최고 무기.
                  </div>
                </div>
              </div>

              {/* Game keys shortcut panel */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-3 col-span-1 md:col-span-2 text-[10px] text-zinc-300 font-mono leading-relaxed">
                <span className="text-amber-400 font-bold text-[10.5px] uppercase block mb-1">⌨️ SYSTEM KEY CONTROLS</span>
                <div className="grid grid-cols-2 gap-2 text-[9.5px] text-zinc-400">
                  <div>• <span className="text-zinc-100">[A / D]</span> 또는 <span className="text-zinc-100">[◀ / ▶]</span> : 전술 캐릭터 수류 기동</div>
                  <div>• <span className="text-zinc-100">[W / S]</span> 또는 <span className="text-zinc-100">[▲ / ▼]</span> : 각도 조절</div>
                  <div>• <span className="text-zinc-100">[SPACE]</span> : 대포 수동 대포알 발사</div>
                  <div>• <span className="text-zinc-100">마우스 드래그 슬링샷</span> : 수동 당겨 조준 발사 조작</div>
                </div>
              </div>

            </div>

            {/* Modal Bottom close */}
            <div className="flex justify-end mt-4 border-t border-zinc-800 pt-3">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs transition-all cursor-pointer font-bold uppercase tracking-wider"
              >
                Close Intel
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* Landscape orientation forced; blocker removed to run unconditionally */}
    </div>
  );
}
