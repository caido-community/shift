import { readFile, writeFile } from "fs/promises";

export async function readJson(filePath: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(filePath, "utf-8"));
  } catch {
    return undefined;
  }
}

export async function writeJson(filePath: string, data: unknown): Promise<void> {
  await writeFile(filePath, JSON.stringify(data, null, 2));
}
