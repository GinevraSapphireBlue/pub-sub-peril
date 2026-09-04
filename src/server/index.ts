import amqp, { type ConfirmChannel } from "amqplib";

import { printServerHelp, getInput } from "../internal/gamelogic/gamelogic.js";
import type { PlayingState } from "../internal/gamelogic/gamestate.js";
import { declareAndBind, SimpleQueueType } from "../internal/pubsub/consume.js";
import { publishJSON } from "../internal/pubsub/publish.js";
import { ExchangePerilDirect, ExchangePerilTopic, GameLogSlug, PauseKey } from "../internal/routing/routing.js";

async function main() {
  console.log("Starting Peril server...");
  const rabbitConnString = "amqp://guest:guest@localhost:5672/";
  const rabbitConn = await amqp.connect(rabbitConnString);
  console.log("Connected to RabbitMQ");

  ["SIGINT", "SIGTERM"].forEach((signal) =>
    process.on(signal, async () => {
      console.log("Shutting Peril server down");
      await rabbitConn.close();
      process.exit(0)
    }),
  );

  const confirmChannel = await rabbitConn.createConfirmChannel();
  const pauseState: PlayingState = { isPaused: true };
  const resumeState: PlayingState = { isPaused: false };
  try {
    await publishJSON(confirmChannel, ExchangePerilDirect, PauseKey, pauseState);
  } catch (err) {
    console.error("Error publishing pause message: " + err);
  }
  console.log("Published to confirm channel");

  await declareAndBind(rabbitConn, ExchangePerilTopic, GameLogSlug, `${GameLogSlug}.*`, SimpleQueueType.Durable);

  printServerHelp();
  await processCommands(confirmChannel, pauseState, resumeState);

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

async function processCommands(confirmChannel: ConfirmChannel, pauseState: PlayingState, resumeState: PlayingState): Promise<void> {
  while (true) {
    const words = await getInput();
    if (words.length === 0) {
      continue;
    }
    const commandWord = words[0];
    if (commandWord === "pause") {
      try {
        await publishJSON(confirmChannel, ExchangePerilDirect, PauseKey, pauseState);
        console.log("Pause message sent");
      } catch (err) {
        console.error("Error publishing pause message: " + err);
      }
    }
    else if (commandWord === "resume") {
      try {
        await publishJSON(confirmChannel, ExchangePerilDirect, PauseKey, resumeState);
        console.log("Resume message sent");
      } catch (err) {
        console.error("Error publishing resume message: " + err);
      }
    }
    else if (commandWord === "quit") {
      console.log("Exiting");
      break;
    }
    else {
      console.log("Unknown command");
    }
  }
}
