import amqp from "amqplib";

import { ExchangePerilDirect, PauseKey } from "../internal/routing/routing.js";
import type { PlayingState } from "../internal/gamelogic/gamestate.js";
import { publishJSON } from "../internal/pubsub/publish.js";

async function main() {
  console.log("Starting Peril server...");
  const rabbitConnString = "amqp://guest:guest@localhost:5672/";
  const rabbitConn = await amqp.connect(rabbitConnString);
  console.log("Connected to RabbitMQ");

  const confirmChannel = await rabbitConn.createConfirmChannel();
  const state: PlayingState = { isPaused: true };
  await publishJSON(confirmChannel, ExchangePerilDirect, PauseKey, state);
  console.log("Published to confirm channel");

  process.on("SIGINT", async () => {
    console.log("Shutting Peril server down");
    await rabbitConn.close();
    process.exit(0)
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
