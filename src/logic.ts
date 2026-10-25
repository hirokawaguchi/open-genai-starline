/** 星列防衛のルール。描画や入力装置には依存しない。 */

export const FIELD_W = 480;
export const FIELD_H = 560;
export const COLS = 8;
export const ROWS = 5;
export const ENEMY_W = 26;
export const ENEMY_H = 18;
export const GAP_X = 12;
export const GAP_Y = 12;
export const STEP_X = 10;
export const STEP_Y = 16;
export const EDGE_MARGIN = 12;
export const PLAYER_W = 32;
export const PLAYER_H = 16;
export const PLAYER_Y = 512;
export const PLAYER_SPEED = 400;
export const BOLT_W = 3;
export const BOLT_H = 12;
export const PLAYER_BOLT_SPEED = 680;
export const ENEMY_BOLT_SPEED = 240;
export const MAX_PLAYER_BOLTS = 3;
export const FIRE_GAP_MS = 140;
export const CHAIN_MS = 1400;
export const SPREAD_MS = 7000;
export const LIVES = 3;
export const INVULN_MS = 1100;
export const CLEAR_MS = 900;
export const CELL = 6;

export type Rect = { x: number; y: number; w: number; h: number };

export type Status = 'ready' | 'playing' | 'cleared' | 'over';

export type Enemy = { id: number; col: number; row: number; alive: boolean };

export type Bolt = {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
};

export type Raider = { id: number; x: number; y: number; vx: number; wobble: number };

export type Courier = { id: number; x: number; y: number; vx: number };

export type Power = 'none' | 'spread';

export type Cell = { id: number; x: number; y: number; w: number; h: number; hp: number };

export type Input = { left: boolean; right: boolean; fire: boolean };

export type World = {
  status: Status;
  wave: number;
  score: number;
  lives: number;
  playerX: number;
  enemies: Enemy[];
  formationX: number;
  formationY: number;
  dir: 1 | -1;
  steps: number;
  marchMs: number;
  playerBolts: Bolt[];
  fireMs: number;
  enemyBolts: Bolt[];
  enemyFireMs: number;
  raiders: Raider[];
  raidMs: number;
  courier: Courier | null;
  courierMs: number;
  power: Power;
  powerMs: number;
  chain: number;
  chainMs: number;
  cells: Cell[];
  nextId: number;
  invulnMs: number;
  clearMs: number;
  rng: number;
};

export type Events = {
  fired: boolean;
  enemyDown: number;
  bonus: boolean;
  playerHurt: boolean;
  waveCleared: boolean;
  gameOver: boolean;
};

export const emptyEvents = (): Events => ({
  fired: false,
  enemyDown: 0,
  bonus: false,
  playerHurt: false,
  waveCleared: false,
  gameOver: false,
});

export const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export const scoreForRow = (row: number): number => (ROWS - row) * 10;

export const enemyRect = (world: Pick<World, 'formationX' | 'formationY'>, enemy: Enemy): Rect => ({
  x: world.formationX + enemy.col * (ENEMY_W + GAP_X),
  y: world.formationY + enemy.row * (ENEMY_H + GAP_Y),
  w: ENEMY_W,
  h: ENEMY_H,
});

export const playerRect = (world: Pick<World, 'playerX'>): Rect => ({
  x: world.playerX,
  y: PLAYER_Y,
  w: PLAYER_W,
  h: PLAYER_H,
});

const stride = (count: number, size: number, gap: number): number =>
  count * size + (count - 1) * gap;

const bunker = (
  originX: number,
  originY: number,
  idStart: number,
): { cells: Cell[]; nextId: number } => {
  const cells: Cell[] = [];
  let id = idStart;
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      if (row === 3 && (col === 3 || col === 4)) {
        continue;
      }
      cells.push({
        id,
        x: originX + col * CELL,
        y: originY + row * CELL,
        w: CELL - 1,
        h: CELL - 1,
        hp: 3,
      });
      id += 1;
    }
  }
  return { cells, nextId: id };
};

