export interface LevelProgress {
  levelId: number;
  unlocked: boolean;
  highScore: number;
  stars: number;
}

export interface GameSettings {
  soundOn: boolean;
  lastCharacterId: string;
  lastWeaponId: string;
}

export interface SaveData {
  progress: Record<number, LevelProgress>;
  settings: GameSettings;
}

const STORAGE_KEY = "artillery_fortress_save_v1";

const DEFAULT_SAVE: SaveData = {
  progress: {
    1: { levelId: 1, unlocked: true, highScore: 0, stars: 0 }
  },
  settings: {
    soundOn: true,
    lastCharacterId: "lumi",
    lastWeaponId: "basic"
  }
};

export const SaveSystem = {
  load(): SaveData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Initialize default and store
        this.save(DEFAULT_SAVE);
        return JSON.parse(JSON.stringify(DEFAULT_SAVE));
      }
      const data = JSON.parse(stored) as SaveData;
      // Guarantee level 1 is always unlocked
      if (!data.progress) data.progress = {};
      if (!data.progress[1]) {
        data.progress[1] = { levelId: 1, unlocked: true, highScore: 0, stars: 0 };
      } else {
        data.progress[1].unlocked = true;
      }
      if (!data.settings) {
        data.settings = { ...DEFAULT_SAVE.settings };
      }
      return data;
    } catch (e) {
      console.error("Failed to load save data, recovering default", e);
      return JSON.parse(JSON.stringify(DEFAULT_SAVE));
    }
  },

  save(data: SaveData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to write to localStorage", e);
    }
  },

  saveLevelResult(levelId: number, score: number, stars: number): SaveData {
    const data = this.load();
    
    // Ensure current level record exists
    if (!data.progress[levelId]) {
      data.progress[levelId] = { levelId, unlocked: true, highScore: 0, stars: 0 };
    }
    
    const record = data.progress[levelId];
    record.highScore = Math.max(record.highScore, score);
    record.stars = Math.max(record.stars, stars);

    // Unlock next level (if within bounds of our 12 levels)
    const nextLevelId = levelId + 1;
    if (nextLevelId <= 12) {
      if (!data.progress[nextLevelId]) {
        data.progress[nextLevelId] = { levelId: nextLevelId, unlocked: true, highScore: 0, stars: 0 };
      } else {
        data.progress[nextLevelId].unlocked = true;
      }
    }

    this.save(data);
    return data;
  },

  setSoundOn(on: boolean): void {
    const data = this.load();
    data.settings.soundOn = on;
    this.save(data);
  },

  setLastUsed(charId: string, weaponId: string): void {
    const data = this.load();
    data.settings.lastCharacterId = charId;
    data.settings.lastWeaponId = weaponId;
    this.save(data);
  },

  resetProgress(): SaveData {
    this.save(DEFAULT_SAVE);
    return JSON.parse(JSON.stringify(DEFAULT_SAVE));
  }
};
