import { listDirectories } from "./fs";

export async function listPlayers(usersRoot: string): Promise<string[]> {
  if (!usersRoot) return [];
  const entries = await listDirectories(usersRoot);
  return entries
    .map((e) => e.name)
    .filter((n) => n && n.toLowerCase() !== "shared");
}
