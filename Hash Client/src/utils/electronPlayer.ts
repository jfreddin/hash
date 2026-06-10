export type PlayerBounds = { x: number; y: number; width: number; height: number };

type IpcRenderer = {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  send: (channel: string, ...args: unknown[]) => void;
  on: (channel: string, listener: (...args: unknown[]) => void) => void;
  removeListener: (channel: string, listener: (...args: unknown[]) => void) => void;
};

function getIpcRenderer(): IpcRenderer | null {
  const win = window as Window & {
    require?: (id: string) => { ipcRenderer: IpcRenderer };
  };
  return win.require?.('electron')?.ipcRenderer ?? null;
}

export function isElectronPlayerAvailable(): boolean {
  return !!getIpcRenderer();
}

export function enterPlayerShell(): void {
  getIpcRenderer()?.send('player-shell-enter');
}

export function exitPlayerShell(): void {
  getIpcRenderer()?.send('player-shell-exit');
}

export function focusPlayerShell(): void {
  getIpcRenderer()?.send('player-shell-focus');
}

export function onPlayerShellBack(listener: () => void): () => void {
  const ipc = getIpcRenderer();
  if (!ipc) return () => {};
  ipc.on('player-shell-back', listener);
  return () => ipc.removeListener('player-shell-back', listener);
}
