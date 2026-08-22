import { CONSTANTS } from './constants';

export interface Action {
  type: 'travel' | 'gather' | 'buy' | 'sell' | 'craft' | 'build' | 'upkeep';
  destination?: string;
  fast?: boolean;
  item?: string;
  quantity?: number;
  upgrade?: string;
}

export interface ActionLogEntry {
  action: Action;
  valid: boolean;
  tick: number;
  error?: string;
  details?: string;
}

export interface GameState {
  tick: number;
  location: string;
  enteloot: number;
  inventory: Record<string, number>;
  upgrades: Record<string, string[]>;
  tools: string[];
  boosts: Record<string, number>;
  invested_enteloot: number;
  log: ActionLogEntry[];
  total_ticks: number;
  sold_items_count: number;
}

export interface LevelData {
  run: {
    total_ticks: number;
    starting_town: string;
    starting_enteloot: number;
  };
  towns: Record<string, any>;
  nodes: Record<string, any>;
  routes: Array<{ between: string[], weight: number, toll: number }>;
}

export function getInitialState(level: LevelData): GameState {
  return {
    tick: 0,
    location: level.run.starting_town,
    enteloot: level.run.starting_enteloot,
    inventory: {},
    upgrades: {},
    tools: [],
    boosts: {},
    invested_enteloot: 0,
    log: [],
    total_ticks: level.run.total_ticks,
    sold_items_count: 0
  };
}

export function advanceTicks(state: GameState, ticks: number, level: LevelData) {
  for (let i = 0; i < ticks; i++) {
    state.tick += 1;
    if (state.tick > state.total_ticks) {
      state.tick = state.total_ticks;
      break;
    }
    
    // Apply passives
    for (const [townId, town] of Object.entries(level.towns)) {
      // Production
      const prodRate = town.production.rate;
      if (state.tick % prodRate === 0) {
        for (const [res, baseAmt] of Object.entries(town.production.resources)) {
          let amt = baseAmt as number;
          // Check production upgrades
          const ups = state.upgrades[townId] || [];
          for (const u of ups) {
            const upgDef = CONSTANTS.upgrades.production[u as keyof typeof CONSTANTS.upgrades.production];
            if (upgDef && upgDef.effect.type === 'production_double' && upgDef.effect.resource === res) {
              amt *= 2;
            }
          }
          state.inventory[res] = (state.inventory[res] || 0) + amt;
        }
      }

      // Enteloot
      let entRate = town.enteloot.rate;
      const ups = state.upgrades[townId] || [];
      if (ups.includes('police-station')) {
        entRate = Math.max(1, entRate - 2);
      }

      if (state.tick % entRate === 0) {
        let baseAmt = town.enteloot.amount;
        let pctBonus = 0;
        if (ups.includes('rec-center')) pctBonus += 0.20;
        if (ups.includes('school')) pctBonus += 0.50;
        if (ups.includes('library')) pctBonus += 0.50;

        let amt = Math.floor(baseAmt * (1 + pctBonus));
        const isBoosted = state.boosts[townId] && state.boosts[townId] >= state.tick;
        if (isBoosted) {
          amt *= 2;
        }
        state.enteloot += amt;
      }
    }
  }
}

