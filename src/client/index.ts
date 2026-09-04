import amqp, { type ConfirmChannel } from "amqplib";

import { clientWelcome, commandStatus, getInput, printClientHelp, printQuit } from "../internal/gamelogic/gamelogic.js";
import { GameState } from "../internal/gamelogic/gamestate.js";
import { commandMove } from "../internal/gamelogic/move.js";
import { commandSpawn } from "../internal/gamelogic/spawn.js";
import { SimpleQueueType } from "../internal/pubsub/consume.js";
import { publishJSON } from "../internal/pubsub/publish.js";
import { subscribeJSON } from "../internal/pubsub/subscribe.js";
import { ArmyMovesPrefix, ExchangePerilDirect, ExchangePerilTopic, PauseKey } from "../internal/routing/routing.js";
import { handlerMove, handlerPause } from "./handlers.js";

async function main() {
  console.log("Starting Peril client...");
  const rabbitConnString = "amqp://guest:guest@localhost:5672/";
  const rabbitConn = await amqp.connect(rabbitConnString);

  ["SIGINT", "SIGTERM"].forEach((signal) =>
    process.on(signal, async () => {
      console.log("Shutting Peril client down");
      await rabbitConn.close();
      process.exit(0);
    }),
  );

  const username = await clientWelcome();

  // Confirm channel
  const confirmChannel = await rabbitConn.createConfirmChannel();

  const gameState = new GameState(username);

  // Subscribe to pause/resume messages
  await subscribeJSON(rabbitConn, ExchangePerilDirect, `${PauseKey}.${username}`, PauseKey, SimpleQueueType.Transient, handlerPause(gameState));

  // Subscribe to moves of other players
  await subscribeJSON(rabbitConn, ExchangePerilTopic, `${ArmyMovesPrefix}.${username}`, `${ArmyMovesPrefix}.*`, SimpleQueueType.Transient, handlerMove(gameState));

  // Command loop
  await processCommands(gameState, confirmChannel, username);

  process.exit(0);  
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

async function processCommands(gameState: GameState, confirmChannel: ConfirmChannel, username: string): Promise<void> {
  while (true) {
    const words = await getInput();
    if (words.length === 0)
      continue;

    const command = words[0];
    if (command === "spawn") {
      try {
        commandSpawn(gameState, words);
      } catch (err) {
        console.log((err as Error).message);
      }
    }
    else if (command === "move") {
      try {
        const move = commandMove(gameState, words);
        await publishJSON(confirmChannel, ExchangePerilTopic, `${ArmyMovesPrefix}.${username}`, move);
        console.log(`Move ${words.slice(1)} was published`);
      } catch (err) {
        console.log((err as Error).message);
      }
    }
    else if (command === "status") {
      commandStatus(gameState);
    }
    else if (command === "help") {
      printClientHelp();
    }
    else if (command === "spam") {
      console.log("Spamming not allowed yet!");
    }
    else if (command === "quit") {
      printQuit();
      break;
    }
    else {
      console.log("Unknown command");
    }
  }
}