const layBunkers = (idStart: number): { cells: Cell[]; nextId: number } => {
  const width = 8 * CELL;
  const y = 458;
  const centers = [FIELD_W * 0.22, FIELD_W * 0.5, FIELD_W * 0.78];
  let id = idStart;
  const cells: Cell[] = [];
  for (const center of centers) {
    const laid = bunker(Math.round(center - width / 2), y, id);
    cells.push(...laid.cells);
    id = laid.nextId;
  }
  return { cells, nextId: id };
};

const layEnemies = (idStart: number): { enemies: Enemy[]; nextId: number } => {
  const enemies: Enemy[] = [];
  let id = idStart;
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      enemies.push({ id, col, row, alive: true });
      id += 1;
    }
  }
  return { enemies, nextId: id };
};

const nextRng = (rng: number): { rng: number; unit: number } => {
  const next = (Math.imul(rng >>> 0, 1664525) + 1013904223) >>> 0;
  return { rng: next, unit: next / 4294967296 };
};

export const marchInterval = (world: Pick<World, 'enemies' | 'wave'>): number => {
  const alive = world.enemies.filter((enemy) => enemy.alive).length;
  const ratio = Math.max(alive, 1) / (COLS * ROWS);
  const waveScale = 0.86 ** (world.wave - 1);
  return Math.max(60, Math.round(380 * ratio * waveScale));
};

const enemyFireInterval = (wave: number): number => Math.max(260, 720 - (wave - 1) * 70);

export const raiderRect = (raider: Raider): Rect => ({
  x: raider.x,
  y: raider.y,
  w: ENEMY_W,
  h: ENEMY_H,
});

export const courierRect = (courier: Courier): Rect => ({
  x: courier.x,
  y: courier.y,
  w: 22,
  h: 12,
});

export const createWorld = (): World => {
  const enemies = layEnemies(1);
  const bunkers = layBunkers(enemies.nextId);
  const formationW = stride(COLS, ENEMY_W, GAP_X);
  return {
    status: 'ready',
    wave: 1,
    score: 0,
    lives: LIVES,
    playerX: 156,
    enemies: enemies.enemies,
    formationX: Math.round((FIELD_W - formationW) / 2),
    formationY: 52,
    dir: 1,
    steps: 0,
    marchMs: marchInterval({ enemies: enemies.enemies, wave: 1 }),
    playerBolts: [],
    fireMs: 0,
    enemyBolts: [],
    enemyFireMs: enemyFireInterval(1),
    raiders: [],
    raidMs: 2200,
    courier: null,
    courierMs: 7000,
    power: 'none',
    powerMs: 0,
    chain: 0,
    chainMs: 0,
    cells: bunkers.cells,
    nextId: bunkers.nextId,
    invulnMs: 0,
    clearMs: 0,
    rng: 0x1a2b3c4d,
  };
};

export const startGame = (): World => ({
  ...createWorld(),
  status: 'playing',
});

export const beginNextWave = (world: World): World => {
  const fresh = createWorld();
  const wave = world.wave + 1;
  return {
    ...fresh,
    status: 'playing',
    wave,
    score: world.score,
    lives: world.lives,
    playerX: world.playerX,
    marchMs: marchInterval({ enemies: fresh.enemies, wave }),
    enemyFireMs: enemyFireInterval(wave),
    rng: world.rng,
  };
};

/** 横隊を一歩進める。端なら向きを変えて一段下がる。 */
export const stepFormation = (world: World): World => {
  const alive = world.enemies.filter((enemy) => enemy.alive);
  if (alive.length === 0) {
    return world;
  }
  const rects = alive.map((enemy) => enemyRect(world, enemy));
  const left = Math.min(...rects.map((rect) => rect.x));
  const right = Math.max(...rects.map((rect) => rect.x + rect.w));
  const dx = world.dir * STEP_X;
  const hitsEdge =
    (world.dir > 0 && right + dx > FIELD_W - EDGE_MARGIN) ||
    (world.dir < 0 && left + dx < EDGE_MARGIN);
  if (hitsEdge) {
    return {
      ...world,
      dir: world.dir === 1 ? -1 : 1,
      formationY: world.formationY + STEP_Y,
      steps: world.steps + 1,
    };
  }
  return { ...world, formationX: world.formationX + dx, steps: world.steps + 1 };
};

const takeId = (world: World): { id: number; world: World } => ({
  id: world.nextId,
  world: { ...world, nextId: world.nextId + 1 },
});

