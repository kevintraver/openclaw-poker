import { SimulationOrchestrator } from './orchestrator.js';
import { loadConfig } from './config.js';

async function main() {
  const config = loadConfig();

  console.log('╔══════════════════════════════════════════╗');
  console.log('║  OpenClaw Poker Bot Simulation System   ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log(`Configuration:`);
  console.log(`   API: ${config.apiBase}`);
  console.log(`   Bots: ${config.botCount}`);
  console.log(`   Max per table: ${config.maxBotsPerTable}`);
  console.log(`   Polling: ${config.pollingInterval}ms`);
  console.log(`   Log level: ${config.logLevel}`);

  const orchestrator = new SimulationOrchestrator(config);

  process.on('SIGINT', async () => {
    await orchestrator.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await orchestrator.stop();
    process.exit(0);
  });

  await orchestrator.initialize();
  await orchestrator.start();

  await new Promise(() => {});
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
