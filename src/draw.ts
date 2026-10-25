import type { Cell, Courier, Enemy, Raider, World } from './logic';
import { courierRect, enemyRect, FIELD_H, FIELD_W, playerRect, raiderRect } from './logic';

const SKY = '#102033';
const STAR = '#d5e4f2';
const HULL = '#3dbea5';
const HULL_POWER = '#f0d48a';
const HULL_DARK = '#1b6f62';
const RAIDER = '#f28482';
const COURIER = '#f6d36b';
const BOLT = '#f4f7fb';
const ENEMY_BOLT = '#e07a5f';
const ROW_COLORS = ['#f0d48a', '#e7a05a', '#7eb8c9', '#c4d7a4', '#e8efe6'];

const STARS = Array.from({ length: 42 }, (_, index) => ({
  x: (index * 97) % FIELD_W,
  y: (index * 53) % (FIELD_H - 40),
  s: index % 4 === 0 ? 2 : 1,
}));

const bunkerColor = (hp: number): string => {
  if (hp >= 3) {
    return '#9eb4c6';
  }
  if (hp === 2) {
    return '#6e8496';
  }
  return '#4c5e6c';
};

const drawDiamond = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w, y + h / 2);
  ctx.lineTo(x + w / 2, y + h);
  ctx.lineTo(x, y + h / 2);
  ctx.closePath();
  ctx.fill();
};

const drawKite = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w, y + h * 0.62);
  ctx.lineTo(x + w * 0.72, y + h);
  ctx.lineTo(x + w * 0.28, y + h);
  ctx.lineTo(x, y + h * 0.62);
  ctx.closePath();
  ctx.fill();
};

const drawBar = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.35);
  ctx.lineTo(x + w * 0.2, y);
  ctx.lineTo(x + w * 0.8, y);
  ctx.lineTo(x + w, y + h * 0.35);
  ctx.lineTo(x + w * 0.84, y + h);
  ctx.lineTo(x + w * 0.16, y + h);
  ctx.closePath();
  ctx.fill();
};

const drawEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy, world: World) => {
  const rect = enemyRect(world, enemy);
  const bob = world.steps % 2 === 0 ? 0 : 1;
  ctx.fillStyle = ROW_COLORS[enemy.row] ?? ROW_COLORS[0];
  if (enemy.row === 0) {
    drawDiamond(ctx, rect.x, rect.y + bob, rect.w, rect.h);
    return;
  }
  if (enemy.row <= 2) {
    drawKite(ctx, rect.x, rect.y + bob, rect.w, rect.h);
    return;
  }
  drawBar(ctx, rect.x, rect.y + bob, rect.w, rect.h);
};

const drawPlayer = (ctx: CanvasRenderingContext2D, world: World) => {
  const rect = playerRect(world);
  const blink = world.invulnMs > 0 && Math.floor(world.invulnMs / 80) % 2 === 0;
  ctx.globalAlpha = blink ? 0.35 : 1;
  ctx.fillStyle = world.power === 'spread' ? HULL_POWER : HULL;
  ctx.beginPath();
  ctx.moveTo(rect.x + rect.w / 2, rect.y);
  ctx.lineTo(rect.x + rect.w, rect.y + rect.h);
  ctx.lineTo(rect.x + rect.w * 0.72, rect.y + rect.h * 0.72);
  ctx.lineTo(rect.x + rect.w * 0.28, rect.y + rect.h * 0.72);
  ctx.lineTo(rect.x, rect.y + rect.h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = HULL_DARK;
  ctx.fillRect(rect.x + rect.w / 2 - 1.5, rect.y + 4, 3, rect.h - 6);
  ctx.globalAlpha = 1;
};

const drawRaider = (ctx: CanvasRenderingContext2D, raider: Raider) => {
  const rect = raiderRect(raider);
  ctx.fillStyle = RAIDER;
  drawKite(ctx, rect.x, rect.y, rect.w, rect.h);
};

const drawCourier = (ctx: CanvasRenderingContext2D, courier: Courier) => {
  const rect = courierRect(courier);
  ctx.fillStyle = COURIER;
  drawDiamond(ctx, rect.x, rect.y, rect.w, rect.h);
};

const drawCell = (ctx: CanvasRenderingContext2D, cell: Cell) => {
  ctx.fillStyle = bunkerColor(cell.hp);
  ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
};

export const drawWorld = (ctx: CanvasRenderingContext2D, world: World) => {
  ctx.clearRect(0, 0, FIELD_W, FIELD_H);
  ctx.fillStyle = SKY;
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);
  ctx.fillStyle = STAR;
  for (const star of STARS) {
    ctx.globalAlpha = star.s === 2 ? 0.85 : 0.45;
    ctx.fillRect(star.x, star.y, star.s, star.s);
  }
  ctx.globalAlpha = 1;
  for (const cell of world.cells) {
    drawCell(ctx, cell);
  }
  for (const enemy of world.enemies) {
    if (enemy.alive) {
      drawEnemy(ctx, enemy, world);
    }
  }
  for (const raider of world.raiders) {
    drawRaider(ctx, raider);
  }
  if (world.courier) {
    drawCourier(ctx, world.courier);
  }
  ctx.fillStyle = BOLT;
  for (const bolt of world.playerBolts) {
    ctx.fillRect(bolt.x, bolt.y, bolt.w, bolt.h);
  }
  for (const bolt of world.enemyBolts) {
    ctx.fillStyle = ENEMY_BOLT;
    ctx.fillRect(bolt.x, bolt.y, bolt.w, bolt.h);
  }
  drawPlayer(ctx, world);
  ctx.strokeStyle = '#1d3348';
  ctx.beginPath();
  ctx.moveTo(8, FIELD_H - 8);
  ctx.lineTo(FIELD_W - 8, FIELD_H - 8);
  ctx.stroke();
};
