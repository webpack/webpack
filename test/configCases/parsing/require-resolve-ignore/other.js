import { createRequire } from 'node:module';

const resolve = require.resolve(/* webpackIgnore: true */ "./non-exists");
const createRequireResolve1 = createRequire(import.meta.url).resolve(/* webpackIgnore: true */ "./non-exists");
const require = createRequire(import.meta.url);
const createRequireResolve2 = require.resolve(/* webpackIgnore: true */ "./non-exists");

export { resolve, createRequireResolve1, createRequireResolve2 }
