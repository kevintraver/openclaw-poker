import { BotPlayer } from './bot-player.js';
import { PERSONALITIES, Personality } from './personalities.js';
import { SimConfig } from './config.js';
import { sleep, sample, weightedRandom } from './utils.js';

const BOT_NAME_PREFIXES: Record<string, string[]> = {
  aggressive: ['Blitz', 'Shark', 'Tiger', 'Viper', 'Cobra', 'Raptor', 'Falcon', 'Wolf'],
  conservative: ['Stone', 'Rock', 'Fortress', 'Shield', 'Wall', 'Guard', 'Bastion'],
  calling: ['Fish', 'Caller', 'Donkey', 'Station', 'Whale', 'Chip', 'Lucky'],
  tight: ['Sniper', 'Hawk', 'Eagle', 'Hunter', 'Predator', 'Lynx', 'Owl'],
  random: ['Chaos', 'Wild', 'Joker', 'Rogue', 'Maverick', 'Wildcard', 'Dice'],
};

export class SimulationOrchestrator {
  private bots: BotPlayer[] = [];
  private running: boolean = false;
  private startTime: number = 0;

  constructor(private config: SimConfig) {}

  selectPersonality(): Personality {
    const type = weightedRandom(this.config.personalities);
    return PERSONALITIES[type];
  }

  generateBotName(personality: Personality, index: number): string {
    const prefixes = BOT_NAME_PREFIXES[personality.type] || ['Bot'];
    const prefix = sample(prefixes);
    const suffix = 100 + index;
    return `${prefix}${suffix}`;
  }

  async initialize(): Promise<void> {
    console.log(`\n🤖 Creating ${this.config.botCount} bots...\n`);

    const personalityCounts: Record<string, number> = {};

    for (let i = 0; i < this.config.botCount; i++) {
      const personality = this.selectPersonality();
      const name = this.generateBotName(personality, i);

      personalityCounts[personality.type] = (personalityCounts[personality.type] || 0) + 1;

      const bot = new BotPlayer(name, personality, this.config);
      const registered = await bot.register();

      if (registered) {
        this.bots.push(bot);
        console.log(`✓ Created ${name} (${personality.name})`);
      } else {
        console.log(`✗ Failed to create ${name}`);
      }

      await sleep(1000);
    }

    console.log('\n📊 Bot Distribution:');
    for (const [type, count] of Object.entries(personalityCounts)) {
      console.log(`   ${PERSONALITIES[type].name}: ${count}`);
    }
    console.log('');
  }

  async start(): Promise<void> {
    this.running = true;
    this.startTime = Date.now();

    console.log('🎮 Starting simulation...\n');

    this.monitor();

    await Promise.allSettled(
      this.bots.map(bot => bot.play())
    );
  }

  async stop(): Promise<void> {
    console.log('\n⏹️  Stopping simulation...');
    this.running = false;
  }

  private monitor(): void {
    setInterval(() => {
      if (!this.running) return;

      const uptime = Math.floor((Date.now() - this.startTime) / 1000);
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = uptime % 60;

      console.log('\n=== Simulation Stats ===');
      console.log(`Uptime: ${hours}h ${minutes}m ${seconds}s`);
      console.log(`Active bots: ${this.bots.length}`);
      console.log(`API: ${this.config.apiBase}`);
      console.log('========================\n');
    }, 60000);
  }
}
