"use strict";

// Already-strict source keeps its behavior in ESM output — no diagnostics.
function strictCallee() {
	return arguments.callee;
}

function strictReadOnlyAssign() {
	undefined = 1;
}

module.exports = { strictCallee, strictReadOnlyAssign };