export function validateAction(state: GameState, action: Action, level: LevelData): { valid: boolean; ticks: number; error?: string } {
  if (action.type === 'travel') {
    if (!action.destination) return { valid: false, ticks: 1, error: "Missing destination" };
    
    // Find route
    const route = level.routes.find(r => 
      (r.between[0] === state.location && r.between[1] === action.destination) ||
      (r.between[1] === state.location && r.between[0] === action.destination)
    );
    
    if (!route) return { valid: false, ticks: 1, error: "No route to destination" };

    let isFast = action.fast === true;
    let toll = route.toll || 0;
    
    // If standard route requested but it has a toll, it's a fast route.
    // Wait, the level JSON defines multiple routes between same endpoints?
    // "Some pairs of vertices are connected by both a standard route and a fast route."
    const availableRoutes = level.routes.filter(r => 
      (r.between[0] === state.location && r.between[1] === action.destination) ||
      (r.between[1] === state.location && r.between[0] === action.destination)
    );

    let chosenRoute = availableRoutes.find(r => isFast ? (r.toll > 0) : (r.toll === 0));
    if (!chosenRoute) return { valid: false, ticks: 1, error: "Requested route type not available" };

    if (isFast && state.enteloot < chosenRoute.toll) return { valid: false, ticks: 1, error: "Not enough enteloot for toll" };

    let ticks = chosenRoute.weight;
    if (state.tools.includes('boots')) {
      ticks = Math.max(1, ticks - 1);
    }
    return { valid: true, ticks };
  }

  if (action.type === 'gather') {
    const node = level.nodes[state.location];
    if (!node) return { valid: false, ticks: 1, error: "Not at a resource node" };
    
    let ticks = node['gather-time'] || 2;
    if (state.tools.includes('pickaxe')) {
      ticks = Math.max(1, ticks - 1);
    }
    return { valid: true, ticks };
  }

  if (action.type === 'buy') {
    const town = level.towns[state.location];
    if (!town) return { valid: false, ticks: 1, error: "Not at a town" };
    if (!action.item || !action.quantity || action.quantity <= 0) return { valid: false, ticks: 1, error: "Invalid item or quantity" };
    
    if (!town.production.resources[action.item]) return { valid: false, ticks: 1, error: "Town does not produce this item" };
    
    const buyPrice = (CONSTANTS.resources as any)[action.item]?.buy_price;
    if (!buyPrice) return { valid: false, ticks: 1, error: "Item cannot be bought" };
    
    if (state.enteloot < buyPrice * action.quantity) return { valid: false, ticks: 1, error: "Not enough enteloot" };
    
    return { valid: true, ticks: 1 };
  }

  if (action.type === 'sell') {
    const town = level.towns[state.location];
    if (!town) return { valid: false, ticks: 1, error: "Not at a town" };
    if (!action.item || !action.quantity || action.quantity <= 0) return { valid: false, ticks: 1, error: "Invalid item or quantity" };
    
    const count = state.inventory[action.item] || 0;
    if (count < action.quantity) return { valid: false, ticks: 1, error: "Not enough items in inventory" };
    
    return { valid: true, ticks: 1 };
  }

  if (action.type === 'craft') {
    const town = level.towns[state.location];
    if (!town) return { valid: false, ticks: 1, error: "Not at a town" };
    if (!action.item || !action.quantity || action.quantity <= 0) return { valid: false, ticks: 1, error: "Invalid item or quantity" };
    
    const recipe = (CONSTANTS.recipes as any)[action.item] || (CONSTANTS.components as any)[action.item] || (CONSTANTS.tools as any)[action.item];
    if (!recipe) return { valid: false, ticks: 1, error: "Unknown recipe" };
    
    if (recipe.once_per_run && state.tools.includes(action.item)) return { valid: false, ticks: 1, error: "Tool already crafted" };
    
    for (const [inp, amt] of Object.entries(recipe.inputs)) {
      if ((state.inventory[inp] || 0) < (amt as number) * action.quantity) {
        return { valid: false, ticks: 1, error: `Not enough ${inp}` };
      }
    }
    
    let ticksPerItem = recipe.craft_time || 2;
    if (town.affinities?.includes('crafting') && !recipe.once_per_run) {
        ticksPerItem = 1;
    }
    
    return { valid: true, ticks: ticksPerItem * action.quantity };
  }

  if (action.type === 'build') {
    const town = level.towns[state.location];
    if (!town) return { valid: false, ticks: 1, error: "Not at a town" };
    if (!action.upgrade) return { valid: false, ticks: 1, error: "Missing upgrade" };
    
    const upg = (CONSTANTS.upgrades.production as any)[action.upgrade] || (CONSTANTS.upgrades.civic as any)[action.upgrade];
    if (!upg) return { valid: false, ticks: 1, error: "Unknown upgrade" };
    
    if ((state.upgrades[state.location] || []).includes(action.upgrade)) {
        return { valid: false, ticks: 1, error: "Upgrade already built here" };
    }
    
    if (state.enteloot < upg.enteloot_cost) return { valid: false, ticks: 1, error: "Not enough enteloot" };
    
    for (const [inp, amt] of Object.entries(upg.components)) {
      if ((state.inventory[inp] || 0) < (amt as number)) {
        return { valid: false, ticks: 1, error: `Not enough ${inp}` };
      }
    }

    if (upg.prerequisite) {
      const ups = state.upgrades[state.location] || [];
      if (upg.prerequisite.type === 'any_production_upgrades') {
          const prodCount = ups.filter(u => Object.keys(CONSTANTS.upgrades.production).includes(u)).length;
          if (prodCount < upg.prerequisite.count) return { valid: false, ticks: 1, error: "Prerequisites not met" };
      } else if (upg.prerequisite.type === 'specific_upgrade') {
          if (!ups.includes(upg.prerequisite.upgrade)) return { valid: false, ticks: 1, error: "Prerequisite not met" };
      }
    }
    
    return { valid: true, ticks: upg.build_time };
  }

  if (action.type === 'upkeep') {
    const town = level.towns[state.location];
    if (!town) return { valid: false, ticks: 1, error: "Not at a town" };
    return { valid: true, ticks: 5 };
  }

  return { valid: false, ticks: 1, error: "Unknown action type" };
}

