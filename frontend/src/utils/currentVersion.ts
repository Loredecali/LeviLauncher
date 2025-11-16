const KEY = "ll.currentVersionName";

export function readCurrentVersionName(): string {
  try {
    return localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}

export function saveCurrentVersionName(name: string): void {
  try {
    localStorage.setItem(KEY, name);
  } catch {
  }
}