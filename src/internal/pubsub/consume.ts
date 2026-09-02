import amqp from "amqplib";

import type { Channel } from "amqplib";

export enum SimpleQueueType {
  Durable,
  Transient,
};

export async function declareAndBind(
  conn: amqp.ChannelModel,
  exchange: string,
  queueName: string,
  key: string,
  queueType: SimpleQueueType,
): Promise<[Channel, amqp.Replies.AssertQueue]> {
  const createChannel = await conn.createChannel();
  const queue = await createChannel.assertQueue(
    queueName,
    {
      durable: queueType === SimpleQueueType.Durable,
      autoDelete: queueType === SimpleQueueType.Transient,
      exclusive: queueType === SimpleQueueType.Transient
    }
  );
  await createChannel.bindQueue(queueName, exchange, key);

  return [createChannel, queue];
}