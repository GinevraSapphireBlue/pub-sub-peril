import { encode } from "@msgpack/msgpack";
import type { ConfirmChannel } from "amqplib";

export async function publishJSON<T>(
  ch: ConfirmChannel,
  exchange: string,
  routingKey: string,
  value: T,
): Promise<void> {
  const bufferedValue = Buffer.from(JSON.stringify(value));
  ch.publish(exchange, routingKey, bufferedValue, { contentType: "application/json" });
}

export async function publishMsgPack<T>(
  ch: ConfirmChannel,
  exchange: string,
  routingKey: string,
  value: T,
): Promise<void> {
  const encodedValue = encode(value);
  const buffer = Buffer.from(encodedValue.buffer, encodedValue.byteOffset, encodedValue.byteLength);
  ch.publish(exchange, routingKey, buffer, { contentType: "application/x-msgpack" });
}