import { f } from /* webpackDefer: true */  "./mod.js"; // error
import f2 from /* webpackDefer: true */ "./mod.js"; // error
import * as f3 from /* webpackDefer: true */ "./mod.js";
import f4, { f as f5 } from /* webpackDefer: true */ "./mod.js"; // error

export * as f4 from /* webpackDefer: true */ "./mod.js"; // error
export { f as f5 } from /* webpackDefer: true */ "./mod.js"; // error

export default [f, f2, f3, f4, f5];

export { f3 }
