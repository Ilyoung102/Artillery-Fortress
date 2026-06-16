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
    }

    if (touchZoneRef.current) {
      const rect = touchZoneRef.current.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      const relativeY = clientY - rect.top;

      // Ensure click is occurring inside player launch zone sector (roughly left bottom, x < 350)
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

  const handleTouchMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isSlingshotDragging || !hudState) return;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

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

  const handleTouchEnd = () => {
    if (!isSlingshotDragging || !hudState) return;
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
            <p className="text-[10px] uppercase font-black text-yellow-300 drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)] tracking-wider">Animal Warriors</p>
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
      <main className="w-full max-w-7xl px-4 flex-1 flex flex-col lg:flex-row items-center justify-center gap-4 py-4">
        
        {/* Playable Stage Wrapper with HTML/React Overlay panels */}
        <div className="flex-1 flex flex-col items-center max-w-full">
          
          {/* Active Level Header - shows up only when in actual game scene */}
          {hudState && (
            <div className="w-full max-w-[1024px] flex flex-wrap items-center justify-between gap-4 mb-3 z-10">
              {/* Stage Panel */}
              <div className="bg-yellow-400 border-4 border-black px-4 py-1.5 rounded-2xl shadow-md flex flex-col justify-start">
                <span className="text-[10px] uppercase font-bold text-slate-800/80 leading-none">STAGE {hudState.levelId}</span>
                <span className="text-sm font-black text-slate-950 truncate max-w-[150px]">{hudState.levelName.split(':')[1] || hudState.levelName}</span>
              </div>

              {/* Turn Budget Counter */}
              <div className="bg-white border-4 border-black px-4 py-1.5 rounded-2xl shadow-md flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 leading-none">TURN BUDGET</span>
                <span className={`text-base font-black ${hudState.maxTurns - hudState.currentTurn <= 1 ? 'text-red-600 animate-pulse' : 'text-slate-950'}`}>
                  {hudState.currentTurn} / {hudState.maxTurns}
                </span>
              </div>

              {/* Real-time Wind vane visual */}
              <div className="bg-sky-100 border-4 border-black px-4 py-1.5 rounded-2xl shadow-md flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 leading-none">WIND VELOCITY</span>
                {hudState.wind.direction === 'calm' ? (
                  <span className="text-sm font-black text-slate-800">0.0 m/s CALM</span>
                ) : (
                  <div className="flex items-center gap-1 text-sm font-black text-slate-950">
                    <span className={hudState.wind.direction === 'left' ? 'text-red-500' : 'text-emerald-600'}>
                      {hudState.wind.direction === 'left' ? '◀ WEST' : '▶ EAST'}
                    </span>
                    <span>{(hudState.wind.displayValue * 3).toFixed(1)} m/s</span>
                  </div>
                )}
              </div>

              {/* Status Banner element */}
              <div className="bg-slate-950 border-4 border-black text-white px-4 py-1.5 rounded-2xl shadow-md flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 leading-none font-mono">ENGINE STATE</span>
                <span className={`text-xs font-black uppercase tracking-wider ${hudState.isPlayerTurn ? 'text-emerald-400 font-bold' : 'text-rose-500 font-bold'}`}>
                  {hudState.isPlayerTurn ? '사격 대기 (READY)' : '적 폭격 중 (DEFEND)'}
                </span>
              </div>
            </div>
          )}

          {/* Phaser Canvas container */}
          <div className="w-full max-w-[1024px] aspect-[1024/600] rounded-[24px] border-4 border-black bg-slate-950 shadow-[8px_8px_0px_#000000] overflow-hidden relative">
            <div id="phaser-game-container" className="w-full h-full" ref={gameParentRef}></div>

            {/* Drag capturing layer mapped specifically to left launch zone (used overlay for smooth React drag inputs) */}
            {hudState && hudState.isPlayerTurn && !hudState.activeProjectileActive && (
              <div 
                ref={touchZoneRef}
                className="absolute inset-0 z-10 cursor-crosshair sm:pointer-events-auto"
                onMouseDown={handleTouchStart}
                onMouseMove={handleTouchMove}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Visual guideline hint to prompt user */}
                <div className="absolute left-6 top-6 bg-slate-900/90 border border-slate-800 rounded-lg p-2 max-w-[240px] text-[11px] pointer-events-none font-medium leading-relaxed shadow-lg">
                  <div className="text-amber-400 font-bold mb-1">🎮 조작 방식 안내</div>
                  <div>1. 캐릭터 주위를 뒤로 당기면 새총 충전선이 늘어납니다.</div>
                  <div>2. 하단 게이지로 각도 조절 후 <strong className="text-rose-400">포격 발사</strong>를 이용하셔도 좋습니다!</div>
                </div>
              </div>
            )}
            
            {/* Overlay if not active state */}
            {!hudState && (
              <div className="absolute inset-0 bg-slate-950/20 pointer-events-none"></div>
            )}
          </div>

          {/* 3. Bottom Panels: Controls, Angle, Power & Fire */}
          {hudState && (
            <div className="w-full max-w-[1024px] mt-6 grid grid-cols-1 md:grid-cols-12 gap-5">
              
              {/* Characters Selection and Info */}
              <div className="md:col-span-4 bg-white/95 border-4 border-black rounded-3xl p-4 flex flex-col justify-between shadow-[6px_6px_0px_#000]">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-3 border-b-2 border-black/10 pb-1 flex items-center justify-between">
                    <span>UNIT SQUAD 🐾</span>
                    <span className="text-[10px] bg-slate-800 text-white rounded-full px-2 py-0.5">ACTIVE</span>
                  </h3>
                  <div className="flex flex-col gap-2.5 mb-3">
                    {hudState.availableChars.map((char) => {
                      const isActive = hudState.selectedCharId === char.id;
                      const charEmoji = char.id === 'lumi' ? '🐱' : char.id === 'torbo' ? '🐗' : char.id === 'pico' ? '🐿️' : char.id === 'bumba' ? '🦎' : '🐈';
                      return (
                        <div
                          key={char.id}
                          onClick={() => handleSelectCharacter(char.id)}
                          className={`p-2 rounded-2xl flex items-center gap-3 cursor-pointer transition-all border-4 ${
                            isActive
                              ? 'bg-green-400 border-black ring-4 ring-yellow-400 ring-offset-2 shadow-md scale-[1.02]'
                              : 'bg-white border-slate-300 hover:bg-slate-100 hover:border-black/60 shadow-sm opacity-80'
                          }`}
                        >
                          <div className="w-11 h-11 bg-white border-2 border-black rounded-full flex items-center justify-center text-xl shadow-inner">
                            {charEmoji}
                          </div>
                          <div className="flex-1">
                            <div className="text-xs font-black uppercase text-slate-900 flex items-center justify-between">
                              <span>{char.id}</span>
                              {isActive && <span className="text-[9px] text-slate-900 bg-yellow-300 border border-black rounded px-1 font-bold">SELECTED</span>}
                            </div>
                            <div className="h-2.5 bg-black/20 rounded-full overflow-hidden border border-black mt-1">
                              <div className="h-full bg-red-500 transition-all rounded-full" style={{ width: `${char.hp}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-amber-100/90 border-2 border-black rounded-xl p-2.5 text-xs text-slate-800 leading-relaxed font-semibold">
                  <div className="font-black text-amber-900">✏️ {hudState.availableChars.find(c => c.id === hudState.selectedCharId)?.name}</div>
                  <p className="text-[11px] leading-tight mt-0.5">{hudState.availableChars.find(c => c.id === hudState.selectedCharId)?.desc}</p>
                  <div className="mt-1.5 text-slate-950 font-black text-[11px] bg-yellow-300/60 border border-black/20 rounded px-1.5 py-0.5 inline-block">
                    ⚡ 특수능력: {hudState.availableChars.find(c => c.id === hudState.selectedCharId)?.specialAbility}
                  </div>
                </div>
              </div>

              {/* Weapons chooser */}
              <div className="md:col-span-5 bg-white/95 border-4 border-black rounded-3xl p-4 flex flex-col justify-between shadow-[6px_6px_0px_#000]">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-3 border-b-2 border-black/10 pb-1">
                    ARSENAL ARMORY 💣
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    {hudState.availableWeapons.map((w) => {
                      const isActive = hudState.selectedWeaponId === w.id;
                      const hasAmmo = (hudState.ammoRemaining[w.id] ?? 99) > 0;
                      
                      // Assign color scheme based on weapon type
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
                          className={`p-2 rounded-2xl border-4 flex items-center gap-2.5 transition-all text-left relative ${
                            isActive
                              ? `${bgClass} border-black ring-4 ring-yellow-400 ring-offset-1 font-black scale-105 shadow-md`
                              : 'bg-white border-black/40 hover:bg-slate-100 hover:border-black shadow-sm'
                          } ${!hasAmmo ? 'opacity-30 cursor-not-allowed border-black/20' : ''}`}
                        >
                          <span className="text-2xl">{emojiSpec}</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-black uppercase text-slate-900 block truncate leading-tight">
                              {w.name.split(' ')[0]}
                            </span>
                            <span className="text-[10px] font-mono leading-none text-slate-800 bg-black/10 px-1.5 py-0.5 rounded-full inline-block mt-0.5 font-bold">
                              {hudState.ammoRemaining[w.id] === undefined ? '무한' : `남음: ${hudState.ammoRemaining[w.id]}`}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-sky-50/80 border-2 border-black rounded-xl p-2.5 text-xs text-slate-800 mt-3 font-medium">
                  <span className="font-black text-sky-950">🔮 {hudState.availableWeapons.find(w => w.id === hudState.selectedWeaponId)?.name}: </span>
                  <span className="text-[11px] leading-tight block mt-0.5">{hudState.availableWeapons.find(w => w.id === hudState.selectedWeaponId)?.desc}</span>
                </div>
              </div>

              {/* Cannon specs controls & Launch button */}
              <div className="md:col-span-3 bg-yellow-400 border-4 border-black rounded-3xl p-4 flex flex-col justify-between shadow-[6px_6px_0px_#000] text-slate-950">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 border-b-2 border-black/20 pb-1">
                    CANNON CONTROL 🎯
                  </h3>
                  
                  {/* Angle slider */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs font-black mb-1 text-slate-900">
                      <span>각도 (ANGLE)</span>
                      <span className="text-red-600 font-extrabold text-sm bg-white border-2 border-black px-1.5 rounded">{cannonAngle}°</span>
                    </div>
                    <div className="relative flex items-center">
                      <input 
                        type="range"
                        min="10"
                        max="170"
                        value={cannonAngle}
                        onChange={(e) => setCannonAngle(Number(e.target.value))}
                        className="w-full accent-black cursor-pointer h-2 bg-white rounded-full appearance-none border-2 border-black"
                      />
                    </div>
                  </div>

                  {/* Power slider */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs font-black mb-1 text-slate-900">
                      <span>파워 (POWER)</span>
                      <span className="text-amber-800 font-extrabold text-sm bg-white border-2 border-black px-1.5 rounded">{cannonPower}%</span>
                    </div>
                    <div className="relative flex items-center">
                      <input 
                        type="range"
                        min="15"
                        max="100"
                        value={cannonPower}
                        onChange={(e) => setCannonPower(Number(e.target.value))}
                        className="w-full accent-black cursor-pointer h-2 bg-white rounded-full appearance-none border-2 border-black"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <button
                    id="fire-cannon-btn"
                    disabled={!hudState.isPlayerTurn || hudState.activeProjectileActive}
                    onClick={handleFireCannon}
                    className="w-full h-16 bg-red-600 border-4 border-black rounded-2xl btn-vibrant border-b-8 shadow-md flex flex-col items-center justify-center active:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="text-white text-xl font-black italic tracking-tight leading-none text-center">
                      {!hudState.isPlayerTurn 
                        ? 'WAITING' 
                        : hudState.activeProjectileActive 
                          ? 'LOADING' 
                          : 'FIRE!'}
                    </span>
                    <span className="text-white/80 text-[9px] font-black uppercase tracking-wider mt-0.5 text-center">
                      {!hudState.isPlayerTurn ? '적 턴 차례' : '발 사'}
                    </span>
                  </button>

                  <button
                    id="exit-level-btn"
                    onClick={handleExitToSelect}
                    className="w-full py-1.5 rounded-xl border-2 border-black text-xs font-black text-slate-800 hover:text-black bg-white hover:bg-slate-100 transition-all text-center shadow-sm"
                    title="전투 포기하고 나가기"
                  >
                    🚪 RETREAT (퇴 각)
                  </button>
                </div>

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
