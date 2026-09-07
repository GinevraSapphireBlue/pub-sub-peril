import amqp from "amqplib";
import { declareAndBind, SimpleQueueType } from "./consume.js";

export type AckType = "Ack" | "NackRequeue" | "NackDiscard";

export async function subscribeJSON<T>(
  conn: amqp.ChannelModel,
  exchange: string,
  queueName: string,
  key: string,
  queueType: SimpleQueueType,
  handler: (data: T) => AckType | Promise<AckType>,
): Promise<void> {
  const [channel, queue] = await declareAndBind(conn, exchange, queueName, key, queueType);
  const msgConsumed = await channel.consume(queueName, async (msg: amqp.ConsumeMessage | null) => {
    if (!msg)
      return;
    const parsedMsg = JSON.parse(msg.content.toString());
    const acktype = await handler(parsedMsg);
    if (acktype === "Ack") {
      // console.log("subscribeJSON(): Recived Ack");
      channel.ack(msg);
    } else if (acktype === "NackRequeue") {
      // console.log("subscribeJSON(): Received NackRequeue");
      channel.nack(msg, false, true);
    } else if (acktype === "NackDiscard") {
      // console.log("subscribeJSON(): Received NackDiscard");
      channel.nack(msg, false, false);
    }
  });
}