const bottomEnemyInColumn = (world: World, col: number): Enemy | undefined => {
  const stacked = world.enemies.filter((enemy) => enemy.alive && enemy.col === col);
  return stacked.sort((a, b) => b.row - a.row)[0];
};

const spawnEnemyBolt = (world: World): World => {
  const columns = [
    ...new Set(world.enemies.filter((enemy) => enemy.alive).map((enemy) => enemy.col)),
  ];
  if (columns.length === 0) {
    return world;
  }
  const rolled = nextRng(world.rng);
  const col = columns[Math.floor(rolled.unit * columns.length)] ?? columns[0];
  const shooter = bottomEnemyInColumn(world, col);
  if (!shooter) {
    return { ...world, rng: rolled.rng };
  }
  const rect = enemyRect(world, shooter);
  const issued = takeId({ ...world, rng: rolled.rng });
  const bolt: Bolt = {
    id: issued.id,
    x: rect.x + rect.w / 2 - BOLT_W / 2,
    y: rect.y + rect.h,
    w: BOLT_W,
    h: BOLT_H,
    vx: 0,
    vy: ENEMY_BOLT_SPEED,
  };
  return { ...issued.world, enemyBolts: [...issued.world.enemyBolts, bolt] };
};

const damageCell = (cells: Cell[], id: number): Cell[] =>
  cells.flatMap((cell) => {
    if (cell.id !== id) {
      return [cell];
    }
    if (cell.hp <= 1) {
      return [];
    }
    return [{ ...cell, hp: cell.hp - 1 }];
  });

const grant = (world: World, base: number): World => {
  const chain = Math.min(world.chain + 1, 8);
  const mult = Math.min(chain, 4);
  return { ...world, chain, chainMs: CHAIN_MS, score: world.score + base * mult };
};

const peelRaider = (world: World): World => {
  if (world.raiders.length >= 2) {
    return world;
  }
  const bottoms: Enemy[] = [];
  const columns = new Set(world.enemies.filter((enemy) => enemy.alive).map((enemy) => enemy.col));
  for (const col of columns) {
    const enemy = bottomEnemyInColumn(world, col);
    if (enemy) {
      bottoms.push(enemy);
    }
  }
  if (bottoms.length === 0) {
    return world;
  }
  const rolled = nextRng(world.rng);
  const enemy = bottoms[Math.floor(rolled.unit * bottoms.length)] ?? bottoms[0];
  if (!enemy) {
    return { ...world, rng: rolled.rng };
  }
  const placed = { ...world, rng: rolled.rng };
  const rect = enemyRect(placed, enemy);
  const issued = takeId(placed);
  const aim = placed.playerX + PLAYER_W / 2 - (rect.x + rect.w / 2);
  const raider: Raider = {
    id: issued.id,
    x: rect.x,
    y: rect.y,
    vx: Math.max(-120, Math.min(120, aim * 0.8)),
    wobble: rolled.unit * Math.PI * 2,
  };
  return {
    ...issued.world,
    enemies: issued.world.enemies.map((item) =>
      item.id === enemy.id ? { ...item, alive: false } : item,
    ),
    raiders: [...issued.world.raiders, raider],
  };
};

const spawnCourier = (world: World): World => {
  if (world.courier) {
    return world;
  }
  const issued = takeId(world);
  return {
    ...issued.world,
    courier: { id: issued.id, x: -24, y: 18, vx: 150 + world.wave * 8 },
  };
};

type Target =
  | { kind: 'enemy'; y: number; id: number; row: number }
  | { kind: 'raider'; y: number; id: number }
  | { kind: 'courier'; y: number }
  | { kind: 'cell'; y: number; id: number };

const nearestTarget = (bolt: Bolt, world: World, cells: Cell[]): Target | null => {
  const hits: Target[] = [];
  for (const enemy of world.enemies) {
    if (!enemy.alive) {
      continue;
    }
    const rect = enemyRect(world, enemy);
    if (overlaps(bolt, rect)) {
      hits.push({ kind: 'enemy', y: rect.y, id: enemy.id, row: enemy.row });
    }
  }
  for (const raider of world.raiders) {
    const rect = raiderRect(raider);
    if (overlaps(bolt, rect)) {
      hits.push({ kind: 'raider', y: rect.y, id: raider.id });
    }
  }
  if (world.courier && overlaps(bolt, courierRect(world.courier))) {
    hits.push({ kind: 'courier', y: courierRect(world.courier).y });
  }
  for (const cell of cells) {
    if (overlaps(bolt, cell)) {
      hits.push({ kind: 'cell', y: cell.y, id: cell.id });
    }
  }
  hits.sort((a, b) => b.y - a.y);
  return hits[0] ?? null;
};

