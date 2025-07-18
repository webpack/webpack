import external0 from "external0"; // module
const external1 = require("external1"); // module
const external2 = require("external2"); // node-commonjs
import external3_1 from "external3"; // module
const external3_2 = import("external3"); // import

// Trigger concatenation
import { internalHelper, internalConstant } from "./lib-to-concat";

console.log(external0, external1, external3_1, external3_2);
console.log(internalHelper(), internalConstant);

// ESM export ensures module concatenation
export { external0, internalHelper };
