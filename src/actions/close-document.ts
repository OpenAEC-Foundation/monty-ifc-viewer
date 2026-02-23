import { activeDocumentId, closeDocument } from '@/state/document-store';

export function closeActiveDocument(): void {
  const id = activeDocumentId();
  if (id) {
    closeDocument(id);
  }
}
