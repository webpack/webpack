"use strict";

// the function body is walked before the binding below is declared
function early() {
	exports.early = ns;
}
const ns = require("../targets/cjs?hoisted");
early();
exports.late = ns;
