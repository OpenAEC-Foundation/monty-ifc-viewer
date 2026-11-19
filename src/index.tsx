/* @refresh reload */
import { render } from 'solid-js/web';
import '@/styles/global.css';
import App from './App';
import { startSupercloud } from '@/supercloud/start';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

render(() => <App />, root);

// Check for URL parameter to auto-load model (not in the SuperCloud workplace: there the file comes from Docs)
const urlParams = new URLSearchParams(window.location.search);
const modelUrl = urlParams.get('model');
if (startSupercloud()) {
  // SuperCloud workplace
} else if (modelUrl) {
  import('@/actions/load-file').then(({ loadFromUrl }) => {
    loadFromUrl(modelUrl);
  });
}
