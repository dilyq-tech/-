const STORE = 'quiet-water-world-v1';
const COLORS = ['#81e0bd', '#f6bd70', '#a99af7', '#f184a9', '#72c9eb', '#d0dd83'];
const names = ['Мята', 'Искра', 'Луна', 'Коралл', 'Слива', 'Иней', 'Аврора', 'Мох'];
const random = (min, max) => min + Math.random() * (max - min);

function creature(x, y, parent = null) {
  const genes = parent ? { ...parent.genes } : {
    size: random(5, 9), speed: random(0.35, 0.8), appetite: random(0.5, 1.4),
    resilience: random(0.5, 1), hue: Math.floor(random(0, COLORS.length)),
  };
  if (parent) {
    Object.keys(genes).forEach((key) => {
      if (Math.random() < 0.22) genes[key] = key === 'hue'
        ? Math.floor(random(0, COLORS.length))
        : Math.max(0.25, Math.min(key === 'size' ? 13 : 1.8, genes[key] * random(0.84, 1.16)));
    });
  }
  return {
    id: `${Date.now()}-${Math.random()}`, x, y, vx: random(-0.25, 0.25), vy: random(-0.2, 0.2),
    age: 0, energy: 0.7, genes, generation: parent ? parent.generation + 1 : 1,
    name: parent ? parent.name : names[Math.floor(random(0, names.length))],
  };
}

export function newWorld() {
  return {
    creatures: Array.from({ length: 17 }, () => creature(random(0.12, 0.88), random(0.2, 0.82))),
    food: Array.from({ length: 26 }, () => ({ x: random(0.05, 0.95), y: random(0.18, 0.92), amount: random(0.35, 1) })),
    temperature: 24, elapsedHours: 0, born: 0, eaten: 0, mutations: 0,
    history: Array.from({ length: 18 }, (_, i) => ({ time: (i - 17) * 8, count: 17 })),
    lastSaved: Date.now(),
  };
}

export function loadWorld() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE));
    if (!saved?.creatures || !saved?.food) return newWorld();
    const world = { ...newWorld(), ...saved, lastVisited: saved.lastSaved || Date.now() };
    const offlineHours = Math.min(24 * 21, Math.max(0, (Date.now() - (saved.lastSaved || Date.now())) / 3_600_000 * 60));
    if (offlineHours > 0) advanceWorld(world, offlineHours);
    world.lastSaved = Date.now();
    return world;
  } catch { return newWorld(); }
}

export function saveWorld(world) {
  world.lastSaved = Date.now();
  try { localStorage.setItem(STORE, JSON.stringify(world)); } catch { /* Storage may be unavailable. */ }
}

export function feedWorld(world, amount = 14) {
  for (let i = 0; i < amount; i++) world.food.push({ x: random(0.08, 0.92), y: random(0.18, 0.94), amount: random(0.6, 1) });
}

export function advanceWorld(world, hours) {
  if (!Number.isFinite(hours) || hours <= 0) return;
  // Small steps keep long offline sessions stable while allowing predation and births to interact.
  let remaining = Math.min(hours, 24 * 21);
  const step = Math.min(1, Math.max(1 / 120, remaining));
  while (remaining > 0) {
    const dt = Math.min(step, remaining);
    tick(world, dt);
    remaining -= dt;
  }
}

function tick(world, dt) {
  world.elapsedHours += dt;
  const tempFactor = Math.max(0.2, 1 - Math.abs(world.temperature - 24) * 0.045);
  const births = [];
  for (const fish of world.creatures) {
    fish.age += dt;
    fish.energy -= dt * (0.0019 + fish.genes.size * 0.00011) * (1 + Math.abs(world.temperature - 24) * 0.022);
    fish.vx += random(-0.018, 0.018) * dt + (0.5 - fish.x) * 0.002 * dt;
    fish.vy += random(-0.016, 0.016) * dt + (0.48 - fish.y) * 0.0015 * dt;
    let nearest = null;
    let nearestDistance = Infinity;
    for (const food of world.food) {
      if (food.amount <= 0) continue;
      const dx = food.x - fish.x;
      const dy = food.y - fish.y;
      const distance = dx * dx + dy * dy;
      if (distance < nearestDistance) { nearest = food; nearestDistance = distance; }
    }
    if (nearest && nearestDistance < 0.035) {
      const distance = Math.sqrt(nearestDistance) || 0.001;
      fish.vx += (nearest.x - fish.x) / distance * 0.016 * fish.genes.speed;
      fish.vy += (nearest.y - fish.y) / distance * 0.016 * fish.genes.speed;
      if (distance < 0.018) {
        fish.energy = Math.min(1.5, fish.energy + nearest.amount * 0.29 * fish.genes.appetite);
        nearest.amount = 0;
      }
    }
    fish.vx *= Math.pow(0.97, dt); fish.vy *= Math.pow(0.97, dt);
    fish.x += fish.vx * dt * 0.09 * tempFactor;
    fish.y += fish.vy * dt * 0.09 * tempFactor;
    if (fish.x < 0.04 || fish.x > 0.96) fish.vx *= -1;
    if (fish.y < 0.13 || fish.y > 0.94) fish.vy *= -1;
    fish.x = Math.max(0.04, Math.min(0.96, fish.x));
    fish.y = Math.max(0.13, Math.min(0.94, fish.y));
    if (fish.energy > 1.18 && fish.age > 24 && world.creatures.length + births.length < 64 && Math.random() < dt * 0.012) {
      fish.energy -= 0.34;
      births.push(creature(fish.x + random(-0.035, 0.035), fish.y + random(-0.035, 0.035), fish));
      world.born++;
      if (births[births.length - 1].genes.hue !== fish.genes.hue) world.mutations++;
    }
  }
  world.food = world.food.filter((food) => food.amount > 0);
  world.creatures = world.creatures.filter((fish) => fish.energy > 0 && fish.age < 24 * 95);
  world.creatures.push(...births);
  // Predators occasionally catch a smaller, nearby creature.
  for (let i = 0; i < world.creatures.length && world.creatures.length > 4; i++) {
    const hunter = world.creatures[i];
    for (let j = i + 1; j < world.creatures.length; j++) {
      const prey = world.creatures[j];
      if (hunter.genes.size > prey.genes.size * 1.42 && (hunter.x - prey.x) ** 2 + (hunter.y - prey.y) ** 2 < 0.0003 && Math.random() < dt * 0.035) {
        hunter.energy = Math.min(1.5, hunter.energy + 0.45);
        world.creatures.splice(j, 1); world.eaten++; break;
      }
    }
  }
  if (world.food.length < 4 && Math.random() < dt * 0.08) feedWorld(world, 5);
  if (world.history.length === 0 || world.elapsedHours - (world.history.at(-1)?.time || 0) > 8) {
    world.history.push({ time: world.elapsedHours, count: world.creatures.length });
    if (world.history.length > 50) world.history.shift();
  }
}

export { COLORS };
