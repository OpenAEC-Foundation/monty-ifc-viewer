import { Show, For } from 'solid-js';
import { documents, activeDocumentId, switchDocument, closeDocument } from '@/state/document-store';
import { loadFile } from '@/actions/load-file';
import { t } from '@/state/locale-store';
import styles from '@/styles/components/DocumentBar.module.css';

export default function DocumentBar() {
  let fileInputRef: HTMLInputElement | undefined;

  const handleFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files?.[0]) {
      loadFile(input.files[0]);
      input.value = '';
    }
  };

  return (
    <div class={styles.bar}>
      <For each={documents()}>
        {(doc) => {
          const isActive = () => activeDocumentId() === doc.id;
          return (
            <div
              class={`${styles.tab} ${isActive() ? styles.tabActive : ''}`}
              onClick={() => switchDocument(doc.id)}
              onMouseDown={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  closeDocument(doc.id);
                }
              }}
              title={doc.fileName}
            >
              <svg class={styles.tabIcon} width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 1.5h5.5L14 6v8.5H4V1.5Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
                <path d="M9.5 1.5V6H14" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
              </svg>
              <span class={styles.tabName}>{doc.fileName}</span>
              <button
                class={styles.closeBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  closeDocument(doc.id);
                }}
                title={t('doc.close')}
              >
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                  <path d="M1.5 1.5L7.5 7.5M7.5 1.5L1.5 7.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
                </svg>
              </button>
            </div>
          );
        }}
      </For>
      <button
        class={styles.newTabBtn}
        onClick={() => fileInputRef?.click()}
        title={t('doc.openNew')}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
        </svg>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".ifc,.ifczip"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}
