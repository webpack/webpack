import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { foo } = require('./dependency.cjs');
console.log(foo);
