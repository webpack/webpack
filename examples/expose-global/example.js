import jQuery from "./jquery";
import { add } from "./math";

// A script outside the bundle reads the same values off the global object.
console.log(jQuery(".app"), globalThis.$(".app"));
console.log(add(1, 2), globalThis.add(1, 2));
