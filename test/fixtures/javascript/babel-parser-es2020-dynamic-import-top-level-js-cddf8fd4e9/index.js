import('testing.js');

const test = 'hello';
import(`testing/${test}.js`);

import('testing.js').then(() => {});
