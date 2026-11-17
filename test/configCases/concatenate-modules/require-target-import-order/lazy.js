import { order } from "./tracker.js";

order.push("lazy");
// never called
export const load = () => require("./target.js");
