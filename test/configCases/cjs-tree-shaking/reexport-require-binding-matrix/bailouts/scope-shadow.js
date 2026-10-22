"use strict";

const ns = require("../targets/cjs?scope-shadow");
exports.outer = ns;
function inner() {
	const ns = { local: "function" };
	exports.fromFunction = ns;
	exports.fromFunctionMember = ns.local;
}
inner();
{
	const ns = { local: "block" };
	exports.fromBlock = ns;
}
const arrow = (ns) => {
	exports.fromParam = ns;
};
arrow({ local: "param" });
