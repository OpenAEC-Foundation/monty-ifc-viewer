import { onMount, onCleanup } from 'solid-js';
import { setIsDragOver } from '@/state/ui-store';

export function useFileDrop(
  containerRef: () => HTMLElement | undefined,
  onFile: (file: File) => void,
) {
  onMount(() => {
    const container = containerRef();
    if (!container) return;

    const prevent = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDragEnter = () => setIsDragOver(true);
    const handleDragOver = () => setIsDragOver(true);
    const handleDragLeave = (e: DragEvent) => {
      if (!container.contains(e.relatedTarget as Node)) {
        setIsDragOver(false);
      }
    };
    const handleDrop = (e: DragEvent) => {
      prevent(e);
      setIsDragOver(false);
      const file = e.dataTransfer?.files[0];
      if (file && (file.name.endsWith('.ifc') || file.name.endsWith('.ifczip'))) {
        onFile(file);
      }
    };

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
      container.addEventListener(event, prevent as EventListener);
    });

    container.addEventListener('dragenter', handleDragEnter);
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('dragleave', handleDragLeave);
    container.addEventListener('drop', handleDrop as EventListener);

    onCleanup(() => {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
        container.removeEventListener(event, prevent as EventListener);
      });
      container.removeEventListener('dragenter', handleDragEnter);
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('dragleave', handleDragLeave);
      container.removeEventListener('drop', handleDrop as EventListener);
    });
  });
}
