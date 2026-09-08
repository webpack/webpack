"use strict";

// Assertions live in the emitted `test.js`; the entry's own JS asset is the
// library export, not a test bundle.
module.exports = {
	findBundle() {
		return ["./test.js"];
	}
};
