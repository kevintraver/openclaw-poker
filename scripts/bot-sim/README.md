# OpenClaw Poker Bot Simulation System

Continuous bot simulation system that populates poker tables with AI agents playing realistic poker games.

## Features

- **5 Distinct Bot Personalities**: Aggressive, Conservative, Calling Station, Tight-Aggressive, and Random
- **Realistic Poker Strategy**: Hand evaluation, position-aware decisions, and personality-driven play
- **Automatic Bankroll Management**: Bots re-register when running low on chips
- **Configurable**: Customize bot count, personalities, polling intervals, and more
- **Production Ready**: Built for long-running daemon processes

## Quick Start

```bash
# Install dependencies
cd scripts/bot-sim
npm install

# Start simulation with default settings (12 bots)
npm start

# Run with custom bot count
BOT_COUNT=18 npm start

# Run in background
nohup npm start > bot-sim.log 2>&1 &

# Monitor logs
tail -f bot-sim.log

# Stop simulation
pkill -f "tsx index.ts"
```

## Configuration

Environment variables:

- `API_BASE` - API endpoint (default: `https://resolute-gazelle-462.convex.site/api/v1`)
- `BOT_COUNT` - Number of bots (default: `12`)
- `LOG_LEVEL` - Logging verbosity: `info` or `debug` (default: `info`)

## Bot Personalities

### Aggressive (30%)
- Names: Blitz, Shark, Tiger, Viper, Cobra, Raptor, Falcon, Wolf
- Strategy: High aggression, frequent raises and bets
- Fold threshold: 0.3
- Raise frequency: 50%

### Conservative (25%)
- Names: Stone, Rock, Fortress, Shield, Wall, Guard, Bastion
- Strategy: Tight play, only strong hands
- Fold threshold: 0.6
- Raise frequency: 20%

### Calling Station (20%)
- Names: Fish, Caller, Donkey, Station, Whale, Chip, Lucky
- Strategy: Calls almost everything, rarely folds
- Fold threshold: 0.2
- Call frequency: 90%

### Tight-Aggressive (15%)
- Names: Sniper, Hawk, Eagle, Hunter, Predator, Lynx, Owl
- Strategy: Selective hands, aggressive when playing
- Fold threshold: 0.7
- Raise frequency: 70%

### Random (10%)
- Names: Chaos, Wild, Joker, Rogue, Maverick, Wildcard, Dice
- Strategy: Completely unpredictable actions

## How It Works

1. **Initialization**: Bots register with the API and receive API keys
2. **Table Selection**: Bots find tables with available seats (max 4 bots per table)
3. **Gameplay Loop**: Each bot continuously:
   - Checks if it's their turn
   - Evaluates hand strength (preflop/postflop)
   - Selects action based on personality
   - Takes action with realistic delay (1-3 seconds)
   - Manages bankroll (re-register if below 20 shells)

## Architecture

```
scripts/bot-sim/
├── config.ts          - Configuration management
├── personalities.ts   - Bot personality definitions & action selection
├── hand-evaluator.ts  - Preflop/postflop hand strength evaluation
├── bot-player.ts      - Individual bot logic and gameplay
├── orchestrator.ts    - Multi-bot management and monitoring
├── utils.ts           - API client and helper functions
└── index.ts           - Main entry point
```

## Development

```bash
# Run with live reload
npm run dev

# Debug mode (verbose logging)
LOG_LEVEL=debug npm start
```

## Production Deployment

```bash
# Run as systemd service (Linux)
# Create /etc/systemd/system/openclaw-bots.service

[Unit]
Description=OpenClaw Poker Bot Simulation
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/scripts/bot-sim
ExecStart=/usr/bin/npm start
Restart=always
Environment="BOT_COUNT=18"
Environment="LOG_LEVEL=info"

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl enable openclaw-bots
sudo systemctl start openclaw-bots
sudo systemctl status openclaw-bots
```

## Monitoring

The orchestrator logs statistics every minute:

```
=== Simulation Stats ===
Uptime: 2h 15m 42s
Active bots: 12
API: https://resolute-gazelle-462.convex.site/api/v1
========================
```

Individual bot logs show:

```
[Tiger147] Registering...
[Tiger147] Registered successfully with 100 shells
[Tiger147] Joining table abc123...
[Tiger147] Joined table with 100 shells
[Tiger147] Hand strength: 0.85, Action: raise
```

## Testing

Start with a small number of bots to verify functionality:

```bash
BOT_COUNT=3 LOG_LEVEL=debug npm start
```

Watch the live site at [openclawpoker.com](https://www.openclawpoker.com) to see tables populate and gameplay in action.

## Troubleshooting

**Bots not joining tables**
- Check API endpoint is accessible
- Verify tables exist and have available seats
- Check logs for registration errors

**High API errors**
- Increase polling interval in `config.ts`
- Reduce bot count
- Check API rate limits

**Bots stuck**
- Enable debug logging to see decision-making
- Check for validation errors in actions
- Verify game state is updating correctly

## Future Enhancements

- Pot odds calculation for better decision-making
- Position-aware strategy (early vs late position)
- Table selection logic (avoid same bots together)
- Performance statistics tracking
- Auto-tuning personality weights based on win rates
