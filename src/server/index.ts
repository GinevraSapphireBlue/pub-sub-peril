import amqp from "amqplib";

import { ExchangePerilDirect, PauseKey } from "../internal/routing/routing.js";
import type { PlayingState } from "../internal/gamelogic/gamestate.js";
import { publishJSON } from "../internal/pubsub/publish.js";
import { printServerHelp, getInput } from "../internal/gamelogic/gamelogic.js";

async function main() {
  console.log("Starting Peril server...");
  const rabbitConnString = "amqp://guest:guest@localhost:5672/";
  const rabbitConn = await amqp.connect(rabbitConnString);
  console.log("Connected to RabbitMQ");

  process.on("SIGINT", async () => {
    console.log("Shutting Peril server down");
    await rabbitConn.close();
    process.exit(0)
  });

  const confirmChannel = await rabbitConn.createConfirmChannel();
  const pauseState: PlayingState = { isPaused: true };
  await publishJSON(confirmChannel, ExchangePerilDirect, PauseKey, pauseState);
  console.log("Published to confirm channel");

  printServerHelp();

  while (true) {
    const words = await getInput();
    if (words.length === 0) {
      continue;
    }
    const commandWord = words[1];
    if (commandWord === "pause") {
      console.log("Sending a pause message");
      await publishJSON(confirmChannel, ExchangePerilDirect, PauseKey, pauseState);
    }
    else if (commandWord === "resume") {
      console.log("Sending a resume message");
      await publishJSON(confirmChannel, ExchangePerilDirect, PauseKey, { isPaused: false });
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

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
