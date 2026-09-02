import amqp from "amqplib";
import { clientWelcome } from "../internal/gamelogic/gamelogic.js";
import { declareAndBind } from "../internal/pubsub/consume.js";
import { ExchangePerilDirect, PauseKey } from "../internal/routing/routing.js";

import { SimpleQueueType } from "../internal/pubsub/consume.js";

async function main() {
  console.log("Starting Peril client...");
  const rabbitConnString = "amqp://guest:guest@localhost:5672/";
  const rabbitConn = await amqp.connect(rabbitConnString);
  
  const username = await clientWelcome();

  const [channel, queue] = await declareAndBind(rabbitConn, ExchangePerilDirect, `${PauseKey}.${username}`, PauseKey, SimpleQueueType.Transient);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
