const { createRequire } = require('module');
const myRequire = createRequire(__filename);
const { foo } = myRequire('./dependency.cjs');
console.log(foo);
