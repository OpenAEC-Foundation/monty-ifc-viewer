/* @refresh reload */
import { render } from 'solid-js/web';
import '@/styles/global.css';
import App from './App';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

render(() => <App />, root);

// Check for URL parameter to auto-load model
const urlParams = new URLSearchParams(window.location.search);
const modelUrl = urlParams.get('model');
if (modelUrl) {
  import('@/actions/load-file').then(({ loadFromUrl }) => {
    loadFromUrl(modelUrl);
  });
}
