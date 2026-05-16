import * as React from 'react';
import { createRoot } from 'react-dom/client';

import '../src/index.css';
import { Playground } from './Playground';

const container = document.getElementById('root');
if (!container) throw new Error('#root not found');

createRoot(container).render(
  <React.StrictMode>
    <Playground />
  </React.StrictMode>,
);
