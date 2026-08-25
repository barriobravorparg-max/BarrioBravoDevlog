import nacl from "tweetnacl";

/**
 * Verifica que la request venga realmente de Discord usando su firma Ed25519.
 * Discord manda "X-Signature-Ed25519" y "X-Signature-Timestamp" en cada interaction.
 * Sin esto, cualquiera podría pegarle a tu endpoint y simular comandos.
 */
export function verifyDiscordRequest(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  publicKey: string
): boolean {
  if (!signature || !timestamp) return false;

  try {
    return nacl.sign.detached.verify(
      Buffer.from(timestamp + rawBody),
      Buffer.from(signature, "hex"),
      Buffer.from(publicKey, "hex")
    );
  } catch {
    return false;
  }
}
