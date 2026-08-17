"use strict";

// Each module points back at the entry, but none of the edges forces it to be
// evaluated: `import()` defers, `__webpack_is_included__` never loads, and a
// CommonJS module reading its own `module.exports` points at itself.
/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "stats",
		circularDependencies: true
	}
};
