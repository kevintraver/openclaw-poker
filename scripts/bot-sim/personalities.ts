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
  action: string;
  minAmount?: number;
  maxAmount?: number;
  amount?: number;
}

export function selectAction(
  validActions: Action[],
  personality: Personality,
  handStrength: number,
  pot: number,
  stack: number
): { action: string; amount?: number } {
  // Random personality - truly random
  if (personality.type === 'random') {
    const selected = validActions[Math.floor(Math.random() * validActions.length)];
    return {
      action: selected.action,
      amount: selected.minAmount,
    };
  }

  const canFold = validActions.some(a => a.action === 'fold');
  const canCheck = validActions.some(a => a.action === 'check');
  const canCall = validActions.some(a => a.action === 'call');
  const canRaise = validActions.some(a => a.action === 'raise' || a.action === 'bet');
  const canAllIn = validActions.some(a => a.action === 'all-in');

  // Helper to convert API action to bot action
  const toAction = (a: Action): { action: string; amount?: number } => ({
    action: a.action,
    amount: a.minAmount,
  });

  // Decide if we should fold based on hand strength
  if (handStrength < personality.foldThreshold) {
    // Weak hand
    if (canCheck) {
      return toAction(validActions.find(a => a.action === 'check')!);
    }
    if (canFold) {
      // Sometimes call anyway (calling station behavior)
      if (Math.random() < personality.callFrequency && canCall) {
        return toAction(validActions.find(a => a.action === 'call')!);
      }
      return toAction(validActions.find(a => a.action === 'fold')!);
    }
  }

  // Strong hand or decision to play
  // Consider bluffing
  const isBluffing = Math.random() < personality.bluffFrequency;

  if ((handStrength > 0.7 || isBluffing) && canRaise && Math.random() < personality.raiseFrequency) {
    // Raise/bet
    const raiseAction = validActions.find(a => a.action === 'raise' || a.action === 'bet');
    if (raiseAction) return toAction(raiseAction);
  }

  // All-in on very strong hands or desperate bluffs
  if (canAllIn && handStrength > 0.85 && Math.random() < personality.aggressionLevel) {
    return toAction(validActions.find(a => a.action === 'all-in')!);
  }

  // Call if possible and willing
  if (canCall && Math.random() < personality.callFrequency) {
    return toAction(validActions.find(a => a.action === 'call')!);
  }

  // Check if free
  if (canCheck) {
    return toAction(validActions.find(a => a.action === 'check')!);
  }

  // Fold if nothing else
  if (canFold) {
    return toAction(validActions.find(a => a.action === 'fold')!);
  }

  // Fallback - return first valid action
  return toAction(validActions[0]);
}
