import * as mod from "./deep-tla.mjs" assert { webpackSync: "true" }; // error
import * as mod2 from "./no-tla.mjs" assert { webpackSync: "true" };
import /* webpackSync: true */ "./deep-tla.mjs"; // error

import /* webpackSync: false */ "./deep-tla.mjs" assert { webpackSync: "true" }; // warning
export * from /* webpackSync: true */ "./deep-tla.mjs"; // 2 errors
export { /* webpackSync: true */ b } from "./deep-tla.mjs"; // 2 errors
export * from /* webpackSync: true */ "./no-tla.mjs";

export default [mod, mod2]; // error on mod
