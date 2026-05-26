"use strict";

// Assertions live in the emitted `test.js` asset; the css entry's JS chunk
// has no `it(...)` body of its own.
module.exports = {
	findBundle() {
		return ["./test.js"];
	}
};
