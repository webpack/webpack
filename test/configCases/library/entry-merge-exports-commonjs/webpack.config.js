"use strict";

// Set per entry rather than on `output`, which is the other half of living
// under `library`.
/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: {
			import: ["./a.js", "./b.js", "./index.js"],
			library: {
				entryExports: "all",
				name: "MergedCjsLib",
				type: "assign"
			}
		}
	}
};
