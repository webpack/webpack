import { CompA, CompB } from './components';

window.CompA = CompA;
window.CompB = CompB;

import('./foo').then((m) => {
  m.default.fnB();
});
