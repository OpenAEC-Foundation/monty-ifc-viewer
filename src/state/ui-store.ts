import { createSignal } from 'solid-js';

export const [isLoading, setIsLoading] = createSignal(false);
export const [loadingText, setLoadingText] = createSignal('');
export const [statusText, setStatusText] = createSignal('');
export const [statusType, setStatusType] = createSignal<'success' | 'loading' | 'error' | 'info'>('info');
export const [showStatusBar, setShowStatusBar] = createSignal(true);
export const [showViewerControls, setShowViewerControls] = createSignal(false);
export const [showDropZone, setShowDropZone] = createSignal(true);
export const [isDragOver, setIsDragOver] = createSignal(false);
export const [propertyPanelOpen, setPropertyPanelOpen] = createSignal(false);
export const [propertyPanelData, setPropertyPanelData] = createSignal<Record<string, any> | null>(null);
export const [contextMenuVisible, setContextMenuVisible] = createSignal(false);
export const [contextMenuPos, setContextMenuPos] = createSignal({ x: 0, y: 0 });
export const [contextMenuTarget, setContextMenuTarget] = createSignal<number | null>(null);

export function showLoading(text: string): void {
  setLoadingText(text);
  setIsLoading(true);
}

export function hideLoading(): void {
  setIsLoading(false);
}

export function showStatus(text: string, type: 'success' | 'loading' | 'error' | 'info' = 'info'): void {
  setStatusText(text);
  setStatusType(type);
}
