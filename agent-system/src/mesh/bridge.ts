import {
  getDispatchEnvelopes,
  markDispatchFailed,
  markDispatchSent,
  recordThreadReply,
  type DispatchEnvelope,
  type Mesh,
} from "./mesh.js";

export interface BridgeSendInput {
  messageId: string;
  threadId: string;
  prompt: string;
  envelope: DispatchEnvelope;
}

export interface BridgeSendResult {
  sentTurnId?: string;
}

export interface BridgeReadInput {
  messageId: string;
  threadId: string;
  sentTurnId?: string;
  envelope: DispatchEnvelope;
}

export interface BridgeThreadReply {
  body: string;
  sourceTurnId?: string;
}

export interface BridgeTransport {
  sendMessage(input: BridgeSendInput): Promise<BridgeSendResult>;
  readReply(input: BridgeReadInput): Promise<BridgeThreadReply | null>;
}

export interface BridgeCycleOptions {
  sendLimit?: number;
  readLimit?: number;
}

export interface BridgeCycleResult {
  sent: Array<{ messageId: string; threadId: string; sentTurnId?: string }>;
  replied: Array<{ messageId: string; replyId: string; sourceTurnId?: string }>;
  failed: Array<{ messageId: string; reason: string }>;
}

export async function runBridgeCycle(
  mesh: Mesh,
  transport: BridgeTransport,
  options: BridgeCycleOptions = {},
): Promise<BridgeCycleResult> {
  const result: BridgeCycleResult = {
    sent: [],
    replied: [],
    failed: [],
  };

  const pending = getDispatchEnvelopes(mesh, { status: "pending" }).slice(
    0,
    options.sendLimit ?? Number.POSITIVE_INFINITY,
  );

  for (const envelope of pending) {
    try {
      const sendResult = await transport.sendMessage({
        messageId: envelope.messageId,
        threadId: envelope.threadId,
        prompt: envelope.prompt,
        envelope,
      });
      markDispatchSent(mesh, {
        messageId: envelope.messageId,
        sentTurnId: sendResult.sentTurnId,
      });
      result.sent.push({
        messageId: envelope.messageId,
        threadId: envelope.threadId,
        sentTurnId: sendResult.sentTurnId,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      markDispatchFailed(mesh, { messageId: envelope.messageId, reason });
      result.failed.push({ messageId: envelope.messageId, reason });
    }
  }

  const sent = getDispatchEnvelopes(mesh, { status: "sent" }).slice(
    0,
    options.readLimit ?? Number.POSITIVE_INFINITY,
  );

  for (const envelope of sent) {
    try {
      const reply = await transport.readReply({
        messageId: envelope.messageId,
        threadId: envelope.threadId,
        sentTurnId: envelope.sentTurnId,
        envelope,
      });

      if (!reply || reply.body.trim() === "") {
        continue;
      }

      const replyMessage = recordThreadReply(mesh, {
        messageId: envelope.messageId,
        body: reply.body,
        sourceTurnId: reply.sourceTurnId ?? envelope.sentTurnId,
      });
      result.replied.push({
        messageId: envelope.messageId,
        replyId: replyMessage.id,
        sourceTurnId: reply.sourceTurnId ?? envelope.sentTurnId,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      markDispatchFailed(mesh, { messageId: envelope.messageId, reason });
      result.failed.push({ messageId: envelope.messageId, reason });
    }
  }

  return result;
}
