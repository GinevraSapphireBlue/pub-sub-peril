import type { ConfirmChannel } from "amqplib";
import type { ArmyMove, RecognitionOfWar } from "../internal/gamelogic/gamedata.js";
import { GameState, type PlayingState } from "../internal/gamelogic/gamestate.js";
import { handleMove, MoveOutcome } from "../internal/gamelogic/move.js";
import { handlePause } from "../internal/gamelogic/pause.js";
import type { AckType } from "../internal/pubsub/subscribe.js";
import { publishJSON } from "../internal/pubsub/publish.js";
import { ExchangePerilTopic, WarRecognitionsPrefix } from "../internal/routing/routing.js";
import { handleWar, WarOutcome } from "../internal/gamelogic/war.js";

export function handlerPause(gs: GameState): (ps: PlayingState) => AckType {
  return (ps) => {
    handlePause(gs, ps);
    process.stdout.write("> ");
    return "Ack";
  };
}

export function handlerMove(gs: GameState, cch: ConfirmChannel): (move: ArmyMove) => Promise<AckType> {
  return async (move) => {
    const moveOutcome = handleMove(gs, move);
    process.stdout.write("> ");
    if (moveOutcome === MoveOutcome.MakeWar) {
      const recognitionOfWar: RecognitionOfWar = {
        attacker: move.player,
        defender: gs.getPlayerSnap(),
      };
      try {
        await publishJSON(cch, ExchangePerilTopic, `${WarRecognitionsPrefix}.${gs.getUsername()}`, recognitionOfWar);
        return "Ack";
      } catch {
        return "NackRequeue";
      }
    }
    else if (moveOutcome === MoveOutcome.Safe) {
      return "Ack";
    }
    else {
      return "NackDiscard";
    }
  };
}

export function handlerWar(gs: GameState): (warMsg: RecognitionOfWar) => Promise<AckType> {
  return async (warMsg) => {
    const warOutcome = handleWar(gs, warMsg);
    process.stdout.write("> ");
    switch (warOutcome.result) {
      case WarOutcome.NotInvolved:
        return "NackRequeue";
      case WarOutcome.NoUnits:
        return "NackDiscard";
      case WarOutcome.OpponentWon:
      case WarOutcome.YouWon:
      case WarOutcome.Draw:
        return "Ack";
      default:
        console.log("Error: Unknown war outcome");
        return "NackDiscard";
    }
  }
}