import type { PrototypeState } from '../types/prototype';

const KEY = 'prototype-viewer-state';

export function saveState(state: PrototypeState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage quota exceeded — silently ignore
  }
}

export function loadState(): PrototypeState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PrototypeState) : null;
  } catch {
    return null;
  }
}

export function exportJSON(state: PrototypeState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'prototype.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function importJSON(): Promise<PrototypeState> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error('No file selected'));
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const state = JSON.parse(e.target?.result as string) as PrototypeState;
          resolve(state);
        } catch {
          reject(new Error('Invalid JSON'));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}
