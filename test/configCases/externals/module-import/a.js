import external0 from "external0"; // module
const external1 = require("external1"); // module
const external2 = require("external2"); // node-commonjs
import external3_1 from "external3"; // module
const external3_2 = import("external3"); // import

console.log(external0, external1, external3_1, external3_2);
