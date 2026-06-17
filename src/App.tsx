import React, { useEffect, useRef, useState } from 'react';
import { createGame } from './game/GameRoot';
import { Game } from 'phaser';

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

  useEffect(() => {
    // Prevent double initialization in React safe mode
    if (!gameRef.current) {
      const parentId = 'phaser-game-container';
      const gameInstance = createGame(parentId);
      gameRef.current = gameInstance;

      // Handle custom events mapped from GameScene
      gameInstance.events.on('hud_update', (data: HudData) => {
        setHudState(data);
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

    if (touchZoneRef.current) {
      const rect = touchZoneRef.current.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      const relativeY = clientY - rect.top;

      // Ensure click is occurring inside player launch zone sector (roughly left bottom, x < 360)
      if (relativeX < 360) {
        setIsSlingshotDragging(true);
        dragStart.current = { x: relativeX, y: relativeY };

        // Inform phaser scene
        const activeScene = gameRef.current?.scene.getScene('GameScene') as any;
        if (activeScene && typeof activeScene.updateAimingDetails === 'function') {
          activeScene.updateAimingDetails(true, relativeX, relativeY);
        }
      }
    }
  };

  // Global event listeners for tracking custom slingshot drag smoothly over the entire screen
  useEffect(() => {
    if (!isSlingshotDragging) return;

    const handleGlobalMove = (e: MouseEvent) => {
      const clientX = e.clientX;
      const clientY = e.clientY;

      if (touchZoneRef.current) {
        const rect = touchZoneRef.current.getBoundingClientRect();
        const relativeX = clientX - rect.left;
        const relativeY = clientY - rect.top;

        const activeScene = gameRef.current?.scene.getScene('GameScene') as any;
        if (activeScene && typeof activeScene.updateAimingDetails === 'function') {
          activeScene.updateAimingDetails(true, relativeX, relativeY);
        }
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

      if (touchZoneRef.current) {
        const rect = touchZoneRef.current.getBoundingClientRect();
        const relativeX = clientX - rect.left;
        const relativeY = clientY - rect.top;

        const activeScene = gameRef.current?.scene.getScene('GameScene') as any;
        if (activeScene && typeof activeScene.updateAimingDetails === 'function') {
          activeScene.updateAimingDetails(true, relativeX, relativeY);
        }
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

  return (
    <div id="artillery-app-root" className="min-h-screen w-full bg-gradient-to-b from-[#4A90E2] via-[#5c9ce6] to-[#2C3E50] flex flex-col items-center justify-between font-sans antialiased select-none text-slate-900 pb-6">
      
      {/* 1. Header Banner */}
      <header className="w-full max-w-7xl px-6 py-4 flex items-center justify-between border-b-4 border-black/15 bg-white/20 backdrop-blur-md z-10 rounded-b-2xl shadow-xl mt-1.5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-400 border-4 border-black px-1.5 py-1 rounded-2xl shadow-md font-bold text-slate-950 text-2xl flex items-center justify-center transform -rotate-6">
            🏰
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.4)]">
              Fortress Fury
            </h1>
            <p className="text-[10px] uppercase font-black text-yellow-300 drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)] tracking-wider font-bold">Animal Warriors</p>
          </div>
        </div>

        {/* Global info or highscores link */}
        <div className="flex items-center gap-4 text-xs font-black text-white">
          <div className="hidden sm:block bg-slate-900 border-4 border-black px-4 py-1.5 rounded-2xl shadow-md uppercase">
            <span className="text-slate-400 mr-2">Status:</span>
            <span className="text-emerald-400">● LIVE ENGINE</span>
          </div>
          <div className="bg-sky-400 border-4 border-black text-slate-950 px-4 py-1.5 rounded-2xl shadow-md uppercase">
            Phaser 3 + Matter.js
          </div>
        </div>
      </header>

      {/* 2. Main Game Board & Dashboard Layout */}
      <main className="w-full max-w-[1440px] px-4 flex-1 flex flex-col justify-center py-4">
        <div className="flex flex-col md:flex-row gap-4 items-stretch w-full justify-center">
          
          {/* Left Column: SQUAD Panel (15% width) - Only show when level state is loaded */}
          {hudState && (
            <div className="w-full md:w-[15%] bg-white/95 border-4 border-black rounded-3xl p-2.5 flex flex-col justify-between shadow-[6px_6px_0px_#000] min-w-[180px] max-h-[640px] overflow-y-auto animate-fade-in">
              <div>
                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-wider mb-2 border-b-2 border-black/10 pb-1 flex items-center justify-between">
                  <span>UNITS 🐾</span>
                  <span className="text-[8px] bg-slate-800 text-white rounded-full px-1.5 py-0.5 font-mono">ACTIVE</span>
                </h3>
                <div className="flex flex-col gap-1.5 mb-1.5">
                  {hudState.availableChars.map((char) => {
                    const isActive = hudState.selectedCharId === char.id;
                    const charEmoji = char.id === 'lumi' ? '🐱' : char.id === 'torbo' ? '🐗' : char.id === 'pico' ? '🐿️' : char.id === 'bumba' ? '🦎' : '🐈';
                    return (
                      <div
                        key={char.id}
                        onClick={() => handleSelectCharacter(char.id)}
                        className={`p-1 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all border-2 ${
                          isActive
                            ? 'bg-green-400 border-black ring-2 ring-yellow-400 ring-offset-1 shadow-sm scale-[1.01]'
                            : 'bg-white border-slate-300 hover:bg-slate-50 hover:border-black/60 shadow-inner opacity-90'
                        }`}
                      >
                        <div className="w-6 h-6 bg-white border border-black rounded-full flex items-center justify-center text-xs shadow-inner">
                          {charEmoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[9px] font-black uppercase text-slate-900 flex items-center justify-between leading-none truncate font-mono">
                            <span>{char.id}</span>
                            {isActive && <span className="text-[7px] text-slate-900 bg-yellow-300 border border-black/50 rounded px-0.5 font-bold">SEL</span>}
                          </div>
                          <div className="h-1 bg-black/20 rounded-full overflow-hidden border border-black/60 mt-0.5">
                            <div className="h-full bg-red-500 transition-all rounded-full" style={{ width: `${char.hp}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-amber-100/90 border-2 border-black rounded-xl p-1.5 text-[9px] text-slate-800 leading-tight font-semibold">
                <div className="font-black text-amber-900 text-[10px]">✏️ {hudState.availableChars.find(c => c.id === hudState.selectedCharId)?.name}</div>
                <p className="leading-snug mt-0.5 font-mono">{hudState.availableChars.find(c => c.id === hudState.selectedCharId)?.desc}</p>
                <div className="mt-1 text-slate-950 font-black text-[8px] bg-yellow-300/60 border border-black/20 rounded px-1 py-0.5 inline-block font-mono leading-none">
                  ⚡ 특수: {hudState.availableChars.find(c => c.id === hudState.selectedCharId)?.specialAbility}
                </div>
              </div>

              {/* Character manual controller inside the sidebar rail */}
              <div className="mt-2 p-1.5 bg-slate-900 rounded-xl border border-slate-800 flex flex-col gap-1">
                <span className="text-[8px] font-black text-slate-300 uppercase tracking-wider text-center font-mono">전술 기동 (MOVE)</span>
                <div className="flex gap-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleMovePlayer('left'); }}
                    className="flex-1 py-1 bg-slate-800 hover:bg-amber-400 hover:text-black font-black text-white text-[9px] rounded-md border border-slate-700 active:scale-95 transition-all text-center cursor-pointer font-bold"
                  >
                    ◀ LEFT [A]
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleMovePlayer('right'); }}
                    className="flex-1 py-1 bg-slate-800 hover:bg-amber-400 hover:text-black font-black text-white text-[9px] rounded-md border border-slate-700 active:scale-95 transition-all text-center cursor-pointer font-bold"
                  >
                    RIGHT ▶ [D]
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Center Column: Game Screen Canvas Container (70% or 100% width) */}
          <div className={`w-full ${hudState ? 'md:w-[70%]' : 'max-w-[1024px]'} flex flex-col items-center transition-all duration-300`}>
            {/* Active Level Header Row */}
            {hudState && (
              <div className="w-full flex flex-wrap items-center justify-between gap-1.5 mb-2 z-10 bg-slate-900/80 p-2 rounded-2xl border-2 border-black/20 animate-fade-in">
                {/* Stage Panel */}
                <div className="bg-yellow-400 border border-black px-2 py-0.5 rounded-xl shadow-sm flex flex-col justify-start">
                  <span className="text-[8px] uppercase font-bold text-slate-800 leading-none">STAGE {hudState.levelId}</span>
                  <span className="text-xs font-black text-slate-950 truncate max-w-[120px] leading-tight mt-0.5">
                    {hudState.levelName.split(':')[1] || hudState.levelName}
                  </span>
                </div>

                {/* Player HP Display */}
                <div className="bg-rose-50 border border-black px-2 py-0.5 rounded-xl shadow-sm flex items-center gap-1.5">
                  <span className="text-xs">❤️</span>
                  <div className="flex flex-col">
                    <span className="text-[8px] uppercase font-bold text-rose-800 leading-none font-mono">PLAYER HP</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="w-16 h-2 bg-black/20 rounded-full overflow-hidden border border-black/40">
                        <div 
                          className={`h-full transition-all duration-300 rounded-full ${hudState.playerHp > 50 ? 'bg-green-500' : hudState.playerHp > 25 ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} 
                          style={{ width: `${Math.max(0, Math.min(100, hudState.playerHp))}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-black text-rose-950 leading-none font-mono">{hudState.playerHp}%</span>
                    </div>
                  </div>
                </div>

                {/* Turn Budget Counter */}
                <div className="bg-white border border-black px-2.5 py-0.5 rounded-xl shadow-sm flex flex-col items-center justify-center">
                  <span className="text-[8px] uppercase font-bold text-slate-500 leading-none font-mono">TURN</span>
                  <span className={`text-xs font-black mt-0.5 font-mono ${hudState.maxTurns - hudState.currentTurn <= 1 ? 'text-red-600 animate-pulse' : 'text-slate-950'}`}>
                    {hudState.currentTurn} / {hudState.maxTurns}
                  </span>
                </div>

                {/* Real-time Wind vane visual */}
                <div className="bg-sky-100 border border-black px-2.5 py-0.5 rounded-xl shadow-sm flex flex-col items-center justify-center">
                  <span className="text-[8px] uppercase font-bold text-slate-500 leading-none font-mono">WIND</span>
                  {hudState.wind.direction === 'calm' ? (
                    <span className="text-[10px] font-black text-slate-800 mt-0.5 font-mono">CALM</span>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] font-black text-slate-950 mt-0.5 font-mono font-bold">
                      <span className={hudState.wind.direction === 'left' ? 'text-red-500' : 'text-emerald-600'}>
                        {hudState.wind.direction === 'left' ? '◀' : '▶'}
                      </span>
                      <span>{(hudState.wind.displayValue * 3).toFixed(1)}m/s</span>
                    </div>
                  )}
                </div>

                {/* Engine state status */}
                <div className="bg-slate-950 border border-black text-white px-2.5 py-0.5 rounded-xl shadow-sm flex flex-col items-center justify-center">
                  <span className="text-[8px] uppercase font-zinc-400 leading-none font-mono">STATE</span>
                  <span className={`text-[9px] font-black uppercase ${hudState.isPlayerTurn ? 'text-emerald-400' : 'text-rose-500 animate-pulse'}`}>
                    {hudState.isPlayerTurn ? 'READY' : 'FIRE'}
                  </span>
                </div>
              </div>
            )}

            {/* Game Viewport Stage Canvas - STABLE NODE */}
            <div className="w-full aspect-[1024/600] rounded-[24px] border-4 border-black bg-slate-950 shadow-[8px_8px_0px_#000000] overflow-hidden relative">
              <div id="phaser-game-container" className="w-full h-full" ref={gameParentRef}></div>
              
              {/* Drag Overlay with window listeners capturing pointer events */}
              {hudState && hudState.isPlayerTurn && !hudState.activeProjectileActive && (
                <div 
                  ref={touchZoneRef}
                  className="absolute inset-0 z-10 cursor-crosshair sm:pointer-events-auto animate-fade-in"
                  onMouseDown={handleTouchStart}
                  onTouchStart={handleTouchStart}
                >
                  {/* Visual guide overlay */}
                  <div className="absolute left-4 top-4 bg-slate-900/90 border border-slate-800 rounded-lg p-1.5 max-w-[210px] text-[10px] pointer-events-none font-medium leading-relaxed text-white shadow-lg">
                    <div className="text-amber-400 font-bold mb-0.5">🎮 드래그 사격 조작법</div>
                    <div>캐릭터 근처를 터치해 뒤로 당겼다가 놓으면 궤적선 방향으로 포탄을 발사합니다.</div>
                  </div>
                </div>
              )}
            </div>

            {/* Game Ticker Scores Display beneath Canvas */}
            {hudState && (
              <div className="w-full flex items-center justify-between mt-3 text-xs font-black py-2 gap-2 animate-fade-in">
                <div className="flex items-center gap-1.5 bg-yellow-400 border px-3 py-1 rounded-xl shadow-sm border-black text-slate-950 font-mono font-bold">
                  <span>SCORE:</span>
                  <span className="font-extrabold text-xs">{hudState.score.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-red-500 border px-3 py-1 rounded-xl shadow-sm border-black text-white font-mono font-bold">
                  <span>ENEMIES:</span>
                  <span className="font-extrabold text-xs">{hudState.enemiesLeft} / {hudState.enemiesTotal}</span>
                </div>
                <button
                  onClick={handleExitToSelect}
                  className="px-4 py-1 rounded-xl border border-black text-[11px] font-black text-slate-800 hover:text-black bg-white hover:bg-slate-100 transition-all text-center shadow-sm cursor-pointer font-bold"
                >
                  🚪 RETREAT (퇴 각)
                </button>
              </div>
            )}
          </div>

          {/* Right Column: WEAPONS chooser and Cannon stats controls (15% width) - Only show when level state is loaded */}
          {hudState && (
            <div className="w-full md:w-[15%] bg-white/95 border-4 border-black rounded-3xl p-2.5 flex flex-col justify-between shadow-[6px_6px_0px_#000] min-w-[180px] max-h-[640px] overflow-y-auto animate-fade-in">
              <div>
                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-wider mb-2 border-b-2 border-black/10 pb-1 font-sans">
                  WEAPONS 💣
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-1 gap-1.5 mb-1.5">
                  {hudState.availableWeapons.map((w) => {
                    const isActive = hudState.selectedWeaponId === w.id;
                    const hasAmmo = (hudState.ammoRemaining[w.id] ?? 99) > 0;
                    
                    let bgClass = 'bg-slate-100';
                    let emojiSpec = '💣';
                    if (w.id === 'standard') { bgClass = 'bg-orange-400'; emojiSpec = '💣'; }
                    else if (w.id === 'split_shot') { bgClass = 'bg-blue-300'; emojiSpec = '☄️'; }
                    else if (w.id === 'heavy_shell') { bgClass = 'bg-pink-400'; emojiSpec = '🔮'; }
                    else if (w.id === 'napalm_strike') { bgClass = 'bg-red-400'; emojiSpec = '🔥'; }
                    else if (w.id === 'bouncy_ball') { bgClass = 'bg-lime-400'; emojiSpec = '🏐'; }
                    else if (w.id === 'pierce_bullet') { bgClass = 'bg-cyan-400'; emojiSpec = '🚀'; }
                    else if (w.id === 'gravity_bomb') { bgClass = 'bg-violet-400'; emojiSpec = '🌀'; }
                    else if (w.id === 'inferno') { bgClass = 'bg-emerald-400'; emojiSpec = '☄️'; }

                    return (
                      <button
                        key={w.id}
                        id={`weapon-btn-${w.id}`}
                        disabled={!hasAmmo}
                        onClick={() => handleSelectWeapon(w.id)}
                        className={`p-1 rounded-lg border-2 flex items-center gap-1 transition-all text-left relative cursor-pointer ${
                          isActive
                            ? `${bgClass} border-black ring-2 ring-yellow-400 font-black scale-[1.01] shadow-inner`
                            : 'bg-white border-black/40 hover:bg-slate-50 hover:border-black shadow-sm'
                        } ${!hasAmmo ? 'opacity-30 cursor-not-allowed border-black/20' : ''}`}
                      >
                        <span className="text-sm">{emojiSpec}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-black uppercase text-slate-900 block truncate leading-none">
                            {w.name.split(' ')[0]}
                          </span>
                          <span className="text-[7px] font-mono leading-none text-slate-800 bg-black/10 px-1 rounded mt-0.5 inline-block font-bold">
                            {hudState.ammoRemaining[w.id] === undefined ? '무한' : `남음: ${hudState.ammoRemaining[w.id]}`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="bg-sky-50 border border-sky-200 rounded-xl p-1.5 text-[9px] text-slate-800 font-medium leading-tight">
                  <span className="font-black text-sky-950 text-[10px]">🔮 {hudState.availableWeapons.find(w => w.id === hudState.selectedWeaponId)?.name}: </span>
                  <p className="mt-0.5 leading-snug font-mono">{hudState.availableWeapons.find(w => w.id === hudState.selectedWeaponId)?.desc}</p>
                </div>
              </div>

              {/* Cannon Controls and Live Fire Button */}
              <div className="bg-yellow-400 border-2 border-black rounded-xl p-2 text-slate-950 mt-2 font-semibold">
                <h4 className="text-[9px] font-black text-slate-900 uppercase tracking-wider mb-1.5 border-b border-black/20 pb-0.5 font-mono">
                  CANNON 🎯
                </h4>
                
                {/* Angle slider */}
                <div className="mb-1.5">
                  <div className="flex items-center justify-between text-[9px] font-black mb-0.5 text-slate-900">
                    <span>각도 (DEG)</span>
                    <span className="text-red-700 font-extrabold text-[9px] bg-white border border-black px-1 rounded font-mono leading-none">{cannonAngle}°</span>
                  </div>
                  <input 
                    type="range"
                    min="10"
                    max="170"
                    value={cannonAngle}
                    onChange={(e) => setCannonAngle(Number(e.target.value))}
                    className="w-full accent-black cursor-pointer h-1 bg-white rounded-full appearance-none border border-black"
                  />
                </div>

                {/* Power slider */}
                <div className="mb-2">
                  <div className="flex items-center justify-between text-[9px] font-black mb-0.5 text-slate-900">
                    <span>파워 (PWR)</span>
                    <span className="text-amber-900 font-extrabold text-[9px] bg-white border border-black px-1 rounded font-mono leading-none">{cannonPower}%</span>
                  </div>
                  <input 
                    type="range"
                    min="15"
                    max="100"
                    value={cannonPower}
                    onChange={(e) => setCannonPower(Number(e.target.value))}
                    className="w-full accent-black cursor-pointer h-1 bg-white rounded-full appearance-none border border-black"
                  />
                </div>

                {/* Live fire button */}
                <button
                  id="fire-cannon-btn"
                  disabled={!hudState.isPlayerTurn || hudState.activeProjectileActive}
                  onClick={handleFireCannon}
                  className="w-full h-9 bg-red-600 hover:bg-red-700 text-white font-black rounded-lg border-2 border-black border-b-4 flex items-center justify-center select-none cursor-pointer active:scale-95 transition-all shadow-sm font-bold"
                >
                  <span className="text-[9px] font-black italic tracking-wide uppercase leading-none font-bold">
                    {!hudState.isPlayerTurn ? 'WAIT...' : hudState.activeProjectileActive ? 'FIRE...' : 'FIRE!'}
                  </span>
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* 4. Play Ticker */}
      {hudState && (
        <div className="w-full max-w-7xl px-6 flex flex-wrap items-center justify-between mt-4 text-xs font-black text-white py-3 gap-3 border-t-4 border-black/10">
          <div className="flex items-center gap-2 bg-yellow-400 border-4 border-black text-slate-950 px-3 py-1.5 rounded-2xl shadow-md">
            <span>TOTAL SCORE:</span>
            <span className="font-black text-sm">{hudState.score.toLocaleString()} PTS</span>
          </div>
          <div className="flex items-center gap-2 bg-red-500 border-4 border-black text-white px-3 py-1.5 rounded-2xl shadow-md">
            <span>ENEMIES LEFT:</span>
            <span className="font-black text-sm">{hudState.enemiesLeft} / {hudState.enemiesTotal}</span>
          </div>
          <div className="bg-white border-4 border-black text-slate-950 px-3 py-1.5 rounded-2xl shadow-md">
            <span>SYSTEM STATE: LIVE</span>
          </div>
        </div>
      )}
    </div>
  );
}
