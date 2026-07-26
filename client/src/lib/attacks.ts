// Playful "attacks" friends can throw at each other. They ride the existing
// realtime effect channel (kind = attack name) and show a full-screen splat +
// vibration on both phones. Heavy ones also shake the screen.

export interface Attack {
  kind: string;
  emoji: string;
  label: string;
  vibe: number[];
  shake: boolean;
}

export const ATTACKS: Record<string, Attack> = {
  punch: { kind: 'punch', emoji: '👊', label: 'Punch', vibe: [0, 90, 50, 140], shake: true },
  slap: { kind: 'slap', emoji: '🖐️', label: 'Slap', vibe: [0, 60, 30, 90], shake: true },
  slipper: { kind: 'slipper', emoji: '🩴', label: 'Slipper', vibe: [0, 70, 40, 100], shake: true },
  tomato: { kind: 'tomato', emoji: '🍅', label: 'Tomato', vibe: [0, 50], shake: false },
  egg: { kind: 'egg', emoji: '🥚', label: 'Egg', vibe: [0, 55], shake: false },
  water: { kind: 'water', emoji: '💦', label: 'Splash', vibe: [0, 40], shake: false },
  pie: { kind: 'pie', emoji: '🥧', label: 'Pie', vibe: [0, 55], shake: false },
};

export const ATTACK_LIST = Object.values(ATTACKS);

export function isAttack(kind: string): boolean {
  return !!ATTACKS[kind];
}
