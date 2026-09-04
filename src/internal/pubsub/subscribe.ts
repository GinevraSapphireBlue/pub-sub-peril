import amqp from "amqplib";
import { declareAndBind, SimpleQueueType } from "./consume.js";

export async function subscribeJSON<T>(
  conn: amqp.ChannelModel,
  exchange: string,
  queueName: string,
  key: string,
  queueType: SimpleQueueType,
  handler: (data: T) => void,
): Promise<void> {
  const [channel, queue] = await declareAndBind(conn, exchange, queueName, key, queueType);
  const msgConsumed = await channel.consume(queueName, (msg: amqp.ConsumeMessage | null) => {
    if (!msg)
      return;
    const parsedMsg = JSON.parse(msg.content.toString());
    handler(parsedMsg);
    channel.ack(msg);
  });
}