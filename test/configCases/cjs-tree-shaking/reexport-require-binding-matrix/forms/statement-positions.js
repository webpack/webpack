"use strict";

const ns = require("../targets/cjs?statement-positions");
if (ns.a === "a") exports.inIf = ns.a;
try {
	exports.inTry = ns.b;
} catch (err) {
	exports.inTry = err;
}
{
	exports.inBlock = ns.c;
}
const assigned = (exports.inExpression = ns.a);
exports.assignedSame = assigned === ns.a;
exports.sequence = (0, ns.b);
