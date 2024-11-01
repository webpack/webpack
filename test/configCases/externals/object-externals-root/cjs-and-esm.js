import external1_1 from "external1"; // commonjs
const external1_2 = import("external1"); // import
const external2 = import("external2"); // import
const external3 = require("external3"); // fallback (window)

console.log(external1_1, external1_2, external2, external3);
