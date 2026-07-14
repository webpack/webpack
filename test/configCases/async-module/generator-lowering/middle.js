// async only by propagation, exports a top-level declaration (the `.then`
// lowering used to break this because the binding escaped the callback scope)
import { value, sum } from "./leaf.js";
export const combined = value + sum;
