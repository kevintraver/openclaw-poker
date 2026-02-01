export interface Personality {
  type: string;
  name: string;
  foldThreshold: number;
  raiseFrequency: number;
  callFrequency: number;
  bluffFrequency: number;
  aggressionLevel: number;
}

export const PERSONALITIES: Record<string, Personality> = {
  aggressive: {
    type: 'aggressive',
    name: 'Aggressive',
    foldThreshold: 0.3,
    raiseFrequency: 0.5,
    callFrequency: 0.7,
    bluffFrequency: 0.3,
    aggressionLevel: 0.8,
  },
  conservative: {
    type: 'conservative',
    name: 'Conservative',
    foldThreshold: 0.6,
    raiseFrequency: 0.2,
    callFrequency: 0.4,
    bluffFrequency: 0.05,
    aggressionLevel: 0.3,
  },
  calling: {
    type: 'calling',
    name: 'Calling Station',
    foldThreshold: 0.2,
    raiseFrequency: 0.05,
    callFrequency: 0.9,
    bluffFrequency: 0.1,
    aggressionLevel: 0.2,
  },
  tight: {
    type: 'tight',
    name: 'Tight-Aggressive',
    foldThreshold: 0.7,
    raiseFrequency: 0.7,
    callFrequency: 0.3,
    bluffFrequency: 0.15,
    aggressionLevel: 0.7,
  },
  random: {
    type: 'random',
    name: 'Random',
    foldThreshold: 0.5,
    raiseFrequency: 0.33,
    callFrequency: 0.5,
    bluffFrequency: 0.2,
    aggressionLevel: 0.5,
  },
};

export interface Action {
  type: string;
  amount?: number;
}

export function selectAction(
  validActions: Action[],
  personality: Personality,
  handStrength: number,
  pot: number,
  stack: number
): Action {
  // Random personality - truly random
  if (personality.type === 'random') {
    return validActions[Math.floor(Math.random() * validActions.length)];
  }

  const canFold = validActions.some(a => a.type === 'fold');
  const canCheck = validActions.some(a => a.type === 'check');
  const canCall = validActions.some(a => a.type === 'call');
  const canRaise = validActions.some(a => a.type === 'raise' || a.type === 'bet');
  const canAllIn = validActions.some(a => a.type === 'all-in');

  // Decide if we should fold based on hand strength
  if (handStrength < personality.foldThreshold) {
    // Weak hand
    if (canCheck) {
      return validActions.find(a => a.type === 'check')!;
    }
    if (canFold) {
      // Sometimes call anyway (calling station behavior)
      if (Math.random() < personality.callFrequency && canCall) {
        return validActions.find(a => a.type === 'call')!;
      }
      return validActions.find(a => a.type === 'fold')!;
    }
  }

  // Strong hand or decision to play
  // Consider bluffing
  const isBluffing = Math.random() < personality.bluffFrequency;

  if ((handStrength > 0.7 || isBluffing) && canRaise && Math.random() < personality.raiseFrequency) {
    // Raise/bet
    const raiseAction = validActions.find(a => a.type === 'raise' || a.type === 'bet');
    if (raiseAction) return raiseAction;
  }

  // All-in on very strong hands or desperate bluffs
  if (canAllIn && handStrength > 0.85 && Math.random() < personality.aggressionLevel) {
    return validActions.find(a => a.type === 'all-in')!;
  }

  // Call if possible and willing
  if (canCall && Math.random() < personality.callFrequency) {
    return validActions.find(a => a.type === 'call')!;
  }

  // Check if free
  if (canCheck) {
    return validActions.find(a => a.type === 'check')!;
  }

  // Fold if nothing else
  if (canFold) {
    return validActions.find(a => a.type === 'fold')!;
  }

  // Fallback - return first valid action
  return validActions[0];
}
