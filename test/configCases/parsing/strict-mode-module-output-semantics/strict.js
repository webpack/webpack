"use strict";

// Already-strict source keeps its behavior in ESM output — no diagnostics.
function strictCallee() {
	return arguments.callee;
}

function strictAssign() {
	undeclaredInStrict = 1;
}

module.exports = { strictCallee, strictAssign };
