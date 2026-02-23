import { loadFile } from '@/actions/load-file';
import { t } from '@/state/locale-store';
import styles from '@/styles/components/Toolbar.module.css';

export default function Toolbar() {
  let fileInputRef: HTMLInputElement | undefined;

  const handleFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files?.[0]) {
      loadFile(input.files[0]);
      input.value = '';
    }
  };

  return (
    <div class={styles.toolbar}>
      <button
        class={styles.toolbarBtn}
        onClick={() => fileInputRef?.click()}
        title={t('toolbar.openFile')}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M2 5.5a1 1 0 0 1 1-1h3.17a1 1 0 0 1 .7.29l1.42 1.42a1 1 0 0 0 .7.29H15a1 1 0 0 1 1 1V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5.5Z"
            stroke="currentColor"
            stroke-width="1.3"
          />
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