const launchBolt = (world: World, vx: number): { world: World; bolt: Bolt } => {
  const issued = takeId(world);
  const player = playerRect(issued.world);
  return {
    world: issued.world,
    bolt: {
      id: issued.id,
      x: player.x + player.w / 2 - BOLT_W / 2,
      y: player.y - BOLT_H,
      w: BOLT_W,
      h: BOLT_H,
      vx,
      vy: -PLAYER_BOLT_SPEED,
    },
  };
};

const resolveBolts = (world: World, events: Events): World => {
  let next: World = { ...world, enemies: world.enemies.map((enemy) => ({ ...enemy })) };
  let cells = next.cells.map((cell) => ({ ...cell }));
  const keptBolts: Bolt[] = [];

  for (const bolt of next.playerBolts) {
    const hit = nearestTarget(bolt, next, cells);
    if (!hit) {
      keptBolts.push(bolt);
      continue;
    }
    if (hit.kind === 'enemy') {
      next = grant(next, scoreForRow(hit.row));
      next = {
        ...next,
        enemies: next.enemies.map((item) =>
          item.id === hit.id ? { ...item, alive: false } : item,
        ),
      };
      events.enemyDown += 1;
    } else if (hit.kind === 'raider') {
      next = grant(next, 80);
      next = { ...next, raiders: next.raiders.filter((raider) => raider.id !== hit.id) };
      events.enemyDown += 1;
    } else if (hit.kind === 'courier') {
      next = grant(next, 200);
      next = { ...next, courier: null, power: 'spread', powerMs: SPREAD_MS };
      events.bonus = true;
    } else {
      cells = damageCell(cells, hit.id);
    }
  }
  next = { ...next, playerBolts: keptBolts, cells };

  const kept: Bolt[] = [];
  let hurt = false;
  const player = playerRect(next);
  for (const bolt of next.enemyBolts) {
    if (bolt.y > FIELD_H) {
      continue;
    }
    const cell = cells.filter((item) => overlaps(bolt, item)).sort((a, b) => a.y - b.y)[0];
    if (cell) {
      cells = damageCell(cells, cell.id);
      continue;
    }
    if (!hurt && next.invulnMs <= 0 && overlaps(bolt, player)) {
      hurt = true;
      continue;
    }
    kept.push(bolt);
  }

  const touching =
    next.invulnMs <= 0 &&
    (next.enemies.some((enemy) => enemy.alive && overlaps(enemyRect(next, enemy), player)) ||
      next.raiders.some((raider) => overlaps(raiderRect(raider), player)));
  if (touching) {
    hurt = true;
  }

  next = { ...next, cells, enemyBolts: kept };
  if (hurt) {
    const lives = next.lives - 1;
    events.playerHurt = true;
    next = {
      ...next,
      lives,
      invulnMs: INVULN_MS,
      enemyBolts: [],
      raiders: next.raiders.filter((raider) => !overlaps(raiderRect(raider), player)),
    };
    if (lives <= 0) {
      events.gameOver = true;
      return { ...next, lives: 0, status: 'over' };
    }
  }
  const reachedGround = next.enemies.some((enemy) => {
    if (!enemy.alive) {
      return false;
    }
    const rect = enemyRect(next, enemy);
    return rect.y + rect.h >= FIELD_H - 4;
  });
  if (reachedGround) {
    events.gameOver = true;
    return { ...next, lives: 0, status: 'over' };
  }
  const alive = next.enemies.some((enemy) => enemy.alive);
  if (!alive && next.raiders.length === 0) {
    events.waveCleared = true;
    return { ...next, status: 'cleared', clearMs: CLEAR_MS, playerBolts: [], enemyBolts: [] };
  }
  return next;
};

