import type { ReadStream, WriteStream } from "node:tty";

export async function readHiddenInput(
  prompt: string,
  input: ReadStream = process.stdin,
  output: WriteStream = process.stdout,
): Promise<string> {
  if (!input.isTTY)
    throw new Error("Credential entry requires an interactive terminal.");
  output.write(prompt);
  input.setRawMode(true);
  input.resume();
  input.setEncoding("utf8");
  let value = "";
  try {
    return await new Promise<string>((resolve, reject) => {
      const onData = (chunk: string) => {
        for (const character of chunk) {
          if (character === "\u0003") {
            input.off("data", onData);
            reject(new Error("Credential entry canceled."));
            return;
          } else if (character === "\r" || character === "\n") {
            input.off("data", onData);
            output.write("\n");
            resolve(value);
          } else if (character === "\u007f" || character === "\b") {
            value = value.slice(0, -1);
          } else if (character >= " ") {
            value += character;
          }
        }
      };
      input.on("data", onData);
    });
  } finally {
    input.setRawMode(false);
    input.pause();
  }
}