export function executeAction(state: GameState, action: Action, level: LevelData): GameState {
  const validation = validateAction(state, action, level);
  
  if (!validation.valid) {
    let ticksToAdvance = 1;
    if (state.tick + ticksToAdvance > state.total_ticks) {
      ticksToAdvance = state.total_ticks - state.tick;
    }
    advanceTicks(state, ticksToAdvance, level);
    state.log.push({ action, valid: false, error: validation.error, tick: state.tick });
    return state;
  }
  
  const ticksNeeded = validation.ticks;
  
  if (state.tick + ticksNeeded > state.total_ticks) {
    const remaining = state.total_ticks - state.tick;
    advanceTicks(state, remaining, level);
    state.log.push({ action, valid: false, error: "Not enough ticks remaining", tick: state.tick });
    return state;
  }
  
  // Actually execute effects BEFORE advancing ticks? 
  // "Each action consumes its full tick cost before the next action begins."
  // Validation happened before ticks advanced, so we can deduct costs now, then advance ticks.
  let details = "";
  if (action.type === 'travel') {
    const availableRoutes = level.routes.filter(r => 
        (r.between[0] === state.location && r.between[1] === action.destination) ||
        (r.between[1] === state.location && r.between[0] === action.destination)
    );
    const isFast = action.fast === true;
    const chosenRoute = availableRoutes.find(r => isFast ? (r.toll > 0) : (r.toll === 0))!;
    if (chosenRoute.toll > 0) {
        state.enteloot -= chosenRoute.toll;
        details = `Paid ${chosenRoute.toll} toll. `;
    }
    state.location = action.destination!;
    details += `Travelled to ${action.destination}.`;
  } 
  else if (action.type === 'gather') {
    const node = level.nodes[state.location];
    const res = node.resource;
    const yieldAmt = node.yield;
    state.inventory[res] = (state.inventory[res] || 0) + yieldAmt;
    details = `Gathered ${yieldAmt} ${res}.`;
  }
  else if (action.type === 'buy') {
    const buyPrice = (CONSTANTS.resources as any)[action.item!]?.buy_price;
    const cost = buyPrice * action.quantity!;
    state.enteloot -= cost;
    state.inventory[action.item!] = (state.inventory[action.item!] || 0) + action.quantity!;
    details = `Bought ${action.quantity} ${action.item} for ${cost}.`;
  }
  else if (action.type === 'sell') {
    const count = action.quantity!;
    state.inventory[action.item!] -= count;
    state.sold_items_count += count;
    let sellPrice = 0;
    if ((CONSTANTS.resources as any)[action.item!]) {
        sellPrice = (CONSTANTS.resources as any)[action.item!].sell_price;
    } else {
        const town = level.towns[state.location];
        sellPrice = town['item-rates'][action.item!];
    }
    const profit = sellPrice * count;
    state.enteloot += profit;
    details = `Sold ${count} ${action.item} for ${profit}.`;
  }
  else if (action.type === 'craft') {
    const recipe = (CONSTANTS.recipes as any)[action.item!] || (CONSTANTS.components as any)[action.item!] || (CONSTANTS.tools as any)[action.item!];
    for (const [inp, amt] of Object.entries(recipe.inputs)) {
      state.inventory[inp] -= (amt as number) * action.quantity!;
    }
    if (recipe.once_per_run) {
        state.tools.push(action.item!);
    } else {
        state.inventory[action.item!] = (state.inventory[action.item!] || 0) + action.quantity!;
    }
    details = `Crafted ${action.quantity} ${action.item}.`;
  }
  else if (action.type === 'build') {
    const upg = (CONSTANTS.upgrades.production as any)[action.upgrade!] || (CONSTANTS.upgrades.civic as any)[action.upgrade!];
    state.enteloot -= upg.enteloot_cost;
    state.invested_enteloot += upg.enteloot_cost;
    for (const [inp, amt] of Object.entries(upg.components)) {
      state.inventory[inp] -= (amt as number);
    }
    if (!state.upgrades[state.location]) state.upgrades[state.location] = [];
    state.upgrades[state.location].push(action.upgrade!);
    details = `Built ${action.upgrade}.`;
  }
  else if (action.type === 'upkeep') {
    const ups = state.upgrades[state.location] || [];
    let dur = CONSTANTS.upkeep_boost_duration_ticks;
    if (ups.includes('fire-station')) {
        dur = 75; // +50% duration
    }
    state.boosts[state.location] = state.tick + ticksNeeded + dur; 
    // Wait, the boost starts after the 5 ticks of upkeep action complete
    details = `Boosted town for ${dur} ticks.`;
  }

  advanceTicks(state, ticksNeeded, level);
  state.log.push({ action, valid: true, tick: state.tick, details });
  
  return state;
}

export function computeScore(state: GameState): number {
    // Score depends on level type, but roughly: Enteloot + Item Values + Upgrades score
    // Actually the formula is not strictly provided for everything, but let's just show raw enteloot
    return state.enteloot;
}
