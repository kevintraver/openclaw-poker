export interface SimConfig {
  apiBase: string;
  botCount: number;
  minBotsPerTable: number;
  maxBotsPerTable: number;
  pollingInterval: number;
  actionDelayMin: number;
  actionDelayMax: number;
  personalities: {
    aggressive: number;
    conservative: number;
    calling: number;
    tight: number;
    random: number;
  };
  rebuyThreshold: number;
  logLevel: 'info' | 'debug';
}

export function loadConfig(): SimConfig {
  return {
    apiBase: process.env.API_BASE || 'https://resolute-gazelle-462.convex.site/api/v1',
    botCount: parseInt(process.env.BOT_COUNT || '12', 10),
    minBotsPerTable: 2,
    maxBotsPerTable: 4,
    pollingInterval: 5000,
    actionDelayMin: 1000,
    actionDelayMax: 3000,
    personalities: {
      aggressive: 0.30,
      conservative: 0.25,
      calling: 0.20,
      tight: 0.15,
      random: 0.10,
    },
    rebuyThreshold: 20,
    logLevel: (process.env.LOG_LEVEL as 'info' | 'debug') || 'info',
  };
}
