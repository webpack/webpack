import { order } from "./tracker.js";
import defer * as target from "./target.js";

order.push("deferring");
export const read = () => target.value;
