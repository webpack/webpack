import * as mod from "./deep-tla.mjs" assert { webpackSync: "true" };
import * as mod2 from "./no-tla.mjs" assert { webpackSync: "true" };
import /* webpackSync: true */ "./deep-tla.mjs";
export * from /* webpackSync: true */ "./deep-tla.mjs";
export { /* webpackSync: true */ b } from "./deep-tla.mjs";
export * from /* webpackSync: true */ "./no-tla.mjs";

export default [mod, mod2];
