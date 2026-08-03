"use strict";

// a free global: it must keep resolving to the global, not to the top-level
// binding ./esm-local.js contributes to the same concatenation
module.exports = {
	seen:
		typeof sharedNameOfConcatenation === "undefined"
			? "undefined"
			: sharedNameOfConcatenation
};
