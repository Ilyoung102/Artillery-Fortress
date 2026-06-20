export interface WeaponData {
  id: string;
  name: string;
  damage: number;
  weight: number;
  elasticity: number;
  radius: number;
  explosionRadius: number;
  color: number;
  desc: string;
  ammoLimit: number; // Max ammo config per game
  specialEffect?: 'basic' | 'explode' | 'split' | 'pierce' | 'bouncy' | 'gravity' | 'napalm' | 'fire' | 'arrow' | 'drop_straight' | 'skydrop' | 'giant_explode';
}

export const WEAPONS: Record<string, WeaponData> = {
  basic: {
    id: "basic",
    name: "기본 탄환 (Pellet)",
    damage: 30,
    weight: 1.0,
    elasticity: 0.2,
    radius: 12,
    explosionRadius: 20,
    color: 0x868e96, // gray
    desc: "표준 탄환입니다. 무게 파괴력과 단일 타격 효율이 준수합니다.",
    ammoLimit: 99,
    specialEffect: 'basic'
  },
  bomb: {
    id: "bomb",
    name: "폭탄 탄환 (Explosive)",
    damage: 60,
    weight: 1.5,
    elasticity: 0.1,
    radius: 16,
    explosionRadius: 80,
    color: 0xe8590c, // deep orange
    desc: "충돌 시 거대한 화염 폭발을 일으키며, 광범위한 블록과 적에게 압도적인 범위 피해를 입힙니다.",
    ammoLimit: 3,
    specialEffect: 'explode'
  },
  split: {
    id: "split",
    name: "분열탄 (Triple Split)",
    damage: 20, // Per pellet
    weight: 0.8,
    elasticity: 0.3,
    radius: 10,
    explosionRadius: 30,
    color: 0x099268, // teal green
    desc: "공중 비행 도중 마우스나 터치 클릭 시 3개의 탄환으로 분열하여 광범위한 요새 지역을 타격합니다.",
    ammoLimit: 3,
    specialEffect: 'split'
  },
  pierce: {
    id: "pierce",
    name: "관통탄 (Drill Pierce)",
    damage: 40,
    weight: 2.5,
    elasticity: 0.05,
    radius: 13,
    explosionRadius: 10,
    color: 0x3b5bdb, // dark blue/indigo
    desc: "매우 무겁고 마찰이 작아 블록을 관통하며 다단 히트 피해를 주는 하이테크 드릴형 탄환입니다.",
    ammoLimit: 2,
    specialEffect: 'pierce'
  },
  bouncy: {
    id: "bouncy",
    name: "고무 고탄성탄 (Super bouncers)",
    damage: 25,
    weight: 0.7,
    elasticity: 0.9,
    radius: 11,
    explosionRadius: 15,
    color: 0xd6336c, // pinkish-red
    desc: "벽이나 지형, 요새 부품 사이를 미친 듯이 튕겨 다니며 여러 블록에 연쇄적인 소규모 충격을 줍니다.",
    ammoLimit: 4,
    specialEffect: 'bouncy'
  },
  gravity: {
    id: "gravity",
    name: "중력탄 (Vortex Sink)",
    damage: 15,
    weight: 1.2,
    elasticity: 0.0,
    radius: 15,
    explosionRadius: 120,
    color: 0x7048e8, // violet-purple
    desc: "충돌 지점에 강력한 인력 가상 특이점을 생성하여 순간적으로 주변 블록과 적 유닛을 안쪽으로 강하게 끌어모아 붕괴를 초래합니다.",
    ammoLimit: 2,
    specialEffect: 'gravity'
  },
  fire: {
    id: "fire",
    name: "화염탄 (Napalm Splash)",
    damage: 35,
    weight: 1.1,
    elasticity: 0.2,
    radius: 13,
    explosionRadius: 60,
    color: 0xfcc419, // bright gold
    desc: "충돌 후 도랑과 타일을 불길로 덮어 연쇄 도트 피해를 적용하는 인센디어리 폭탄입니다.",
    ammoLimit: 3,
    specialEffect: 'fire'
  },
  arrow: {
    id: "arrow",
    name: "정밀 화살탄 (Aero Arrow)",
    damage: 45,
    weight: 0.5,
    elasticity: 0.1,
    radius: 9,
    explosionRadius: 20,
    color: 0xe67e22, // vivid orange
    desc: "바람의 영향을 최소화하여 직진성이 우수한 초경량 고속 깃털 슬림 화살탄입니다.",
    ammoLimit: 4,
    specialEffect: 'arrow'
  },
  drop_straight: {
    id: "drop_straight",
    name: "직격 낙적탄 (Orbital Plunge)",
    damage: 60,
    weight: 1.4,
    elasticity: 0.05,
    radius: 11,
    explosionRadius: 40,
    color: 0x962d3e, // rich crimson red
    desc: "포물선으로 날아가다 공중에서 클릭하거나 1.2초 후 공중에서 정지하며 지면으로 90도 수직 강하 타격을 실행합니다.",
    ammoLimit: 3,
    specialEffect: 'drop_straight'
  },
  skydrop: {
    id: "skydrop",
    name: "폭격 지원탄 (Airstrike Cluster)",
    damage: 32,
    weight: 1.2,
    elasticity: 0.2,
    radius: 13,
    explosionRadius: 50,
    color: 0x1abc9c, // turquoise
    desc: "공중에서 클릭하거나 타겟 상공에서 격발하면 수평 전진을 정지하고 수직으로 3개의 집속 폭탄들을 다발로 낙하시킵니다.",
    ammoLimit: 2,
    specialEffect: 'skydrop'
  },
  megabomb: {
    id: "megabomb",
    name: "기가 가이아탄 (Gigant Shock)",
    damage: 130,
    weight: 2.6,
    elasticity: 0.15,
    radius: 20,
    explosionRadius: 180, // High impact!
    color: 0xe64980, // deep magenta pink
    desc: "엄청나게 육중한 특대형 특이 기가 폭탄으로, 주변 요새 건물 전체를 분쇄하는 초대형 충격파를 발생시킵니다.",
    ammoLimit: 1,
    specialEffect: 'giant_explode'
  }
};
