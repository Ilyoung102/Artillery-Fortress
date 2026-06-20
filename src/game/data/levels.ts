export interface BlockData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  material: 'wood' | 'stone' | 'metal' | 'glass' | 'tnt';
  shape: 'box' | 'circle';
  rotation?: number; // In degrees
  isStatic?: boolean;
}

export interface EnemyPosition {
  id: string;
  x: number;
  y: number;
  hp: number;
  name: string;
}

export interface LevelData {
  id: number;
  name: string;
  theme: string;
  themeColor: string; // Background visual colors
  playerStart: { x: number; y: number };
  enemies: EnemyPosition[];
  blocks: BlockData[];
  availableCharacters: string[];
  availableWeapons: string[];
  maxTurns: number;
  windRange: number; // Maximum wind intensity in either direction (-windRange to windRange)
  starConditions: {
    threeStars: number; // Mini score or remaining turns
    twoStars: number;
    oneStar: number;
  };
}

export const LEVELS: LevelData[] = [
  {
    id: 1,
    name: "제1조: 훈련원의 아침 (Lumi's Field)",
    theme: "초원 (Sunny Grasslands)",
    themeColor: "#eefbe9",
    playerStart: { x: 180, y: 480 },
    enemies: [
      { id: "e1", x: 780, y: 480, hp: 40, name: "꼬마 슬라임(Slime Cadet)" }
    ],
    blocks: [
      // Simple wooden pillars and a horizontal girder
      { id: "b1_1", x: 740, y: 470, width: 24, height: 80, material: "wood", shape: "box" },
      { id: "b1_2", x: 820, y: 470, width: 24, height: 80, material: "wood", shape: "box" },
      { id: "b1_3", x: 780, y: 420, width: 110, height: 20, material: "wood", shape: "box" }
    ],
    availableCharacters: ["lumi"],
    availableWeapons: ["basic"],
    maxTurns: 5,
    windRange: 0, // No wind
    starConditions: { threeStars: 3, twoStars: 2, oneStar: 1 } // Refers to remaining turns
  },
  {
    id: 2,
    name: "제2조: 유리탑 돌파 (Fragile Glass Tower)",
    theme: "숲 정원 (Forest Greenhouse)",
    themeColor: "#e6f8f5",
    playerStart: { x: 150, y: 480 },
    enemies: [
      { id: "e2", x: 800, y: 390, hp: 50, name: "글래스 마스터(Mirror Eye)" }
    ],
    blocks: [
      // Built of glass, very brittle (explodes with light force)
      { id: "b2_1", x: 760, y: 470, width: 24, height: 100, material: "glass", shape: "box" },
      { id: "b2_2", x: 840, y: 470, width: 24, height: 100, material: "glass", shape: "box" },
      { id: "b2_3", x: 800, y: 410, width: 110, height: 20, material: "glass", shape: "box" },
      { id: "b2_4", x: 800, y: 340, width: 40, height: 40, material: "glass", shape: "box" }
    ],
    availableCharacters: ["lumi", "pico"],
    availableWeapons: ["basic", "bouncy"],
    maxTurns: 6,
    windRange: 3, // Very tiny wind
    starConditions: { threeStars: 4, twoStars: 2, oneStar: 1 }
  },
  {
    id: 3,
    name: "제3조: 무너지는 목조 가택 (Splinter Shelter)",
    theme: "오두막 (Wooden Retreat)",
    themeColor: "#fdf8ef",
    playerStart: { x: 160, y: 480 },
    enemies: [
      { id: "e3", x: 810, y: 450, hp: 60, name: "산적 미어캣(Meerkat Bandit)" }
    ],
    blocks: [
      // More wood columns stacking vertically
      { id: "b3_1", x: 750, y: 470, width: 20, height: 100, material: "wood", shape: "box" },
      { id: "b3_2", x: 870, y: 470, width: 20, height: 100, material: "wood", shape: "box" },
      { id: "b3_3", x: 810, y: 410, width: 140, height: 20, material: "wood", shape: "box" },
      // Top floors
      { id: "b3_4", x: 770, y: 350, width: 20, height: 80, material: "wood", shape: "box" },
      { id: "b3_5", x: 850, y: 350, width: 20, height: 80, material: "wood", shape: "box" },
      { id: "b3_6", x: 810, y: 300, width: 100, height: 20, material: "wood", shape: "box" }
    ],
    availableCharacters: ["lumi", "torbo"],
    availableWeapons: ["basic", "pierce"],
    maxTurns: 6,
    windRange: 0,
    starConditions: { threeStars: 4, twoStars: 2, oneStar: 1 }
  },
  {
    id: 4,
    name: "제4조: 화약고 습격 (TNT Fuel Depot)",
    theme: "강철 공장 (Industrial Yard)",
    themeColor: "#f5f5f7",
    playerStart: { x: 180, y: 480 },
    enemies: [
      { id: "e4", x: 800, y: 420, hp: 85, name: "동성 방화범(Scorcher)" }
    ],
    blocks: [
      // Introduces Stone + TNT Box
      { id: "b4_1", x: 740, y: 470, width: 30, height: 90, material: "stone", shape: "box" },
      { id: "b4_2", x: 860, y: 470, width: 30, height: 90, material: "stone", shape: "box" },
      // The TNT box is stored on top of a stone lintel right below the enemy!
      { id: "b4_3", x: 800, y: 410, width: 110, height: 24, material: "stone", shape: "box" },
      { id: "b4_tnt", x: 800, y: 480, width: 45, height: 45, material: "tnt", shape: "box" }, // TNT placed beneath the bridge!
    ],
    availableCharacters: ["lumi", "bumba"],
    availableWeapons: ["basic", "bomb"],
    maxTurns: 6,
    windRange: 4, // Slight wind
    starConditions: { threeStars: 4, twoStars: 2, oneStar: 1 }
  },
  {
    id: 5,
    name: "제5조: 스톤 핸지의 수호자 (Stone Bastion)",
    theme: "황야 고원 (Rocky Outcrop)",
    themeColor: "#fdf3e7",
    playerStart: { x: 150, y: 480 },
    enemies: [
      { id: "e5_1", x: 740, y: 340, hp: 50, name: "바위 게(Stone Crab)" },
      { id: "e5_2", x: 860, y: 340, hp: 50, name: "독침 고슴도치(Quillback)" }
    ],
    blocks: [
      // Pillars made of hard stone blocks
      { id: "b5_1", x: 700, y: 470, width: 35, height: 100, material: "stone", shape: "box" },
      { id: "b5_2", x: 780, y: 470, width: 35, height: 100, material: "stone", shape: "box" },
      { id: "b5_3", x: 740, y: 410, width: 110, height: 20, material: "stone", shape: "box" },

      { id: "b5_4", x: 820, y: 470, width: 35, height: 100, material: "stone", shape: "box" },
      { id: "b5_5", x: 900, y: 470, width: 35, height: 100, material: "stone", shape: "box" },
      { id: "b5_6", x: 860, y: 410, width: 110, height: 20, material: "stone", shape: "box" },

      { id: "b5_mid", x: 800, y: 370, width: 100, height: 20, material: "glass", shape: "box" },
      { id: "b5_tnt", x: 800, y: 470, width: 40, height: 40, material: "tnt", shape: "box" } // Middle TNT
    ],
    availableCharacters: ["lumi", "torbo", "bumba"],
    availableWeapons: ["basic", "bomb", "pierce"],
    maxTurns: 7,
    windRange: 8, // Med wind
    starConditions: { threeStars: 5, twoStars: 3, oneStar: 1 }
  },
  {
    id: 6,
    name: "제6조: 삼각 보루 저격전 (Triangular Fort)",
    theme: "대리석 전당 (Marble Hall)",
    themeColor: "#fdfbff",
    playerStart: { x: 160, y: 480 },
    enemies: [
      { id: "e6", x: 810, y: 390, hp: 90, name: "가고일 보초(Sentry Gargoyle)" }
    ],
    blocks: [
      // High complexity, high wood/glass setup
      { id: "b6_1", x: 720, y: 470, width: 30, height: 110, material: "stone", shape: "box" },
      { id: "b6_2", x: 900, y: 470, width: 30, height: 110, material: "stone", shape: "box" },
      { id: "b6_3", x: 810, y: 410, width: 210, height: 20, material: "wood", shape: "box" },
      // Inner wood columns and glass
      { id: "b6_4", x: 760, y: 470, width: 20, height: 90, material: "glass", shape: "box" },
      { id: "b6_5", x: 860, y: 470, width: 20, height: 90, material: "glass", shape: "box" },
      // TNT box in the middle
      { id: "b6_tnt", x: 810, y: 470, width: 40, height: 40, material: "tnt", shape: "box" },
      // Small tower peak
      { id: "b6_top1", x: 790, y: 350, width: 20, height: 60, material: "wood", shape: "box" },
      { id: "b6_top2", x: 830, y: 350, width: 20, height: 60, material: "wood", shape: "box" }
    ],
    availableCharacters: ["lumi", "pico", "neo"],
    availableWeapons: ["basic", "split", "bouncy"],
    maxTurns: 7,
    windRange: 10,
    starConditions: { threeStars: 5, twoStars: 3, oneStar: 1 }
  },
  {
    id: 7,
    name: "제7조: 강철의 방벽 (The Steel Shell)",
    theme: "금속 광산 (Iron Ore Quarry)",
    themeColor: "#eceef4",
    playerStart: { x: 140, y: 480 },
    enemies: [
      { id: "e7", x: 820, y: 440, hp: 120, name: "강철 기갑병(Armored Mecha)" }
    ],
    blocks: [
      // Introduces metal blocks (super rigid, heavy)
      { id: "b7_1", x: 750, y: 470, width: 40, height: 110, material: "metal", shape: "box" },
      { id: "b7_2", x: 890, y: 470, width: 40, height: 110, material: "metal", shape: "box" },
      { id: "b7_top", x: 820, y: 410, width: 180, height: 25, material: "metal", shape: "box" },
      // Guard logs
      { id: "b7_log1", x: 790, y: 480, width: 20, height: 80, material: "wood", shape: "box" },
      { id: "b7_log2", x: 850, y: 480, width: 20, height: 80, material: "wood", shape: "box" },
      // Small glass roof
      { id: "b7_roof1", x: 790, y: 360, width: 15, height: 50, material: "glass", shape: "box" },
      { id: "b7_roof2", x: 850, y: 360, width: 15, height: 50, material: "glass", shape: "box" },
      // TNT box on the side
      { id: "b7_tnt", x: 920, y: 480, width: 35, height: 35, material: "tnt", shape: "box" }
    ],
    availableCharacters: ["lumi", "torbo", "pico", "neo"],
    availableWeapons: ["basic", "pierce", "gravity", "bomb"],
    maxTurns: 8,
    windRange: 16, // Strong winds
    starConditions: { threeStars: 6, twoStars: 4, oneStar: 2 }
  },
  {
    id: 8,
    name: "제8조: 천공의 더블 드론 (Double Hover Sentry)",
    theme: "천공의 요새 (Windy High-grounds)",
    themeColor: "#e5f0f8",
    playerStart: { x: 160, y: 450 },
    enemies: [
      { id: "e8_1", x: 720, y: 280, hp: 80, name: "플로팅 가드(Sky Battery A)" },
      { id: "e8_2", x: 880, y: 280, hp: 80, name: "플로팅 가드(Sky Battery B)" }
    ],
    blocks: [
      // High structure, high grounds
      { id: "b8_ground1", x: 720, y: 450, width: 120, height: 150, material: "stone", shape: "box" },
      { id: "b8_ground2", x: 880, y: 450, width: 120, height: 150, material: "stone", shape: "box" },
      // Wood plank spanning between them
      { id: "b8_br", x: 800, y: 365, width: 150, height: 15, material: "wood", shape: "box" },
      // TNT box on top of bridge
      { id: "b8_tnt", x: 800, y: 340, width: 35, height: 35, material: "tnt", shape: "box" },
      // Glass columns safeguarding them
      { id: "b8_gl1", x: 720, y: 340, width: 15, height: 70, material: "glass", shape: "box" },
      { id: "b8_gl2", x: 880, y: 340, width: 15, height: 70, material: "glass", shape: "box" }
    ],
    availableCharacters: ["lumi", "pico", "neo", "bumba"],
    availableWeapons: ["basic", "split", "gravity", "fire"],
    maxTurns: 8,
    windRange: 20, // High wind
    starConditions: { threeStars: 5, twoStars: 3, oneStar: 1 }
  },
  {
    id: 9,
    name: "제9조: 바람길의 암설 (Wind Tunnel Cavern)",
    theme: "폭풍 사막 (Desert Gale)",
    themeColor: "#fbf3db",
    playerStart: { x: 140, y: 480 },
    enemies: [
      { id: "e9_1", x: 750, y: 460, hp: 60, name: "암석 늑대(Stone Howler)" },
      { id: "e9_2", x: 850, y: 360, hp: 60, name: "사막 코브라(Sand Spit)" }
    ],
    blocks: [
      // Double layer tower with high wind
      { id: "b9_b1", x: 750, y: 470, width: 30, height: 90, material: "stone", shape: "box" },
      { id: "b9_b2", x: 850, y: 475, width: 30, height: 80, material: "stone", shape: "box" },
      { id: "b9_sh", x: 800, y: 420, width: 120, height: 15, material: "wood", shape: "box" },
      // Upper layout
      { id: "b9_tnt", x: 800, y: 450, width: 35, height: 35, material: "tnt", shape: "box" },
      { id: "b9_u1", x: 770, y: 370, width: 20, height: 80, material: "wood", shape: "box" },
      { id: "b9_u2", x: 830, y: 370, width: 20, height: 80, material: "glass", shape: "box" },
      { id: "b9_top", x: 800, y: 320, width: 90, height: 15, material: "metal", shape: "box" }
    ],
    availableCharacters: ["lumi", "torbo", "bumba", "neo"],
    availableWeapons: ["basic", "bomb", "pierce", "bouncy"],
    maxTurns: 9,
    windRange: 25, // Powerful winds
    starConditions: { threeStars: 6, twoStars: 4, oneStar: 2 }
  },
  {
    id: 10,
    name: "제10조: 화염 도미노 요새 (TNT Chain Reaction)",
    theme: "마그마 계곡 (Volcano Edge)",
    themeColor: "#ffede5",
    playerStart: { x: 160, y: 480 },
    enemies: [
      { id: "e10_1", x: 740, y: 320, hp: 100, name: "마그마 버스터(Magma Lord)" },
      { id: "e10_2", x: 850, y: 310, hp: 100, name: "마그마 포병(Magma Gunner)" }
    ],
    blocks: [
      // Structured with high focus on TNT chains. Wood support with explosives!
      { id: "b10_base1", x: 710, y: 470, width: 35, height: 120, material: "stone", shape: "box" },
      { id: "b10_base2", x: 870, y: 470, width: 35, height: 120, material: "stone", shape: "box" },
      { id: "b10_mid_plate", x: 790, y: 400, width: 190, height: 20, material: "wood", shape: "box" },
      // Inner explosives
      { id: "b10_tnt1", x: 780, y: 470, width: 45, height: 45, material: "tnt", shape: "box" },
      { id: "b10_tnt2", x: 825, y: 470, width: 45, height: 45, material: "tnt", shape: "box" },
      // Upper pillars supporting upper enemy platforms
      { id: "b10_u1", x: 740, y: 360, width: 25, height: 60, material: "wood", shape: "box" },
      { id: "b10_u2", x: 850, y: 360, width: 25, height: 60, material: "wood", shape: "box" },
      { id: "b10_upper_plate", x: 795, y: 325, width: 140, height: 15, material: "glass", shape: "box" },
      // One extra tnt on top!
      { id: "b10_tnt_top", x: 795, y: 300, width: 35, height: 35, material: "tnt", shape: "box" }
    ],
    availableCharacters: ["lumi", "torbo", "bumba", "pico", "neo"],
    availableWeapons: ["basic", "bomb", "fire", "gravity"],
    maxTurns: 9,
    windRange: 12,
    starConditions: { threeStars: 6, twoStars: 4, oneStar: 2 }
  },
  {
    id: 11,
    name: "제11조: 쉘터 파괴전 (Metal Underground Shelter)",
    theme: "금속 사일로 (Armored Depot)",
    themeColor: "#edf1f2",
    playerStart: { x: 150, y: 480 },
    enemies: [
      { id: "e11_1", x: 780, y: 480, hp: 120, name: "강철 벙커보초(Shield Sentry)" },
      { id: "e11_2", x: 840, y: 395, hp: 70, name: "미사일 머신(Silo Hatch)" }
    ],
    blocks: [
      // Heavily fortified steel block roof shelter blocking normal top-shots
      { id: "b11_m1", x: 720, y: 470, width: 40, height: 110, material: "metal", shape: "box" },
      { id: "b11_m2", x: 840, y: 470, width: 40, height: 110, material: "metal", shape: "box" },
      // Metal slab
      { id: "b11_slab", x: 780, y: 410, width: 160, height: 25, material: "metal", shape: "box" },
      // Above the slab, some fragile wood and TNT
      { id: "b11_w1", x: 750, y: 370, width: 20, height: 60, material: "wood", shape: "box" },
      { id: "b11_w2", x: 810, y: 370, width: 20, height: 60, material: "wood", shape: "box" },
      { id: "b11_plate2", x: 780, y: 335, width: 100, height: 15, material: "glass", shape: "box" },
      { id: "b11_tnt", x: 780, y: 290, width: 45, height: 45, material: "tnt", shape: "box" }
    ],
    availableCharacters: ["lumi", "torbo", "pico", "neo", "bumba"],
    availableWeapons: ["basic", "pierce", "gravity", "split", "bouncy"],
    maxTurns: 10,
    windRange: 15,
    starConditions: { threeStars: 7, twoStars: 4, oneStar: 2 }
  },
  {
    id: 12,
    name: "제12조: 기계신앙 황궁 (Crown Fortress of Iron)",
    theme: "엔트로피 궁정 (High-Tech Fortress)",
    themeColor: "#f6f3fc",
    playerStart: { x: 150, y: 480 },
    enemies: [
      { id: "e12_1", x: 720, y: 450, hp: 150, name: "궁정 드라이버(Palace Driver)" },
      { id: "e12_2", x: 860, y: 450, hp: 150, name: "강철의 왕(Antigravity Overlord)" },
      { id: "e12_3", x: 790, y: 280, hp: 100, name: "최후의 왕관(Imperial Core Drone)" }
    ],
    blocks: [
      // Master tier composite tower!
      // Bottom platform towers
      { id: "b12_p1", x: 700, y: 470, width: 40, height: 110, material: "stone", shape: "box" },
      { id: "b12_p2", x: 770, y: 470, width: 40, height: 110, material: "stone", shape: "box" },
      { id: "b12_bridge1", x: 735, y: 410, width: 110, height: 20, material: "metal", shape: "box" },

      { id: "b12_p3", x: 830, y: 470, width: 40, height: 110, material: "stone", shape: "box" },
      { id: "b12_p4", x: 900, y: 470, width: 40, height: 110, material: "stone", shape: "box" },
      { id: "b12_bridge2", x: 865, y: 410, width: 110, height: 20, material: "metal", shape: "box" },

      // Center TNT box
      { id: "b12_tnt_c", x: 800, y: 470, width: 45, height: 45, material: "tnt", shape: "box" },

      // Upper floor
      { id: "b12_u1", x: 740, y: 350, width: 20, height: 90, material: "wood", shape: "box" },
      { id: "b12_u2", x: 860, y: 350, width: 20, height: 90, material: "wood", shape: "box" },
      { id: "b12_ubridge", x: 800, y: 300, width: 140, height: 15, material: "glass", shape: "box" },

      // Peak shield
      { id: "b12_metal_shield", x: 800, y: 240, width: 90, height: 20, material: "metal", shape: "box" }
    ],
    availableCharacters: ["lumi", "torbo", "pico", "bumba", "neo"],
    availableWeapons: ["basic", "bomb", "split", "pierce", "bouncy", "gravity", "fire"],
    maxTurns: 12,
    windRange: 16, // Moderate max wind
    starConditions: { threeStars: 8, twoStars: 5, oneStar: 2 }
  },
  {
    id: 13,
    name: "제13조: 고공의 부유 거점 (Floating Sky Fortress)",
    theme: "구름 협곡 (Cloud Skies)",
    themeColor: "#e6f8fa",
    playerStart: { x: 160, y: 470 },
    enemies: [
      { id: "e13_1", x: 740, y: 460, hp: 80, name: "중력 비행 함대 (Sky Sentry)" },
      { id: "e13_2", x: 860, y: 380, hp: 60, name: "대공 방어 드론 (Anti-Air Guard)" }
    ],
    blocks: [
      // Floating targets in the mid-air
      { id: "floating_target_13_1", x: 480, y: 150, width: 35, height: 35, material: "glass", shape: "circle" },
      { id: "floating_target_13_2", x: 580, y: 220, width: 35, height: 35, material: "glass", shape: "circle" },
      // Castle structure
      { id: "b13_s1", x: 720, y: 480, width: 30, height: 80, material: "wood", shape: "box" },
      { id: "b13_s2", x: 800, y: 480, width: 30, height: 80, material: "wood", shape: "box" },
      { id: "b13_roof", x: 760, y: 430, width: 120, height: 20, material: "stone", shape: "box" }
    ],
    availableCharacters: ["lumi", "pico", "torbo"],
    availableWeapons: ["basic", "split", "bomb"],
    maxTurns: 8,
    windRange: 8,
    starConditions: { threeStars: 6, twoStars: 4, oneStar: 2 }
  },
  {
    id: 14,
    name: "제14조: 고대 폐허의 장벽 (Sandstorm Monument)",
    theme: "사막 유적 (Ancient Dunes)",
    themeColor: "#fdf8ee",
    playerStart: { x: 150, y: 480 },
    enemies: [
      { id: "e14_1", x: 800, y: 440, hp: 90, name: "미어캣 척후병 (Desert Scout)" }
    ],
    blocks: [
      // Tall Moving backwall blocking over-shots and dropping them straight down
      { id: "back_wall_14", x: 920, y: 280, width: 20, height: 220, material: "metal", shape: "box" },
      // Base ruins
      { id: "b14_1", x: 750, y: 470, width: 30, height: 100, material: "stone", shape: "box" },
      { id: "b14_2", x: 850, y: 470, width: 30, height: 100, material: "stone", shape: "box" },
      { id: "b14_slab", x: 800, y: 410, width: 130, height: 20, material: "wood", shape: "box" }
    ],
    availableCharacters: ["lumi", "neo"],
    availableWeapons: ["basic", "pierce", "bouncy"],
    maxTurns: 7,
    windRange: 12,
    starConditions: { threeStars: 5, twoStars: 3, oneStar: 1 }
  },
  {
    id: 15,
    name: "제15조: 광물 수호병 기지 (Emerald Shard Chamber)",
    theme: "광산 동굴 (Crystal Mines)",
    themeColor: "#eefbf4",
    playerStart: { x: 140, y: 485 },
    enemies: [
      { id: "e15_1", x: 720, y: 480, hp: 100, name: "크리스탈 골렘 (Shard Golem)" },
      { id: "e15_2", x: 840, y: 420, hp: 80, name: "광산 사수 (Cave Archer)" }
    ],
    blocks: [
      // Both floating target CASCADE & moving back wall!
      { id: "floating_target_15_1", x: 500, y: 180, width: 40, height: 40, material: "glass", shape: "circle" },
      { id: "back_wall_15", x: 930, y: 300, width: 22, height: 200, material: "metal", shape: "box" },
      // Mine supports
      { id: "b15_1", x: 700, y: 480, width: 25, height: 90, material: "wood", shape: "box" },
      { id: "b15_2", x: 780, y: 480, width: 25, height: 90, material: "wood", shape: "box" },
      { id: "b15_p", x: 740, y: 425, width: 110, height: 15, material: "stone", shape: "box" }
    ],
    availableCharacters: ["lumi", "pico", "bumba"],
    availableWeapons: ["basic", "bomb", "gravity"],
    maxTurns: 9,
    windRange: 6,
    starConditions: { threeStars: 7, twoStars: 5, oneStar: 2 }
  },
  {
    id: 16,
    name: "제16조: 가라앉은 비밀 요새 (Abyssal Sub Citadel)",
    theme: "비밀 함대 (Sunken Atoll)",
    themeColor: "#edf8f9",
    playerStart: { x: 170, y: 470 },
    enemies: [
      { id: "e16_1", x: 760, y: 460, hp: 110, name: "해양 암살 기동병 (Depth Striker)" },
      { id: "e16_2", x: 850, y: 460, hp: 90, name: "수중 닻포병 (Anchor Gunner)" }
    ],
    blocks: [
      { id: "floating_target_16", x: 530, y: 200, width: 35, height: 35, material: "glass", shape: "circle" },
      { id: "back_wall_16", x: 915, y: 280, width: 15, height: 180, material: "metal", shape: "box" },
      { id: "b16_base", x: 800, y: 490, width: 160, height: 25, material: "stone", shape: "box" },
      { id: "b16_p1", x: 740, y: 440, width: 20, height: 80, material: "wood", shape: "box" },
      { id: "b16_p2", x: 860, y: 440, width: 20, height: 80, material: "wood", shape: "box" }
    ],
    availableCharacters: ["lumi", "torbo", "neo"],
    availableWeapons: ["basic", "split", "fire", "pierce"],
    maxTurns: 8,
    windRange: 10,
    starConditions: { threeStars: 6, twoStars: 4, oneStar: 2 }
  },
  {
    id: 17,
    name: "제17조: 전자기 펄스 시험장 (EMP Sentry Array)",
    theme: "연구 기지 (Magneto Facility)",
    themeColor: "#f6f3fc",
    playerStart: { x: 150, y: 480 },
    enemies: [
      { id: "e17_1", x: 780, y: 450, hp: 130, name: "테슬라 대공 보초 (Tesla Coil)" }
    ],
    blocks: [
      { id: "floating_target_17", x: 510, y: 160, width: 35, height: 35, material: "glass", shape: "circle" },
      { id: "back_wall_17", x: 925, y: 260, width: 25, height: 240, material: "metal", shape: "box" },
      { id: "b17_wood", x: 780, y: 480, width: 120, height: 60, material: "wood", shape: "box" },
      { id: "b17_stone", x: 780, y: 420, width: 80, height: 40, material: "stone", shape: "box" }
    ],
    availableCharacters: ["neo", "bumba"],
    availableWeapons: ["basic", "gravity", "bomb"],
    maxTurns: 8,
    windRange: 14,
    starConditions: { threeStars: 6, twoStars: 4, oneStar: 2 }
  },
  {
    id: 18,
    name: "제18조: 화산 용암 가열 요새 (Volcano Smelter Core)",
    theme: "용암 대성채 (Molten Smelter)",
    themeColor: "#fdf3eb",
    playerStart: { x: 160, y: 480 },
    enemies: [
      { id: "e18_1", x: 730, y: 480, hp: 120, name: "철골 용접사 (Smelter Welder)" },
      { id: "e18_2", x: 850, y: 440, hp: 100, name: "불꽃 비행정 (Pyro Sentry)" }
    ],
    blocks: [
      { id: "floating_target_18_1", x: 450, y: 220, width: 38, height: 38, material: "glass", shape: "circle" },
      { id: "floating_target_18_2", x: 570, y: 150, width: 38, height: 38, material: "glass", shape: "circle" },
      { id: "back_wall_18", x: 935, y: 290, width: 20, height: 220, material: "metal", shape: "box" },
      { id: "b18_m1", x: 710, y: 460, width: 30, height: 110, material: "stone", shape: "box" },
      { id: "b18_m2", x: 850, y: 460, width: 30, height: 110, material: "stone", shape: "box" }
    ],
    availableCharacters: ["lumi", "torbo", "bumba"],
    availableWeapons: ["basic", "fire", "split", "pierce"],
    maxTurns: 10,
    windRange: 12,
    starConditions: { threeStars: 7, twoStars: 4, oneStar: 2 }
  },
  {
    id: 19,
    name: "제19조: 얼어붙은 영원의 빙성 (Glacial Peak Bastion)",
    theme: "영안의 요새 (Frost Peak)",
    themeColor: "#edf8f9",
    playerStart: { x: 150, y: 475 },
    enemies: [
      { id: "e19_1", x: 790, y: 460, hp: 140, name: "냉기 서궁장 (Frost Warden)" }
    ],
    blocks: [
      { id: "floating_target_19", x: 500, y: 190, width: 44, height: 44, material: "glass", shape: "circle" },
      { id: "back_wall_19", x: 915, y: 280, width: 20, height: 230, material: "metal", shape: "box" },
      { id: "b19_ice", x: 740, y: 480, width: 25, height: 90, material: "glass", shape: "box" },
      { id: "b19_steel", x: 840, y: 480, width: 25, height: 90, material: "stone", shape: "box" }
    ],
    availableCharacters: ["lumi", "pico", "neo"],
    availableWeapons: ["basic", "bouncy", "split"],
    maxTurns: 8,
    windRange: 8,
    starConditions: { threeStars: 6, twoStars: 4, oneStar: 2 }
  },
  {
    id: 20,
    name: "제20조: 천공의 거대 관문 (Aether Highgate Temple)",
    theme: "하늘 정원 (Celestia Gates)",
    themeColor: "#f6fbf9",
    playerStart: { x: 180, y: 480 },
    enemies: [
      { id: "e20_1", x: 720, y: 430, hp: 80, name: "천궁 묘지기 (Aether Guard)" },
      { id: "e20_2", x: 840, y: 430, hp: 80, name: "환영 군주 (Phantasm Slay)" }
    ],
    blocks: [
      { id: "floating_target_20", x: 510, y: 155, width: 40, height: 40, material: "glass", shape: "circle" },
      { id: "back_wall_20", x: 928, y: 270, width: 24, height: 210, material: "metal", shape: "box" },
      // Columns
      { id: "b20_p1", x: 720, y: 480, width: 40, height: 80, material: "stone", shape: "box" },
      { id: "b20_p2", x: 840, y: 480, width: 40, height: 80, material: "stone", shape: "box" },
      { id: "b20_roof", x: 780, y: 410, width: 170, height: 20, material: "wood", shape: "box" }
    ],
    availableCharacters: ["lumi", "torbo", "pico", "neo"],
    availableWeapons: ["basic", "split", "gravity", "pierce"],
    maxTurns: 9,
    windRange: 10,
    starConditions: { threeStars: 6, twoStars: 4, oneStar: 2 }
  },
  {
    id: 21,
    name: "제21조: 사이버 대공 화기 사일로 (Cyber Sentry Bunker)",
    theme: "네온 관제구 (Neon Sector)",
    themeColor: "#f3effa",
    playerStart: { x: 150, y: 480 },
    enemies: [
      { id: "e21_1", x: 780, y: 480, hp: 120, name: "네온 사일로 런처 (Silo Launcher)" },
      { id: "e21_2", x: 830, y: 380, hp: 70, name: "대공 펄스기 (Cyber Eye Sentry)" }
    ],
    blocks: [
      { id: "floating_target_21_1", x: 480, y: 220, width: 35, height: 35, material: "glass", shape: "circle" },
      { id: "floating_target_21_2", x: 590, y: 140, width: 35, height: 35, material: "glass", shape: "circle" },
      { id: "back_wall_21", x: 935, y: 290, width: 22, height: 230, material: "metal", shape: "box" },
      { id: "b21_m1", x: 730, y: 480, width: 35, height: 95, material: "stone", shape: "box" },
      { id: "b21_m2", x: 860, y: 480, width: 35, height: 95, material: "stone", shape: "box" }
    ],
    availableCharacters: ["neo", "bumba", "torbo"],
    availableWeapons: ["basic", "gravity", "fire", "split"],
    maxTurns: 9,
    windRange: 12,
    starConditions: { threeStars: 7, twoStars: 4, oneStar: 2 }
  },
  {
    id: 22,
    name: "제22조: 성운 원형 사막 관측소 (Cosmic Nebula Dome)",
    theme: "성운 전망소 (Stargaze Platform)",
    themeColor: "#e6f1fe",
    playerStart: { x: 160, y: 480 },
    enemies: [
      { id: "e22_1", x: 790, y: 440, hp: 150, name: "스타폴 리듀서 (Astro Reducer)" }
    ],
    blocks: [
      { id: "floating_target_22", x: 520, y: 170, width: 45, height: 45, material: "glass", shape: "circle" },
      { id: "back_wall_22", x: 920, y: 280, width: 18, height: 200, material: "metal", shape: "box" },
      // High roof
      { id: "b22_1", x: 750, y: 480, width: 25, height: 110, material: "wood", shape: "box" },
      { id: "b22_2", x: 850, y: 480, width: 25, height: 110, material: "wood", shape: "box" },
      { id: "b22_arch", x: 800, y: 400, width: 150, height: 20, material: "stone", shape: "box" }
    ],
    availableCharacters: ["lumi", "pico", "neo"],
    availableWeapons: ["basic", "bouncy", "pierce", "split"],
    maxTurns: 8,
    windRange: 10,
    starConditions: { threeStars: 6, twoStars: 4, oneStar: 2 }
  },
  {
    id: 23,
    name: "제23조: 섀도우 협곡 지대 (Abyssal Shadow Gorge)",
    theme: "그림자 암반 (Obsidian Crags)",
    themeColor: "#eef3fa",
    playerStart: { x: 150, y: 485 },
    enemies: [
      { id: "e23_1", x: 740, y: 480, hp: 100, name: "연기 분열병 (Smoke Splitter)" },
      { id: "e23_2", x: 850, y: 430, hp: 110, name: "그림자 강습사 (Shadow Raider)" }
    ],
    blocks: [
      { id: "floating_target_23_1", x: 490, y: 160, width: 38, height: 38, material: "glass", shape: "circle" },
      { id: "floating_target_23_2", x: 590, y: 220, width: 38, height: 38, material: "glass", shape: "circle" },
      { id: "back_wall_23", x: 933, y: 310, width: 20, height: 190, material: "metal", shape: "box" },
      { id: "b23_stone", x: 800, y: 480, width: 140, height: 40, material: "stone", shape: "box" },
      { id: "b23_wood", x: 800, y: 440, width: 80, height: 40, material: "wood", shape: "box" }
    ],
    availableCharacters: ["lumi", "torbo", "bumba", "neo"],
    availableWeapons: ["basic", "fire", "split", "gravity"],
    maxTurns: 9,
    windRange: 8,
    starConditions: { threeStars: 7, twoStars: 4, oneStar: 2 }
  },
  {
    id: 24,
    name: "제24조: 수호자의 공중 무한 장성 (Zenith Guardian Endline)",
    theme: "수호전 최종선 (Emperor Apex Court)",
    themeColor: "#f6f3fc",
    playerStart: { x: 140, y: 480 },
    enemies: [
      { id: "e24_1", x: 740, y: 460, hp: 160, name: "전위 방패 장군 (Dread Vanguard)" },
      { id: "e24_2", x: 860, y: 460, hp: 160, name: "제국 총결 관리자 (Imperial Arbitrator)" },
      { id: "e24_3", x: 800, y: 300, hp: 120, name: "무한 수호구체 (Imperial Apex Drone)" }
    ],
    blocks: [
      // Master high targets
      { id: "floating_target_24_1", x: 440, y: 150, width: 45, height: 45, material: "glass", shape: "circle" },
      { id: "floating_target_24_2", x: 540, y: 210, width: 45, height: 45, material: "glass", shape: "circle" },
      { id: "floating_target_24_3", x: 640, y: 140, width: 45, height: 45, material: "glass", shape: "circle" },
      // Master moving wall
      { id: "back_wall_24", x: 940, y: 290, width: 25, height: 260, material: "metal", shape: "box" },
      // Complex fortified structure
      { id: "b24_p1", x: 700, y: 470, width: 40, height: 110, material: "stone", shape: "box" },
      { id: "b24_p2", x: 770, y: 470, width: 40, height: 110, material: "stone", shape: "box" },
      { id: "b24_bridge1", x: 735, y: 410, width: 110, height: 20, material: "metal", shape: "box" },
      { id: "b24_p3", x: 830, y: 470, width: 40, height: 110, material: "stone", shape: "box" },
      { id: "b24_p4", x: 900, y: 470, width: 40, height: 110, material: "stone", shape: "box" },
      { id: "b24_bridge2", x: 865, y: 410, width: 110, height: 20, material: "metal", shape: "box" }
    ],
    availableCharacters: ["lumi", "torbo", "pico", "bumba", "neo"],
    availableWeapons: ["basic", "bomb", "split", "pierce", "bouncy", "gravity", "fire"],
    maxTurns: 15,
    windRange: 14,
    starConditions: { threeStars: 10, twoStars: 6, oneStar: 3 }
  }
];
