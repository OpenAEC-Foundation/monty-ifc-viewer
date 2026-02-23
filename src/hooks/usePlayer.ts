import { createEffect, onCleanup } from 'solid-js';
import {
  currentIndex, setCurrentIndex,
  isPlaying, setIsPlaying,
  speed,
  sortedValues,
  controlsEnabled,
} from '@/state/player-store';
import {
  setSelectedValueIndices,
  setIsolatedExpressIds,
} from '@/state/selection-store';

export function usePlayer() {
  let playInterval: ReturnType<typeof setInterval> | null = null;

  function stopPlayback() {
    setIsPlaying(false);
    if (playInterval) {
      clearInterval(playInterval);
      playInterval = null;
    }
  }

  function startPlayback() {
    const values = sortedValues();
    if (!values.length) return;
    if (currentIndex() >= values.length - 1) setCurrentIndex(-1);

    // Clear isolation
    setSelectedValueIndices(new Set<number>());
    setIsolatedExpressIds(new Set<number>());

    setIsPlaying(true);

    playInterval = setInterval(() => {
      const cur = currentIndex();
      const vals = sortedValues();
      if (cur < vals.length - 1) {
        goToNext();
      } else {
        stopPlayback();
      }
    }, speed());

    goToNext();
  }

  function togglePlay() {
    if (isPlaying()) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }

  function goToValue(index: number) {
    setSelectedValueIndices(new Set<number>());
    setIsolatedExpressIds(new Set<number>());
    const vals = sortedValues();
    index = Math.max(-1, Math.min(index, vals.length - 1));
    setCurrentIndex(index);
  }

  function goToFirst() { stopPlayback(); goToValue(-1); }
  function goToPrev() { stopPlayback(); goToValue(currentIndex() - 1); }
  function goToNext() { goToValue(currentIndex() + 1); }
  function goToLast() { stopPlayback(); goToValue(sortedValues().length - 1); }

  // Cleanup interval on unmount
  onCleanup(() => {
    if (playInterval) clearInterval(playInterval);
  });

  // Restart interval when speed changes during playback
  createEffect(() => {
    const s = speed();
    if (isPlaying() && playInterval) {
      clearInterval(playInterval);
      playInterval = setInterval(() => {
        const cur = currentIndex();
        const vals = sortedValues();
        if (cur < vals.length - 1) {
          goToNext();
        } else {
          stopPlayback();
        }
      }, s);
    }
  });

  return {
    togglePlay,
    startPlayback,
    stopPlayback,
    goToFirst,
    goToPrev,
    goToNext,
    goToLast,
    goToValue,
  };
}