export const tick = (
  world: World,
  dtMs: number,
  input: Input,
): { world: World; events: Events } => {
  const events = emptyEvents();
  const dt = Math.max(0, Math.min(dtMs, 40));
  if (world.status === 'ready' || world.status === 'over') {
    return { world, events };
  }
  if (world.status === 'cleared') {
    const clearMs = world.clearMs - dt;
    if (clearMs > 0) {
      return { world: { ...world, clearMs }, events };
    }
    return { world: beginNextWave(world), events };
  }

  const chainMs = Math.max(0, world.chainMs - dt);
  const powerMs = Math.max(0, world.powerMs - dt);
  let next: World = {
    ...world,
    invulnMs: Math.max(0, world.invulnMs - dt),
    fireMs: Math.max(0, world.fireMs - dt),
    chainMs,
    chain: chainMs === 0 ? 0 : world.chain,
    powerMs,
    power: powerMs === 0 ? 'none' : world.power,
  };
  const dir = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  const playerX = Math.max(
    8,
    Math.min(FIELD_W - PLAYER_W - 8, next.playerX + (dir * PLAYER_SPEED * dt) / 1000),
  );
  next = { ...next, playerX };

  if (input.fire && next.fireMs <= 0) {
    const spread = next.power === 'spread' && next.playerBolts.length === 0;
    const single = next.power !== 'spread' && next.playerBolts.length < MAX_PLAYER_BOLTS;
    if (spread || single) {
      const angles = spread ? [-160, 0, 160] : [0];
      const bolts = [...next.playerBolts];
      for (const vx of angles) {
        const launched = launchBolt(next, vx);
        next = launched.world;
        bolts.push(launched.bolt);
      }
      next = { ...next, playerBolts: bolts, fireMs: spread ? 260 : FIRE_GAP_MS };
      events.fired = true;
    }
  }

  next = {
    ...next,
    playerBolts: next.playerBolts.flatMap((bolt) => {
      const x = bolt.x + (bolt.vx * dt) / 1000;
      const y = bolt.y + (bolt.vy * dt) / 1000;
      if (y + bolt.h < 0 || x > FIELD_W || x + bolt.w < 0) {
        return [];
      }
      return [{ ...bolt, x, y }];
    }),
    enemyBolts: next.enemyBolts
      .map((bolt) => ({
        ...bolt,
        x: bolt.x + (bolt.vx * dt) / 1000,
        y: bolt.y + (bolt.vy * dt) / 1000,
      }))
      .filter((bolt) => bolt.y < FIELD_H + bolt.h),
    raiders: next.raiders.flatMap((raider) => {
      const dive = 150 + next.wave * 18;
      const y = raider.y + (dive * dt) / 1000;
      const x = raider.x + (raider.vx * dt) / 1000 + Math.sin(raider.wobble) * 30 * (dt / 1000);
      if (y > FIELD_H) {
        return [];
      }
      return [{ ...raider, x, y, wobble: raider.wobble + dt * 0.01 }];
    }),
    courier: next.courier
      ? next.courier.x + (next.courier.vx * dt) / 1000 > FIELD_W + 24
        ? null
        : { ...next.courier, x: next.courier.x + (next.courier.vx * dt) / 1000 }
      : null,
  };

  let enemyFireMs = next.enemyFireMs - dt;
  if (enemyFireMs <= 0) {
    next = spawnEnemyBolt({ ...next, enemyFireMs });
    enemyFireMs = enemyFireInterval(next.wave);
  }
  next = { ...next, enemyFireMs };

  let marchMs = next.marchMs - dt;
  if (marchMs <= 0) {
    next = stepFormation(next);
    marchMs = marchInterval(next);
  }
  let raidMs = next.raidMs - dt;
  if (raidMs <= 0) {
    next = peelRaider(next);
    raidMs = Math.max(800, 2200 - (next.wave - 1) * 150);
  }
  let courierMs = next.courierMs - dt;
  if (courierMs <= 0 && !next.courier) {
    next = spawnCourier(next);
    courierMs = Math.max(4200, 9000 - (next.wave - 1) * 400);
  }
  next = { ...next, marchMs, raidMs, courierMs };

  next = resolveBolts(next, events);
  return { world: next, events };
};
