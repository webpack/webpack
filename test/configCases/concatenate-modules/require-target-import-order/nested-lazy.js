import { order } from "./tracker.js";

order.push("nested-lazy");
// never called
export const load = () => require("./requires-target.js");
