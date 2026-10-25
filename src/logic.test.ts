import { describe, expect, it } from 'vitest';
import {
  BOLT_H,
  BOLT_W,
  beginNextWave,
  EDGE_MARGIN,
  ENEMY_W,
  enemyRect,
  FIELD_H,
  FIELD_W,
  overlaps,
  PLAYER_H,
  PLAYER_Y,
  playerRect,
  STEP_X,
  STEP_Y,
  scoreForRow,
  startGame,
  stepFormation,
  tick,
} from './logic';

const idle = { left: false, right: false, fire: false };

describe('overlaps', () => {
  it('重なっている矩形だけ真になる', () => {
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 9, y: 9, w: 4, h: 4 })).toBe(true);
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 4, h: 4 })).toBe(false);
  });
});

describe('stepFormation', () => {
  it('右端では向きを変えて一段下がる', () => {
    const world = startGame();
    const right = Math.max(...world.enemies.map((enemy) => enemyRect(world, enemy).x + ENEMY_W));
    const limit = FIELD_W - EDGE_MARGIN;
    const delta = limit - STEP_X - right + 1;
    const placed = { ...world, formationX: world.formationX + delta, dir: 1 as const };
    const next = stepFormation(placed);
    expect(next.dir).toBe(-1);
    expect(next.formationY).toBe(placed.formationY + STEP_Y);
    expect(next.formationX).toBe(placed.formationX);
  });
});

describe('tick', () => {
  it('自弾が当たった敵を消し、列に応じた得点を足す', () => {
    const world = startGame();
    const enemy = world.enemies.find((item) => item.row === 0 && item.col === 0);
    if (!enemy) {
      throw new Error('敵がいない');
    }
    const rect = enemyRect(world, enemy);
    const armed = {
      ...world,
      playerBolts: [{ id: 9000, x: rect.x, y: rect.y, w: BOLT_W, h: BOLT_H, vx: 0, vy: -1 }],
    };
    const { world: next, events } = tick(armed, 0, idle);
    expect(next.enemies.find((item) => item.id === enemy.id)?.alive).toBe(false);
    expect(next.score).toBe(scoreForRow(0));
    expect(events.enemyDown).toBe(1);
    expect(next.playerBolts).toHaveLength(0);
    expect(next.chain).toBe(1);
  });

  it('連続して当てると次の得点が倍になる', () => {
    const world = startGame();
    const first = world.enemies.find((item) => item.row === 0 && item.col === 0);
    const second = world.enemies.find((item) => item.row === 1 && item.col === 1);
    if (!first || !second) {
      throw new Error('敵がいない');
    }
    const top = enemyRect(world, first);
    const lower = enemyRect(world, second);
    const armed = {
      ...world,
      playerBolts: [
        { id: 9100, x: top.x, y: top.y, w: BOLT_W, h: BOLT_H, vx: 0, vy: -1 },
        { id: 9101, x: lower.x, y: lower.y, w: BOLT_W, h: BOLT_H, vx: 0, vy: -1 },
      ],
    };
    const { world: next } = tick(armed, 0, idle);
    expect(next.score).toBe(scoreForRow(0) + scoreForRow(1) * 2);
    expect(next.chain).toBe(2);
  });

  it('最後の一機を落とすと波をクリアする', () => {
    const world = startGame();
    const survivor = world.enemies[0];
    if (!survivor) {
      throw new Error('敵がいない');
    }
    const rect = enemyRect(world, survivor);
    const armed = {
      ...world,
      enemies: world.enemies.map((enemy) => ({ ...enemy, alive: enemy.id === survivor.id })),
      playerBolts: [{ id: 9001, x: rect.x, y: rect.y, w: BOLT_W, h: BOLT_H, vx: 0, vy: -1 }],
    };
    const { world: next, events } = tick(armed, 0, idle);
    expect(events.waveCleared).toBe(true);
    expect(next.status).toBe('cleared');
  });

  it('敵弾が当たると残機が減り、最後の残機でゲームオーバーになる', () => {
    const world = { ...startGame(), lives: 1, invulnMs: 0 };
    const player = playerRect(world);
    const armed = {
      ...world,
      enemyBolts: [
        { id: 9002, x: player.x + 4, y: PLAYER_Y, w: BOLT_W, h: PLAYER_H, vx: 0, vy: 1 },
      ],
    };
    const { world: next, events } = tick(armed, 0, idle);
    expect(events.playerHurt).toBe(true);
    expect(events.gameOver).toBe(true);
    expect(next.status).toBe('over');
    expect(next.lives).toBe(0);
  });

  it('横隊が地面まで降りると負けになる', () => {
    const world = startGame();
    const sunk = {
      ...world,
      formationY: FIELD_H,
    };
    const { world: next, events } = tick(sunk, 0, idle);
    expect(events.gameOver).toBe(true);
    expect(next.status).toBe('over');
  });

  it('一定時間進めても座標と残機が壊れない', () => {
    let world = startGame();
    for (let step = 0; step < 2400; step += 1) {
      const stepped = tick(world, 16, {
        left: step % 90 < 45,
        right: step % 90 >= 45,
        fire: step % 12 < 6,
      });
      world = stepped.world;
      expect(Number.isFinite(world.playerX)).toBe(true);
      expect(world.lives).toBeGreaterThanOrEqual(0);
      expect(world.score).toBeGreaterThanOrEqual(0);
      if (world.status === 'over') {
        break;
      }
    }
    expect(['playing', 'cleared', 'over']).toContain(world.status);
    expect(world.score).toBeGreaterThan(0);
  });

  it('急降下した敵に触れると残機が減る', () => {
    const world = { ...startGame(), lives: 2 };
    const player = playerRect(world);
    const armed = {
      ...world,
      raiders: [{ id: 9300, x: player.x, y: PLAYER_Y, vx: 0, wobble: 0 }],
    };
    const { world: next, events } = tick(armed, 0, idle);
    expect(events.playerHurt).toBe(true);
    expect(next.lives).toBe(1);
    expect(next.status).toBe('playing');
  });

  it('次の波は得点と残機を引き継ぎ、波番号だけ増やす', () => {
    const world = { ...startGame(), score: 40, lives: 2, wave: 1 };
    const next = beginNextWave(world);
    expect(next.status).toBe('playing');
    expect(next.wave).toBe(2);
    expect(next.score).toBe(40);
    expect(next.lives).toBe(2);
    expect(next.enemies.filter((enemy) => enemy.alive)).toHaveLength(40);
  });
});
