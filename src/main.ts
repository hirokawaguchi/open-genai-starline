import { drawWorld } from './draw';
import {
  createWorld,
  FIELD_H,
  FIELD_W,
  type Input,
  startGame,
  tick,
  type World,
} from './logic';
import { playStarlineCue } from './sound';

const HIGH_KEY = 'open-genai.starline.highScore';
const MUTE_KEY = 'open-genai.starline.muted';

const required = <T extends Element>(selector: string): T => {
  const node = document.querySelector<T>(selector);
  if (!node) {
    throw new Error(`${selector} がありません`);
  }
  return node;
};

const canvas = required<HTMLCanvasElement>('#field');
const scoreEl = required<HTMLElement>('#score');
const highEl = required<HTMLElement>('#high');
const livesEl = required<HTMLElement>('#lives');
const waveEl = required<HTMLElement>('#wave');
const chainEl = required<HTMLElement>('#chain');
const powerEl = required<HTMLElement>('#power');
const overlay = required<HTMLElement>('#overlay');
const startBtn = required<HTMLButtonElement>('#start');
const muteBtn = required<HTMLButtonElement>('#mute');
const overlayTitle = overlay.querySelector('strong');
const overlayNote = overlay.querySelector('span');
const ctx = canvas.getContext('2d');
if (!ctx) {
  throw new Error('canvas を初期化できません');
}

let world: World = createWorld();
const held: Input = { left: false, right: false, fire: false };
let high = Number(localStorage.getItem(HIGH_KEY) || '0') || 0;
let muted = localStorage.getItem(MUTE_KEY) === '1';

const paintHud = () => {
  scoreEl.textContent = String(world.score);
  highEl.textContent = String(high);
  livesEl.textContent = String(world.lives);
  waveEl.textContent = String(world.wave);
  chainEl.textContent = world.chain > 1 ? String(world.chain) : '—';
  powerEl.textContent = world.power === 'spread' ? 'あり' : '—';
  muteBtn.textContent = muted ? '音を出す' : '消音';
  if (world.status === 'playing') {
    overlay.hidden = true;
    return;
  }
  overlay.hidden = false;
  if (world.status === 'ready') {
    if (overlayTitle) overlayTitle.textContent = '星列防衛';
    if (overlayNote) overlayNote.textContent = 'スペースではじめる';
    startBtn.textContent = 'はじめる';
  } else if (world.status === 'over') {
    if (overlayTitle) overlayTitle.textContent = '負け';
    if (overlayNote) overlayNote.textContent = `得点 ${world.score}`;
    startBtn.textContent = 'もう一度';
  } else {
    if (overlayTitle) overlayTitle.textContent = '波を突破';
    if (overlayNote) overlayNote.textContent = '次の波へ進みます';
    startBtn.textContent = '次の波へ';
  }
};

const begin = () => {
  if (world.status === 'playing' || world.status === 'cleared') {
    return;
  }
  const fire = held.fire;
  world = startGame();
  held.left = false;
  held.right = false;
  held.fire = fire;
  paintHud();
};

startBtn.addEventListener('click', begin);
muteBtn.addEventListener('click', () => {
  muted = !muted;
  localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  paintHud();
});

document.querySelectorAll<HTMLButtonElement>('[data-hold]').forEach((button) => {
  const key = button.dataset.hold;
  if (key !== 'left' && key !== 'right' && key !== 'fire') {
    return;
  }
  const down = (event: Event) => {
    event.preventDefault();
    held[key] = true;
    if (key === 'fire') {
      begin();
    }
  };
  const up = (event: Event) => {
    event.preventDefault();
    held[key] = false;
  };
  button.addEventListener('pointerdown', down);
  button.addEventListener('pointerup', up);
  button.addEventListener('pointerleave', up);
  button.addEventListener('pointercancel', up);
});

const onKey = (event: KeyboardEvent, down: boolean) => {
  if (event.repeat && down) {
    return;
  }
  const key = event.key;
  if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
    held.left = down;
    event.preventDefault();
  } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
    held.right = down;
    event.preventDefault();
  } else if (key === ' ' || key === 'Spacebar') {
    held.fire = down;
    event.preventDefault();
    if (down) {
      begin();
    }
  }
};
window.addEventListener('keydown', (event) => onKey(event, true));
window.addEventListener('keyup', (event) => onKey(event, false));

const dpr = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = FIELD_W * dpr;
canvas.height = FIELD_H * dpr;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

let last = performance.now();
const loop = (now: number) => {
  const dt = document.hidden ? 0 : now - last;
  last = now;
  const stepped = tick(world, dt, { ...held });
  world = stepped.world;
  const { events } = stepped;
  if (events.fired) playStarlineCue(muted, 'fire');
  if (events.enemyDown > 0) playStarlineCue(muted, 'down');
  if (events.bonus) playStarlineCue(muted, 'bonus');
  if (events.playerHurt) playStarlineCue(muted, 'hurt');
  if (events.waveCleared) playStarlineCue(muted, 'clear');
  if (events.gameOver) playStarlineCue(muted, 'over');
  if (world.score > high) {
    high = world.score;
    localStorage.setItem(HIGH_KEY, String(high));
  }
  drawWorld(ctx, world);
  paintHud();
  requestAnimationFrame(loop);
};
drawWorld(ctx, world);
paintHud();
requestAnimationFrame(loop);
