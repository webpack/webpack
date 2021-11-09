import aa from './a.json';

export { aa };

export { default as bb } from './b.json';

import bbb from './b.json';

const a = aa.a;
const b = bbb.b;

export { a, b };

