export interface CharacterData {
  id: string;
  name: string;
  hp: number;
  weight: number;
  elasticity: number;
  specialAbility: string;
  color: number; // For Phaser Graphic fill
  colorHex: string; // For CSS styled tags
  desc: string;
  radius: number;
}

export const CHARACTERS: Record<string, CharacterData> = {
  lumi: {
    id: "lumi",
    name: "루미 (Lumi)",
    hp: 100,
    weight: 1.0,
    elasticity: 0.3,
    specialAbility: "균형 잡힌 기본형: 안정적인 포물선과 표준 데미지",
    color: 0x4dabf7, // light-blue
    colorHex: "#4dabf7",
    desc: "동물 전사 팀의 리더로, 균형 잡힌 신체 능력과 명석한 두뇌를 가졌습니다. 어떤 상황에서도 흔들리지 않는 표준 성능을 발휘합니다.",
    radius: 18,
  },
  torbo: {
    id: "torbo",
    name: "토르보 (Torbo)",
    hp: 150,
    weight: 2.2,
    elasticity: 0.1,
    specialAbility: "충돌 특화: 돌진 시 가중 중력을 얻어 구조물을 산산조각 냄",
    color: 0xffadc6, // pinkish metal
    colorHex: "#ff8ab4",
    desc: "육중한 강철 멧돼지 전사로, 높은 맷집을 자랑합니다. 무게감이 있어 멀리 날지는 못하지만 파괴력이 대단합니다.",
    radius: 24,
  },
  pico: {
    id: "pico",
    name: "피코 (Pico)",
    hp: 80,
    weight: 0.6,
    elasticity: 0.5,
    specialAbility: "2단 가속: 공중 비행 중 길게 탭하면 날카로운 대시 발동",
    color: 0xffd43b, // yellow
    colorHex: "#ffd43b",
    desc: "작은 깃털을 가진 민첩한 비행 다람쥐 전사입니다. 가볍고 탄성이 강해 바람을 잘 타며 먼 거리 도달에 우수합니다.",
    radius: 14,
  },
  bumba: {
    id: "bumba",
    name: "붐바 (Bumba)",
    hp: 110,
    weight: 1.3,
    elasticity: 0.15,
    specialAbility: "점화 폭발: 충돌 시 광범위 화염 폭발을 일으켜 지형 무력화",
    color: 0xfa5252, // red
    colorHex: "#fa5252",
    desc: "폭탄 솜리를 사용하는 카멜레온 탐험가입니다. 구조물이나 적과 마주했을 때 강력한 2차 피해 구역을 구축할 수 있습니다.",
    radius: 20,
  },
  neo: {
    id: "neo",
    name: "네오 (Neo)",
    hp: 90,
    weight: 1.0,
    elasticity: 0.25,
    specialAbility: "방향 보정: 공중 날기 중 탭한 방향으로 즉시 궤적 변경",
    color: 0xae3ec9, // purple
    colorHex: "#ae3ec9",
    desc: "차원을 가르는 전략 고양이 요원입니다. 정교하게 조정할 수 있어, 장애물을 비켜 요새 구석에 숨은 적을 정밀 격추하는 데 특화되어 있습니다.",
    radius: 17,
  }
};
