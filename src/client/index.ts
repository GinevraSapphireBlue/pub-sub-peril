import amqp from "amqplib";
import { clientWelcome, commandStatus, getInput, printClientHelp, printQuit } from "../internal/gamelogic/gamelogic.js";
import { declareAndBind } from "../internal/pubsub/consume.js";
import { ExchangePerilDirect, ExchangePerilTopic, PauseKey } from "../internal/routing/routing.js";
import { SimpleQueueType } from "../internal/pubsub/consume.js";
import { GameState } from "../internal/gamelogic/gamestate.js";
import { commandSpawn } from "../internal/gamelogic/spawn.js";
import { commandMove } from "../internal/gamelogic/move.js";
import { subscribeJSON } from "../internal/pubsub/subscribe.js";
import { handlerPause } from "./handlers.js";

async function main() {
  console.log("Starting Peril client...");
  const rabbitConnString = "amqp://guest:guest@localhost:5672/";
  const rabbitConn = await amqp.connect(rabbitConnString);
  
  const username = await clientWelcome();

  const [channel, queue] = await declareAndBind(rabbitConn, ExchangePerilDirect, `${PauseKey}.${username}`, PauseKey, SimpleQueueType.Transient);

  const gameState = new GameState(username);

  await subscribeJSON(rabbitConn, ExchangePerilDirect, `${PauseKey}.${username}`, PauseKey, SimpleQueueType.Transient, handlerPause(gameState));

  await processCommands(gameState);
  
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

async function processCommands(gameState: GameState): Promise<void> {
  while (true) {
    const words = await getInput();
    if (words.length === 0)
      continue;

    const command = words[0];
    if (command === "spawn") {
      try {
        commandSpawn(gameState, words);
      } catch (err) {
        console.log(err);
      }
    }
    else if (command === "move") {
      try {
        commandMove(gameState, words);
      } catch (err) {
        console.log(err);
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
