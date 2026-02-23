import { createSignal } from 'solid-js';

export const [currentIndex, setCurrentIndex] = createSignal(-1);
export const [isPlaying, setIsPlaying] = createSignal(false);
export const [speed, setSpeed] = createSignal(1000);
export const [sortedValues, setSortedValues] = createSignal<string[]>([]);
export const [valueGroups, setValueGroups] = createSignal<Map<string, number[]>>(new Map());
export const [controlsEnabled, setControlsEnabled] = createSignal(false);

export function resetPlayerStore(): void {
  setCurrentIndex(-1);
  setIsPlaying(false);
  setSpeed(1000);
  setSortedValues([]);
  setValueGroups(new Map());
  setControlsEnabled(false);
}
