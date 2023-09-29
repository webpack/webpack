import { /* webpackDefer: true */ f } from "./mod.js"; // error
import /* webpackDefer: true */ f2 from "./mod.js"; // error
import /* webpackDefer: true */ * as f3 from "./mod.js";

export /* webpackDefer: true */ * as f4 from "./mod.js";
export { /* webpackDefer: true */ f as f5 } from "./mod.js"; // error

export default [f, f2, f3];
