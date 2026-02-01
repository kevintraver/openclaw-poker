import { ApiClient, randomDelay } from './utils.js';
import { Personality, selectAction } from './personalities.js';
import { evaluatePreflop, evaluatePostflop } from './hand-evaluator.js';
import type { SimConfig } from './config.js';

interface GameState {
  tableId: string;
  pot: number;
  communityCards: string[];
  currentBet: number;
  players: Array<{
    name: string;
    chips: number;
    bet: number;
    folded: boolean;
    isActivePlayer: boolean;
  }>;
  yourCards?: string[];
  yourChips?: number;
  validActions?: Array<{
    type: string;
    amount?: number;
  }>;
}

interface Table {
  id: string;
  name: string;
  players: number;
  maxSeats: number;
  minBuyIn: number;
  maxBuyIn: number;
}

export class BotPlayer {
  private api: ApiClient;
  private apiKey: string = '';
  private tableId?: string;
  private seatIndex?: number;
  private shells: number = 100;
  private logPrefix: string;

  constructor(
    public name: string,
    public personality: Personality,
    private config: SimConfig
  ) {
    this.api = new ApiClient(config.apiBase);
    this.logPrefix = `[${name}]`;
  }

  private log(message: string, level: 'info' | 'debug' = 'info') {
    if (level === 'debug' && this.config.logLevel !== 'debug') return;
    console.log(`${this.logPrefix} ${message}`);
  }

  async register(): Promise<boolean> {
    this.log('Registering...');

    const response = await this.api.post<{
      agent: { apiKey: string; shells: number; id: string };
    }>(
      '/agents/register',
      { name: this.name }
    );

    if (!response.success || !response.data) {
      this.log(`Registration failed: ${response.error}`, 'info');
      return false;
    }

    this.apiKey = response.data.agent.apiKey;
    this.shells = response.data.agent.shells;
    this.log(`Registered successfully with ${this.shells} shells`);
    return true;
  }

  async findTable(): Promise<string | null> {
    const response = await this.api.get<{ tables: Table[] }>('/tables', this.apiKey);

    if (!response.success || !response.data) {
      this.log(`Failed to fetch tables: ${response.error}`, 'debug');
      return null;
    }

    const tables = response.data.tables;

    // Find tables with space, affordable min buy-in, and prefer tables with players
    // Leave at least 1 empty seat for real players
    const availableTables = tables
      .filter(t =>
        t.players < t.maxSeats - 1 &&
        t.minBuyIn <= this.shells
      )
      .sort((a, b) => b.players - a.players);

    if (availableTables.length === 0) {
      this.log('No available tables', 'debug');
      return null;
    }

    return availableTables[0].id;
  }

  async joinTable(tableId: string, tableInfo?: Table): Promise<boolean> {
    this.log(`Joining table ${tableId}...`);

    // Determine buy-in based on table limits and personality
    let buyIn = 100; // default

    if (tableInfo) {
      // Aggressive bots buy in for more, conservative for minimum
      const range = tableInfo.maxBuyIn - tableInfo.minBuyIn;
      if (this.personality.aggressionLevel > 0.6) {
        // Aggressive: 60-80% of max
        buyIn = Math.min(
          Math.floor(tableInfo.minBuyIn + range * 0.7),
          this.shells
        );
      } else {
        // Conservative: minimum or slightly above
        buyIn = Math.min(tableInfo.minBuyIn, this.shells);
      }
    }

    const response = await this.api.post(
      `/tables/${tableId}/join`,
      { buyIn },
      this.apiKey
    );

    if (!response.success) {
      this.log(`Failed to join table: ${response.error}`, 'info');
      return false;
    }

    this.tableId = tableId;
    this.log(`Joined table with ${buyIn} shells`);
    return true;
  }

  async checkTurn(): Promise<boolean> {
    const response = await this.api.get<{ hasPendingAction: boolean }>(
      '/check',
      this.apiKey
    );

    if (!response.success || !response.data) {
      return false;
    }

    return response.data.hasPendingAction;
  }

  async getGameState(): Promise<GameState | null> {
    if (!this.tableId) return null;

    const response = await this.api.get<GameState>(
      `/tables/${this.tableId}/state`,
      this.apiKey
    );

    if (!response.success || !response.data) {
      this.log(`Failed to get game state: ${response.error}`, 'debug');
      return null;
    }

    return response.data;
  }

  async makeDecision(): Promise<void> {
    const state = await this.getGameState();

    if (!state || !state.validActions || state.validActions.length === 0) {
      this.log('No valid actions available', 'debug');
      return;
    }

    // Evaluate hand strength
    let handStrength = 0.5;

    if (state.yourCards && state.yourCards.length === 2) {
      if (state.communityCards.length === 0) {
        handStrength = evaluatePreflop(state.yourCards);
      } else {
        handStrength = evaluatePostflop(state.yourCards, state.communityCards);
      }
    }

    // Select action based on personality
    const action = selectAction(
      state.validActions,
      this.personality,
      handStrength,
      state.pot,
      state.yourChips || 0
    );

    this.log(
      `Hand strength: ${handStrength.toFixed(2)}, Action: ${action.type}${
        action.amount ? ` (${action.amount})` : ''
      }`,
      'debug'
    );

    // Add realistic delay before acting
    await randomDelay(this.config.actionDelayMin, this.config.actionDelayMax);

    // Take action
    await this.takeAction(action);
  }

  async takeAction(action: { type: string; amount?: number }): Promise<void> {
    if (!this.tableId) return;

    const response = await this.api.post(
      `/tables/${this.tableId}/action`,
      action,
      this.apiKey
    );

    if (!response.success) {
      this.log(`Action failed: ${response.error}`, 'info');
    }
  }

  async manageBankroll(): Promise<void> {
    // Check current shells
    const response = await this.api.get<{ shells: number }>(
      '/agents/status',
      this.apiKey
    );

    if (response.success && response.data) {
      this.shells = response.data.shells;

      if (this.shells < this.config.rebuyThreshold) {
        this.log(`Low on shells (${this.shells}), re-registering...`);
        this.tableId = undefined;
        await this.register();
      }
    }
  }

  async play(): Promise<void> {
    this.log(`Starting ${this.personality.name} bot`);

    while (true) {
      try {
        await this.manageBankroll();

        if (!this.tableId) {
          const tableId = await this.findTable();
          if (tableId) {
            // Get table info for buy-in calculation
            const response = await this.api.get<{ tables: Table[] }>('/tables', this.apiKey);
            const table = response.data?.tables.find(t => t.id === tableId);
            await this.joinTable(tableId, table);
          }
        }

        if (await this.checkTurn()) {
          await this.makeDecision();
        }

        await randomDelay(this.config.pollingInterval, this.config.pollingInterval + 1000);
      } catch (error) {
        this.log(
          `Error in play loop: ${error instanceof Error ? error.message : 'Unknown'}`,
          'info'
        );
        await randomDelay(5000, 10000);
      }
    }
  }
}
