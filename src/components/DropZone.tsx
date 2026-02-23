import { showDropZone, isDragOver } from '@/state/ui-store';
import { loadFile } from '@/actions/load-file';
import { t } from '@/state/locale-store';
import styles from '@/styles/components/DropZone.module.css';

export default function DropZone() {
  let fileInputRef: HTMLInputElement | undefined;

  const handleFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files?.[0]) loadFile(input.files[0]);
  };

  return (
    <div class={`${styles.dropZone} ${!showDropZone() ? styles.hidden : ''} ${isDragOver() ? styles.dragover : ''}`}>
      <div class={styles.dropZoneBox}>
        <div class={styles.dropZoneIcon}>{'\u{1F4E6}'}</div>
        <h2 class={styles.dropZoneTitle}>{t('drop.title')}</h2>
        <p class={styles.dropZoneSubtitle}>
          {t('drop.subtitle1')}<br />
          {t('drop.subtitle2')}
        </p>
        <div class={styles.dropZoneFormats}>
          <span class={styles.formatBadge}>.ifc</span>
          <span class={styles.formatBadge}>.ifczip</span>
        </div>
        <p class={styles.dropZoneOr}>{t('drop.or')}</p>
        <label class={styles.fileInputLabel} onClick={() => fileInputRef?.click()}>
          <span>{'\u{1F4C2}'}</span>
          {t('drop.chooseFile')}
        </label>
        <input
          ref={fileInputRef}
          type="file"
          class={styles.fileInput}
          accept=".ifc,.ifczip"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
