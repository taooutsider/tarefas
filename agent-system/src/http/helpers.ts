import type { IncomingMessage } from "node:http";

/**
 * Parse JSON body from HTTP request
 */
export async function readJsonBody<T = Record<string, unknown>>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 1e6) {
        reject(new Error("Request body too large"));
      }
    });

    req.on("end", () => {
      try {
        resolve(JSON.parse(body) as T);
      } catch (error) {
        reject(new Error(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`));
      }
    });

    req.on("error", reject);
  });
}
